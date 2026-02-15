"""
Scheduled Inspections Routes
Handles equipment inspection scheduling and tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter()


class ScheduledInspection(BaseModel):
    id: str = ""
    title: Optional[str] = None
    equipment_id: Optional[str] = None
    equipment_type: Optional[str] = ""
    equipment_name: Optional[str] = ""
    location: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    inspection_type: str  # equipment, amc, audit, other
    frequency: str  # daily, weekly, biweekly, monthly, quarterly, half_yearly, yearly
    start_date: Optional[str] = None
    last_inspection_date: Optional[str] = None
    next_due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_id: Optional[str] = None
    reminder_days: Optional[int] = 3
    status: str = "active"  # active, paused, completed, cancelled
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ScheduledInspectionCreate(BaseModel):
    title: Optional[str] = None
    equipment_id: Optional[str] = None
    equipment_type: Optional[str] = ""
    equipment_name: Optional[str] = ""
    location: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    inspection_type: str
    frequency: str
    start_date: Optional[str] = None
    last_inspection_date: Optional[str] = None
    next_due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_id: Optional[str] = None
    reminder_days: Optional[int] = 3
    notes: Optional[str] = None


def get_db():
    from server import db
    return db


def calculate_next_due_date(current_date: str, frequency: str) -> str:
    """Calculate the next due date based on frequency"""
    try:
        if not current_date:
            base_date = datetime.now()
        else:
            # Handle multiple date formats
            for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"]:
                try:
                    base_date = datetime.strptime(current_date, fmt)
                    break
                except ValueError:
                    continue
            else:
                base_date = datetime.now()
        
        frequency_map = {
            "monthly": 30,
            "quarterly": 90,
            "half-yearly": 180,
            "yearly": 365
        }
        
        days_to_add = frequency_map.get(frequency.lower(), 365)
        next_date = base_date + timedelta(days=days_to_add)
        return next_date.strftime("%Y-%m-%d")
    except Exception:
        return (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")


@router.get("")
async def get_scheduled_inspections(
    status: Optional[str] = None,
    inspection_type: Optional[str] = None,
    equipment_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all scheduled inspections with optional filters"""
    db = get_db()
    
    query = {}
    if status and status != 'all':
        query["status"] = status
    if inspection_type and inspection_type != 'all':
        query["inspection_type"] = inspection_type
    if equipment_type:
        query["equipment_type"] = equipment_type
    if customer_id:
        query["customer_id"] = customer_id
    
    inspections = await db.scheduled_inspections.find(
        query, {"_id": 0}
    ).sort("next_due_date", 1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.scheduled_inspections.count_documents(query)
    
    return {
        "inspections": inspections,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/dashboard")
async def get_inspections_dashboard(
    days_ahead: int = 30
):
    """Get inspection dashboard statistics"""
    db = get_db()
    
    today = datetime.now().strftime("%Y-%m-%d")
    future_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    week_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    month_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Count by status
    total_active = await db.scheduled_inspections.count_documents({"status": "active"})
    paused = await db.scheduled_inspections.count_documents({"status": "paused"})
    
    # Overdue (active and next_due_date < today)
    overdue = await db.scheduled_inspections.count_documents({
        "status": "active",
        "next_due_date": {"$lt": today}
    })
    
    # Due today
    due_today = await db.scheduled_inspections.count_documents({
        "status": "active",
        "next_due_date": today
    })
    
    # This week
    this_week = await db.scheduled_inspections.count_documents({
        "status": "active",
        "next_due_date": {"$gte": today, "$lte": week_date}
    })
    
    # This month
    this_month = await db.scheduled_inspections.count_documents({
        "status": "active",
        "next_due_date": {"$gte": today, "$lte": month_date}
    })
    
    return {
        "total_active": total_active,
        "overdue": overdue,
        "due_today": due_today,
        "this_week": this_week,
        "this_month": this_month,
        "paused": paused
    }


@router.get("/{inspection_id}")
async def get_scheduled_inspection(inspection_id: str):
    """Get a single scheduled inspection by ID"""
    db = get_db()
    
    inspection = await db.scheduled_inspections.find_one(
        {"id": inspection_id}, {"_id": 0}
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    return inspection


@router.post("")
async def create_scheduled_inspection(data: ScheduledInspectionCreate):
    """Create a new scheduled inspection"""
    db = get_db()
    
    # Calculate next_due_date from start_date if not provided
    next_due_date = data.next_due_date
    if not next_due_date and data.start_date:
        next_due_date = data.start_date
    elif not next_due_date:
        next_due_date = datetime.now().strftime("%Y-%m-%d")
    
    inspection = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "next_due_date": next_due_date,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.scheduled_inspections.insert_one(inspection)
    
    # Remove MongoDB _id before returning
    inspection.pop("_id", None)
    return inspection


@router.put("/{inspection_id}")
async def update_scheduled_inspection(inspection_id: str, data: dict):
    """Update a scheduled inspection"""
    db = get_db()
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.scheduled_inspections.update_one(
        {"id": inspection_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    updated = await db.scheduled_inspections.find_one(
        {"id": inspection_id}, {"_id": 0}
    )
    return updated


@router.put("/{inspection_id}/complete")
async def complete_inspection(inspection_id: str, data: dict = None):
    """Mark an inspection as completed and schedule next one"""
    db = get_db()
    
    inspection = await db.scheduled_inspections.find_one(
        {"id": inspection_id}, {"_id": 0}
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    completion_date = datetime.now().strftime("%Y-%m-%d")
    if data and data.get("completion_date"):
        completion_date = data.get("completion_date")
    
    # Update current inspection to completed
    await db.scheduled_inspections.update_one(
        {"id": inspection_id},
        {"$set": {
            "status": "completed",
            "last_inspection_date": completion_date,
            "completion_notes": data.get("notes", "") if data else "",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Calculate and create next inspection
    next_due = calculate_next_due_date(completion_date, inspection.get("frequency", "yearly"))
    
    next_inspection = {
        "id": str(uuid.uuid4()),
        "equipment_id": inspection.get("equipment_id"),
        "equipment_type": inspection.get("equipment_type"),
        "equipment_name": inspection.get("equipment_name"),
        "location": inspection.get("location"),
        "customer_id": inspection.get("customer_id"),
        "customer_name": inspection.get("customer_name"),
        "inspection_type": inspection.get("inspection_type"),
        "frequency": inspection.get("frequency"),
        "last_inspection_date": completion_date,
        "next_due_date": next_due,
        "assigned_to": inspection.get("assigned_to"),
        "status": "scheduled",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.scheduled_inspections.insert_one(next_inspection)
    next_inspection.pop("_id", None)
    
    return {
        "message": "Inspection completed and next inspection scheduled",
        "completed_inspection_id": inspection_id,
        "next_inspection": next_inspection
    }


@router.delete("/{inspection_id}")
async def delete_scheduled_inspection(inspection_id: str):
    """Delete a scheduled inspection"""
    db = get_db()
    
    result = await db.scheduled_inspections.delete_one({"id": inspection_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    return {"message": "Inspection deleted successfully"}
