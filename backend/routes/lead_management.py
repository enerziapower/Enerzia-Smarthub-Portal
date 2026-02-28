"""
Lead Management / Customer Follow-up Module
Handles pre-enquiry customer interactions, cold calls, site visits, and follow-ups
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

from core.database import db
from utils.permissions import require_permission

router = APIRouter(prefix="/api/lead-management", tags=["Lead Management"])


# ==================== MODELS ====================

class FollowUpCreate(BaseModel):
    # Customer info - either link to existing or new lead
    customer_id: Optional[str] = None  # Link to existing customer
    customer_type: Optional[str] = None  # "domestic" or "overseas"
    # For new leads (not in customer database)
    lead_name: Optional[str] = None
    lead_company: Optional[str] = None
    lead_email: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_address: Optional[str] = None
    
    # Follow-up details
    followup_type: str  # cold_call, site_visit, call_back, visit_later, general
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    scheduled_time: Optional[str] = None  # e.g., "10:00 AM"
    priority: str = "medium"  # high, medium, low
    
    # Assignment
    assigned_to: Optional[str] = None  # User ID
    assigned_to_name: Optional[str] = None
    
    # Additional info
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    followup_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None


class FollowUpComment(BaseModel):
    comment: str
    created_by: str
    created_by_name: str


# ==================== HELPER FUNCTIONS ====================

def serialize_followup(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    # Remove MongoDB _id, keep the UUID id field
    doc.pop("_id", None)
    # Convert datetime fields
    for field in ["scheduled_date", "created_at", "updated_at", "completed_at"]:
        if field in doc and doc[field]:
            if isinstance(doc[field], datetime):
                doc[field] = doc[field].isoformat()
    # Serialize comments
    if "comments" in doc:
        for comment in doc["comments"]:
            if "created_at" in comment and isinstance(comment["created_at"], datetime):
                comment["created_at"] = comment["created_at"].isoformat()
    return doc


# ==================== ROUTES ====================

@router.post("/followups")
async def create_followup(data: FollowUpCreate, current_user: dict = Depends(require_permission("sales_dept", "lead_management"))):
    """Create a new follow-up - Sales department only"""
    
    # Validate - must have either customer_id or lead info
    if not data.customer_id and not data.lead_name:
        raise HTTPException(status_code=400, detail="Either customer_id or lead_name is required")
    
    # Get customer info if linking to existing customer
    customer_info = None
    if data.customer_id:
        # Look up customer in the clients collection
        customer = await db.clients.find_one({"id": data.customer_id})
        if customer:
            customer_info = {
                "customer_id": data.customer_id,
                "customer_type": customer.get("customer_type", "domestic"),
                "customer_name": customer.get("company_name") or customer.get("name"),
                "customer_email": customer.get("email"),
                "customer_phone": customer.get("phone"),
            }
    
    followup = {
        "id": str(uuid.uuid4()),
        # Customer/Lead info
        "is_existing_customer": bool(data.customer_id),
        "customer_id": data.customer_id,
        "customer_type": customer_info["customer_type"] if customer_info else data.customer_type,
        "customer_name": customer_info["customer_name"] if customer_info else data.lead_company or data.lead_name,
        "customer_email": customer_info["customer_email"] if customer_info else data.lead_email,
        "customer_phone": customer_info["customer_phone"] if customer_info else data.lead_phone,
        # For new leads
        "lead_name": data.lead_name,
        "lead_company": data.lead_company,
        "lead_email": data.lead_email,
        "lead_phone": data.lead_phone,
        "lead_address": data.lead_address,
        # Follow-up details
        "followup_type": data.followup_type,
        "title": data.title,
        "description": data.description,
        "scheduled_date": data.scheduled_date,
        "scheduled_time": data.scheduled_time,
        "status": "scheduled",
        "priority": data.priority,
        # Assignment
        "assigned_to": data.assigned_to,
        "assigned_to_name": data.assigned_to_name,
        # Additional info
        "location": data.location,
        "contact_person": data.contact_person,
        "contact_phone": data.contact_phone,
        "notes": data.notes,
        # Outcome tracking
        "outcome": None,
        "next_action": None,
        "completed_at": None,
        # Comments/history
        "comments": [],
        # Metadata
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.followups.insert_one(followup)
    
    return {"message": "Follow-up created successfully", "id": followup["id"]}


@router.get("/followups")
async def get_followups(
    status: Optional[str] = None,
    followup_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    priority: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(require_permission("sales_dept", "lead_management"))
):
    """Get all follow-ups with filters - Sales department only"""
    
    query = {}
    
    if status:
        query["status"] = status
    if followup_type:
        query["followup_type"] = followup_type
    if assigned_to:
        query["assigned_to"] = assigned_to
    if customer_id:
        query["customer_id"] = customer_id
    if priority:
        query["priority"] = priority
    
    # Date range filter
    if date_from or date_to:
        query["scheduled_date"] = {}
        if date_from:
            query["scheduled_date"]["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        if date_to:
            query["scheduled_date"]["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
    
    # Search
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"lead_name": {"$regex": search, "$options": "i"}},
            {"lead_company": {"$regex": search, "$options": "i"}},
        ]
    
    # Get total count
    total = await db.followups.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    cursor = db.followups.find(query).sort("scheduled_date", 1).skip(skip).limit(limit)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    return {
        "followups": followups,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/followups/today")
async def get_todays_followups(assigned_to: Optional[str] = None):
    """Get today's follow-ups"""
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    query = {
        "scheduled_date": {"$gte": today_start, "$lt": today_end},
        "status": {"$in": ["scheduled", "pending"]}
    }
    
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    cursor = db.followups.find(query).sort("scheduled_time", 1)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    return {"followups": followups, "count": len(followups)}


