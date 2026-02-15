"""
Settings routes - Extracted from server.py
Handles organization settings, general settings, email templates,
engineers, categories, statuses, clients, and vendors.
"""
from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/settings", tags=["Settings"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia')]

# Uploads directory
UPLOADS_DIR = Path("/app/backend/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# ==================== MODELS ====================

class OrganizationSettings(BaseModel):
    id: str = "org_settings"
    name: str = "Enerzia Power Solutions"
    logo_url: Optional[str] = None
    industry: str = "Engineering"
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class GeneralSettings(BaseModel):
    id: str = "general_settings"
    timezone: str = "Asia/Kolkata"
    date_format: str = "DD/MM/YYYY"
    currency: str = "INR"
    currency_symbol: str = "₹"
    financial_year_start: str = "April"


class EmailTemplate(BaseModel):
    id: str = "email_template_settings"
    # Header Settings
    header_bg_color: str = "#0F172A"
    header_gradient_end: str = "#1E3A5F"
    company_logo_url: Optional[str] = None
    
    # Email Content Settings
    greeting_text: str = "Dear {customer_name},"
    intro_text: str = "Please find attached the {report_type} for your reference. Below are the key details:"
    closing_text: str = "If you have any questions or need further clarification, please don't hesitate to reach out."
    signature_text: str = "Best regards,"
    
    # Footer Settings
    footer_text: str = "This is an automated email from {company_name}'s Report Management System."
    footer_bg_color: str = "#F1F5F9"
    show_copyright: bool = True
    
    # Additional Settings
    primary_color: str = "#0F172A"
    accent_color: str = "#10B981"
    
    updated_at: Optional[str] = None


class EmailTemplateUpdate(BaseModel):
    header_bg_color: Optional[str] = None
    header_gradient_end: Optional[str] = None
    company_logo_url: Optional[str] = None
    greeting_text: Optional[str] = None
    intro_text: Optional[str] = None
    closing_text: Optional[str] = None
    signature_text: Optional[str] = None
    footer_text: Optional[str] = None
    footer_bg_color: Optional[str] = None
    show_copyright: Optional[bool] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None


class Engineer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EngineerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # e.g., PSS, AS, OSS, CS
    name: str  # e.g., "Project & Services"
    description: Optional[str] = None
    is_active: bool = True


class CategoryCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class Status(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Need to Start", "Ongoing"
    color: Optional[str] = None  # Hex color code
    order: int = 0
    is_active: bool = True


class StatusCreate(BaseModel):
    name: str
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True


class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    country: Optional[str] = None
    customer_type: str = "domestic"  # domestic or overseas
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClientCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    country: Optional[str] = None
    customer_type: str = "domestic"
    is_active: bool = True


class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True


# ==================== LOGO ROUTES ====================

@router.post("/upload-logo")
async def upload_organization_logo(file: UploadFile = File(...)):
    """Upload organization logo"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    allowed_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(allowed_exts)}"
        )
    
    # Validate file size (max 1MB for logos)
    MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 1MB limit"
        )
    
    # Generate filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"logo_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Update organization settings with new logo
    logo_url = f"/uploads/{safe_filename}"
    await db.settings.update_one(
        {"id": "org_settings"},
        {"$set": {"logo_url": logo_url}},
        upsert=True
    )
    
    return {
        "logo_url": logo_url,
        "filename": safe_filename
    }


@router.delete("/delete-logo")
async def delete_organization_logo():
    """Delete organization logo"""
    # Get current logo
    settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    if settings and settings.get("logo_url"):
        # Delete file if exists
        logo_path = UPLOADS_DIR / settings["logo_url"].split("/")[-1]
        if logo_path.exists():
            logo_path.unlink()
    
    # Update settings to remove logo
    await db.settings.update_one(
        {"id": "org_settings"},
        {"$set": {"logo_url": None}},
        upsert=True
    )
    
    return {"message": "Logo deleted successfully"}


# ==================== ORGANIZATION SETTINGS ====================

@router.get("/organization")
async def get_organization_settings():
    """Get organization settings"""
    settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    if not settings:
        # Return default settings
        default = OrganizationSettings()
        return default.model_dump()
    return settings


@router.put("/organization")
async def update_organization_settings(settings: OrganizationSettings):
    """Update organization settings"""
    settings_dict = settings.model_dump()
    settings_dict["id"] = "org_settings"
    
    await db.settings.update_one(
        {"id": "org_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_dict


# ==================== GENERAL SETTINGS ====================

@router.get("/general")
async def get_general_settings():
    """Get general settings"""
    settings = await db.settings.find_one({"id": "general_settings"}, {"_id": 0})
    if not settings:
        default = GeneralSettings()
        return default.model_dump()
    return settings


@router.put("/general")
async def update_general_settings(settings: GeneralSettings):
    """Update general settings"""
    settings_dict = settings.model_dump()
    settings_dict["id"] = "general_settings"
    
    await db.settings.update_one(
        {"id": "general_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_dict


# ==================== EMAIL TEMPLATE SETTINGS ====================

@router.get("/email-template")
async def get_email_template():
    """Get email template settings"""
    settings = await db.settings.find_one({"id": "email_template_settings"}, {"_id": 0})
    if not settings:
        default = EmailTemplate()
        return default.model_dump()
    return settings


@router.put("/email-template")
async def update_email_template(updates: EmailTemplateUpdate):
    """Update email template settings"""
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "email_template_settings"},
        {"$set": update_dict},
        upsert=True
    )
    
    updated = await db.settings.find_one({"id": "email_template_settings"}, {"_id": 0})
    return updated


@router.post("/email-template/upload-logo")
async def upload_email_logo(file: UploadFile = File(...)):
    """Upload logo for email template"""
    file_ext = Path(file.filename).suffix.lower()
    allowed_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    if file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File type not allowed")
    
    MAX_FILE_SIZE = 500 * 1024  # 500KB for email logos
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 500KB limit")
    
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"email_logo_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / safe_filename
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    logo_url = f"/uploads/{safe_filename}"
    await db.settings.update_one(
        {"id": "email_template_settings"},
        {"$set": {"company_logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"logo_url": logo_url, "filename": safe_filename}


@router.post("/email-template/preview")
async def preview_email_template(data: dict):
    """Generate a preview of the email template with sample data"""
    # Get current template settings
    template = await db.settings.find_one({"id": "email_template_settings"}, {"_id": 0})
    if not template:
        template = EmailTemplate().model_dump()
    
    # Get organization settings for company info
    org = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    company_name = org.get("name", "Enerzia Power Solutions") if org else "Enerzia Power Solutions"
    
    # Sample data for preview
    sample_data = {
        "customer_name": data.get("customer_name", "John Doe"),
        "report_type": data.get("report_type", "Transformer Test Report"),
        "report_number": data.get("report_number", "TRN/25-26/001"),
        "report_date": data.get("report_date", datetime.now().strftime("%d-%m-%Y")),
        "equipment_details": data.get("equipment_details", "1000 KVA Transformer"),
        "company_name": company_name
    }
    
    # Generate preview HTML
    greeting = template.get("greeting_text", "Dear {customer_name},").format(**sample_data)
    intro = template.get("intro_text", "").format(**sample_data)
    closing = template.get("closing_text", "")
    signature = template.get("signature_text", "Best regards,")
    footer = template.get("footer_text", "").format(**sample_data)
    
    preview_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, {template.get('header_bg_color', '#0F172A')}, {template.get('header_gradient_end', '#1E3A5F')}); padding: 30px; text-align: center; }}
            .header img {{ max-width: 150px; height: auto; }}
            .header h1 {{ color: white; margin: 15px 0 0; font-size: 20px; }}
            .content {{ padding: 30px; color: #333; line-height: 1.6; }}
            .details {{ background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            .details p {{ margin: 8px 0; }}
            .footer {{ background: {template.get('footer_bg_color', '#F1F5F9')}; padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{sample_data['report_type']}</h1>
            </div>
            <div class="content">
                <p>{greeting}</p>
                <p>{intro}</p>
                <div class="details">
                    <p><strong>Report Number:</strong> {sample_data['report_number']}</p>
                    <p><strong>Date:</strong> {sample_data['report_date']}</p>
                    <p><strong>Equipment:</strong> {sample_data['equipment_details']}</p>
                </div>
                <p>{closing}</p>
                <p>{signature}<br/><strong>{company_name}</strong></p>
            </div>
            <div class="footer">
                <p>{footer}</p>
                {f'<p>© {datetime.now().year} {company_name}. All rights reserved.</p>' if template.get('show_copyright', True) else ''}
            </div>
        </div>
    </body>
    </html>
    """
    
    return {"html": preview_html, "template": template}


# ==================== ENGINEERS ====================

@router.get("/engineers")
async def get_engineers():
    """Get all engineers"""
    engineers = await db.engineers.find({}, {"_id": 0}).to_list(1000)
    return engineers


@router.post("/engineers")
async def create_engineer(engineer: EngineerCreate):
    """Create a new engineer"""
    new_engineer = Engineer(**engineer.model_dump())
    doc = new_engineer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.engineers.insert_one(doc)
    return doc


@router.put("/engineers/{engineer_id}")
async def update_engineer(engineer_id: str, updates: dict):
    """Update an engineer"""
    allowed_fields = {'name', 'email', 'phone', 'department', 'is_active'}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.engineers.update_one(
        {"id": engineer_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Engineer not found")
    
    updated = await db.engineers.find_one({"id": engineer_id}, {"_id": 0})
    return updated


@router.delete("/engineers/{engineer_id}")
async def delete_engineer(engineer_id: str):
    """Delete an engineer"""
    result = await db.engineers.delete_one({"id": engineer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Engineer not found")
    return {"message": "Engineer deleted successfully"}


# ==================== CATEGORIES ====================

@router.get("/categories")
async def get_categories():
    """Get all project categories"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    
    if not categories:
        # Return default categories
        default_categories = [
            {"id": "cat-1", "code": "PSS", "name": "Project Sales & Services", "is_active": True},
            {"id": "cat-2", "code": "AS", "name": "Annual Services", "is_active": True},
            {"id": "cat-3", "code": "OSS", "name": "One-time Sales & Services", "is_active": True},
            {"id": "cat-4", "code": "CS", "name": "Consumable Sales", "is_active": True},
        ]
        return default_categories
    
    return categories


@router.post("/categories")
async def create_category(category: CategoryCreate):
    """Create a new category"""
    new_category = Category(**category.model_dump())
    doc = new_category.model_dump()
    await db.categories.insert_one(doc)
    return doc


@router.put("/categories/{category_id}")
async def update_category(category_id: str, updates: dict):
    """Update a category"""
    allowed_fields = {'code', 'name', 'description', 'is_active'}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}


# ==================== STATUSES ====================

@router.get("/statuses")
async def get_statuses():
    """Get all project statuses"""
    statuses = await db.statuses.find({}, {"_id": 0}).to_list(1000)
    
    if not statuses:
        # Return default statuses
        default_statuses = [
            {"id": "status-1", "name": "Need to Start", "color": "#FCD34D", "order": 1, "is_active": True},
            {"id": "status-2", "name": "Ongoing", "color": "#60A5FA", "order": 2, "is_active": True},
            {"id": "status-3", "name": "Completed", "color": "#34D399", "order": 3, "is_active": True},
            {"id": "status-4", "name": "On Hold", "color": "#F87171", "order": 4, "is_active": True},
            {"id": "status-5", "name": "Cancelled", "color": "#9CA3AF", "order": 5, "is_active": True},
        ]
        return default_statuses
    
    return statuses


@router.post("/statuses")
async def create_status(status: StatusCreate):
    """Create a new status"""
    new_status = Status(**status.model_dump())
    doc = new_status.model_dump()
    await db.statuses.insert_one(doc)
    # Remove _id before returning (MongoDB adds it during insert)
    doc.pop('_id', None)
    return doc


@router.put("/statuses/{status_id}")
async def update_status(status_id: str, updates: dict):
    """Update a status"""
    allowed_fields = {'name', 'color', 'order', 'is_active'}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.statuses.update_one(
        {"id": status_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    
    updated = await db.statuses.find_one({"id": status_id}, {"_id": 0})
    return updated


@router.delete("/statuses/{status_id}")
async def delete_status(status_id: str):
    """Delete a status"""
    result = await db.statuses.delete_one({"id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    return {"message": "Status deleted successfully"}


# ==================== SEED ENGINEERS ====================

@router.post("/seed-engineers")
async def seed_engineers():
    """Seed engineers from existing project data"""
    projects = await db.projects.find({}, {"engineer_in_charge": 1, "_id": 0}).to_list(10000)
    unique_engineers = set(p.get('engineer_in_charge', '') for p in projects if p.get('engineer_in_charge'))
    
    existing = await db.engineers.find({}, {"name": 1, "_id": 0}).to_list(1000)
    existing_names = set(e.get('name', '') for e in existing)
    
    added = 0
    for name in unique_engineers:
        if name and name not in existing_names:
            engineer = Engineer(name=name)
            doc = engineer.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.engineers.insert_one(doc)
            added += 1
    
    return {"message": f"Added {added} engineers", "total": len(unique_engineers)}


# ==================== CLIENTS ====================

@router.get("/clients")
async def get_clients(customer_type: Optional[str] = None):
    """Get all clients, optionally filtered by customer_type (domestic/overseas)"""
    query = {}
    if customer_type:
        query["customer_type"] = customer_type
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return clients


@router.post("/clients")
async def create_client(client: ClientCreate):
    """Create a new client"""
    new_client = Client(**client.model_dump())
    doc = new_client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    # Remove _id before returning (MongoDB adds it during insert)
    doc.pop('_id', None)
    return doc


@router.put("/clients/{client_id}")
async def update_client(client_id: str, updates: dict):
    """Update a client"""
    allowed_fields = {'name', 'contact_person', 'email', 'phone', 'address', 'gst_number', 'country', 'customer_type', 'is_active'}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return updated


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}


@router.post("/seed-clients")
async def seed_clients():
    """Seed clients from existing project data"""
    projects = await db.projects.find({}, {"client": 1, "_id": 0}).to_list(10000)
    unique_clients = set(p.get('client', '') for p in projects if p.get('client'))
    
    existing = await db.clients.find({}, {"name": 1, "_id": 0}).to_list(1000)
    existing_names = set(c.get('name', '') for c in existing)
    
    added = 0
    for name in unique_clients:
        if name and name not in existing_names:
            client = Client(name=name)
            doc = client.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.clients.insert_one(doc)
            added += 1
    
    return {"message": f"Added {added} clients", "total": len(unique_clients)}


# ==================== VENDORS ====================

@router.get("/vendors")
async def get_vendors():
    """Get all vendors"""
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(1000)
    return vendors


@router.post("/vendors")
async def create_vendor(vendor: VendorCreate):
    """Create a new vendor"""
    new_vendor = Vendor(**vendor.model_dump())
    doc = new_vendor.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vendors.insert_one(doc)
    # Remove _id before returning (MongoDB adds it during insert)
    doc.pop('_id', None)
    return doc


@router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, updates: dict):
    """Update a vendor"""
    allowed_fields = {'name', 'contact_person', 'email', 'phone', 'address', 'is_active'}
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    updated = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    return updated


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str):
    """Delete a vendor"""
    result = await db.vendors.delete_one({"id": vendor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor deleted successfully"}


@router.post("/seed-vendors")
async def seed_vendors():
    """Seed vendors from existing project data"""
    projects = await db.projects.find({}, {"vendor": 1, "_id": 0}).to_list(10000)
    unique_vendors = set(p.get('vendor', '') for p in projects if p.get('vendor'))
    
    existing = await db.vendors.find({}, {"name": 1, "_id": 0}).to_list(1000)
    existing_names = set(v.get('name', '') for v in existing)
    
    added = 0
    for name in unique_vendors:
        if name and name not in existing_names:
            vendor = Vendor(name=name)
            doc = vendor.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.vendors.insert_one(doc)
            added += 1
    
    return {"message": f"Added {added} vendors", "total": len(unique_vendors)}
