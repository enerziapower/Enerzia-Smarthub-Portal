"""
Expense Management Module (Phase 3)
- Enhanced Expense Tracking with Receipt Upload
- Approval Workflow (Submit → Review → Approve/Reject)
- Expense Dashboard & Analytics
- Category-wise Reports
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import io
import base64
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/expense-management", tags=["Expense Management"])

# Upload directory
UPLOADS_DIR = Path("/app/uploads/expenses")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# ============== MODELS ==============

class ExpenseCreate(BaseModel):
    """Create an expense entry"""
    order_id: str
    category: str  # material_purchase, labor, transport, site_expenses, subcontractor, equipment_rental, misc
    description: str
    amount: float
    date: str
    vendor: Optional[str] = None
    reference_no: Optional[str] = None  # Bill/Receipt number
    payment_mode: Optional[str] = None  # cash, bank, upi, credit
    remarks: Optional[str] = None
    created_by: Optional[str] = None


class ExpenseUpdate(BaseModel):
    """Update an expense entry"""
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    vendor: Optional[str] = None
    reference_no: Optional[str] = None
    payment_mode: Optional[str] = None
    remarks: Optional[str] = None


class ApprovalAction(BaseModel):
    """Approval action"""
    action: str  # approve, reject, request_info
    approved_by: str
    comments: Optional[str] = None


class BulkApproveRequest(BaseModel):
    """Bulk approve request"""
    expense_ids: List[str]
    approved_by: str
    comments: Optional[str] = "Bulk approved"


# ============== EXPENSE CATEGORIES ==============

EXPENSE_CATEGORIES = [
    {"value": "material_purchase", "label": "Material Purchase", "icon": "Package"},
    {"value": "labor", "label": "Labor / Manpower", "icon": "Users"},
    {"value": "transport", "label": "Transport & Logistics", "icon": "Truck"},
    {"value": "site_expenses", "label": "Site Expenses", "icon": "Building"},
    {"value": "subcontractor", "label": "Subcontractor Payments", "icon": "Briefcase"},
    {"value": "equipment_rental", "label": "Equipment Rental", "icon": "Tool"},
    {"value": "travel", "label": "Travel & Accommodation", "icon": "Plane"},
    {"value": "misc", "label": "Miscellaneous", "icon": "MoreHorizontal"}
]

PAYMENT_MODES = [
    {"value": "cash", "label": "Cash"},
    {"value": "bank", "label": "Bank Transfer"},
    {"value": "upi", "label": "UPI"},
    {"value": "cheque", "label": "Cheque"},
    {"value": "credit", "label": "Credit Card"},
    {"value": "petty_cash", "label": "Petty Cash"}
]


# ============== HELPER FUNCTIONS ==============

async def generate_expense_no():
    """Generate unique expense number"""
    count = await db.expenses_v2.count_documents({})
    year = datetime.now().year
    return f"EXP-{year}-{str(count + 1).zfill(5)}"


def get_file_extension(filename: str) -> str:
    """Get file extension"""
    return filename.split('.')[-1].lower() if '.' in filename else ''


async def save_upload_file(file: UploadFile, expense_id: str) -> dict:
    """Save uploaded file and return file info"""
    ext = get_file_extension(file.filename)
    allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    new_filename = f"{expense_id}_{file_id}.{ext}"
    file_path = UPLOADS_DIR / new_filename
    
    # Save file
    content = await file.read()
    with open(file_path, 'wb') as f:
        f.write(content)
    
    return {
        "id": file_id,
        "original_name": file.filename,
        "stored_name": new_filename,
        "size": len(content),
        "type": ext,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }


# ============== EXPENSE CRUD ENDPOINTS ==============

@router.get("/expenses")
async def get_expenses(
    order_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,  # pending, submitted, approved, rejected, info_requested
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all expenses with filters"""
    query = {}
    
    if order_id:
        query["order_id"] = order_id
    if category:
        query["category"] = category
    if status:
        query["approval_status"] = status
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    cursor = db.expenses_v2.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(length=limit)
    total = await db.expenses_v2.count_documents(query)
    
    # Calculate totals
    total_amount = sum(e.get("amount", 0) for e in expenses)
    approved_amount = sum(e.get("amount", 0) for e in expenses if e.get("approval_status") == "approved")
    pending_amount = sum(e.get("amount", 0) for e in expenses if e.get("approval_status") in ["pending", "submitted"])
    
    return {
        "expenses": expenses,
        "total": total,
        "total_amount": total_amount,
        "approved_amount": approved_amount,
        "pending_amount": pending_amount
    }


