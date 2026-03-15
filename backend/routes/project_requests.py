"""
Project Requests API Routes
- Material Requests (linked to Purchase Management)
- Vendor Requests (linked to Purchase Management)
- Payment Requests (linked to Payment Management)

These requests are raised from Project Management and processed by respective departments.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/project-requests", tags=["Project Requests"])


# ============== MODELS ==============

class MaterialRequestItem(BaseModel):
    """Single material item in a request"""
    description: str
    quantity: float = 1
    unit: str = "Nos"
    estimated_cost: float = 0
    remarks: Optional[str] = None


class MaterialRequestCreate(BaseModel):
    """Create a material request from Project Management"""
    order_id: str  # Linked sales order
    order_no: str  # PID number for display
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[MaterialRequestItem]
    required_by: Optional[str] = None
    priority: str = "medium"  # low, medium, high, urgent
    notes: Optional[str] = None
    requested_by: Optional[str] = None


class VendorRequestCreate(BaseModel):
    """Create a vendor/subcontractor request"""
    order_id: str
    order_no: str
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    service_type: str  # Subcontractor, Rental, Service Provider
    description: str
    estimated_cost: float = 0
    required_by: Optional[str] = None
    priority: str = "medium"
    notes: Optional[str] = None
    requested_by: Optional[str] = None


class PaymentRequestCreate(BaseModel):
    """Create a payment request from Project Management"""
    order_id: str
    order_no: str
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    payment_type: str  # Advance, Milestone, Final, Vendor Payment
    payee: str
    amount: float
    due_date: Optional[str] = None
    bank_details: Optional[str] = None
    priority: str = "medium"
    notes: Optional[str] = None
    requested_by: Optional[str] = None


class RequestStatusUpdate(BaseModel):
    """Update request status"""
    status: str
    comments: Optional[str] = None
    updated_by: Optional[str] = None


# ============== REQUEST NUMBERING ==============

async def generate_request_number(prefix: str) -> str:
    """Generate unique request number like MR-2526-001, VR-2526-001, PR-2526-001"""
    today = datetime.now()
    month = today.month
    year = today.year
    
    # Determine financial year
    if month >= 4:
        fy = f"{str(year)[2:]}{str(year + 1)[2:]}"
    else:
        fy = f"{str(year - 1)[2:]}{str(year)[2:]}"
    
    # Get count for this FY
    pattern = f"^{prefix}-{fy}-"
    count = await db.project_requests.count_documents({"request_no": {"$regex": pattern}})
    
    return f"{prefix}-{fy}-{str(count + 1).zfill(3)}"


# ============== MATERIAL REQUESTS ==============

@router.post("/materials")
async def create_material_request(data: MaterialRequestCreate):
    """Create a new material request from Project Management"""
    request_no = await generate_request_number("MR")
    now = datetime.now(timezone.utc)
    
    total_estimated = sum(item.estimated_cost * item.quantity for item in data.items)
    
    request_data = {
        "id": str(uuid.uuid4()),
        "request_no": request_no,
        "request_type": "material",
        "order_id": data.order_id,
        "order_no": data.order_no,
        "project_name": data.project_name,
        "customer_name": data.customer_name,
        "items": [item.dict() for item in data.items],
        "total_items": len(data.items),
        "estimated_cost": total_estimated,
        "required_by": data.required_by,
        "priority": data.priority,
        "notes": data.notes,
        "status": "pending",
        "requested_by": data.requested_by,
        "department": "projects",
        "created_at": now,
        "updated_at": now,
        "status_history": [{
            "status": "pending",
            "timestamp": now.isoformat(),
            "user": data.requested_by,
            "comments": "Request created"
        }]
    }
    
    await db.project_requests.insert_one(request_data)
    request_data.pop("_id", None)
    
    return {"message": f"Material request {request_no} created", "request": request_data}


@router.get("/materials")
async def get_material_requests(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all material requests"""
    query = {"request_type": "material"}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    cursor = db.project_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    requests = await cursor.to_list(length=limit)
    total = await db.project_requests.count_documents(query)
    
    return {"requests": requests, "total": total}


# ============== VENDOR REQUESTS ==============

@router.post("/vendors")
async def create_vendor_request(data: VendorRequestCreate):
    """Create a new vendor/subcontractor request"""
    request_no = await generate_request_number("VR")
    now = datetime.now(timezone.utc)
    
    request_data = {
        "id": str(uuid.uuid4()),
        "request_no": request_no,
        "request_type": "vendor",
        "order_id": data.order_id,
        "order_no": data.order_no,
        "project_name": data.project_name,
        "customer_name": data.customer_name,
        "service_type": data.service_type,
        "description": data.description,
        "estimated_cost": data.estimated_cost,
        "required_by": data.required_by,
        "priority": data.priority,
        "notes": data.notes,
        "status": "pending",
        "requested_by": data.requested_by,
        "department": "projects",
        "created_at": now,
        "updated_at": now,
        "status_history": [{
            "status": "pending",
            "timestamp": now.isoformat(),
            "user": data.requested_by,
            "comments": "Request created"
        }]
    }
    
    await db.project_requests.insert_one(request_data)
    request_data.pop("_id", None)
    
    return {"message": f"Vendor request {request_no} created", "request": request_data}


