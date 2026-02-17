from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import shutil
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Set
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import pandas as pd
import io
import random
import string
import asyncio
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import requests
from passlib.context import CryptContext
import jwt
import resend


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Allowed file extensions for PO attachments
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'}

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend Configuration for OTP emails
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket Connection Manager for real-time sync
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security bearer
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token - returns None if no valid token"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require authentication - raises 401 if not authenticated"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("user_id")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


async def require_admin(user: dict = Depends(require_auth)) -> dict:
    """Require admin or super_admin role"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(require_auth)) -> dict:
    """Require super_admin role"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


# Define Enums
class ProjectStatus(str, Enum):
    NEED_TO_START = "Need to Start"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    INVOICED = "Invoiced"
    PARTIALLY_INVOICED = "Partially Invoiced"
    CANCELLED = "Cancelled"


class ProjectCategory(str, Enum):
    PSS = "PSS"  # Project & Services
    AS = "AS"    # Asset Services
    OSS = "OSS"  # Other Sales & Services
    CS = "CS"    # Commercial Sales


# Define Models
class ActionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    assigned_to: str
    due_date: Optional[str] = None  # DD/MM/YYYY format
    status: str = "Pending"  # Pending, Completed


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pid_no: str
    category: str  # Changed to string to support custom categories
    department: Optional[str] = None  # Department code for access control
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path/URL for PO attachment
    client: str
    location: str
    project_name: str
    vendor: str
    status: str  # Changed to string to support custom statuses
    engineer_in_charge: str
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items with qty, unit, status
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks for Planning & Execution
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0  # Renamed from profit_loss
    weekly_actions: Optional[str] = None
    linked_order_id: Optional[str] = None  # Sales order ID for Order Lifecycle
    linked_order_no: Optional[str] = None  # Sales order number
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    pid_no: str
    category: str  # Changed to string to support custom categories
    department: Optional[str] = None  # Department code for access control
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path for PO attachment
    client: str
    location: str
    project_name: str
    vendor: str
    status: str  # Changed to string to support custom statuses
    engineer_in_charge: str
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks
    po_amount: float = 0
    balance: float = 0
    invoiced_amount: float = 0
    completion_percentage: float = 0
    this_week_billing: float = 0
    budget: float = 0
    actual_expenses: float = 0
    pid_savings: float = 0  # Renamed from profit_loss
    weekly_actions: Optional[str] = None
    linked_order_id: Optional[str] = None  # Sales order ID
    linked_order_no: Optional[str] = None  # Sales order number


class ProjectUpdate(BaseModel):
    category: Optional[str] = None  # Changed to string to support custom categories
    po_number: Optional[str] = None
    po_attachment: Optional[str] = None  # File path for PO attachment
    client: Optional[str] = None
    location: Optional[str] = None
    project_name: Optional[str] = None
    vendor: Optional[str] = None
    status: Optional[str] = None  # Changed to string to support custom statuses
    engineer_in_charge: Optional[str] = None
    project_date: Optional[str] = None  # Project start date in DD/MM/YYYY format
    completion_date: Optional[str] = None  # Target completion date in DD/MM/YYYY format
    action_items: Optional[List[dict]] = None  # List of action items
    work_items: Optional[List[dict]] = None  # Work Summary / Line Items
    scheduled_tasks: Optional[List[dict]] = None  # Daily scheduled tasks
    po_amount: Optional[float] = None
    balance: Optional[float] = None
    invoiced_amount: Optional[float] = None
    completion_percentage: Optional[float] = None
    this_week_billing: Optional[float] = None
    budget: Optional[float] = None
    actual_expenses: Optional[float] = None
    pid_savings: Optional[float] = None  # Renamed from profit_loss
    weekly_actions: Optional[str] = None
    linked_order_id: Optional[str] = None  # Sales order ID
    linked_order_no: Optional[str] = None  # Sales order number


class DashboardStats(BaseModel):
    total_projects: int
    total_billing: float
    pending_pos: int
    active_projects: int
    this_week_billing: float
    completion_avg: float
    category_breakdown: dict
    status_breakdown: dict


