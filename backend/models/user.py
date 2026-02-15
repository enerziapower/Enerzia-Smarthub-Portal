from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone
import uuid


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    CEO_OWNER = "ceo_owner"  # CEO/Owner - approves payment requests
    ADMIN = "admin"  # Department head - can manage own department
    USER = "user"  # Department member - can view own department only


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password: str  # Hashed
    role: str = UserRole.USER
    department: Optional[str] = None
    can_view_departments: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    department: Optional[str] = None


class UserInvite(BaseModel):
    email: str
    name: str
    role: str = UserRole.USER
    department: Optional[str] = None
    can_view_departments: List[str] = []


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    can_view_departments: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
