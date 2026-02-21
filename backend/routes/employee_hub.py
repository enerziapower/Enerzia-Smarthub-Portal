"""
Employee Hub Routes - Self-service features for employees
Includes: Overtime Requests, Permission Requests, Transport Requests, Leave Management, Expense Claims
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import calendar

router = APIRouter(prefix="/api/employee", tags=["Employee Hub"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============= MODELS =============

class OvertimeRequest(BaseModel):
    date: str
    hours: float
    reason: str
    project: str


class OvertimeRequestInDB(OvertimeRequest):
    id: str
    user_id: str
    user_name: str
    department: str
    status: str = "pending"
    approved_by: Optional[str] = None
    created_at: str


class PermissionRequest(BaseModel):
    date: str
    type: str  # Late Coming, Early Leaving, Short Leave
    time: str
    duration: str
    reason: str


class PermissionRequestInDB(PermissionRequest):
    id: str
    user_id: str
    user_name: str
    department: str
    status: str = "pending"
    approved_by: Optional[str] = None
    created_at: str


class TransportRequest(BaseModel):
    date: str
    type: str  # Company Vehicle, Cab Reimbursement
    pickup: str
    drop: str
    time: str
    purpose: str


class TransportRequestInDB(TransportRequest):
    id: str
    user_id: str
    user_name: str
    department: str
    status: str = "pending"
    vehicle: Optional[str] = None
    created_at: str


class LeaveRequest(BaseModel):
    type: str  # Casual Leave, Sick Leave, Earned Leave, Comp Off
    from_date: str
    to_date: str
    reason: str


class LeaveRequestInDB(LeaveRequest):
    id: str
    user_id: str
    user_name: str
    department: str
    days: int
    status: str = "pending"
    applied_on: str


class ExpenseClaim(BaseModel):
    category: str  # Travel, Food, Transport, Accommodation, Communication, Miscellaneous
    description: str
    amount: float
    date: str
    receipt_url: Optional[str] = None


class ExpenseClaimInDB(ExpenseClaim):
    id: str
    user_id: str
    user_name: str
    department: str
    status: str = "pending"
    created_at: str


# Helper to serialize MongoDB documents
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ============= OVERTIME REQUESTS =============
# Connected to HR Overtime Management - Employee requests flow to HR for approval
# Approved requests are automatically included in payroll calculations

import uuid

@router.get("/overtime")
async def get_overtime_requests(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get overtime requests for an employee from the unified hr_overtime collection"""
    query = {}
    if user_id:
        # Match by user_id or emp_id (for employees linked to HR records)
        query["$or"] = [{"user_id": user_id}, {"emp_id": user_id}]
    if status:
        query["status"] = status
    
    # Use hr_overtime collection (unified with HR module)
    cursor = db.hr_overtime.find(query, {"_id": 0}).sort("created_at", -1)
    requests = await cursor.to_list(100)
    return {"requests": requests}