@router.get("/followups/upcoming")
async def get_upcoming_followups(days: int = 7, assigned_to: Optional[str] = None):
    """Get upcoming follow-ups for next N days"""
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = today + timedelta(days=days)
    
    query = {
        "scheduled_date": {"$gte": today, "$lt": end_date},
        "status": {"$in": ["scheduled", "pending"]}
    }
    
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    cursor = db.followups.find(query).sort("scheduled_date", 1)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    return {"followups": followups, "count": len(followups)}


@router.get("/followups/overdue")
async def get_overdue_followups(assigned_to: Optional[str] = None):
    """Get overdue follow-ups"""
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = {
        "scheduled_date": {"$lt": today},
        "status": {"$in": ["scheduled", "pending"]}
    }
    
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    cursor = db.followups.find(query).sort("scheduled_date", 1)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    return {"followups": followups, "count": len(followups)}


@router.get("/followups/calendar")
async def get_calendar_followups(
    year: int,
    month: int,
    assigned_to: Optional[str] = None
):
    """Get follow-ups for calendar view (by month)"""
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    query = {
        "scheduled_date": {"$gte": start_date, "$lt": end_date}
    }
    
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    cursor = db.followups.find(query).sort("scheduled_date", 1)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    # Group by date for calendar
    calendar_data = {}
    for f in followups:
        date_key = f["scheduled_date"][:10] if f.get("scheduled_date") else None
        if date_key:
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(f)
    
    return {"followups": followups, "calendar": calendar_data}


@router.get("/followups/stats")
async def get_followup_stats(assigned_to: Optional[str] = None):
    """Get follow-up statistics"""
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)
    
    base_query = {}
    if assigned_to:
        base_query["assigned_to"] = assigned_to
    
    # Count by status
    scheduled = await db.followups.count_documents({**base_query, "status": "scheduled"})
    pending = await db.followups.count_documents({**base_query, "status": "pending"})
    completed = await db.followups.count_documents({**base_query, "status": "completed"})
    cancelled = await db.followups.count_documents({**base_query, "status": "cancelled"})
    
    # Today's count
    today_count = await db.followups.count_documents({
        **base_query,
        "scheduled_date": {"$gte": today, "$lt": tomorrow},
        "status": {"$in": ["scheduled", "pending"]}
    })
    
    # This week's count
    week_count = await db.followups.count_documents({
        **base_query,
        "scheduled_date": {"$gte": today, "$lt": week_end},
        "status": {"$in": ["scheduled", "pending"]}
    })
    
    # Overdue count
    overdue_count = await db.followups.count_documents({
        **base_query,
        "scheduled_date": {"$lt": today},
        "status": {"$in": ["scheduled", "pending"]}
    })
    
    # Count by type
    type_stats = {}
    for ftype in ["cold_call", "site_visit", "call_back", "visit_later", "general"]:
        type_stats[ftype] = await db.followups.count_documents({**base_query, "followup_type": ftype})
    
    return {
        "by_status": {
            "scheduled": scheduled,
            "pending": pending,
            "completed": completed,
            "cancelled": cancelled
        },
        "today": today_count,
        "this_week": week_count,
        "overdue": overdue_count,
        "by_type": type_stats,
        "total": scheduled + pending + completed + cancelled
    }


@router.get("/followups/{followup_id}")
async def get_followup(followup_id: str):
    """Get a single follow-up by ID"""
    
    followup = await db.followups.find_one({"id": followup_id})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return serialize_followup(followup)


