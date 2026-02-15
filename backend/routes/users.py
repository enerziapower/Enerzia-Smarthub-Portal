"""
User Management Routes - Handles user CRUD operations
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import random
import string
import resend

from ..core.database import db
from ..core.security import get_current_user, get_password_hash
from ..core.config import settings

router = APIRouter(prefix="/users", tags=["Users"])


# ==================== MODELS ====================

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    CEO_OWNER = "ceo_owner"
    ADMIN = "admin"
    USER = "user"


class UserInvite(BaseModel):
    email: str
    name: str
    role: str = UserRole.USER
    department: Optional[str] = None
    can_view_departments: List[str] = []


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    can_view_departments: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PasswordUpdate(BaseModel):
    new_password: str


# ==================== AUTH DEPENDENCY ====================

async def require_auth(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user


async def require_admin(current_user: dict = Depends(require_auth)) -> dict:
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_super_admin(current_user: dict = Depends(require_auth)) -> dict:
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user


# ==================== ROUTES ====================

@router.get("")
async def get_users(current_user: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users


@router.post("/invite")
async def invite_user(
    invite_data: UserInvite,
    current_user: dict = Depends(require_admin)
):
    """Invite a new user (admin only)"""
    # Check if email already exists
    existing = await db.users.find_one({"email": invite_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate temporary password
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    
    user = {
        "id": str(uuid.uuid4()),
        "email": invite_data.email,
        "name": invite_data.name,
        "password": get_password_hash(temp_password),
        "role": invite_data.role,
        "department": invite_data.department,
        "can_view_departments": invite_data.can_view_departments,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("id")
    }
    
    await db.users.insert_one(user)
    
    # Send email with credentials (if configured)
    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.SENDER_EMAIL,
                "to": [invite_data.email],
                "subject": "Welcome to Enerzia Portal - Your Account Details",
                "html": f"""
                <h2>Welcome to Enerzia Power Solutions Portal</h2>
                <p>Your account has been created by {current_user.get('name')}.</p>
                <p><strong>Login Details:</strong></p>
                <ul>
                    <li>Email: {invite_data.email}</li>
                    <li>Temporary Password: {temp_password}</li>
                </ul>
                <p>Please change your password after your first login.</p>
                """
            })
        except Exception as e:
            print(f"Error sending invite email: {e}")
    
    return {
        "message": "User invited successfully",
        "user_id": user["id"],
        "temp_password": temp_password  # Return for display if email fails
    }


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a user (admin only)"""
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only super_admin can modify other admins or super_admins
    if existing.get("role") in ["admin", "super_admin"] and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify admin users")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_dict}
    )
    
    return {"message": "User updated successfully"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Delete a user (super admin only)"""
    if user_id == current_user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.put("/{user_id}/password")
async def admin_reset_password(
    user_id: str,
    password_data: PasswordUpdate,
    current_user: dict = Depends(require_admin)
):
    """Admin reset user password"""
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only super_admin can reset admin passwords
    if existing.get("role") in ["admin", "super_admin"] and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot reset admin passwords")
    
    new_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hash}}
    )
    
    return {"message": "Password reset successfully"}
