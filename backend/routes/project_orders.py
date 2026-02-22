"""
Project Orders Integration API
- Manages the flow from Sales Orders to Projects
- Provides dashboard for Projects dept to view new orders
- Handles weekly billing updates from project managers
- Tracks order-to-project lifecycle
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/project-orders", tags=["Project Orders Integration"])


# ============== MODELS ==============

class WeeklyBillingEntry(BaseModel):
    """Weekly billing entry by project manager"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    project_pid: str
    order_id: Optional[str] = None
    order_no: Optional[str] = None
    week_number: int  # 1-52
    year: int
    billing_amount: float
    completion_before: float  # Completion % before this entry
    completion_after: float   # Completion % after this entry
    work_done_description: str
    remarks: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WeeklyBillingCreate(BaseModel):
    """Create weekly billing entry"""
    project_id: str
    billing_amount: float
    completion_percentage: float  # New completion percentage after this work
    work_done_description: str
    remarks: Optional[str] = None


class OrderHandoffCreate(BaseModel):
    """Create project handoff from order"""
    order_id: str
    budget_allocation: float
    project_type: Optional[str] = None  # PSS, AS, OSS, CS
    engineer_in_charge: str
    estimated_start_date: Optional[str] = None
    estimated_completion_date: Optional[str] = None
    notes: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def create_notification(
    department: str,
    title: str,
    message: str,
    notif_type: str = "order_handoff",
    reference_id: str = None,
    reference_type: str = None,
    from_department: str = None,
    created_by: str = None
):
    """Create notification for a department"""
    notification = {
        "id": str(uuid.uuid4()),
        "type": notif_type,
        "title": title,
        "message": message,
        "department": department,
        "from_department": from_department,
        "reference_id": reference_id,
        "reference_type": reference_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": created_by
    }
    await db.notifications.insert_one(notification)
    return notification["id"]


def get_current_week_year():
    """Get current ISO week number and year"""
    now = datetime.now(timezone.utc)
    iso_cal = now.isocalendar()
    return iso_cal[1], iso_cal[0]  # week, year


# ============== ENDPOINTS ==============

@router.get("/pending-orders")
async def get_pending_orders_for_projects():
    """
    Get orders that are confirmed but not yet assigned to projects.
    This is the Projects department's view of new work coming in.
    """
    # Find orders that are confirmed but don't have a linked project
    pipeline = [
        {
            "$match": {
                "status": {"$in": ["confirmed", "pending"]},
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "id",
                "foreignField": "linked_order_id",
                "as": "linked_project"
            }
        },
        {
            "$match": {
                "linked_project": {"$size": 0}  # No linked project
            }
        },
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "order_no": 1,
                "customer_name": 1,
                "customer_address": 1,
                "total_amount": 1,
                "subtotal": 1,
                "category": 1,
                "items": 1,
                "po_number": 1,
                "po_date": 1,
                "date": 1,
                "delivery_date": 1,
                "status": 1,
                "quotation_no": 1,
                "created_at": 1
            }
        },
        {"$sort": {"created_at": -1}}
    ]
    
    orders = await db.sales_orders.aggregate(pipeline).to_list(100)
    
    return {
        "pending_orders": orders,
        "total": len(orders)
    }


@router.get("/orders-with-projects")
async def get_orders_with_project_status():
    """
    Get all orders with their project assignment status.
    Shows which orders have projects and their progress.
    """
    pipeline = [
        {
            "$lookup": {
                "from": "projects",
                "localField": "id",
                "foreignField": "linked_order_id",
                "as": "project"
            }
        },
        {
            "$unwind": {
                "path": "$project",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$project": {
                "_id": 0,
                "order_id": "$id",
                "order_no": 1,
                "customer_name": 1,
                "total_amount": 1,
                "category": 1,
                "order_status": "$status",
                "created_at": 1,
                "project_id": "$project.id",
                "project_pid": "$project.pid_no",
                "project_status": "$project.status",
                "project_completion": "$project.completion_percentage",
                "project_budget": "$project.budget",
                "project_expenses": "$project.actual_expenses",
                "project_engineer": "$project.engineer_in_charge",
                "has_project": {"$cond": [{"$ifNull": ["$project.id", False]}, True, False]}
            }
        },
        {"$sort": {"created_at": -1}}
    ]
    
    orders = await db.sales_orders.aggregate(pipeline).to_list(200)
    
    # Calculate summary stats
    total = len(orders)
    with_project = sum(1 for o in orders if o.get("has_project"))
    without_project = total - with_project
    
    return {
        "orders": orders,
        "summary": {
            "total_orders": total,
            "with_project": with_project,
            "without_project": without_project,
            "assignment_rate": round(with_project / total * 100, 1) if total > 0 else 0
        }
    }


