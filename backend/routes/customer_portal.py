"""
Customer Portal Routes
Read-only portal for customers to view their AMC status and download reports
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from core.security import get_password_hash, verify_password, create_access_token
from utils.auth import get_current_user

router = APIRouter(prefix="/customer-portal", tags=["Customer Portal"])


# ========== MODELS ==========

class CustomerLogin(BaseModel):
    email: str
    password: str


class CustomerCreate(BaseModel):
    email: str
    password: str
    name: str
    company_name: str
    contact_number: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    email: str
    name: str
    company_name: str
    contact_number: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


class CustomerTokenResponse(BaseModel):
    token: str
    customer: CustomerResponse


# ========== HELPER FUNCTIONS ==========

def serialize_doc(doc: dict) -> dict:
    """Remove _id from document for JSON serialization"""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc


async def get_current_customer(token: str = None):
    """Verify customer token and return customer data"""
    from core.security import decode_token
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "customer":
        raise HTTPException(status_code=401, detail="Invalid customer token")
    
    customer = await db.customers.find_one({"id": payload.get("customer_id")})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return serialize_doc(customer)


# ========== AUTH ROUTES ==========

@router.post("/login")
async def customer_login(login_data: CustomerLogin):
    """Customer login endpoint"""
    customer = await db.customers.find_one({"email": login_data.email})
    
    if not customer:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, customer.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not customer.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    # Update last login
    await db.customers.update_one(
        {"email": login_data.email},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Create token with customer type
    token = create_access_token({
        "customer_id": customer["id"],
        "email": customer["email"],
        "type": "customer"
    })
    
    return {
        "token": token,
        "customer": {
            "id": customer["id"],
            "email": customer["email"],
            "name": customer["name"],
            "company_name": customer.get("company_name", ""),
            "contact_number": customer.get("contact_number"),
            "is_active": customer.get("is_active", True)
        }
    }


@router.post("/register")
async def customer_register(customer_data: CustomerCreate):
    """Register a new customer account"""
    # Check if email already exists
    existing = await db.customers.find_one({"email": customer_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create customer
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "email": customer_data.email,
        "password_hash": get_password_hash(customer_data.password),
        "name": customer_data.name,
        "company_name": customer_data.company_name,
        "contact_number": customer_data.contact_number,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "linked_amcs": []  # Will be populated when admin links AMCs
    }
    
    await db.customers.insert_one(customer_doc)
    
    # Create token
    token = create_access_token({
        "customer_id": customer_id,
        "email": customer_data.email,
        "type": "customer"
    })
    
    return {
        "token": token,
        "customer": {
            "id": customer_id,
            "email": customer_data.email,
            "name": customer_data.name,
            "company_name": customer_data.company_name,
            "contact_number": customer_data.contact_number,
            "is_active": True
        }
    }


@router.get("/me")
async def get_customer_profile(token: str):
    """Get current customer profile"""
    customer = await get_current_customer(token)
    return {
        "id": customer["id"],
        "email": customer["email"],
        "name": customer["name"],
        "company_name": customer.get("company_name", ""),
        "contact_number": customer.get("contact_number"),
        "is_active": customer.get("is_active", True)
    }


# ========== AMC ROUTES ==========

@router.get("/amcs")
async def get_customer_amcs(token: str):
    """Get all AMCs linked to the customer"""
    customer = await get_current_customer(token)
    
    # Find AMCs where customer email or company matches
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    
    # Also check linked_amcs array
    linked_amc_ids = customer.get("linked_amcs", [])
    
    # Query AMCs
    query = {
        "$or": [
            {"customer_info.email": customer_email},
            {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
            {"id": {"$in": linked_amc_ids}}
        ]
    }
    
    amcs = await db.amcs.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with project info
    for amc in amcs:
        project = await db.projects.find_one(
            {"id": amc.get("project_id")},
            {"_id": 0, "project_name": 1, "client": 1, "location": 1}
        )
        if project:
            amc["project"] = project
    
    return {
        "amcs": amcs,
        "total": len(amcs)
    }


@router.get("/amcs/{amc_id}")
async def get_customer_amc_detail(amc_id: str, token: str):
    """Get detailed AMC information for a specific contract"""
    customer = await get_current_customer(token)
    
    # Find the AMC
    amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Verify customer has access to this AMC
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    linked_amcs = customer.get("linked_amcs", [])
    
    amc_customer_email = amc.get("customer_info", {}).get("email", "")
    amc_customer_name = amc.get("customer_info", {}).get("customer_name", "")
    
    has_access = (
        amc_customer_email == customer_email or
        customer_company.lower() in amc_customer_name.lower() or
        amc_id in linked_amcs
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this AMC")
    
    # Get project details
    project = await db.projects.find_one(
        {"id": amc.get("project_id")},
        {"_id": 0}
    )
    if project:
        amc["project"] = project
    
    return amc


@router.get("/amcs/{amc_id}/service-history")
async def get_amc_service_history(amc_id: str, token: str):
    """Get service visit history for an AMC"""
    customer = await get_current_customer(token)
    
    # Verify access (same as above)
    amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    linked_amcs = customer.get("linked_amcs", [])
    
    amc_customer_email = amc.get("customer_info", {}).get("email", "")
    amc_customer_name = amc.get("customer_info", {}).get("customer_name", "")
    
    has_access = (
        amc_customer_email == customer_email or
        customer_company.lower() in amc_customer_name.lower() or
        amc_id in linked_amcs
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this AMC")
    
    # Get service visits
    service_visits = amc.get("service_visits", [])
    
    # Enrich with linked reports
    for visit in service_visits:
        # Get test reports if linked
        if visit.get("test_report_ids"):
            reports = await db.test_reports.find(
                {"id": {"$in": visit["test_report_ids"]}},
                {"_id": 0, "id": 1, "report_type": 1, "status": 1, "created_at": 1}
            ).to_list(100)
            visit["test_reports"] = reports
        
        # Get IR thermography reports if linked
        if visit.get("ir_thermography_report_ids"):
            ir_reports = await db.ir_thermography_reports.find(
                {"id": {"$in": visit["ir_thermography_report_ids"]}},
                {"_id": 0, "id": 1, "status": 1, "created_at": 1}
            ).to_list(100)
            visit["ir_reports"] = ir_reports
    
    return {
        "amc_id": amc_id,
        "amc_no": amc.get("amc_no"),
        "service_visits": service_visits,
        "total_visits": len(service_visits)
    }


# ========== REPORTS ROUTES ==========

# ========== SHARED DOCUMENTS ==========

class ShareDocumentRequest(BaseModel):
    customer_id: str
    document_type: str  # test_report, ir_thermography, calibration, wcc, amc_report
    document_id: str
    document_name: str


@router.post("/admin/share-document")
async def share_document_with_customer(share_data: ShareDocumentRequest, current_user: dict = Depends(get_current_user)):
    """Share a document with a specific customer (Admin only)"""
    # Check if already shared
    existing = await db.shared_documents.find_one({
        "customer_id": share_data.customer_id,
        "document_id": share_data.document_id
    })
    
    if existing:
        return {"message": "Document already shared with this customer", "id": existing.get("id")}
    
    share_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": share_data.customer_id,
        "document_type": share_data.document_type,
        "document_id": share_data.document_id,
        "document_name": share_data.document_name,
        "shared_by": current_user.get("id"),
        "shared_by_name": current_user.get("name", ""),
        "shared_at": datetime.now(timezone.utc)
    }
    
    await db.shared_documents.insert_one(share_doc)
    
    # Optionally create notification for customer
    notification = {
        "id": str(uuid.uuid4()),
        "customer_id": share_data.customer_id,
        "title": "New Document Shared",
        "message": f"A new {share_data.document_type.replace('_', ' ')} has been shared with you: {share_data.document_name}",
        "type": "info",
        "link": f"/customer-portal/reports",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.customer_notifications.insert_one(notification)
    
    return {"message": "Document shared successfully", "id": share_doc["id"]}


@router.delete("/admin/share-document/{share_id}")
async def unshare_document(share_id: str, current_user: dict = Depends(get_current_user)):
    """Remove document sharing (Admin only)"""
    result = await db.shared_documents.delete_one({"id": share_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shared document not found")
    
    return {"message": "Document unshared successfully"}


@router.get("/admin/shared-documents")
async def get_all_shared_documents(
    current_user: dict = Depends(get_current_user),
    customer_id: Optional[str] = None,
    document_type: Optional[str] = None
):
    """Get all shared documents (Admin only)"""
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if document_type:
        query["document_type"] = document_type
    
    shared_docs = await db.shared_documents.find(query, {"_id": 0}).sort("shared_at", -1).to_list(200)
    
    # Enrich with customer info
    for doc in shared_docs:
        customer = await db.customers.find_one({"id": doc.get("customer_id")}, {"_id": 0, "name": 1, "company_name": 1, "email": 1})
        if customer:
            doc["customer_name"] = customer.get("name", "")
            doc["customer_company"] = customer.get("company_name", "")
            doc["customer_email"] = customer.get("email", "")
    
    return {"shared_documents": shared_docs, "total": len(shared_docs)}


@router.get("/admin/available-documents")
async def get_available_documents(
    current_user: dict = Depends(get_current_user),
    document_type: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all available documents for sharing (Admin only)"""
    documents = []
    
    # Test Reports
    if not document_type or document_type == "test_report":
        query = {}
        if search:
            query["$or"] = [
                {"report_no": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
                {"equipment_name": {"$regex": search, "$options": "i"}}
            ]
        test_reports = await db.test_reports.find(query, {"_id": 0, "id": 1, "report_no": 1, "customer_name": 1, "equipment_type": 1, "equipment_name": 1, "test_date": 1}).to_list(100)
        for r in test_reports:
            r["document_type"] = "test_report"
            r["document_name"] = f"{r.get('report_no', '')} - {r.get('equipment_name', r.get('equipment_type', ''))}"
        documents.extend(test_reports)
    
    # IR Thermography Reports
    if not document_type or document_type == "ir_thermography":
        query = {}
        if search:
            query["$or"] = [
                {"report_no": {"$regex": search, "$options": "i"}},
                {"document_details.client": {"$regex": search, "$options": "i"}}
            ]
        ir_reports = await db.ir_thermography_reports.find(query, {"_id": 0, "id": 1, "report_no": 1, "document_details": 1, "report_type": 1}).to_list(100)
        for r in ir_reports:
            r["document_type"] = "ir_thermography"
            client = r.get("document_details", {}).get("client", "")
            r["document_name"] = f"{r.get('report_no', '')} - {r.get('report_type', '')} ({client})"
        documents.extend(ir_reports)
    
    # WCC
    if not document_type or document_type == "wcc":
        query = {}
        if search:
            query["$or"] = [
                {"wcc_no": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}}
            ]
        wccs = await db.work_completion_certificates.find(query, {"_id": 0, "id": 1, "wcc_no": 1, "customer_name": 1, "project_name": 1, "date": 1}).to_list(100)
        for r in wccs:
            r["document_type"] = "wcc"
            r["document_name"] = f"{r.get('wcc_no', '')} - {r.get('customer_name', '')}"
        documents.extend(wccs)
    
    # Calibration
    if not document_type or document_type == "calibration":
        query = {}
        if search:
            query["$or"] = [
                {"certificate_no": {"$regex": search, "$options": "i"}},
                {"customer_info.customer_name": {"$regex": search, "$options": "i"}}
            ]
        calibrations = await db.calibration_contracts.find(query, {"_id": 0, "id": 1, "certificate_no": 1, "customer_info": 1}).to_list(100)
        for r in calibrations:
            r["document_type"] = "calibration"
            customer = r.get("customer_info", {}).get("customer_name", "")
            r["document_name"] = f"{r.get('certificate_no', '')} - {customer}"
        documents.extend(calibrations)
    
    # AMC Reports
    if not document_type or document_type == "amc_report":
        query = {}
        if search:
            query["$or"] = [
                {"amc_no": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}}
            ]
        amcs = await db.amcs.find(query, {"_id": 0, "id": 1, "amc_no": 1, "customer_name": 1, "customer_info": 1}).to_list(100)
        for r in amcs:
            r["document_type"] = "amc_report"
            customer = r.get("customer_name") or r.get("customer_info", {}).get("customer_name", "")
            r["document_name"] = f"{r.get('amc_no', '')} - {customer}"
        documents.extend(amcs)
    
    return {"documents": documents, "total": len(documents)}