@router.post("/overtime")
async def create_overtime_request(request: OvertimeRequest, user_id: str, user_name: str, department: str):
    """
    Create a new overtime request - goes to HR for approval
    Once approved by HR, it will be included in payroll calculations
    OT Rate is auto-calculated from employee's gross salary: (Gross ÷ 208) × 2
    """
    # OT Rate Calculation Constants
    WORKING_HOURS_PER_MONTH = 208  # 26 days × 8 hours
    OT_MULTIPLIER = 2.0
    
    # Try to find linked employee record for emp_id and salary
    employee = await db.hr_employees.find_one(
        {"$or": [{"user_id": user_id}, {"id": user_id}, {"email": user_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "gross_salary": 1, "salary": 1}
    )
    
    emp_id = employee.get("emp_id", user_id) if employee else user_id
    emp_name = employee.get("name", user_name) if employee else user_name
    emp_dept = employee.get("department", department) if employee else department
    
    # Get gross salary and calculate OT rate
    gross_salary = 0
    if employee:
        gross_salary = employee.get("gross_salary", 0)
        # If gross_salary not available, calculate from salary components
        if not gross_salary and employee.get("salary"):
            salary = employee["salary"]
            gross_salary = sum([
                salary.get("basic", 0),
                salary.get("hra", 0),
                salary.get("conveyance", 0),
                salary.get("medical", 0),
                salary.get("special_allowance", 0),
                salary.get("other_allowance", 0)
            ])
    
    # Calculate OT rate from gross salary: (Gross ÷ 208) × 2
    if gross_salary > 0:
        hourly_rate = gross_salary / WORKING_HOURS_PER_MONTH
        ot_rate = round(hourly_rate * OT_MULTIPLIER, 2)
    else:
        hourly_rate = 0
        ot_rate = 100  # Default fallback if no salary info
    
    doc = {
        "id": str(uuid.uuid4()),
        "emp_id": emp_id,
        "emp_name": emp_name,
        "department": emp_dept,
        "user_id": user_id,  # Keep user_id for employee lookup
        "date": request.date,
        "hours": request.hours,
        "gross_salary": gross_salary,
        "hourly_rate": round(hourly_rate, 2),
        "ot_multiplier": OT_MULTIPLIER,
        "rate_per_hour": ot_rate,
        "amount": round(request.hours * ot_rate, 2),
        "reason": request.reason,
        "project": request.project,
        "status": "pending",  # Pending HR approval
        "source": "employee_request",  # Track that this came from employee
        "approved_by": None,
        "approved_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert into hr_overtime collection (unified with HR module)
    await db.hr_overtime.insert_one(doc)
    doc.pop("_id", None)
    
    return {"message": "Overtime request submitted for HR approval", "request": doc}


@router.put("/overtime/{request_id}/withdraw")
async def withdraw_overtime_request(request_id: str, user_id: str):
    """Withdraw a pending overtime request (employee can only withdraw their own pending requests)"""
    result = await db.hr_overtime.delete_one({
        "id": request_id,
        "$or": [{"user_id": user_id}, {"emp_id": user_id}],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or cannot be withdrawn")
    
    return {"message": "Overtime request withdrawn"}


@router.delete("/overtime/{request_id}")
async def delete_overtime_request(request_id: str):
    """Delete an overtime request (only pending requests can be deleted)"""
    # Try both id formats (uuid and ObjectId)
    result = await db.hr_overtime.delete_one({"id": request_id, "status": "pending"})
    
    if result.deleted_count == 0:
        # Try with ObjectId format for backward compatibility
        try:
            result = await db.overtime_requests.delete_one({"_id": ObjectId(request_id)})
        except:
            pass
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    
    return {"message": "Request deleted"}


# ============= PERMISSION REQUESTS =============

@router.get("/permission")
async def get_permission_requests(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get permission requests"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    cursor = db.permission_requests.find(query).sort("created_at", -1)
    requests = []
    async for doc in cursor:
        requests.append(serialize_doc(doc))
    return {"requests": requests}


@router.post("/permission")
async def create_permission_request(request: PermissionRequest, user_id: str, user_name: str, department: str):
    """Create a new permission request"""
    doc = {
        **request.dict(),
        "user_id": user_id,
        "user_name": user_name,
        "department": department,
        "status": "pending",
        "approved_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.permission_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Permission request submitted", "request": doc}


@router.put("/permission/{request_id}/approve")
async def approve_permission_request(request_id: str, approved_by: str):
    """Approve a permission request - handles both ObjectId and string id formats"""
    result = None
    try:
        result = await db.permission_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.permission_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return {"message": "Request approved"}


@router.put("/permission/{request_id}/reject")
async def reject_permission_request(request_id: str, approved_by: str):
    """Reject a permission request - handles both ObjectId and string id formats"""
    result = None
    try:
        result = await db.permission_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.permission_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return {"message": "Request rejected"}


# ============= TRANSPORT REQUESTS =============

@router.get("/transport")
async def get_transport_requests(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get transport requests"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    cursor = db.transport_requests.find(query).sort("created_at", -1)
    requests = []
    async for doc in cursor:
        requests.append(serialize_doc(doc))
    return {"requests": requests}


@router.post("/transport")
async def create_transport_request(request: TransportRequest, user_id: str, user_name: str, department: str):
    """Create a new transport request"""
    doc = {
        **request.dict(),
        "user_id": user_id,
        "user_name": user_name,
        "department": department,
        "status": "pending",
        "vehicle": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.transport_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Transport request submitted", "request": doc}


@router.put("/transport/{request_id}/approve")
async def approve_transport_request(request_id: str, approved_by: str, vehicle: Optional[str] = None):
    """Approve a transport request - handles both ObjectId and string id formats"""
    update_data = {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}
    if vehicle:
        update_data["vehicle"] = vehicle
    
    result = None
    try:
        result = await db.transport_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": update_data}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.transport_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": update_data}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return {"message": "Request approved"}


@router.put("/transport/{request_id}/reject")
async def reject_transport_request(request_id: str, approved_by: str):
    """Reject a transport request - handles both ObjectId and string id formats"""
    result = None
    try:
        result = await db.transport_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.transport_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    return {"message": "Request rejected"}


# ============= LEAVE REQUESTS =============

@router.get("/leave")
async def get_leave_requests(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get leave requests"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    cursor = db.leave_requests.find(query).sort("applied_on", -1)
    requests = []
    async for doc in cursor:
        requests.append(serialize_doc(doc))
    return {"requests": requests}


@router.post("/leave")
async def create_leave_request(request: LeaveRequest, user_id: str, user_name: str, department: str):
    """Create a new leave request"""
    # Calculate days
    from_date = datetime.fromisoformat(request.from_date)
    to_date = datetime.fromisoformat(request.to_date)
    days = (to_date - from_date).days + 1
    
    doc = {
        **request.dict(),
        "user_id": user_id,
        "user_name": user_name,
        "department": department,
        "days": days,
        "status": "pending",
        "applied_on": datetime.now(timezone.utc).isoformat()
    }
    result = await db.leave_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Leave request submitted", "request": doc}


@router.put("/leave/{request_id}/approve")
async def approve_leave_request(request_id: str, approved_by: str):
    """Approve a leave request - handles both ObjectId and string id formats"""
    # Try to find and update using ObjectId first, then by string id
    result = None
    try:
        result = await db.leave_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    # If ObjectId didn't work, try with string id field
    if not result or result.modified_count == 0:
        result = await db.leave_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found or already processed")
    return {"message": "Leave request approved"}


@router.put("/leave/{request_id}/reject")
async def reject_leave_request(request_id: str, approved_by: str):
    """Reject a leave request - handles both ObjectId and string id formats"""
    # Try to find and update using ObjectId first, then by string id
    result = None
    try:
        result = await db.leave_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    # If ObjectId didn't work, try with string id field
    if not result or result.modified_count == 0:
        result = await db.leave_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found or already processed")
    return {"message": "Leave request rejected"}


@router.get("/leave/balance/{user_id}")
async def get_leave_balance(user_id: str):
    """Get leave balance for a user"""
    # Get default leave allocation (can be made configurable)
    default_balance = {
        "casual": {"total": 12, "used": 0, "balance": 12},
        "sick": {"total": 6, "used": 0, "balance": 6},
        "earned": {"total": 15, "used": 0, "balance": 15},
        "compOff": {"total": 2, "used": 0, "balance": 2}
    }
    
    # Calculate used leaves from approved requests
    pipeline = [
        {"$match": {"user_id": user_id, "status": "approved"}},
        {"$group": {
            "_id": "$type",
            "used": {"$sum": "$days"}
        }}
    ]
    
    cursor = db.leave_requests.aggregate(pipeline)
    async for item in cursor:
        leave_type = item["_id"].lower().replace(" ", "").replace("leave", "")
        if leave_type == "compoff":
            leave_type = "compOff"
        if leave_type in default_balance:
            default_balance[leave_type]["used"] = item["used"]
            default_balance[leave_type]["balance"] = default_balance[leave_type]["total"] - item["used"]
    
    return {"balance": default_balance}


# ============= EXPENSE CLAIMS =============

@router.get("/expenses")
async def get_expense_claims(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get expense claims"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    cursor = db.expense_claims.find(query).sort("created_at", -1)
    claims = []
    async for doc in cursor:
        claims.append(serialize_doc(doc))
    return {"claims": claims}


@router.post("/expenses")
async def create_expense_claim(claim: ExpenseClaim, user_id: str, user_name: str, department: str):
    """Create a new expense claim"""
    doc = {
        **claim.dict(),
        "user_id": user_id,
        "user_name": user_name,
        "department": department,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.expense_claims.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Expense claim submitted", "claim": doc}


@router.put("/expenses/{claim_id}/approve")
async def approve_expense_claim(claim_id: str, approved_by: str):
    """Approve an expense claim - handles both ObjectId and string id formats"""
    result = None
    try:
        result = await db.expense_claims.update_one(
            {"_id": ObjectId(claim_id), "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.expense_claims.update_one(
            {"id": claim_id, "status": "pending"},
            {"$set": {"status": "approved", "approved_by": approved_by, "approved_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found or already processed")
    return {"message": "Claim approved"}


@router.put("/expenses/{claim_id}/reject")
async def reject_expense_claim(claim_id: str, approved_by: str):
    """Reject an expense claim - handles both ObjectId and string id formats"""
    result = None
    try:
        result = await db.expense_claims.update_one(
            {"_id": ObjectId(claim_id), "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    
    if not result or result.modified_count == 0:
        result = await db.expense_claims.update_one(
            {"id": claim_id, "status": "pending"},
            {"$set": {"status": "rejected", "approved_by": approved_by, "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if not result or result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found or already processed")
    return {"message": "Claim rejected"}


# ============= EMPLOYEE DASHBOARD =============

@router.get("/dashboard/{user_id}")
async def get_employee_dashboard(user_id: str):
    """Get dashboard stats for an employee"""
    # Count pending requests
    pending_leaves = await db.leave_requests.count_documents({"user_id": user_id, "status": "pending"})
    pending_expenses = await db.expense_claims.count_documents({"user_id": user_id, "status": "pending"})
    pending_ot = await db.overtime_requests.count_documents({"user_id": user_id, "status": "pending"})
    
    # Get leave balance
    leave_balance_data = await get_leave_balance(user_id)
    total_leave_balance = sum(v["balance"] for v in leave_balance_data["balance"].values())
    
    # Get recent activity
    recent_activity = []
    
    # Recent leave requests
    cursor = db.leave_requests.find({"user_id": user_id}).sort("applied_on", -1).limit(3)
    async for doc in cursor:
        recent_activity.append({
            "id": str(doc["_id"]),
            "type": "leave",
            "message": f"Leave request for {doc.get('days', 0)} days - {doc.get('type', '')}",
            "date": doc.get("applied_on", ""),
            "status": doc.get("status", "pending")
        })
    
    # Recent expense claims
    cursor = db.expense_claims.find({"user_id": user_id}).sort("created_at", -1).limit(2)
    async for doc in cursor:
        recent_activity.append({
            "id": str(doc["_id"]),
            "type": "expense",
            "message": f"Expense claim ₹{doc.get('amount', 0):,.0f} - {doc.get('category', '')}",
            "date": doc.get("created_at", ""),
            "status": doc.get("status", "pending")
        })
    
    # Sort by date
    recent_activity.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "stats": {
            "pendingLeaves": pending_leaves,
            "pendingExpenses": pending_expenses,
            "pendingOT": pending_ot,
            "totalLeaveBalance": total_leave_balance,
            "attendanceThisMonth": 22,  # Would need attendance tracking
            "achievements": 5  # Would need achievements tracking
        },
        "recentActivity": recent_activity[:5]
    }


# ============= ATTENDANCE =============

class AttendanceRecord(BaseModel):
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"  # present, absent, half-day, on-leave, holiday, permission, overtime


# Office timing configuration
OFFICE_START_TIME = "09:30"  # 9:30 AM
OFFICE_END_TIME = "18:00"    # 6:00 PM
STANDARD_WORK_HOURS = 8.5    # 8.5 hours (9:30 AM to 6:00 PM)
HALF_DAY_THRESHOLD = 4.0     # Less than 4 hours = Half Day


def calculate_work_hours(check_in: str, check_out: str) -> float:
    """Calculate total work hours from check-in and check-out times"""
    if not check_in or not check_out:
        return 0.0
    try:
        in_time = datetime.strptime(check_in, "%H:%M")
        out_time = datetime.strptime(check_out, "%H:%M")
        diff = (out_time - in_time).total_seconds() / 3600
        return round(diff, 2)
    except (ValueError, TypeError):
        return 0.0


def calculate_overtime(check_in: str, check_out: str) -> float:
    """Calculate overtime hours beyond standard work hours"""
    work_hours = calculate_work_hours(check_in, check_out)
    if work_hours > STANDARD_WORK_HOURS:
        return round(work_hours - STANDARD_WORK_HOURS, 2)
    return 0.0


def determine_attendance_status(check_in: str, check_out: str, manual_status: str = None) -> dict:
    """
    Determine attendance status based on check-in/check-out times
    Office hours: 9:30 AM to 6:00 PM (8.5 hours)
    """
    # If manual status is set (holiday, permission, on-leave), use that
    if manual_status in ['holiday', 'permission', 'on-leave']:
        return {"status": manual_status, "work_hours": 0, "overtime": 0}
    
    if not check_in:
        return {"status": "absent", "work_hours": 0, "overtime": 0}
    
    if not check_out:
        return {"status": "present", "work_hours": 0, "overtime": 0, "incomplete": True}
    
    work_hours = calculate_work_hours(check_in, check_out)
    overtime = calculate_overtime(check_in, check_out)
    
    if work_hours < HALF_DAY_THRESHOLD:
        status = "half-day"
    elif work_hours >= STANDARD_WORK_HOURS:
        status = "present"
    else:
        # Between half day and full day - could be permission or half-day
        status = "present"  # Default to present, can be manually adjusted
    
    return {
        "status": status,
        "work_hours": work_hours,
        "overtime": overtime
    }


@router.get("/attendance/{user_id}")
async def get_attendance(user_id: str, month: Optional[int] = None, year: Optional[int] = None):
    """
    Get comprehensive attendance records for a user including:
    - Check-in/Check-out records
    - Approved leaves
    - Approved permissions
    - Approved overtime
    - Auto-marked absents for past days
    - Weekends/Holidays
    """
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    # Build date range for the month
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Get number of days in month
    days_in_month = calendar.monthrange(year, month)[1]
    
    # 1. Fetch attendance records (check-in/out)
    cursor = db.attendance.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }).sort("date", 1)
    
    attendance_records = {}
    async for doc in cursor:
        record = serialize_doc(doc)
        attendance_records[record["date"]] = record
    
    # 2. Fetch approved leaves for the month
    leave_cursor = db.leave_requests.find({
        "user_id": user_id,
        "status": "approved",
        "$or": [
            {"from_date": {"$gte": start_date, "$lt": end_date}},
            {"to_date": {"$gte": start_date, "$lt": end_date}},
            {"from_date": {"$lte": start_date}, "to_date": {"$gte": end_date}}
        ]
    })
    
    leave_dates = {}
    async for leave in leave_cursor:
        # Parse leave dates and mark each day
        from_date = datetime.strptime(leave["from_date"], "%Y-%m-%d")
        to_date = datetime.strptime(leave["to_date"], "%Y-%m-%d")
        current = from_date
        while current <= to_date:
            date_str = current.strftime("%Y-%m-%d")
            if date_str >= start_date and date_str < end_date:
                leave_dates[date_str] = {
                    "type": leave.get("type", "Leave"),
                    "is_half_day": leave.get("is_half_day", False),
                    "half_day_type": leave.get("half_day_type", ""),  # morning/afternoon
                    "reason": leave.get("reason", "")
                }
            current += timedelta(days=1)
    
    # 3. Fetch approved permissions for the month
    permission_cursor = db.permission_requests.find({
        "user_id": user_id,
        "status": "approved",
        "date": {"$gte": start_date, "$lt": end_date}
    })
    
    permission_dates = {}
    async for perm in permission_cursor:
        date_str = perm.get("date")
        if date_str:
            permission_dates[date_str] = {
                "from_time": perm.get("from_time", ""),
                "to_time": perm.get("to_time", ""),
                "duration": perm.get("duration", 0),
                "reason": perm.get("reason", "")
            }
    
    # 4. Fetch approved overtime for the month
    overtime_cursor = db.hr_overtime.find({
        "$or": [
            {"user_id": user_id},
            {"emp_id": user_id}
        ],
        "status": "approved",
        "date": {"$gte": start_date, "$lt": end_date}
    })
    
    overtime_dates = {}
    async for ot in overtime_cursor:
        date_str = ot.get("date")
        if date_str:
            overtime_dates[date_str] = {
                "hours": ot.get("hours", 0),
                "amount": ot.get("amount", 0),
                "reason": ot.get("reason", "")
            }
    
    # 5. Fetch holidays from the holidays collection (Admin Hub)
    holiday_cursor = db.holidays.find({
        "date": {"$gte": start_date, "$lt": end_date}
    })
    
    public_holidays = {}
    async for holiday in holiday_cursor:
        date_str = holiday.get("date")
        if date_str:
            public_holidays[date_str] = {
                "name": holiday.get("name", "Holiday"),
                "type": holiday.get("type", "company"),  # national, regional, company
                "day": holiday.get("day", "")
            }
    
    # 6. Build comprehensive calendar with all data
    today = datetime.now().strftime("%Y-%m-%d")
    records = []
    
    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{month:02d}-{day:02d}"
        date_obj = datetime(year, month, day)
        day_of_week = date_obj.weekday()  # 0=Monday, 6=Sunday
        
        # Start with attendance record if exists
        record = attendance_records.get(date_str, {})
        
        # Determine status
        status = record.get("status", "")
        status_details = {}
        
        # Check for Sunday (holiday)
        if day_of_week == 6:  # Sunday
            status = "holiday"
            status_details = {"holiday_type": "weekly_off", "name": "Sunday"}
        
        # Check for public holiday
        elif date_str in public_holidays:
            status = "holiday"
            status_details = {"holiday_type": "public", "name": public_holidays[date_str]}
        
        # Check for approved leave
        elif date_str in leave_dates:
            leave_info = leave_dates[date_str]
            if leave_info.get("is_half_day"):
                status = "half-day"
                status_details = {
                    "type": "leave",
                    "leave_type": leave_info["type"],
                    "half_day_type": leave_info.get("half_day_type", ""),
                    "reason": leave_info.get("reason", "")
                }
            else:
                status = "on-leave"
                status_details = {
                    "type": "leave",
                    "leave_type": leave_info["type"],
                    "reason": leave_info.get("reason", "")
                }
        
        # If no status yet and date is in the past, mark as absent
        elif not status and date_str < today and day_of_week != 6:
            status = "absent"
            status_details = {"auto_marked": True}
        
        # Check for permission (can overlap with present)
        permission_info = permission_dates.get(date_str)
        if permission_info:
            status_details["has_permission"] = True
            status_details["permission"] = permission_info
        
        # Check for overtime (can overlap with present)
        overtime_info = overtime_dates.get(date_str)
        if overtime_info:
            status_details["has_overtime"] = True
            status_details["overtime_approved"] = overtime_info
        
        # Build the record
        final_record = {
            "date": date_str,
            "day_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day_of_week],
            "status": status or ("" if date_str >= today else "absent"),
            "check_in": record.get("check_in"),
            "check_out": record.get("check_out"),
            "work_hours": record.get("work_hours", 0),
            "overtime": record.get("overtime", 0),
            "details": status_details
        }
        
        records.append(final_record)
    
    # 6. Calculate summary
    present = sum(1 for r in records if r["status"] == "present")
    absent = sum(1 for r in records if r["status"] == "absent")
    half_days = sum(1 for r in records if r["status"] == "half-day")
    on_leave = sum(1 for r in records if r["status"] == "on-leave")
    holidays = sum(1 for r in records if r["status"] == "holiday")
    permission_count = sum(1 for r in records if r.get("details", {}).get("has_permission"))
    
    # Calculate total work hours and overtime
    total_work_hours = sum(r.get("work_hours", 0) for r in records)
    total_overtime = sum(r.get("overtime", 0) for r in records)
    
    # Approved OT hours from hr_overtime
    approved_ot_hours = sum(ot.get("hours", 0) for ot in overtime_dates.values())
    approved_ot_amount = sum(ot.get("amount", 0) for ot in overtime_dates.values())
    
    # Days with overtime
    overtime_days = sum(1 for r in records if r.get("overtime", 0) > 0 or r.get("details", {}).get("has_overtime"))
    
    # Calculate effective working days (for payroll)
    working_days = days_in_month - holidays
    effective_present = present + (half_days * 0.5)
    lop_days = max(0, working_days - effective_present - on_leave)
    
    return {
        "records": records,
        "summary": {
            "present": present,
            "absent": absent,
            "halfDays": half_days,
            "onLeave": on_leave,
            "holidays": holidays,
            "permission": permission_count,
            "totalDays": len(records),
            "workingDays": working_days,
            "effectivePresent": effective_present,
            "lopDays": lop_days,
            "totalWorkHours": round(total_work_hours, 2),
            "totalOvertime": round(total_overtime, 2),
            "approvedOTHours": approved_ot_hours,
            "approvedOTAmount": round(approved_ot_amount, 2),
            "overtimeDays": overtime_days
        },
        "leaves": list(leave_dates.items()),
        "permissions": list(permission_dates.items()),
        "overtimes": list(overtime_dates.items()),
        "officeTimings": {
            "startTime": OFFICE_START_TIME,
            "endTime": OFFICE_END_TIME,
            "standardHours": STANDARD_WORK_HOURS
        },
        "month": month,
        "year": year
    }


@router.post("/attendance/check-in")
async def check_in(user_id: str, user_name: str):
    """Record check-in time"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    check_in_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    # Check if already checked in
    existing = await db.attendance.find_one({"user_id": user_id, "date": today})
    if existing:
        return {"message": "Already checked in", "record": serialize_doc(existing)}
    
    doc = {
        "user_id": user_id,
        "user_name": user_name,
        "date": today,
        "check_in": check_in_time,
        "check_out": None,
        "status": "present",
        "work_hours": 0,
        "overtime": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.attendance.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Checked in successfully", "record": doc}


@router.post("/attendance/check-out")
async def check_out(user_id: str):
    """Record check-out time and calculate work hours"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    check_out_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    # Get the check-in record
    record = await db.attendance.find_one({"user_id": user_id, "date": today})
    if not record:
        return {"message": "No check-in record found for today"}
    
    check_in_time = record.get("check_in")
    
    # Calculate work hours and overtime
    status_info = determine_attendance_status(check_in_time, check_out_time, record.get("manual_status"))
    
    result = await db.attendance.update_one(
        {"user_id": user_id, "date": today},
        {"$set": {
            "check_out": check_out_time,
            "work_hours": status_info["work_hours"],
            "overtime": status_info["overtime"],
            "status": status_info["status"]
        }}
    )
    
    if result.modified_count == 0:
        return {"message": "Failed to update record"}
    
    return {
        "message": "Checked out successfully", 
        "check_out": check_out_time,
        "work_hours": status_info["work_hours"],
        "overtime": status_info["overtime"],
        "status": status_info["status"]
    }


# ============= MY JOURNEY / ACHIEVEMENTS =============

@router.get("/journey/{user_id}")
async def get_employee_journey(user_id: str):
    """Get employee journey/milestones"""
    # Get user data if exists
    user_doc = None
    try:
        if ObjectId.is_valid(user_id):
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        pass
    
    # Default journey data
    journey = {
        "joinDate": "2023-08-01",
        "yearsWithCompany": 2.5,
        "currentRole": "Engineer",
        "department": "Projects",
        "totalProjects": 12,
        "promotions": [
            {"title": "Junior Engineer to Engineer", "date": "2024-06-01"}
        ],
        "awards": [
            {"title": "Star Performer Q3 2024", "date": "2024-10-01"},
            {"title": "Best Team Player 2024", "date": "2024-12-15"}
        ],
        "certifications": [
            {"title": "Electrical Safety Certification", "date": "2024-03-01"},
            {"title": "Project Management Basics", "date": "2024-08-15"}
        ],
        "milestones": [
            {"title": "First Project Completed", "date": "2023-10-15", "type": "achievement"},
            {"title": "100% Attendance Q4 2024", "date": "2024-12-31", "type": "attendance"},
            {"title": "Completed 10 AMC Visits", "date": "2025-01-15", "type": "service"}
        ]
    }
    
    if user_doc:
        journey["currentRole"] = user_doc.get("role", "Employee")
        journey["department"] = user_doc.get("department", "Not Assigned")
    
    return journey

