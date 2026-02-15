"""
Shared utility functions for department access control
"""
from typing import List

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


def can_access_department(user: dict, target_department: str) -> bool:
    """Check if user can access a specific department's data"""
    if user.get("role") == "super_admin":
        return True
    if user.get("department") == target_department:
        return True
    if target_department in user.get("can_view_departments", []):
        return True
    return False


def get_user_departments(user: dict) -> List[str]:
    """Get list of all departments a user can access"""
    if user.get("role") == "super_admin":
        return [d["code"] for d in DEPARTMENTS]
    
    departments = []
    if user.get("department"):
        departments.append(user["department"])
    departments.extend(user.get("can_view_departments", []))
    return list(set(departments))
