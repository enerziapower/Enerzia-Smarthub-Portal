"""
Projects routes - Migrated from server.py
Uses absolute imports for compatibility
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
import uuid
import pandas as pd
import io

# Absolute imports from core modules
from core.database import db
from core.security import get_current_user, require_auth
from core.websocket import broadcast_update
from core.utils import can_access_department, get_user_departments
from core.config import settings


# ==================== MODELS (inline for self-containment) ====================

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pid_no: str
    category: str
    department: Optional[str] = None
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None
    client: str
    location: str
    project_name: str
    vendor: str
    status: str
    engineer_in_charge: str
    project_date: Optional[str] = None
    completion_date: Optional[str] = None
    action_items: Optional[List[dict]] = None
    work_items: Optional[List[dict]] = None
    scheduled_tasks: Optional[List[dict]] = None
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0
    weekly_actions: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    pid_no: str
    category: str
    department: Optional[str] = None
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None
    client: str
    location: str
    project_name: str
    vendor: str
    status: str
    engineer_in_charge: str
    project_date: Optional[str] = None
    completion_date: Optional[str] = None
    action_items: Optional[List[dict]] = None
    work_items: Optional[List[dict]] = None
    scheduled_tasks: Optional[List[dict]] = None
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0
    weekly_actions: Optional[str] = None


class ProjectUpdate(BaseModel):
    category: Optional[str] = None
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    project_name: Optional[str] = None
    vendor: Optional[str] = None
    status: Optional[str] = None
    engineer_in_charge: Optional[str] = None
    project_date: Optional[str] = None
    completion_date: Optional[str] = None
    action_items: Optional[List[dict]] = None
    work_items: Optional[List[dict]] = None
    scheduled_tasks: Optional[List[dict]] = None
    po_amount: Optional[float] = None
    balance: Optional[float] = None
    invoiced_amount: Optional[float] = None
    completion_percentage: Optional[float] = None
    this_week_billing: Optional[float] = None
    budget: Optional[float] = None
    actual_expenses: Optional[float] = None
    pid_savings: Optional[float] = None
    weekly_actions: Optional[str] = None


router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/remove-duplicates")
async def remove_duplicate_projects():
    """Remove duplicate PIDs, keeping only the first occurrence"""
    all_projects = await db.projects.find({}, {"_id": 1, "pid_no": 1, "created_at": 1}).to_list(10000)
    
    pid_groups = {}
    for project in all_projects:
        pid = project.get('pid_no')
        if pid not in pid_groups:
            pid_groups[pid] = []
        pid_groups[pid].append(project)
    
    removed_count = 0
    for pid, projects in pid_groups.items():
        if len(projects) > 1:
            projects_sorted = sorted(projects, key=lambda x: x.get('created_at', ''))
            for project in projects_sorted[1:]:
                await db.projects.delete_one({"_id": project['_id']})
                removed_count += 1
    
    return {"message": f"Removed {removed_count} duplicate projects", "removed": removed_count}


@router.get("/next-pid")
async def get_next_pid(financial_year: Optional[str] = None):
    """Generate next consecutive PID number for the current/specified financial year"""
    
    if not financial_year:
        current_date = datetime.now()
        if current_date.month >= 4:
            year1 = current_date.year % 100
            year2 = (current_date.year + 1) % 100
        else:
            year1 = (current_date.year - 1) % 100
            year2 = current_date.year % 100
        financial_year = f"{year1:02d}-{year2:02d}"
    
    pattern = f"^PID/{financial_year}/"
    projects_this_year = await db.projects.find(
        {"pid_no": {"$regex": pattern}},
        {"pid_no": 1, "_id": 0}
    ).to_list(10000)
    
    if not projects_this_year:
        return {"next_pid": f"PID/{financial_year}/001", "financial_year": financial_year}
    
    max_num = 0
    for project in projects_this_year:
        try:
            pid = project.get("pid_no", "")
            parts = pid.split("/")
            if len(parts) == 3 and parts[1] == financial_year:
                num = int(parts[2])
                if num > max_num:
                    max_num = num
        except (ValueError, IndexError, TypeError):
            continue
    
    next_num = max_num + 1
    return {"next_pid": f"PID/{financial_year}/{next_num:03d}", "financial_year": financial_year}


@router.post("", response_model=Project)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    existing = await db.projects.find_one({"pid_no": project.pid_no}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with PID {project.pid_no} already exists. Please use a different PID."
        )
    
    project_dict = project.model_dump()
    project_dict['pid_savings'] = project_dict.get('budget', 0) - project_dict.get('actual_expenses', 0)
    project_dict['balance'] = project_dict.get('po_amount', 0) - project_dict.get('invoiced_amount', 0)
    
    project_obj = Project(**project_dict)
    
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.projects.insert_one(doc)
    await broadcast_update("project", "create", {"id": project_obj.id, "pid_no": project_obj.pid_no})
    
    return project_obj


@router.get("", response_model=List[Project])
async def get_projects(
    status: Optional[str] = None, 
    category: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all projects with optional filters"""
    query = {}
    if status:
        query['status'] = status
    if category:
        query['category'] = category
    
    if current_user:
        accessible_depts = get_user_departments(current_user)
        if current_user.get("role") != "super_admin":
            if accessible_depts:
                query['department'] = {"$in": accessible_depts + [None, ""]}
    
    if department:
        query['department'] = department
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        project['balance'] = project.get('po_amount', 0) - project.get('invoiced_amount', 0)
    
    return projects


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single project by ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user and current_user.get("role") != "super_admin":
        project_dept = project.get("department")
        if project_dept and not can_access_department(current_user, project_dept):
            raise HTTPException(status_code=403, detail="Access denied to this project")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, update_data: ProjectUpdate):
    """Update an existing project"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    if update_dict.get('status') == 'Completed':
        update_dict['completion_percentage'] = 100
    
    if 'budget' in update_dict or 'actual_expenses' in update_dict:
        existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Project not found")
        budget = update_dict.get('budget', existing.get('budget', 0))
        expenses = update_dict.get('actual_expenses', existing.get('actual_expenses', 0))
        update_dict['pid_savings'] = budget - expenses
    
    if 'po_amount' in update_dict or 'invoiced_amount' in update_dict:
        existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if existing:
            po_amount = update_dict.get('po_amount', existing.get('po_amount', 0))
            invoiced_amount = update_dict.get('invoiced_amount', existing.get('invoiced_amount', 0))
            update_dict['balance'] = po_amount - invoiced_amount
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.update_one({"id": project_id}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated_project.get('created_at'), str):
        updated_project['created_at'] = datetime.fromisoformat(updated_project['created_at'])
    if isinstance(updated_project.get('updated_at'), str):
        updated_project['updated_at'] = datetime.fromisoformat(updated_project['updated_at'])
    
    await broadcast_update("project", "update", {"id": project_id})
    
    return updated_project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await broadcast_update("project", "delete", {"id": project_id})
    
    return {"message": "Project deleted successfully"}


@router.get("/export/excel")
async def export_projects_excel():
    """Export all projects to Excel with styling"""
    from openpyxl.styles import Font, Alignment, PatternFill
    
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found to export")
    
    df = pd.DataFrame(projects)
    
    column_order = [
        'pid_no', 'category', 'po_number', 'client', 'location', 'project_name',
        'vendor', 'status', 'engineer_in_charge', 'po_amount', 'balance',
        'invoiced_amount', 'completion_percentage', 'this_week_billing',
        'budget', 'actual_expenses', 'pid_savings', 'weekly_actions'
    ]
    
    available_cols = [col for col in column_order if col in df.columns]
    df = df[available_cols]
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Projects', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['Projects']
        
        for cell in worksheet[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except (TypeError, AttributeError):
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=projects_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )
