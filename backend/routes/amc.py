"""
AMC (Annual Maintenance Contract) Routes
Handles AMC contracts, service schedules, and report generation
With caching for improved performance
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

# Import caching utilities
from utils.cache import cache, CacheTTL

router = APIRouter()

# Pydantic Models
class AMCEquipment(BaseModel):
    equipment_type: str
    equipment_name: str
    quantity: int = 1
    service_frequency: str  # monthly, quarterly, half-yearly, yearly
    last_service_date: Optional[str] = None
    next_service_date: Optional[str] = None

class AMCServiceVisit(BaseModel):
    visit_id: str = ""
    visit_date: str
    visit_type: str  # scheduled, emergency, follow-up
    status: str  # scheduled, completed, cancelled, rescheduled
    equipment_serviced: List[str] = []
    technician_name: Optional[str] = None
    remarks: Optional[str] = None
    test_report_ids: List[str] = []  # Links to equipment test reports
    ir_thermography_report_ids: List[str] = []  # Links to IR thermography reports
    service_report_ids: List[str] = []  # Links to service reports (FSR, etc.)

class SpareConsumable(BaseModel):
    item_name: str
    item_type: str = "spare"  # spare or consumable
    quantity: int = 1
    unit: str = "nos"
    part_number: Optional[str] = None
    used_date: Optional[str] = None
    remarks: Optional[str] = None

class StatutoryDocument(BaseModel):
    document_type: str = "calibration_certificate"
    document_name: str
    reference_no: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class AMCContractDetails(BaseModel):
    contract_no: str = ""
    start_date: str
    end_date: str
    contract_value: Optional[float] = None
    payment_terms: Optional[str] = None
    scope_of_work: Optional[str] = None
    special_conditions: Optional[str] = None


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
    gstin: str = ""


class AMCCreate(BaseModel):
    project_id: str
    contract_details: AMCContractDetails
    customer_info: Optional[CustomerInfo] = None
    service_provider: Optional[ServiceProviderInfo] = None
    equipment_list: List[AMCEquipment] = []
    service_visits: List[AMCServiceVisit] = []
    document_details: Optional[dict] = None
    spare_consumables: Optional[List[SpareConsumable]] = []
    statutory_documents: Optional[List[StatutoryDocument]] = []
    annexure: Optional[List[dict]] = None
    status: str = "active"  # active, expired, cancelled, renewed


class AMCUpdate(BaseModel):
    project_id: Optional[str] = None
    contract_details: Optional[AMCContractDetails] = None
    customer_info: Optional[CustomerInfo] = None
    service_provider: Optional[ServiceProviderInfo] = None
    equipment_list: Optional[List[AMCEquipment]] = None
    service_visits: Optional[List[AMCServiceVisit]] = None
    document_details: Optional[dict] = None
    spare_consumables: Optional[List[SpareConsumable]] = None
    statutory_documents: Optional[List[StatutoryDocument]] = None
    annexure: Optional[List[dict]] = None
    status: Optional[str] = None


def get_db():
    from server import db
    return db


@router.get("")
async def get_all_amcs(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all AMC contracts with optional filters"""
    db = get_db()
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    # Use async cursor with to_list
    amcs = await db.amcs.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with project details and ensure customer_name/site_location are populated
    for amc in amcs:
        # Get customer_info object
        customer_info = amc.get("customer_info") or {}
        
        # Extract customer_name from customer_info first
        amc_customer_name = customer_info.get("customer_name", "")
        
        # Extract site_location from customer_info
        amc_site_location = customer_info.get("site_location", "") or amc.get("site_location", "")
        
        # Get project details for fallback
        project = await db.projects.find_one({"id": amc.get("project_id")}, {"_id": 0, "name": 1, "project_name": 1, "customer_name": 1, "client": 1, "site_location": 1, "location": 1})
        if project:
            amc["project_name"] = project.get("name") or project.get("project_name", "")
            # Use AMC customer_info first, then fall back to project
            if not amc_customer_name:
                amc_customer_name = project.get("customer_name") or project.get("client", "")
            if not amc_site_location:
                amc_site_location = project.get("site_location") or project.get("location", "")
        
        # Set fields at top level for easy access by frontend
        amc["customer_name"] = amc_customer_name
        amc["site_location"] = amc_site_location
    
    total = await db.amcs.count_documents(query)
    
    return {
        "amcs": amcs,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/dashboard/stats")
async def get_amc_dashboard_stats():
    """Get AMC dashboard statistics (cached for 5 minutes)"""
    db = get_db()
    
    cache_key = "amc:dashboard_stats"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    total_amcs = await db.amcs.count_documents({})
    active_amcs = await db.amcs.count_documents({"status": "active"})
    expired_amcs = await db.amcs.count_documents({"status": "expired"})
    
    # Get AMCs expiring in next 30 days
    next_30_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    expiring_soon = await db.amcs.count_documents({
        "status": "active",
        "contract_details.end_date": {"$lte": next_30_days, "$gte": today}
    })
    
    # Get upcoming service visits
    upcoming_visits = []
    amcs_cursor = db.amcs.find(
        {"status": "active"},
        {"_id": 0, "id": 1, "amc_no": 1, "project_id": 1, "service_visits": 1}
    )
    
    async for amc in amcs_cursor:
        for visit in amc.get("service_visits", []):
            if visit.get("status") == "scheduled" and visit.get("visit_date", "") >= today:
                upcoming_visits.append({
                    "amc_id": amc["id"],
                    "amc_no": amc.get("amc_no"),
                    "visit": visit
                })
    
    # Sort by date and get top 10
    upcoming_visits.sort(key=lambda x: x["visit"]["visit_date"])
    upcoming_visits = upcoming_visits[:10]
    
    result = {
        "total_amcs": total_amcs,
        "active_amcs": active_amcs,
        "expired_amcs": expired_amcs,
        "expiring_soon": expiring_soon,
        "upcoming_visits": upcoming_visits
    }
    
    # Cache the result
    await cache.set(cache_key, result, ttl=CacheTTL.MEDIUM)
    
    return result


@router.get("/{amc_id}")
async def get_amc(amc_id: str):
    """Get a single AMC contract by ID"""
    db = get_db()
    
    amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Enrich with project details
    project = await db.projects.find_one({"id": amc.get("project_id")}, {"_id": 0})
    if project:
        amc["project"] = project
    
    # Build equipment type order from equipment_list
    equipment_order = {}
    for idx, eq in enumerate(amc.get("equipment_list", [])):
        eq_type = eq.get("equipment_type", "").lower()
        if eq_type and eq_type not in equipment_order:
            equipment_order[eq_type] = idx
    
    # Get linked test reports and sort by equipment list order
    if amc.get("service_visits"):
        for visit in amc["service_visits"]:
            if visit.get("test_report_ids"):
                test_reports = await db.test_reports.find(
                    {"id": {"$in": visit["test_report_ids"]}},
                    {"_id": 0}
                ).to_list(100)
                
                # Sort reports by equipment_list order, then by report_no
                def sort_key(report):
                    eq_type = report.get("equipment_type", "").lower()
                    order = equipment_order.get(eq_type, 999)
                    report_no = report.get("report_no", "")
                    return (order, report_no)
                
                test_reports.sort(key=sort_key)
                visit["test_reports"] = test_reports
    
    return amc


@router.post("")
async def create_amc(amc_data: AMCCreate):
    """Create a new AMC contract"""
    db = get_db()
    
    # Verify project exists
    project = await db.projects.find_one({"id": amc_data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate AMC ID and number
    amc_id = str(uuid.uuid4())
    
    # Get next AMC number
    year = datetime.now().year
    count = await db.amcs.count_documents({}) + 1
    amc_no = f"AMC/{year}/{count:04d}"
    
    amc_doc = {
        "id": amc_id,
        "amc_no": amc_no,
        "project_id": amc_data.project_id,
        "contract_details": amc_data.contract_details.model_dump() if amc_data.contract_details else {},
        "customer_info": amc_data.customer_info.model_dump() if amc_data.customer_info else {},
        "service_provider": amc_data.service_provider.model_dump() if amc_data.service_provider else {},
        "equipment_list": [eq.model_dump() for eq in amc_data.equipment_list] if amc_data.equipment_list else [],
        "service_visits": [sv.model_dump() for sv in amc_data.service_visits] if amc_data.service_visits else [],
        "document_details": amc_data.document_details or {},
        "spare_consumables": [sc.model_dump() for sc in amc_data.spare_consumables] if amc_data.spare_consumables else [],
        "statutory_documents": [sd.model_dump() for sd in amc_data.statutory_documents] if amc_data.statutory_documents else [],
        "annexure": amc_data.annexure or [],
        "status": amc_data.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.amcs.insert_one(amc_doc)
    
    # Invalidate AMC cache
    await cache.invalidate_pattern("amc:*")
    
    # Return without _id
    amc_doc.pop("_id", None)
    return amc_doc


@router.put("/{amc_id}")
async def update_amc(amc_id: str, amc_data: AMCUpdate):
    """Update an existing AMC contract"""
    db = get_db()
    
    existing = await db.amcs.find_one({"id": amc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if amc_data.project_id:
        update_data["project_id"] = amc_data.project_id
    if amc_data.contract_details:
        update_data["contract_details"] = amc_data.contract_details.model_dump()
    if amc_data.customer_info:
        update_data["customer_info"] = amc_data.customer_info.model_dump()
    if amc_data.service_provider:
        update_data["service_provider"] = amc_data.service_provider.model_dump()
    if amc_data.equipment_list is not None:
        update_data["equipment_list"] = [eq.model_dump() for eq in amc_data.equipment_list]
    if amc_data.service_visits is not None:
        update_data["service_visits"] = [sv.model_dump() for sv in amc_data.service_visits]
    if amc_data.document_details is not None:
        update_data["document_details"] = amc_data.document_details
    if amc_data.spare_consumables is not None:
        update_data["spare_consumables"] = [sc.model_dump() for sc in amc_data.spare_consumables]
    if amc_data.statutory_documents is not None:
        update_data["statutory_documents"] = [sd.model_dump() for sd in amc_data.statutory_documents]
    if amc_data.annexure is not None:
        update_data["annexure"] = amc_data.annexure
    if amc_data.status:
        update_data["status"] = amc_data.status
    
    await db.amcs.update_one({"id": amc_id}, {"$set": update_data})
    
    # Invalidate AMC cache
    await cache.invalidate_pattern("amc:*")
    
    updated = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    return updated


@router.delete("/{amc_id}")
async def delete_amc(amc_id: str):
    """Delete an AMC contract"""
    db = get_db()
    
    result = await db.amcs.delete_one({"id": amc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Invalidate AMC cache
    await cache.invalidate_pattern("amc:*")
    
    return {"message": "AMC deleted successfully"}


@router.post("/{amc_id}/clone")
async def clone_amc(amc_id: str):
    """Clone an existing AMC contract with new dates"""
    db = get_db()
    
    # Get original AMC
    original = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Generate new AMC number
    current_year = datetime.now().year
    count = await db.amcs.count_documents({})
    new_amc_no = f"AMC/{current_year}/{str(count + 1).zfill(4)}"
    
    # Calculate new dates (shift by 1 year from original end date)
    try:
        original_end = datetime.strptime(original.get("contract_details", {}).get("end_date", ""), "%Y-%m-%d")
        new_start = original_end + timedelta(days=1)
        new_end = new_start + timedelta(days=365)
    except (ValueError, TypeError, AttributeError):
        new_start = datetime.now()
        new_end = new_start + timedelta(days=365)
    
    # Create cloned AMC
    cloned_amc = original.copy()
    cloned_amc["id"] = str(uuid.uuid4())
    cloned_amc["amc_no"] = new_amc_no
    cloned_amc["status"] = "active"
    cloned_amc["created_at"] = datetime.now(timezone.utc).isoformat()
    cloned_amc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update contract details with new dates
    if "contract_details" in cloned_amc:
        cloned_amc["contract_details"]["start_date"] = new_start.strftime("%Y-%m-%d")
        cloned_amc["contract_details"]["end_date"] = new_end.strftime("%Y-%m-%d")
        cloned_amc["contract_details"]["contract_no"] = ""  # Clear contract number for new entry
    
    # Clear service visits (start fresh)
    cloned_amc["service_visits"] = []
    
    # Update equipment dates
    if "equipment_list" in cloned_amc:
        for equipment in cloned_amc["equipment_list"]:
            equipment["last_service_date"] = new_start.strftime("%Y-%m-%d")
            equipment["next_service_date"] = new_end.strftime("%Y-%m-%d")
    
    # Insert cloned AMC
    await db.amcs.insert_one(cloned_amc)
    
    # Invalidate cache
    await cache.invalidate_pattern("amc:*")
    
    return {"message": "AMC cloned successfully", "id": cloned_amc["id"], "amc_no": new_amc_no}


@router.post("/{amc_id}/service-visit")
async def add_service_visit(amc_id: str, visit: AMCServiceVisit):
    """Add a service visit to an AMC"""
    db = get_db()
    
    existing = await db.amcs.find_one({"id": amc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    visit_data = visit.model_dump()
    if not visit_data.get("visit_id"):
        visit_data["visit_id"] = str(uuid.uuid4())
    
    await db.amcs.update_one(
        {"id": amc_id},
        {
            "$push": {"service_visits": visit_data},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Service visit added", "visit_id": visit_data["visit_id"]}


@router.put("/{amc_id}/service-visit/{visit_id}")
async def update_service_visit(amc_id: str, visit_id: str, visit: AMCServiceVisit):
    """Update a service visit in an AMC"""
    db = get_db()
    
    visit_data = visit.model_dump()
    visit_data["visit_id"] = visit_id
    
    result = await db.amcs.update_one(
        {"id": amc_id, "service_visits.visit_id": visit_id},
        {
            "$set": {
                "service_visits.$": visit_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="AMC or service visit not found")
    
    return {"message": "Service visit updated"}


@router.post("/{amc_id}/link-test-report")
async def link_test_report(amc_id: str, visit_id: str, test_report_id: str):
    """Link a test report to a service visit"""
    db = get_db()
    
    # Verify test report exists
    test_report = await db.test_reports.find_one({"id": test_report_id})
    if not test_report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    result = await db.amcs.update_one(
        {"id": amc_id, "service_visits.visit_id": visit_id},
        {
            "$addToSet": {"service_visits.$.test_report_ids": test_report_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="AMC or service visit not found")
    
    return {"message": "Test report linked to service visit"}


@router.get("/{amc_id}/equipment-reports")
async def get_amc_equipment_reports(amc_id: str):
    """Get all test reports linked to an AMC, sorted by equipment list order"""
    db = get_db()
    
    amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Build equipment type order from equipment_list
    equipment_order = {}
    for idx, eq in enumerate(amc.get("equipment_list", [])):
        eq_type = eq.get("equipment_type", "").lower()
        if eq_type and eq_type not in equipment_order:
            equipment_order[eq_type] = idx
    
    # Collect all test report IDs from service visits
    report_ids = []
    for visit in amc.get("service_visits", []):
        report_ids.extend(visit.get("test_report_ids", []))
    
    # Get unique report IDs
    report_ids = list(set(report_ids))
    
    # Fetch all test reports
    test_reports = []
    if report_ids:
        test_reports = await db.test_reports.find(
            {"id": {"$in": report_ids}},
            {"_id": 0}
        ).to_list(100)
        
        # Sort reports by equipment_list order, then by report_no
        def sort_key(report):
            eq_type = report.get("equipment_type", "").lower()
            order = equipment_order.get(eq_type, 999)
            report_no = report.get("report_no", "")
            return (order, report_no)
        
        test_reports.sort(key=sort_key)
    
    return {
        "amc_id": amc_id,
        "total_reports": len(test_reports),
        "test_reports": test_reports
    }