@router.get("/admin/customers-list")
async def get_customers_list_for_sharing(current_user: dict = Depends(get_current_user)):
    """Get list of customers for sharing dropdown (Admin only)"""
    customers = await db.customers.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1, "company_name": 1, "email": 1}
    ).to_list(200)
    
    return {"customers": customers}



@router.get("/reports")
async def get_customer_reports(token: str, report_type: Optional[str] = None):
    """Get all reports accessible to the customer"""
    customer = await get_current_customer(token)
    customer_id = customer.get("id")
    
    # First get customer's AMCs
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    linked_amcs = customer.get("linked_amcs", [])
    
    amc_query = {
        "$or": [
            {"customer_info.email": customer_email},
            {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
            {"id": {"$in": linked_amcs}}
        ]
    }
    
    amcs = await db.amcs.find(amc_query, {"_id": 0, "service_visits": 1, "project_id": 1}).to_list(100)
    
    # Collect all report IDs from service visits
    test_report_ids = []
    ir_report_ids = []
    project_ids = []
    
    for amc in amcs:
        project_ids.append(amc.get("project_id"))
        for visit in amc.get("service_visits", []):
            test_report_ids.extend(visit.get("test_report_ids", []))
            ir_report_ids.extend(visit.get("ir_thermography_report_ids", []))
    
    # Get explicitly shared documents for this customer
    shared_docs = await db.shared_documents.find(
        {"customer_id": customer_id},
        {"_id": 0}
    ).to_list(100)
    
    shared_test_ids = [d["document_id"] for d in shared_docs if d.get("document_type") == "test_report"]
    shared_ir_ids = [d["document_id"] for d in shared_docs if d.get("document_type") == "ir_thermography"]
    shared_wcc_ids = [d["document_id"] for d in shared_docs if d.get("document_type") == "wcc"]
    shared_calibration_ids = [d["document_id"] for d in shared_docs if d.get("document_type") == "calibration"]
    shared_amc_ids = [d["document_id"] for d in shared_docs if d.get("document_type") == "amc_report"]
    
    # Merge shared IDs with auto-matched IDs
    test_report_ids = list(set(test_report_ids + shared_test_ids))
    ir_report_ids = list(set(ir_report_ids + shared_ir_ids))
    
    reports = []
    
    # Get test reports
    if not report_type or report_type == "test":
        test_reports = await db.test_reports.find(
            {"$or": [{"id": {"$in": test_report_ids}}, {"project_id": {"$in": project_ids}}]},
            {"_id": 0}
        ).to_list(100)
        for r in test_reports:
            r["report_category"] = "test_report"
        reports.extend(test_reports)
    
    # Get IR thermography reports
    if not report_type or report_type == "ir":
        ir_reports = await db.ir_thermography_reports.find(
            {"$or": [{"id": {"$in": ir_report_ids}}, {"project_id": {"$in": project_ids}}]},
            {"_id": 0}
        ).to_list(100)
        for r in ir_reports:
            r["report_category"] = "ir_thermography"
        reports.extend(ir_reports)
    
    # Get calibration certificates
    if not report_type or report_type == "calibration":
        calibration_query = {"$or": [{"project_id": {"$in": project_ids}}]}
        if shared_calibration_ids:
            calibration_query["$or"].append({"id": {"$in": shared_calibration_ids}})
        calibration_reports = await db.calibration_reports.find(
            calibration_query,
            {"_id": 0}
        ).to_list(100)
        for r in calibration_reports:
            r["report_category"] = "calibration"
        reports.extend(calibration_reports)
    
    # Get WCC (Work Completion Certificates)
    if not report_type or report_type == "wcc":
        wcc_query = {"$or": [{"project_id": {"$in": project_ids}}]}
        if shared_wcc_ids:
            wcc_query["$or"].append({"id": {"$in": shared_wcc_ids}})
        wccs = await db.work_completion_certificates.find(
            wcc_query,
            {"_id": 0}
        ).to_list(100)
        for r in wccs:
            r["report_category"] = "wcc"
        reports.extend(wccs)
    
    # Get AMC Reports
    if not report_type or report_type == "amc":
        amc_report_query = {"$or": []}
        if project_ids:
            amc_report_query["$or"].append({"project_id": {"$in": project_ids}})
        if shared_amc_ids:
            amc_report_query["$or"].append({"id": {"$in": shared_amc_ids}})
        if linked_amcs:
            amc_report_query["$or"].append({"id": {"$in": linked_amcs}})
        
        # Only query if we have conditions
        if amc_report_query["$or"]:
            amc_reports = await db.amcs.find(
                amc_report_query,
                {"_id": 0, "id": 1, "amc_no": 1, "customer_name": 1, "customer_info": 1, 
                 "contract_details": 1, "project_id": 1, "created_at": 1}
            ).to_list(100)
            for r in amc_reports:
                r["report_category"] = "amc_report"
                r["report_no"] = r.get("amc_no", "")
                # Get customer name from customer_info if not directly available
                if not r.get("customer_name"):
                    r["customer_name"] = r.get("customer_info", {}).get("customer_name", "")
            reports.extend(amc_reports)
    
    return {
        "reports": reports,
        "total": len(reports)
    }


@router.get("/reports/{report_id}")
async def get_customer_report_detail(report_id: str, token: str, report_type: str = "test"):
    """Get detailed report information"""
    customer = await get_current_customer(token)
    
    # Get customer's project IDs
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    linked_amcs = customer.get("linked_amcs", [])
    
    amc_query = {
        "$or": [
            {"customer_info.email": customer_email},
            {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
            {"id": {"$in": linked_amcs}}
        ]
    }
    
    amcs = await db.amcs.find(amc_query, {"_id": 0, "project_id": 1}).to_list(100)
    project_ids = [a.get("project_id") for a in amcs]
    
    # Find the report based on type
    report = None
    collection_map = {
        "test": "test_reports",
        "ir": "ir_thermography_reports",
        "calibration": "calibration_reports"
    }
    
    collection_name = collection_map.get(report_type, "test_reports")
    report = await db[collection_name].find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify access
    if report.get("project_id") not in project_ids:
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    return report


# ========== DASHBOARD ROUTES ==========

@router.get("/dashboard")
async def get_customer_dashboard(token: str):
    """Get customer dashboard summary"""
    customer = await get_current_customer(token)
    
    customer_email = customer.get("email", "")
    customer_company = customer.get("company_name", "")
    linked_amcs = customer.get("linked_amcs", [])
    
    amc_query = {
        "$or": [
            {"customer_info.email": customer_email},
            {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
            {"id": {"$in": linked_amcs}}
        ]
    }
    
    # Get AMC stats
    amcs = await db.amcs.find(amc_query, {"_id": 0}).to_list(100)
    
    total_amcs = len(amcs)
    active_amcs = sum(1 for a in amcs if a.get("status") == "active")
    expired_amcs = sum(1 for a in amcs if a.get("status") == "expired")
    
    # Get upcoming service visits
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming_visits = []
    
    for amc in amcs:
        for visit in amc.get("service_visits", []):
            if visit.get("status") == "scheduled" and visit.get("visit_date", "") >= today:
                upcoming_visits.append({
                    "amc_id": amc.get("id"),
                    "amc_no": amc.get("amc_no"),
                    "visit_date": visit.get("visit_date"),
                    "visit_type": visit.get("visit_type")
                })
    
    # Sort by date
    upcoming_visits.sort(key=lambda x: x.get("visit_date", ""))
    upcoming_visits = upcoming_visits[:5]
    
    # Count recent reports
    project_ids = [a.get("project_id") for a in amcs]
    recent_reports_count = await db.test_reports.count_documents({
        "project_id": {"$in": project_ids}
    })
    
    return {
        "total_amcs": total_amcs,
        "active_amcs": active_amcs,
        "expired_amcs": expired_amcs,
        "upcoming_visits": upcoming_visits,
        "recent_reports_count": recent_reports_count,
        "customer_name": customer.get("name"),
        "company_name": customer.get("company_name")
    }


# ========== ADMIN ROUTES (For linking customers) ==========

@router.get("/admin/customers")
async def admin_list_customers():
    """Admin: List all customer accounts"""
    customers = await db.customers.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"customers": customers, "total": len(customers)}


@router.post("/admin/link-amc")
async def admin_link_amc_to_customer(data: dict):
    """Admin: Link an AMC to a customer account"""
    customer_id = data.get("customer_id")
    amc_id = data.get("amc_id")
    
    if not customer_id or not amc_id:
        raise HTTPException(status_code=400, detail="customer_id and amc_id required")
    
    # Verify customer exists
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify AMC exists
    amc = await db.amcs.find_one({"id": amc_id})
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Add AMC to customer's linked list
    await db.customers.update_one(
        {"id": customer_id},
        {"$addToSet": {"linked_amcs": amc_id}}
    )
    
    return {"message": "AMC linked successfully"}


@router.delete("/admin/unlink-amc")
async def admin_unlink_amc_from_customer(data: dict):
    """Admin: Unlink an AMC from a customer account"""
    customer_id = data.get("customer_id")
    amc_id = data.get("amc_id")
    
    if not customer_id or not amc_id:
        raise HTTPException(status_code=400, detail="customer_id and amc_id required")
    
    # Remove AMC from customer's linked list
    await db.customers.update_one(
        {"id": customer_id},
        {"$pull": {"linked_amcs": amc_id}}
    )
    
    return {"message": "AMC unlinked successfully"}


# ========== HELPER: GET CUSTOMER'S PROJECT IDS ==========

async def get_customer_project_ids(customer: dict) -> List[str]:
    """Get all project IDs accessible to a customer"""
    project_ids = []
    
    # Method 1: Directly linked projects (from Customer Hub)
    linked_projects = customer.get("linked_projects", [])
    project_ids.extend(linked_projects)
    
    # Method 2: Projects from linked AMCs
    linked_amcs = customer.get("linked_amcs", [])
    if linked_amcs:
        amcs = await db.amcs.find({"id": {"$in": linked_amcs}}, {"_id": 0, "project_id": 1}).to_list(100)
        for amc in amcs:
            if amc.get("project_id") and amc["project_id"] not in project_ids:
                project_ids.append(amc["project_id"])
    
    # Method 3: Auto-match by company name
    customer_company = customer.get("company_name", "")
    if customer_company:
        matching_projects = await db.projects.find(
            {"client": {"$regex": customer_company, "$options": "i"}},
            {"_id": 0, "id": 1}
        ).to_list(200)
        for p in matching_projects:
            if p["id"] not in project_ids:
                project_ids.append(p["id"])
    
    return project_ids


# ========== WCC (WORK COMPLETION CERTIFICATES) ==========

@router.get("/wcc")
async def get_customer_wcc(token: str):
    """Get all Work Completion Certificates for customer's projects"""
    customer = await get_current_customer(token)
    
    # Check document access
    doc_access = customer.get("document_access", ["amc", "wcc", "test_reports", "service_reports", "projects"])
    if "wcc" not in doc_access:
        raise HTTPException(status_code=403, detail="WCC access not enabled for this account")
    
    project_ids = await get_customer_project_ids(customer)
    
    if not project_ids:
        return {"wcc": [], "total": 0}
    
    wccs = await db.work_completion_certificates.find(
        {"project_id": {"$in": project_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"wcc": wccs, "total": len(wccs)}


@router.get("/wcc/{wcc_id}")
async def get_customer_wcc_detail(wcc_id: str, token: str):
    """Get detailed WCC information"""
    customer = await get_current_customer(token)
    project_ids = await get_customer_project_ids(customer)
    
    wcc = await db.work_completion_certificates.find_one({"id": wcc_id}, {"_id": 0})
    
    if not wcc:
        raise HTTPException(status_code=404, detail="WCC not found")
    
    if wcc.get("project_id") not in project_ids:
        raise HTTPException(status_code=403, detail="Access denied to this WCC")
    
    return wcc


# ========== SERVICE REPORTS ==========

@router.get("/service-reports")
async def get_customer_service_reports(token: str):
    """Get all service reports for customer's projects"""
    customer = await get_current_customer(token)
    
    doc_access = customer.get("document_access", ["amc", "wcc", "test_reports", "service_reports", "projects"])
    if "service_reports" not in doc_access:
        raise HTTPException(status_code=403, detail="Service reports access not enabled")
    
    project_ids = await get_customer_project_ids(customer)
    
    if not project_ids:
        return {"service_reports": [], "total": 0}
    
    # Get test reports that are service-related
    reports = await db.test_reports.find(
        {
            "project_id": {"$in": project_ids},
            "$or": [
                {"report_category": "service"},
                {"equipment_type": {"$in": ["transformer", "dg", "ups", "acb", "vcb", "mccb", "apfc"]}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Also get FSR (Field Service Reports) if they exist
    fsr_reports = await db.fsr_reports.find(
        {"project_id": {"$in": project_ids}},
        {"_id": 0}
    ).to_list(100) if await db.list_collection_names() and "fsr_reports" in await db.list_collection_names() else []
    
    all_reports = reports + fsr_reports
    
    return {"service_reports": all_reports, "total": len(all_reports)}


# ========== PROJECT PROGRESS ==========

@router.get("/projects")
async def get_customer_projects(token: str):
    """Get all projects linked to the customer (read-only view)"""
    customer = await get_current_customer(token)
    
    doc_access = customer.get("document_access", ["amc", "wcc", "test_reports", "service_reports", "projects"])
    if "projects" not in doc_access:
        raise HTTPException(status_code=403, detail="Project access not enabled")
    
    project_ids = await get_customer_project_ids(customer)
    
    if not project_ids:
        return {"projects": [], "total": 0}
    
    projects = await db.projects.find(
        {"id": {"$in": project_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Add summary stats for each project
    for project in projects:
        project_id = project.get("id")
        
        # Count documents
        project["amc_count"] = await db.amcs.count_documents({"project_id": project_id})
        project["wcc_count"] = await db.work_completion_certificates.count_documents({"project_id": project_id})
        project["report_count"] = await db.test_reports.count_documents({"project_id": project_id})
    
    return {"projects": projects, "total": len(projects)}


@router.get("/projects/{project_id}")
async def get_customer_project_detail(project_id: str, token: str):
    """Get detailed project information (read-only)"""
    customer = await get_current_customer(token)
    project_ids = await get_customer_project_ids(customer)
    
    if project_id not in project_ids:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get related documents
    project["amcs"] = await db.amcs.find(
        {"project_id": project_id},
        {"_id": 0, "id": 1, "amc_no": 1, "status": 1, "contract_details": 1}
    ).to_list(20)
    
    project["wccs"] = await db.work_completion_certificates.find(
        {"project_id": project_id},
        {"_id": 0, "id": 1, "wcc_no": 1, "status": 1, "created_at": 1}
    ).to_list(20)
    
    project["test_reports"] = await db.test_reports.find(
        {"project_id": project_id},
        {"_id": 0, "id": 1, "report_no": 1, "equipment_type": 1, "status": 1, "created_at": 1}
    ).to_list(50)
    
    return project


@router.get("/projects/{project_id}/progress")
async def get_project_progress(project_id: str, token: str):
    """Get project progress details"""
    customer = await get_current_customer(token)
    project_ids = await get_customer_project_ids(customer)
    
    if project_id not in project_ids:
        raise HTTPException(status_code=403, detail="Access denied to this project")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "project_id": project_id,
        "project_name": project.get("project_name"),
        "status": project.get("status"),
        "completion_percentage": project.get("completion_percentage", 0),
        "start_date": project.get("start_date"),
        "end_date": project.get("end_date"),
        "po_amount": project.get("po_amount"),
        "invoiced_amount": project.get("invoiced_amount", 0),
        "category": project.get("category"),
        "engineer_in_charge": project.get("engineer_in_charge")
    }


# ========== UPDATED DASHBOARD ==========

@router.get("/dashboard/full")
async def get_customer_dashboard_full(token: str):
    """Get full customer dashboard with all stats"""
    customer = await get_current_customer(token)
    project_ids = await get_customer_project_ids(customer)
    
    # Count documents
    amc_count = await db.amcs.count_documents({"project_id": {"$in": project_ids}}) if project_ids else 0
    active_amcs = await db.amcs.count_documents({"project_id": {"$in": project_ids}, "status": "active"}) if project_ids else 0
    wcc_count = await db.work_completion_certificates.count_documents({"project_id": {"$in": project_ids}}) if project_ids else 0
    report_count = await db.test_reports.count_documents({"project_id": {"$in": project_ids}}) if project_ids else 0
    
    # Projects summary
    projects = []
    if project_ids:
        projects = await db.projects.find(
            {"id": {"$in": project_ids}},
            {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "status": 1, "completion_percentage": 1}
        ).to_list(10)
    
    ongoing_projects = sum(1 for p in projects if p.get("status") == "Ongoing")
    completed_projects = sum(1 for p in projects if p.get("status") == "Completed")
    
    # Upcoming service visits from AMCs
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming_visits = []
    
    if project_ids:
        amcs = await db.amcs.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0, "id": 1, "amc_no": 1, "service_visits": 1}
        ).to_list(100)
        
        for amc in amcs:
            for visit in amc.get("service_visits", []):
                if visit.get("status") == "scheduled" and visit.get("visit_date", "") >= today:
                    upcoming_visits.append({
                        "amc_id": amc.get("id"),
                        "amc_no": amc.get("amc_no"),
                        "visit_date": visit.get("visit_date"),
                        "visit_type": visit.get("visit_type")
                    })
        
        upcoming_visits.sort(key=lambda x: x.get("visit_date", ""))
        upcoming_visits = upcoming_visits[:5]
    
    return {
        "customer_name": customer.get("name"),
        "company_name": customer.get("company_name"),
        "stats": {
            "total_projects": len(project_ids),
            "ongoing_projects": ongoing_projects,
            "completed_projects": completed_projects,
            "total_amcs": amc_count,
            "active_amcs": active_amcs,
            "total_wcc": wcc_count,
            "total_reports": report_count
        },
        "recent_projects": projects[:5],
        "upcoming_visits": upcoming_visits,
        "document_access": customer.get("document_access", ["amc", "wcc", "test_reports", "service_reports", "projects"])
    }



# ========== NOTIFICATIONS ==========

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, success, warning, alert
    link: Optional[str] = None


@router.get("/notifications")
async def get_customer_notifications(token: str, unread_only: bool = False):
    """Get all notifications for the customer"""
    customer = await get_current_customer(token)
    
    query = {"customer_id": customer["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.customer_notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    unread_count = await db.customer_notifications.count_documents({
        "customer_id": customer["id"],
        "read": False
    })
    
    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": unread_count
    }


# ========== REPORT PDF DOWNLOADS ==========

@router.get("/download/test-report/{report_id}")
async def download_test_report_pdf(report_id: str, token: str):
    """Download test report PDF for customer portal"""
    customer = await get_current_customer(token)
    
    # Check if customer has access to this report (via shared_documents or linked AMCs)
    shared_doc = await db.shared_documents.find_one({
        "customer_id": customer["id"],
        "document_type": "test_report",
        "document_id": report_id
    })
    
    # Also check if report is linked via AMC
    has_access = shared_doc is not None
    
    if not has_access:
        # Check if report is part of customer's AMC service visits
        customer_email = customer.get("email", "")
        customer_company = customer.get("company_name", "")
        linked_amcs = customer.get("linked_amcs", [])
        
        amcs = await db.amcs.find({
            "$or": [
                {"customer_info.email": customer_email},
                {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
                {"id": {"$in": linked_amcs}}
            ]
        }).to_list(100)
        
        for amc in amcs:
            for visit in amc.get("service_visits", []):
                if report_id in visit.get("test_report_ids", []):
                    has_access = True
                    break
            if has_access:
                break
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Get the report
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Generate PDF using the equipment_pdf module
    from routes.equipment_pdf import generate_equipment_pdf_buffer, EQUIPMENT_INFO
    
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    equipment_type = report.get("equipment_type", "other")
    
    buffer = generate_equipment_pdf_buffer(report, org_settings, equipment_type)
    
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO.get('other', {'name': 'Test'}))
    report_no = report.get('report_no', 'REPORT').replace('/', '_')
    filename = f"{equipment_info['name'].replace(' ', '_')}_Test_Report_{report_no}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/amc-report/{report_id}")
async def download_amc_report_pdf(report_id: str, token: str):
    """Download AMC report PDF for customer portal"""
    customer = await get_current_customer(token)
    
    # Check access
    shared_doc = await db.shared_documents.find_one({
        "customer_id": customer["id"],
        "document_type": "amc_report",
        "document_id": report_id
    })
    
    has_access = shared_doc is not None
    
    if not has_access:
        # Check if AMC belongs to customer
        customer_email = customer.get("email", "")
        customer_company = customer.get("company_name", "")
        linked_amcs = customer.get("linked_amcs", [])
        
        amc = await db.amcs.find_one({
            "id": report_id,
            "$or": [
                {"customer_info.email": customer_email},
                {"customer_info.customer_name": {"$regex": customer_company, "$options": "i"}},
                {"id": {"$in": linked_amcs}}
            ]
        })
        has_access = amc is not None
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Use the AMC PDF generator
    from routes.amc_pdf import generate_amc_report_pdf
    
    pdf_buffer = await generate_amc_report_pdf(report_id)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=AMC_Report_{report_id}.pdf"}
    )


@router.get("/download/ir-thermography/{report_id}")
async def download_ir_thermography_pdf(report_id: str, token: str):
    """Download IR Thermography report PDF for customer portal"""
    customer = await get_current_customer(token)
    
    # Check access
    shared_doc = await db.shared_documents.find_one({
        "customer_id": customer["id"],
        "document_type": "ir_thermography", 
        "document_id": report_id
    })
    
    if not shared_doc:
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Get the report and generate PDF
    report = await db.ir_thermography_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from routes.ir_thermography import generate_ir_thermography_pdf
    
    pdf_buffer = await generate_ir_thermography_pdf(report)
    report_no = report.get('report_no', 'IR_Report').replace('/', '_')
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=IR_Thermography_{report_no}.pdf"}
    )


@router.get("/download/wcc/{report_id}")
async def download_wcc_pdf(report_id: str, token: str):
    """Download WCC PDF for customer portal"""
    customer = await get_current_customer(token)
    
    # Check access
    shared_doc = await db.shared_documents.find_one({
        "customer_id": customer["id"],
        "document_type": "wcc",
        "document_id": report_id
    })
    
    if not shared_doc:
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Get WCC and generate PDF
    wcc = await db.work_completion_certificates.find_one({"id": report_id}, {"_id": 0})
    if not wcc:
        raise HTTPException(status_code=404, detail="WCC not found")
    
    from routes.wcc import generate_wcc_pdf_buffer
    
    pdf_buffer = generate_wcc_pdf_buffer(wcc)
    wcc_no = wcc.get('wcc_no', 'WCC').replace('/', '_')
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=WCC_{wcc_no}.pdf"}
    )


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: str):
    """Mark a notification as read"""
    customer = await get_current_customer(token)
    
    result = await db.customer_notifications.update_one(
        {"id": notification_id, "customer_id": customer["id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(token: str):
    """Mark all notifications as read"""
    customer = await get_current_customer(token)
    
    await db.customer_notifications.update_many(
        {"customer_id": customer["id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "All notifications marked as read"}


# ========== CUSTOMER PROFILE ==========

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/profile")
async def get_customer_profile_full(token: str):
    """Get full customer profile"""
    customer = await get_current_customer(token)
    
    return {
        "id": customer["id"],
        "email": customer["email"],
        "name": customer.get("name", ""),
        "company_name": customer.get("company_name", ""),
        "contact_number": customer.get("contact_number", ""),
        "address": customer.get("address", ""),
        "gst_number": customer.get("gst_number", ""),
        "created_at": customer.get("created_at"),
        "last_login": customer.get("last_login"),
        "is_active": customer.get("is_active", True)
    }


@router.put("/profile")
async def update_customer_profile(profile_data: ProfileUpdate, token: str):
    """Update customer profile"""
    customer = await get_current_customer(token)
    
    update_data = {}
    if profile_data.name:
        update_data["name"] = profile_data.name
    if profile_data.contact_number is not None:
        update_data["contact_number"] = profile_data.contact_number
    if profile_data.address is not None:
        update_data["address"] = profile_data.address
    if profile_data.gst_number is not None:
        update_data["gst_number"] = profile_data.gst_number
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.customers.update_one(
            {"id": customer["id"]},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}


@router.put("/profile/password")
async def change_customer_password(password_data: PasswordChange, token: str):
    """Change customer password"""
    customer = await get_current_customer(token)
    
    # Get full customer doc with password hash
    full_customer = await db.customers.find_one({"id": customer["id"]})
    
    if not verify_password(password_data.current_password, full_customer.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = get_password_hash(password_data.new_password)
    await db.customers.update_one(
        {"id": customer["id"]},
        {"$set": {"password_hash": new_hash, "password_changed_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Password changed successfully"}


# ========== FEEDBACK / RATING SYSTEM ==========

class FeedbackCreate(BaseModel):
    subject: str
    rating: int  # 1-5
    feedback_type: str  # service_visit, amc_contract, general, report
    reference_id: Optional[str] = None  # amc_id, visit_id, report_id
    comments: str


@router.post("/feedback")
async def submit_feedback(feedback_data: FeedbackCreate, token: str):
    """Submit feedback/rating"""
    customer = await get_current_customer(token)
    
    if feedback_data.rating < 1 or feedback_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    feedback_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer["id"],
        "customer_name": customer.get("name", ""),
        "company_name": customer.get("company_name", ""),
        "subject": feedback_data.subject,
        "rating": feedback_data.rating,
        "feedback_type": feedback_data.feedback_type,
        "reference_id": feedback_data.reference_id,
        "comments": feedback_data.comments,
        "status": "pending",  # pending, acknowledged, resolved
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.customer_feedback.insert_one(feedback_doc)
    
    return {"message": "Feedback submitted successfully", "feedback_id": feedback_doc["id"]}


@router.get("/feedback")
async def get_customer_feedback(token: str):
    """Get all feedback submitted by customer"""
    customer = await get_current_customer(token)
    
    feedbacks = await db.customer_feedback.find(
        {"customer_id": customer["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"feedbacks": feedbacks, "total": len(feedbacks)}


# ========== SUPPORT / CONTACT ==========

class SupportTicketCreate(BaseModel):
    subject: str
    category: str  # technical, billing, service, general
    priority: str = "normal"  # low, normal, high, urgent
    description: str
    reference_type: Optional[str] = None  # amc, project, report
    reference_id: Optional[str] = None


@router.post("/support")
async def create_support_ticket(ticket_data: SupportTicketCreate, token: str):
    """Create a support ticket"""
    customer = await get_current_customer(token)
    
    # Generate ticket number
    count = await db.support_tickets.count_documents({})
    ticket_no = f"TKT/{datetime.now().strftime('%Y')}/{str(count + 1).zfill(4)}"
    
    ticket_doc = {
        "id": str(uuid.uuid4()),
        "ticket_no": ticket_no,
        "customer_id": customer["id"],
        "customer_name": customer.get("name", ""),
        "customer_email": customer.get("email", ""),
        "company_name": customer.get("company_name", ""),
        "subject": ticket_data.subject,
        "category": ticket_data.category,
        "priority": ticket_data.priority,
        "description": ticket_data.description,
        "reference_type": ticket_data.reference_type,
        "reference_id": ticket_data.reference_id,
        "status": "open",  # open, in_progress, resolved, closed
        "messages": [{
            "id": str(uuid.uuid4()),
            "from": "customer",
            "message": ticket_data.description,
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.support_tickets.insert_one(ticket_doc)
    
    return {
        "message": "Support ticket created successfully",
        "ticket_id": ticket_doc["id"],
        "ticket_no": ticket_no
    }


@router.get("/support")
async def get_customer_tickets(token: str, status: Optional[str] = None):
    """Get all support tickets for customer"""
    customer = await get_current_customer(token)
    
    query = {"customer_id": customer["id"]}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"tickets": tickets, "total": len(tickets)}


@router.get("/support/{ticket_id}")
async def get_ticket_detail(ticket_id: str, token: str):
    """Get detailed ticket information"""
    customer = await get_current_customer(token)
    
    ticket = await db.support_tickets.find_one(
        {"id": ticket_id, "customer_id": customer["id"]},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket


@router.post("/support/{ticket_id}/message")
async def add_ticket_message(ticket_id: str, message: dict, token: str):
    """Add a message to a support ticket"""
    customer = await get_current_customer(token)
    
    ticket = await db.support_tickets.find_one(
        {"id": ticket_id, "customer_id": customer["id"]}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.get("status") == "closed":
        raise HTTPException(status_code=400, detail="Cannot add message to closed ticket")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "from": "customer",
        "message": message.get("message", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Message added successfully"}


# ========== DOWNLOAD HISTORY ==========

class DownloadRecord(BaseModel):
    document_type: str  # amc_report, test_report, wcc, calibration, ir_thermography
    document_id: str
    document_name: str


@router.post("/downloads")
async def record_download(download_data: DownloadRecord, token: str):
    """Record a document download"""
    customer = await get_current_customer(token)
    
    download_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer["id"],
        "document_type": download_data.document_type,
        "document_id": download_data.document_id,
        "document_name": download_data.document_name,
        "downloaded_at": datetime.now(timezone.utc)
    }
    
    await db.customer_downloads.insert_one(download_doc)
    
    return {"message": "Download recorded"}


@router.get("/downloads")
async def get_download_history(token: str, limit: int = 50):
    """Get download history for customer"""
    customer = await get_current_customer(token)
    
    downloads = await db.customer_downloads.find(
        {"customer_id": customer["id"]},
        {"_id": 0}
    ).sort("downloaded_at", -1).to_list(limit)
    
    # Group by document type
    by_type = {}
    for d in downloads:
        doc_type = d.get("document_type", "other")
        if doc_type not in by_type:
            by_type[doc_type] = []
        by_type[doc_type].append(d)
    
    return {
        "downloads": downloads,
        "total": len(downloads),
        "by_type": by_type
    }


@router.delete("/downloads/{download_id}")
async def delete_download_record(download_id: str, token: str):
    """Delete a download record"""
    customer = await get_current_customer(token)
    
    result = await db.customer_downloads.delete_one({
        "id": download_id,
        "customer_id": customer["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Download record not found")
    
    return {"message": "Download record deleted"}

