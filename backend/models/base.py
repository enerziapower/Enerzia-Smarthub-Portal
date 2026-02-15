"""
Base models and shared utilities for the application
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

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


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    CEO_OWNER = "ceo_owner"
    ADMIN = "admin"
    USER = "user"


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


class PaymentRequestStatus(str, Enum):
    PENDING = "Pending"
    FINANCE_REVIEWED = "Finance Reviewed"
    CEO_APPROVED = "CEO Approved"
    PAID = "Paid"
    REJECTED = "Rejected"


# ==================== DEPARTMENT CONFIGURATION ====================

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


# ==================== HELPER FUNCTIONS ====================

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