@router.put("/followups/{followup_id}")
async def update_followup(followup_id: str, data: FollowUpUpdate):
    """Update a follow-up"""
    
    followup = await db.followups.find_one({"id": followup_id})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If status changed to completed, set completed_at
    if data.status == "completed" and followup.get("status") != "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)
    
    await db.followups.update_one(
        {"id": followup_id},
        {"$set": update_data}
    )
    
    return {"message": "Follow-up updated successfully"}


@router.post("/followups/{followup_id}/complete")
async def complete_followup(followup_id: str, outcome: str, next_action: Optional[str] = None):
    """Mark a follow-up as completed with outcome"""
    
    followup = await db.followups.find_one({"id": followup_id})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    await db.followups.update_one(
        {"id": followup_id},
        {"$set": {
            "status": "completed",
            "outcome": outcome,
            "next_action": next_action,
            "completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Follow-up marked as completed"}


@router.post("/followups/{followup_id}/reschedule")
async def reschedule_followup(followup_id: str, new_date: datetime, new_time: Optional[str] = None, reason: Optional[str] = None):
    """Reschedule a follow-up"""
    
    followup = await db.followups.find_one({"id": followup_id})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    # Add reschedule comment
    comment = {
        "type": "reschedule",
        "comment": f"Rescheduled from {followup.get('scheduled_date')} to {new_date.isoformat()}" + (f". Reason: {reason}" if reason else ""),
        "created_at": datetime.now(timezone.utc),
        "created_by": "system"
    }
    
    await db.followups.update_one(
        {"id": followup_id},
        {
            "$set": {
                "scheduled_date": new_date,
                "scheduled_time": new_time or followup.get("scheduled_time"),
                "status": "rescheduled",
                "updated_at": datetime.now(timezone.utc)
            },
            "$push": {"comments": comment}
        }
    )
    
    return {"message": "Follow-up rescheduled successfully"}


@router.post("/followups/{followup_id}/comments")
async def add_comment(followup_id: str, data: FollowUpComment):
    """Add a comment to a follow-up"""
    
    followup = await db.followups.find_one({"id": followup_id})
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    comment = {
        "id": str(uuid.uuid4()),
        "comment": data.comment,
        "created_by": data.created_by,
        "created_by_name": data.created_by_name,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.followups.update_one(
        {"id": followup_id},
        {
            "$push": {"comments": comment},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Comment added successfully", "comment_id": comment["id"]}


@router.delete("/followups/{followup_id}")
async def delete_followup(followup_id: str):
    """Delete a follow-up"""
    
    result = await db.followups.delete_one({"id": followup_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return {"message": "Follow-up deleted successfully"}


@router.get("/followups/customer/{customer_id}/history")
async def get_customer_followup_history(customer_id: str):
    """Get follow-up history for a specific customer"""
    
    cursor = db.followups.find({"customer_id": customer_id}).sort("scheduled_date", -1)
    followups = []
    async for doc in cursor:
        followups.append(serialize_followup(doc))
    
    return {"followups": followups, "count": len(followups)}


# ==================== TEAM MEMBERS FOR ASSIGNMENT ====================

@router.get("/team-members")
async def get_sales_team():
    """Get sales team members for assignment"""
    
    # Get users from sales department or with sales access
    cursor = db.users.find(
        {"$or": [
            {"department": {"$regex": "sales", "$options": "i"}},
            {"can_view_departments": {"$in": ["sales", "Sales"]}},
            {"role": {"$in": ["super_admin", "admin"]}}
        ]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department": 1}
    )
    
    team = []
    async for user in cursor:
        team.append(user)
    
    return {"team": team}


# ==================== CUSTOMER SEARCH FOR FOLLOW-UPS ====================

@router.get("/customers/search")
async def search_customers(search: str = "", limit: int = 20):
    """Search all customers (domestic + overseas) for follow-up linking"""
    
    if not search or len(search) < 2:
        return {"customers": [], "total": 0}
    
    # Search in clients collection (main customer database)
    query = {
        "$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    }
    
    cursor = db.clients.find(query, {"_id": 0}).limit(limit)
    customers = []
    async for doc in cursor:
        customer_type = doc.get("customer_type", "domestic")
        customers.append({
            "id": doc.get("id"),
            "name": doc.get("name") or doc.get("company_name"),
            "company_name": doc.get("company_name") or doc.get("name"),
            "contact_person": doc.get("contact_person"),
            "email": doc.get("email"),
            "phone": doc.get("phone"),
            "address": doc.get("address"),
            "type": customer_type,
            "display_name": doc.get("company_name") or doc.get("name")
        })
    
    return {"customers": customers, "total": len(customers)}
