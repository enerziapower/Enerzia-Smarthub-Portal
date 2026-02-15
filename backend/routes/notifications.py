"""
Notifications routes module.
Handles real-time notifications for cross-department communication.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

import sys
sys.path.insert(0, '/app/backend')

from core.database import db
from core.security import require_auth
from core.websocket import manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ==================== MODELS ====================

class NotificationType(str, Enum):
    DEPARTMENT_REQUIREMENT = "department_requirement"
    PAYMENT_REQUEST = "payment_request"
    TASK_ASSIGNMENT = "task_assignment"
    APPROVAL_NEEDED = "approval_needed"
    STATUS_UPDATE = "status_update"


class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    title: str
    message: str
    department: str
    from_department: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    department: str
    from_department: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None


# ==================== ROUTES ====================

@router.get("")
async def get_notifications(
    department: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(require_auth)
):
    """Get notifications for a department."""
    query = {}
    
    if department:
        query["department"] = department
    elif current_user.get("role") != "super_admin":
        user_dept = current_user.get("department")
        if user_dept:
            query["department"] = user_dept
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return notifications


@router.get("/count")
async def get_notification_count(
    department: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get unread notification count."""
    query = {"is_read": False}
    
    if department:
        query["department"] = department
    elif current_user.get("role") != "super_admin":
        user_dept = current_user.get("department")
        if user_dept:
            query["department"] = user_dept
    
    count = await db.notifications.count_documents(query)
    
    return {"unread_count": count}


@router.post("")
async def create_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new notification."""
    notif = Notification(
        type=notification.type,
        title=notification.title,
        message=notification.message,
        department=notification.department,
        from_department=notification.from_department,
        reference_id=notification.reference_id,
        reference_type=notification.reference_type,
        created_by=current_user.get("name", current_user.get("email"))
    )
    
    doc = notif.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.notifications.insert_one(doc)
    
    # Broadcast real-time notification
    await manager.broadcast({
        "type": "notification",
        "action": "new",
        "data": {
            "department": notification.department,
            "title": notification.title,
            "message": notification.message
        }
    })
    
    return {"message": "Notification created", "id": notif.id}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(require_auth)
):
    """Mark a notification as read."""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    department: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Mark all notifications as read for a department."""
    query = {}
    
    if department:
        query["department"] = department
    elif current_user.get("role") != "super_admin":
        user_dept = current_user.get("department")
        if user_dept:
            query["department"] = user_dept
    
    await db.notifications.update_many(query, {"$set": {"is_read": True}})
    
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(require_auth)
):
    """Delete a notification."""
    result = await db.notifications.delete_one({"id": notification_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}


# ==================== HELPER FUNCTIONS ====================

async def create_department_notification(
    target_department: str,
    notif_type: str,
    title: str,
    message: str,
    from_department: str = None,
    reference_id: str = None,
    reference_type: str = None,
    created_by: str = None
):
    """Helper function to create notifications for cross-department actions."""
    notif = Notification(
        type=notif_type,
        title=title,
        message=message,
        department=target_department,
        from_department=from_department,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by=created_by
    )
    
    doc = notif.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.notifications.insert_one(doc)
    
    await manager.broadcast({
        "type": "notification",
        "action": "new",
        "data": {
            "department": target_department,
            "title": title,
            "message": message
        }
    })
    
    return notif.id
