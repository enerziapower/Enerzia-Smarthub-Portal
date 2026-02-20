"""
HR Payroll System - Comprehensive Employee & Payroll Management
Includes: Employee Master, Salary Structure, Payroll Processing, Statutory Compliance
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, date
from bson import ObjectId
import uuid
import os
import calendar

router = APIRouter(prefix="/api/hr", tags=["HR Payroll"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============= CONSTANTS =============

# Tamil Nadu Professional Tax Slabs (Monthly)
TN_PT_SLABS = [
    {"min": 0, "max": 21000, "tax": 0},
    {"min": 21001, "max": 30000, "tax": 135},
    {"min": 30001, "max": 45000, "tax": 315},
    {"min": 45001, "max": 60000, "tax": 690},
    {"min": 60001, "max": 75000, "tax": 1025},
    {"min": 75001, "max": float('inf'), "tax": 1250},
]

# EPF Rates
EPF_EMPLOYEE_RATE = 0.12  # 12%
EPF_EMPLOYER_RATE = 0.12  # 12% (3.67% EPF + 8.33% EPS)

# ESIC Rates (for gross <= 21000)
ESIC_EMPLOYEE_RATE = 0.0075  # 0.75%
ESIC_EMPLOYER_RATE = 0.0325  # 3.25%
ESIC_SALARY_LIMIT = 21000


# ============= MODELS =============

class BankDetails(BaseModel):
    account_number: str = ""
    ifsc_code: str = ""
    bank_name: str = ""
    branch: str = ""


class StatutoryDetails(BaseModel):
    pan_number: str = ""
    aadhar_number: str = ""
    uan_number: str = ""  # Universal Account Number for EPF
    esic_number: str = ""
    pf_account_number: str = ""


class EmergencyContact(BaseModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""
    address: str = ""


class SalaryComponent(BaseModel):
    basic: float = 0
    hra: float = 0
    da: float = 0  # Dearness Allowance
    conveyance: float = 0
    medical: float = 0
    special_allowance: float = 0
    other_allowance: float = 0


class EmployeeCreate(BaseModel):
    # Basic Information
    emp_id: str
    name: str
    email: str = ""
    phone: str = ""
    department: str = ""
    designation: str = ""
    
    # Personal Details
    date_of_birth: str = ""
    gender: str = ""  # Male, Female, Other
    blood_group: str = ""
    marital_status: str = ""  # Single, Married, Divorced, Widowed
    father_name: str = ""
    spouse_name: str = ""
    
    # Address
    current_address: str = ""
    permanent_address: str = ""
    
    # Employment Details
    join_date: str = ""
    confirmation_date: str = ""
    employment_type: str = "permanent"  # permanent, contract, probation, intern
    status: str = "active"  # active, inactive, resigned, terminated
    reporting_to: str = ""
    
    # Bank Details
    bank_details: BankDetails = BankDetails()
    
    # Statutory Details
    statutory: StatutoryDetails = StatutoryDetails()
    
    # Emergency Contact
    emergency_contact: EmergencyContact = EmergencyContact()
    
    # Salary Structure
    salary: SalaryComponent = SalaryComponent()
    
    # Leave Balance (Annual)
    leave_balance: Dict[str, float] = {
        "casual_leave": 12,
        "sick_leave": 12,
        "earned_leave": 15,
        "comp_off": 0
    }


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    marital_status: Optional[str] = None
    father_name: Optional[str] = None
    spouse_name: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    join_date: Optional[str] = None
    confirmation_date: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    reporting_to: Optional[str] = None
    bank_details: Optional[BankDetails] = None
    statutory: Optional[StatutoryDetails] = None
    emergency_contact: Optional[EmergencyContact] = None
    salary: Optional[SalaryComponent] = None
    leave_balance: Optional[Dict[str, float]] = None


class AdvanceRequest(BaseModel):
    amount: float
    reason: str
    repayment_months: int = 1  # Number of months to repay


class PayrollRun(BaseModel):
    month: int
    year: int
    employee_ids: List[str] = []  # Empty means all active employees


# ============= HELPER FUNCTIONS =============

def calculate_gross_salary(salary: dict) -> float:
    """Calculate gross salary from components"""
    return (
        salary.get('basic', 0) +
        salary.get('hra', 0) +
        salary.get('da', 0) +
        salary.get('conveyance', 0) +
        salary.get('medical', 0) +
        salary.get('special_allowance', 0) +
        salary.get('other_allowance', 0)
    )


def calculate_professional_tax(gross_salary: float) -> float:
    """Calculate Tamil Nadu Professional Tax"""
    for slab in TN_PT_SLABS:
        if slab['min'] <= gross_salary <= slab['max']:
            return slab['tax']
    return 0


def calculate_epf(basic_salary: float) -> dict:
    """Calculate EPF contributions"""
    # EPF is calculated on Basic + DA (we use Basic for simplicity)
    employee_contribution = round(basic_salary * EPF_EMPLOYEE_RATE, 2)
    employer_contribution = round(basic_salary * EPF_EMPLOYER_RATE, 2)
    
    return {
        "employee": employee_contribution,
        "employer": employer_contribution,
        "total": employee_contribution + employer_contribution
    }


def calculate_esic(gross_salary: float) -> dict:
    """Calculate ESIC contributions (only if gross <= 21000)"""
    if gross_salary > ESIC_SALARY_LIMIT:
        return {"employee": 0, "employer": 0, "total": 0, "applicable": False}
    
    employee_contribution = round(gross_salary * ESIC_EMPLOYEE_RATE, 2)
    employer_contribution = round(gross_salary * ESIC_EMPLOYER_RATE, 2)
    
    return {
        "employee": employee_contribution,
        "employer": employer_contribution,
        "total": employee_contribution + employer_contribution,
        "applicable": True
    }


def get_days_in_month(month: int, year: int) -> int:
    """Get number of days in a month"""
    return calendar.monthrange(year, month)[1]


# ============= EMPLOYEE MANAGEMENT ROUTES =============

@router.get("/employees")
async def get_all_employees(
    status: Optional[str] = None,
    department: Optional[str] = None
):
    """Get all employees with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    
    employees = await db.hr_employees.find(query, {"_id": 0}).sort("emp_id", 1).to_list(1000)
    return employees