class WeeklyBilling(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    week: str
    pss: float
    as_: float = Field(alias="as")
    oss: float
    cs: float
    total: float


# Department Team Members (kept here as they're used in department routes)
class DepartmentTeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None  # URL to member's photo
    department: str  # projects, sales, purchase, exports, finance, hr, operations, accounts
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DepartmentTeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool = True


# Work Completion Certificate Models
class WorkItem(BaseModel):
    description: str
    unit: str = ""
    order_quantity: float = 0
    billed_quantity: float = 0
    unit_rate: float = 0
    total_amount: float = 0
    status: str = "Completed"
    remarks: str = ""


class AnnexureItem(BaseModel):
    type: str  # "delivery_challan", "drawing_ref", "transport_details", "eway_bill", "other_document"
    description: str = ""  # Description of the annexure
    number: str  # Reference number
    dated: str = ""  # Date if applicable
    attachment_url: str = ""  # URL to attached PDF document


class WorkCompletionCertificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_no: str
    project_id: str  # Link to project
    
    # Project Details (auto-filled from project)
    pid_no: str
    project_name: str
    customer_name: str
    customer_representative: str = ""
    site_location: str
    customer_address: str = ""
    
    # Order Details
    order_no: str = ""
    order_dated: str = ""
    order_amount: float = 0
    billed_amount: float = 0
    
    # Dates
    work_started_on: str
    completed_on: str
    certificate_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%d/%m/%Y"))
    
    # Vendor Details
    vendor_name: str = "Enerzia Power Solutions"
    vendor_address: str = "Chennai, Tamil Nadu"
    executed_by: str = ""
    supervised_by: str = ""
    
    # Work Items
    work_items: List[WorkItem] = []
    
    # Compliance checklist
    quality_compliance: str = "Complied"
    as_built_drawings: str = "Submitted"
    statutory_compliance: str = "Submitted"
    site_measurements: str = "Completed"
    snag_points: str = "None"
    
    # Feedback
    feedback_comments: str = ""
    
    # Annexures
    annexures: List[AnnexureItem] = []
    
    # Status
    status: str = "Draft"  # Draft, Submitted, Approved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class WorkCompletionCreate(BaseModel):
    project_id: str
    work_started_on: str
    completed_on: str
    order_no: Optional[str] = ""
    order_dated: Optional[str] = ""
    order_amount: Optional[float] = 0
    billed_amount: Optional[float] = 0
    customer_representative: Optional[str] = ""
    customer_address: Optional[str] = ""
    executed_by: Optional[str] = ""
    supervised_by: Optional[str] = ""
    work_items: List[dict] = []
    quality_compliance: Optional[str] = "Complied"
    as_built_drawings: Optional[str] = "Submitted"
    statutory_compliance: Optional[str] = "Submitted"
    site_measurements: Optional[str] = "Completed"
    snag_points: Optional[str] = "None"
    feedback_comments: Optional[str] = ""
    annexures: List[dict] = []


# Weekly Meeting Models
class ActionItem(BaseModel):
    action: str
    assigned_to: str
    due_date: str
    status: str = "Pending"  # Pending, In Progress, Completed


class WeeklyMeeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meeting_id: str  # e.g., PROJ-M9-W41
    department: str  # ACCOUNTS, PURCHASE, PROJECTS & SERVICES, SALES & MARKETING, EXPORTS, FINANCE, HR & ADMIN
    department_rep: str
    meeting_agenda: str = ""
    
    # Meeting Details
    meeting_attendees: str = ""
    meeting_date: str  # DD-MM-YYYY
    meeting_chair: str = "Subramani"
    meeting_time: str = ""
    week_number: int = 1  # Week 1-5 of the month
    month: int = 1
    year: int = 2025
    
    # Meeting Content
    meeting_notes: str = ""
    decisions: str = ""
    issues: str = ""
    weekly_highlights: str = ""
    
    # Action Items
    action_items: List[dict] = []
    
    # Targets and Achievements (for departments like Projects, Sales)
    billing_target: float = 0
    billing_achieved: float = 0
    order_target: float = 0
    order_achieved: float = 0
    
    # Department-specific data stored as JSON
    department_data: dict = {}
    
    # Status
    status: str = "Draft"  # Draft, Completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class WeeklyMeetingCreate(BaseModel):
    department: str
    department_rep: str
    meeting_agenda: Optional[str] = ""
    meeting_attendees: Optional[str] = ""
    meeting_date: str
    meeting_chair: Optional[str] = "Subramani"
    meeting_time: Optional[str] = ""
    week_number: Optional[int] = 1
    month: Optional[int] = None
    year: Optional[int] = None
    meeting_notes: Optional[str] = ""
    decisions: Optional[str] = ""
    issues: Optional[str] = ""
    weekly_highlights: Optional[str] = ""
    action_items: List[dict] = []
    billing_target: Optional[float] = 0
    billing_achieved: Optional[float] = 0
    order_target: Optional[float] = 0
    order_achieved: Optional[float] = 0
    department_data: Optional[dict] = {}


class WeeklyMeetingUpdate(BaseModel):
    department_rep: Optional[str] = None
    meeting_agenda: Optional[str] = None
    meeting_attendees: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_chair: Optional[str] = None
    meeting_time: Optional[str] = None
    week_number: Optional[int] = None
    meeting_notes: Optional[str] = None
    decisions: Optional[str] = None
    issues: Optional[str] = None
    weekly_highlights: Optional[str] = None
    action_items: Optional[List[dict]] = None
    billing_target: Optional[float] = None
    billing_achieved: Optional[float] = None
    order_target: Optional[float] = None
    order_achieved: Optional[float] = None
    department_data: Optional[dict] = None
    status: Optional[str] = None


# User Models for Authentication
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"  # Can view all departments
    CEO_OWNER = "ceo_owner"  # CEO/Owner - approves payment requests
    ADMIN = "admin"  # Department head - can manage own department
    USER = "user"  # Department member - can view own department only


# Department configuration
DEPARTMENTS = [
    {"code": "ACCOUNTS", "name": "Accounts", "head": "Kavitha"},
    {"code": "PURCHASE", "name": "Purchase", "head": "Nathiya"},
    {"code": "PROJECTS", "name": "Projects & Services", "head": "Giftson"},
    {"code": "SALES", "name": "Sales & Marketing", "head": "Haminullah"},
    {"code": "EXPORTS", "name": "Exports", "head": "Saleem Basha"},
    {"code": "FINANCE", "name": "Finance", "head": "Mr. Mani"},
    {"code": "HR", "name": "HR & Admin", "head": "Saleem Basha"},
    {"code": "OPERATIONS", "name": "Operations", "head": "Saleem Basha"},
]


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password: str  # Hashed
    role: str = UserRole.USER
    department: Optional[str] = None  # Department code (e.g., "PROJECTS")
    can_view_departments: List[str] = []  # Additional departments user can view (for mutual sharing)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # ID of admin who invited


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    department: Optional[str] = None


class UserInvite(BaseModel):
    email: str
    name: str
    role: str = UserRole.USER
    department: Optional[str] = None
    can_view_departments: List[str] = []


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    can_view_departments: List[str] = []
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


# ==================== PROJECT REQUIREMENTS MODELS ====================

class RequirementType(str, Enum):
    MATERIAL_PURCHASE = "Material Purchase"
    DELIVERY = "Delivery"
    VENDOR_PO = "Vendor P.O."
    MANPOWER = "Manpower Arrangements"
    PAYMENT_REQUEST = "Payment Request"
    DOCUMENTATION = "Documentation"
    INSPECTION = "Inspection"
    APPROVAL = "Approval"
    OTHER = "Other"

class RequirementStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"
    CANCELLED = "Cancelled"

class RequirementPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

class ProjectRequirement(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: Optional[str] = None  # Made optional for non-project requests
    project_pid: Optional[str] = None
    project_name: Optional[str] = None
    requirement_type: str = "Other"
    description: str
    created_by_department: str = "PROJECTS"  # Department that created the requirement
    assigned_to_department: str  # Department responsible
    assigned_to_person: Optional[str] = None  # Specific person
    requested_by: Optional[str] = None  # Who created the requirement
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    notes: Optional[str] = None
    reply: Optional[str] = None  # Response from assigned department
    replied_at: Optional[str] = None  # When response was given
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[str] = None

class ProjectRequirementCreate(BaseModel):
    project_id: Optional[str] = None  # Made optional
    requirement_type: str = "Other"
    description: str
    created_by_department: str = "PROJECTS"  # Source department
    assigned_to_department: str
    assigned_to_person: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    notes: Optional[str] = None

class ProjectRequirementUpdate(BaseModel):
    requirement_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to_department: Optional[str] = None
    assigned_to_person: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    reply: Optional[str] = None  # Response from assigned department
    replied_at: Optional[str] = None
    response: Optional[str] = None  # Latest response text
    replies: Optional[List[dict]] = None  # Array of reply objects


# ==================== DEPARTMENT TASKS MODELS ====================

class DepartmentTask(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    task_type: str = "General"  # General, Request, Follow-up, Urgent, etc.
    created_by_department: str  # Department that created the task
    created_by_user: Optional[str] = None  # User who created
    assigned_to_department: str  # Department responsible for the task
    assigned_to_person: Optional[str] = None  # Specific person assigned
    due_date: Optional[str] = None
    priority: str = "Medium"  # Low, Medium, High, Urgent
    status: str = "Pending"  # Pending, In Progress, Completed, On Hold, Cancelled
    action_taken: Optional[str] = None  # Notes about actions taken
    completed_by: Optional[str] = None  # Who completed the task
    reference_type: Optional[str] = None  # Project, Order, Invoice, etc.
    reference_id: Optional[str] = None  # ID of the reference
    reference_name: Optional[str] = None  # Name/description of reference
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[str] = None

class DepartmentTaskCreate(BaseModel):
    title: str
    description: str
    task_type: str = "General"
    assigned_to_department: str
    assigned_to_person: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reference_name: Optional[str] = None

class DepartmentTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    assigned_to_department: Optional[str] = None
    assigned_to_person: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    action_taken: Optional[str] = None


# ==================== NOTIFICATION MODEL (for creating notifications) ====================

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    title: str
    message: str
    department: str
    from_department: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


# ==================== EXPORT CUSTOMER MODELS ====================

class ExportCustomer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # Short code like HAWA, JAL, etc.
    country: str
    currency: str = "USD"
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    iec_no: Optional[str] = None  # Import Export Code
    is_active: bool = True
    total_orders: int = 0
    total_value: float = 0
    outstanding_amount: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExportCustomerCreate(BaseModel):
    name: str
    code: str
    country: str
    currency: str = "USD"
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    iec_no: Optional[str] = None


class ExportOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_no: str  # PO Number like 25-20222190
    customer_id: str
    customer_name: str
    country: str
    currency: str = "USD"
    order_date: datetime
    order_value: float
    status: str = "pending"  # pending, in_progress, completed, partial_completed, cancelled
    quote_reference: Optional[str] = None  # Quote reference
    invoice_no: Optional[str] = None
    shipping_bill_no: Optional[str] = None
    awb_no: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExportOrderCreate(BaseModel):
    order_no: str
    customer_id: str
    order_date: str
    order_value: float
    status: str = "pending"
    quote_reference: Optional[str] = None
    remarks: Optional[str] = None


class ExportInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_no: str  # Like INV/EX/25-26/001
    customer_id: str
    customer_name: str
    country: str
    currency: str = "USD"
    invoice_date: datetime
    invoice_value: float
    inr_value: float = 0
    shipping_bill_no: Optional[str] = None
    shipping_bill_date: Optional[datetime] = None
    sb_fob_value: float = 0
    port_code: str = "INMAA4"
    awb_no: Optional[str] = None
    ebrc_no: Optional[str] = None
    rodtep: float = 0
    payment_status: str = "pending"  # pending, partial, received
    payment_received: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExportPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    country: str
    invoice_references: str  # Which invoices this payment is against
    irm_no: str  # IRM number
    irm_date: datetime
    amount_usd: float
    amount_inr: float
    bank_name: str
    received_date: datetime
    month: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Helper function to check department access
def can_access_department(user: dict, target_department: str) -> bool:
    """Check if user can access a specific department's data"""
    if user.get("role") == UserRole.SUPER_ADMIN:
        return True
    if user.get("department") == target_department:
        return True
    if target_department in user.get("can_view_departments", []):
        return True
    return False


def get_user_departments(user: dict) -> List[str]:
    """Get list of all departments a user can access"""
    if user.get("role") == UserRole.SUPER_ADMIN:
        return [d["code"] for d in DEPARTMENTS]
    
    departments = []
    if user.get("department"):
        departments.append(user["department"])
    departments.extend(user.get("can_view_departments", []))
    return list(set(departments))


# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token with department info
    token = create_access_token({
        "user_id": user["id"], 
        "email": user["email"], 
        "role": user["role"],
        "department": user.get("department"),
        "can_view_departments": user.get("can_view_departments", [])
    })
    
    # Return user without password
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "department": user.get("department"),
        "can_view_departments": user.get("can_view_departments", []),
        "is_active": user["is_active"],
        "created_at": user.get("created_at", datetime.now(timezone.utc).isoformat())
    }
    
    return {"token": token, "user": user_response}


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register first super admin user (only works when no users exist)"""
    # Check if any users exist
    existing_users = await db.users.count_documents({})
    if existing_users > 0:
        raise HTTPException(status_code=400, detail="Registration closed. Please contact an admin for an invite.")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create first user as SUPER_ADMIN (can see all departments)
    user = User(
        email=user_data.email.lower(),
        name=user_data.name,
        password=hash_password(user_data.password),
        role=UserRole.SUPER_ADMIN,
        department=None,  # Super admin has no specific department
        can_view_departments=[],
        is_active=True
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token({
        "user_id": user.id, 
        "email": user.email, 
        "role": user.role,
        "department": user.department,
        "can_view_departments": user.can_view_departments
    })
    
    user_response = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "department": user.department,
        "can_view_departments": user.can_view_departments,
        "is_active": user.is_active,
        "created_at": doc['created_at']
    }
    
    return {"token": token, "user": user_response}


@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(require_auth)):
    """Get current logged in user info"""
    # Include accessible departments
    accessible_depts = get_user_departments(current_user)
    current_user["accessible_departments"] = accessible_depts
    return current_user


@api_router.get("/auth/check")
async def check_auth_status():
    """Check if any users exist (for initial setup)"""
    user_count = await db.users.count_documents({})
    return {
        "has_users": user_count > 0,
        "needs_setup": user_count == 0
    }


# Get all departments
@api_router.get("/departments")
async def get_all_departments():
    """Get list of all departments"""
    return DEPARTMENTS


# ==================== USER MANAGEMENT (ADMIN ONLY) ====================

@api_router.get("/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Get all users - Super admin sees all, Admin sees own department"""
    if current_user.get("role") == UserRole.SUPER_ADMIN:
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    else:
        # Admin can see users in their department + users they invited
        user_dept = current_user.get("department")
        users = await db.users.find(
            {"$or": [
                {"department": user_dept},
                {"created_by": current_user["id"]}
            ]},
            {"_id": 0, "password": 0}
        ).to_list(1000)
    return users


@api_router.post("/users/invite")
async def invite_user(invite_data: UserInvite, current_user: dict = Depends(require_admin)):
    """Invite a new user - Admin can invite to own department, Super Admin to any"""
    # Check if email already exists
    existing = await db.users.find_one({"email": invite_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate department access
    target_dept = invite_data.department
    if current_user.get("role") != UserRole.SUPER_ADMIN:
        # Regular admin can only invite to their own department
        if target_dept and target_dept != current_user.get("department"):
            raise HTTPException(status_code=403, detail="You can only invite users to your own department")
        target_dept = current_user.get("department")
    
    # Admin can only create users or other admins (not super_admins)
    if invite_data.role == UserRole.SUPER_ADMIN and current_user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can create Super Admin users")
    
    # Generate a temporary password (first 8 chars of UUID)
    temp_password = str(uuid.uuid4())[:8]
    
    user = User(
        email=invite_data.email.lower(),
        name=invite_data.name,
        password=hash_password(temp_password),
        role=invite_data.role,
        department=target_dept,
        can_view_departments=invite_data.can_view_departments,
        is_active=True,
        created_by=current_user["id"]
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    return {
        "message": f"User invited successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "department": user.department,
            "can_view_departments": user.can_view_departments
        },
        "temporary_password": temp_password  # In production, send via email
    }


@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: dict, current_user: dict = Depends(require_admin)):
    """Update user details (admin only)"""
    # Prevent admin from deactivating themselves
    if user_id == current_user["id"] and update_data.get("is_active") == False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    # Only allow certain fields to be updated
    allowed_fields = {"name", "role", "is_active", "department", "can_view_departments"}
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated_user


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    # Prevent admin from deleting themselves
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@api_router.put("/users/{user_id}/password")
async def reset_user_password(user_id: str, current_user: dict = Depends(require_admin)):
    """Reset user password to a new temporary password (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new temporary password
    temp_password = str(uuid.uuid4())[:8]
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hash_password(temp_password)}}
    )
    
    return {
        "message": "Password reset successfully",
        "temporary_password": temp_password
    }


@api_router.put("/auth/change-password")
async def change_own_password(password_data: dict, current_user: dict = Depends(require_auth)):
    """Change own password"""
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new password required")
    
    # Verify current password
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(current_password, user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    
    return {"message": "Password changed successfully"}


# ==================== FORGOT PASSWORD / OTP ROUTES ====================

def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))


@api_router.post("/auth/forgot-password")
async def request_password_reset(data: dict):
    """Send OTP to user's email for password reset"""
    email = data.get("email", "").lower().strip()
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, an OTP will be sent"}
    
    # Generate OTP
    otp = generate_otp()
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)  # OTP valid for 10 minutes
    
    # Store OTP in database
    await db.password_resets.delete_many({"email": email})  # Remove old OTPs
    await db.password_resets.insert_one({
        "email": email,
        "otp": otp,
        "expires_at": otp_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    
    # Send OTP via email
    if RESEND_API_KEY:
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0F172A; margin: 0;">Enerzia Power Solutions</h1>
                    <p style="color: #64748B; margin-top: 5px;">Password Reset Request</p>
                </div>
                
                <div style="background: #F8FAFC; border-radius: 12px; padding: 30px; text-align: center;">
                    <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                        Hi {user.get('name', 'User')}, your OTP for password reset is:
                    </p>
                    <div style="background: #0F172A; color: white; font-size: 32px; font-weight: bold; 
                                letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block;">
                        {otp}
                    </div>
                    <p style="color: #64748B; font-size: 14px; margin-top: 20px;">
                        This OTP will expire in 10 minutes.
                    </p>
                </div>
                
                <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 30px;">
                    If you didn't request this, please ignore this email.
                </p>
            </div>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": "Password Reset OTP - Enerzia Portal",
                "html": html_content
            }
            
            # Send email in thread to keep non-blocking
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"OTP email sent to {email}")
            
        except Exception as e:
            logger.error(f"Failed to send OTP email: {str(e)}")
            # Log OTP for development/testing when email fails
            logger.info(f"FALLBACK - OTP for {email}: {otp}")
    else:
        logger.warning("RESEND_API_KEY not configured. OTP not sent via email.")
        # For development, log the OTP
        logger.info(f"DEV MODE - OTP for {email}: {otp}")
    
    return {"message": "If the email exists, an OTP will be sent"}


@api_router.post("/auth/verify-otp")
async def verify_otp(data: dict):
    """Verify OTP for password reset"""
    email = data.get("email", "").lower().strip()
    otp = data.get("otp", "").strip()
    
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")
    
    # Find OTP record
    otp_record = await db.password_resets.find_one({
        "email": email,
        "otp": otp,
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Generate a reset token for the next step
    reset_token = str(uuid.uuid4())
    
    # Mark OTP as used and store reset token
    await db.password_resets.update_one(
        {"email": email, "otp": otp},
        {"$set": {
            "used": True,
            "reset_token": reset_token,
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        }}
    )
    
    return {"message": "OTP verified successfully", "reset_token": reset_token}


@api_router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Reset password using the reset token"""
    email = data.get("email", "").lower().strip()
    reset_token = data.get("reset_token", "").strip()
    new_password = data.get("new_password", "")
    
    if not email or not reset_token or not new_password:
        raise HTTPException(status_code=400, detail="Email, reset token, and new password are required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find reset record
    reset_record = await db.password_resets.find_one({
        "email": email,
        "reset_token": reset_token,
        "used": True
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset request")
    
    # Check token expiry
    token_expires = datetime.fromisoformat(reset_record["token_expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please start over.")
    
    # Update user password
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": hash_password(new_password)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete the reset record
    await db.password_resets.delete_one({"email": email})
    
    return {"message": "Password reset successfully. You can now login with your new password."}


# ==================== WEBSOCKET FOR REAL-TIME SYNC ====================

@app.websocket("/ws/sync")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data synchronization"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_json()
            # Echo back or handle specific message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def broadcast_update(entity_type: str, action: str, data: dict = None):
    """Broadcast data updates to all connected clients"""
    message = {
        "type": "data_update",
        "entity": entity_type,
        "action": action,  # create, update, delete
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.broadcast(message)


@api_router.post("/projects/remove-duplicates")
async def remove_duplicate_projects():
    """Remove duplicate PIDs, keeping only the first occurrence"""
    all_projects = await db.projects.find({}, {"_id": 1, "pid_no": 1, "created_at": 1}).to_list(10000)
    
    # Group by PID
    pid_groups = {}
    for project in all_projects:
        pid = project.get('pid_no')
        if pid not in pid_groups:
            pid_groups[pid] = []
        pid_groups[pid].append(project)
    
    # Find duplicates and remove all but the first
    removed_count = 0
    for pid, projects in pid_groups.items():
        if len(projects) > 1:
            # Sort by created_at to keep the oldest
            projects_sorted = sorted(projects, key=lambda x: x.get('created_at', ''))
            # Remove all but the first
            for project in projects_sorted[1:]:
                await db.projects.delete_one({"_id": project['_id']})
                removed_count += 1
    
    return {
        "message": f"Removed {removed_count} duplicate projects",
        "removed": removed_count
    }


# Routes
@api_router.get("/")
async def root():
    return {"message": "Weekly Review Dashboard API"}


@api_router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics and status"""
    from utils.cache import cache
    return {
        "status": "ok",
        "cache": cache.get_stats()
    }


@api_router.post("/cache/invalidate")
async def invalidate_all_caches(pattern: str = "*"):
    """Invalidate cache entries matching pattern (admin only)"""
    from utils.cache import cache
    count = await cache.invalidate_pattern(pattern)
    return {
        "message": f"Invalidated {count} cache entries",
        "pattern": pattern
    }


# Get next PID number
@api_router.get("/projects/next-pid")
async def get_next_pid(financial_year: Optional[str] = None):
    """Generate next consecutive PID number for the current/specified financial year"""
    
    # Determine financial year
    if not financial_year:
        # Auto-detect based on current date (April to March)
        current_date = datetime.now()
        if current_date.month >= 4:  # April onwards
            year1 = current_date.year % 100
            year2 = (current_date.year + 1) % 100
        else:  # Jan-March
            year1 = (current_date.year - 1) % 100
            year2 = current_date.year % 100
        financial_year = f"{year1:02d}-{year2:02d}"
    
    # Get all projects for this financial year
    pattern = f"^PID/{financial_year}/"
    projects_this_year = await db.projects.find(
        {"pid_no": {"$regex": pattern}},
        {"pid_no": 1, "_id": 0}
    ).to_list(10000)
    
    if not projects_this_year:
        # First project of this financial year
        return {"next_pid": f"PID/{financial_year}/001", "financial_year": financial_year}
    
    # Extract all numbers for this financial year and find max
    max_num = 0
    for project in projects_this_year:
        try:
            pid = project.get("pid_no", "")
            parts = pid.split("/")
            if len(parts) == 3 and parts[1] == financial_year:
                num = int(parts[2])
                if num > max_num:
                    max_num = num
        except:
            continue
    
    # Generate next PID
    next_num = max_num + 1
    return {
        "next_pid": f"PID/{financial_year}/{next_num:03d}",
        "financial_year": financial_year
    }


# Upload PO Attachment
@api_router.post("/upload-po")
async def upload_po_attachment(file: UploadFile = File(...)):
    """Upload a PO attachment file"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 10MB limit. Current size: {len(contents) / (1024*1024):.2f}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename.replace(' ', '_')}"
    file_path = UPLOADS_DIR / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    return {
        "filename": safe_filename,
        "original_filename": file.filename,
        "path": f"/uploads/{safe_filename}"
    }


# Generic file upload endpoint
@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(default="general")
):
    """
    Generic file upload endpoint for various categories:
    - statutory_document: PDF files for AMC statutory documents
    - calibration_certificate: Calibration certificates
    - general: General file uploads
    """
    # Define allowed extensions per category
    category_extensions = {
        "statutory_document": {'.pdf'},
        "calibration_certificate": {'.pdf'},
        "general": ALLOWED_EXTENSIONS
    }
    
    allowed = category_extensions.get(category, ALLOWED_EXTENSIONS)
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed for {category}. Allowed types: {', '.join(allowed)}"
        )
    
    # Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 10MB limit. Current size: {len(contents) / (1024*1024):.2f}MB"
        )
    
    # Create category subdirectory
    category_dir = UPLOADS_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}_{file.filename.replace(' ', '_')}"
    file_path = category_dir / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Return file URL
    file_url = f"/api/uploads/{category}/{safe_filename}"
    
    return {
        "success": True,
        "filename": safe_filename,
        "original_filename": file.filename,
        "file_url": file_url,
        "url": file_url,  # Alternative key for compatibility
        "category": category,
        "size": len(contents),
        "content_type": file.content_type
    }


# Serve uploaded files from category subdirectories
@api_router.get("/uploads/{category}/{filename}")
async def get_uploaded_file_by_category(category: str, filename: str):
    """Serve uploaded files from category subdirectories"""
    file_path = UPLOADS_DIR / category / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(file_path, "rb"),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# Serve uploaded files
@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(file_path, "rb"),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


# Projects CRUD
@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    # Check for duplicate PID
    existing = await db.projects.find_one({"pid_no": project.pid_no}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with PID {project.pid_no} already exists. Please use a different PID."
        )
    
    project_dict = project.model_dump()
    
    # Calculate PID expenses
    project_dict['pid_savings'] = project_dict.get('budget', 0) - project_dict.get('actual_expenses', 0)
    
    # Auto-calculate balance amount = PO Amount - Invoiced Amount
    project_dict['balance'] = project_dict.get('po_amount', 0) - project_dict.get('invoiced_amount', 0)
    
    project_obj = Project(**project_dict)
    
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.projects.insert_one(doc)
    
    # If linked to a sales order, update the order_lifecycle with linked project
    if project_dict.get('linked_order_id'):
        await db.order_lifecycle.update_one(
            {"sales_order_id": project_dict['linked_order_id']},
            {"$set": {
                "linked_project_id": project_obj.id,
                "linked_project_pid": project_obj.pid_no,
                "updated_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
    
    # Broadcast real-time update
    await broadcast_update("project", "create", {"id": project_obj.id, "pid_no": project_obj.pid_no})
    
    return project_obj


@api_router.get("/projects", response_model=List[Project])
async def get_projects(
    status: Optional[str] = None, 
    category: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query['status'] = status
    if category:
        query['category'] = category
    
    # Apply department filter based on user access
    if current_user:
        accessible_depts = get_user_departments(current_user)
        # If user has limited access, filter by their departments
        if current_user.get("role") != "super_admin":
            if accessible_depts:
                query['department'] = {"$in": accessible_depts + [None, ""]}  # Include projects without department
    
    # Additional department filter from query param
    if department:
        query['department'] = department
    
    # Sort by created_at descending (newest first)
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        # Auto-calculate balance amount = PO Amount - Invoiced Amount
        project['balance'] = project.get('po_amount', 0) - project.get('invoiced_amount', 0)
    
    return projects


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check department access
    if current_user and current_user.get("role") != "super_admin":
        project_dept = project.get("department")
        if project_dept and not can_access_department(current_user, project_dept):
            raise HTTPException(status_code=403, detail="Access denied to this project")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    
    return project


# Get This Week Billing Breakdown
@api_router.get("/dashboard/this-week-breakdown")
async def get_this_week_breakdown():
    """Get detailed breakdown of this week's billing by project"""
    projects = await db.projects.find(
        {"this_week_billing": {"$gt": 0}},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "this_week_billing": 1, "category": 1}
    ).to_list(1000)
    
    total = sum(p.get('this_week_billing', 0) for p in projects)
    
    return {
        "total": total,
        "count": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('this_week_billing', 0), reverse=True)
    }


# Get Active Projects Breakdown
@api_router.get("/dashboard/active-projects-breakdown")
async def get_active_projects_breakdown():
    """Get detailed breakdown of active (ongoing) projects"""
    projects = await db.projects.find(
        {"status": "Ongoing"},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "completion_percentage": 1, "category": 1, "engineer_in_charge": 1}
    ).to_list(1000)
    
    return {
        "total": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('completion_percentage', 0))
    }


