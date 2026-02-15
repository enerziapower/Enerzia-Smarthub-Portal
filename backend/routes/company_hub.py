"""
Company Hub Routes - Central functions shared across departments
Includes: Weekly Meetings, Payment Requests
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os

router = APIRouter(prefix="/api/company", tags=["Company Hub"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============= MODELS =============

class WeeklyMeetingCreate(BaseModel):
    department: str
    week_start: str  # YYYY-MM-DD
    week_end: str
    tasks_completed: List[str] = []
    tasks_pending: List[str] = []
    blockers: List[str] = []
    next_week_plan: List[str] = []
    notes: Optional[str] = ""


class PaymentRequestCreate(BaseModel):
    title: str
    amount: float
    category: str  # Vendor Payment, Reimbursement, Salary Advance, Petty Cash, Other
    department: str
    description: str
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    due_date: Optional[str] = None
    urgency: str = "normal"  # low, normal, high, urgent


# Helper to serialize MongoDB documents
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ============= WEEKLY MEETINGS =============

@router.get("/weekly-meetings")
async def get_weekly_meetings(
    department: Optional[str] = None,
    week_start: Optional[str] = None,
    limit: int = 20
):
    """Get weekly meeting records"""
    query = {}
    if department:
        query["department"] = department
    if week_start:
        query["week_start"] = week_start
    
    cursor = db.weekly_meetings.find(query).sort("created_at", -1).limit(limit)
    meetings = []
    async for doc in cursor:
        meetings.append(serialize_doc(doc))
    return {"meetings": meetings}


@router.get("/weekly-meetings/{meeting_id}")
async def get_weekly_meeting(meeting_id: str):
    """Get a specific weekly meeting by ID"""
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    doc = await db.weekly_meetings.find_one({"_id": ObjectId(meeting_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return serialize_doc(doc)


@router.post("/weekly-meetings")
async def create_weekly_meeting(
    meeting: WeeklyMeetingCreate,
    submitted_by: str,
    submitted_by_id: str
):
    """Create a new weekly meeting entry"""
    doc = {
        **meeting.dict(),
        "submitted_by": submitted_by,
        "submitted_by_id": submitted_by_id,
        "status": "submitted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.weekly_meetings.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Weekly meeting report submitted", "meeting": doc}


@router.put("/weekly-meetings/{meeting_id}")
async def update_weekly_meeting(meeting_id: str, meeting: WeeklyMeetingCreate):
    """Update a weekly meeting entry"""
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    update_data = {
        **meeting.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.weekly_meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Weekly meeting updated"}


@router.delete("/weekly-meetings/{meeting_id}")
async def delete_weekly_meeting(meeting_id: str):
    """Delete a weekly meeting entry"""
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID")
    
    result = await db.weekly_meetings.delete_one({"_id": ObjectId(meeting_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Weekly meeting deleted"}


@router.get("/weekly-meetings/summary/departments")
async def get_weekly_summary_by_departments(week_start: str):
    """Get summary of weekly meetings grouped by department"""
    pipeline = [
        {"$match": {"week_start": week_start}},
        {"$group": {
            "_id": "$department",
            "count": {"$sum": 1},
            "total_completed": {"$sum": {"$size": "$tasks_completed"}},
            "total_pending": {"$sum": {"$size": "$tasks_pending"}},
            "total_blockers": {"$sum": {"$size": "$blockers"}}
        }}
    ]
    
    cursor = db.weekly_meetings.aggregate(pipeline)
    summary = []
    async for doc in cursor:
        summary.append({
            "department": doc["_id"],
            "reportCount": doc["count"],
            "tasksCompleted": doc["total_completed"],
            "tasksPending": doc["total_pending"],
            "blockers": doc["total_blockers"]
        })
    return {"summary": summary, "week_start": week_start}


# ============= PAYMENT REQUESTS =============

@router.get("/payment-requests")
async def get_payment_requests(
    department: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50
):
    """Get payment requests"""
    query = {}
    if department:
        query["department"] = department
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    cursor = db.payment_requests.find(query).sort("created_at", -1).limit(limit)
    requests = []
    async for doc in cursor:
        requests.append(serialize_doc(doc))
    return {"requests": requests}


@router.get("/payment-requests/{request_id}")
async def get_payment_request(request_id: str):
    """Get a specific payment request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    doc = await db.payment_requests.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return serialize_doc(doc)


@router.post("/payment-requests")
async def create_payment_request(
    request: PaymentRequestCreate,
    requested_by: str,
    requested_by_id: str
):
    """Create a new payment request"""
    doc = {
        **request.dict(),
        "requested_by": requested_by,
        "requested_by_id": requested_by_id,
        "status": "pending",
        "approved_by": None,
        "approved_at": None,
        "rejected_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.payment_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Payment request submitted", "request": doc}


@router.put("/payment-requests/{request_id}")
async def update_payment_request(request_id: str, request: PaymentRequestCreate):
    """Update a payment request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    update_data = {
        **request.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.payment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return {"message": "Payment request updated"}


@router.put("/payment-requests/{request_id}/approve")
async def approve_payment_request(request_id: str, approved_by: str):
    """Approve a payment request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    result = await db.payment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return {"message": "Payment request approved"}


@router.put("/payment-requests/{request_id}/reject")
async def reject_payment_request(request_id: str, rejected_by: str, reason: str = ""):
    """Reject a payment request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    result = await db.payment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "rejected",
            "approved_by": rejected_by,
            "rejected_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return {"message": "Payment request rejected"}


@router.put("/payment-requests/{request_id}/process")
async def process_payment_request(request_id: str, processed_by: str, transaction_ref: str = ""):
    """Mark a payment request as processed/paid"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    result = await db.payment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "processed",
            "processed_by": processed_by,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "transaction_ref": transaction_ref,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return {"message": "Payment marked as processed"}


@router.delete("/payment-requests/{request_id}")
async def delete_payment_request(request_id: str):
    """Delete a payment request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    result = await db.payment_requests.delete_one({"_id": ObjectId(request_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return {"message": "Payment request deleted"}


@router.get("/payment-requests/stats/summary")
async def get_payment_requests_summary():
    """Get summary statistics for payment requests"""
    # Count by status
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    cursor = db.payment_requests.aggregate(pipeline)
    by_status = {}
    async for doc in cursor:
        by_status[doc["_id"]] = {
            "count": doc["count"],
            "amount": doc["total_amount"]
        }
    
    # Count by department
    pipeline = [
        {"$group": {
            "_id": "$department",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    cursor = db.payment_requests.aggregate(pipeline)
    by_department = {}
    async for doc in cursor:
        by_department[doc["_id"]] = {
            "count": doc["count"],
            "amount": doc["total_amount"]
        }
    
    return {
        "by_status": by_status,
        "by_department": by_department,
        "totals": {
            "pending": by_status.get("pending", {"count": 0, "amount": 0}),
            "approved": by_status.get("approved", {"count": 0, "amount": 0}),
            "processed": by_status.get("processed", {"count": 0, "amount": 0}),
            "rejected": by_status.get("rejected", {"count": 0, "amount": 0})
        }
    }
