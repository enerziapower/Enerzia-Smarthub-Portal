"""
Order Lifecycle Management API Routes
- Order Management Dashboard (Central Hub)
- Budget Targets (Purchase, Execution, Profit)
- Payment Milestones (Custom per customer)
- Expense Tracking (Order-wise)
- Project Linking
- Profitability Analysis
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import os
import io
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/order-lifecycle", tags=["Order Lifecycle Management"])


# ============== MODELS ==============

class BudgetTarget(BaseModel):
    """Budget target configuration"""
    type: str = "percentage"  # "percentage" or "value"
    value: float = 0
    amount: float = 0  # Calculated amount


class PaymentMilestone(BaseModel):
    """Payment milestone for an order"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Advance", "On Delivery", "Final"
    type: str = "percentage"  # "percentage" or "value"
    value: float = 0  # Percentage or fixed amount
    amount: float = 0  # Calculated amount
    due_condition: str = ""  # e.g., "On Order Confirmation", "30 days from Invoice"
    due_date: Optional[str] = None
    status: str = "pending"  # pending, invoiced, paid
    paid_date: Optional[str] = None
    paid_amount: float = 0


class Expense(BaseModel):
    """Order-wise expense entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    category: str  # Material Purchase, Labor, Transport, Site Expenses, Subcontractor, Equipment Rental, Misc
    description: str
    amount: float
    date: str
    vendor: Optional[str] = None
    reference_no: Optional[str] = None  # Bill/Receipt number
    attachment: Optional[str] = None
    approved: bool = False
    approved_by: Optional[str] = None
    approved_date: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderLifecycleCreate(BaseModel):
    """Create/Update order lifecycle data"""
    sales_order_id: str  # Link to existing sales order
    
    # Budget Targets
    purchase_budget: Optional[BudgetTarget] = None
    execution_budget: Optional[BudgetTarget] = None
    target_profit: Optional[BudgetTarget] = None
    
    # Payment Terms
    payment_milestones: List[PaymentMilestone] = []
    credit_period_days: int = 30
    
    # Project Linking
    project_type: Optional[str] = None  # AMC, Equipment Service, Calibration, Custom
    linked_project_id: Optional[str] = None
    auto_create_project: bool = False
    
    # Dates
    estimated_delivery_date: Optional[str] = None
    actual_delivery_date: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None


class OrderLifecycleUpdate(BaseModel):
    """Update order lifecycle data"""
    purchase_budget: Optional[BudgetTarget] = None
    execution_budget: Optional[BudgetTarget] = None
    target_profit: Optional[BudgetTarget] = None
    payment_milestones: Optional[List[PaymentMilestone]] = None
    credit_period_days: Optional[int] = None
    project_type: Optional[str] = None
    linked_project_id: Optional[str] = None
    estimated_delivery_date: Optional[str] = None
    actual_delivery_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(BaseModel):
    """Create an expense entry"""
    order_id: str
    category: str
    description: str
    amount: float
    date: str
    vendor: Optional[str] = None
    reference_no: Optional[str] = None
    created_by: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def calculate_budget_amount(order_value: float, budget: dict) -> float:
    """Calculate budget amount from percentage or value"""
    if not budget:
        return 0
    if budget.get("type") == "percentage":
        return order_value * (budget.get("value", 0) / 100)
    return budget.get("value", 0)


async def get_order_financials(order_id: str) -> dict:
    """Calculate order financials (revenue, costs, profit)"""
    # Get order lifecycle data
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
    
    # Get sales order for revenue
    sales_order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    order_value = sales_order.get("total_amount", 0) if sales_order else 0
    
    # Get purchase costs (from purchase orders linked to this order)
    purchase_pipeline = [
        {"$match": {"order_id": order_id}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    purchase_result = await db.purchase_orders.aggregate(purchase_pipeline).to_list(1)
    purchase_cost = purchase_result[0]["total"] if purchase_result else 0
    
    # Get expenses
    expense_pipeline = [
        {"$match": {"order_id": order_id, "approved": True}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    expense_result = await db.order_expenses.aggregate(expense_pipeline).to_list(100)
    expenses_by_category = {e["_id"]: e["total"] for e in expense_result}
    total_expenses = sum(expenses_by_category.values())
    
    # Calculate totals
    total_cost = purchase_cost + total_expenses
    actual_profit = order_value - total_cost
    profit_margin = (actual_profit / order_value * 100) if order_value > 0 else 0
    
    # Calculate savings
    purchase_target = 0
    execution_target = 0
    if lifecycle:
        purchase_target = calculate_budget_amount(order_value, lifecycle.get("purchase_budget"))
        execution_target = calculate_budget_amount(order_value, lifecycle.get("execution_budget"))
    
    purchase_savings = purchase_target - purchase_cost if purchase_target > 0 else 0
    execution_savings = execution_target - total_expenses if execution_target > 0 else 0
    
    return {
        "order_value": order_value,
        "purchase_target": purchase_target,
        "purchase_actual": purchase_cost,
        "purchase_savings": purchase_savings,
        "execution_target": execution_target,
        "execution_actual": total_expenses,
        "execution_savings": execution_savings,
        "total_cost": total_cost,
        "actual_profit": actual_profit,
        "profit_margin": round(profit_margin, 1),
        "expenses_by_category": expenses_by_category
    }


# ============== ORDER LIFECYCLE ENDPOINTS ==============

@router.get("/orders")
async def get_orders_with_lifecycle(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all orders with lifecycle data"""
    # Build query for sales orders
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"order_no": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Get sales orders
    cursor = db.sales_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(length=limit)
    total = await db.sales_orders.count_documents(query)
    
    # Enrich with lifecycle data
    enriched_orders = []
    for order in orders:
        lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order["id"]}, {"_id": 0})
        financials = await get_order_financials(order["id"])
        
        # Calculate payment status
        paid_amount = 0
        if lifecycle and lifecycle.get("payment_milestones"):
            paid_amount = sum(m.get("paid_amount", 0) for m in lifecycle["payment_milestones"])
        
        payment_percentage = (paid_amount / order.get("total_amount", 1) * 100) if order.get("total_amount") else 0
        
        enriched_orders.append({
            **order,
            "lifecycle": lifecycle,
            "financials": financials,
            "paid_amount": paid_amount,
            "payment_percentage": round(payment_percentage, 1),
            "lifecycle_status": lifecycle.get("status", "new") if lifecycle else "new"
        })
    
    return {"orders": enriched_orders, "total": total}


