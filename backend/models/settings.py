from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class OrganizationSettings(BaseModel):
    id: str = "org_settings"
    company_name: str = "Enerzia Power Solutions"
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    logo_url: Optional[str] = None
    financial_year_start: int = 4  # April
    currency: str = "INR"
    date_format: str = "DD/MM/YYYY"
    timezone: str = "Asia/Kolkata"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GeneralSettings(BaseModel):
    id: str = "general_settings"
    notification_email: bool = True
    auto_generate_pid: bool = True
    require_approval: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Engineer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EngineerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool = True

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class CategoryCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class Status(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#6B7280"
    order: int = 0
    is_active: bool = True

class StatusCreate(BaseModel):
    name: str
    color: str = "#6B7280"
    order: int = 0
    is_active: bool = True

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    is_active: bool = True

class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VendorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    is_active: bool = True
