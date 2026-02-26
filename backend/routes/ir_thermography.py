"""
IR Thermography Report Routes
Handles Pre-Thermography and Post-Thermography inspection reports
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from typing import List, Optional, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import os
import base64
from io import BytesIO

router = APIRouter()

# Updated Risk Classification based on Delta T
NETA_RISK_CATEGORIES = {
    "Critical": {"min_delta": 15, "priority": 1, "action": "Major discrepancy; repair immediately"},
    "Warning": {"min_delta": 4, "priority": 2, "action": "Indicates probable deficiency; repair as time permits"},
    "Check & Monitor": {"min_delta": 1, "priority": 3, "action": "Possible deficiency; warrants investigation"},
    "Normal": {"min_delta": 0, "priority": 4, "action": "No action required"}
}


def calculate_risk_category(delta_t: float) -> dict:
    """Calculate risk category based on Delta T using updated standards
    - ΔT ≤ 1°C → Normal
    - ΔT > 1°C and < 4°C → Check & Monitor  
    - ΔT ≥ 4°C and < 15°C → Warning
    - ΔT ≥ 15°C → Critical
    """
    if delta_t >= 15:
        return {"category": "Critical", "color": "#dc2626", "action": "Major discrepancy; repair immediately", "priority": 1}
    elif delta_t >= 4:
        return {"category": "Warning", "color": "#f59e0b", "action": "Indicates probable deficiency; repair as time permits", "priority": 2}
    elif delta_t > 1:
        return {"category": "Check & Monitor", "color": "#3b82f6", "action": "Possible deficiency; warrants investigation", "priority": 3}
    else:
        return {"category": "Normal", "color": "#22c55e", "action": "No action required", "priority": 4}


# Pydantic Models
class InspectionItem(BaseModel):
    item_id: str = ""
    location: str = ""
    panel: str = ""
    feeder: str = ""
    original_image: Optional[str] = None  # Base64 or URL
    thermal_image: Optional[str] = None   # Base64 or URL
    max_temperature: Optional[float] = None  # Ar1
    min_temperature: Optional[float] = None  # Ar2
    ambient_temperature: Optional[float] = None
    delta_t: Optional[float] = None  # Auto-calculated
    risk_category: Optional[str] = None  # Auto-calculated
    risk_color: Optional[str] = None
    recommended_action: Optional[str] = None
    analyzed_by: Optional[str] = None
    comments: Optional[str] = None
    
    @field_validator('max_temperature', 'min_temperature', 'ambient_temperature', 'delta_t', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v == 'null' or v == 'undefined':
            return None
        return v


class DocumentDetails(BaseModel):
    revision_no: str = "00"
    submission_date: Optional[str] = None
    comments: Optional[str] = None
    client: str = ""
    location: str = ""
    work_order_number: Optional[str] = None
    work_order_date: Optional[str] = None
    work_done: Optional[str] = None
    date_of_ir_study: Optional[str] = None
    coordinating_person: Optional[str] = None
    thermography_inspection_by: Optional[str] = None
    load_condition: Optional[str] = None
    report_prepared_by: Optional[str] = None
    report_reviewed_by: Optional[str] = None
    date_of_submission: Optional[str] = None


class IRThermographyCreate(BaseModel):
    report_type: str  # pre-thermography or post-thermography
    project_id: Optional[str] = None
    document_details: DocumentDetails
    inspection_items: List[InspectionItem] = []
    calibration_certificate: Optional[str] = None  # Base64 PDF or URL
    status: str = "draft"


class IRThermographyUpdate(BaseModel):
    report_type: Optional[str] = None
    project_id: Optional[str] = None
    document_details: Optional[DocumentDetails] = None
    inspection_items: Optional[List[InspectionItem]] = None
    calibration_certificate: Optional[str] = None
    status: Optional[str] = None


def get_db():
    from server import db
    return db


def calculate_summary(inspection_items: list) -> dict:
    """Calculate executive summary statistics"""
    total_items = len(inspection_items)
    total_images = sum(1 for item in inspection_items if item.get('thermal_image'))
    
    risk_counts = {
        "critical": 0,
        "warning": 0,
        "check_monitor": 0,
        "normal": 0
    }
    
    for item in inspection_items:
        category = item.get('risk_category', 'Normal')
        # Normalize category name for counting
        cat_lower = category.lower().replace(' & ', '_').replace(' ', '_') if category else 'normal'
        if cat_lower in risk_counts:
            risk_counts[cat_lower] += 1
        elif 'critical' in cat_lower:
            risk_counts['critical'] += 1
        elif 'warning' in cat_lower:
            risk_counts['warning'] += 1
        elif 'check' in cat_lower or 'monitor' in cat_lower:
            risk_counts['check_monitor'] += 1
        else:
            risk_counts['normal'] += 1
    
    return {
        "total_items": total_items,
        "total_feeders": total_items,  # For backward compatibility
        "total_images": total_images,
        "critical": risk_counts['critical'],
        "warning": risk_counts['warning'],
        "check_monitor": risk_counts['check_monitor'],
        "normal": risk_counts['normal'],
        "risk_distribution": risk_counts
    }


@router.get("")
async def get_ir_thermography_reports(
    report_type: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all IR Thermography reports with optional filters"""
    db = get_db()
    
    query = {"report_category": "ir-thermography"}
    if report_type:
        query["report_type"] = report_type
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    reports = await db.test_reports.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with project details
    for report in reports:
        if report.get("project_id"):
            project = await db.projects.find_one(
                {"id": report["project_id"]},
                {"_id": 0, "project_name": 1, "client": 1}
            )
            if project:
                report["project_name"] = project.get("project_name")
                report["customer_name"] = project.get("client")
    
    total = await db.test_reports.count_documents(query)
    
    return {
        "reports": reports,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/next-report-no")
async def get_next_ir_report_no(report_type: str = "pre-thermography"):
    """Get next report number for IR Thermography"""
    db = get_db()
    
    prefix = "PRE-TIR" if report_type == "pre-thermography" else "POST-TIR"
    year = datetime.now().year
    
    # Count existing reports of this type
    count = await db.test_reports.count_documents({
        "report_category": "ir-thermography",
        "report_type": report_type
    })
    
    return {"report_no": f"{prefix}/{year}/{count + 1:04d}"}


@router.get("/{report_id}")
async def get_ir_thermography_report(report_id: str):
    """Get a single IR Thermography report by ID"""
    db = get_db()
    
    # First try test_reports collection
    report = await db.test_reports.find_one(
        {"id": report_id, "report_category": "ir-thermography"},
        {"_id": 0}
    )
    
    # If not found, try ir_thermography_reports collection
    if not report:
        report = await db.ir_thermography_reports.find_one(
            {"id": report_id},
            {"_id": 0}
        )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Enrich with project details
    if report.get("project_id"):
        project = await db.projects.find_one(
            {"id": report["project_id"]},
            {"_id": 0}
        )
        if project:
            report["project"] = project
    
    # Calculate summary
    report["summary"] = calculate_summary(report.get("inspection_items", []))
    
    return report


@router.post("")
async def create_ir_thermography_report(report_data: IRThermographyCreate):
    """Create a new IR Thermography report"""
    db = get_db()
    
    # Generate report ID and number
    report_id = str(uuid.uuid4())
    prefix = "PRE-TIR" if report_data.report_type == "pre-thermography" else "POST-TIR"
    year = datetime.now().year
    count = await db.test_reports.count_documents({
        "report_category": "ir-thermography",
        "report_type": report_data.report_type
    })
    report_no = f"{prefix}/{year}/{count + 1:04d}"
    
    # Process inspection items - auto-calculate risk categories
    processed_items = []
    for item in report_data.inspection_items:
        item_dict = item.model_dump() if hasattr(item, 'model_dump') else item.dict()
        
        # Generate item ID if not provided
        if not item_dict.get('item_id'):
            item_dict['item_id'] = f"item_{uuid.uuid4().hex[:8]}"
        
        # Calculate Delta T and Risk Category
        max_temp = item_dict.get('max_temperature')
        min_temp = item_dict.get('min_temperature')
        
        if max_temp is not None and min_temp is not None:
            delta_t = max_temp - min_temp
            item_dict['delta_t'] = round(delta_t, 1)
            
            risk_info = calculate_risk_category(delta_t)
            item_dict['risk_category'] = risk_info['category']
            item_dict['risk_color'] = risk_info['color']
            item_dict['recommended_action'] = risk_info['action']
        
        processed_items.append(item_dict)
    
    # Calculate summary
    summary = calculate_summary(processed_items)
    
    report_doc = {
        "id": report_id,
        "report_no": report_no,
        "report_category": "ir-thermography",
        "equipment_type": "ir-thermography",
        "report_type": report_data.report_type,
        "project_id": report_data.project_id,
        "document_details": report_data.document_details.model_dump() if hasattr(report_data.document_details, 'model_dump') else report_data.document_details.dict(),
        "inspection_items": processed_items,
        "calibration_certificate": report_data.calibration_certificate,
        "summary": summary,
        "status": report_data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.test_reports.insert_one(report_doc)
    
    # Return without _id
    report_doc.pop("_id", None)
    return report_doc


@router.put("/{report_id}")
async def update_ir_thermography_report(report_id: str, report_data: IRThermographyUpdate):
    """Update an existing IR Thermography report"""
    db = get_db()
    
    existing = await db.test_reports.find_one(
        {"id": report_id, "report_category": "ir-thermography"}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if report_data.report_type:
        update_data["report_type"] = report_data.report_type
    if report_data.project_id is not None:
        update_data["project_id"] = report_data.project_id
    if report_data.document_details:
        update_data["document_details"] = report_data.document_details.model_dump() if hasattr(report_data.document_details, 'model_dump') else report_data.document_details.dict()
    if report_data.calibration_certificate is not None:
        update_data["calibration_certificate"] = report_data.calibration_certificate
    if report_data.status:
        update_data["status"] = report_data.status
    
    # Process inspection items if provided
    if report_data.inspection_items is not None:
        processed_items = []
        for item in report_data.inspection_items:
            item_dict = item.model_dump() if hasattr(item, 'model_dump') else item.dict()
            
            if not item_dict.get('item_id'):
                item_dict['item_id'] = f"item_{uuid.uuid4().hex[:8]}"
            
            # Calculate Delta T and Risk Category
            max_temp = item_dict.get('max_temperature')
            min_temp = item_dict.get('min_temperature')
            
            if max_temp is not None and min_temp is not None:
                delta_t = max_temp - min_temp
                item_dict['delta_t'] = round(delta_t, 1)
                
                risk_info = calculate_risk_category(delta_t)
                item_dict['risk_category'] = risk_info['category']
                item_dict['risk_color'] = risk_info['color']
                item_dict['recommended_action'] = risk_info['action']
            
            processed_items.append(item_dict)
        
        update_data["inspection_items"] = processed_items
        update_data["summary"] = calculate_summary(processed_items)
    
    await db.test_reports.update_one(
        {"id": report_id},
        {"$set": update_data}
    )
    
    updated = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    return updated


@router.delete("/{report_id}")
async def delete_ir_thermography_report(report_id: str):
    """Delete an IR Thermography report"""
    db = get_db()
    
    result = await db.test_reports.delete_one(
        {"id": report_id, "report_category": "ir-thermography"}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Report deleted successfully"}


@router.post("/{report_id}/upload-image")
async def upload_inspection_image(
    report_id: str,
    item_id: str = Form(...),
    image_type: str = Form(...),  # 'original' or 'thermal'
    file: UploadFile = File(...)
):
    """Upload an image for an inspection item"""
    db = get_db()
    
    # Read file content
    content = await file.read()
    
    # Convert to base64
    base64_content = base64.b64encode(content).decode('utf-8')
    file_ext = file.filename.split('.')[-1].lower() if file.filename else 'jpg'
    data_url = f"data:image/{file_ext};base64,{base64_content}"
    
    # Update the specific inspection item
    field_name = "original_image" if image_type == "original" else "thermal_image"
    
    result = await db.test_reports.update_one(
        {"id": report_id, "inspection_items.item_id": item_id},
        {"$set": {f"inspection_items.$.{field_name}": data_url}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report or inspection item not found")
    
    return {"message": "Image uploaded successfully", "image_url": data_url}


@router.post("/{report_id}/upload-calibration")
async def upload_calibration_certificate(
    report_id: str,
    file: UploadFile = File(...)
):
    """Upload calibration certificate PDF"""
    db = get_db()
    
    # Read file content
    content = await file.read()
    
    # Convert to base64
    base64_content = base64.b64encode(content).decode('utf-8')
    data_url = f"data:application/pdf;base64,{base64_content}"
    
    result = await db.test_reports.update_one(
        {"id": report_id, "report_category": "ir-thermography"},
        {"$set": {"calibration_certificate": data_url}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Calibration certificate uploaded successfully"}


@router.get("/{report_id}/summary")
async def get_report_summary(report_id: str):
    """Get executive summary for a report"""
    db = get_db()
    
    report = await db.test_reports.find_one(
        {"id": report_id, "report_category": "ir-thermography"},
        {"_id": 0, "inspection_items": 1, "document_details": 1}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    summary = calculate_summary(report.get("inspection_items", []))
    summary["document_details"] = report.get("document_details", {})
    
    return summary