@router.get("/orders/{order_id}")
async def get_order_details(order_id: str):
    """Get detailed order with lifecycle, expenses, and financials"""
    # Get sales order
    sales_order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    if not sales_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get lifecycle data
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
    
    # Get expenses
    expenses = await db.order_expenses.find({"order_id": order_id}, {"_id": 0}).sort("date", -1).to_list(500)
    
    # Get purchase orders
    purchase_orders = await db.purchase_orders.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    # Get linked project
    linked_project = None
    if lifecycle and lifecycle.get("linked_project_id"):
        linked_project = await db.projects.find_one({"id": lifecycle["linked_project_id"]}, {"_id": 0})
    
    # Get financials
    financials = await get_order_financials(order_id)
    
    return {
        "order": sales_order,
        "lifecycle": lifecycle,
        "expenses": expenses,
        "purchase_orders": purchase_orders,
        "linked_project": linked_project,
        "financials": financials
    }


@router.post("/orders/{order_id}/lifecycle")
async def create_or_update_lifecycle(order_id: str, data: OrderLifecycleCreate):
    """Create or update lifecycle data for an order"""
    # Verify order exists
    sales_order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    if not sales_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_value = sales_order.get("total_amount", 0)
    
    # Calculate budget amounts
    purchase_budget = data.purchase_budget.model_dump() if data.purchase_budget else None
    execution_budget = data.execution_budget.model_dump() if data.execution_budget else None
    target_profit = data.target_profit.model_dump() if data.target_profit else None
    
    if purchase_budget:
        purchase_budget["amount"] = calculate_budget_amount(order_value, purchase_budget)
    if execution_budget:
        execution_budget["amount"] = calculate_budget_amount(order_value, execution_budget)
    if target_profit:
        target_profit["amount"] = calculate_budget_amount(order_value, target_profit)
    
    # Calculate payment milestone amounts
    milestones = []
    for m in data.payment_milestones:
        milestone = m.model_dump()
        if milestone["type"] == "percentage":
            milestone["amount"] = order_value * (milestone["value"] / 100)
        else:
            milestone["amount"] = milestone["value"]
        milestones.append(milestone)
    
    lifecycle_data = {
        "sales_order_id": order_id,
        "purchase_budget": purchase_budget,
        "execution_budget": execution_budget,
        "target_profit": target_profit,
        "payment_milestones": milestones,
        "credit_period_days": data.credit_period_days,
        "project_type": data.project_type,
        "linked_project_id": data.linked_project_id,
        "estimated_delivery_date": data.estimated_delivery_date,
        "actual_delivery_date": data.actual_delivery_date,
        "status": "procurement",  # Initial status after setup
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Check if lifecycle exists
    existing = await db.order_lifecycle.find_one({"sales_order_id": order_id})
    
    if existing:
        await db.order_lifecycle.update_one(
            {"sales_order_id": order_id},
            {"$set": lifecycle_data}
        )
        message = "Lifecycle updated successfully"
    else:
        lifecycle_data["id"] = str(uuid.uuid4())
        lifecycle_data["created_at"] = datetime.now(timezone.utc)
        await db.order_lifecycle.insert_one(lifecycle_data)
        message = "Lifecycle created successfully"
    
    # Auto-create project if requested
    if data.auto_create_project and data.project_type and not data.linked_project_id:
        project_id = str(uuid.uuid4())
        project = {
            "id": project_id,
            "pid_no": f"PID-{sales_order.get('order_no', '').replace('SO-', '')}",
            "category": data.project_type,
            "client": sales_order.get("customer_name", ""),
            "location": sales_order.get("customer_address", ""),
            "project_name": f"Project for {sales_order.get('order_no', '')}",
            "vendor": "",
            "status": "In Progress",
            "engineer_in_charge": "",
            "po_number": sales_order.get("po_number", ""),
            "po_amount": order_value,
            "budget": (execution_budget.get("amount", 0) if execution_budget else 0) + (purchase_budget.get("amount", 0) if purchase_budget else 0),
            "linked_order_id": order_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.projects.insert_one(project)
        
        # Update lifecycle with project link
        await db.order_lifecycle.update_one(
            {"sales_order_id": order_id},
            {"$set": {"linked_project_id": project_id}}
        )
        
        lifecycle_data["linked_project_id"] = project_id
    
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
    return {"message": message, "lifecycle": lifecycle}


@router.put("/orders/{order_id}/lifecycle")
async def update_lifecycle(order_id: str, data: OrderLifecycleUpdate):
    """Update lifecycle data"""
    existing = await db.order_lifecycle.find_one({"sales_order_id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lifecycle not found. Create it first.")
    
    sales_order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    order_value = sales_order.get("total_amount", 0) if sales_order else 0
    
    update_data = {}
    
    if data.purchase_budget:
        budget = data.purchase_budget.model_dump()
        budget["amount"] = calculate_budget_amount(order_value, budget)
        update_data["purchase_budget"] = budget
    
    if data.execution_budget:
        budget = data.execution_budget.model_dump()
        budget["amount"] = calculate_budget_amount(order_value, budget)
        update_data["execution_budget"] = budget
    
    if data.target_profit:
        budget = data.target_profit.model_dump()
        budget["amount"] = calculate_budget_amount(order_value, budget)
        update_data["target_profit"] = budget
    
    if data.payment_milestones is not None:
        milestones = []
        for m in data.payment_milestones:
            milestone = m.model_dump()
            if milestone["type"] == "percentage":
                milestone["amount"] = order_value * (milestone["value"] / 100)
            else:
                milestone["amount"] = milestone["value"]
            milestones.append(milestone)
        update_data["payment_milestones"] = milestones
    
    if data.credit_period_days is not None:
        update_data["credit_period_days"] = data.credit_period_days
    if data.project_type is not None:
        update_data["project_type"] = data.project_type
    if data.linked_project_id is not None:
        update_data["linked_project_id"] = data.linked_project_id
    if data.estimated_delivery_date is not None:
        update_data["estimated_delivery_date"] = data.estimated_delivery_date
    if data.actual_delivery_date is not None:
        update_data["actual_delivery_date"] = data.actual_delivery_date
    if data.status is not None:
        update_data["status"] = data.status
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.order_lifecycle.update_one(
        {"sales_order_id": order_id},
        {"$set": update_data}
    )
    
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
    return {"message": "Lifecycle updated", "lifecycle": lifecycle}


@router.put("/orders/{order_id}/lifecycle/status")
async def update_lifecycle_status(order_id: str, status: str):
    """Update order lifecycle status"""
    valid_statuses = ["new", "procurement", "execution", "delivered", "invoiced", "paid", "closed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.order_lifecycle.update_one(
        {"sales_order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lifecycle not found")
    
    return {"message": "Status updated", "status": status}


@router.put("/orders/{order_id}/payment/{milestone_id}")
async def update_payment_milestone(order_id: str, milestone_id: str, status: str, paid_amount: float = 0, paid_date: str = None):
    """Update payment milestone status"""
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id})
    if not lifecycle:
        raise HTTPException(status_code=404, detail="Lifecycle not found")
    
    milestones = lifecycle.get("payment_milestones", [])
    updated = False
    
    for m in milestones:
        if m.get("id") == milestone_id:
            m["status"] = status
            m["paid_amount"] = paid_amount
            m["paid_date"] = paid_date or datetime.now().strftime("%Y-%m-%d")
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    await db.order_lifecycle.update_one(
        {"sales_order_id": order_id},
        {"$set": {"payment_milestones": milestones, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Payment milestone updated", "milestones": milestones}


# ============== EXPENSE ENDPOINTS ==============

@router.get("/expenses")
async def get_all_expenses(
    order_id: Optional[str] = None,
    category: Optional[str] = None,
    approved: Optional[bool] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all expenses with optional filters"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if category:
        query["category"] = category
    if approved is not None:
        query["approved"] = approved
    
    cursor = db.order_expenses.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(length=limit)
    total = await db.order_expenses.count_documents(query)
    
    # Calculate totals
    total_amount = sum(e.get("amount", 0) for e in expenses)
    approved_amount = sum(e.get("amount", 0) for e in expenses if e.get("approved"))
    
    return {
        "expenses": expenses,
        "total": total,
        "total_amount": total_amount,
        "approved_amount": approved_amount
    }


@router.post("/expenses")
async def create_expense(data: ExpenseCreate):
    """Create a new expense entry"""
    # Verify order exists
    order = await db.sales_orders.find_one({"id": data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    expense = {
        "id": str(uuid.uuid4()),
        "order_id": data.order_id,
        "category": data.category,
        "description": data.description,
        "amount": data.amount,
        "date": data.date,
        "vendor": data.vendor,
        "reference_no": data.reference_no,
        "approved": False,
        "approved_by": None,
        "approved_date": None,
        "created_by": data.created_by,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.order_expenses.insert_one(expense)
    expense.pop("_id", None)
    
    return {"message": "Expense created", "expense": expense}


@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: dict):
    """Update an expense entry"""
    update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "order_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.order_expenses.update_one(
        {"id": expense_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense = await db.order_expenses.find_one({"id": expense_id}, {"_id": 0})
    return {"message": "Expense updated", "expense": expense}


@router.put("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, approved_by: str):
    """Approve an expense"""
    result = await db.order_expenses.update_one(
        {"id": expense_id},
        {"$set": {
            "approved": True,
            "approved_by": approved_by,
            "approved_date": datetime.now().strftime("%Y-%m-%d"),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense approved"}


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense"""
    result = await db.order_expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}


# ============== DASHBOARD & ANALYTICS ==============

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get order lifecycle dashboard statistics"""
    # Total orders
    total_orders = await db.sales_orders.count_documents({})
    
    # Orders by lifecycle status
    pipeline = [
        {"$lookup": {
            "from": "order_lifecycle",
            "localField": "id",
            "foreignField": "sales_order_id",
            "as": "lifecycle"
        }},
        {"$unwind": {"path": "$lifecycle", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": {"$ifNull": ["$lifecycle.status", "new"]},
            "count": {"$sum": 1},
            "value": {"$sum": "$total_amount"}
        }}
    ]
    status_result = await db.sales_orders.aggregate(pipeline).to_list(100)
    orders_by_status = {s["_id"]: {"count": s["count"], "value": s["value"]} for s in status_result}
    
    # Total revenue
    revenue_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.sales_orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Total expenses
    expense_pipeline = [
        {"$match": {"approved": True}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    expense_result = await db.order_expenses.aggregate(expense_pipeline).to_list(1)
    total_expenses = expense_result[0]["total"] if expense_result else 0
    
    # Purchase orders total
    po_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    po_result = await db.purchase_orders.aggregate(po_pipeline).to_list(1)
    total_purchase = po_result[0]["total"] if po_result else 0
    
    # Calculate overall profit
    total_cost = total_purchase + total_expenses
    total_profit = total_revenue - total_cost
    profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Pending payments
    payment_pipeline = [
        {"$unwind": "$payment_milestones"},
        {"$match": {"payment_milestones.status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "pending": {"$sum": "$payment_milestones.amount"}}}
    ]
    payment_result = await db.order_lifecycle.aggregate(payment_pipeline).to_list(1)
    pending_payments = payment_result[0]["pending"] if payment_result else 0
    
    # This month's orders
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    this_month_orders = await db.sales_orders.count_documents({"created_at": {"$gte": month_start}})
    
    return {
        "total_orders": total_orders,
        "orders_by_status": orders_by_status,
        "total_revenue": total_revenue,
        "total_purchase": total_purchase,
        "total_expenses": total_expenses,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "profit_margin": round(profit_margin, 1),
        "pending_payments": pending_payments,
        "this_month_orders": this_month_orders
    }


@router.get("/dashboard/profitability")
async def get_profitability_report(limit: int = 20):
    """Get order-wise profitability report"""
    # Get recent orders
    orders = await db.sales_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    profitability = []
    for order in orders:
        financials = await get_order_financials(order["id"])
        lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order["id"]}, {"_id": 0})
        
        profitability.append({
            "order_no": order.get("order_no"),
            "customer": order.get("customer_name"),
            "order_date": order.get("date"),
            "order_value": order.get("total_amount", 0),
            "status": lifecycle.get("status", "new") if lifecycle else "new",
            **financials
        })
    
    return {"profitability": profitability}


@router.get("/dashboard/savings-report")
async def get_savings_report():
    """Get purchase and execution savings report"""
    # Get all orders with lifecycle
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$project": {
            "_id": 0,
            "order_no": "$order.order_no",
            "customer": "$order.customer_name",
            "order_value": "$order.total_amount",
            "purchase_budget": 1,
            "execution_budget": 1,
            "status": 1
        }}
    ]
    
    lifecycles = await db.order_lifecycle.aggregate(pipeline).to_list(100)
    
    total_purchase_target = 0
    total_purchase_actual = 0
    total_execution_target = 0
    total_execution_actual = 0
    
    savings_details = []
    
    for lc in lifecycles:
        order_value = lc.get("order_value", 0)
        
        purchase_target = calculate_budget_amount(order_value, lc.get("purchase_budget"))
        execution_target = calculate_budget_amount(order_value, lc.get("execution_budget"))
        
        # Get actuals
        # Purchase actual from purchase_orders
        po_result = await db.purchase_orders.aggregate([
            {"$match": {"order_id": lc.get("sales_order_id")}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]).to_list(1)
        purchase_actual = po_result[0]["total"] if po_result else 0
        
        # Execution actual from expenses
        exp_result = await db.order_expenses.aggregate([
            {"$match": {"order_id": lc.get("sales_order_id"), "approved": True}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        execution_actual = exp_result[0]["total"] if exp_result else 0
        
        purchase_savings = purchase_target - purchase_actual
        execution_savings = execution_target - execution_actual
        
        total_purchase_target += purchase_target
        total_purchase_actual += purchase_actual
        total_execution_target += execution_target
        total_execution_actual += execution_actual
        
        savings_details.append({
            "order_no": lc.get("order_no"),
            "customer": lc.get("customer"),
            "order_value": order_value,
            "purchase_target": purchase_target,
            "purchase_actual": purchase_actual,
            "purchase_savings": purchase_savings,
            "execution_target": execution_target,
            "execution_actual": execution_actual,
            "execution_savings": execution_savings,
            "total_savings": purchase_savings + execution_savings
        })
    
    return {
        "summary": {
            "total_purchase_target": total_purchase_target,
            "total_purchase_actual": total_purchase_actual,
            "total_purchase_savings": total_purchase_target - total_purchase_actual,
            "total_execution_target": total_execution_target,
            "total_execution_actual": total_execution_actual,
            "total_execution_savings": total_execution_target - total_execution_actual,
            "grand_total_savings": (total_purchase_target - total_purchase_actual) + (total_execution_target - total_execution_actual)
        },
        "details": savings_details
    }


@router.get("/dashboard/payment-tracking")
async def get_payment_tracking():
    """Get payment tracking with credit period alerts"""
    # Get all orders with payment milestones
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$project": {
            "_id": 0,
            "order_id": "$sales_order_id",
            "order_no": "$order.order_no",
            "customer": "$order.customer_name",
            "order_value": "$order.total_amount",
            "payment_milestones": 1,
            "credit_period_days": 1
        }}
    ]
    
    lifecycles = await db.order_lifecycle.aggregate(pipeline).to_list(100)
    
    pending_payments = []
    overdue_payments = []
    today = datetime.now().date()
    
    for lc in lifecycles:
        for m in lc.get("payment_milestones", []):
            if m.get("status") != "paid":
                due_date = None
                if m.get("due_date"):
                    try:
                        due_date = datetime.strptime(m["due_date"], "%Y-%m-%d").date()
                    except:
                        pass
                
                payment_info = {
                    "order_no": lc.get("order_no"),
                    "customer": lc.get("customer"),
                    "milestone": m.get("name"),
                    "amount": m.get("amount", 0),
                    "due_date": m.get("due_date"),
                    "status": m.get("status"),
                    "days_overdue": (today - due_date).days if due_date and due_date < today else 0
                }
                
                if due_date and due_date < today:
                    overdue_payments.append(payment_info)
                else:
                    pending_payments.append(payment_info)
    
    total_pending = sum(p["amount"] for p in pending_payments)
    total_overdue = sum(p["amount"] for p in overdue_payments)
    
    return {
        "summary": {
            "total_pending": total_pending,
            "total_overdue": total_overdue,
            "pending_count": len(pending_payments),
            "overdue_count": len(overdue_payments)
        },
        "pending_payments": pending_payments,
        "overdue_payments": overdue_payments
    }


@router.get("/expense-categories")
async def get_expense_categories():
    """Get list of expense categories"""
    return {
        "categories": [
            {"value": "material_purchase", "label": "Material Purchase"},
            {"value": "labor", "label": "Labor / Manpower"},
            {"value": "transport", "label": "Transport & Logistics"},
            {"value": "site_expenses", "label": "Site Expenses"},
            {"value": "subcontractor", "label": "Subcontractor Payments"},
            {"value": "equipment_rental", "label": "Equipment Rental"},
            {"value": "misc", "label": "Miscellaneous"}
        ]
    }


@router.get("/project-types")
async def get_project_types():
    """Get list of project types for linking"""
    return {
        "types": [
            {"value": "amc", "label": "AMC - Annual Maintenance Contract"},
            {"value": "equipment_service", "label": "Equipment Service"},
            {"value": "calibration", "label": "Calibration"},
            {"value": "transformer_testing", "label": "Transformer Testing"},
            {"value": "ir_thermography", "label": "IR Thermography"},
            {"value": "custom", "label": "Custom Project"}
        ]
    }
