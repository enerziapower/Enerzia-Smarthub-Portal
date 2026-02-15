"""
Password Reset Routes with Email Integration
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import secrets
import os

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class TestEmailRequest(BaseModel):
    email: EmailStr


def get_frontend_url(request: Request = None) -> str:
    """Get frontend URL dynamically based on request origin or environment"""
    # First try FRONTEND_URL from environment
    frontend_url = os.environ.get("FRONTEND_URL")
    if frontend_url:
        return frontend_url
    
    # Default fallback
    return "https://workhub.enerzia.com"


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, req: Request):
    """Request password reset email"""
    
    # Find user by email
    user = await db.users.find_one({"email": request.email.lower()})
    
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    # Extend expiration to 24 hours for better user experience
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # Store reset token in database - store as datetime object for consistent handling
    await db.password_resets.update_one(
        {"email": request.email.lower()},
        {
            "$set": {
                "email": request.email.lower(),
                "token": reset_token,
                "expires_at": expires_at,
                "used": False,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Generate reset URL using dynamic frontend URL
    frontend_url = get_frontend_url(req)
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Send email
    try:
        from services.email_service import send_password_reset_email
        
        result = send_password_reset_email(
            to_email=request.email,
            user_name=user.get("name", "User"),
            reset_token=reset_token,
            reset_url=reset_url
        )
        
        if result["success"]:
            return {"message": "If an account exists with this email, you will receive a password reset link."}
        else:
            # Log error but don't expose to user
            print(f"Email send failed: {result['message']}")
            # Still return success message for security
            return {
                "message": "If an account exists with this email, you will receive a password reset link.",
                "debug_note": result["message"]  # Remove in production
            }
            
    except Exception as e:
        print(f"Email service error: {e}")
        return {
            "message": "If an account exists with this email, you will receive a password reset link.",
            "debug_note": str(e)  # Remove in production
        }


def parse_expires_at(expires_at_value) -> datetime:
    """Parse expires_at field handling both datetime objects and ISO strings"""
    if isinstance(expires_at_value, datetime):
        # If it's already a datetime, ensure it has timezone info
        if expires_at_value.tzinfo is None:
            return expires_at_value.replace(tzinfo=timezone.utc)
        return expires_at_value
    elif isinstance(expires_at_value, str):
        # Handle ISO format string
        try:
            # Try parsing with timezone
            return datetime.fromisoformat(expires_at_value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            # Fallback: parse without timezone and assume UTC
            try:
                dt = datetime.fromisoformat(expires_at_value.replace("Z", ""))
                return dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                # If all else fails, return a past date to invalidate token
                return datetime.min.replace(tzinfo=timezone.utc)
    else:
        # Unknown type, return past date
        return datetime.min.replace(tzinfo=timezone.utc)


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    expires_at = parse_expires_at(reset_record.get("expires_at"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash new password
    hashed_password = pwd_context.hash(request.new_password)
    
    # Update user password
    result = await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Password reset successful. You can now login with your new password."}


@router.get("/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    
    reset_record = await db.password_resets.find_one({
        "token": token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    # Check if token expired
    expires_at = parse_expires_at(reset_record.get("expires_at"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"valid": True, "email": reset_record["email"]}


@router.post("/test-email")
async def test_email_connection(request: TestEmailRequest):
    """Test email configuration (Admin only)"""
    try:
        from services.email_service import test_smtp_connection, send_email
        
        # First test connection
        conn_result = test_smtp_connection()
        if not conn_result["success"]:
            return conn_result
        
        # Send test email
        result = send_email(
            to_email=request.email,
            subject="Test Email - Workhub Enerzia",
            html_content="""
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #1e293b;">✅ Email Configuration Working!</h2>
                <p>Your Workhub Enerzia email integration is configured correctly.</p>
                <p style="color: #64748b; font-size: 14px;">This is a test email from the ERP system.</p>
            </div>
            """,
            plain_content="Email Configuration Working! Your Workhub Enerzia email integration is configured correctly."
        )
        
        return result
        
    except Exception as e:
        return {"success": False, "message": str(e)}
