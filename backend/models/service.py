from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class ServiceRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    srn_no: str
    customer_name: str
    location: str
    date: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    service_type: str = "Inspection"
    equipment_type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    rating: Optional[str] = None
    problem_reported: Optional[str] = None
    work_done: Optional[str] = None
    remarks: Optional[str] = None
    status: str = "Open"
    engineer_name: Optional[str] = None
    engineer_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    equipment_details: Optional[List[dict]] = []
    test_measurements: Optional[List[dict]] = []
    test_results: Optional[str] = None
    recommendations: Optional[str] = None
    next_service_date: Optional[str] = None
    spare_parts_used: Optional[List[dict]] = []
    labour_hours: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceRequestCreate(BaseModel):
    srn_no: str
    customer_name: str
    location: str
    date: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    service_type: str = "Inspection"
    equipment_type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    rating: Optional[str] = None
    problem_reported: Optional[str] = None
    work_done: Optional[str] = None
    remarks: Optional[str] = None
    status: str = "Open"
    engineer_name: Optional[str] = None
    engineer_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    equipment_details: Optional[List[dict]] = []
    test_measurements: Optional[List[dict]] = []
    test_results: Optional[str] = None
    recommendations: Optional[str] = None
    next_service_date: Optional[str] = None
    spare_parts_used: Optional[List[dict]] = []
    labour_hours: Optional[float] = None