# Get Total Billing Breakdown  
@api_router.get("/dashboard/total-billing-breakdown")
async def get_total_billing_breakdown():
    """Get detailed breakdown of total billing by project"""
    projects = await db.projects.find(
        {"po_amount": {"$gt": 0}},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "po_amount": 1, "invoiced_amount": 1, "category": 1}
    ).to_list(1000)
    
    # Calculate balance for each project: PO Amount - Invoiced Amount
    for p in projects:
        p['balance'] = p.get('po_amount', 0) - p.get('invoiced_amount', 0)
    
    total_po = sum(p.get('po_amount', 0) for p in projects)
    total_invoiced = sum(p.get('invoiced_amount', 0) for p in projects)
    total_balance = total_po - total_invoiced  # Correct calculation
    
    return {
        "total_po_amount": total_po,
        "total_invoiced": total_invoiced,
        "total_balance": total_balance,
        "count": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('po_amount', 0), reverse=True)
    }


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, update_data: ProjectUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Auto-set completion_percentage to 100 when status is Completed
    if update_dict.get('status') == 'Completed':
        update_dict['completion_percentage'] = 100
    
    # Recalculate PID expenses if budget or expenses changed
    if 'budget' in update_dict or 'actual_expenses' in update_dict:
        existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Project not found")
        
        budget = update_dict.get('budget', existing.get('budget', 0))
        expenses = update_dict.get('actual_expenses', existing.get('actual_expenses', 0))
        update_dict['pid_savings'] = budget - expenses
    
    # Calculate balance amount (PO Amount - Invoiced Amount)
    if 'po_amount' in update_dict or 'invoiced_amount' in update_dict:
        existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if existing:
            po_amount = update_dict.get('po_amount', existing.get('po_amount', 0))
            invoiced_amount = update_dict.get('invoiced_amount', existing.get('invoiced_amount', 0))
            update_dict['balance'] = po_amount - invoiced_amount
    
    # Update timestamp
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated_project.get('created_at'), str):
        updated_project['created_at'] = datetime.fromisoformat(updated_project['created_at'])
    if isinstance(updated_project.get('updated_at'), str):
        updated_project['updated_at'] = datetime.fromisoformat(updated_project['updated_at'])
    
    # Broadcast real-time update
    await broadcast_update("project", "update", {"id": project_id})
    
    return updated_project


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Broadcast real-time update
    await broadcast_update("project", "delete", {"id": project_id})
    
    return {"message": "Project deleted successfully"}


