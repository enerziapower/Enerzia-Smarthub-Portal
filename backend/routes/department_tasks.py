"""
Department Tasks routes module.
Handles Work Planner tasks for cross-department task management.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

import sys
sys.path.insert(0, '/app/backend')

from core.database import db
from core.security import require_auth
from core.websocket import manager

router = APIRouter(prefix="/department-tasks", tags=["Department Tasks"])


# ==================== MODELS ====================

class DepartmentTask(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    task_type: str = "General"
    created_by_department: str
    created_by_user: Optional[str] = None
    assigned_to_department: str
    assigned_to_person: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    action_taken: Optional[str] = None
    completed_by: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_name: Optional[str] = None
    # Pre-Project Task fields
    is_pre_project: bool = False
    customer_name: Optional[str] = None
    customer_site: Optional[str] = None
    customer_contact: Optional[str] = None
    linked_project_id: Optional[str] = None  # For linking to project once created
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[str] = None


class DepartmentTaskCreate(BaseModel):
    title: str
    description: str = ""
    task_type: str = "General"
    assigned_to_department: str
    assigned_to_person: Optional[str] = None
    assigned_to: Optional[str] = None  # Alternative field for person name
    due_date: Optional[str] = None
    scheduled_date: Optional[str] = None  # Alternative field for date
    priority: str = "Medium"
    location: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_name: Optional[str] = None
    department: Optional[str] = None  # For Work Planner compatibility
    # Pre-Project Task fields
    is_pre_project: bool = False
    customer_name: Optional[str] = None
    customer_site: Optional[str] = None
    customer_contact: Optional[str] = None


class DepartmentTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    assigned_to_department: Optional[str] = None
    assigned_to_person: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    action_taken: Optional[str] = None
    location: Optional[str] = None
    # Pre-Project Task fields
    is_pre_project: Optional[bool] = None
    customer_name: Optional[str] = None
    customer_site: Optional[str] = None
    customer_contact: Optional[str] = None
    linked_project_id: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

async def broadcast_update(entity_type: str, action: str, data: dict = None):
    """Broadcast data updates to all connected clients."""
    message = {
        "type": "data_update",
        "entity": entity_type,
        "action": action,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.broadcast(message)


# ==================== ROUTES ====================

@router.get("")
async def get_department_tasks(
    department: Optional[str] = None,
    created_by: Optional[str] = None,
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    scheduled_date: Optional[str] = None
):
    """Get all department tasks with optional filters."""
    query = {}
    
    # Support both field names for compatibility
    if department:
        query["$or"] = [
            {"department": department},
            {"assigned_to_department": department},
            {"created_by_department": department}
        ]
    if created_by:
        query["created_by_department"] = created_by
    if assigned_to:
        query["assigned_to_department"] = assigned_to
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if scheduled_date:
        query["scheduled_date"] = scheduled_date
    
    tasks = await db.department_tasks.find(query, {"_id": 0}).to_list(1000)
    tasks.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return tasks


@router.get("/stats/{department}")
async def get_department_task_stats(department: str):
    """Get task statistics for a specific department."""
    created_tasks = await db.department_tasks.find(
        {"created_by_department": department}, {"_id": 0}
    ).to_list(1000)
    
    assigned_tasks = await db.department_tasks.find(
        {"$or": [
            {"assigned_to_department": department},
            {"department": department}
        ]}, {"_id": 0}
    ).to_list(1000)
    
    assigned_pending = len([t for t in assigned_tasks if t.get("status") == "Pending"])
    assigned_in_progress = len([t for t in assigned_tasks if t.get("status") == "In Progress"])
    assigned_completed = len([t for t in assigned_tasks if t.get("status") == "Completed"])
    
    created_pending = len([t for t in created_tasks if t.get("status") == "Pending"])
    created_completed = len([t for t in created_tasks if t.get("status") == "Completed"])
    
    return {
        "created": {
            "total": len(created_tasks),
            "pending": created_pending,
            "completed": created_completed
        },
        "assigned": {
            "total": len(assigned_tasks),
            "pending": assigned_pending,
            "in_progress": assigned_in_progress,
            "completed": assigned_completed
        }
    }


@router.get("/{task_id}")
async def get_department_task(task_id: str):
    """Get a specific department task."""
    task = await db.department_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("")
async def create_department_task(
    task: DepartmentTaskCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new department task."""
    user_dept = current_user.get("department") or "PROJECTS"
    
    task_dict = task.model_dump()
    task_dict["id"] = str(uuid.uuid4())
    task_dict["created_by_department"] = task_dict.get("department") or user_dept
    task_dict["created_by_user"] = current_user.get("name", current_user.get("email"))
    task_dict["status"] = task_dict.get("status", "Pending")
    task_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle Work Planner compatibility fields
    if task_dict.get("assigned_to") and not task_dict.get("assigned_to_person"):
        task_dict["assigned_to_person"] = task_dict["assigned_to"]
    if task_dict.get("scheduled_date") and not task_dict.get("due_date"):
        task_dict["due_date"] = task_dict["scheduled_date"]
    
    await db.department_tasks.insert_one(task_dict)
    task_dict.pop("_id", None)
    
    await broadcast_update("department_task", "create", {
        "id": task_dict["id"],
        "assigned_to": task_dict.get("assigned_to_department")
    })
    
    return task_dict


@router.put("/{task_id}")
async def update_department_task(
    task_id: str,
    update_data: DepartmentTaskUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update a department task."""
    existing = await db.department_tasks.find_one({"id": task_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_dict.get("status") == "Completed" and existing.get("status") != "Completed":
        update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_dict["completed_by"] = current_user.get("name", current_user.get("email"))
    
    await db.department_tasks.update_one(
        {"id": task_id},
        {"$set": update_dict}
    )
    
    updated = await db.department_tasks.find_one({"id": task_id}, {"_id": 0})
    
    await broadcast_update("department_task", "update", {"id": task_id})
    
    return updated


@router.delete("/{task_id}")
async def delete_department_task(task_id: str, current_user: dict = Depends(require_auth)):
    """Delete a department task."""
    existing = await db.department_tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user_dept = current_user.get("department")
    user_role = current_user.get("role")
    
    if user_role != "super_admin" and user_dept != existing.get("created_by_department"):
        raise HTTPException(
            status_code=403, 
            detail="Only the creating department or super admin can delete this task"
        )
    
    result = await db.department_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await broadcast_update("department_task", "delete", {"id": task_id})
    
    return {"message": "Task deleted successfully"}
