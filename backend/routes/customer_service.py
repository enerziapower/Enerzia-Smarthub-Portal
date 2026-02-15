"""
Customer Service routes - Extracted from server.py
Handles service requests CRUD and PDF generation
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/customer-service", tags=["Customer-Service"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia')]


# ==================== MODELS ====================

class ServiceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    srn_no: str  # Service Request Number
    customer_id: Optional[str] = None
    customer_name: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    site_location: Optional[str] = None
    po_ref: Optional[str] = None  # P.O. Reference
    call_raised_by: Optional[str] = None
    call_raised_datetime: Optional[str] = None
    # Equipment Details - Multiple Equipment Support
    equipment_list: Optional[list] = None
    # Legacy single equipment fields (for backward compatibility)
    equipment_name: Optional[str] = None
    equipment_make: Optional[str] = None  # Now used as equipment_location
    equipment_model: Optional[str] = None  # Now used as make_model
    equipment_serial: Optional[str] = None
    # Request Details
    request_type: str = "Maintenance"
    service_category: str = "Electrical"
    subject: str
    description: Optional[str] = None
    reported_date: str
    assigned_to: Optional[str] = None
    technician_email: Optional[str] = None
    technician_phone: Optional[str] = None
    service_date: Optional[str] = None
    completion_date: Optional[str] = None
    # Test Instruments Used
    test_instruments: Optional[list] = None
    # Test Measurements (category-specific)
    test_measurements: Optional[dict] = None
    # Spares Used
    spares_used: bool = False
    spares_list: Optional[list] = None
    # Service Report
    work_performed: Optional[str] = None
    observations: Optional[str] = None
    recommendations: Optional[str] = None
    customer_feedback: Optional[str] = None
    # Signatures (base64 encoded)
    technician_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    # Photos
    problem_photos: Optional[list] = []
    rectified_photos: Optional[list] = []
    status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceRequestCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    site_location: Optional[str] = None
    po_ref: Optional[str] = None
    call_raised_by: Optional[str] = None
    call_raised_datetime: Optional[str] = None
    equipment_list: Optional[list] = None
    equipment_name: Optional[str] = None
    equipment_make: Optional[str] = None
    equipment_model: Optional[str] = None
    equipment_serial: Optional[str] = None
    request_type: str = "Maintenance"
    service_category: str = "Electrical"
    subject: str
    description: Optional[str] = None
    reported_date: Optional[str] = None
    assigned_to: Optional[str] = None
    technician_email: Optional[str] = None
    technician_phone: Optional[str] = None
    service_date: Optional[str] = None
    completion_date: Optional[str] = None
    test_instruments: Optional[list] = None
    test_measurements: Optional[dict] = None
    spares_used: bool = False
    spares_list: Optional[list] = None
    work_performed: Optional[str] = None
    observations: Optional[str] = None
    recommendations: Optional[str] = None
    customer_feedback: Optional[str] = None
    technician_signature: Optional[str] = None
    customer_signature: Optional[str] = None
    problem_photos: Optional[list] = []
    rectified_photos: Optional[list] = []
    status: str = "Pending"


# ==================== ROUTES ====================

@router.get("/next-srn")
async def get_next_srn():
    """Generate next Service Request Number"""
    year = datetime.now().year
    
    # Count existing requests for this calendar year
    count = await db.service_requests.count_documents({
        "srn_no": {"$regex": f"^SRN/{year}/"}
    })
    
    next_num = count + 1
    srn_no = f"SRN/{year}/{next_num:03d}"
    
    return {"srn_no": srn_no}


@router.get("")
async def get_service_requests(status: Optional[str] = None, request_type: Optional[str] = None):
    """Get all service requests"""
    query = {}
    if status:
        query['status'] = status
    if request_type:
        query['request_type'] = request_type
    
    requests = await db.service_requests.find(query, {"_id": 0}).to_list(1000)
    requests.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return requests


@router.get("/{request_id}")
async def get_service_request(request_id: str):
    """Get a specific service request"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    return request


