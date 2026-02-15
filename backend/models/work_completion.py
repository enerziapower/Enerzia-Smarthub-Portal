from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class AnnexureItem(BaseModel):
    sl_no: int
    description: str
    unit: str = "Nos"
    quantity: float
    remarks: Optional[str] = None

class WorkCompletionCertificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    certificate_no: str
    project_id: str
    pid_no: str
    project_name: str
    client: str
    location: str
    vendor: str
    engineer_in_charge: str
    po_number: Optional[str] = None
    po_date: Optional[str] = None
    po_amount: float = 0
    work_order_scope: Optional[str] = None
    completion_date: str
    annexure_items: List[AnnexureItem] = []
    summary_of_work: Optional[str] = None
    remarks: Optional[str] = None
    customer_signature: Optional[str] = None
    customer_name: Optional[str] = None
    customer_designation: Optional[str] = None
    customer_date: Optional[str] = None
    contractor_signature: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_designation: Optional[str] = None
    contractor_date: Optional[str] = None
    status: str = "Draft"
    pdf_path: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkCompletionCreate(BaseModel):
    project_id: str
    completion_date: str
    work_order_scope: Optional[str] = None
    annexure_items: List[AnnexureItem] = []
    summary_of_work: Optional[str] = None
    remarks: Optional[str] = None
    customer_signature: Optional[str] = None
    customer_name: Optional[str] = None
    customer_designation: Optional[str] = None
    customer_date: Optional[str] = None
    contractor_signature: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_designation: Optional[str] = None
    contractor_date: Optional[str] = None
