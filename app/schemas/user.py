from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str

class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str