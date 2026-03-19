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
    """Update request status with optional tracking info"""
    status: str
    comments: Optional[str] = None
    updated_by: Optional[str] = None
    # Tracking fields for delivery
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    expected_delivery: Optional[str] = None
    tracking_info: Optional[str] = None
    remarks: Optional[str] = None


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


@router.get("/finance-dashboard")
async def get_finance_dashboard():
    """
    Get overall finance dashboard with P&L summary across all projects.
    """
    # Get all sales orders with project status
    orders = await db.sales_orders.find(
        {"project_status": {"$in": ["accepted", "in_progress", "completed"]}},
        {"_id": 0}
    ).to_list(500)
    
    # Get all requests
    all_requests = await db.project_requests.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_revenue = sum(o.get("order_value", 0) for o in orders)
    total_budgeted_cost = sum(
        (o.get("financials", {}).get("purchase_budget", 0) +
         o.get("financials", {}).get("execution_budget", 0) +
         o.get("financials", {}).get("others_budget", 0))
        for o in orders
    )
    
    # Actual costs from requests
    material_costs = sum(r.get("estimated_cost", 0) for r in all_requests if r.get("request_type") == "material")
    vendor_costs = sum(r.get("estimated_cost", 0) for r in all_requests if r.get("request_type") == "vendor")
    payment_costs = sum(r.get("amount", 0) for r in all_requests if r.get("request_type") == "payment")
    total_actual_cost = material_costs + vendor_costs + payment_costs
    
    # Project-wise breakdown
    project_summary = []
    for order in orders[:20]:  # Top 20 projects
        order_requests = [r for r in all_requests if r.get("order_id") == order.get("id")]
        order_costs = sum(
            r.get("estimated_cost", 0) if r.get("request_type") != "payment" else r.get("amount", 0)
            for r in order_requests
        )
        order_value = order.get("order_value", 0)
        profit = order_value - order_costs
        
        project_summary.append({
            "order_id": order.get("id"),
            "order_no": order.get("order_no"),
            "customer_name": order.get("customer_name"),
            "project_status": order.get("project_status"),
            "order_value": order_value,
            "total_costs": order_costs,
            "profit": profit,
            "profit_percent": round((profit / order_value * 100) if order_value else 0, 1),
            "request_count": len(order_requests)
        })
    
    # Sort by profit
    project_summary.sort(key=lambda x: x.get("profit", 0), reverse=True)
    
    return {
        "summary": {
            "total_projects": len(orders),
            "total_revenue": total_revenue,
            "total_budgeted_cost": total_budgeted_cost,
            "total_actual_cost": total_actual_cost,
            "gross_profit": total_revenue - total_actual_cost,
            "budget_variance": total_actual_cost - total_budgeted_cost
        },
        "by_status": {
            "accepted": len([o for o in orders if o.get("project_status") == "accepted"]),
            "in_progress": len([o for o in orders if o.get("project_status") == "in_progress"]),
            "completed": len([o for o in orders if o.get("project_status") == "completed"])
        },
        "request_totals": {
            "materials": {"count": len([r for r in all_requests if r.get("request_type") == "material"]), "value": material_costs},
            "vendors": {"count": len([r for r in all_requests if r.get("request_type") == "vendor"]), "value": vendor_costs},
            "payments": {"count": len([r for r in all_requests if r.get("request_type") == "payment"]), "value": payment_costs}
        },
        "projects": project_summary
    }