# Dashboard Statistics
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    total_projects = len(projects)
    total_billing = sum(p.get('po_amount', 0) for p in projects)
    pending_pos = sum(1 for p in projects if not p.get('po_number') or p.get('po_number') == '')
    
    # Fix: Active projects should be ALL non-completed projects, not just "Ongoing"
    active_projects = sum(1 for p in projects if p.get('status') != 'Completed')
    this_week_billing = sum(p.get('this_week_billing', 0) for p in projects)
    
    # Fix: Calculate completion average only for non-completed projects
    non_completed_projects = [p for p in projects if p.get('status') != 'Completed']
    completion_percentages = [p.get('completion_percentage', 0) for p in non_completed_projects]
    completion_avg = sum(completion_percentages) / len(completion_percentages) if completion_percentages else 0
    
    # Category breakdown
    category_breakdown = {}
    for cat in ProjectCategory:
        cat_projects = [p for p in projects if p.get('category') == cat.value]
        category_breakdown[cat.value] = {
            'count': len(cat_projects),
            'amount': sum(p.get('po_amount', 0) for p in cat_projects)
        }
    
    # Status breakdown
    status_breakdown = {}
    for status in ProjectStatus:
        status_count = sum(1 for p in projects if p.get('status') == status.value)
        status_breakdown[status.value] = status_count
    
    return DashboardStats(
        total_projects=total_projects,
        total_billing=total_billing,
        pending_pos=pending_pos,
        active_projects=active_projects,
        this_week_billing=this_week_billing,
        completion_avg=completion_avg,
        category_breakdown=category_breakdown,
        status_breakdown=status_breakdown
    )