@router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str):
    """Get expense details"""
    expense = await db.expenses_v2.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Get order details
    order = None
    if expense.get("order_id"):
        order = await db.sales_orders.find_one({"id": expense["order_id"]}, {"_id": 0})
    
    return {"expense": expense, "order": order}


@router.post("/expenses")
async def create_expense(data: ExpenseCreate):
    """Create a new expense entry"""
    # Verify order exists
    order = await db.sales_orders.find_one({"id": data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    expense_no = await generate_expense_no()
    
    expense = {
        "id": str(uuid.uuid4()),
        "expense_no": expense_no,
        "order_id": data.order_id,
        "order_no": order.get("order_no"),
        "customer_name": order.get("customer_name"),
        "category": data.category,
        "description": data.description,
        "amount": data.amount,
        "date": data.date,
        "vendor": data.vendor,
        "reference_no": data.reference_no,
        "payment_mode": data.payment_mode,
        "remarks": data.remarks,
        "attachments": [],
        "approval_status": "pending",  # pending, submitted, approved, rejected, info_requested
        "approval_history": [],
        "created_by": data.created_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.expenses_v2.insert_one(expense)
    expense.pop("_id", None)
    
    return {"message": "Expense created", "expense": expense}


@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: ExpenseUpdate):
    """Update an expense entry (only if not approved)"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot edit approved expense")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Reset approval status if editing after rejection/info request
    if expense.get("approval_status") in ["rejected", "info_requested"]:
        update_data["approval_status"] = "pending"
    
    await db.expenses_v2.update_one(
        {"id": expense_id},
        {"$set": update_data}
    )
    
    updated = await db.expenses_v2.find_one({"id": expense_id}, {"_id": 0})
    return {"message": "Expense updated", "expense": updated}


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense (only if pending)"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot delete approved expense")
    
    # Delete attachments
    for attachment in expense.get("attachments", []):
        file_path = UPLOADS_DIR / attachment.get("stored_name", "")
        if file_path.exists():
            file_path.unlink()
    
    await db.expenses_v2.delete_one({"id": expense_id})
    return {"message": "Expense deleted"}


# ============== FILE UPLOAD ENDPOINTS ==============

@router.post("/expenses/{expense_id}/upload")
async def upload_receipt(expense_id: str, file: UploadFile = File(...)):
    """Upload receipt/bill attachment for an expense"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot modify approved expense")
    
    # Save file
    file_info = await save_upload_file(file, expense_id)
    
    # Update expense with attachment
    await db.expenses_v2.update_one(
        {"id": expense_id},
        {
            "$push": {"attachments": file_info},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "File uploaded", "attachment": file_info}


@router.get("/expenses/{expense_id}/attachments/{file_id}")
async def get_attachment(expense_id: str, file_id: str):
    """Get/download attachment"""
    expense = await db.expenses_v2.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    attachment = next((a for a in expense.get("attachments", []) if a.get("id") == file_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    file_path = UPLOADS_DIR / attachment.get("stored_name", "")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=attachment.get("original_name"),
        media_type="application/octet-stream"
    )


@router.delete("/expenses/{expense_id}/attachments/{file_id}")
async def delete_attachment(expense_id: str, file_id: str):
    """Delete an attachment"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot modify approved expense")
    
    attachment = next((a for a in expense.get("attachments", []) if a.get("id") == file_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file
    file_path = UPLOADS_DIR / attachment.get("stored_name", "")
    if file_path.exists():
        file_path.unlink()
    
    # Update expense
    await db.expenses_v2.update_one(
        {"id": expense_id},
        {
            "$pull": {"attachments": {"id": file_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Attachment deleted"}


# ============== APPROVAL WORKFLOW ENDPOINTS ==============

@router.put("/expenses/{expense_id}/submit")
async def submit_for_approval(expense_id: str, submitted_by: str = ""):
    """Submit expense for approval"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") not in ["pending", "info_requested", "rejected"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit expense in '{expense.get('approval_status')}' status")
    
    # Add to approval history
    history_entry = {
        "action": "submitted",
        "by": submitted_by or expense.get("created_by", ""),
        "at": datetime.now(timezone.utc).isoformat(),
        "comments": "Submitted for approval"
    }
    
    await db.expenses_v2.update_one(
        {"id": expense_id},
        {
            "$set": {
                "approval_status": "submitted",
                "submitted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            },
            "$push": {"approval_history": history_entry}
        }
    )
    
    updated = await db.expenses_v2.find_one({"id": expense_id}, {"_id": 0})
    return {"message": "Expense submitted for approval", "expense": updated}


@router.put("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, data: ApprovalAction):
    """Approve, reject, or request info for an expense"""
    expense = await db.expenses_v2.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.get("approval_status") not in ["submitted", "info_requested"]:
        raise HTTPException(status_code=400, detail=f"Cannot process expense in '{expense.get('approval_status')}' status")
    
    valid_actions = ["approve", "reject", "request_info"]
    if data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    
    # Map action to status
    status_map = {
        "approve": "approved",
        "reject": "rejected",
        "request_info": "info_requested"
    }
    new_status = status_map[data.action]
    
    # Add to approval history
    history_entry = {
        "action": data.action,
        "by": data.approved_by,
        "at": datetime.now(timezone.utc).isoformat(),
        "comments": data.comments or ""
    }
    
    update_data = {
        "approval_status": new_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if data.action == "approve":
        update_data["approved_by"] = data.approved_by
        update_data["approved_at"] = datetime.now(timezone.utc)
    
    await db.expenses_v2.update_one(
        {"id": expense_id},
        {
            "$set": update_data,
            "$push": {"approval_history": history_entry}
        }
    )
    
    updated = await db.expenses_v2.find_one({"id": expense_id}, {"_id": 0})
    return {"message": f"Expense {data.action}d", "expense": updated}


@router.get("/approval-queue")
async def get_approval_queue(
    status: str = "submitted",
    limit: int = 100,
    skip: int = 0
):
    """Get expenses pending approval"""
    query = {"approval_status": status}
    
    cursor = db.expenses_v2.find(query, {"_id": 0}).sort("submitted_at", 1).skip(skip).limit(limit)
    expenses = await cursor.to_list(length=limit)
    total = await db.expenses_v2.count_documents(query)
    total_amount = sum(e.get("amount", 0) for e in expenses)
    
    return {
        "expenses": expenses,
        "total": total,
        "total_amount": total_amount
    }


@router.post("/bulk-approve")
async def bulk_approve(data: BulkApproveRequest):
    """Bulk approve multiple expenses"""
    approved_count = 0
    failed = []
    
    for expense_id in data.expense_ids:
        try:
            expense = await db.expenses_v2.find_one({"id": expense_id})
            if expense and expense.get("approval_status") == "submitted":
                history_entry = {
                    "action": "approve",
                    "by": data.approved_by,
                    "at": datetime.now(timezone.utc).isoformat(),
                    "comments": data.comments or "Bulk approved"
                }
                
                await db.expenses_v2.update_one(
                    {"id": expense_id},
                    {
                        "$set": {
                            "approval_status": "approved",
                            "approved_by": data.approved_by,
                            "approved_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc)
                        },
                        "$push": {"approval_history": history_entry}
                    }
                )
                approved_count += 1
            else:
                failed.append({"id": expense_id, "reason": "Not in submitted status"})
        except Exception as e:
            failed.append({"id": expense_id, "reason": str(e)})
    
    return {
        "message": f"Approved {approved_count} expenses",
        "approved_count": approved_count,
        "failed": failed
    }


# ============== DASHBOARD & ANALYTICS ==============

@router.get("/dashboard/stats")
async def get_expense_dashboard_stats():
    """Get expense dashboard statistics"""
    # Status counts
    status_pipeline = [
        {"$group": {"_id": "$approval_status", "count": {"$sum": 1}, "amount": {"$sum": "$amount"}}}
    ]
    status_result = await db.expenses_v2.aggregate(status_pipeline).to_list(100)
    by_status = {s["_id"]: {"count": s["count"], "amount": s["amount"]} for s in status_result}
    
    # Category breakdown
    category_pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}, "amount": {"$sum": "$amount"}}}
    ]
    category_result = await db.expenses_v2.aggregate(category_pipeline).to_list(100)
    by_category = {c["_id"]: {"count": c["count"], "amount": c["amount"]} for c in category_result}
    
    # Total counts
    total = await db.expenses_v2.count_documents({})
    pending_approval = await db.expenses_v2.count_documents({"approval_status": "submitted"})
    
    # Total amounts
    total_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.expenses_v2.aggregate(total_pipeline).to_list(1)
    total_amount = total_result[0]["total"] if total_result else 0
    
    approved_pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    approved_result = await db.expenses_v2.aggregate(approved_pipeline).to_list(1)
    approved_amount = approved_result[0]["total"] if approved_result else 0
    
    # This month
    now = datetime.now(timezone.utc)
    month_start = f"{now.year}-{str(now.month).zfill(2)}-01"
    this_month_pipeline = [
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "amount": {"$sum": "$amount"}}}
    ]
    month_result = await db.expenses_v2.aggregate(this_month_pipeline).to_list(1)
    this_month = month_result[0] if month_result else {"count": 0, "amount": 0}
    
    return {
        "total_expenses": total,
        "total_amount": total_amount,
        "approved_amount": approved_amount,
        "pending_approval": pending_approval,
        "pending_amount": by_status.get("submitted", {}).get("amount", 0),
        "by_status": by_status,
        "by_category": by_category,
        "this_month": this_month
    }


