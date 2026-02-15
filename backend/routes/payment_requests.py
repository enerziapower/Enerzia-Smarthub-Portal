"""
Payment Request Routes - Handles all payment request operations
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

import sys
sys.path.insert(0, '/app/backend')

from core.database import db
from core.security import get_current_user

router = APIRouter(prefix="/payment-requests", tags=["Payment Requests"])


# ==================== MODELS ====================

class PaymentRequestStatus(str, Enum):
    PENDING = "Pending"
    FINANCE_REVIEWED = "Finance Reviewed"
    CEO_APPROVED = "CEO Approved"
    PAID = "Paid"
    REJECTED = "Rejected"


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pr_no: str
    pid_no: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    amount: float
    employee_vendor_name: str
    vendor_po_no: Optional[str] = None
    purpose: str
    customer_site: Optional[str] = None
    category: str = "General"
    request_date: str
    requested_by: str
    requested_by_department: Optional[str] = None
    status: str = PaymentRequestStatus.PENDING
    finance_remarks: Optional[str] = None
    finance_reviewed_by: Optional[str] = None
    finance_reviewed_at: Optional[datetime] = None
    ceo_remarks: Optional[str] = None
    ceo_approved_by: Optional[str] = None
    ceo_approved_at: Optional[datetime] = None
    paid_date: Optional[str] = None
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentRequestCreate(BaseModel):
    pid_no: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    amount: float
    employee_vendor_name: str
    vendor_po_no: Optional[str] = None
    purpose: str
    customer_site: Optional[str] = None
    category: str = "General"
    request_date: Optional[str] = None


class PaymentRequestUpdate(BaseModel):
    amount: Optional[float] = None
    employee_vendor_name: Optional[str] = None
    vendor_po_no: Optional[str] = None
    purpose: Optional[str] = None
    customer_site: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    finance_remarks: Optional[str] = None
    ceo_remarks: Optional[str] = None
    paid_date: Optional[str] = None
    payment_reference: Optional[str] = None


# ==================== AUTH DEPENDENCY ====================

async def require_auth(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user


# ==================== ROUTES ====================

@router.get("")
async def get_payment_requests(
    status: Optional[str] = None,
    pid_no: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get all payment requests with optional filters"""
    query = {}
    
    if status:
        query["status"] = status
    if pid_no:
        query["pid_no"] = pid_no
    if department:
        query["requested_by_department"] = department
    
    requests = await db.payment_requests.find(query).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        req.pop("_id", None)
    
    return requests


