from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class MemberInvite(BaseModel):
    email: EmailStr


class MemberPublic(BaseModel):
    user_id: UUID
    email: str
    full_name: str
    role: str  # "owner" | "member"
    joined_at: datetime
