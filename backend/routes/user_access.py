"""
User Access Control Module
Manages user-specific permissions for module access
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from utils.permissions import require_permission

load_dotenv()

router = APIRouter(prefix="/api/user-access", tags=["User Access Control"])

# Database connection
client = MongoClient(os.environ.get('MONGO_URL'))
db = client[os.environ.get('DB_NAME', 'test_database')]

# Define all available modules in the system
AVAILABLE_MODULES = {
    "company_hub": {
        "name": "Company Hub",
        "description": "Company-wide dashboard and shared resources",
        "sub_modules": [
            {"id": "company_dashboard", "name": "Dashboard", "path": "/company-hub"},
            {"id": "domestic_customers", "name": "Domestic Customers", "path": "/domestic-customers"},
            {"id": "overseas_customers", "name": "Overseas Customers", "path": "/overseas-customers"},
            {"id": "vendors", "name": "Vendors", "path": "/vendors"},
            {"id": "team_members", "name": "Team Members", "path": "/team-members"},
            {"id": "weekly_meetings", "name": "Weekly Meetings", "path": "/company-hub/weekly-meetings"},
            {"id": "payment_requests_company", "name": "Payment Requests", "path": "/company-hub/payment-requests"},
        ]
    },
    "my_workspace": {
        "name": "My Workspace",
        "description": "Personal employee workspace",
        "sub_modules": [
            {"id": "my_dashboard", "name": "My Dashboard", "path": "/employee/dashboard"},
            {"id": "my_attendance", "name": "My Attendance", "path": "/employee/attendance"},
            {"id": "travel_log", "name": "Travel Log", "path": "/employee/travel-log"},
            {"id": "overtime_requests", "name": "Overtime Requests", "path": "/employee/overtime"},
            {"id": "leave_management", "name": "Leave Management", "path": "/employee/leave"},
            {"id": "permission_requests", "name": "Permission Requests", "path": "/employee/permission"},
            {"id": "expense_claims", "name": "Expense Claims", "path": "/employee/expenses"},
            {"id": "transport_requests", "name": "Transport Requests", "path": "/employee/transport"},
            {"id": "my_journey", "name": "My Journey", "path": "/employee/journey"},
            {"id": "my_reports", "name": "My Reports", "path": "/employee/reports"},
            {"id": "my_profile", "name": "My Profile", "path": "/employee/profile"},
        ]
    },
    "projects_dept": {
        "name": "Projects Department",
        "description": "Project management and execution",
        "sub_modules": [
            {"id": "projects_dashboard", "name": "Dashboard", "path": "/"},
            {"id": "order_summary", "name": "Order Summary", "path": "/projects/order-handoff"},
            {"id": "projects_services", "name": "Projects & Services", "path": "/projects"},
            {"id": "project_management", "name": "Project Management", "path": "/projects/lifecycle"},
            {"id": "weekly_billing", "name": "Weekly Billing", "path": "/projects/weekly-billing"},
            {"id": "payment_requests_projects", "name": "Payment Requests", "path": "/projects/payment-requests"},
            {"id": "work_planner_projects", "name": "Work Planner", "path": "/projects/work-schedule"},
            {"id": "amc_management", "name": "AMC Management", "path": "/projects/amc-management"},
            {"id": "project_reports", "name": "Project Reports", "path": "/projects/project-reports"},
            {"id": "calibration_services", "name": "Calibration Services", "path": "/projects/calibration"},
            {"id": "service_reports", "name": "Service Reports", "path": "/projects/customer-service"},
        ]
    },
    "sales_dept": {
        "name": "Sales Department",
        "description": "Sales and customer relations",
        "sub_modules": [
            {"id": "sales_dashboard", "name": "Dashboard", "path": "/sales"},
            {"id": "customer_management", "name": "Customer Management", "path": "/sales/customer-management"},
            {"id": "work_planner_sales", "name": "Work Planner", "path": "/sales/work-planner"},
            {"id": "enquiries", "name": "Enquiries", "path": "/sales/enquiries"},
            {"id": "quotations", "name": "Quotations", "path": "/sales/quotations"},
            {"id": "orders", "name": "Orders", "path": "/sales/orders"},
            {"id": "order_management", "name": "Order Management", "path": "/sales/order-lifecycle"},
            {"id": "project_profit", "name": "Project Profit", "path": "/sales/project-profit"},
        ]
    },
    "accounts_dept": {
        "name": "Accounts Department",
        "description": "Financial accounting and billing",
        "sub_modules": [
            {"id": "accounts_dashboard", "name": "Dashboard", "path": "/accounts"},
            {"id": "work_planner_accounts", "name": "Work Planner", "path": "/accounts/work-planner"},
            {"id": "expense_management", "name": "Expense Management", "path": "/accounts/expense-management"},
            {"id": "invoices", "name": "Invoices", "path": "/accounts/invoices"},
            {"id": "retention", "name": "Retention", "path": "/accounts/retention"},
            {"id": "payments", "name": "Payments", "path": "/accounts/payments"},
            {"id": "tds", "name": "TDS", "path": "/accounts/tds"},
            {"id": "billing", "name": "Billing", "path": "/accounts/billing"},
        ]
    },
    "finance_dept": {
        "name": "Finance Department",
        "description": "Financial management and approvals",
        "sub_modules": [
            {"id": "finance_dashboard", "name": "Dashboard", "path": "/finance"},
            {"id": "work_planner_finance", "name": "Work Planner", "path": "/finance/work-planner"},
            {"id": "budget_management", "name": "Budget Management", "path": "/finance/budget"},
            {"id": "expense_approvals", "name": "Expense Approvals", "path": "/finance/expense-approvals"},
        ]
    },
    "hr_dept": {
        "name": "HR Department",
        "description": "Human resources management",
        "sub_modules": [
            {"id": "hr_dashboard", "name": "Dashboard", "path": "/hr"},
            {"id": "work_planner_hr", "name": "Work Planner", "path": "/hr/work-planner"},
            {"id": "attendance_management", "name": "Attendance Management", "path": "/hr/attendance-management"},
            {"id": "travel_management", "name": "Travel Log Management", "path": "/hr/travel-management"},
            {"id": "employee_management", "name": "Employee Management", "path": "/hr/employees"},
            {"id": "payroll_dashboard", "name": "Payroll Dashboard", "path": "/hr/payroll-dashboard"},
            {"id": "payroll_records", "name": "Payroll Records", "path": "/hr/payroll"},
            {"id": "statutory_reports", "name": "Statutory Reports", "path": "/hr/statutory-reports"},
            {"id": "advances_loans", "name": "Advances & Loans", "path": "/hr/advances"},
            {"id": "leave_dashboard", "name": "Leave Management", "path": "/hr/leave-dashboard"},
            {"id": "overtime_management", "name": "Overtime Management", "path": "/hr/overtime"},
            {"id": "permission_approvals", "name": "Permission Approvals", "path": "/hr/permission-approvals"},
        ]
    },
    "purchase_dept": {
        "name": "Purchase Department",
        "description": "Procurement and inventory",
        "sub_modules": [
            {"id": "purchase_dashboard", "name": "Dashboard", "path": "/purchase"},
            {"id": "work_planner_purchase", "name": "Work Planner", "path": "/purchase/work-planner"},
            {"id": "procurement", "name": "Procurement", "path": "/purchase/procurement"},
            {"id": "purchase_orders", "name": "Purchase Orders", "path": "/purchase/orders"},
            {"id": "vendors_purchase", "name": "Vendors", "path": "/purchase/vendors"},
            {"id": "inventory", "name": "Inventory", "path": "/purchase/inventory"},
        ]
    },
    "exports_dept": {
        "name": "Exports Department",
        "description": "Export operations and shipping",
        "sub_modules": [
            {"id": "exports_dashboard", "name": "Dashboard", "path": "/exports"},
            {"id": "work_planner_exports", "name": "Work Planner", "path": "/exports/work-planner"},
            {"id": "export_customers", "name": "Export Customers", "path": "/exports/customers"},
            {"id": "export_orders", "name": "Export Orders", "path": "/exports/orders"},
            {"id": "shipping_docs", "name": "Shipping Docs", "path": "/exports/shipping"},
            {"id": "customs_clearance", "name": "Customs Clearance", "path": "/exports/customs"},
        ]
    },
    "operations_dept": {
        "name": "Operations Department",
        "description": "Operations and maintenance",
        "sub_modules": [
            {"id": "operations_dashboard", "name": "Dashboard", "path": "/operations"},
            {"id": "work_planner_operations", "name": "Work Planner", "path": "/operations/work-planner"},
            {"id": "resource_planning", "name": "Resource Planning", "path": "/operations/resources"},
            {"id": "maintenance_schedule", "name": "Maintenance Schedule", "path": "/operations/maintenance"},
        ]
    },
    "management_hub": {
        "name": "Management Hub",
        "description": "Executive management tools",
        "sub_modules": [
            {"id": "payment_approvals", "name": "Payment Approvals", "path": "/ceo/approvals"},
            {"id": "reports_center", "name": "Reports Center", "path": "/company-hub/reports"},
        ]
    },
    "administration": {
        "name": "Administration",
        "description": "System administration and settings",
        "sub_modules": [
            {"id": "org_settings", "name": "Organization Settings", "path": "/settings"},
            {"id": "user_management", "name": "User Management", "path": "/admin/users"},
            {"id": "user_access_control", "name": "User Access Control", "path": "/admin/user-access"},
            {"id": "announcements", "name": "Announcements", "path": "/admin/announcements"},
            {"id": "events_manager", "name": "Events Manager", "path": "/admin/events"},
            {"id": "holiday_calendar", "name": "Holiday Calendar", "path": "/admin/holidays"},
            {"id": "pdf_templates", "name": "PDF Templates", "path": "/admin/pdf-templates"},
            {"id": "zoho_integration", "name": "Zoho Integration", "path": "/settings/zoho"},
        ]
    }
}

# Pydantic models
class UserPermissions(BaseModel):
    modules: Dict[str, bool] = {}  # module_id -> has_access
    sub_modules: Dict[str, bool] = {}  # sub_module_id -> has_access

class UpdatePermissionsRequest(BaseModel):
    user_id: str
    modules: Dict[str, bool]
    sub_modules: Dict[str, bool]


@router.get("/modules")
async def get_available_modules(current_user: dict = Depends(require_permission("user_access_control", "administration"))):
    """Get all available modules and sub-modules - Admin only"""
    return {
        "modules": AVAILABLE_MODULES
    }


@router.get("/user/{user_id}")
async def get_user_permissions(user_id: str, current_user: dict = Depends(require_permission("user_access_control", "administration"))):
    """Get permissions for a specific user - Admin only"""
    
    # Find user
    user = db.users.find_one({"id": user_id})
    if not user:
        # Try with _id
        from bson import ObjectId
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's permissions (or default to empty)
    permissions = user.get("permissions", {})
    
    # For super_admin, return all permissions as true
    if user.get("role") == "super_admin":
        all_modules = {}
        all_sub_modules = {}
        for module_id, module_data in AVAILABLE_MODULES.items():
            all_modules[module_id] = True
            for sub in module_data.get("sub_modules", []):
                all_sub_modules[sub["id"]] = True
        permissions = {
            "modules": all_modules,
            "sub_modules": all_sub_modules
        }
    
    return {
        "user_id": user.get("id", str(user.get("_id"))),
        "user_name": user.get("name"),
        "role": user.get("role"),
        "permissions": permissions
    }


@router.put("/user/{user_id}")
async def update_user_permissions(user_id: str, request: UpdatePermissionsRequest, current_user: dict = Depends(require_permission("user_access_control", "administration"))):
    """Update permissions for a specific user - Admin only"""
    
    # Find user
    user = db.users.find_one({"id": user_id})
    if not user:
        from bson import ObjectId
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow modifying super_admin permissions
    if user.get("role") == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify super_admin permissions")
    
    # Update permissions
    permissions = {
        "modules": request.modules,
        "sub_modules": request.sub_modules,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.users.update_one(
        {"id": user_id} if user.get("id") else {"_id": user.get("_id")},
        {"$set": {"permissions": permissions}}
    )
    
    return {
        "message": "Permissions updated successfully",
        "user_id": user_id,
        "permissions": permissions
    }


@router.get("/users-list")
async def get_users_with_permissions(current_user: dict = Depends(require_permission("user_access_control", "administration"))):
    """Get all users with their current permissions - Admin only"""
    
    users = list(db.users.find({}, {
        "_id": 0,
        "id": 1,
        "name": 1,
        "email": 1,
        "role": 1,
        "department": 1,
        "designation": 1,
        "permissions": 1,
        "is_active": 1
    }))
    
    # Add permissions summary
    for user in users:
        perms = user.get("permissions", {})
        modules = perms.get("modules", {})
        user["modules_count"] = sum(1 for v in modules.values() if v)
        user["total_modules"] = len(AVAILABLE_MODULES)
    
    return {"users": users}


@router.post("/bulk-update")
async def bulk_update_permissions(updates: List[UpdatePermissionsRequest], current_user: dict = Depends(require_permission("user_access_control", "administration"))):
    """Update permissions for multiple users at once - Admin only"""
    
    results = []
    for update in updates:
        try:
            user = db.users.find_one({"id": update.user_id})
            if not user:
                results.append({"user_id": update.user_id, "status": "error", "message": "User not found"})
                continue
            
            if user.get("role") == "super_admin":
                results.append({"user_id": update.user_id, "status": "skipped", "message": "Cannot modify super_admin"})
                continue
            
            permissions = {
                "modules": update.modules,
                "sub_modules": update.sub_modules,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            db.users.update_one(
                {"id": update.user_id},
                {"$set": {"permissions": permissions}}
            )
            
            results.append({"user_id": update.user_id, "status": "success"})
        except Exception as e:
            results.append({"user_id": update.user_id, "status": "error", "message": str(e)})
    
    return {"results": results}


@router.post("/copy-permissions")
async def copy_permissions(source_user_id: str, target_user_ids: List[str]):
    """Copy permissions from one user to others"""
    
    # Get source user
    source_user = db.users.find_one({"id": source_user_id})
    if not source_user:
        raise HTTPException(status_code=404, detail="Source user not found")
    
    source_permissions = source_user.get("permissions", {})
    
    results = []
    for target_id in target_user_ids:
        target_user = db.users.find_one({"id": target_id})
        if not target_user:
            results.append({"user_id": target_id, "status": "error", "message": "User not found"})
            continue
        
        if target_user.get("role") == "super_admin":
            results.append({"user_id": target_id, "status": "skipped", "message": "Cannot modify super_admin"})
            continue
        
        permissions = {
            **source_permissions,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "copied_from": source_user_id
        }
        
        db.users.update_one(
            {"id": target_id},
            {"$set": {"permissions": permissions}}
        )
        
        results.append({"user_id": target_id, "status": "success"})
    
    return {"results": results}