@router.get("/next-pr-no")
async def get_next_pr_no(current_user: dict = Depends(require_auth)):
    """Get the next available PR number"""
    last_pr = await db.payment_requests.find_one(
        {},
        sort=[("pr_no", -1)]
    )
    
    if last_pr and last_pr.get("pr_no"):
        try:
            last_num = int(last_pr["pr_no"].split("-")[1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    
    return {"pr_no": f"PR-{next_num:03d}"}


@router.get("/stats")
async def get_payment_request_stats(
    department: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get payment request statistics"""
    query = {}
    if department:
        query["requested_by_department"] = department
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    results = await db.payment_requests.aggregate(pipeline).to_list(100)
    
    stats = {
        "pending": {"count": 0, "amount": 0},
        "finance_reviewed": {"count": 0, "amount": 0},
        "ceo_approved": {"count": 0, "amount": 0},
        "paid": {"count": 0, "amount": 0},
        "rejected": {"count": 0, "amount": 0},
        "total": {"count": 0, "amount": 0}
    }
    
    for r in results:
        status_key = r["_id"].lower().replace(" ", "_")
        if status_key in stats:
            stats[status_key] = {"count": r["count"], "amount": r["total_amount"]}
        stats["total"]["count"] += r["count"]
        stats["total"]["amount"] += r["total_amount"]
    
    return stats


@router.get("/by-project/{project_id}")
async def get_payment_requests_by_project(
    project_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get all payment requests for a specific project"""
    requests = await db.payment_requests.find(
        {"project_id": project_id}
    ).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        req.pop("_id", None)
    
    return requests


@router.get("/{request_id}")
async def get_payment_request(
    request_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get a specific payment request"""
    request = await db.payment_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return request


@router.post("")
async def create_payment_request(
    data: PaymentRequestCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new payment request"""
    next_pr = await get_next_pr_no(current_user)
    
    request = PaymentRequest(
        pr_no=next_pr["pr_no"],
        pid_no=data.pid_no,
        project_id=data.project_id,
        project_name=data.project_name,
        amount=data.amount,
        employee_vendor_name=data.employee_vendor_name,
        vendor_po_no=data.vendor_po_no,
        purpose=data.purpose,
        customer_site=data.customer_site,
        category=data.category,
        request_date=data.request_date or datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        requested_by=current_user.get("name", "Unknown"),
        requested_by_department=current_user.get("department"),
        status=PaymentRequestStatus.PENDING
    )
    
    await db.payment_requests.insert_one(request.model_dump())
    
    return {"message": "Payment request created", "id": request.id, "pr_no": request.pr_no}


@router.put("/{request_id}")
async def update_payment_request(
    request_id: str,
    data: PaymentRequestUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update a payment request"""
    existing = await db.payment_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {"message": "Payment request updated"}


@router.put("/{request_id}/finance-review")
async def finance_review_payment_request(
    request_id: str,
    data: dict,
    current_user: dict = Depends(require_auth)
):
    """Finance department reviews a payment request"""
    existing = await db.payment_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if existing.get("status") != PaymentRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only review pending requests")
    
    action = data.get("action", "approve")
    remarks = data.get("remarks", "")
    
    if action == "reject":
        new_status = PaymentRequestStatus.REJECTED
    else:
        new_status = PaymentRequestStatus.FINANCE_REVIEWED
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": new_status,
            "finance_remarks": remarks,
            "finance_reviewed_by": current_user.get("name", "Unknown"),
            "finance_reviewed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": f"Payment request {action}ed by Finance"}


@router.put("/{request_id}/ceo-approve")
async def ceo_approve_payment_request(
    request_id: str,
    data: dict,
    current_user: dict = Depends(require_auth)
):
    """CEO/Owner approves or rejects a payment request"""
    existing = await db.payment_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if existing.get("status") != PaymentRequestStatus.FINANCE_REVIEWED:
        raise HTTPException(status_code=400, detail="Can only approve requests reviewed by Finance")
    
    action = data.get("action", "approve")
    remarks = data.get("remarks", "")
    
    if action == "reject":
        new_status = PaymentRequestStatus.REJECTED
    else:
        new_status = PaymentRequestStatus.CEO_APPROVED
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": new_status,
            "ceo_remarks": remarks,
            "ceo_approved_by": current_user.get("name", "Unknown"),
            "ceo_approved_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": f"Payment request {action}ed by CEO"}


@router.put("/{request_id}/mark-paid")
async def mark_payment_request_paid(
    request_id: str,
    data: dict,
    current_user: dict = Depends(require_auth)
):
    """Mark a payment request as paid"""
    existing = await db.payment_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if existing.get("status") != PaymentRequestStatus.CEO_APPROVED:
        raise HTTPException(status_code=400, detail="Can only mark CEO approved requests as paid")
    
    paid_date = data.get("paid_date", datetime.now(timezone.utc).strftime("%d/%m/%Y"))
    payment_reference = data.get("payment_reference", "")
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": PaymentRequestStatus.PAID,
            "paid_date": paid_date,
            "payment_reference": payment_reference,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update project expenses if linked to a project
    if existing.get("project_id"):
        paid_requests = await db.payment_requests.find({
            "project_id": existing["project_id"],
            "status": PaymentRequestStatus.PAID
        }).to_list(1000)
        
        total_expenses = sum(r.get("amount", 0) for r in paid_requests)
        total_expenses += existing.get("amount", 0)  # Include current
        
        project = await db.projects.find_one({"id": existing["project_id"]})
        if project:
            po_amount = project.get("po_amount", 0)
            pid_savings = po_amount - total_expenses
            
            await db.projects.update_one(
                {"id": existing["project_id"]},
                {"$set": {
                    "actual_expenses": total_expenses,
                    "pid_savings": pid_savings,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
    
    return {"message": "Payment request marked as paid"}


@router.delete("/{request_id}")
async def delete_payment_request(
    request_id: str,
    current_user: dict = Depends(require_auth)
):
    """Delete a payment request (only if pending)"""
    existing = await db.payment_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    if existing.get("status") != PaymentRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only delete pending requests")
    
    await db.payment_requests.delete_one({"id": request_id})
    
    return {"message": "Payment request deleted"}
