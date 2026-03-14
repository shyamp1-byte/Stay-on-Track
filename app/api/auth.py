from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import hashlib
from jose import jwt, JWTError
from app.core.db import get_db
from app.schemas.user import UserCreate, UserPublic, UserUpdate, PasswordChange
from app.services.user import register_user, login_user, update_profile, change_password, delete_account
from app.services.jwt import create_access_token, create_refresh_token, JWT_SECRET, JWT_ALG, JWT_AUD
from app.schemas.auth import LoginRequest
from app.schemas.token import TokenResponse
from app.services.auth_dependency import get_current_user
from app.repositories import refresh_token as rt_repo

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        user = register_user(db, first_name=payload.first_name, last_name=payload.last_name, email=payload.email, password=payload.password)
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