@router.get("/purchase-orders")
async def get_purchase_orders(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all purchase orders created from project requests"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    
    cursor = db.purchase_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    pos = await cursor.to_list(length=limit)
    total = await db.purchase_orders.count_documents(query)
    
    return {"purchase_orders": pos, "total": total}


# NOTE: /{request_id} routes moved to end of file to avoid catching /grn, /invoices etc.


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


# ============== PID-CENTRIC CONSOLIDATED VIEW ==============

@router.get("/consolidated/by-pid")
async def get_consolidated_by_pid(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 100
):
    """
    Get consolidated view of all requests, expenses, and payments grouped by PID.
    Used by Purchase Management for PID-centric view.
    """
    # Get all unique order_ids from requests
    all_requests = await db.project_requests.find({}, {"_id": 0}).to_list(1000)
    
    # Get all expenses
    all_expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    
    # Get orders/projects for budget info
    all_orders = await db.order_lifecycle.find({}, {"_id": 0}).to_list(1000)
    order_map = {o.get("id") or o.get("sales_order_id"): o for o in all_orders}
    
    # Also get sales_orders for budget info (backup source)
    all_sales_orders = await db.sales_orders.find({}, {"_id": 0}).to_list(1000)
    sales_order_map = {so.get("id"): so for so in all_sales_orders}
    # Also map by order_no for fallback lookup
    sales_order_by_order_no = {so.get("order_no"): so for so in all_sales_orders if so.get("order_no")}
    
    # Also get from projects collection for PO amount
    all_projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    project_map = {p.get("source_order_id"): p for p in all_projects if p.get("source_order_id")}
    
    # Group by order_id (PID)
    pids = {}
    
    for req in all_requests:
        order_id = req.get("order_id")
        order_no = req.get("order_no")
        if not order_id:
            continue
            
        if order_id not in pids:
            order = order_map.get(order_id, {})
            project = project_map.get(order_id, {})
            
            # Also try to get from sales_orders if order_lifecycle doesn't have data
            sales_order = sales_order_map.get(order_id, {})
            if not sales_order and order_no:
                sales_order = sales_order_by_order_no.get(order_no, {})
            
            # Calculate budget - check multiple sources
            execution_budget = 0
            
            # Source 1: order_lifecycle.financials.execution_budget
            financials = order.get("financials", {})
            
            # Check financials.execution_budget (newer format)
            if financials.get("execution_budget"):
                execution_budget = financials.get("execution_budget", 0)
            # Check lifecycle.execution_budget (older format)  
            elif order.get("lifecycle", {}).get("execution_budget"):
                lifecycle_budget = order["lifecycle"]["execution_budget"]
                if isinstance(lifecycle_budget, dict):
                    if lifecycle_budget.get("type") == "percentage":
                        execution_budget = (order.get("total_amount", 0)) * (lifecycle_budget.get("value", 0) / 100)
                    else:
                        execution_budget = lifecycle_budget.get("value", 0) or lifecycle_budget.get("amount", 0)
                else:
                    execution_budget = lifecycle_budget
            # Check top-level execution_budget (legacy format)
            elif order.get("execution_budget"):
                budget = order["execution_budget"]
                if isinstance(budget, dict):
                    if budget.get("type") == "percentage":
                        execution_budget = (order.get("total_amount", 0)) * (budget.get("value", 0) / 100)
                    else:
                        execution_budget = budget.get("value", 0)
                else:
                    execution_budget = budget
            
            # Source 2: sales_orders.financials.execution_budget (backup source)
            if execution_budget == 0 and sales_order:
                so_financials = sales_order.get("financials", {})
                if so_financials.get("execution_budget"):
                    execution_budget = so_financials.get("execution_budget", 0)
                elif sales_order.get("lifecycle", {}).get("execution_budget"):
                    execution_budget = sales_order["lifecycle"]["execution_budget"]
            
            # Source 3: Fallback to project budget
            if execution_budget == 0 and project.get("budget"):
                execution_budget = project.get("budget", 0)
            
            # Get PO amount from sales_order if not in project
            po_amount = project.get("po_amount") or order.get("total_amount") or sales_order.get("total_amount", 0)
            
            pids[order_id] = {
                "order_id": order_id,
                "order_no": req.get("order_no") or order.get("order_no") or sales_order.get("order_no"),
                "customer_name": req.get("customer_name") or order.get("customer_name") or sales_order.get("customer_name"),
                "project_name": req.get("project_name") or order.get("project_name") or sales_order.get("project_name"),
                "category": order.get("category") or project.get("category") or sales_order.get("category", "PSS"),
                "po_amount": po_amount,
                "budget": execution_budget,
                "status": project.get("status", "active"),
                "materials": {"items": [], "pending": 0, "total": 0, "value": 0},
                "vendors": {"items": [], "pending": 0, "total": 0, "value": 0},
                "payments": {"items": [], "pending": 0, "total": 0, "value": 0},
                "expenses": {"items": [], "total": 0, "value": 0, "bills_missing": 0},
            }
        
        pid = pids[order_id]
        req_type = req.get("request_type")
        
        if req_type == "material":
            pid["materials"]["items"].append(req)
            pid["materials"]["total"] += 1
            if req.get("status") == "pending":
                pid["materials"]["pending"] += 1
            item_value = sum(i.get("estimated_cost", 0) for i in req.get("items", []))
            pid["materials"]["value"] += item_value
            
        elif req_type == "vendor":
            pid["vendors"]["items"].append(req)
            pid["vendors"]["total"] += 1
            if req.get("status") == "pending":
                pid["vendors"]["pending"] += 1
            pid["vendors"]["value"] += req.get("estimated_cost", 0)
            
        elif req_type == "payment":
            pid["payments"]["items"].append(req)
            pid["payments"]["total"] += 1
            if req.get("status") == "pending":
                pid["payments"]["pending"] += 1
            pid["payments"]["value"] += req.get("amount", 0)
    
    # Add expenses
    for expense in all_expenses:
        order_id = expense.get("order_id")
        if order_id and order_id in pids:
            pid = pids[order_id]
            pid["expenses"]["items"].append(expense)
            pid["expenses"]["total"] += 1
            if expense.get("approval_status") == "approved":
                pid["expenses"]["value"] += expense.get("amount", 0)
            if expense.get("pending_bill"):
                pid["expenses"]["bills_missing"] += 1
    
    # Calculate profit and available budget for each PID
    result = []
    for order_id, pid in pids.items():
        pid["total_expenses"] = pid["expenses"]["value"]
        pid["available_budget"] = pid["budget"] - pid["total_expenses"]
        pid["profit"] = pid["po_amount"] - pid["total_expenses"]
        pid["profit_percent"] = round((pid["profit"] / pid["po_amount"]) * 100, 1) if pid["po_amount"] > 0 else 0
        
        # Budget warning
        pid["budget_warning"] = None
        if pid["budget"] == 0:
            pid["budget_warning"] = "no_budget"
        elif pid["available_budget"] < 0:
            pid["budget_warning"] = "over_budget"
        elif pid["available_budget"] < (pid["budget"] * 0.1):
            pid["budget_warning"] = "low_budget"
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            if not (
                search_lower in (pid.get("order_no") or "").lower() or
                search_lower in (pid.get("customer_name") or "").lower() or
                search_lower in (pid.get("project_name") or "").lower()
            ):
                continue
        
        # Don't include items in response to reduce size
        pid_summary = {k: v for k, v in pid.items() if k not in ["materials", "vendors", "payments", "expenses"]}
        pid_summary["materials"] = {k: v for k, v in pid["materials"].items() if k != "items"}
        pid_summary["vendors"] = {k: v for k, v in pid["vendors"].items() if k != "items"}
        pid_summary["payments"] = {k: v for k, v in pid["payments"].items() if k != "items"}
        pid_summary["expenses"] = {k: v for k, v in pid["expenses"].items() if k != "items"}
        
        result.append(pid_summary)
    
    # Sort by pending requests (highest first), then by order_no
    result.sort(key=lambda x: (
        -(x["materials"]["pending"] + x["vendors"]["pending"] + x["payments"]["pending"]),
        x.get("order_no", "")
    ))
    
    return {"pids": result[:limit], "total": len(result)}


@router.get("/consolidated/pid/{order_id}")
async def get_pid_details(order_id: str):
    """Get full details for a single PID including all requests, expenses"""
    # Get all requests for this order
    requests = await db.project_requests.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    # Get all expenses for this order
    expenses = await db.expenses.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    # Get order/project info
    order = await db.order_lifecycle.find_one(
        {"$or": [{"id": order_id}, {"sales_order_id": order_id}]}, 
        {"_id": 0}
    )
    project = await db.projects.find_one({"source_order_id": order_id}, {"_id": 0})
    
    # Get order_no from requests for sales_order lookup
    order_no = requests[0].get("order_no") if requests else None
    
    # Also check sales_orders collection for budget info
    sales_order = await db.sales_orders.find_one(
        {"$or": [{"id": order_id}, {"order_no": order_no}]},
        {"_id": 0}
    ) if order_no else None
    
    # Calculate budget - check multiple sources
    execution_budget = 0
    
    # Source 1: order_lifecycle
    if order:
        financials = order.get("financials", {})
        
        # Check financials.execution_budget (newer format)
        if financials.get("execution_budget"):
            execution_budget = financials.get("execution_budget", 0)
        # Check lifecycle.execution_budget (older format)  
        elif order.get("lifecycle", {}).get("execution_budget"):
            lifecycle_budget = order["lifecycle"]["execution_budget"]
            if isinstance(lifecycle_budget, dict):
                if lifecycle_budget.get("type") == "percentage":
                    execution_budget = (order.get("total_amount", 0)) * (lifecycle_budget.get("value", 0) / 100)
                else:
                    execution_budget = lifecycle_budget.get("value", 0) or lifecycle_budget.get("amount", 0)
            else:
                execution_budget = lifecycle_budget
        # Check top-level execution_budget (legacy format)
        elif order.get("execution_budget"):
            budget = order["execution_budget"]
            if isinstance(budget, dict):
                if budget.get("type") == "percentage":
                    execution_budget = (order.get("total_amount", 0)) * (budget.get("value", 0) / 100)
                else:
                    execution_budget = budget.get("value", 0)
            else:
                execution_budget = budget
    
    # Source 2: sales_orders.financials.execution_budget (backup source)
    if execution_budget == 0 and sales_order:
        so_financials = sales_order.get("financials", {})
        if so_financials.get("execution_budget"):
            execution_budget = so_financials.get("execution_budget", 0)
        elif sales_order.get("lifecycle", {}).get("execution_budget"):
            execution_budget = sales_order["lifecycle"]["execution_budget"]
    
    # Source 3: Fallback to project budget
    if execution_budget == 0 and project and project.get("budget"):
        execution_budget = project.get("budget", 0)
    
    # Categorize requests
    materials = [r for r in requests if r.get("request_type") == "material"]
    vendors = [r for r in requests if r.get("request_type") == "vendor"]
    payments = [r for r in requests if r.get("request_type") == "payment"]
    
    # Calculate totals
    material_value = sum(sum(i.get("estimated_cost", 0) for i in r.get("items", [])) for r in materials)
    vendor_value = sum(r.get("estimated_cost", 0) for r in vendors)
    payment_value = sum(r.get("amount", 0) for r in payments)
    expense_value = sum(e.get("amount", 0) for e in expenses if e.get("approval_status") == "approved")
    bills_missing = sum(1 for e in expenses if e.get("pending_bill"))
    
    po_amount = (project.get("po_amount") if project else None) or (order.get("total_amount") if order else 0)
    
    return {
        "order_id": order_id,
        "order_no": (requests[0].get("order_no") if requests else None) or (order.get("order_no") if order else None),
        "customer_name": (requests[0].get("customer_name") if requests else None) or (order.get("customer_name") if order else None),
        "project_name": (requests[0].get("project_name") if requests else None) or (order.get("project_name") if order else None),
        "category": (order.get("category") if order else None) or (project.get("category") if project else "PSS"),
        "po_amount": po_amount,
        "budget": execution_budget,
        "total_expenses": expense_value,
        "available_budget": execution_budget - expense_value,
        "profit": po_amount - expense_value,
        "profit_percent": round((po_amount - expense_value) / po_amount * 100, 1) if po_amount > 0 else 0,
        "materials": {
            "items": materials,
            "pending": sum(1 for r in materials if r.get("status") == "pending"),
            "total": len(materials),
            "value": material_value
        },
        "vendors": {
            "items": vendors,
            "pending": sum(1 for r in vendors if r.get("status") == "pending"),
            "total": len(vendors),
            "value": vendor_value
        },
        "payments": {
            "items": payments,
            "pending": sum(1 for r in payments if r.get("status") == "pending"),
            "total": len(payments),
            "value": payment_value
        },
        "expenses": {
            "items": expenses,
            "total": len(expenses),
            "value": expense_value,
            "bills_missing": bills_missing
        },
        "budget_warning": "no_budget" if execution_budget == 0 else ("over_budget" if (execution_budget - expense_value) < 0 else None)
    }


# ============== PO CREATION FROM MATERIAL REQUESTS ==============

class POFromRequestCreate(BaseModel):
    """Create Purchase Order from an approved material request"""
    request_id: str
    vendor_name: str
    vendor_contact: Optional[str] = None
    delivery_date: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


async def generate_po_number() -> str:
    """Generate unique PO number like PO-2526-001"""
    today = datetime.now()
    month = today.month
    year = today.year
    
    # Determine financial year
    if month >= 4:
        fy = f"{str(year)[2:]}{str(year + 1)[2:]}"
    else:
        fy = f"{str(year - 1)[2:]}{str(year)[2:]}"
    
    # Get count for this FY
    pattern = f"^PO-{fy}-"
    count = await db.purchase_orders.count_documents({"po_number": {"$regex": pattern}})
    
    return f"PO-{fy}-{str(count + 1).zfill(3)}"


@router.post("/create-po")
async def create_po_from_request(data: POFromRequestCreate):
    """
    Create a Purchase Order from an approved material request.
    Links the PO back to the original request and project.
    """
    # Find the material request
    request = await db.project_requests.find_one({"id": data.request_id, "request_type": "material"})
    if not request:
        raise HTTPException(status_code=404, detail="Material request not found")
    
    # Verify request is approved
    if request.get("status") not in ["approved", "in_progress"]:
        raise HTTPException(status_code=400, detail="Only approved requests can be converted to PO")
    
    now = datetime.now(timezone.utc)
    po_number = await generate_po_number()
    
    # Create PO document
    po_data = {
        "id": str(uuid.uuid4()),
        "po_number": po_number,
        "request_id": data.request_id,
        "request_no": request.get("request_no"),
        "order_id": request.get("order_id"),
        "order_no": request.get("order_no"),
        "project_name": request.get("project_name"),
        "customer_name": request.get("customer_name"),
        "vendor_name": data.vendor_name,
        "vendor_contact": data.vendor_contact,
        "items": request.get("items", []),
        "total_items": request.get("total_items", 0),
        "total_amount": request.get("estimated_cost", 0),
        "delivery_date": data.delivery_date,
        "payment_terms": data.payment_terms,
        "notes": data.notes,
        "status": "created",
        "created_at": now,
        "updated_at": now
    }
    
    await db.purchase_orders.insert_one(po_data)
    
    # Update the request with PO linkage
    await db.project_requests.update_one(
        {"id": data.request_id},
        {"$set": {
            "status": "in_progress",
            "po_number": po_number,
            "po_id": po_data["id"],
            "updated_at": now
        },
        "$push": {
            "status_history": {
                "status": "in_progress",
                "timestamp": now.isoformat(),
                "comments": f"PO {po_number} created"
            }
        }}
    )
    
    po_data.pop("_id", None)
    return {"message": f"Purchase Order {po_number} created", "po": po_data}


# Duplicate purchase-orders GET removed - it's defined earlier

@router.put("/purchase-orders/{po_id}/status")
async def update_po_status(po_id: str, status: str):
    """Update PO status"""
    valid_statuses = ["created", "sent", "confirmed", "partially_received", "received", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    now = datetime.now(timezone.utc)
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {"status": status, "updated_at": now}}
    )
    
    # If PO is completed, update the original request
    if status == "completed" and po.get("request_id"):
        await db.project_requests.update_one(
            {"id": po["request_id"]},
            {"$set": {"status": "completed", "updated_at": now}}
        )
    
    return {"message": f"PO status updated to {status}"}


