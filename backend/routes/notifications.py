"""
Notifications routes module.
Handles real-time notifications for cross-department communication.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone, timedelta
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
    FOLLOWUP_REMINDER = "followup_reminder"
    FOLLOWUP_OVERDUE = "followup_overdue"


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


# ==================== FOLLOW-UP REMINDER SYSTEM ====================

@router.post("/generate-followup-reminders")
async def generate_followup_reminders(current_user: dict = Depends(require_auth)):
    """
    Generate notifications for upcoming (tomorrow) and overdue follow-ups.
    Should be called by a scheduled job daily or on-demand.
    Creates notifications for all Sales department members.
    """
    from datetime import date
    
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    # Convert to datetime for comparison
    today_start = datetime.combine(today, datetime.min.time())
    tomorrow_start = datetime.combine(tomorrow, datetime.min.time())
    tomorrow_end = datetime.combine(tomorrow, datetime.max.time())
    
    created_count = 0
    
    # Get all follow-ups scheduled for tomorrow (reminder 1 day before)
    # Handle both datetime objects and ISO strings
    upcoming_followups = await db.followups.find({
        "$and": [
            {"scheduled_date": {"$gte": tomorrow_start}},
            {"scheduled_date": {"$lte": tomorrow_end}},
            {"status": {"$in": ["scheduled", "in_progress"]}}
        ]
    }).to_list(100)
    
    # Get all overdue follow-ups (scheduled before today and not completed)
    overdue_followups = await db.followups.find({
        "$and": [
            {"scheduled_date": {"$lt": today_start}},
            {"status": {"$in": ["scheduled", "in_progress"]}}
        ]
    }).to_list(100)
    
    # Create notifications for upcoming follow-ups
    for followup in upcoming_followups:
        # Check if notification already exists for this follow-up today
        existing = await db.notifications.find_one({
            "reference_id": followup.get("id"),
            "type": "followup_reminder",
            "created_at": {"$regex": f"^{today.isoformat()}"}
        })
        
        if not existing:
            customer_name = followup.get("customer_name") or followup.get("lead_name") or "Unknown"
            scheduled_time = followup.get("scheduled_time") or "Not specified"
            
            await create_department_notification(
                target_department="SALES",
                notif_type="followup_reminder",
                title=f"Follow-up Tomorrow: {followup.get('title', 'Untitled')}",
                message=f"{customer_name} - {followup.get('followup_type', 'general').replace('_', ' ').title()} at {scheduled_time}",
                from_department="System",
                reference_id=followup.get("id"),
                reference_type="followup",
                created_by="System"
            )
            created_count += 1
    
    # Create notifications for overdue follow-ups
    for followup in overdue_followups:
        # Check if notification already exists for this follow-up today
        existing = await db.notifications.find_one({
            "reference_id": followup.get("id"),
            "type": "followup_overdue",
            "created_at": {"$regex": f"^{today.isoformat()}"}
        })
        
        if not existing:
            customer_name = followup.get("customer_name") or followup.get("lead_name") or "Unknown"
            scheduled_date = followup.get("scheduled_date", "")
            if scheduled_date:
                try:
                    if isinstance(scheduled_date, str):
                        scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00')).strftime('%b %d')
                    else:
                        scheduled_date = scheduled_date.strftime('%b %d')
                except:
                    scheduled_date = "Past date"
            
            await create_department_notification(
                target_department="Sales",
                notif_type="followup_overdue",
                title=f"Overdue: {followup.get('title', 'Untitled')}",
                message=f"{customer_name} - Was scheduled for {scheduled_date}",
                from_department="System",
                reference_id=followup.get("id"),
                reference_type="followup",
                created_by="System"
            )
            created_count += 1
    
    return {
        "message": f"Generated {created_count} follow-up notifications",
        "upcoming_count": len(upcoming_followups),
        "overdue_count": len(overdue_followups),
        "notifications_created": created_count
    }


@router.get("/todays-followups")
async def get_todays_followups(current_user: dict = Depends(require_auth)):
    """
    Get all follow-ups scheduled for today.
    Used for the dashboard widget.
    """
    from datetime import date
    
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # Get today's follow-ups
    todays_followups = await db.followups.find({
        "$and": [
            {"scheduled_date": {"$gte": today_start}},
            {"scheduled_date": {"$lte": today_end}},
            {"status": {"$in": ["scheduled", "in_progress"]}}
        ]
    }, {"_id": 0}).sort("scheduled_time", 1).to_list(50)
    
    # Get overdue follow-ups count
    overdue_count = await db.followups.count_documents({
        "$and": [
            {"scheduled_date": {"$lt": today_start}},
            {"status": {"$in": ["scheduled", "in_progress"]}}
        ]
    })
    
    # Get upcoming follow-ups (next 7 days)
    week_end = datetime.combine(today + timedelta(days=7), datetime.max.time())
    upcoming_count = await db.followups.count_documents({
        "$and": [
            {"scheduled_date": {"$gt": today_end}},
            {"scheduled_date": {"$lte": week_end}},
            {"status": {"$in": ["scheduled", "in_progress"]}}
        ]
    })
    
    return {
        "todays_followups": todays_followups,
        "todays_count": len(todays_followups),
        "overdue_count": overdue_count,
        "upcoming_week_count": upcoming_count
    }
