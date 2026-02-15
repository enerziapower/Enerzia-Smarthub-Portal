"""
Test Reports routes module.
Handles equipment test reports, AMC, Audit, and other report types.
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

router = APIRouter(prefix="/test-reports", tags=["Test Reports"])


# ==================== MODELS ====================

class TestReport(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_no: str = ""
    equipment_type: str
    report_category: str = "equipment"
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    location: Optional[str] = None
    test_date: Optional[str] = None
    visit_date: Optional[str] = None
    audit_date: Optional[str] = None
    audit_type: Optional[str] = None
    title: Optional[str] = None
    tested_by: Optional[str] = None
    witnessed_by: Optional[str] = None
    ambient_temperature: Optional[str] = None
    humidity: Optional[str] = None
    remarks: Optional[str] = None
    recommendations: Optional[str] = None
    overall_condition: str = "satisfactory"
    status: str = "draft"
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Equipment type prefixes for report numbering
EQUIPMENT_PREFIXES = {
    'transformer': 'TRN',
    'earth-pit': 'EP',
    'energy-meter': 'EM',
    'mccb': 'MCCB',
    'acb': 'ACB',
    'vcb': 'VCB',
    'dg': 'DG',
    'lighting': 'LUX',
    'lightning-arrestor': 'LA',
    'ups': 'UPS',
    'ir-thermography': 'IR',
    'electrical-panel': 'PNL',
    'relay': 'RLY',
    'apfc': 'APFC',
    'battery': 'BAT',
    'amc': 'AMC',
    'audit': 'AUD',
    'voltmeter': 'VM',
    'ammeter': 'AM',
    'other': 'OTH'
}


# ==================== ROUTES ====================

@router.get("")
async def get_test_reports(
    equipment_type: Optional[str] = None,
    report_category: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_auth)
):
    """Get all test reports with optional filters."""
    query = {}
    
    if equipment_type:
        query["equipment_type"] = equipment_type
    if report_category:
        query["report_category"] = report_category
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    reports = await db.test_reports.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return reports


@router.get("/equipment/{equipment_type}")
async def get_reports_by_equipment(
    equipment_type: str,
    current_user: dict = Depends(require_auth)
):
    """Get all reports for a specific equipment type."""
    reports = await db.test_reports.find(
        {"equipment_type": equipment_type},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return reports


@router.get("/next-report-no/{equipment_type}")
async def get_next_report_no(
    equipment_type: str,
    current_user: dict = Depends(require_auth)
):
    """Get the next available report number for an equipment type."""
    prefix = EQUIPMENT_PREFIXES.get(equipment_type, 'TR')
    year = datetime.now().year
    
    pattern = f"^{prefix}/{year}/"
    last_report = await db.test_reports.find_one(
        {"report_no": {"$regex": pattern}},
        sort=[("report_no", -1)]
    )
    
    if last_report and last_report.get("report_no"):
        try:
            parts = last_report["report_no"].split("/")
            last_num = int(parts[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1
    
    return {"report_no": f"{prefix}/{year}/{next_num:04d}"}


@router.get("/{report_id}")
async def get_test_report(
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get a specific test report."""
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    # Helper function to clean corrupted string data
    def clean_string_value(val, default=''):
        """Convert corrupted object-as-string back to string."""
        if val is None:
            return default
        if isinstance(val, str):
            return val
        if isinstance(val, dict):
            # Handle corrupted data where string was saved as {0: "1", 1: "0", ...}
            keys = list(val.keys())
            if all(str(k).isdigit() for k in keys):
                sorted_keys = sorted(keys, key=lambda x: int(x))
                return ''.join(str(val[k]) for k in sorted_keys)
            return default
        return str(val)
    
    # Clean up corrupted insulation_resistance data (ACB reports)
    if report.get('equipment_type') == 'acb' and report.get('insulation_resistance'):
        ir = report['insulation_resistance']
        if isinstance(ir, dict):
            # Fix top-level fields
            ir['voltage_applied'] = clean_string_value(ir.get('voltage_applied'), '1000V DC for 60 Sec')
            ir['ambient_temp'] = clean_string_value(ir.get('ambient_temp'), '')
            
            # Fix nested cb_open values
            if isinstance(ir.get('cb_open'), dict):
                for key in ir['cb_open']:
                    ir['cb_open'][key] = clean_string_value(ir['cb_open'][key], '')
            
            # Fix nested cb_close_phase_earth values
            if isinstance(ir.get('cb_close_phase_earth'), dict):
                for key in ir['cb_close_phase_earth']:
                    ir['cb_close_phase_earth'][key] = clean_string_value(ir['cb_close_phase_earth'][key], '')
            
            # Fix nested cb_close_phase_phase values
            if isinstance(ir.get('cb_close_phase_phase'), dict):
                for key in ir['cb_close_phase_phase']:
                    ir['cb_close_phase_phase'][key] = clean_string_value(ir['cb_close_phase_phase'][key], '')
            
            report['insulation_resistance'] = ir
    
    # Clean up coil_resistance data
    if report.get('equipment_type') == 'acb' and report.get('coil_resistance'):
        cr = report['coil_resistance']
        if isinstance(cr, dict):
            cr['ambient_temp'] = clean_string_value(cr.get('ambient_temp'), '')
            cr['close_coil'] = clean_string_value(cr.get('close_coil'), '')
            cr['trip_coil'] = clean_string_value(cr.get('trip_coil'), '')
            report['coil_resistance'] = cr
    
    # Clean up contact_resistance data
    if report.get('equipment_type') == 'acb' and report.get('contact_resistance'):
        contr = report['contact_resistance']
        if isinstance(contr, dict):
            contr['injected_current'] = clean_string_value(contr.get('injected_current'), '100 Amps DC')
            contr['r_phase'] = clean_string_value(contr.get('r_phase'), '')
            contr['y_phase'] = clean_string_value(contr.get('y_phase'), '')
            contr['b_phase'] = clean_string_value(contr.get('b_phase'), '')
            contr['n_phase'] = clean_string_value(contr.get('n_phase'), '')
            report['contact_resistance'] = contr
    
    return report


