"""
Calibration Services Routes
Handles calibration contracts, meter calibration, and certificate generation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

# Import caching utilities
from utils.cache import cache, CacheTTL

router = APIRouter()


# Pydantic Models
class MeterInfo(BaseModel):
    id: str = ""
    meter_type: str  # energy_meter, voltmeter, ammeter, ct, pt, pf_meter, frequency_meter, multifunction_meter
    make: str = ""
    model: str = ""
    serial_no: str = ""
    range: str = ""
    accuracy_class: str = ""
    location: str = ""
    tag_no: str = ""


class CalibrationReading(BaseModel):
    test_point: str = ""
    standard_value: str = ""
    measured_value_before: str = ""
    measured_value_after: str = ""
    error_before: str = ""
    error_after: str = ""
    tolerance: str = ""
    status: str = ""  # pass, fail


class CalibrationTestResult(BaseModel):
    meter_id: str = ""
    meter_type: str = ""
    meter_details: Optional[MeterInfo] = None
    calibration_date: str = ""
    next_due_date: str = ""
    readings: List[CalibrationReading] = []
    overall_status: str = ""  # pass, fail, conditional
    remarks: str = ""
    calibrated_by: str = ""
    verified_by: str = ""
    certificate_no: str = ""


class CalibrationVisit(BaseModel):
    id: str = ""
    visit_date: str = ""
    visit_type: str = ""  # scheduled, emergency, follow_up
    status: str = "scheduled"  # scheduled, completed, cancelled
    technician: str = ""
    remarks: str = ""
    test_results: List[CalibrationTestResult] = []
    test_report_ids: List[str] = []  # Linked Equipment Test Reports


class CustomerInfo(BaseModel):
    customer_name: str = ""
    site_location: str = ""
    contact_person: str = ""
    contact_number: str = ""
    email: str = ""


class ServiceProviderInfo(BaseModel):
    company_name: str = "Enerzia Power Solutions"
    address: str = ""
    contact_person: str = ""
    contact_number: str = ""
    email: str = ""
    nabl_cert_no: str = ""  # NABL certification number for calibration


class StatutoryDocument(BaseModel):
    id: str = ""
    document_type: str = ""  # calibration_certificate, nabl_certificate, test_certificate, etc.
    document_name: str = ""
    reference_no: str = ""
    issue_date: str = ""
    expiry_date: str = ""
    file_url: str = ""
    file_name: str = ""


class ContractDetails(BaseModel):
    contract_no: str = ""
    start_date: str = ""
    end_date: str = ""
    calibration_frequency: str = ""  # monthly, quarterly, half-yearly, yearly
    scope_of_work: str = ""
    special_conditions: str = ""


class CalibrationContractCreate(BaseModel):
    project_id: Optional[str] = None
    contract_details: ContractDetails
    customer_info: Optional[CustomerInfo] = None
    service_provider: Optional[ServiceProviderInfo] = None
    meter_list: List[MeterInfo] = []
    calibration_visits: List[CalibrationVisit] = []
    statutory_documents: List[StatutoryDocument] = []
    status: str = "active"  # active, expired, cancelled


class CalibrationContractUpdate(BaseModel):
    project_id: Optional[str] = None
    contract_details: Optional[ContractDetails] = None
    customer_info: Optional[CustomerInfo] = None
    service_provider: Optional[ServiceProviderInfo] = None
    meter_list: Optional[List[MeterInfo]] = None
    calibration_visits: Optional[List[CalibrationVisit]] = None
    statutory_documents: Optional[List[StatutoryDocument]] = None
    status: Optional[str] = None


def get_db():
    from server import db
    return db


# Meter type labels
METER_TYPES = {
    'energy_meter': 'Energy Meter (kWh)',
    'voltmeter': 'Voltmeter',
    'ammeter': 'Ammeter',
    'ct': 'Current Transformer (CT)',
    'pt': 'Potential Transformer (PT)',
    'pf_meter': 'Power Factor Meter',
    'frequency_meter': 'Frequency Meter',
    'multifunction_meter': 'Multi-function Meter',
    'wattmeter': 'Wattmeter',
    'var_meter': 'VAR Meter',
    'kwh_meter': 'kWh Meter',
    'other': 'Other'
}


@router.get("/meter-types")
async def get_meter_types():
    """Get list of supported meter types"""
    return {"meter_types": METER_TYPES}


@router.get("/dashboard/stats")
async def get_calibration_dashboard_stats():
    """Get calibration dashboard statistics (cached for 5 minutes)"""
    db = get_db()
    
    cache_key = "calibration:dashboard_stats"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    total_contracts = await db.calibration_contracts.count_documents({})
    active_contracts = await db.calibration_contracts.count_documents({"status": "active"})
    expired_contracts = await db.calibration_contracts.count_documents({"status": "expired"})
    
    # Get contracts expiring in next 30 days
    next_30_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    expiring_soon = await db.calibration_contracts.count_documents({
        "status": "active",
        "contract_details.end_date": {"$lte": next_30_days, "$gte": today}
    })
    
    # Count total meters across all contracts
    total_meters = 0
    contracts = await db.calibration_contracts.find({}, {"meter_list": 1}).to_list(1000)
    for contract in contracts:
        total_meters += len(contract.get("meter_list", []))
    
    result = {
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "expired_contracts": expired_contracts,
        "expiring_soon": expiring_soon,
        "total_meters": total_meters
    }
    
    await cache.set(cache_key, result, ttl=CacheTTL.MEDIUM)
    
    return result


@router.get("")
async def get_calibration_contracts(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all calibration contracts"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    contracts = await db.calibration_contracts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with project info
    for contract in contracts:
        if contract.get("project_id"):
            project = await db.projects.find_one(
                {"id": contract["project_id"]},
                {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1}
            )
            if project:
                contract["project"] = project
    
    total = await db.calibration_contracts.count_documents(query)
    
    return {
        "contracts": contracts,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{contract_id}")
async def get_calibration_contract(contract_id: str):
    """Get a single calibration contract by ID"""
    db = get_db()
    
    contract = await db.calibration_contracts.find_one(
        {"id": contract_id}, {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Calibration contract not found")
    
    # Enrich with project info
    if contract.get("project_id"):
        project = await db.projects.find_one(
            {"id": contract["project_id"]},
            {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1}
        )
        if project:
            contract["project"] = project
    
    return contract


@router.post("")
async def create_calibration_contract(contract_data: CalibrationContractCreate):
    """Create a new calibration contract"""
    db = get_db()
    
    # Generate contract ID and number
    contract_id = str(uuid.uuid4())
    
    # Generate contract number (CAL/YYYY/XXXX format)
    year = datetime.now().year
    count = await db.calibration_contracts.count_documents({
        "contract_no": {"$regex": f"^CAL/{year}/"}
    })
    contract_no = f"CAL/{year}/{str(count + 1).zfill(4)}"
    
    # Add IDs to meters if not present
    meter_list = []
    for meter in contract_data.meter_list:
        meter_dict = meter.model_dump()
        if not meter_dict.get("id"):
            meter_dict["id"] = str(uuid.uuid4())
        meter_list.append(meter_dict)
    
    # Add IDs to visits if not present
    visits = []
    for visit in contract_data.calibration_visits:
        visit_dict = visit.model_dump()
        if not visit_dict.get("id"):
            visit_dict["id"] = str(uuid.uuid4())
        visits.append(visit_dict)
    
    # Add IDs to statutory documents if not present
    statutory_docs = []
    for doc in contract_data.statutory_documents:
        doc_dict = doc.model_dump()
        if not doc_dict.get("id"):
            doc_dict["id"] = str(uuid.uuid4())
        statutory_docs.append(doc_dict)
    
    contract_doc = {
        "id": contract_id,
        "contract_no": contract_no,
        "project_id": contract_data.project_id,
        "contract_details": contract_data.contract_details.model_dump() if contract_data.contract_details else {},
        "customer_info": contract_data.customer_info.model_dump() if contract_data.customer_info else {},
        "service_provider": contract_data.service_provider.model_dump() if contract_data.service_provider else {},
        "meter_list": meter_list,
        "calibration_visits": visits,
        "statutory_documents": statutory_docs,
        "status": contract_data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calibration_contracts.insert_one(contract_doc)
    
    # Invalidate cache
    await cache.invalidate_pattern("calibration:*")
    
    contract_doc.pop("_id", None)
    return contract_doc


@router.put("/{contract_id}")
async def update_calibration_contract(contract_id: str, contract_data: CalibrationContractUpdate):
    """Update a calibration contract"""
    db = get_db()
    
    existing = await db.calibration_contracts.find_one({"id": contract_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Calibration contract not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if contract_data.project_id is not None:
        update_data["project_id"] = contract_data.project_id
    if contract_data.contract_details:
        update_data["contract_details"] = contract_data.contract_details.model_dump()
    if contract_data.customer_info:
        update_data["customer_info"] = contract_data.customer_info.model_dump()
    if contract_data.service_provider:
        update_data["service_provider"] = contract_data.service_provider.model_dump()
    if contract_data.meter_list is not None:
        meter_list = []
        for meter in contract_data.meter_list:
            meter_dict = meter.model_dump()
            if not meter_dict.get("id"):
                meter_dict["id"] = str(uuid.uuid4())
            meter_list.append(meter_dict)
        update_data["meter_list"] = meter_list
    if contract_data.calibration_visits is not None:
        visits = []
        for visit in contract_data.calibration_visits:
            visit_dict = visit.model_dump()
            if not visit_dict.get("id"):
                visit_dict["id"] = str(uuid.uuid4())
            visits.append(visit_dict)
        update_data["calibration_visits"] = visits
    if contract_data.statutory_documents is not None:
        docs = []
        for doc in contract_data.statutory_documents:
            doc_dict = doc.model_dump()
            if not doc_dict.get("id"):
                doc_dict["id"] = str(uuid.uuid4())
            docs.append(doc_dict)
        update_data["statutory_documents"] = docs
    if contract_data.status:
        update_data["status"] = contract_data.status
    
    await db.calibration_contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    # Invalidate cache
    await cache.invalidate_pattern("calibration:*")
    
    updated = await db.calibration_contracts.find_one({"id": contract_id}, {"_id": 0})
    return updated


@router.delete("/{contract_id}")
async def delete_calibration_contract(contract_id: str):
    """Delete a calibration contract"""
    db = get_db()
    
    result = await db.calibration_contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Calibration contract not found")
    
    # Invalidate cache
    await cache.invalidate_pattern("calibration:*")
    
    return {"message": "Calibration contract deleted successfully"}


@router.post("/{contract_id}/visits")
async def add_calibration_visit(contract_id: str, visit: CalibrationVisit):
    """Add a new calibration visit to a contract"""
    db = get_db()
    
    existing = await db.calibration_contracts.find_one({"id": contract_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Calibration contract not found")
    
    visit_dict = visit.model_dump()
    if not visit_dict.get("id"):
        visit_dict["id"] = str(uuid.uuid4())
    
    await db.calibration_contracts.update_one(
        {"id": contract_id},
        {
            "$push": {"calibration_visits": visit_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Invalidate cache
    await cache.invalidate_pattern("calibration:*")
    
    return {"message": "Visit added successfully", "visit_id": visit_dict["id"]}


@router.put("/{contract_id}/visits/{visit_id}")
async def update_calibration_visit(contract_id: str, visit_id: str, visit_data: dict):
    """Update a specific calibration visit"""
    db = get_db()
    
    # Build update query for nested array element
    update_fields = {}
    for key, value in visit_data.items():
        update_fields[f"calibration_visits.$.{key}"] = value
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.calibration_contracts.update_one(
        {"id": contract_id, "calibration_visits.id": visit_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract or visit not found")
    
    # Invalidate cache
    await cache.invalidate_pattern("calibration:*")
    
    return {"message": "Visit updated successfully"}


@router.get("/{contract_id}/due-meters")
async def get_due_meters(contract_id: str, days_ahead: int = 30):
    """Get meters due for calibration within specified days"""
    db = get_db()
    
    contract = await db.calibration_contracts.find_one(
        {"id": contract_id}, {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    today = datetime.now()
    future_date = today + timedelta(days=days_ahead)
    
    due_meters = []
    
    for visit in contract.get("calibration_visits", []):
        for result in visit.get("test_results", []):
            next_due = result.get("next_due_date", "")
            if next_due:
                try:
                    due_date = datetime.strptime(next_due, "%Y-%m-%d")
                    if due_date <= future_date:
                        due_meters.append({
                            "meter_id": result.get("meter_id"),
                            "meter_type": result.get("meter_type"),
                            "certificate_no": result.get("certificate_no"),
                            "last_calibration": result.get("calibration_date"),
                            "next_due_date": next_due,
                            "days_remaining": (due_date - today).days
                        })
                except ValueError:
                    pass
    
    # Sort by days remaining
    due_meters.sort(key=lambda x: x.get("days_remaining", 999))
    
    return {
        "contract_id": contract_id,
        "days_ahead": days_ahead,
        "due_meters": due_meters,
        "total": len(due_meters)
    }