@router.get("/dashboard/order-expenses")
async def get_order_expenses_summary(limit: int = 20):
    """Get expenses grouped by order"""
    pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {
            "_id": "$order_id",
            "order_no": {"$first": "$order_no"},
            "customer_name": {"$first": "$customer_name"},
            "total_expenses": {"$sum": "$amount"},
            "expense_count": {"$sum": 1}
        }},
        {"$sort": {"total_expenses": -1}},
        {"$limit": limit}
    ]
    
    result = await db.expenses_v2.aggregate(pipeline).to_list(limit)
    
    # Enrich with order budget data
    enriched = []
    for item in result:
        lifecycle = await db.order_lifecycle.find_one({"sales_order_id": item["_id"]}, {"_id": 0})
        order = await db.sales_orders.find_one({"id": item["_id"]}, {"_id": 0})
        
        execution_budget = 0
        if lifecycle and lifecycle.get("execution_budget"):
            budget = lifecycle["execution_budget"]
            order_value = order.get("total_amount", 0) if order else 0
            if budget.get("type") == "percentage":
                execution_budget = order_value * (budget.get("value", 0) / 100)
            else:
                execution_budget = budget.get("value", 0)
        
        enriched.append({
            **item,
            "execution_budget": execution_budget,
            "variance": execution_budget - item["total_expenses"],
            "order_value": order.get("total_amount", 0) if order else 0
        })
    
    return {"orders": enriched}


