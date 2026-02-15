from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class FSREquipment(BaseModel):
    sr_no: int = 1
    description: str = ""
    make: str = ""
    sl_no: str = ""
    rating: str = ""
    year_of_mfg: str = ""

class FSRTestMeasurement(BaseModel):
    parameter: str = ""
    unit: str = ""
    measured_value: str = ""
    standard_value: str = ""
    status: str = ""

class FieldServiceReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fsr_no: str
    project_id: Optional[str] = None
    pid_no: Optional[str] = None
    project_name: Optional[str] = None
    date: str
    customer_name: str
    location: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    service_type: str = "Inspection"
    equipment_details: List[FSREquipment] = []
    test_measurements: List[FSRTestMeasurement] = []
    problem_reported: Optional[str] = None
    work_done: Optional[str] = None
    spare_parts: Optional[str] = None
    recommendations: Optional[str] = None
    remarks: Optional[str] = None
    next_service_date: Optional[str] = None
    service_engineer: str
    engineer_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    status: str = "Draft"
    pdf_path: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FieldServiceReportCreate(BaseModel):
    project_id: Optional[str] = None
    date: str
    customer_name: str
    location: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    service_type: str = "Inspection"
    equipment_details: List[FSREquipment] = []
    test_measurements: List[FSRTestMeasurement] = []
    problem_reported: Optional[str] = None
    work_done: Optional[str] = None
    spare_parts: Optional[str] = None
    recommendations: Optional[str] = None
    remarks: Optional[str] = None
    next_service_date: Optional[str] = None
    service_engineer: str
    engineer_signature: Optional[str] = None
    customer_signature: Optional[str] = None

class FieldServiceReportUpdate(BaseModel):
    date: Optional[str] = None
    customer_name: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    service_type: Optional[str] = None
    equipment_details: Optional[List[FSREquipment]] = None
    test_measurements: Optional[List[FSRTestMeasurement]] = None
    problem_reported: Optional[str] = None
    work_done: Optional[str] = None
    spare_parts: Optional[str] = None
    recommendations: Optional[str] = None
    remarks: Optional[str] = None
    next_service_date: Optional[str] = None
    service_engineer: Optional[str] = None
    engineer_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    status: Optional[str] = None