# ============== PROJECT P&L (PROFIT & LOSS) ==============

@router.get("/project-pnl/{order_id}")
async def get_project_pnl(order_id: str):
    """
    Get Profit & Loss summary for a project.
    Aggregates all costs from material requests, vendor requests, and payments.
    """
    # Get the sales order
    order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get all requests for this order
    requests = await db.project_requests.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    # Calculate costs by type
    material_costs = sum(r.get("estimated_cost", 0) for r in requests if r.get("request_type") == "material")
    vendor_costs = sum(r.get("estimated_cost", 0) for r in requests if r.get("request_type") == "vendor")
    payment_costs = sum(r.get("amount", 0) for r in requests if r.get("request_type") == "payment")
    
    # Get budgets from order
    financials = order.get("financials", {})
    order_value = order.get("order_value", 0)
    purchase_budget = financials.get("purchase_budget", 0)
    execution_budget = financials.get("execution_budget", 0)
    others_budget = financials.get("others_budget", 0)
    total_budget = purchase_budget + execution_budget + others_budget
    target_profit = financials.get("target_profit", order_value - total_budget)
    
    # Calculate actuals vs budget
    total_costs = material_costs + vendor_costs + payment_costs
    actual_profit = order_value - total_costs
    profit_variance = actual_profit - target_profit
    
    return {
        "order_id": order_id,
        "order_no": order.get("order_no"),
        "customer_name": order.get("customer_name"),
        "project_name": order.get("project_name"),
        "project_status": order.get("project_status", "pending"),
        "revenue": {
            "order_value": order_value
        },
        "budgets": {
            "purchase_budget": purchase_budget,
            "execution_budget": execution_budget,
            "others_budget": others_budget,
            "total_budget": total_budget,
            "target_profit": target_profit,
            "target_profit_percent": round((target_profit / order_value * 100) if order_value else 0, 1)
        },
        "actuals": {
            "material_costs": material_costs,
            "vendor_costs": vendor_costs,
            "payment_costs": payment_costs,
            "total_costs": total_costs,
            "actual_profit": actual_profit,
            "actual_profit_percent": round((actual_profit / order_value * 100) if order_value else 0, 1)
        },
        "variance": {
            "cost_variance": total_costs - total_budget,
            "profit_variance": profit_variance,
            "is_over_budget": total_costs > total_budget,
            "is_profitable": actual_profit > 0
        },
        "request_summary": {
            "materials": len([r for r in requests if r.get("request_type") == "material"]),
            "vendors": len([r for r in requests if r.get("request_type") == "vendor"]),
            "payments": len([r for r in requests if r.get("request_type") == "payment"])
        }
    }