@router.post("")
async def create_service_request(data: ServiceRequestCreate):
    """Create a new service request"""
    # Generate SRN - Format: SRN/YEAR/### (resets each year)
    year = datetime.now().year
    
    count = await db.service_requests.count_documents({
        "srn_no": {"$regex": f"^SRN/{year}/"}
    })
    srn_no = f"SRN/{year}/{count + 1:03d}"
    
    # Set default reported date if not provided
    reported_date = data.reported_date or datetime.now().strftime("%d/%m/%Y")
    
    request = ServiceRequest(
        srn_no=srn_no,
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        contact_person=data.contact_person,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        site_location=data.site_location,
        po_ref=data.po_ref,
        call_raised_by=data.call_raised_by,
        call_raised_datetime=data.call_raised_datetime,
        equipment_list=data.equipment_list,
        equipment_name=data.equipment_name,
        equipment_make=data.equipment_make,
        equipment_model=data.equipment_model,
        equipment_serial=data.equipment_serial,
        request_type=data.request_type,
        service_category=data.service_category,
        subject=data.subject,
        description=data.description,
        reported_date=reported_date,
        assigned_to=data.assigned_to,
        technician_email=data.technician_email,
        technician_phone=data.technician_phone,
        service_date=data.service_date,
        completion_date=data.completion_date,
        test_instruments=data.test_instruments,
        test_measurements=data.test_measurements,
        spares_used=data.spares_used,
        spares_list=data.spares_list,
        work_performed=data.work_performed,
        observations=data.observations,
        recommendations=data.recommendations,
        customer_feedback=data.customer_feedback,
        technician_signature=data.technician_signature,
        customer_signature=data.customer_signature,
        problem_photos=data.problem_photos,
        rectified_photos=data.rectified_photos,
        status=data.status
    )
    
    doc = request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.service_requests.insert_one(doc)
    doc.pop('_id', None)
    
    return {"message": "Service request created successfully", "request": doc}


@router.put("/{request_id}")
async def update_service_request(request_id: str, data: dict):
    """Update a service request"""
    request = await db.service_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    allowed_fields = {
        "customer_id", "customer_name", "contact_person", "contact_phone", "contact_email",
        "site_location", "po_ref", "call_raised_by", "call_raised_datetime",
        "equipment_list", "equipment_name", "equipment_make", "equipment_model", "equipment_serial",
        "request_type", "service_category", "subject", "description",
        "reported_date", "assigned_to", "technician_email", "technician_phone",
        "service_date", "completion_date", "test_instruments", "test_measurements",
        "spares_used", "spares_list", "work_performed", "observations", "recommendations",
        "customer_feedback", "technician_signature", "customer_signature", 
        "problem_photos", "rectified_photos", "status"
    }
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Set completion date if status is changed to Completed
    if update_data.get('status') == 'Completed' and not update_data.get('completion_date'):
        update_data['completion_date'] = datetime.now().strftime("%d/%m/%Y")
    
    if update_data:
        await db.service_requests.update_one(
            {"id": request_id},
            {"$set": update_data}
        )
    
    updated = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    return updated


@router.delete("/{request_id}")
async def delete_service_request(request_id: str):
    """Delete a service request"""
    result = await db.service_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")
    return {"message": "Service request deleted successfully"}


@router.get("/{request_id}/pdf")
async def generate_service_report_pdf(request_id: str):
    """Generate Field Service Report PDF using new template style"""
    from routes.service_pdf import generate_service_pdf_buffer
    
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    
    # Generate PDF buffer using new template
    buffer = generate_service_pdf_buffer(request, org_settings or {})
    
    # Return as streaming response
    srn_no = request.get('srn_no', 'report')
    filename = f"FSR_{srn_no.replace('/', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
