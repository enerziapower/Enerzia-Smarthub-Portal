from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import random
import string
import resend
import os
import logging

logger = logging.getLogger(__name__)

from ..core.database import db
from ..core.security import (
    verify_password, get_password_hash, create_access_token, 
    get_current_user, security
)
from ..core.config import settings
from ..models.user import (
    User, UserCreate, UserLogin, UserResponse, UserInvite, 
    UserRole, TokenResponse, UserPermissions
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Store OTPs temporarily (in production, use Redis)
otp_store = {}

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    # Update last login
    await db.users.update_one(
        {"email": user_data.email},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    token = create_access_token({"user_id": user["id"], "email": user["email"], "role": user["role"]})
    
    # Get user permissions
    user_perms = user.get("permissions", {})
    logger.info(f"DEBUG: User {user.get('email')} permissions from DB: {user_perms is not None}, type: {type(user_perms)}")
    
    permissions_obj = None
    if user_perms and isinstance(user_perms, dict):
        permissions_obj = UserPermissions(
            modules=user_perms.get("modules", {}),
            sub_modules=user_perms.get("sub_modules", {})
        )
    logger.info(f"DEBUG: permissions_obj: {permissions_obj}")
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        can_view_departments=user.get("can_view_departments", []),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
        last_login=datetime.now(timezone.utc),
        permissions=permissions_obj
    )
    
    logger.info(f"DEBUG: user_response.permissions: {user_response.permissions}")
    result = TokenResponse(token=token, user=user_response)
    logger.info(f"DEBUG: result.user.permissions: {result.user.permissions}")
    return result

@router.post("/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_count = await db.users.count_documents({})
    role = UserRole.SUPER_ADMIN if user_count == 0 else user_data.role
    
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        role=role,
        department=user_data.department,
        created_at=datetime.now(timezone.utc)
    )
    
    await db.users.insert_one(user.model_dump())
    
    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        department=user.department,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return TokenResponse(token=token, user=user_response)

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    # Get user permissions
    user_perms = current_user.get("permissions", {})
    permissions_obj = UserPermissions(
        modules=user_perms.get("modules", {}),
        sub_modules=user_perms.get("sub_modules", {})
    ) if user_perms else None
    
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        department=current_user.get("department"),
        can_view_departments=current_user.get("can_view_departments", []),
        is_active=current_user.get("is_active", True),
        permissions=permissions_obj
    )

@router.get("/check")
async def check_auth(current_user: dict = Depends(get_current_user)):
    return {"authenticated": True, "user_id": current_user["id"]}

@router.put("/change-password")
async def change_password(
    password_data: dict,
    current_user: dict = Depends(get_current_user)
):
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not verify_password(current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = get_password_hash(new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(data: dict):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If an account exists, an OTP has been sent"}
    
    otp = ''.join(random.choices(string.digits, k=6))
    otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.SENDER_EMAIL,
                "to": [email],
                "subject": "Password Reset OTP - Enerzia Power Solutions",
                "html": f"""
                <h2>Password Reset Request</h2>
                <p>Your OTP for password reset is: <strong>{otp}</strong></p>
                <p>This OTP is valid for 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                """
            })
        except Exception as e:
            print(f"Error sending OTP email: {e}")
    
    return {"message": "If an account exists, an OTP has been sent"}

@router.post("/verify-otp")
async def verify_otp(data: dict):
    email = data.get("email")
    otp = data.get("otp")
    
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")
    
    stored = otp_store.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP request found")
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    stored["attempts"] += 1
    if stored["attempts"] > 3:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Too many attempts")
    
    if stored["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    reset_token = str(uuid.uuid4())
    otp_store[email]["reset_token"] = reset_token
    otp_store[email]["token_expires"] = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    return {"message": "OTP verified", "reset_token": reset_token}

@router.post("/reset-password")
async def reset_password(data: dict):
    email = data.get("email")
    reset_token = data.get("reset_token")
    new_password = data.get("new_password")
    
    if not all([email, reset_token, new_password]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    stored = otp_store.get(email)
    if not stored or stored.get("reset_token") != reset_token:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    if datetime.now(timezone.utc) > stored.get("token_expires", datetime.min.replace(tzinfo=timezone.utc)):
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = get_password_hash(new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash}}
    )
    
    del otp_store[email]
    
    return {"message": "Password reset successfully"}
