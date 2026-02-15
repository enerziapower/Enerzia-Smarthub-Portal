"""
Core authentication utilities.
JWT handling, password hashing, and auth dependencies.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timezone, timedelta
import jwt
import os

from .database import db

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security bearer
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token - returns None if no valid token."""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require authentication - raises 401 if not authenticated."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("user_id")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


async def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require admin or super_admin role."""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(require_auth)) -> dict:
    """Require super_admin role."""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


def get_user_departments(user: dict) -> list:
    """Get list of departments a user can access."""
    if user.get("role") == "super_admin":
        return ["PROJECTS", "ACCOUNTS", "SALES", "PURCHASE", "EXPORTS", "FINANCE", "HR", "OPERATIONS"]
    
    departments = []
    if user.get("department"):
        departments.append(user["department"])
    if user.get("can_view_departments"):
        departments.extend(user["can_view_departments"])
    
    return list(set(departments))
