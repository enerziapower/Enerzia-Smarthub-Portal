"""
Permission Middleware for Route Protection
Ensures users can only access routes they have explicit permission for
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Callable
from functools import wraps
import jwt
import os

security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ.get("JWT_SECRET", "enerzia-super-secret-key-2024")

# Map API route prefixes to required module/sub-module permissions
ROUTE_PERMISSION_MAP = {
    # Company Hub
    "/api/settings/clients": ["domestic_customers", "overseas_customers", "company_hub"],
    "/api/domestic-customers": ["domestic_customers"],
    "/api/overseas-customers": ["overseas_customers"],
    "/api/vendors": ["vendors"],
    "/api/team-members": ["team_members"],
    "/api/weekly-meetings": ["weekly_meetings"],
    
    # My Workspace
    "/api/employee/attendance": ["my_attendance"],
    "/api/employee/travel": ["travel_log"],
    "/api/employee/overtime": ["overtime_requests"],
    "/api/employee/leave": ["leave_management"],
    "/api/employee/permission": ["permission_requests"],
    "/api/employee/expenses": ["expense_claims"],
    "/api/employee/transport": ["transport_requests"],
    
    # Projects Department
    "/api/projects": ["projects_services", "project_management", "projects_dept"],
    "/api/order-summary": ["order_summary"],
    "/api/weekly-billing": ["weekly_billing"],
    "/api/amc": ["amc_management"],
    "/api/calibration": ["calibration_services"],
    "/api/customer-service": ["service_reports"],
    
    # Sales Department
    "/api/sales": ["sales_dept", "sales_dashboard"],
    "/api/customer-management": ["customer_management"],
    "/api/enquiries": ["enquiries"],
    "/api/quotations": ["quotations"],
    "/api/orders": ["orders"],
    "/api/lead-management": ["sales_dept", "lead_management"],
    "/api/project-profit": ["project_profit"],
    
    # Accounts Department
    "/api/accounts": ["accounts_dept", "accounts_dashboard"],
    "/api/expense-management": ["expense_management"],
    "/api/invoices": ["invoices"],
    "/api/retention": ["retention"],
    "/api/payments": ["payments"],
    "/api/tds": ["tds"],
    "/api/billing": ["billing"],
    
    # Finance Department
    "/api/finance": ["finance_dept", "finance_dashboard"],
    "/api/budget": ["budget_management"],
    "/api/expense-approvals": ["expense_approvals"],
    
    # HR Department
    "/api/hr": ["hr_dept", "hr_dashboard"],
    "/api/attendance-management": ["attendance_management"],
    "/api/travel-management": ["travel_management"],
    "/api/employees": ["employee_management"],
    "/api/payroll": ["payroll_dashboard", "payroll_records"],
    "/api/statutory": ["statutory_reports"],
    "/api/advances": ["advances_loans"],
    "/api/leave-dashboard": ["leave_dashboard"],
    "/api/overtime-management": ["overtime_management"],
    "/api/permission-approvals": ["permission_approvals"],
    
    # Purchase Department
    "/api/purchase": ["purchase_dept", "purchase_dashboard"],
    "/api/procurement": ["procurement"],
    "/api/purchase-orders": ["purchase_orders"],
    "/api/inventory": ["inventory"],
    
    # Exports Department  
    "/api/exports": ["exports_dept", "exports_dashboard"],
    "/api/shipping": ["shipping_docs"],
    "/api/customs": ["customs_clearance"],
    
    # Operations Department
    "/api/operations": ["operations_dept", "operations_dashboard"],
    "/api/resources": ["resource_planning"],
    "/api/maintenance": ["maintenance_schedule"],
    
    # Management Hub
    "/api/ceo/approvals": ["payment_approvals"],
    "/api/reports-center": ["reports_center"],
    
    # Administration
    "/api/admin/users": ["user_management"],
    "/api/user-access": ["user_access_control"],
    "/api/admin/announcements": ["announcements"],
    "/api/admin/events": ["events_manager"],
    "/api/admin/holidays": ["holiday_calendar"],
    "/api/pdf-templates": ["pdf_templates"],
    "/api/zoho": ["zoho_integration"],
    "/api/settings/organization": ["org_settings"],
}

# Routes that are always accessible (no permission check needed)
PUBLIC_ROUTES = [
    "/api/auth",
    "/api/health",
    "/api/ping",
    "/api/docs",
    "/api/openapi",
    "/api/settings/organization",  # Basic org info for login page
]

# Routes accessible to any authenticated user
AUTH_ONLY_ROUTES = [
    "/api/me",
    "/api/user/me",
    "/api/notifications",
    "/api/profile",
]


def get_required_permissions(path: str) -> Optional[List[str]]:
    """
    Get the required permissions for a given route path.
    Returns None if no specific permissions are required.
    """
    # Check public routes first
    for public_route in PUBLIC_ROUTES:
        if path.startswith(public_route):
            return None
    
    # Check auth-only routes
    for auth_route in AUTH_ONLY_ROUTES:
        if path.startswith(auth_route):
            return []  # Empty list means auth required but no specific permission
    
    # Check permission-mapped routes
    for route_prefix, permissions in ROUTE_PERMISSION_MAP.items():
        if path.startswith(route_prefix):
            return permissions
    
    return None  # Default: no specific permission required


def check_user_permission(user: dict, required_permissions: List[str]) -> bool:
    """
    Check if a user has at least one of the required permissions.
    Super admins always have access.
    """
    if not user:
        return False
    
    # Super admin has access to everything
    if user.get("role") == "super_admin":
        return True
    
    # Admin has access to most things (except super admin only)
    if user.get("role") == "admin":
        return True
    
    # If no specific permissions required, allow access
    if not required_permissions:
        return True
    
    # Check user's permissions
    permissions = user.get("permissions", {})
    modules = permissions.get("modules", {})
    sub_modules = permissions.get("sub_modules", {})
    
    # Check if user has access to any of the required modules/sub-modules
    for perm in required_permissions:
        if modules.get(perm) or sub_modules.get(perm):
            return True
    
    return False


def require_permission(*required_perms: str):
    """
    Dependency factory that creates a permission checker for specific permissions.
    Usage: Depends(require_permission("sales_dept", "quotations"))
    """
    async def permission_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if not credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = credentials.credentials
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Import here to avoid circular dependency
        from core.database import db
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check permissions
        if not check_user_permission(user, list(required_perms)):
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required permission: {', '.join(required_perms)}"
            )
        
        return user
    
    return permission_checker


def require_module_access(module_id: str):
    """
    Dependency that checks if user has access to a specific module.
    Usage: Depends(require_module_access("sales_dept"))
    """
    return require_permission(module_id)


def require_submodule_access(submodule_id: str):
    """
    Dependency that checks if user has access to a specific sub-module.
    Usage: Depends(require_submodule_access("quotations"))
    """
    return require_permission(submodule_id)


async def get_user_with_permissions(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """
    Get current user with their permissions included.
    Returns None if not authenticated.
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    from utils.database import db
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user
