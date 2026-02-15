"""
Project Schedules API Routes
CRUD operations for project schedules stored in MongoDB
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia')]


# ==================== MODELS ====================

class SubItem(BaseModel):
    description: str = ""
    qty: str = ""
    unit: str = ""
    start_date: str = ""
    end_date: str = ""


class Phase(BaseModel):
    name: str
    start: str = ""
    end: str = ""
    progress: int = 0
    color: str = "bg-blue-500"
    subItems: List[SubItem] = []


class CustomerInfo(BaseModel):
    name: str = ""
    company: str = ""
    location: str = ""
    contact_person: str = ""
    phone: str = ""
    email: str = ""


class ProjectScheduleCreate(BaseModel):
    project_id: str
    schedule_name: str
    start_date: str
    end_date: str
    customer_info: Optional[CustomerInfo] = CustomerInfo()
    phases: List[Phase] = []
    milestones: List[dict] = []
    notes: str = ""
    status: str = "draft"


class ProjectScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    customer_info: Optional[CustomerInfo] = None
    phases: Optional[List[Phase]] = None
    milestones: Optional[List[dict]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


# ==================== API ROUTES ====================

@router.get("")
async def get_all_schedules():
    """Get all project schedules"""
    schedules = await db.project_schedules.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return schedules


@router.get("/stats")
async def get_schedule_stats():
    """Get statistics for project schedules"""
    total = await db.project_schedules.count_documents({})
    draft = await db.project_schedules.count_documents({"status": "draft"})
    in_progress = await db.project_schedules.count_documents({"status": "in_progress"})
    completed = await db.project_schedules.count_documents({"status": "completed"})
    
    return {
        "total": total,
        "draft": draft,
        "in_progress": in_progress,
        "completed": completed
    }


@router.get("/{schedule_id}")
async def get_schedule(schedule_id: str):
    """Get a specific project schedule"""
    schedule = await db.project_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.post("")
async def create_schedule(schedule: ProjectScheduleCreate):
    """Create a new project schedule"""
    schedule_dict = schedule.model_dump()
    schedule_dict["id"] = str(uuid.uuid4())
    schedule_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    schedule_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert phases to dict format for MongoDB
    if schedule_dict.get("phases"):
        schedule_dict["phases"] = [
            phase if isinstance(phase, dict) else phase
            for phase in schedule_dict["phases"]
        ]
    
    await db.project_schedules.insert_one(schedule_dict)
    
    # Return without _id
    schedule_dict.pop("_id", None)
    return schedule_dict


@router.put("/{schedule_id}")
async def update_schedule(schedule_id: str, update: ProjectScheduleUpdate):
    """Update a project schedule"""
    existing = await db.project_schedules.find_one({"id": schedule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.project_schedules.update_one(
        {"id": schedule_id},
        {"$set": update_data}
    )
    
    updated = await db.project_schedules.find_one({"id": schedule_id}, {"_id": 0})
    return updated


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete a project schedule"""
    result = await db.project_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}


@router.post("/migrate-from-localstorage")
async def migrate_from_localstorage(schedules: List[dict]):
    """Migrate schedules from localStorage to MongoDB"""
    if not schedules:
        return {"message": "No schedules to migrate", "migrated": 0}
    
    migrated = 0
    for schedule in schedules:
        # Check if already exists
        existing = await db.project_schedules.find_one({"id": schedule.get("id")})
        if not existing:
            schedule["created_at"] = schedule.get("created_at", datetime.now(timezone.utc).isoformat())
            schedule["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.project_schedules.insert_one(schedule)
            migrated += 1
    
    return {"message": f"Migrated {migrated} schedules", "migrated": migrated}
