"""
SOM (Stand-up Meeting) Tasks API Routes
Daily task management for all departments
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'enerzia_erp')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

router = APIRouter(prefix="/api/som-tasks", tags=["SOM Tasks"])


# ============== MODELS ==============

class SOMTaskCreate(BaseModel):
    """Create a new SOM task"""
    department: str  # purchase, sales, finance, projects, exports, accounts, hr, operations
    task: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    som_date: str  # The date this task appears on the SOM board
    status: str = "pending"  # pending, in_progress, completed


class SOMTaskUpdate(BaseModel):
    """Update a SOM task"""
    task: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


class SOMTask(BaseModel):
    """SOM task response model"""
    id: str
    department: str
    task: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    som_date: str
    status: str
    created_by: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

VALID_DEPARTMENTS = ['purchase', 'sales', 'finance', 'projects', 'exports', 'accounts', 'hr', 'operations']
VALID_STATUSES = ['pending', 'in_progress', 'completed']


def validate_department(department: str):
    if department not in VALID_DEPARTMENTS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid department. Must be one of: {', '.join(VALID_DEPARTMENTS)}"
        )


def validate_status(status: str):
    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )


# ============== API ROUTES ==============

@router.get("")
async def get_som_tasks(
    date: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    assignee: Optional[str] = None
):
    """
    Get SOM tasks with optional filters
    - date: Filter by SOM date (YYYY-MM-DD)
    - department: Filter by department
    - status: Filter by status
    - assignee: Filter by assignee
    """
    query = {}
    
    if date:
        query["som_date"] = date
    
    if department:
        validate_department(department)
        query["department"] = department
    
    if status:
        validate_status(status)
        query["status"] = status
    
    if assignee:
        query["assignee"] = {"$regex": assignee, "$options": "i"}
    
    tasks = await db.som_tasks.find(query, {"_id": 0}).to_list(1000)
    
    # Sort by department order, then by due_date
    dept_order = {d: i for i, d in enumerate(VALID_DEPARTMENTS)}
    tasks.sort(key=lambda x: (dept_order.get(x.get('department'), 99), x.get('due_date', '')))
    
    return tasks


@router.get("/{task_id}")
async def get_som_task(task_id: str):
    """Get a specific SOM task"""
    task = await db.som_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("")
async def create_som_task(task_data: SOMTaskCreate):
    """Create a new SOM task"""
    validate_department(task_data.department)
    validate_status(task_data.status)
    
    task = {
        "id": str(uuid.uuid4()),
        "department": task_data.department,
        "task": task_data.task,
        "assignee": task_data.assignee,
        "due_date": task_data.due_date,
        "som_date": task_data.som_date,
        "status": task_data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
    }
    
    await db.som_tasks.insert_one(task)
    task.pop("_id", None)
    
    return task


@router.put("/{task_id}")
async def update_som_task(task_id: str, update_data: SOMTaskUpdate):
    """Update a SOM task"""
    existing = await db.som_tasks.find_one({"id": task_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = {}
    
    if update_data.task is not None:
        update_dict["task"] = update_data.task
    
    if update_data.assignee is not None:
        update_dict["assignee"] = update_data.assignee
    
    if update_data.due_date is not None:
        update_dict["due_date"] = update_data.due_date
    
    if update_data.status is not None:
        validate_status(update_data.status)
        update_dict["status"] = update_data.status
        
        # Track completion time
        if update_data.status == "completed":
            update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.som_tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    updated = await db.som_tasks.find_one({"id": task_id}, {"_id": 0})
    return updated


@router.delete("/{task_id}")
async def delete_som_task(task_id: str):
    """Delete a SOM task"""
    result = await db.som_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@router.get("/stats/summary")
async def get_som_stats(date: Optional[str] = None):
    """Get SOM statistics for a date"""
    query = {}
    if date:
        query["som_date"] = date
    
    tasks = await db.som_tasks.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate stats by department
    dept_stats = {}
    for dept in VALID_DEPARTMENTS:
        dept_tasks = [t for t in tasks if t.get('department') == dept]
        completed = len([t for t in dept_tasks if t.get('status') == 'completed'])
        dept_stats[dept] = {
            "total": len(dept_tasks),
            "completed": completed,
            "pending": len(dept_tasks) - completed,
            "completion_rate": round((completed / len(dept_tasks) * 100) if dept_tasks else 0, 1)
        }
    
    # Overall stats
    total = len(tasks)
    completed = len([t for t in tasks if t.get('status') == 'completed'])
    
    return {
        "date": date or "all",
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": total - completed,
        "completion_rate": round((completed / total * 100) if total else 0, 1),
        "by_department": dept_stats
    }


@router.post("/bulk-create")
async def bulk_create_som_tasks(tasks: List[SOMTaskCreate]):
    """Create multiple SOM tasks at once"""
    created_tasks = []
    
    for task_data in tasks:
        validate_department(task_data.department)
        validate_status(task_data.status)
        
        task = {
            "id": str(uuid.uuid4()),
            "department": task_data.department,
            "task": task_data.task,
            "assignee": task_data.assignee,
            "due_date": task_data.due_date,
            "som_date": task_data.som_date,
            "status": task_data.status,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
        
        await db.som_tasks.insert_one(task)
        task.pop("_id", None)
        created_tasks.append(task)
    
    return {"created": len(created_tasks), "tasks": created_tasks}


@router.post("/copy-from-date")
async def copy_tasks_from_date(from_date: str, to_date: str, include_completed: bool = False):
    """Copy pending tasks from one date to another"""
    query = {"som_date": from_date}
    if not include_completed:
        query["status"] = {"$ne": "completed"}
    
    source_tasks = await db.som_tasks.find(query, {"_id": 0}).to_list(1000)
    
    copied_tasks = []
    for task in source_tasks:
        new_task = {
            "id": str(uuid.uuid4()),
            "department": task["department"],
            "task": task["task"],
            "assignee": task.get("assignee"),
            "due_date": task.get("due_date"),
            "som_date": to_date,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "copied_from": task["id"]
        }
        await db.som_tasks.insert_one(new_task)
        new_task.pop("_id", None)
        copied_tasks.append(new_task)
    
    return {"copied": len(copied_tasks), "tasks": copied_tasks}
