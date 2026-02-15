"""
Project models - Aligned with actual server.py usage
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone
import uuid


class ProjectStatus(str, Enum):
    NEED_TO_START = "Need to Start"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    INVOICED = "Invoiced"
    PARTIALLY_INVOICED = "Partially Invoiced"
    CANCELLED = "Cancelled"


class ProjectCategory(str, Enum):
    PSS = "PSS"
    AS = "AS"
    OSS = "OSS"
    CS = "CS"
    MHS = "MHS"
    EXS = "EXS"


class ActionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    assigned_to: str
    due_date: Optional[str] = None  # DD/MM/YYYY format
    status: str = "Pending"  # Pending, Completed


class WorkItem(BaseModel):
    id: str = Field(default_factory=lambda: f"WI-{int(datetime.now().timestamp())}")
    description: str
    quantity: float = 0
    unit: str = "Nos"
    status: str = "Pending"
    assigned_to: Optional[str] = None


class ScheduledTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    assigned_to: Optional[str] = None
    site_location: Optional[str] = None
    scheduled_date: str
    priority: str = "Medium"
    status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pid_no: str
    category: str  # String to support custom categories
    department: Optional[str] = None  # Department code for access control
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path/URL for PO attachment
    client: str
    location: str
    project_name: str
    vendor: str
    status: str  # String to support custom statuses
    engineer_in_charge: str
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items with qty, unit, status
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks for Planning & Execution
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0  # Renamed from profit_loss
    weekly_actions: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    pid_no: str
    category: str  # String to support custom categories
    department: Optional[str] = None  # Department code for access control
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path for PO attachment
    client: str
    location: str
    project_name: str
    vendor: str
    status: str  # String to support custom statuses
    engineer_in_charge: str
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0  # Renamed from profit_loss
    weekly_actions: Optional[str] = None


class ProjectUpdate(BaseModel):
    category: Optional[str] = None  # String to support custom categories
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path for PO attachment
    client: Optional[str] = None
    location: Optional[str] = None
    project_name: Optional[str] = None
    vendor: Optional[str] = None
    status: Optional[str] = None  # String to support custom statuses
    engineer_in_charge: Optional[str] = None
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks
    po_amount: Optional[float] = None
    balance: Optional[float] = None
    invoiced_amount: Optional[float] = None
    completion_percentage: Optional[float] = None
    this_week_billing: Optional[float] = None
    budget: Optional[float] = None
    actual_expenses: Optional[float] = None
    pid_savings: Optional[float] = None  # Renamed from profit_loss
    weekly_actions: Optional[str] = None


class DashboardStats(BaseModel):
    total_projects: int
    total_billing: float
    pending_pos: int
    active_projects: int
    this_week_billing: float
    completion_avg: float
    category_breakdown: dict
    status_breakdown: dict


class WeeklyBilling(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    week: str
    pss: float
    as_: float = Field(alias="as")
    oss: float
    cs: float
    total: float