@router.post("")
async def create_test_report(
    report_data: dict,
    current_user: dict = Depends(require_auth)
):
    """Create a new test report."""
    equipment_type = report_data.get("equipment_type")
    if not equipment_type:
        raise HTTPException(status_code=400, detail="Equipment type is required")
    
    # Generate report number
    next_no = await get_next_report_no(equipment_type, current_user)
    
    # Remove report_no from report_data if present to avoid duplicate keyword argument
    report_data.pop("report_no", None)
    
    report = TestReport(
        report_no=next_no["report_no"],
        **report_data
    )
    report.created_by = current_user.get("name", current_user.get("email"))
    
    doc = report.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.test_reports.insert_one(doc)
    
    return {"message": "Test report created", "id": report.id, "report_no": report.report_no}


@router.put("/{report_id}")
async def update_test_report(
    report_id: str,
    report_data: dict,
    current_user: dict = Depends(require_auth)
):
    """Update a test report."""
    existing = await db.test_reports.find_one({"id": report_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    report_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    report_data.pop("id", None)
    report_data.pop("report_no", None)
    report_data.pop("_id", None)
    
    await db.test_reports.update_one(
        {"id": report_id},
        {"$set": report_data}
    )
    
    return {"message": "Test report updated"}


@router.delete("/{report_id}")
async def delete_test_report(
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Delete a test report."""
    existing = await db.test_reports.find_one({"id": report_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    await db.test_reports.delete_one({"id": report_id})
    
    return {"message": "Test report deleted"}



# ==================== EQUIPMENT TEMPLATES ====================

from routes.equipment_templates import EQUIPMENT_TEMPLATES, get_equipment_template, get_all_equipment_types


@router.get("/templates/all")
async def get_all_templates(current_user: dict = Depends(require_auth)):
    """Get all equipment templates."""
    return {
        "templates": EQUIPMENT_TEMPLATES,
        "equipment_types": get_all_equipment_types()
    }


@router.get("/templates/{equipment_type}")
async def get_template(equipment_type: str, current_user: dict = Depends(require_auth)):
    """Get template for a specific equipment type."""
    template = get_equipment_template(equipment_type)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found for equipment type: {equipment_type}")
    return template
