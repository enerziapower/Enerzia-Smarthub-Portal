from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class DepartmentTeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentTeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool = True

class DepartmentTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    team_member: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "Pending"
    task_type: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    team_member: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "Pending"
    task_type: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None

class DepartmentTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    team_member: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    task_type: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
