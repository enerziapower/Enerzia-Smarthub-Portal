"""
Customer Hub Routes - Internal ERP management for customers
Allows admins to manage customer accounts, link projects, and control portal access
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from core.security import require_auth, get_password_hash

router = APIRouter(prefix="/api/customer-hub", tags=["Customer Hub"])


# ========== MODELS ==========

class CustomerCreate(BaseModel):
    name: str
    company_name: str
    email: str
    contact_number: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    portal_access: bool = True


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    portal_access: Optional[bool] = None
    is_active: Optional[bool] = None


class ProjectLink(BaseModel):
    customer_id: str
    project_ids: List[str]


class DocumentAccess(BaseModel):
    customer_id: str
    access_types: List[str]  # ['amc', 'wcc', 'test_reports', 'service_reports', 'projects']


# ========== HELPER FUNCTIONS ==========

def serialize_doc(doc: dict) -> dict:
    """Remove _id from document for JSON serialization"""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc


# ========== CUSTOMER MANAGEMENT ==========

@router.get("/customers")
async def get_all_customers(
    search: Optional[str] = None,
    portal_access: Optional[bool] = None,
    current_user: dict = Depends(require_auth)
):
    """Get all customers with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if portal_access is not None:
        query["portal_access"] = portal_access
    
    customers = await db.customers.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
    
    # Enrich with linked project count
    for customer in customers:
        linked_projects = customer.get("linked_projects", [])
        customer["linked_projects_count"] = len(linked_projects)
    
    return {
        "customers": customers,
        "total": len(customers)
    }


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, current_user: dict = Depends(require_auth)):
    """Get a single customer with full details"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0, "password_hash": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get linked projects details
    linked_project_ids = customer.get("linked_projects", [])
    if linked_project_ids:
        projects = await db.projects.find(
            {"id": {"$in": linked_project_ids}},
            {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "client": 1, "status": 1, "location": 1}
        ).to_list(100)
        customer["projects"] = projects
    else:
        customer["projects"] = []
    
    # Get document access settings
    customer["document_access"] = customer.get("document_access", ["amc", "wcc", "test_reports", "service_reports", "projects"])
    
    return customer


@router.post("/customers")
async def create_customer(data: CustomerCreate, current_user: dict = Depends(require_auth)):
    """Create a new customer (without portal password - admin will set later)"""
    # Check if email already exists
    existing = await db.customers.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "name": data.name,
        "company_name": data.company_name,
        "email": data.email,
        "contact_number": data.contact_number,
        "address": data.address,
        "gst_number": data.gst_number,
        "portal_access": data.portal_access,
        "is_active": True,
        "linked_projects": [],
        "linked_amcs": [],
        "document_access": ["amc", "wcc", "test_reports", "service_reports", "projects"],
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("id")
    }
    
    await db.customers.insert_one(customer_doc)
    
    # Return without _id
    del customer_doc["_id"]
    return customer_doc


@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: str, 
    data: CustomerUpdate, 
    current_user: dict = Depends(require_auth)
):
    """Update customer details"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["updated_by"] = current_user.get("id")
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0, "password_hash": 0})
    return updated


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_auth)):
    """Delete a customer"""
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}


# ========== PROJECT LINKING ==========

@router.post("/customers/{customer_id}/link-projects")
async def link_projects_to_customer(
    customer_id: str,
    project_ids: List[str],
    current_user: dict = Depends(require_auth)
):
    """Link multiple projects to a customer"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify projects exist
    for pid in project_ids:
        project = await db.projects.find_one({"id": pid})
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {pid} not found")
    
    # Add projects to linked list (avoid duplicates)
    await db.customers.update_one(
        {"id": customer_id},
        {"$addToSet": {"linked_projects": {"$each": project_ids}}}
    )
    
    return {"message": f"Linked {len(project_ids)} project(s) to customer"}


@router.delete("/customers/{customer_id}/unlink-project/{project_id}")
async def unlink_project_from_customer(
    customer_id: str,
    project_id: str,
    current_user: dict = Depends(require_auth)
):
    """Unlink a project from a customer"""
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$pull": {"linked_projects": project_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer or project link not found")
    
    return {"message": "Project unlinked from customer"}


@router.get("/customers/{customer_id}/available-projects")
async def get_available_projects(customer_id: str, current_user: dict = Depends(require_auth)):
    """Get projects available to link (not already linked)"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    linked_ids = customer.get("linked_projects", [])
    
    # Get projects not already linked
    query = {}
    if linked_ids:
        query["id"] = {"$nin": linked_ids}
    
    projects = await db.projects.find(
        query,
        {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "client": 1, "status": 1, "location": 1}
    ).limit(200).to_list(200)
    
    return {"projects": projects, "total": len(projects)}