@router.get("/employees/{emp_id}")
async def get_employee(emp_id: str):
    """Get single employee by ID"""
    employee = await db.hr_employees.find_one({"emp_id": emp_id}, {"_id": 0})
    if not employee:
        # Try by internal ID
        employee = await db.hr_employees.find_one({"id": emp_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.post("/employees")
async def create_employee(employee: EmployeeCreate):
    """Create new employee"""
    # Check if emp_id already exists
    existing = await db.hr_employees.find_one({"emp_id": employee.emp_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    doc = employee.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate gross salary
    doc["gross_salary"] = calculate_gross_salary(doc.get("salary", {}))
    
    await db.hr_employees.insert_one(doc)
    
    # Remove MongoDB _id before returning
    doc.pop("_id", None)
    return doc


@router.put("/employees/{emp_id}")
async def update_employee(emp_id: str, updates: EmployeeUpdate):
    """Update employee details"""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Recalculate gross if salary updated
    if "salary" in update_data:
        update_data["gross_salary"] = calculate_gross_salary(update_data["salary"])
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hr_employees.update_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    updated = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    return updated


@router.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str):
    """Delete employee (soft delete - set status to inactive)"""
    result = await db.hr_employees.update_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deactivated successfully"}


# ============= SALARY STRUCTURE ROUTES =============

@router.get("/salary-preview/{emp_id}")
async def get_salary_preview(emp_id: str):
    """Get salary breakdown preview for an employee"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    salary = employee.get("salary", {})
    gross = calculate_gross_salary(salary)
    basic = salary.get("basic", 0)
    
    # Calculate deductions
    epf = calculate_epf(basic)
    esic = calculate_esic(gross)
    pt = calculate_professional_tax(gross)
    
    total_deductions = epf["employee"] + esic["employee"] + pt
    net_salary = gross - total_deductions
    
    return {
        "employee": {
            "emp_id": employee.get("emp_id"),
            "name": employee.get("name"),
            "department": employee.get("department"),
            "designation": employee.get("designation")
        },
        "earnings": {
            "basic": salary.get("basic", 0),
            "hra": salary.get("hra", 0),
            "da": salary.get("da", 0),
            "conveyance": salary.get("conveyance", 0),
            "medical": salary.get("medical", 0),
            "special_allowance": salary.get("special_allowance", 0),
            "other_allowance": salary.get("other_allowance", 0),
            "gross_salary": gross
        },
        "deductions": {
            "epf_employee": epf["employee"],
            "esic_employee": esic["employee"],
            "esic_applicable": esic["applicable"],
            "professional_tax": pt,
            "total_deductions": total_deductions
        },
        "employer_contributions": {
            "epf_employer": epf["employer"],
            "esic_employer": esic["employer"]
        },
        "net_salary": net_salary,
        "ctc": gross + epf["employer"] + esic["employer"]
    }


# ============= ADVANCE/LOAN MANAGEMENT =============

@router.get("/advances")
async def get_all_advances(
    emp_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all advance requests"""
    query = {}
    if emp_id:
        query["emp_id"] = emp_id
    if status:
        query["status"] = status
    
    advances = await db.hr_advances.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return advances


@router.post("/advances")
async def create_advance_request(
    emp_id: str,
    request: AdvanceRequest
):
    """Create advance/loan request"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emi = round(request.amount / request.repayment_months, 2)
    
    doc = {
        "id": str(uuid.uuid4()),
        "emp_id": employee["emp_id"],
        "emp_name": employee["name"],
        "department": employee.get("department", ""),
        "amount": request.amount,
        "reason": request.reason,
        "repayment_months": request.repayment_months,
        "emi_amount": emi,
        "remaining_amount": request.amount,
        "paid_emis": 0,
        "status": "pending",  # pending, approved, rejected, active, completed
        "approved_by": None,
        "approved_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hr_advances.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/advances/{advance_id}/approve")
async def approve_advance(advance_id: str, approved_by: str):
    """Approve advance request"""
    result = await db.hr_advances.update_one(
        {"id": advance_id, "status": "pending"},
        {
            "$set": {
                "status": "active",
                "approved_by": approved_by,
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Advance request not found or already processed")
    
    return {"message": "Advance approved successfully"}


@router.put("/advances/{advance_id}/reject")
async def reject_advance(advance_id: str, rejected_by: str):
    """Reject advance request"""
    result = await db.hr_advances.update_one(
        {"id": advance_id, "status": "pending"},
        {
            "$set": {
                "status": "rejected",
                "approved_by": rejected_by,
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Advance request not found or already processed")
    
    return {"message": "Advance rejected"}


# ============= LEAVE BALANCE MANAGEMENT =============

@router.get("/leave-balance/{emp_id}")
async def get_leave_balance(emp_id: str):
    """Get leave balance for an employee"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "leave_balance": 1}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get leave taken this year
    current_year = datetime.now().year
    leave_taken = await db.leave_requests.aggregate([
        {
            "$match": {
                "user_id": emp_id,
                "status": "approved",
                "from_date": {"$regex": f".*{current_year}.*"}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "days_taken": {"$sum": "$days"}
            }
        }
    ]).to_list(100)
    
    taken_map = {item["_id"]: item["days_taken"] for item in leave_taken}
    
    balance = employee.get("leave_balance", {
        "casual_leave": 12,
        "sick_leave": 12,
        "earned_leave": 15,
        "comp_off": 0
    })
    
    return {
        "emp_id": employee["emp_id"],
        "name": employee["name"],
        "leave_balance": {
            "casual_leave": {
                "total": balance.get("casual_leave", 12),
                "taken": taken_map.get("Casual Leave", 0),
                "remaining": balance.get("casual_leave", 12) - taken_map.get("Casual Leave", 0)
            },
            "sick_leave": {
                "total": balance.get("sick_leave", 12),
                "taken": taken_map.get("Sick Leave", 0),
                "remaining": balance.get("sick_leave", 12) - taken_map.get("Sick Leave", 0)
            },
            "earned_leave": {
                "total": balance.get("earned_leave", 15),
                "taken": taken_map.get("Earned Leave", 0),
                "remaining": balance.get("earned_leave", 15) - taken_map.get("Earned Leave", 0)
            },
            "comp_off": {
                "total": balance.get("comp_off", 0),
                "taken": taken_map.get("Comp Off", 0),
                "remaining": balance.get("comp_off", 0) - taken_map.get("Comp Off", 0)
            }
        }
    }


@router.put("/leave-balance/{emp_id}")
async def update_leave_balance(emp_id: str, leave_balance: Dict[str, float]):
    """Update leave balance for an employee"""
    result = await db.hr_employees.update_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"$set": {"leave_balance": leave_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Leave balance updated successfully"}


# ============= PAYROLL PROCESSING =============

@router.post("/payroll/run")
async def run_payroll(payroll: PayrollRun):
    """Process payroll for a month"""
    month = payroll.month
    year = payroll.year
    days_in_month = get_days_in_month(month, year)
    
    # Get employees to process
    if payroll.employee_ids:
        query = {"emp_id": {"$in": payroll.employee_ids}, "status": "active"}
    else:
        query = {"status": "active"}
    
    employees = await db.hr_employees.find(query, {"_id": 0}).to_list(1000)
    
    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found")
    
    payroll_records = []
    
    for emp in employees:
        salary = emp.get("salary", {})
        gross = calculate_gross_salary(salary)
        basic = salary.get("basic", 0)
        
        # Get attendance data for the month
        attendance_records = await db.attendance.find({
            "user_id": emp.get("id", emp.get("emp_id")),
            "month": month,
            "year": year
        }).to_list(100)
        
        # Calculate working days and LOP
        present_days = len([a for a in attendance_records if a.get("status") in ["present", "half_day"]])
        half_days = len([a for a in attendance_records if a.get("status") == "half_day"])
        effective_days = present_days - (half_days * 0.5)
        
        # LOP calculation (days not worked)
        # Assuming 26 working days per month (excluding Sundays)
        working_days = 26
        lop_days = max(0, working_days - effective_days) if attendance_records else 0
        
        # Calculate per-day salary
        per_day_salary = gross / days_in_month
        lop_deduction = round(per_day_salary * lop_days, 2)
        
        # Adjusted gross after LOP
        adjusted_gross = gross - lop_deduction
        adjusted_basic = basic - (basic / days_in_month * lop_days)
        
        # Calculate deductions
        epf = calculate_epf(adjusted_basic)
        esic = calculate_esic(adjusted_gross)
        pt = calculate_professional_tax(adjusted_gross)
        
        # Get active advances for EMI deduction
        active_advances = await db.hr_advances.find({
            "emp_id": emp.get("emp_id"),
            "status": "active",
            "remaining_amount": {"$gt": 0}
        }).to_list(10)
        
        advance_deduction = 0
        for adv in active_advances:
            emi = min(adv.get("emi_amount", 0), adv.get("remaining_amount", 0))
            advance_deduction += emi
        
        total_deductions = epf["employee"] + esic["employee"] + pt + lop_deduction + advance_deduction
        net_salary = gross - total_deductions
        
        # Create payroll record
        payroll_record = {
            "id": str(uuid.uuid4()),
            "emp_id": emp.get("emp_id"),
            "emp_name": emp.get("name"),
            "department": emp.get("department"),
            "designation": emp.get("designation"),
            "month": month,
            "year": year,
            "days_in_month": days_in_month,
            "working_days": working_days,
            "present_days": effective_days,
            "lop_days": lop_days,
            
            # Earnings
            "earnings": {
                "basic": salary.get("basic", 0),
                "hra": salary.get("hra", 0),
                "da": salary.get("da", 0),
                "conveyance": salary.get("conveyance", 0),
                "medical": salary.get("medical", 0),
                "special_allowance": salary.get("special_allowance", 0),
                "other_allowance": salary.get("other_allowance", 0),
            },
            "gross_salary": gross,
            "adjusted_gross": adjusted_gross,
            
            # Deductions
            "deductions": {
                "epf": epf["employee"],
                "esic": esic["employee"],
                "esic_applicable": esic["applicable"],
                "professional_tax": pt,
                "lop_deduction": lop_deduction,
                "advance_emi": advance_deduction,
                "other_deductions": 0
            },
            "total_deductions": total_deductions,
            
            # Employer contributions
            "employer_contributions": {
                "epf": epf["employer"],
                "esic": esic["employer"]
            },
            
            "net_salary": net_salary,
            "ctc": gross + epf["employer"] + esic["employer"],
            
            # Bank details
            "bank_account": emp.get("bank_details", {}).get("account_number", ""),
            "bank_ifsc": emp.get("bank_details", {}).get("ifsc_code", ""),
            
            "status": "processed",  # processed, paid, held
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Save payroll record
        await db.hr_payroll.insert_one(payroll_record)
        payroll_record.pop("_id", None)
        payroll_records.append(payroll_record)
        
        # Update advance EMI if applicable
        for adv in active_advances:
            emi = min(adv.get("emi_amount", 0), adv.get("remaining_amount", 0))
            new_remaining = adv.get("remaining_amount", 0) - emi
            new_paid_emis = adv.get("paid_emis", 0) + 1
            new_status = "completed" if new_remaining <= 0 else "active"
            
            await db.hr_advances.update_one(
                {"id": adv["id"]},
                {
                    "$set": {
                        "remaining_amount": new_remaining,
                        "paid_emis": new_paid_emis,
                        "status": new_status
                    }
                }
            )
    
    return {
        "message": f"Payroll processed for {len(payroll_records)} employees",
        "month": month,
        "year": year,
        "records": payroll_records
    }


@router.get("/payroll")
async def get_payroll_records(
    month: Optional[int] = None,
    year: Optional[int] = None,
    emp_id: Optional[str] = None
):
    """Get payroll records"""
    query = {}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if emp_id:
        query["emp_id"] = emp_id
    
    records = await db.hr_payroll.find(query, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(1000)
    return records


@router.get("/payroll/{record_id}")
async def get_payroll_record(record_id: str):
    """Get single payroll record"""
    record = await db.hr_payroll.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return record


# ============= BIRTHDAY/ANNIVERSARY ALERTS =============

@router.get("/celebrations")
async def get_celebrations(days_ahead: int = 30):
    """Get upcoming birthdays and work anniversaries"""
    today = datetime.now()
    
    employees = await db.hr_employees.find(
        {"status": "active"},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "date_of_birth": 1, "join_date": 1}
    ).to_list(1000)
    
    birthdays = []
    anniversaries = []
    
    for emp in employees:
        # Check birthday
        dob_str = emp.get("date_of_birth", "")
        if dob_str:
            try:
                # Parse DD-MM-YYYY or DD/MM/YYYY
                for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"]:
                    try:
                        dob = datetime.strptime(dob_str, fmt)
                        break
                    except:
                        continue
                else:
                    dob = None
                
                if dob:
                    # This year's birthday
                    this_year_bday = dob.replace(year=today.year)
                    if this_year_bday < today:
                        this_year_bday = this_year_bday.replace(year=today.year + 1)
                    
                    days_until = (this_year_bday - today).days
                    if 0 <= days_until <= days_ahead:
                        birthdays.append({
                            "emp_id": emp["emp_id"],
                            "name": emp["name"],
                            "department": emp.get("department", ""),
                            "date": this_year_bday.strftime("%d-%m-%Y"),
                            "days_until": days_until,
                            "type": "birthday"
                        })
            except:
                pass
        
        # Check work anniversary
        join_str = emp.get("join_date", "")
        if join_str:
            try:
                for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"]:
                    try:
                        join_date = datetime.strptime(join_str, fmt)
                        break
                    except:
                        continue
                else:
                    join_date = None
                
                if join_date:
                    # This year's anniversary
                    this_year_anniv = join_date.replace(year=today.year)
                    if this_year_anniv < today:
                        this_year_anniv = this_year_anniv.replace(year=today.year + 1)
                    
                    days_until = (this_year_anniv - today).days
                    years = today.year - join_date.year
                    if this_year_anniv.year > today.year:
                        years += 1
                    
                    if 0 <= days_until <= days_ahead and years > 0:
                        anniversaries.append({
                            "emp_id": emp["emp_id"],
                            "name": emp["name"],
                            "department": emp.get("department", ""),
                            "date": this_year_anniv.strftime("%d-%m-%Y"),
                            "days_until": days_until,
                            "years": years,
                            "type": "anniversary"
                        })
            except:
                pass
    
    # Sort by days_until
    birthdays.sort(key=lambda x: x["days_until"])
    anniversaries.sort(key=lambda x: x["days_until"])
    
    return {
        "birthdays": birthdays,
        "anniversaries": anniversaries,
        "today": today.strftime("%d-%m-%Y")
    }


# ============= REPORTS =============

@router.get("/reports/statutory/{month}/{year}")
async def get_statutory_report(month: int, year: int):
    """Get statutory compliance report for a month"""
    payroll_records = await db.hr_payroll.find(
        {"month": month, "year": year},
        {"_id": 0}
    ).to_list(1000)
    
    if not payroll_records:
        raise HTTPException(status_code=404, detail="No payroll records found for this month")
    
    total_epf_employee = sum(r.get("deductions", {}).get("epf", 0) for r in payroll_records)
    total_epf_employer = sum(r.get("employer_contributions", {}).get("epf", 0) for r in payroll_records)
    total_esic_employee = sum(r.get("deductions", {}).get("esic", 0) for r in payroll_records)
    total_esic_employer = sum(r.get("employer_contributions", {}).get("esic", 0) for r in payroll_records)
    total_pt = sum(r.get("deductions", {}).get("professional_tax", 0) for r in payroll_records)
    total_gross = sum(r.get("gross_salary", 0) for r in payroll_records)
    total_net = sum(r.get("net_salary", 0) for r in payroll_records)
    
    return {
        "month": month,
        "year": year,
        "employee_count": len(payroll_records),
        "summary": {
            "total_gross_salary": total_gross,
            "total_net_salary": total_net,
            "epf": {
                "employee_contribution": total_epf_employee,
                "employer_contribution": total_epf_employer,
                "total": total_epf_employee + total_epf_employer
            },
            "esic": {
                "employee_contribution": total_esic_employee,
                "employer_contribution": total_esic_employer,
                "total": total_esic_employee + total_esic_employer,
                "eligible_employees": len([r for r in payroll_records if r.get("deductions", {}).get("esic_applicable", False)])
            },
            "professional_tax": {
                "total": total_pt
            }
        },
        "records": payroll_records
    }


@router.get("/dashboard/stats")
async def get_hr_dashboard_stats():
    """Get HR dashboard statistics"""
    # Employee counts
    total_employees = await db.hr_employees.count_documents({})
    active_employees = await db.hr_employees.count_documents({"status": "active"})
    on_probation = await db.hr_employees.count_documents({"status": "active", "employment_type": "probation"})
    
    # Department-wise count
    dept_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    dept_counts = await db.hr_employees.aggregate(dept_pipeline).to_list(20)
    
    # Pending requests
    pending_leaves = await db.leave_requests.count_documents({"status": "pending"})
    pending_advances = await db.hr_advances.count_documents({"status": "pending"})
    
    # Get celebrations
    celebrations = await get_celebrations(7)
    
    return {
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "on_probation": on_probation,
            "inactive": total_employees - active_employees
        },
        "department_wise": {item["_id"]: item["count"] for item in dept_counts if item["_id"]},
        "pending_requests": {
            "leaves": pending_leaves,
            "advances": pending_advances
        },
        "upcoming_celebrations": {
            "birthdays": len(celebrations.get("birthdays", [])),
            "anniversaries": len(celebrations.get("anniversaries", []))
        }
    }



# ============= OVERTIME MANAGEMENT =============

class OvertimeCreate(BaseModel):
    emp_id: str
    date: str
    hours: float
    reason: str = ""
    rate_per_hour: float = 100
    amount: Optional[float] = None


class OvertimeUpdate(BaseModel):
    date: Optional[str] = None
    hours: Optional[float] = None
    reason: Optional[str] = None
    rate_per_hour: Optional[float] = None
    amount: Optional[float] = None


@router.get("/overtime")
async def get_overtime_records(
    month: Optional[int] = None,
    year: Optional[int] = None,
    emp_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all overtime records with optional filters"""
    query = {}
    if emp_id:
        query["emp_id"] = emp_id
    if status:
        query["status"] = status
    
    # Filter by month/year from date field
    if month and year:
        # Match dates like "2025-12-15" for December 2025
        month_str = f"{year}-{str(month).zfill(2)}"
        query["date"] = {"$regex": f"^{month_str}"}
    
    records = await db.hr_overtime.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return records


@router.post("/overtime")
async def create_overtime(overtime: OvertimeCreate):
    """Create new overtime record"""
    # Get employee info
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": overtime.emp_id}, {"id": overtime.emp_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate amount
    amount = overtime.amount or (overtime.hours * overtime.rate_per_hour)
    
    doc = {
        "id": str(uuid.uuid4()),
        "emp_id": employee["emp_id"],
        "emp_name": employee["name"],
        "department": employee.get("department", ""),
        "date": overtime.date,
        "hours": overtime.hours,
        "rate_per_hour": overtime.rate_per_hour,
        "amount": amount,
        "reason": overtime.reason,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hr_overtime.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/overtime/{overtime_id}")
async def update_overtime(overtime_id: str, updates: OvertimeUpdate):
    """Update overtime record"""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Recalculate amount if hours or rate changed
    if "hours" in update_data or "rate_per_hour" in update_data:
        existing = await db.hr_overtime.find_one({"id": overtime_id}, {"_id": 0})
        if existing:
            hours = update_data.get("hours", existing.get("hours", 0))
            rate = update_data.get("rate_per_hour", existing.get("rate_per_hour", 100))
            update_data["amount"] = hours * rate
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hr_overtime.update_one(
        {"id": overtime_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Overtime record not found")
    
    updated = await db.hr_overtime.find_one({"id": overtime_id}, {"_id": 0})
    return updated


@router.put("/overtime/{overtime_id}/approve")
async def approve_overtime(overtime_id: str):
    """Approve overtime request"""
    result = await db.hr_overtime.update_one(
        {"id": overtime_id, "status": "pending"},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Overtime record not found or already processed")
    
    return {"message": "Overtime approved successfully"}


@router.put("/overtime/{overtime_id}/reject")
async def reject_overtime(overtime_id: str):
    """Reject overtime request"""
    result = await db.hr_overtime.update_one(
        {"id": overtime_id, "status": "pending"},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Overtime record not found or already processed")
    
    return {"message": "Overtime rejected"}


@router.delete("/overtime/{overtime_id}")
async def delete_overtime(overtime_id: str):
    """Delete overtime record"""
    result = await db.hr_overtime.delete_one({"id": overtime_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Overtime record not found")
    
    return {"message": "Overtime record deleted"}


@router.get("/overtime/summary/{emp_id}")
async def get_overtime_summary(emp_id: str, month: int, year: int):
    """Get overtime summary for an employee for a specific month"""
    month_str = f"{year}-{str(month).zfill(2)}"
    
    records = await db.hr_overtime.find({
        "emp_id": emp_id,
        "status": "approved",
        "date": {"$regex": f"^{month_str}"}
    }, {"_id": 0}).to_list(100)
    
    total_hours = sum(r.get("hours", 0) for r in records)
    total_amount = sum(r.get("amount", 0) for r in records)
    
    return {
        "emp_id": emp_id,
        "month": month,
        "year": year,
        "total_hours": total_hours,
        "total_amount": total_amount,
        "record_count": len(records)
    }