@router.get("/vendors")
async def get_vendor_requests(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all vendor requests"""
    query = {"request_type": "vendor"}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    
    cursor = db.project_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    requests = await cursor.to_list(length=limit)
    total = await db.project_requests.count_documents(query)
    
    return {"requests": requests, "total": total}


# ============== PAYMENT REQUESTS ==============

@router.post("/payments")
async def create_payment_request(data: PaymentRequestCreate):
    """Create a new payment request from Project Management"""
    request_no = await generate_request_number("PR")
    now = datetime.now(timezone.utc)
    
    request_data = {
        "id": str(uuid.uuid4()),
        "request_no": request_no,
        "request_type": "payment",
        "order_id": data.order_id,
        "order_no": data.order_no,
        "project_name": data.project_name,
        "customer_name": data.customer_name,
        "payment_type": data.payment_type,
        "payee": data.payee,
        "vendor_name": data.payee,  # Alias for PaymentManagement compatibility
        "amount": data.amount,
        "due_date": data.due_date,
        "bank_details": data.bank_details,
        "priority": data.priority,
        "notes": data.notes,
        "title": f"{data.payment_type} - {data.order_no}",  # For PaymentManagement display
        "description": data.notes,
        "status": "pending",
        "requested_by": data.requested_by,
        "department": "projects",
        "created_at": now,
        "updated_at": now,
        "status_history": [{
            "status": "pending",
            "timestamp": now.isoformat(),
            "user": data.requested_by,
            "comments": "Request created"
        }]
    }
    
    await db.project_requests.insert_one(request_data)
    request_data.pop("_id", None)
    
    return {"message": f"Payment request {request_no} created", "request": request_data}


@router.get("/payments")
async def get_payment_requests(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all payment requests from projects"""
    query = {"request_type": "payment"}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    
    cursor = db.project_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    requests = await cursor.to_list(length=limit)
    total = await db.project_requests.count_documents(query)
    
    return {"requests": requests, "total": total}


# ============== COMMON ENDPOINTS ==============

@router.get("/all")
async def get_all_requests(
    order_id: Optional[str] = None,
    request_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all project requests (materials, vendors, payments)"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if request_type:
        query["request_type"] = request_type
    if status:
        query["status"] = status
    
    cursor = db.project_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    requests = await cursor.to_list(length=limit)
    total = await db.project_requests.count_documents(query)
    
    # Calculate stats
    stats = {
        "total": total,
        "pending": sum(1 for r in requests if r.get("status") == "pending"),
        "approved": sum(1 for r in requests if r.get("status") == "approved"),
        "in_progress": sum(1 for r in requests if r.get("status") == "in_progress"),
        "completed": sum(1 for r in requests if r.get("status") == "completed"),
        "materials": sum(1 for r in requests if r.get("request_type") == "material"),
        "vendors": sum(1 for r in requests if r.get("request_type") == "vendor"),
        "payments": sum(1 for r in requests if r.get("request_type") == "payment")
    }
    
    return {"requests": requests, "total": total, "stats": stats}


@router.get("/by-order/{order_id}")
async def get_requests_by_order(order_id: str):
    """Get all requests for a specific order/project"""
    cursor = db.project_requests.find({"order_id": order_id}, {"_id": 0}).sort("created_at", -1)
    requests = await cursor.to_list(length=100)
    
    # Group by type
    grouped = {
        "materials": [r for r in requests if r.get("request_type") == "material"],
        "vendors": [r for r in requests if r.get("request_type") == "vendor"],
        "payments": [r for r in requests if r.get("request_type") == "payment"]
    }
    
    return {"order_id": order_id, "requests": grouped, "total": len(requests)}


@router.get("/{request_id}")
async def get_request_details(request_id: str):
    """Get single request details"""
    request = await db.project_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.put("/{request_id}/status")
async def update_request_status(request_id: str, data: RequestStatusUpdate):
    """Update request status (used by Purchase/Payment Management)"""
    valid_statuses = ["pending", "approved", "rejected", "in_progress", "completed", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    request = await db.project_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    now = datetime.now(timezone.utc)
    
    # Add to status history
    status_entry = {
        "status": data.status,
        "timestamp": now.isoformat(),
        "user": data.updated_by,
        "comments": data.comments
    }
    
    await db.project_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": data.status,
                "updated_at": now
            },
            "$push": {
                "status_history": status_entry
            }
        }
    )
    
    return {"message": f"Status updated to {data.status}", "status": data.status}


@router.delete("/{request_id}")
async def delete_request(request_id: str):
    """Delete a request (only if pending)"""
    request = await db.project_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("status") not in ["pending", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail="Can only delete pending, rejected, or cancelled requests")
    
    await db.project_requests.delete_one({"id": request_id})
    return {"message": "Request deleted successfully"}


# ============== DASHBOARD STATS ==============

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get overall stats for project requests"""
    pipeline = [
        {
            "$group": {
                "_id": {
                    "type": "$request_type",
                    "status": "$status"
                },
                "count": {"$sum": 1},
                "total_amount": {"$sum": {"$ifNull": ["$amount", "$estimated_cost", 0]}}
            }
        }
    ]
    
    results = await db.project_requests.aggregate(pipeline).to_list(100)
    
    stats = {
        "materials": {"pending": 0, "approved": 0, "completed": 0, "total": 0},
        "vendors": {"pending": 0, "approved": 0, "completed": 0, "total": 0},
        "payments": {"pending": 0, "approved": 0, "completed": 0, "total": 0, "total_amount": 0}
    }
    
    for r in results:
        req_type = r["_id"]["type"]
        status = r["_id"]["status"]
        count = r["count"]
        
        if req_type in stats:
            stats[req_type][status] = count
            stats[req_type]["total"] += count
            if req_type == "payments":
                stats["payments"]["total_amount"] += r.get("total_amount", 0)
    
    return stats