# ========== AUTO-LINKING BY COMPANY NAME ==========

@router.post("/customers/{customer_id}/auto-link")
async def auto_link_by_company_name(customer_id: str, current_user: dict = Depends(require_auth)):
    """Auto-link projects where client name matches customer's company name"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    company_name = customer.get("company_name", "")
    if not company_name:
        raise HTTPException(status_code=400, detail="Customer has no company name set")
    
    # Find projects where client matches company name (case-insensitive)
    matching_projects = await db.projects.find(
        {"client": {"$regex": company_name, "$options": "i"}},
        {"_id": 0, "id": 1}
    ).to_list(500)
    
    project_ids = [p["id"] for p in matching_projects]
    
    if project_ids:
        await db.customers.update_one(
            {"id": customer_id},
            {"$addToSet": {"linked_projects": {"$each": project_ids}}}
        )
    
    return {
        "message": f"Auto-linked {len(project_ids)} project(s) matching '{company_name}'",
        "linked_count": len(project_ids)
    }


# ========== DOCUMENT ACCESS CONTROL ==========

@router.put("/customers/{customer_id}/document-access")
async def update_document_access(
    customer_id: str,
    access_types: List[str],
    current_user: dict = Depends(require_auth)
):
    """Update which document types a customer can access in the portal"""
    valid_types = ["amc", "wcc", "test_reports", "service_reports", "projects", "calibration"]
    
    for t in access_types:
        if t not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid access type: {t}")
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"document_access": access_types}}
    )
    
    return {"message": "Document access updated", "access_types": access_types}


# ========== PORTAL PASSWORD MANAGEMENT ==========

@router.post("/customers/{customer_id}/set-portal-password")
async def set_customer_portal_password(
    customer_id: str,
    password: str,
    current_user: dict = Depends(require_auth)
):
    """Set or reset a customer's portal password"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    password_hash = get_password_hash(password)
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {
            "password_hash": password_hash,
            "portal_access": True,
            "password_set_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Portal password set successfully"}


@router.put("/customers/{customer_id}/toggle-portal-access")
async def toggle_portal_access(
    customer_id: str,
    enabled: bool,
    current_user: dict = Depends(require_auth)
):
    """Enable or disable a customer's portal access"""
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"portal_access": enabled}}
    )
    
    return {"message": f"Portal access {'enabled' if enabled else 'disabled'}"}


# ========== STATISTICS ==========

@router.get("/stats")
async def get_customer_hub_stats(current_user: dict = Depends(require_auth)):
    """Get customer hub statistics"""
    total_customers = await db.customers.count_documents({})
    active_portal = await db.customers.count_documents({"portal_access": True, "password_hash": {"$exists": True}})
    
    # Customers with linked projects
    with_projects = await db.customers.count_documents({"linked_projects.0": {"$exists": True}})
    
    return {
        "total_customers": total_customers,
        "active_portal_users": active_portal,
        "customers_with_projects": with_projects
    }


# ========== CUSTOMER DOCUMENTS VIEW (for admin) ==========

@router.get("/customers/{customer_id}/documents")
async def get_customer_documents(
    customer_id: str,
    doc_type: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """Get all documents accessible to a customer (admin view)"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    linked_projects = customer.get("linked_projects", [])
    documents = {"amcs": [], "wcc": [], "test_reports": [], "service_reports": [], "projects": []}
    
    if not linked_projects:
        return documents
    
    # Get AMCs
    if not doc_type or doc_type == "amc":
        amcs = await db.amcs.find(
            {"project_id": {"$in": linked_projects}},
            {"_id": 0, "id": 1, "amc_no": 1, "project_id": 1, "status": 1, "contract_details": 1}
        ).to_list(100)
        documents["amcs"] = amcs
    
    # Get WCCs
    if not doc_type or doc_type == "wcc":
        wccs = await db.work_completion_certificates.find(
            {"project_id": {"$in": linked_projects}},
            {"_id": 0, "id": 1, "wcc_no": 1, "project_id": 1, "project_name": 1, "status": 1, "created_at": 1}
        ).to_list(100)
        documents["wcc"] = wccs
    
    # Get Test Reports
    if not doc_type or doc_type == "test_reports":
        reports = await db.test_reports.find(
            {"project_id": {"$in": linked_projects}},
            {"_id": 0, "id": 1, "report_no": 1, "equipment_type": 1, "project_id": 1, "status": 1, "created_at": 1}
        ).to_list(100)
        documents["test_reports"] = reports
    
    # Get Projects (summary)
    if not doc_type or doc_type == "projects":
        projects = await db.projects.find(
            {"id": {"$in": linked_projects}},
            {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "client": 1, "status": 1, "completion_percentage": 1}
        ).to_list(100)
        documents["projects"] = projects
    
    return documents