@router.post("/create-project-from-order")
async def create_project_from_order(data: OrderHandoffCreate):
    """
    Create a new project from a confirmed sales order.
    This is the main handoff point from Sales to Projects.
    """
    # Get the order
    order = await db.sales_orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if project already exists for this order
    existing_project = await db.projects.find_one({"linked_order_id": data.order_id}, {"_id": 0})
    if existing_project:
        raise HTTPException(
            status_code=400, 
            detail=f"Project {existing_project.get('pid_no')} already exists for this order"
        )
    
    # Generate next PID
    current_date = datetime.now()
    if current_date.month >= 4:
        year1 = current_date.year % 100
        year2 = (current_date.year + 1) % 100
    else:
        year1 = (current_date.year - 1) % 100
        year2 = current_date.year % 100
    financial_year = f"{year1:02d}-{year2:02d}"
    
    # Get next PID number
    pattern = f"^PID/{financial_year}/"
    projects_this_year = await db.projects.find(
        {"pid_no": {"$regex": pattern}},
        {"pid_no": 1, "_id": 0}
    ).to_list(10000)
    
    max_num = 0
    for project in projects_this_year:
        try:
            pid = project.get("pid_no", "")
            parts = pid.split("/")
            if len(parts) == 3 and parts[1] == financial_year:
                num = int(parts[2])
                if num > max_num:
                    max_num = num
        except (ValueError, IndexError):
            continue
    
    next_pid = f"PID/{financial_year}/{(max_num + 1):03d}"
    
    # Create project
    project = {
        "id": str(uuid.uuid4()),
        "pid_no": next_pid,
        "category": data.project_type or order.get("category", "PSS"),
        "department": "PROJECTS",
        "po_number": order.get("po_number") or order.get("order_no"),
        "client": order.get("customer_name", ""),
        "location": order.get("customer_address", ""),
        "project_name": f"Project for Order {order.get('order_no', '')}",
        "vendor": "Enerzia",
        "status": "Need to Start",
        "engineer_in_charge": data.engineer_in_charge,
        "project_date": data.estimated_start_date or datetime.now().strftime("%d/%m/%Y"),
        "completion_date": data.estimated_completion_date,
        "po_amount": order.get("total_amount", 0),
        "budget": data.budget_allocation,
        "actual_expenses": 0,
        "balance": order.get("total_amount", 0),
        "invoiced_amount": 0,
        "completion_percentage": 0,
        "this_week_billing": 0,
        "pid_savings": data.budget_allocation,
        "weekly_actions": data.notes or "",
        "linked_order_id": data.order_id,
        "linked_order_no": order.get("order_no", ""),
        "work_items": order.get("items", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.insert_one(project)
    
    # Update order status to indicate handoff
    await db.sales_orders.update_one(
        {"id": data.order_id},
        {"$set": {
            "status": "processing",
            "project_id": project["id"],
            "project_pid": next_pid,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update order_lifecycle if exists
    await db.order_lifecycle.update_one(
        {"sales_order_id": data.order_id},
        {"$set": {
            "linked_project_id": project["id"],
            "linked_project_pid": next_pid,
            "status": "execution",
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    # Create notification for Projects department
    await create_notification(
        department="PROJECTS",
        title="New Project Created from Order",
        message=f"Project {next_pid} created from Order {order.get('order_no', '')} for {order.get('customer_name', '')}. Budget: ₹{data.budget_allocation:,.0f}",
        notif_type="new_project",
        reference_id=project["id"],
        reference_type="project",
        from_department="SALES"
    )
    
    # Remove _id before returning
    project.pop("_id", None)
    
    return {
        "message": "Project created successfully",
        "project": project
    }


@router.post("/weekly-billing")
async def record_weekly_billing(data: WeeklyBillingCreate):
    """
    Record weekly billing update from project manager.
    Updates project progress and creates billing entry.
    """
    # Get project
    project = await db.projects.find_one({"id": data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    week, year = get_current_week_year()
    
    # Create billing entry
    billing_entry = {
        "id": str(uuid.uuid4()),
        "project_id": data.project_id,
        "project_pid": project.get("pid_no", ""),
        "order_id": project.get("linked_order_id"),
        "order_no": project.get("linked_order_no"),
        "week_number": week,
        "year": year,
        "billing_amount": data.billing_amount,
        "completion_before": project.get("completion_percentage", 0),
        "completion_after": data.completion_percentage,
        "work_done_description": data.work_done_description,
        "remarks": data.remarks,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.weekly_billing_entries.insert_one(billing_entry)
    
    # Update project
    current_this_week = project.get("this_week_billing", 0)
    current_invoiced = project.get("invoiced_amount", 0)
    po_amount = project.get("po_amount", 0)
    
    new_invoiced = current_invoiced + data.billing_amount
    new_balance = po_amount - new_invoiced
    
    # Determine new status based on completion
    new_status = project.get("status", "Ongoing")
    if data.completion_percentage >= 100:
        new_status = "Completed"
    elif data.completion_percentage > 0:
        new_status = "Ongoing"
    
    await db.projects.update_one(
        {"id": data.project_id},
        {"$set": {
            "completion_percentage": data.completion_percentage,
            "this_week_billing": data.billing_amount,
            "invoiced_amount": new_invoiced,
            "balance": new_balance,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If project has linked order, update its status too
    if project.get("linked_order_id"):
        order_status = "processing"
        if data.completion_percentage >= 100:
            order_status = "delivered"
        
        await db.sales_orders.update_one(
            {"id": project["linked_order_id"]},
            {"$set": {
                "status": order_status,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update order lifecycle
        lifecycle_status = "execution"
        if data.completion_percentage >= 100:
            lifecycle_status = "delivered"
        
        await db.order_lifecycle.update_one(
            {"sales_order_id": project["linked_order_id"]},
            {"$set": {
                "status": lifecycle_status,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    billing_entry.pop("_id", None)
    
    return {
        "message": "Weekly billing recorded",
        "billing_entry": billing_entry,
        "updated_project": {
            "completion_percentage": data.completion_percentage,
            "this_week_billing": data.billing_amount,
            "invoiced_amount": new_invoiced,
            "balance": new_balance,
            "status": new_status
        }
    }


@router.get("/weekly-billing/{project_id}")
async def get_project_billing_history(project_id: str):
    """Get billing history for a project"""
    entries = await db.weekly_billing_entries.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    total_billed = sum(e.get("billing_amount", 0) for e in entries)
    
    return {
        "entries": entries,
        "total_entries": len(entries),
        "total_billed": total_billed
    }


@router.get("/weekly-billing/summary/current-week")
async def get_current_week_billing_summary():
    """Get summary of all billing entries for current week"""
    week, year = get_current_week_year()
    
    entries = await db.weekly_billing_entries.find(
        {"week_number": week, "year": year},
        {"_id": 0}
    ).to_list(500)
    
    total_billing = sum(e.get("billing_amount", 0) for e in entries)
    
    # Group by project
    by_project = {}
    for entry in entries:
        pid = entry.get("project_pid", "Unknown")
        if pid not in by_project:
            by_project[pid] = {
                "project_id": entry.get("project_id"),
                "project_pid": pid,
                "order_no": entry.get("order_no"),
                "total_billing": 0,
                "entries": []
            }
        by_project[pid]["total_billing"] += entry.get("billing_amount", 0)
        by_project[pid]["entries"].append(entry)
    
    return {
        "week_number": week,
        "year": year,
        "total_billing": total_billing,
        "total_entries": len(entries),
        "by_project": list(by_project.values())
    }


@router.get("/dashboard")
async def get_project_orders_dashboard():
    """
    Dashboard for Projects department showing:
    - Pending orders waiting for project assignment
    - Active projects from orders
    - This week's billing summary
    - Recent project creations
    """
    # Pending orders (no project yet)
    pending_pipeline = [
        {
            "$match": {
                "status": {"$in": ["confirmed", "pending"]}
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "id",
                "foreignField": "linked_order_id",
                "as": "project"
            }
        },
        {
            "$match": {
                "project": {"$size": 0}
            }
        },
        {"$count": "count"}
    ]
    pending_result = await db.sales_orders.aggregate(pending_pipeline).to_list(1)
    pending_count = pending_result[0]["count"] if pending_result else 0
    
    # Total value of pending orders
    pending_value_pipeline = [
        {
            "$match": {
                "status": {"$in": ["confirmed", "pending"]}
            }
        },
        {
            "$lookup": {
                "from": "projects",
                "localField": "id",
                "foreignField": "linked_order_id",
                "as": "project"
            }
        },
        {
            "$match": {
                "project": {"$size": 0}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_value": {"$sum": "$total_amount"}
            }
        }
    ]
    value_result = await db.sales_orders.aggregate(pending_value_pipeline).to_list(1)
    pending_value = value_result[0]["total_value"] if value_result else 0
    
    # Active projects with linked orders
    active_projects = await db.projects.count_documents({
        "linked_order_id": {"$ne": None, "$exists": True},
        "status": {"$in": ["Need to Start", "Ongoing", "In Progress"]}
    })
    
    # Projects from orders this month
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    projects_this_month = await db.projects.count_documents({
        "linked_order_id": {"$ne": None, "$exists": True},
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    # This week's billing
    week, year = get_current_week_year()
    week_billing = await db.weekly_billing_entries.aggregate([
        {"$match": {"week_number": week, "year": year}},
        {"$group": {"_id": None, "total": {"$sum": "$billing_amount"}}}
    ]).to_list(1)
    this_week_billing = week_billing[0]["total"] if week_billing else 0
    
    # Recent project creations (last 5)
    recent_projects = await db.projects.find(
        {"linked_order_id": {"$ne": None, "$exists": True}},
        {"_id": 0, "id": 1, "pid_no": 1, "client": 1, "linked_order_no": 1, "budget": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "pending_orders": {
            "count": pending_count,
            "total_value": pending_value
        },
        "active_projects_from_orders": active_projects,
        "projects_this_month": projects_this_month,
        "this_week_billing": this_week_billing,
        "recent_projects": recent_projects
    }


@router.get("/project/{project_id}/order-details")
async def get_project_order_details(project_id: str):
    """
    Get full details of a project including its linked order,
    billing history, and lifecycle status.
    """
    # Get project
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = {
        "project": project,
        "order": None,
        "lifecycle": None,
        "billing_history": [],
        "total_billed": 0
    }
    
    # Get linked order if exists
    if project.get("linked_order_id"):
        order = await db.sales_orders.find_one(
            {"id": project["linked_order_id"]},
            {"_id": 0}
        )
        result["order"] = order
        
        # Get lifecycle
        lifecycle = await db.order_lifecycle.find_one(
            {"sales_order_id": project["linked_order_id"]},
            {"_id": 0}
        )
        result["lifecycle"] = lifecycle
    
    # Get billing history
    billing_entries = await db.weekly_billing_entries.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    result["billing_history"] = billing_entries
    result["total_billed"] = sum(e.get("billing_amount", 0) for e in billing_entries)
    
    return result
