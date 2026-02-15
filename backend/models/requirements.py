from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime, timezone
import uuid

class RequirementType(str, Enum):
    MATERIAL_PURCHASE = "Material Purchase"
    DELIVERY = "Delivery"
    VENDOR_PO = "Vendor P.O."
    MANPOWER = "Manpower Arrangements"
    PAYMENT_REQUEST = "Payment Request"
    DOCUMENTATION = "Documentation"
    INSPECTION = "Inspection"
    OTHER = "Other"

class RequirementStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"
    REJECTED = "Rejected"

class RequirementPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

class ProjectRequirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    requirement_type: str
    description: str
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    due_date: Optional[str] = None
    notes: Optional[str] = None
    response: Optional[str] = None
    replies: Optional[List[dict]] = []
    created_by: Optional[str] = None
    created_by_department: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectRequirementCreate(BaseModel):
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    requirement_type: str
    description: str
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    priority: str = "Medium"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ProjectRequirementUpdate(BaseModel):
    requirement_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_department: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    response: Optional[str] = None
