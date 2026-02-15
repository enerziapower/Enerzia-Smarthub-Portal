"""
Employee Hub Routes - Self-service features for employees
Includes: Overtime Requests, Permission Requests, Transport Requests, Leave Management, Expense Claims
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os

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

@router.get("/overtime")
async def get_overtime_requests(user_id: Optional[str] = None, status: Optional[str] = None):
    """Get overtime requests, optionally filtered by user_id and status"""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if status:
        query["status"] = status
    
    cursor = db.overtime_requests.find(query).sort("created_at", -1)
    requests = []
    async for doc in cursor:
        requests.append(serialize_doc(doc))
    return {"requests": requests}


@router.post("/overtime")
async def create_overtime_request(request: OvertimeRequest, user_id: str, user_name: str, department: str):
    """Create a new overtime request"""
    doc = {
        **request.dict(),
        "user_id": user_id,
        "user_name": user_name,
        "department": department,
        "status": "pending",
        "approved_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.overtime_requests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Overtime request submitted", "request": doc}


@router.put("/overtime/{request_id}/approve")
async def approve_overtime_request(request_id: str, approved_by: str):
    """Approve an overtime request"""
    result = await db.overtime_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "approved", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request approved"}


@router.put("/overtime/{request_id}/reject")
async def reject_overtime_request(request_id: str, approved_by: str):
    """Reject an overtime request"""
    result = await db.overtime_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request rejected"}


@router.delete("/overtime/{request_id}")
async def delete_overtime_request(request_id: str):
    """Delete an overtime request"""
    result = await db.overtime_requests.delete_one({"_id": ObjectId(request_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
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
    """Approve a permission request"""
    result = await db.permission_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "approved", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request approved"}


@router.put("/permission/{request_id}/reject")
async def reject_permission_request(request_id: str, approved_by: str):
    """Reject a permission request"""
    result = await db.permission_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
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
    """Approve a transport request"""
    update_data = {"status": "approved", "approved_by": approved_by}
    if vehicle:
        update_data["vehicle"] = vehicle
    
    result = await db.transport_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request approved"}


@router.put("/transport/{request_id}/reject")
async def reject_transport_request(request_id: str, approved_by: str):
    """Reject a transport request"""
    result = await db.transport_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
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
    """Approve a leave request"""
    result = await db.leave_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "approved", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Leave request approved"}


@router.put("/leave/{request_id}/reject")
async def reject_leave_request(request_id: str, approved_by: str):
    """Reject a leave request"""
    result = await db.leave_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
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
    """Approve an expense claim"""
    result = await db.expense_claims.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {"status": "approved", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")
    return {"message": "Claim approved"}


@router.put("/expenses/{claim_id}/reject")
async def reject_expense_claim(claim_id: str, approved_by: str):
    """Reject an expense claim"""
    result = await db.expense_claims.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {"status": "rejected", "approved_by": approved_by}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")
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
    """Get attendance records for a user with detailed summary for payroll"""
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
    
    cursor = db.attendance.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }).sort("date", 1)
    
    records = []
    async for doc in cursor:
        records.append(serialize_doc(doc))
    
    # Calculate detailed summary for payroll
    present = sum(1 for r in records if r.get("status") == "present")
    absent = sum(1 for r in records if r.get("status") == "absent")
    half_days = sum(1 for r in records if r.get("status") == "half-day")
    on_leave = sum(1 for r in records if r.get("status") == "on-leave")
    holidays = sum(1 for r in records if r.get("status") == "holiday")
    permission = sum(1 for r in records if r.get("status") == "permission")
    
    # Calculate total work hours and overtime
    total_work_hours = sum(r.get("work_hours", 0) for r in records)
    total_overtime = sum(r.get("overtime", 0) for r in records)
    
    # Days with overtime
    overtime_days = sum(1 for r in records if r.get("overtime", 0) > 0)
    
    return {
        "records": records,
        "summary": {
            "present": present,
            "absent": absent,
            "halfDays": half_days,
            "onLeave": on_leave,
            "holidays": holidays,
            "permission": permission,
            "totalDays": len(records),
            "totalWorkHours": round(total_work_hours, 2),
            "totalOvertime": round(total_overtime, 2),
            "overtimeDays": overtime_days
        },
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