# Excel Export
@api_router.get("/projects/export/excel")
async def export_projects_excel():
    """Export all projects to Excel"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    # Convert to DataFrame
    df = pd.DataFrame(projects)
    
    # Reorder columns
    column_order = [
        'pid_no', 'category', 'po_number', 'client', 'location', 'project_name',
        'vendor', 'status', 'engineer_in_charge', 'po_amount', 'balance',
        'invoiced_amount', 'completion_percentage', 'this_week_billing',
        'budget', 'actual_expenses', 'pid_savings', 'weekly_actions'
    ]
    
    # Keep only columns that exist
    available_cols = [col for col in column_order if col in df.columns]
    df = df[available_cols]
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Projects', index=False)
        
        # Get workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Projects']
        
        # Style headers
        for cell in worksheet[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        
        # Auto-adjust column widths
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=projects_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        }
    )


# Excel Import
@api_router.post("/projects/import/excel")
async def import_projects_excel(file: UploadFile = File(...)):
    """
    Import projects from Excel file with smart sync:
    1. REMOVES all existing non-completed (ongoing) projects
    2. UPDATES existing PIDs if they exist (including completed projects)
    3. ADDS new PIDs from Excel
    4. Keeps completed projects that are NOT in Excel unchanged
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Make column names case-insensitive and strip spaces
        df.columns = df.columns.str.strip().str.lower()
        
        # Map common column variations
        column_mapping = {
            'pid no': 'pid_no',
            'pid_no': 'pid_no',
            'pid': 'pid_no',
            'project name': 'project_name',
            'projectname': 'project_name',
            'engineer in charge': 'engineer_in_charge',
            'engineer': 'engineer_in_charge',
            'po amount': 'po_amount',
            'poamount': 'po_amount',
            'po number': 'po_number',
            'ponumber': 'po_number',
            'invoiced amount': 'invoiced_amount',
            'invoicedamount': 'invoiced_amount',
            'this week billing': 'this_week_billing',
            'thisweekbilling': 'this_week_billing',
            'actual expenses': 'actual_expenses',
            'actualexpenses': 'actual_expenses',
            'expenses': 'actual_expenses',
            'weekly actions': 'weekly_actions',
            'weeklyactions': 'weekly_actions',
            'actions': 'weekly_actions',
            'completion percentage': 'completion_percentage',
            'completion': 'completion_percentage',
            'profit loss': 'pid_savings',
            'profit/loss': 'pid_savings',
            'pid expenses': 'pid_savings',
        }
        
        # Rename columns based on mapping
        df = df.rename(columns=column_mapping)
        
        # Required columns (relaxed requirement)
        required_cols = ['pid_no', 'project_name']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_cols)}. Available columns: {', '.join(df.columns)}"
            )
        
        # Get Excel PIDs for reference
        excel_pids = set(str(row.get('pid_no', '')).strip() for _, row in df.iterrows() if pd.notna(row.get('pid_no')))
        
        # Step 1: Delete all non-completed projects (clean slate for ongoing projects)
        delete_result = await db.projects.delete_many({"status": {"$ne": "Completed"}})
        deleted_count = delete_result.deleted_count
        logger.info(f"Deleted {deleted_count} non-completed projects before import")
        
        # Step 2: Get remaining completed projects (to check for updates)
        completed_projects = await db.projects.find({"status": "Completed"}, {"pid_no": 1, "_id": 0}).to_list(10000)
        completed_pids = set(p.get('pid_no') for p in completed_projects if p.get('pid_no'))
        
        # Process each row
        imported_count = 0
        updated_count = 0
        errors = []
        processed_pids = set()
        
        for index, row in df.iterrows():
            try:
                # Get PID
                pid_no = str(row.get('pid_no', '')).strip() if pd.notna(row.get('pid_no')) else ''
                
                # Skip rows without PID
                if not pid_no:
                    errors.append(f"Row {index + 2}: Missing PID number, skipped")
                    continue
                
                # Skip if already processed in this import (duplicate in Excel)
                if pid_no in processed_pids:
                    errors.append(f"Row {index + 2}: Duplicate PID {pid_no} in Excel, skipped")
                    continue
                
                # Handle completion_percentage - convert decimal to percentage if needed
                raw_cp = float(row.get('completion_percentage', 0)) if pd.notna(row.get('completion_percentage')) else 0
                completion_percentage = raw_cp * 100 if 0 < raw_cp <= 1 else raw_cp
                
                project_data = {
                    'pid_no': pid_no,
                    'category': str(row.get('category', 'PSS')).strip() if pd.notna(row.get('category')) else 'PSS',
                    'po_number': str(row.get('po_number', '')) if pd.notna(row.get('po_number')) else None,
                    'client': str(row.get('client', 'Unknown')),
                    'location': str(row.get('location', 'Unknown')),
                    'project_name': str(row.get('project_name', 'Untitled Project')),
                    'vendor': str(row.get('vendor', 'TBD')),
                    'status': str(row.get('status', 'Need to Start')).strip() if pd.notna(row.get('status')) else 'Need to Start',
                    'engineer_in_charge': str(row.get('engineer_in_charge', 'Unassigned')),
                    'po_amount': float(row.get('po_amount', 0)) if pd.notna(row.get('po_amount')) else 0,
                    'balance': float(row.get('balance', 0)) if pd.notna(row.get('balance')) else 0,
                    'invoiced_amount': float(row.get('invoiced_amount', 0)) if pd.notna(row.get('invoiced_amount')) else 0,
                    'completion_percentage': completion_percentage,
                    'this_week_billing': float(row.get('this_week_billing', 0)) if pd.notna(row.get('this_week_billing')) else 0,
                    'budget': float(row.get('budget', 0)) if pd.notna(row.get('budget')) else 0,
                    'actual_expenses': float(row.get('actual_expenses', 0)) if pd.notna(row.get('actual_expenses')) else 0,
                    'weekly_actions': str(row.get('weekly_actions', '')) if pd.notna(row.get('weekly_actions')) else None,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                # Calculate PID savings
                project_data['pid_savings'] = project_data['budget'] - project_data['actual_expenses']
                
                # Check if this PID exists in completed projects - UPDATE if so
                if pid_no in completed_pids:
                    # Update existing completed project with new data
                    await db.projects.update_one(
                        {"pid_no": pid_no},
                        {"$set": project_data}
                    )
                    updated_count += 1
                    logger.info(f"Updated existing project: {pid_no}")
                else:
                    # Create new project
                    project = Project(**project_data)
                    doc = project.model_dump()
                    doc['created_at'] = doc['created_at'].isoformat()
                    doc['updated_at'] = doc['updated_at'].isoformat()
                    
                    await db.projects.insert_one(doc)
                    imported_count += 1
                
                processed_pids.add(pid_no)
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        # Broadcast real-time update for all changes
        await broadcast_update("project", "bulk_import", {"count": imported_count + updated_count})
        
        # Build response message
        message = f"Import complete: {imported_count} new projects added"
        if updated_count > 0:
            message += f", {updated_count} existing projects updated"
        if deleted_count > 0:
            message += f". {deleted_count} old ongoing projects were removed"
        
        return {
            "message": message,
            "imported": imported_count,
            "updated": updated_count,
            "deleted": deleted_count,
            "total_rows": len(df),
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing Excel: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


# PDF Export
@api_router.get("/projects/export/pdf")
async def export_projects_pdf():
    """Export project status report to PDF"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    
    # Container for elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Try to add logo from organization settings
    try:
        org_settings = await db.organization_settings.find_one({}, {"_id": 0})
        logo_url = org_settings.get("logo_url") if org_settings else None
        if logo_url:
            logo_response = requests.get(logo_url, timeout=5)
            if logo_response.status_code == 200:
                logo_buffer = io.BytesIO(logo_response.content)
                logo = RLImage(logo_buffer, width=1.5*inch, height=0.6*inch)
                elements.append(logo)
                elements.append(Spacer(1, 10))
    except:
        pass
    
    # Company name
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=5
    )
    elements.append(Paragraph("<b>Enerzia Power Solutions</b>", company_style))
    elements.append(Spacer(1, 5))
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph("Projects & Services Status Report", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Summary stats
    total_projects = len(projects)
    total_budget = sum(p.get('budget', 0) for p in projects)
    total_expenses = sum(p.get('actual_expenses', 0) for p in projects)
    total_pid_savings = sum(p.get('pid_savings', 0) for p in projects)
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Projects', str(total_projects)],
        ['Total Budget', f'Rs {total_budget:,.2f}'],
        ['Total Expenses', f'Rs {total_expenses:,.2f}'],
        ['Total PID Savings', f'Rs {total_pid_savings:,.2f}'],
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Projects table
    elements.append(Paragraph("Projects Details", styles['Heading2']))
    elements.append(Spacer(1, 12))
    
    # Prepare project data
    project_data = [['PID', 'Project', 'Status', 'Completion', 'Budget', 'PID Savings']]
    
    for project in projects[:20]:  # Limit to first 20 for PDF
        project_data.append([
            str(project.get('pid_no', ''))[:15],
            str(project.get('project_name', ''))[:30],
            str(project.get('status', ''))[:15],
            f"{project.get('completion_percentage', 0)}%",
            f"Rs {project.get('budget', 0):,.0f}",
            f"Rs {project.get('pid_savings', 0):,.0f}"
        ])
    
    projects_table = Table(project_data, colWidths=[0.8*inch, 2*inch, 1*inch, 0.8*inch, 1*inch, 1*inch])
    projects_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    
    elements.append(projects_table)
    
    if len(projects) > 20:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Note: Showing first 20 of {len(projects)} projects. Export to Excel for complete data.", styles['Italic']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=project_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        }
    )


# Custom Reports
@api_router.get("/reports/custom")
async def generate_custom_report(
    report_type: str = "all",  # all, status, category, client, budget
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: Optional[str] = None  # week, month, status, category, client
):
    """Generate custom reports with various filters"""
    query = {}
    
    # Date filtering
    if start_date or end_date:
        query['created_at'] = {}
        if start_date:
            query['created_at']['$gte'] = start_date
        if end_date:
            query['created_at']['$lte'] = end_date
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    result = {
        "total_projects": len(projects),
        "total_budget": sum(p.get('budget', 0) for p in projects),
        "total_expenses": sum(p.get('actual_expenses', 0) for p in projects),
        "total_pid_savings": sum(p.get('pid_savings', 0) for p in projects),
        "total_po_amount": sum(p.get('po_amount', 0) for p in projects),
        "total_invoiced": sum(p.get('invoiced_amount', 0) for p in projects),
        "data": []
    }
    
    if group_by == "status":
        # Group by status
        status_groups = {}
        for p in projects:
            status = p.get('status', 'Unknown')
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append(p)
        
        for status, projs in status_groups.items():
            result["data"].append({
                "group": status,
                "count": len(projs),
                "budget": sum(p.get('budget', 0) for p in projs),
                "expenses": sum(p.get('actual_expenses', 0) for p in projs),
                "pid_savings": sum(p.get('pid_savings', 0) for p in projs),
                "projects": projs
            })
    
    elif group_by == "category":
        # Group by category
        category_groups = {}
        for p in projects:
            category = p.get('category', 'Unknown')
            if category not in category_groups:
                category_groups[category] = []
            category_groups[category].append(p)
        
        for category, projs in category_groups.items():
            result["data"].append({
                "group": category,
                "count": len(projs),
                "budget": sum(p.get('budget', 0) for p in projs),
                "expenses": sum(p.get('actual_expenses', 0) for p in projs),
                "pid_savings": sum(p.get('pid_savings', 0) for p in projs),
                "projects": projs
            })
    
    elif group_by == "client":
        # Group by client
        client_groups = {}
        for p in projects:
            client = p.get('client', 'Unknown')
            if client not in client_groups:
                client_groups[client] = []
            client_groups[client].append(p)
        
        for client, projs in client_groups.items():
            result["data"].append({
                "group": client,
                "count": len(projs),
                "budget": sum(p.get('budget', 0) for p in projs),
                "expenses": sum(p.get('actual_expenses', 0) for p in projs),
                "pid_savings": sum(p.get('pid_savings', 0) for p in projs),
                "projects": projs
            })
    
    else:
        # Return all projects
        result["data"] = projects
    
    return result


# Weekly Billing Summary
@api_router.get("/billing/weekly", response_model=List[WeeklyBilling])
async def get_weekly_billing():
    """Get weekly billing breakdown based on calendar weeks (Monday to Sunday)"""
    from datetime import datetime, timedelta
    
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    # Helper function to get week label (e.g., "Dec'25 Wk-1")
    def get_week_label(date):
        # Get the Monday of the week
        monday = date - timedelta(days=date.weekday())
        month_abbr = monday.strftime("%b")  # Dec, Jan, etc.
        year_short = monday.strftime("%y")  # 25, 26, etc.
        
        # Calculate week number within the month
        first_day_of_month = monday.replace(day=1)
        # Find first Monday of the month (or before)
        first_monday = first_day_of_month - timedelta(days=first_day_of_month.weekday())
        if first_monday.month != monday.month and first_monday < first_day_of_month:
            first_monday = first_monday + timedelta(days=7)
        
        # Week number = (monday - first_monday) / 7 + 1
        week_of_month = ((monday - first_monday).days // 7) + 1
        
        # If the Monday is from previous month, adjust
        if monday < first_day_of_month:
            # This Monday belongs to previous month's last week
            prev_month_last_day = first_day_of_month - timedelta(days=1)
            return get_week_label(prev_month_last_day - timedelta(days=6))
        
        return f"{month_abbr}'{year_short} Wk-{week_of_month}"
    
    # Helper function to get week start dates for last 8 weeks
    def get_last_n_weeks(n=8):
        today = datetime.now()
        # Get Monday of current week
        current_monday = today - timedelta(days=today.weekday())
        
        weeks = []
        for i in range(n - 1, -1, -1):  # Start from oldest week
            monday = current_monday - timedelta(weeks=i)
            sunday = monday + timedelta(days=6)
            label = get_week_label(monday)
            weeks.append({
                'label': label,
                'start': monday,
                'end': sunday
            })
        return weeks
    
    # Get last 8 calendar weeks
    weeks = get_last_n_weeks(8)
    billing_data = []
    
    # Calculate total billing per category for distribution
    category_totals = {
        'PSS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'PSS'),
        'AS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'AS'),
        'OSS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'OSS'),
        'CS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'CS'),
    }
    
    # Distribute billing across weeks with some variation
    import random
    random.seed(42)  # For consistent results
    
    cumulative = {'pss': 0, 'as': 0, 'oss': 0, 'cs': 0, 'total': 0}
    
    for i, week in enumerate(weeks):
        # Create variation factors for each week
        factor = 0.08 + (random.random() * 0.06)  # 8-14% per week
        
        # Calculate this week's billing with some variation
        pss_amount = category_totals['PSS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        as_amount = category_totals['AS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        oss_amount = category_totals['OSS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        cs_amount = category_totals['CS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        
        week_billing = WeeklyBilling(
            week=week['label'],
            pss=round(pss_amount, 2),
            **{"as": round(as_amount, 2)},
            oss=round(oss_amount, 2),
            cs=round(cs_amount, 2),
            total=0
        )
        week_billing.total = round(week_billing.pss + week_billing.as_ + week_billing.oss + week_billing.cs, 2)
        
        # Track cumulative
        cumulative['pss'] += week_billing.pss
        cumulative['as'] += week_billing.as_
        cumulative['oss'] += week_billing.oss
        cumulative['cs'] += week_billing.cs
        cumulative['total'] += week_billing.total
        
        billing_data.append(week_billing)
    
    return billing_data


@api_router.get("/billing/cumulative")
async def get_cumulative_billing():
    """Get cumulative billing trend based on calendar weeks"""
    from datetime import datetime, timedelta
    
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    # Helper function to get week label
    def get_week_label(date):
        monday = date - timedelta(days=date.weekday())
        month_abbr = monday.strftime("%b")
        year_short = monday.strftime("%y")
        first_day_of_month = monday.replace(day=1)
        first_monday = first_day_of_month - timedelta(days=first_day_of_month.weekday())
        if first_monday.month != monday.month and first_monday < first_day_of_month:
            first_monday = first_monday + timedelta(days=7)
        week_of_month = ((monday - first_monday).days // 7) + 1
        if monday < first_day_of_month:
            prev_month_last_day = first_day_of_month - timedelta(days=1)
            return get_week_label(prev_month_last_day - timedelta(days=6))
        return f"{month_abbr}'{year_short} Wk-{week_of_month}"
    
    def get_last_n_weeks(n=8):
        today = datetime.now()
        current_monday = today - timedelta(days=today.weekday())
        weeks = []
        for i in range(n - 1, -1, -1):
            monday = current_monday - timedelta(weeks=i)
            sunday = monday + timedelta(days=6)
            weeks.append({'label': get_week_label(monday), 'start': monday, 'end': sunday})
        return weeks
    
    weeks = get_last_n_weeks(8)
    
    # Calculate totals
    category_totals = {
        'PSS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'PSS'),
        'AS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'AS'),
        'OSS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'OSS'),
        'CS': sum(p.get('this_week_billing', 0) for p in projects if p.get('category') == 'CS'),
    }
    
    import random
    random.seed(42)
    
    cumulative_data = []
    cumulative = {'pss': 0, 'as': 0, 'oss': 0, 'cs': 0, 'total': 0}
    
    for week in weeks:
        factor = 0.08 + (random.random() * 0.06)
        
        pss = category_totals['PSS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        as_amt = category_totals['AS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        oss = category_totals['OSS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        cs = category_totals['CS'] * factor * (1 + (random.random() - 0.5) * 0.4)
        
        cumulative['pss'] += pss
        cumulative['as'] += as_amt
        cumulative['oss'] += oss
        cumulative['cs'] += cs
        cumulative['total'] = cumulative['pss'] + cumulative['as'] + cumulative['oss'] + cumulative['cs']
        
        cumulative_data.append({
            'week': week['label'],
            'pss': round(cumulative['pss'], 2),
            'as': round(cumulative['as'], 2),
            'oss': round(cumulative['oss'], 2),
            'cs': round(cumulative['cs'], 2),
            'total': round(cumulative['total'], 2)
        })
    
    return cumulative_data


# ==================== PROJECT REQUIREMENTS ====================

@api_router.get("/project-requirements")
async def get_all_project_requirements(
    project_id: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all project requirements with optional filters"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if department:
        query["assigned_to_department"] = department
    if status:
        query["status"] = status
    
    requirements = await db.project_requirements.find(query, {"_id": 0}).to_list(1000)
    # Sort by created_at descending
    requirements.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return requirements


@api_router.get("/project-requirements/{requirement_id}")
async def get_project_requirement(requirement_id: str):
    """Get a specific project requirement"""
    requirement = await db.project_requirements.find_one({"id": requirement_id}, {"_id": 0})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return requirement


@api_router.post("/project-requirements")
async def create_project_requirement(
    requirement: ProjectRequirementCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new project requirement"""
    req_dict = requirement.model_dump()
    req_dict["id"] = str(uuid.uuid4())
    req_dict["requested_by"] = current_user.get("name", current_user.get("email"))
    req_dict["status"] = "Pending"
    req_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    req_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Get project details if project_id is provided
    if requirement.project_id:
        project = await db.projects.find_one({"id": requirement.project_id}, {"_id": 0, "pid_no": 1, "project_name": 1})
        if project:
            req_dict["project_pid"] = project.get("pid_no")
            req_dict["project_name"] = project.get("project_name")
    
    await db.project_requirements.insert_one(req_dict)
    
    # Remove MongoDB _id before returning
    req_dict.pop("_id", None)
    
    # Create notification for the target department
    from_dept = requirement.created_by_department
    to_dept = requirement.assigned_to_department
    
    if from_dept != to_dept:
        # Get department display name
        dept_names = {d["code"]: d["name"] for d in DEPARTMENTS}
        from_dept_name = dept_names.get(from_dept, from_dept)
        
        notif_title = f"New Requirement from {from_dept_name}"
        notif_message = f"{requirement.requirement_type}: {requirement.description[:100]}{'...' if len(requirement.description) > 100 else ''}"
        
        notif = Notification(
            type="department_requirement",
            title=notif_title,
            message=notif_message,
            department=to_dept,
            from_department=from_dept,
            reference_id=req_dict["id"],
            reference_type="project_requirement",
            created_by=current_user.get("name", current_user.get("email"))
        )
        await db.notifications.insert_one(notif.model_dump())
        
        # Broadcast real-time notification
        await manager.broadcast({
            "type": "notification",
            "action": "new",
            "data": {
                "department": to_dept,
                "title": notif_title,
                "message": notif_message,
                "notif_type": "department_requirement"
            }
        })
    
    # Broadcast real-time update
    await broadcast_update("project_requirement", "create", {"id": req_dict["id"]})
    
    return req_dict


@api_router.put("/project-requirements/{requirement_id}")
async def update_project_requirement(
    requirement_id: str,
    update_data: ProjectRequirementUpdate,
    current_user: dict = Depends(require_auth)
):
    """Update a project requirement"""
    existing = await db.project_requirements.find_one({"id": requirement_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track reply timestamp
    if update_dict.get("response") or update_dict.get("replies"):
        update_dict["replied_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track completion
    if update_dict.get("status") == "Completed" and existing.get("status") != "Completed":
        update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.project_requirements.update_one(
        {"id": requirement_id},
        {"$set": update_dict}
    )
    
    updated = await db.project_requirements.find_one({"id": requirement_id}, {"_id": 0})
    
    # Broadcast real-time update
    await broadcast_update("project_requirement", "update", {"id": requirement_id})
    
    return updated


@api_router.delete("/project-requirements/{requirement_id}")
async def delete_project_requirement(requirement_id: str, current_user: dict = Depends(require_auth)):
    """Delete a project requirement"""
    result = await db.project_requirements.delete_one({"id": requirement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Broadcast real-time update
    await broadcast_update("project_requirement", "delete", {"id": requirement_id})
    
    return {"message": "Requirement deleted successfully"}


@api_router.get("/project-requirements/stats/summary")
async def get_requirements_summary():
    """Get summary statistics for project requirements"""
    requirements = await db.project_requirements.find({}, {"_id": 0}).to_list(1000)
    
    # Count by status
    status_counts = {}
    for req in requirements:
        status = req.get("status", "Pending")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Count by department
    dept_counts = {}
    for req in requirements:
        dept = req.get("assigned_to_department", "Unknown")
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
    
    # Count by priority
    priority_counts = {}
    for req in requirements:
        priority = req.get("priority", "Medium")
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
    
    # Count by type
    type_counts = {}
    for req in requirements:
        req_type = req.get("requirement_type", "Other")
        type_counts[req_type] = type_counts.get(req_type, 0) + 1
    
    return {
        "total": len(requirements),
        "by_status": status_counts,
        "by_department": dept_counts,
        "by_priority": priority_counts,
        "by_type": type_counts
    }


# ==================== WORK COMPLETION CERTIFICATES ====================

@api_router.get("/work-completion")
async def get_work_completion_certificates():
    """Get all work completion certificates"""
    certificates = await db.work_completion_certificates.find({}, {"_id": 0}).to_list(1000)
    # Sort by created_at descending
    certificates.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return certificates


@api_router.get("/work-completion/{certificate_id}")
async def get_work_completion_certificate(certificate_id: str):
    """Get a specific work completion certificate"""
    certificate = await db.work_completion_certificates.find_one({"id": certificate_id}, {"_id": 0})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return certificate


@api_router.post("/work-completion")
async def create_work_completion_certificate(data: WorkCompletionCreate):
    """Create a new work completion certificate"""
    # Get project details
    project = await db.projects.find_one({"id": data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get organization settings for vendor info
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    vendor_name = org_settings.get("name", "Enerzia Power Solutions") if org_settings else "Enerzia Power Solutions"
    vendor_address = org_settings.get("address", "Chennai, Tamil Nadu") if org_settings else "Chennai, Tamil Nadu"
    
    # Generate document number
    count = await db.work_completion_certificates.count_documents({})
    year = datetime.now().year
    doc_no = f"WCC/{year}/{str(count + 1).zfill(4)}"
    
    # Create certificate
    certificate = WorkCompletionCertificate(
        document_no=doc_no,
        project_id=data.project_id,
        pid_no=project.get("pid_no", ""),
        project_name=project.get("project_name", ""),
        customer_name=project.get("client", ""),
        customer_representative=data.customer_representative or "",
        site_location=project.get("location", ""),
        customer_address=data.customer_address or "",
        order_no=data.order_no or project.get("po_number", ""),
        order_dated=data.order_dated or "",
        order_amount=data.order_amount or project.get("po_amount", 0),
        billed_amount=data.billed_amount or project.get("invoiced_amount", 0),
        work_started_on=data.work_started_on,
        completed_on=data.completed_on,
        vendor_name=vendor_name,
        vendor_address=vendor_address,
        executed_by=data.executed_by or project.get("engineer_in_charge", ""),
        supervised_by=data.supervised_by or "",
        work_items=[],  # Will be set after validation
        quality_compliance=data.quality_compliance or "Complied",
        as_built_drawings=data.as_built_drawings or "Submitted",
        statutory_compliance=data.statutory_compliance or "Submitted",
        site_measurements=data.site_measurements or "Completed",
        snag_points=data.snag_points or "None",
        feedback_comments=data.feedback_comments or "",
        annexures=[],  # Will be set after validation
        status="Draft"
    )
    
    doc = certificate.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Handle work items manually
    if data.work_items:
        doc['work_items'] = [
            {
                'description': item.get('description', ''),
                'unit': item.get('unit', ''),
                'order_quantity': item.get('order_quantity', 0),
                'billed_quantity': item.get('billed_quantity', 0),
                'unit_rate': item.get('unit_rate', 0),
                'total_amount': item.get('total_amount', 0),
                'status': item.get('status', 'Completed'),
                'remarks': item.get('remarks', '')
            }
            for item in data.work_items
        ]
    
    # Handle annexures manually
    if data.annexures:
        doc['annexures'] = [
            {
                'type': item.get('type', ''),
                'number': item.get('number', ''),
                'dated': item.get('dated', '')
            }
            for item in data.annexures
        ]
    
    await db.work_completion_certificates.insert_one(doc)
    
    # Remove MongoDB _id for response
    doc.pop('_id', None)
    
    return {"message": "Certificate created successfully", "certificate": doc}


@api_router.put("/work-completion/{certificate_id}")
async def update_work_completion_certificate(certificate_id: str, data: dict):
    """Update a work completion certificate"""
    certificate = await db.work_completion_certificates.find_one({"id": certificate_id})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Update allowed fields
    allowed_fields = {
        "customer_representative", "customer_address", "order_no", "order_dated",
        "order_amount", "billed_amount", "work_started_on", "completed_on",
        "executed_by", "supervised_by", "work_items", "quality_compliance",
        "as_built_drawings", "statutory_compliance", "site_measurements",
        "snag_points", "feedback_comments", "annexures", "status"
    }
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.work_completion_certificates.update_one(
            {"id": certificate_id},
            {"$set": update_data}
        )
    
    updated = await db.work_completion_certificates.find_one({"id": certificate_id}, {"_id": 0})
    return updated


@api_router.delete("/work-completion/{certificate_id}")
async def delete_work_completion_certificate(certificate_id: str):
    """Delete a work completion certificate"""
    result = await db.work_completion_certificates.delete_one({"id": certificate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return {"message": "Certificate deleted successfully"}


@api_router.get("/work-completion/{certificate_id}/pdf")
async def generate_work_completion_pdf(certificate_id: str):
    """Generate Work Completion Certificate PDF using new template style"""
    from routes.wcc_pdf import generate_wcc_pdf_buffer
    
    certificate = await db.work_completion_certificates.find_one({"id": certificate_id}, {"_id": 0})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    
    # Generate PDF buffer using new template
    buffer = generate_wcc_pdf_buffer(certificate, org_settings or {})
    
    # Return as streaming response
    wcc_no = certificate.get('wcc_no', '') or certificate.get('certificate_no', 'WCC')
    filename = f"WCC_{wcc_no.replace('/', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# Seed sample data
@api_router.post("/seed-data")
async def seed_data():
    # Check if data already exists
    count = await db.projects.count_documents({})
    if count > 0:
        return {"message": "Data already seeded"}
    
    sample_projects = [
        {
            "pid_no": "PID/25-26/015",
            "category": "PSS",
            "po_number": "PO642147",
            "client": "JLL - Hexaware",
            "location": "Siruseri",
            "project_name": "Electrical system testing activity",
            "vendor": "Enerzia",
            "status": "Ongoing",
            "engineer_in_charge": "Mr. Pradeep",
            "po_amount": 430700,
            "balance": 150000,
            "invoiced_amount": 280700,
            "completion_percentage": 65,
            "this_week_billing": 45000
        },
        {
            "pid_no": "PID/25-26/202",
            "category": "AS",
            "po_number": "PO646918",
            "client": "Indospace Oragadam II Phase I",
            "location": "Oragadam",
            "project_name": "HVAC AMC",
            "vendor": "Enerzia",
            "status": "Ongoing",
            "engineer_in_charge": "Mr. Arulraj",
            "po_amount": 509247,
            "balance": 200000,
            "invoiced_amount": 309247,
            "completion_percentage": 60,
            "this_week_billing": 50000
        },
        {
            "pid_no": "PID/25-26/280",
            "category": "PSS",
            "po_number": "PO639466",
            "client": "Indospace Oragadam II Phase I",
            "location": "Oragadam",
            "project_name": "Electrical Works",
            "vendor": "Enerzia",
            "status": "Need to Start",
            "engineer_in_charge": "Mr. Arulraj",
            "po_amount": 351060,
            "balance": 351060,
            "invoiced_amount": 0,
            "completion_percentage": 0,
            "this_week_billing": 0
        },
        {
            "pid_no": "PID/25-26/273",
            "category": "OSS",
            "po_number": "DSV/MA9/NOV-25/A168",
            "client": "NTT Data DLF",
            "location": "DLF",
            "project_name": "NC AMC - Electrical",
            "vendor": "Enerzia",
            "status": "Need to Start",
            "engineer_in_charge": "Mr. Alex",
            "po_amount": 70800,
            "balance": 70800,
            "invoiced_amount": 0,
            "completion_percentage": 0,
            "this_week_billing": 0
        },
        {
            "pid_no": "PID/25-26/214",
            "category": "PSS",
            "po_number": "6150330-OP-4427600832",
            "client": "Koodapakkam",
            "location": "Chennai",
            "project_name": "AMC",
            "vendor": "Royal Electricals",
            "status": "Invoiced",
            "engineer_in_charge": "Mr. Giftson",
            "po_amount": 165200,
            "balance": 0,
            "invoiced_amount": 165200,
            "completion_percentage": 100,
            "this_week_billing": 0
        },
        {
            "pid_no": "PID/25-26/228",
            "category": "PSS",
            "po_number": "PO662700",
            "client": "Taramani",
            "location": "Chennai",
            "project_name": "R & M Activity",
            "vendor": "SB Interiors",
            "status": "Ongoing",
            "engineer_in_charge": "Mr. Arulraj",
            "po_amount": 194393,
            "balance": 80000,
            "invoiced_amount": 114393,
            "completion_percentage": 58,
            "this_week_billing": 25000
        },
        {
            "pid_no": "PID/25-26/169",
            "category": "CS",
            "po_number": "DSV/M14/NOV-25/A169",
            "client": "Fedex",
            "location": "Chennai",
            "project_name": "Sign Board",
            "vendor": "Enerzia",
            "status": "Ongoing",
            "engineer_in_charge": "Mr. Nagamuthu",
            "po_amount": 43641,
            "balance": 15000,
            "invoiced_amount": 28641,
            "completion_percentage": 65,
            "this_week_billing": 12000
        },
        {
            "pid_no": "PID/25-26/148",
            "category": "AS",
            "po_number": "YCIN06196645",
            "client": "OTP",
            "location": "Chennai",
            "project_name": "Floor Spring Replacement",
            "vendor": "PSS",
            "status": "Need to Start",
            "engineer_in_charge": "Mr. Alex",
            "po_amount": 200010,
            "balance": 200010,
            "invoiced_amount": 0,
            "completion_percentage": 0,
            "this_week_billing": 0
        },
        {
            "pid_no": "PID/25-26/312",
            "category": "PSS",
            "po_number": "PO677131",
            "client": "Standex",
            "location": "Sriperumbudur",
            "project_name": "Thermography & Earth Pit Testing",
            "vendor": "Enerzia",
            "status": "Completed",
            "engineer_in_charge": "Mr. Hamin",
            "po_amount": 95964,
            "balance": 0,
            "invoiced_amount": 95964,
            "completion_percentage": 100,
            "this_week_billing": 0
        },
        {
            "pid_no": "PID/25-26/316",
            "category": "OSS",
            "po_number": "PO689309",
            "client": "Celestica",
            "location": "OTP",
            "project_name": "Spectra Voltage Transformer Replacement",
            "vendor": "Enerzia",
            "status": "Ongoing",
            "engineer_in_charge": "Mr. Giftson",
            "po_amount": 372361,
            "balance": 150000,
            "invoiced_amount": 222361,
            "completion_percentage": 60,
            "this_week_billing": 40000
        }
    ]
    
    for project_data in sample_projects:
        project = Project(**project_data)
        doc = project.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.projects.insert_one(doc)
    
    return {"message": f"Seeded {len(sample_projects)} projects successfully"}


# ========================


# Health check endpoint (outside /api prefix for Kubernetes)
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Check database connectivity
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "service": "smarthub-enerzia"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        # Return 503 Service Unavailable when unhealthy
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )

# ==================== DEPARTMENT TEAM MEMBERS API ====================

VALID_DEPARTMENTS = ['projects', 'sales', 'purchase', 'exports', 'finance', 'hr', 'operations', 'accounts']

@api_router.get("/departments/{department}/team")
async def get_department_team(department: str):
    """Get team members for a specific department"""
    if department not in VALID_DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid department. Must be one of: {', '.join(VALID_DEPARTMENTS)}")
    
    members = await db.department_team_members.find(
        {"department": department}, 
        {"_id": 0}
    ).to_list(1000)
    return members


@api_router.get("/departments/{department}/team/{member_id}")
async def get_department_team_member(department: str, member_id: str):
    """Get a specific team member"""
    member = await db.department_team_members.find_one(
        {"id": member_id, "department": department}, 
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return member


@api_router.post("/departments/{department}/team")
async def create_department_team_member(department: str, member: DepartmentTeamMemberCreate):
    """Create a new team member for a department"""
    if department not in VALID_DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid department. Must be one of: {', '.join(VALID_DEPARTMENTS)}")
    
    new_member = DepartmentTeamMember(
        **member.model_dump(),
        department=department
    )
    doc = new_member.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.department_team_members.insert_one(doc)
    
    # Return without _id
    doc.pop('_id', None)
    return doc


@api_router.put("/departments/{department}/team/{member_id}")
async def update_department_team_member(department: str, member_id: str, updates: dict):
    """Update a team member"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Don't allow changing the department
    if 'department' in updates:
        del updates['department']
    
    result = await db.department_team_members.update_one(
        {"id": member_id, "department": department},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    member = await db.department_team_members.find_one(
        {"id": member_id}, 
        {"_id": 0}
    )
    return member


@api_router.delete("/departments/{department}/team/{member_id}")
async def delete_department_team_member(department: str, member_id: str):
    """Delete a team member"""
    result = await db.department_team_members.delete_one(
        {"id": member_id, "department": department}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member deleted successfully"}


@api_router.post("/departments/{department}/team/{member_id}/photo")
async def upload_team_member_photo(
    department: str, 
    member_id: str, 
    file: UploadFile = File(...)
):
    """Upload a photo for a team member"""
    # Validate department
    if department not in VALID_DEPARTMENTS:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    # Find the team member
    member = await db.department_team_members.find_one({
        "id": member_id, 
        "department": department
    })
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed"
        )
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Create uploads directory if not exists
    photos_dir = UPLOADS_DIR / "team_photos" / department
    photos_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower() or '.jpg'
    filename = f"{member_id}{file_ext}"
    file_path = photos_dir / filename
    
    # Save the file
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Generate the URL
    photo_url = f"/api/uploads/team_photos/{department}/{filename}"
    
    # Update member record with photo URL
    await db.department_team_members.update_one(
        {"id": member_id, "department": department},
        {"$set": {
            "photo_url": photo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Photo uploaded successfully", "photo_url": photo_url}


@api_router.delete("/departments/{department}/team/{member_id}/photo")
async def delete_team_member_photo(department: str, member_id: str):
    """Delete a team member's photo"""
    # Find the team member
    member = await db.department_team_members.find_one({
        "id": member_id, 
        "department": department
    }, {"_id": 0})
    
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Delete the file if exists
    if member.get("photo_url"):
        try:
            # Extract filename from URL
            url_parts = member["photo_url"].split("/")
            filename = url_parts[-1]
            file_path = UPLOADS_DIR / "team_photos" / department / filename
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error deleting photo file: {e}")
    
    # Update member record
    await db.department_team_members.update_one(
        {"id": member_id, "department": department},
        {"$set": {
            "photo_url": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Photo deleted successfully"}


@api_router.post("/departments/{department}/team/import-from-engineers")
async def import_team_from_engineers(department: str):
    """Import team members from the master engineers list for a department"""
    if department not in VALID_DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid department")
    
    # Get engineers that match the department or have no department set
    engineers = await db.engineers.find(
        {"$or": [{"department": department}, {"department": None}, {"department": ""}]},
        {"_id": 0}
    ).to_list(1000)
    
    imported_count = 0
    for eng in engineers:
        # Check if already exists
        existing = await db.department_team_members.find_one({
            "name": eng.get('name'),
            "department": department
        })
        if not existing:
            new_member = DepartmentTeamMember(
                name=eng.get('name'),
                email=eng.get('email'),
                phone=eng.get('phone'),
                designation=eng.get('department', 'Team Member'),
                department=department,
                is_active=eng.get('is_active', True)
            )
            doc = new_member.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.department_team_members.insert_one(doc)
            imported_count += 1
    
    return {"message": f"Imported {imported_count} team members", "imported": imported_count}

# ==================== SCHEDULED INSPECTIONS ====================

class InspectionFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class InspectionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ScheduledInspection(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inspection_type: str  # equipment, amc, audit, other
    equipment_type: Optional[str] = None  # For equipment inspections
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    location: str
    frequency: str  # InspectionFrequency
    assigned_to: Optional[str] = None
    assigned_to_id: Optional[str] = None
    start_date: str  # When the schedule starts
    next_due_date: str  # Next inspection due date
    last_completed_date: Optional[str] = None
    reminder_days: int = 3  # Days before due date to send reminder
    notes: Optional[str] = None
    status: str = InspectionStatus.ACTIVE
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScheduledInspectionCreate(BaseModel):
    title: str
    inspection_type: str
    equipment_type: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    location: str
    frequency: str
    assigned_to: Optional[str] = None
    assigned_to_id: Optional[str] = None
    start_date: str
    reminder_days: int = 3
    notes: Optional[str] = None


def calculate_next_due_date(current_date: str, frequency: str) -> str:
    """Calculate next due date based on frequency"""
    from datetime import timedelta
    
    try:
        date = datetime.strptime(current_date, "%Y-%m-%d")
    except:
        date = datetime.now()
    
    frequency_days = {
        "daily": 1,
        "weekly": 7,
        "biweekly": 14,
        "monthly": 30,
        "quarterly": 90,
        "half_yearly": 180,
        "yearly": 365
    }
    
    days = frequency_days.get(frequency, 30)
    next_date = date + timedelta(days=days)
    return next_date.strftime("%Y-%m-%d")


@api_router.get("/scheduled-inspections")
async def get_scheduled_inspections(
    status: Optional[str] = None,
    inspection_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    upcoming_days: Optional[int] = None,
    current_user: dict = Depends(require_auth)
):
    """Get all scheduled inspections with optional filters"""
    query = {}
    
    if status:
        query["status"] = status
    if inspection_type:
        query["inspection_type"] = inspection_type
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    inspections = await db.scheduled_inspections.find(query, {"_id": 0}).sort("next_due_date", 1).to_list(500)
    
    # If filtering by upcoming days
    if upcoming_days is not None:
        from datetime import timedelta
        cutoff_date = (datetime.now() + timedelta(days=upcoming_days)).strftime("%Y-%m-%d")
        today = datetime.now().strftime("%Y-%m-%d")
        inspections = [i for i in inspections if today <= i.get("next_due_date", "") <= cutoff_date]
    
    return inspections


@api_router.get("/scheduled-inspections/dashboard")
async def get_inspections_dashboard(
    current_user: dict = Depends(require_auth)
):
    """Get dashboard stats for scheduled inspections"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get all active inspections
    inspections = await db.scheduled_inspections.find(
        {"status": InspectionStatus.ACTIVE},
        {"_id": 0}
    ).to_list(500)
    
    # Calculate stats
    overdue = [i for i in inspections if i.get("next_due_date", "") < today]
    due_today = [i for i in inspections if i.get("next_due_date", "") == today]
    
    from datetime import timedelta
    week_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    due_this_week = [i for i in inspections if today < i.get("next_due_date", "") <= week_end]
    
    month_end = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    due_this_month = [i for i in inspections if today < i.get("next_due_date", "") <= month_end]
    
    return {
        "total_active": len(inspections),
        "overdue": len(overdue),
        "due_today": len(due_today),
        "due_this_week": len(due_this_week),
        "due_this_month": len(due_this_month),
        "overdue_items": overdue[:5],  # Top 5 overdue
        "today_items": due_today,
        "upcoming_items": due_this_week[:5]
    }


@api_router.get("/scheduled-inspections/{inspection_id}")
async def get_scheduled_inspection(
    inspection_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get a specific scheduled inspection"""
    inspection = await db.scheduled_inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=404, detail="Scheduled inspection not found")
    return inspection


@api_router.post("/scheduled-inspections")
async def create_scheduled_inspection(
    data: ScheduledInspectionCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new scheduled inspection"""
    inspection = ScheduledInspection(
        title=data.title,
        inspection_type=data.inspection_type,
        equipment_type=data.equipment_type,
        project_id=data.project_id,
        project_name=data.project_name,
        customer_name=data.customer_name,
        location=data.location,
        frequency=data.frequency,
        assigned_to=data.assigned_to,
        assigned_to_id=data.assigned_to_id,
        start_date=data.start_date,
        next_due_date=data.start_date,  # First inspection on start date
        reminder_days=data.reminder_days,
        notes=data.notes,
        created_by=current_user.get("name", current_user.get("email"))
    )
    
    await db.scheduled_inspections.insert_one(inspection.model_dump())
    
    return {"message": "Scheduled inspection created", "id": inspection.id}


@api_router.put("/scheduled-inspections/{inspection_id}")
async def update_scheduled_inspection(
    inspection_id: str,
    data: dict,
    current_user: dict = Depends(require_auth)
):
    """Update a scheduled inspection"""
    existing = await db.scheduled_inspections.find_one({"id": inspection_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Scheduled inspection not found")
    
    data["updated_at"] = datetime.now(timezone.utc)
    data.pop("id", None)
    data.pop("_id", None)
    
    await db.scheduled_inspections.update_one(
        {"id": inspection_id},
        {"$set": data}
    )
    
    return {"message": "Scheduled inspection updated"}


@api_router.put("/scheduled-inspections/{inspection_id}/complete")
async def complete_inspection(
    inspection_id: str,
    data: dict,
    current_user: dict = Depends(require_auth)
):
    """Mark an inspection as completed and schedule the next one"""
    existing = await db.scheduled_inspections.find_one({"id": inspection_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Scheduled inspection not found")
    
    completed_date = data.get("completed_date", datetime.now().strftime("%Y-%m-%d"))
    report_id = data.get("report_id")  # Optional link to the test report created
    
    # Calculate next due date
    next_due = calculate_next_due_date(completed_date, existing.get("frequency", "monthly"))
    
    await db.scheduled_inspections.update_one(
        {"id": inspection_id},
        {"$set": {
            "last_completed_date": completed_date,
            "next_due_date": next_due,
            "updated_at": datetime.now(timezone.utc)
        },
        "$push": {
            "completion_history": {
                "completed_date": completed_date,
                "completed_by": current_user.get("name"),
                "report_id": report_id
            }
        }}
    )
    
    # Create notification for the assigned person
    if existing.get("assigned_to"):
        notif = Notification(
            type="status_update",
            title="Inspection Completed",
            message=f"{existing['title']} completed. Next due: {next_due}",
            department=current_user.get("department") or "PROJECTS",
            created_by=current_user.get("name")
        )
        await db.notifications.insert_one(notif.model_dump())
    
    return {"message": "Inspection completed", "next_due_date": next_due}


@api_router.delete("/scheduled-inspections/{inspection_id}")
async def delete_scheduled_inspection(
    inspection_id: str,
    current_user: dict = Depends(require_auth)
):
    """Delete a scheduled inspection"""
    result = await db.scheduled_inspections.delete_one({"id": inspection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled inspection not found")
    
    return {"message": "Scheduled inspection deleted"}


# Include modular routers under /api prefix FIRST
# These routes use absolute imports and are self-contained
from routes.projects import router as projects_router_v2
from routes.dashboard import router as dashboard_router_v2
from routes.notifications import router as notifications_router_v2
from routes.department_tasks import router as department_tasks_router_v2
from routes.test_reports import router as test_reports_router_v2
from routes.transformer_pdf import router as transformer_pdf_router
from routes.equipment_pdf import router as equipment_pdf_router
from routes.accounts import router as accounts_router
from routes.payment_requests import router as payment_requests_router
from routes.weekly_meetings import router as weekly_meetings_router
from routes.exports import router as exports_router
from routes.customer_service import router as customer_service_router
from routes.settings import router as settings_router
from routes.amc import router as amc_router
from routes.amc_pdf import router as amc_pdf_router
from routes.ir_thermography import router as ir_thermography_router
from routes.ir_thermography_pdf import router as ir_thermography_pdf_router
from routes.scheduled_inspections import router as scheduled_inspections_router
from routes.uploads import router as uploads_router
from routes.calibration import router as calibration_router
from routes.calibration_pdf import router as calibration_pdf_router
from routes.employee_hub import router as employee_hub_router
from routes.admin_hub import router as admin_hub_router
from routes.company_hub import router as company_hub_router
from routes.customer_portal import router as customer_portal_router
from routes.customer_hub import router as customer_hub_router
from routes.pdf_template_settings import router as pdf_template_router
from routes.attendance_reports import router as attendance_reports_router
from routes.travel_log import router as travel_log_router
from routes.password_reset import router as password_reset_router
from routes.project_schedule_pdf import router as project_schedule_pdf_router
from routes.project_schedules import router as project_schedules_router
from routes.sales import router as sales_router
from routes.project_profit import router as project_profit_router
from routes.zoho_integration import router as zoho_router
from routes.customer_management import router as customer_management_router
from routes.order_lifecycle import router as order_lifecycle_router
from routes.purchase_module import router as purchase_module_router
from routes.expense_management import router as expense_management_router
from routes.finance_dashboard import router as finance_dashboard_router

# The modular routers will handle their routes
app.include_router(projects_router_v2, prefix="/api", tags=["Projects-V2"])
app.include_router(dashboard_router_v2, prefix="/api", tags=["Dashboard-V2"])
app.include_router(notifications_router_v2, prefix="/api", tags=["Notifications-V2"])
app.include_router(department_tasks_router_v2, prefix="/api", tags=["Department-Tasks-V2"])
app.include_router(test_reports_router_v2, prefix="/api", tags=["Test-Reports-V2"])
app.include_router(transformer_pdf_router, prefix="/api", tags=["Transformer-PDF"])
app.include_router(equipment_pdf_router, prefix="/api", tags=["Equipment-PDF"])
app.include_router(accounts_router, prefix="/api", tags=["Accounts"])
app.include_router(payment_requests_router, prefix="/api", tags=["Payment-Requests-V2"])
app.include_router(weekly_meetings_router, prefix="/api", tags=["Weekly-Meetings"])
app.include_router(exports_router, prefix="/api", tags=["Exports"])
app.include_router(customer_service_router, prefix="/api", tags=["Customer-Service"])
app.include_router(ir_thermography_router, prefix="/api/ir-thermography", tags=["IR-Thermography"])
app.include_router(ir_thermography_pdf_router, prefix="/api/ir-thermography-report", tags=["IR-Thermography-PDF"])
app.include_router(settings_router, prefix="/api", tags=["Settings"])
app.include_router(amc_router, prefix="/api/amc", tags=["AMC"])
app.include_router(amc_pdf_router, prefix="/api/amc-report", tags=["AMC-PDF"])
app.include_router(scheduled_inspections_router, prefix="/api/scheduled-inspections", tags=["Scheduled-Inspections"])
app.include_router(uploads_router, prefix="/api", tags=["Uploads"])
app.include_router(calibration_router, prefix="/api/calibration", tags=["Calibration"])
app.include_router(calibration_pdf_router, prefix="/api/calibration-report", tags=["Calibration-PDF"])
app.include_router(employee_hub_router, tags=["Employee-Hub"])
app.include_router(admin_hub_router, tags=["Admin-Hub"])
app.include_router(company_hub_router, tags=["Company-Hub"])
app.include_router(customer_portal_router, prefix="/api", tags=["Customer-Portal"])
app.include_router(customer_hub_router, tags=["Customer-Hub"])
app.include_router(pdf_template_router, tags=["PDF-Template-Settings"])
app.include_router(attendance_reports_router, tags=["Attendance-Reports"])
app.include_router(travel_log_router, tags=["Travel-Log"])
app.include_router(password_reset_router, tags=["Password-Reset"])
app.include_router(project_schedule_pdf_router, prefix="/api", tags=["Project-Schedule-PDF"])
app.include_router(project_schedules_router, prefix="/api/project-schedules", tags=["Project-Schedules"])
app.include_router(sales_router, tags=["Sales"])
app.include_router(project_profit_router, prefix="/api", tags=["Project-Profit"])
app.include_router(zoho_router, prefix="/api", tags=["Zoho-Integration"])
app.include_router(customer_management_router, prefix="/api", tags=["Customer-Management"])
app.include_router(order_lifecycle_router, tags=["Order-Lifecycle"])
app.include_router(purchase_module_router, tags=["Purchase-Module"])
app.include_router(expense_management_router, tags=["Expense-Management"])
app.include_router(finance_dashboard_router, tags=["Finance-Dashboard"])

# Include the main router with remaining routes
app.include_router(api_router)

# Mount static files for uploads (photos, documents)
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "team_photos").mkdir(exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db_client():
    """Initialize database indexes and cache on startup"""
    try:
        from utils.database import create_indexes
        await create_indexes(db)
        logger.info("Database indexes initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database indexes: {e}")
    
    # Initialize cache
    try:
        from utils.cache import cache
        await cache.initialize()
        logger.info(f"Cache initialized: {cache.get_stats()}")
    except Exception as e:
        logger.error(f"Error initializing cache: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
