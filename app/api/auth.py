import os
import urllib.parse
import uuid
import hashlib
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.user import UserCreate, UserPublic, UserUpdate, PasswordChange
from app.schemas.notification_prefs import NotificationPrefsPublic, NotificationPrefsUpdate
from app.services.user import (
    register_user, login_user, update_profile, change_password, delete_account,
    forgot_password as svc_forgot_password,
    reset_password as svc_reset_password,
    get_or_create_google_user,
)
from app.services.jwt import create_access_token, create_refresh_token, JWT_SECRET, JWT_ALG, JWT_AUD
from app.schemas.auth import LoginRequest
from app.schemas.token import TokenResponse
from app.services.auth_dependency import get_current_user
from app.repositories import refresh_token as rt_repo
from app.repositories import notification_prefs as notif_repo

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Standard auth ────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        user = register_user(
            db,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            password=payload.password,
        )
        from app.services.email import send_welcome_email
        send_welcome_email(to=user.email, full_name=user.full_name)
        return user
    except ValueError as e:
        if str(e) == "EMAIL_TAKEN":
            raise HTTPException(status_code=409, detail="Email already registered")
        raise


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = login_user(db, email=payload.email, password=payload.password)

    access_token = create_access_token(user_id=user.id, email=user.email)

    jti = str(uuid.uuid4())
    refresh_token = create_refresh_token(user_id=user.id, email=user.email, jti=jti)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)
    rt_repo.create_refresh_token_row(
        db=db,
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        jti=jti,
        expires_at=expires_at,
    )

    response.set_cookie("access_token", access_token, httponly=True, samesite="lax")
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax")

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if not raw:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALG], audience=JWT_AUD)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    row = rt_repo.get_by_jti(db, jti=jti)
    if not row or row.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if row.token_hash != hash_refresh_token(raw):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token(user_id=payload["sub"], email=payload["email"])
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if raw:
        try:
            payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALG], audience=JWT_AUD)
            if payload.get("type") == "refresh" and payload.get("jti"):
                now = datetime.now(timezone.utc)
                rt_repo.revoke_by_jti(db, jti=payload["jti"], revoked_at=now)
        except JWTError:
            pass

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
def me(user=Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return update_profile(db, user, full_name=payload.full_name, email=payload.email)
    except ValueError as e:
        if str(e) == "EMAIL_TAKEN":
            raise HTTPException(status_code=409, detail="Email already in use")
        raise


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(payload: PasswordChange, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        change_password(db, user, payload.current_password, payload.new_password)
    except ValueError as e:
        if str(e) == "WRONG_PASSWORD":
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        raise


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(response: Response, db: Session = Depends(get_db), user=Depends(get_current_user)):
    delete_account(db, user)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


# ── Notification preferences ──────────────────────────────────────────────────

@router.get("/me/notifications", response_model=NotificationPrefsPublic)
def get_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return notif_repo.get_or_create_prefs(db, user.id)


@router.patch("/me/notifications", response_model=NotificationPrefsPublic)
def update_notifications(
    payload: NotificationPrefsUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return notif_repo.update_prefs(db, user.id, **payload.model_dump(exclude_none=True))


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    svc_forgot_password(db, email=payload.email)
    # Always returns 204 — never reveal whether an email exists


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    try:
        svc_reset_password(db, token=payload.token, new_password=payload.new_password)
    except ValueError as e:
        if str(e) in ("INVALID_TOKEN", "TOKEN_USED", "TOKEN_EXPIRED"):
            raise HTTPException(status_code=400, detail="Invalid or expired reset link")
        raise


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google/authorize")
def google_authorize():
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID == "your_google_client_id.apps.googleusercontent.com":
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return {"url": url}


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    # Exchange authorization code for Google tokens
    token_resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10.0,
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Google OAuth failed — could not exchange code")

    google_access_token = token_resp.json().get("access_token")

    # Fetch user info from Google
    userinfo_resp = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"},
        timeout=10.0,
    )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get Google user info")

    userinfo = userinfo_resp.json()
    email = userinfo.get("email")
    given = userinfo.get("given_name", "")
    family = userinfo.get("family_name", "")
    full_name = userinfo.get("name") or f"{given} {family}".strip() or email

    if not email:
        raise HTTPException(status_code=400, detail="Google did not provide an email address")

    user = get_or_create_google_user(db, email=email, full_name=full_name)

    # Issue JWT tokens and set cookies, then redirect to the frontend
    access_token = create_access_token(user_id=user.id, email=user.email)
    jti = str(uuid.uuid4())
    refresh_token = create_refresh_token(user_id=user.id, email=user.email, jti=jti)

    now = datetime.now(timezone.utc)
    rt_repo.create_refresh_token_row(
        db=db,
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        jti=jti,
        expires_at=now + timedelta(days=7),
    )

    redirect = RedirectResponse(url=f"{FRONTEND_URL}/projects", status_code=302)
    redirect.set_cookie("access_token", access_token, httponly=True, samesite="lax")
    redirect.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax")
    return redirect