# Duplicate finance-dashboard removed - it's defined earlier


# ============== GRN (GOODS RECEIVED NOTE) ==============

class GRNItemReceived(BaseModel):
    """Item received in GRN"""
    description: str
    ordered_qty: float
    received_qty: float
    unit: str = "Nos"
    remarks: Optional[str] = None


class GRNCreate(BaseModel):
    """Create a Goods Received Note"""
    po_id: str
    received_date: str
    received_by: Optional[str] = None
    items: List[GRNItemReceived]
    delivery_challan_no: Optional[str] = None
    vehicle_no: Optional[str] = None
    remarks: Optional[str] = None


async def generate_grn_number() -> str:
    """Generate unique GRN number like GRN-2526-001"""
    today = datetime.now()
    month = today.month
    year = today.year
    
    if month >= 4:
        fy = f"{str(year)[2:]}{str(year + 1)[2:]}"
    else:
        fy = f"{str(year - 1)[2:]}{str(year)[2:]}"
    
    pattern = f"^GRN-{fy}-"
    count = await db.grn.count_documents({"grn_number": {"$regex": pattern}})
    
    return f"GRN-{fy}-{str(count + 1).zfill(3)}"


@router.post("/grn")
async def create_grn(data: GRNCreate):
    """Create a Goods Received Note for a Purchase Order"""
    # Find the PO
    po = await db.purchase_orders.find_one({"id": data.po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    now = datetime.now(timezone.utc)
    grn_number = await generate_grn_number()
    
    # Calculate received totals
    total_ordered = sum(item.ordered_qty for item in data.items)
    total_received = sum(item.received_qty for item in data.items)
    is_partial = total_received < total_ordered
    
    grn_data = {
        "id": str(uuid.uuid4()),
        "grn_number": grn_number,
        "po_id": data.po_id,
        "po_number": po.get("po_number"),
        "order_id": po.get("order_id"),
        "order_no": po.get("order_no"),
        "vendor_name": po.get("vendor_name"),
        "received_date": data.received_date,
        "received_by": data.received_by,
        "items": [item.dict() for item in data.items],
        "total_ordered": total_ordered,
        "total_received": total_received,
        "is_partial": is_partial,
        "delivery_challan_no": data.delivery_challan_no,
        "vehicle_no": data.vehicle_no,
        "remarks": data.remarks,
        "status": "received",
        "created_at": now,
        "updated_at": now
    }
    
    await db.grn.insert_one(grn_data)
    
    # Update PO status
    new_po_status = "partially_received" if is_partial else "received"
    await db.purchase_orders.update_one(
        {"id": data.po_id},
        {"$set": {"status": new_po_status, "updated_at": now}}
    )
    
    grn_data.pop("_id", None)
    return {"message": f"GRN {grn_number} created", "grn": grn_data}


@router.get("/grn")
async def get_grn_list(
    po_id: Optional[str] = None,
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all GRNs"""
    query = {}
    if po_id:
        query["po_id"] = po_id
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    
    cursor = db.grn.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    grns = await cursor.to_list(length=limit)
    total = await db.grn.count_documents(query)
    
    return {"grns": grns, "total": total}


@router.get("/grn/{grn_id}")
async def get_grn_detail(grn_id: str):
    """Get GRN details"""
    grn = await db.grn.find_one({"id": grn_id}, {"_id": 0})
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    return grn


# ============== INVOICES ==============

class InvoiceItemCreate(BaseModel):
    """Invoice line item"""
    description: str
    quantity: float = 1
    unit: str = "Nos"
    rate: float
    amount: float
    hsn_code: Optional[str] = None


class InvoiceCreate(BaseModel):
    """Create Invoice for a project"""
    order_id: str
    invoice_type: str = "Progress"  # Progress, Final, Proforma
    items: List[InvoiceItemCreate]
    subtotal: float
    cgst_percent: float = 9.0
    sgst_percent: float = 9.0
    igst_percent: float = 0.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    total_amount: float
    payment_terms: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


async def generate_invoice_number() -> str:
    """Generate unique Invoice number like INV-2526-001"""
    today = datetime.now()
    month = today.month
    year = today.year
    
    if month >= 4:
        fy = f"{str(year)[2:]}{str(year + 1)[2:]}"
    else:
        fy = f"{str(year - 1)[2:]}{str(year)[2:]}"
    
    pattern = f"^INV-{fy}-"
    count = await db.invoices.count_documents({"invoice_number": {"$regex": pattern}})
    
    return f"INV-{fy}-{str(count + 1).zfill(3)}"


@router.post("/invoices")
async def create_invoice(data: InvoiceCreate):
    """Create an Invoice for a project/order"""
    # Find the order
    order = await db.sales_orders.find_one({"id": data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    now = datetime.now(timezone.utc)
    invoice_number = await generate_invoice_number()
    
    invoice_data = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "order_id": data.order_id,
        "order_no": order.get("order_no"),
        "customer_name": order.get("customer_name"),
        "customer_details": order.get("customer_details", {}),
        "project_name": order.get("project_name"),
        "invoice_type": data.invoice_type,
        "invoice_date": now.strftime("%Y-%m-%d"),
        "items": [item.dict() for item in data.items],
        "subtotal": data.subtotal,
        "cgst_percent": data.cgst_percent,
        "sgst_percent": data.sgst_percent,
        "igst_percent": data.igst_percent,
        "cgst_amount": data.cgst_amount,
        "sgst_amount": data.sgst_amount,
        "igst_amount": data.igst_amount,
        "total_amount": data.total_amount,
        "payment_terms": data.payment_terms,
        "due_date": data.due_date,
        "notes": data.notes,
        "status": "draft",
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice_data)
    
    invoice_data.pop("_id", None)
    return {"message": f"Invoice {invoice_number} created", "invoice": invoice_data}


@router.get("/invoices")
async def get_invoices(
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    invoice_type: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all invoices"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if status:
        query["status"] = status
    if invoice_type:
        query["invoice_type"] = invoice_type
    
    cursor = db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    invoices = await cursor.to_list(length=limit)
    total = await db.invoices.count_documents(query)
    
    # Calculate totals
    total_amount = sum(inv.get("total_amount", 0) for inv in invoices)
    
    return {"invoices": invoices, "total": total, "total_amount": total_amount}


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(invoice_id: str):
    """Get invoice details"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str):
    """Update invoice status"""
    valid_statuses = ["draft", "sent", "paid", "partial", "cancelled", "overdue"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    now = datetime.now(timezone.utc)
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"status": status, "updated_at": now}}
    )
    
    return {"message": f"Invoice status updated to {status}"}


@router.get("/invoices/by-order/{order_id}")
async def get_invoices_by_order(order_id: str):
    """Get all invoices for a specific order"""
    invoices = await db.invoices.find({"order_id": order_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    total_invoiced = sum(inv.get("total_amount", 0) for inv in invoices)
    paid_invoices = [inv for inv in invoices if inv.get("status") == "paid"]
    total_paid = sum(inv.get("total_amount", 0) for inv in paid_invoices)
    
    return {
        "order_id": order_id,
        "invoices": invoices,
        "summary": {
            "total_invoices": len(invoices),
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "outstanding": total_invoiced - total_paid
        }
    }


# ============== BILLING DASHBOARD ==============

@router.get("/billing-dashboard")
async def get_billing_dashboard():
    """Get billing dashboard with invoice summary"""
    # Get all invoices
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(500)
    
    # Calculate totals
    total_invoiced = sum(inv.get("total_amount", 0) for inv in invoices)
    total_paid = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("status") == "paid")
    total_pending = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("status") in ["draft", "sent"])
    total_overdue = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("status") == "overdue")
    
    # Get recent invoices
    recent_invoices = sorted(invoices, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
    
    return {
        "summary": {
            "total_invoices": len(invoices),
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "total_overdue": total_overdue,
            "collection_rate": round((total_paid / total_invoiced * 100) if total_invoiced else 0, 1)
        },
        "by_status": {
            "draft": len([i for i in invoices if i.get("status") == "draft"]),
            "sent": len([i for i in invoices if i.get("status") == "sent"]),
            "paid": len([i for i in invoices if i.get("status") == "paid"]),
            "partial": len([i for i in invoices if i.get("status") == "partial"]),
            "overdue": len([i for i in invoices if i.get("status") == "overdue"])
        },
        "by_type": {
            "Progress": len([i for i in invoices if i.get("invoice_type") == "Progress"]),
            "Final": len([i for i in invoices if i.get("invoice_type") == "Final"]),
            "Proforma": len([i for i in invoices if i.get("invoice_type") == "Proforma"])
        },
        "recent_invoices": recent_invoices
    }



# ============== GENERIC REQUEST ENDPOINTS (MUST BE LAST - catch-all routes) ==============

@router.get("/{request_id}")
async def get_request_details(request_id: str):
    """Get single request details"""
    request = await db.project_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.get("/{request_id}/budget-check")
async def check_budget_for_request(request_id: str):
    """
    Check budget availability for a payment request before approval.
    Returns budget info and warnings if payment would exceed available budget.
    """
    request = await db.project_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("request_type") != "payment":
        return {"warning": None, "message": "Budget check only applicable for payment requests"}
    
    order_id = request.get("order_id")
    order_no = request.get("order_no")
    payment_amount = request.get("amount", 0)
    
    # Get project/order info for budget
    order = await db.order_lifecycle.find_one(
        {"$or": [{"id": order_id}, {"sales_order_id": order_id}]}, 
        {"_id": 0}
    )
    project = await db.projects.find_one({"source_order_id": order_id}, {"_id": 0})
    
    # Also check sales_orders collection for budget info
    sales_order = await db.sales_orders.find_one(
        {"$or": [{"id": order_id}, {"order_no": order_no}]},
        {"_id": 0}
    ) if order_no else None
    
    # Calculate budget - check multiple sources
    execution_budget = 0
    
    # Source 1: order_lifecycle
    if order:
        financials = order.get("financials", {})
        
        # Check financials.execution_budget (newer format)
        if financials.get("execution_budget"):
            execution_budget = financials.get("execution_budget", 0)
        # Check lifecycle.execution_budget (older format)  
        elif order.get("lifecycle", {}).get("execution_budget"):
            lifecycle_budget = order["lifecycle"]["execution_budget"]
            if isinstance(lifecycle_budget, dict):
                if lifecycle_budget.get("type") == "percentage":
                    execution_budget = (order.get("total_amount", 0)) * (lifecycle_budget.get("value", 0) / 100)
                else:
                    execution_budget = lifecycle_budget.get("value", 0) or lifecycle_budget.get("amount", 0)
            else:
                execution_budget = lifecycle_budget
        # Check top-level execution_budget (legacy format)
        elif order.get("execution_budget"):
            budget = order["execution_budget"]
            if isinstance(budget, dict):
                if budget.get("type") == "percentage":
                    execution_budget = (order.get("total_amount", 0)) * (budget.get("value", 0) / 100)
                else:
                    execution_budget = budget.get("value", 0)
            else:
                execution_budget = budget
    
    # Source 2: sales_orders.financials.execution_budget (backup source)
    if execution_budget == 0 and sales_order:
        so_financials = sales_order.get("financials", {})
        if so_financials.get("execution_budget"):
            execution_budget = so_financials.get("execution_budget", 0)
        elif sales_order.get("lifecycle", {}).get("execution_budget"):
            execution_budget = sales_order["lifecycle"]["execution_budget"]
    
    # Source 3: Fallback to project budget
    if execution_budget == 0 and project and project.get("budget"):
        execution_budget = project.get("budget", 0)
    
    # Get current expenses
    expenses = await db.expenses.find({"order_id": order_id, "approval_status": "approved"}, {"_id": 0}).to_list(500)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    
    available_budget = execution_budget - total_expenses
    budget_after_payment = available_budget - payment_amount
    
    # Determine warning level
    warning = None
    warning_message = None
    
    if execution_budget == 0:
        warning = "no_budget"
        warning_message = "⚠️ No budget allocated for this project. Payment can still be approved but will not be tracked against budget."
    elif budget_after_payment < 0:
        warning = "over_budget"
        warning_message = f"⚠️ This payment of ₹{payment_amount:,.0f} will exceed the budget by ₹{abs(budget_after_payment):,.0f}. Available: ₹{available_budget:,.0f}"
    elif budget_after_payment < (execution_budget * 0.1):
        warning = "low_budget"
        warning_message = f"⚠️ After this payment, only ₹{budget_after_payment:,.0f} ({(budget_after_payment/execution_budget*100):.1f}%) will remain in budget."
    
    return {
        "request_id": request_id,
        "request_no": request.get("request_no"),
        "payment_amount": payment_amount,
        "budget": execution_budget,
        "total_expenses": total_expenses,
        "available_budget": available_budget,
        "budget_after_payment": budget_after_payment,
        "warning": warning,
        "warning_message": warning_message
    }


@router.put("/{request_id}/status")
async def update_request_status(request_id: str, data: RequestStatusUpdate):
    """Update request status (used by Purchase/Payment Management)
    
    When a PAYMENT request is APPROVED:
    - Auto-creates an expense entry in Expense Management
    - Links expense to the payment request
    - Marks expense as "pending_bill" (bills to be uploaded later)
    """
    valid_statuses = ["pending", "approved", "rejected", "in_progress", "ordered", "dispatched", "delivered", "completed", "cancelled"]
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
    
    update_data = {
        "status": data.status,
        "updated_at": now
    }
    
    # Add tracking info if provided
    if hasattr(data, 'vendor_id') and data.vendor_id:
        update_data["vendor_id"] = data.vendor_id
    if hasattr(data, 'vendor_name') and data.vendor_name:
        update_data["vendor_name"] = data.vendor_name
    if hasattr(data, 'expected_delivery') and data.expected_delivery:
        update_data["expected_delivery"] = data.expected_delivery
    if hasattr(data, 'tracking_info') and data.tracking_info:
        update_data["tracking_info"] = data.tracking_info
    if hasattr(data, 'remarks') and data.remarks:
        update_data["remarks"] = data.remarks
    
    await db.project_requests.update_one(
        {"id": request_id},
        {
            "$set": update_data,
            "$push": {
                "status_history": status_entry
            }
        }
    )
    
    response_data = {"message": f"Status updated to {data.status}", "status": data.status}
    
    # AUTO-CREATE EXPENSE when PAYMENT request is APPROVED
    if request.get("request_type") == "payment" and data.status == "approved":
        try:
            # Map payment type to expense category
            payment_type = request.get("payment_type", "").lower()
            category_map = {
                "advance": "misc",
                "milestone": "misc",
                "final": "misc",
                "vendor payment": "subcontractor",
                "material": "material_purchase",
                "labor": "labor",
                "subcontractor": "subcontractor",
                "transport": "transport",
                "equipment": "equipment_rental"
            }
            expense_category = category_map.get(payment_type, "misc")
            
            # Generate expense number
            count = await db.expenses.count_documents({})
            expense_no = f"EXP-{now.strftime('%y%m')}-{count + 1:04d}"
            
            # Create expense entry
            expense = {
                "id": str(uuid.uuid4()),
                "expense_no": expense_no,
                "order_id": request.get("order_id"),
                "order_no": request.get("order_no"),
                "customer_name": request.get("customer_name"),
                "project_name": request.get("project_name"),
                "category": expense_category,
                "description": f"Payment: {request.get('payment_type', 'N/A')} - {request.get('title', request.get('payee', 'N/A'))}",
                "amount": request.get("amount", 0),
                "date": now.strftime("%Y-%m-%d"),
                "vendor": request.get("payee", ""),
                "reference_no": request.get("request_no"),
                "payment_mode": "bank",
                "remarks": f"Auto-created from Payment Request {request.get('request_no')}",
                "linked_payment_request": request_id,
                "pending_bill": True,  # Flag: Bill needs to be uploaded
                "approval_status": "approved",  # Auto-approved since payment was approved
                "approved_by": data.updated_by or "system",
                "approved_at": now.isoformat(),
                "created_at": now,
                "created_by": data.updated_by or "system"
            }
            
            await db.expenses.insert_one(expense)
            
            response_data["expense_created"] = True
            response_data["expense_no"] = expense_no
            response_data["message"] = f"Payment approved & Expense {expense_no} auto-created (bill pending)"
            
        except Exception as e:
            # Don't fail the status update if expense creation fails
            response_data["expense_error"] = str(e)
    
    return response_data


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