@router.get("/dashboard/category-report")
async def get_category_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get category-wise expense report"""
    match_query = {"approval_status": "approved"}
    if date_from:
        match_query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in match_query:
            match_query["date"]["$lte"] = date_to
        else:
            match_query["date"] = {"$lte": date_to}
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$category",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "avg_amount": {"$avg": "$amount"},
            "max_amount": {"$max": "$amount"},
            "min_amount": {"$min": "$amount"}
        }},
        {"$sort": {"total_amount": -1}}
    ]
    
    result = await db.expenses_v2.aggregate(pipeline).to_list(100)
    
    # Add category labels
    for item in result:
        category = next((c for c in EXPENSE_CATEGORIES if c["value"] == item["_id"]), None)
        item["label"] = category["label"] if category else item["_id"]
    
    # Calculate total
    total = sum(r["total_amount"] for r in result)
    
    return {
        "categories": result,
        "total": total,
        "date_from": date_from,
        "date_to": date_to
    }


@router.get("/dashboard/vendor-report")
async def get_vendor_report(limit: int = 20):
    """Get vendor-wise expense report"""
    pipeline = [
        {"$match": {"approval_status": "approved", "vendor": {"$ne": None, "$ne": ""}}},
        {"$group": {
            "_id": "$vendor",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "categories": {"$addToSet": "$category"}
        }},
        {"$sort": {"total_amount": -1}},
        {"$limit": limit}
    ]
    
    result = await db.expenses_v2.aggregate(pipeline).to_list(limit)
    
    return {"vendors": result}


@router.get("/categories")
async def get_expense_categories():
    """Get list of expense categories"""
    return {"categories": EXPENSE_CATEGORIES}


@router.get("/payment-modes")
async def get_payment_modes():
    """Get list of payment modes"""
    return {"payment_modes": PAYMENT_MODES}
