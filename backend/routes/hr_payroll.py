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

# OT Rate Calculation Constants
WORKING_DAYS_PER_MONTH = 26  # Standard working days
WORKING_HOURS_PER_DAY = 8    # Standard working hours per day
TOTAL_WORKING_HOURS_PER_MONTH = WORKING_DAYS_PER_MONTH * WORKING_HOURS_PER_DAY  # 208 hours
OT_MULTIPLIER = 2.0          # Standard OT rate multiplier (2x)


def calculate_ot_rate(gross_salary: float) -> float:
    """
    Calculate OT rate based on employee's gross salary
    Formula: (Gross Salary ÷ 208) × 2
    
    Example: ₹30,000 ÷ 208 × 2 = ₹288.46/hour
    """
    if not gross_salary or gross_salary <= 0:
        return 100.0  # Default fallback
    
    hourly_rate = gross_salary / TOTAL_WORKING_HOURS_PER_MONTH
    ot_rate = hourly_rate * OT_MULTIPLIER
    return round(ot_rate, 2)


class OvertimeCreate(BaseModel):
    emp_id: str
    date: str
    hours: float
    reason: str = ""
    rate_per_hour: Optional[float] = None  # Now optional - will auto-calculate if not provided
    amount: Optional[float] = None


class OvertimeUpdate(BaseModel):
    date: Optional[str] = None
    hours: Optional[float] = None
    reason: Optional[str] = None
    rate_per_hour: Optional[float] = None
    amount: Optional[float] = None


@router.get("/overtime/calculate-rate/{emp_id}")
async def get_employee_ot_rate(emp_id: str):
    """Get calculated OT rate for an employee based on their gross salary"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "gross_salary": 1, "salary": 1}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    gross_salary = employee.get("gross_salary", 0)
    
    # If gross_salary not directly available, calculate from salary components
    if not gross_salary and employee.get("salary"):
        gross_salary = calculate_gross_salary(employee["salary"])
    
    ot_rate = calculate_ot_rate(gross_salary)
    hourly_rate = round(gross_salary / TOTAL_WORKING_HOURS_PER_MONTH, 2) if gross_salary else 0
    
    return {
        "emp_id": employee.get("emp_id"),
        "emp_name": employee.get("name"),
        "gross_salary": gross_salary,
        "working_hours_per_month": TOTAL_WORKING_HOURS_PER_MONTH,
        "hourly_rate": hourly_rate,
        "ot_multiplier": OT_MULTIPLIER,
        "ot_rate_per_hour": ot_rate
    }


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
    """Create new overtime record with auto-calculated rate from salary"""
    # Get employee info including salary for OT rate calculation
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": overtime.emp_id}, {"id": overtime.emp_id}]},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "gross_salary": 1, "salary": 1}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get gross salary
    gross_salary = employee.get("gross_salary", 0)
    if not gross_salary and employee.get("salary"):
        gross_salary = calculate_gross_salary(employee["salary"])
    
    # Calculate OT rate from salary if not provided
    if overtime.rate_per_hour is None or overtime.rate_per_hour <= 0:
        rate_per_hour = calculate_ot_rate(gross_salary)
    else:
        rate_per_hour = overtime.rate_per_hour
    
    # Calculate amount: OT Rate × Hours
    amount = overtime.amount or (overtime.hours * rate_per_hour)
    
    # Calculate hourly rate for reference
    hourly_rate = round(gross_salary / TOTAL_WORKING_HOURS_PER_MONTH, 2) if gross_salary else 0
    
    doc = {
        "id": str(uuid.uuid4()),
        "emp_id": employee["emp_id"],
        "emp_name": employee["name"],
        "department": employee.get("department", ""),
        "date": overtime.date,
        "hours": overtime.hours,
        "gross_salary": gross_salary,
        "hourly_rate": hourly_rate,
        "ot_multiplier": OT_MULTIPLIER,
        "rate_per_hour": rate_per_hour,
        "amount": round(amount, 2),
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



# ============= PHASE 3: ATTENDANCE INTEGRATION =============

async def get_employee_attendance_summary(emp_id: str, user_id: str, month: int, year: int) -> dict:
    """
    Fetch attendance data for an employee from the attendance collection
    and calculate working days, present days, LOP days
    """
    # Get number of days in the month
    days_in_month = calendar.monthrange(year, month)[1]
    
    # Calculate working days (excluding Sundays - can be made configurable)
    working_days = 0
    for day in range(1, days_in_month + 1):
        date_obj = datetime(year, month, day)
        if date_obj.weekday() != 6:  # 6 = Sunday
            working_days += 1
    
    # Fetch attendance records
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Try to find attendance by user_id or emp_id
    attendance_records = await db.attendance.find({
        "$or": [
            {"user_id": user_id},
            {"user_id": emp_id}
        ],
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(50)
    
    # Calculate attendance summary
    present_days = 0
    half_days = 0
    leave_days = 0
    absent_days = 0
    
    for record in attendance_records:
        status = record.get("status", "").lower()
        if status == "present":
            present_days += 1
        elif status == "half-day":
            half_days += 1
        elif status in ["on-leave", "leave"]:
            leave_days += 1
        elif status == "absent":
            absent_days += 1
    
    # Effective present days (half days count as 0.5)
    effective_present = present_days + (half_days * 0.5)
    
    # LOP calculation: working days - effective present - paid leaves
    # Assuming leave_days are paid leaves for now
    lop_days = max(0, working_days - effective_present - leave_days)
    
    return {
        "days_in_month": days_in_month,
        "working_days": working_days,
        "present_days": present_days,
        "half_days": half_days,
        "leave_days": leave_days,
        "absent_days": absent_days,
        "effective_present": effective_present,
        "lop_days": round(lop_days, 1),
        "attendance_records_found": len(attendance_records)
    }


@router.get("/attendance-summary/{emp_id}")
async def get_attendance_for_payroll(emp_id: str, month: int, year: int):
    """Get attendance summary for payroll calculation"""
    # Get employee to find linked user_id
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    user_id = employee.get("user_id", employee.get("id", emp_id))
    
    summary = await get_employee_attendance_summary(emp_id, user_id, month, year)
    
    return {
        "emp_id": emp_id,
        "emp_name": employee.get("name"),
        "month": month,
        "year": year,
        **summary
    }


# ============= PHASE 3: BULK PAYROLL PROCESSING =============

class BulkPayrollPreview(BaseModel):
    month: int
    year: int
    department: Optional[str] = None
    fetch_attendance: bool = True


@router.post("/payroll/preview")
async def preview_bulk_payroll(data: BulkPayrollPreview):
    """
    Preview payroll for all employees before processing
    Shows calculated values without saving to database
    """
    month = data.month
    year = data.year
    
    # Check if payroll already exists and is finalized
    existing = await db.hr_payroll_runs.find_one({
        "month": month,
        "year": year,
        "status": "finalized"
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Payroll for {month}/{year} is already finalized and cannot be modified"
        )
    
    # Get all active employees
    query = {"status": "active"}
    if data.department:
        query["department"] = {"$regex": data.department, "$options": "i"}
    
    employees = await db.hr_employees.find(query, {"_id": 0}).to_list(500)
    
    if not employees:
        raise HTTPException(status_code=404, detail="No active employees found")
    
    preview_records = []
    total_gross = 0
    total_deductions = 0
    total_net = 0
    
    for emp in employees:
        emp_id = emp.get("emp_id", emp.get("id"))
        
        # Get attendance if enabled
        attendance = {"lop_days": 0, "working_days": 26, "present_days": 26}
        if data.fetch_attendance:
            user_id = emp.get("user_id", emp.get("id", emp_id))
            attendance = await get_employee_attendance_summary(emp_id, user_id, month, year)
        
        # Get salary structure
        salary = emp.get("salary", {})
        gross = emp.get("gross_salary", 0)
        
        if gross == 0:
            gross = sum([
                salary.get("basic", 0),
                salary.get("hra", 0),
                salary.get("da", 0),
                salary.get("conveyance", 0),
                salary.get("medical", 0),
                salary.get("special_allowance", 0),
                salary.get("other_allowance", 0)
            ])
        
        # Calculate LOP deduction
        lop_days = attendance.get("lop_days", 0)
        working_days = attendance.get("working_days", 26)
        lop_deduction = round((gross / working_days) * lop_days, 2) if working_days > 0 else 0
        adjusted_gross = gross - lop_deduction
        
        # Calculate EPF (on basic or capped at 15000)
        basic = salary.get("basic", gross * 0.5)
        epf_base = min(basic, 15000)
        epf_employee = round(epf_base * EPF_EMPLOYEE_RATE, 2)
        epf_employer = round(epf_base * EPF_EMPLOYER_RATE, 2)
        
        # Calculate ESIC (if gross <= 21000)
        esic_applicable = adjusted_gross <= ESIC_SALARY_LIMIT
        esic_employee = round(adjusted_gross * ESIC_EMPLOYEE_RATE, 2) if esic_applicable else 0
        esic_employer = round(adjusted_gross * ESIC_EMPLOYER_RATE, 2) if esic_applicable else 0
        
        # Calculate Professional Tax
        pt = 0
        for slab in TN_PT_SLABS:
            if slab["min"] <= adjusted_gross <= slab["max"]:
                pt = slab["tax"]
                break
        
        # Get active advances
        active_advances = await db.hr_advances.find({
            "emp_id": emp_id,
            "status": "active"
        }, {"_id": 0}).to_list(10)
        
        advance_emi = sum(min(adv.get("emi_amount", 0), adv.get("remaining_amount", 0)) for adv in active_advances)
        
        # Get approved overtime
        month_str = f"{year}-{str(month).zfill(2)}"
        overtime_records = await db.hr_overtime.find({
            "emp_id": emp_id,
            "status": "approved",
            "date": {"$regex": f"^{month_str}"}
        }, {"_id": 0}).to_list(100)
        overtime_amount = sum(r.get("amount", 0) for r in overtime_records)
        
        # Total deductions
        total_ded = epf_employee + esic_employee + pt + lop_deduction + advance_emi
        
        # Net salary (including overtime)
        net = adjusted_gross - total_ded + overtime_amount
        
        preview_record = {
            "emp_id": emp_id,
            "emp_name": emp.get("name"),
            "department": emp.get("department"),
            "designation": emp.get("designation"),
            "attendance": {
                "working_days": attendance.get("working_days", 26),
                "present_days": attendance.get("present_days", 0),
                "lop_days": lop_days,
                "records_found": attendance.get("attendance_records_found", 0)
            },
            "earnings": {
                "gross": gross,
                "overtime": overtime_amount,
                "total": gross + overtime_amount
            },
            "deductions": {
                "epf": epf_employee,
                "esic": esic_employee,
                "professional_tax": pt,
                "lop_deduction": lop_deduction,
                "advance_emi": advance_emi,
                "total": total_ded
            },
            "net_salary": round(net, 2),
            "employer_contributions": {
                "epf": epf_employer,
                "esic": esic_employer
            }
        }
        
        preview_records.append(preview_record)
        total_gross += gross
        total_deductions += total_ded
        total_net += net
    
    return {
        "month": month,
        "year": year,
        "department": data.department,
        "employee_count": len(preview_records),
        "summary": {
            "total_gross": round(total_gross, 2),
            "total_deductions": round(total_deductions, 2),
            "total_net": round(total_net, 2),
            "total_epf": round(sum(r["deductions"]["epf"] for r in preview_records), 2),
            "total_esic": round(sum(r["deductions"]["esic"] for r in preview_records), 2),
            "total_pt": round(sum(r["deductions"]["professional_tax"] for r in preview_records), 2),
            "employer_epf": round(sum(r["employer_contributions"]["epf"] for r in preview_records), 2),
            "employer_esic": round(sum(r["employer_contributions"]["esic"] for r in preview_records), 2)
        },
        "records": preview_records
    }


class BulkPayrollRun(BaseModel):
    month: int
    year: int
    department: Optional[str] = None
    fetch_attendance: bool = True
    processed_by: str = "Admin"


@router.post("/payroll/bulk-run")
async def run_bulk_payroll(data: BulkPayrollRun):
    """
    Process payroll for all employees and save to database
    Creates a payroll run record for tracking
    """
    month = data.month
    year = data.year
    
    # Check if payroll already exists and is finalized
    existing_run = await db.hr_payroll_runs.find_one({
        "month": month,
        "year": year,
        "status": "finalized"
    })
    if existing_run:
        raise HTTPException(
            status_code=400, 
            detail=f"Payroll for {month}/{year} is already finalized"
        )
    
    # Delete any existing draft payroll for this month
    await db.hr_payroll.delete_many({
        "month": month,
        "year": year
    })
    await db.hr_payroll_runs.delete_many({
        "month": month,
        "year": year,
        "status": {"$ne": "finalized"}
    })
    
    # Get preview data
    preview = await preview_bulk_payroll(BulkPayrollPreview(
        month=month,
        year=year,
        department=data.department,
        fetch_attendance=data.fetch_attendance
    ))
    
    # Save all payroll records
    days_in_month = calendar.monthrange(year, month)[1]
    payroll_records = []
    
    for record in preview["records"]:
        emp_id = record["emp_id"]
        
        # Get full employee details
        employee = await db.hr_employees.find_one(
            {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
            {"_id": 0}
        )
        
        salary = employee.get("salary", {}) if employee else {}
        bank = employee.get("bank_details", {}) if employee else {}
        
        payroll_doc = {
            "id": str(uuid.uuid4()),
            "emp_id": emp_id,
            "emp_name": record["emp_name"],
            "department": record["department"],
            "designation": record["designation"],
            "month": month,
            "year": year,
            "days_in_month": days_in_month,
            "working_days": record["attendance"]["working_days"],
            "present_days": record["attendance"]["present_days"],
            "lop_days": record["attendance"]["lop_days"],
            "earnings": {
                "basic": salary.get("basic", 0),
                "hra": salary.get("hra", 0),
                "da": salary.get("da", 0),
                "conveyance": salary.get("conveyance", 0),
                "medical": salary.get("medical", 0),
                "special_allowance": salary.get("special_allowance", 0),
                "other_allowance": salary.get("other_allowance", 0),
                "overtime": record["earnings"]["overtime"]
            },
            "gross_salary": record["earnings"]["gross"],
            "adjusted_gross": record["earnings"]["gross"] - record["deductions"]["lop_deduction"],
            "deductions": {
                "epf": record["deductions"]["epf"],
                "esic": record["deductions"]["esic"],
                "esic_applicable": record["deductions"]["esic"] > 0,
                "professional_tax": record["deductions"]["professional_tax"],
                "lop_deduction": record["deductions"]["lop_deduction"],
                "advance_emi": record["deductions"]["advance_emi"],
                "other_deductions": 0
            },
            "total_deductions": record["deductions"]["total"],
            "employer_contributions": record["employer_contributions"],
            "net_salary": record["net_salary"],
            "ctc": record["earnings"]["gross"] + record["employer_contributions"]["epf"] + record["employer_contributions"]["esic"],
            "bank_account": bank.get("account_number", ""),
            "bank_ifsc": bank.get("ifsc_code", ""),
            "status": "processed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.hr_payroll.insert_one(payroll_doc)
        payroll_doc.pop("_id", None)
        payroll_records.append(payroll_doc)
    
    # Create payroll run record
    run_id = str(uuid.uuid4())
    run_doc = {
        "id": run_id,
        "month": month,
        "year": year,
        "department": data.department,
        "status": "processed",  # processed, finalized
        "employee_count": len(payroll_records),
        "summary": preview["summary"],
        "processed_by": data.processed_by,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "finalized_at": None,
        "finalized_by": None
    }
    await db.hr_payroll_runs.insert_one(run_doc)
    run_doc.pop("_id", None)
    
    return {
        "message": f"Payroll processed for {len(payroll_records)} employees",
        "run_id": run_id,
        "month": month,
        "year": year,
        "summary": preview["summary"],
        "status": "processed"
    }


# ============= PHASE 3: PAYROLL LOCK/FINALIZE =============

@router.post("/payroll/finalize/{month}/{year}")
async def finalize_payroll(month: int, year: int, finalized_by: str = "Admin"):
    """
    Finalize payroll for a month - prevents further modifications
    """
    # Check if payroll run exists
    run = await db.hr_payroll_runs.find_one({
        "month": month,
        "year": year
    })
    
    if not run:
        raise HTTPException(status_code=404, detail="No payroll run found for this period")
    
    if run.get("status") == "finalized":
        raise HTTPException(status_code=400, detail="Payroll already finalized")
    
    # Update run status
    await db.hr_payroll_runs.update_one(
        {"month": month, "year": year},
        {
            "$set": {
                "status": "finalized",
                "finalized_at": datetime.now(timezone.utc).isoformat(),
                "finalized_by": finalized_by
            }
        }
    )
    
    # Update all payroll records
    await db.hr_payroll.update_many(
        {"month": month, "year": year},
        {"$set": {"status": "finalized"}}
    )
    
    return {
        "message": f"Payroll for {month}/{year} has been finalized",
        "finalized_by": finalized_by,
        "finalized_at": datetime.now(timezone.utc).isoformat()
    }


@router.post("/payroll/unlock/{month}/{year}")
async def unlock_payroll(month: int, year: int, unlocked_by: str = "Admin"):
    """
    Unlock a finalized payroll (admin only) - allows modifications
    """
    run = await db.hr_payroll_runs.find_one({
        "month": month,
        "year": year
    })
    
    if not run:
        raise HTTPException(status_code=404, detail="No payroll run found for this period")
    
    if run.get("status") != "finalized":
        raise HTTPException(status_code=400, detail="Payroll is not finalized")
    
    # Update run status
    await db.hr_payroll_runs.update_one(
        {"month": month, "year": year},
        {
            "$set": {
                "status": "processed",
                "unlocked_at": datetime.now(timezone.utc).isoformat(),
                "unlocked_by": unlocked_by
            }
        }
    )
    
    # Update all payroll records
    await db.hr_payroll.update_many(
        {"month": month, "year": year},
        {"$set": {"status": "processed"}}
    )
    
    return {
        "message": f"Payroll for {month}/{year} has been unlocked",
        "unlocked_by": unlocked_by
    }


@router.get("/payroll/run-status/{month}/{year}")
async def get_payroll_run_status(month: int, year: int):
    """Get payroll run status for a month"""
    run = await db.hr_payroll_runs.find_one(
        {"month": month, "year": year},
        {"_id": 0}
    )
    
    if not run:
        return {
            "month": month,
            "year": year,
            "status": "not_processed",
            "message": "Payroll has not been processed for this period"
        }
    
    return run


# ============= PHASE 3: MONTHLY PAYROLL DASHBOARD =============

@router.get("/payroll/dashboard/{month}/{year}")
async def get_payroll_dashboard(month: int, year: int):
    """
    Get comprehensive payroll dashboard for a month
    Includes summary, department breakdown, comparison with previous month
    """
    # Get current month payroll records
    records = await db.hr_payroll.find(
        {"month": month, "year": year},
        {"_id": 0}
    ).to_list(500)
    
    if not records:
        return {
            "month": month,
            "year": year,
            "status": "no_data",
            "message": "No payroll data found for this period"
        }
    
    # Get payroll run info
    run = await db.hr_payroll_runs.find_one(
        {"month": month, "year": year},
        {"_id": 0}
    )
    
    # Calculate summary
    total_gross = sum(r.get("gross_salary", 0) for r in records)
    total_net = sum(r.get("net_salary", 0) for r in records)
    total_deductions = sum(r.get("total_deductions", 0) for r in records)
    total_epf_employee = sum(r.get("deductions", {}).get("epf", 0) for r in records)
    total_esic_employee = sum(r.get("deductions", {}).get("esic", 0) for r in records)
    total_pt = sum(r.get("deductions", {}).get("professional_tax", 0) for r in records)
    total_lop = sum(r.get("deductions", {}).get("lop_deduction", 0) for r in records)
    total_advance_emi = sum(r.get("deductions", {}).get("advance_emi", 0) for r in records)
    total_epf_employer = sum(r.get("employer_contributions", {}).get("epf", 0) for r in records)
    total_esic_employer = sum(r.get("employer_contributions", {}).get("esic", 0) for r in records)
    total_ctc = sum(r.get("ctc", 0) for r in records)
    
    # Department-wise breakdown
    dept_breakdown = {}
    for r in records:
        dept = r.get("department", "Unknown")
        if dept not in dept_breakdown:
            dept_breakdown[dept] = {
                "employee_count": 0,
                "gross": 0,
                "net": 0,
                "deductions": 0,
                "epf": 0,
                "esic": 0
            }
        dept_breakdown[dept]["employee_count"] += 1
        dept_breakdown[dept]["gross"] += r.get("gross_salary", 0)
        dept_breakdown[dept]["net"] += r.get("net_salary", 0)
        dept_breakdown[dept]["deductions"] += r.get("total_deductions", 0)
        dept_breakdown[dept]["epf"] += r.get("deductions", {}).get("epf", 0)
        dept_breakdown[dept]["esic"] += r.get("deductions", {}).get("esic", 0)
    
    # Get previous month for comparison
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    
    prev_records = await db.hr_payroll.find(
        {"month": prev_month, "year": prev_year},
        {"_id": 0}
    ).to_list(500)
    
    prev_gross = sum(r.get("gross_salary", 0) for r in prev_records) if prev_records else 0
    prev_net = sum(r.get("net_salary", 0) for r in prev_records) if prev_records else 0
    
    # Calculate month-over-month change
    gross_change = ((total_gross - prev_gross) / prev_gross * 100) if prev_gross > 0 else 0
    net_change = ((total_net - prev_net) / prev_net * 100) if prev_net > 0 else 0
    
    return {
        "month": month,
        "year": year,
        "run_status": run.get("status", "unknown") if run else "not_processed",
        "finalized_at": run.get("finalized_at") if run else None,
        "employee_count": len(records),
        "summary": {
            "total_gross": round(total_gross, 2),
            "total_net": round(total_net, 2),
            "total_deductions": round(total_deductions, 2),
            "total_ctc": round(total_ctc, 2),
            "avg_salary": round(total_net / len(records), 2) if records else 0
        },
        "deductions_breakdown": {
            "epf_employee": round(total_epf_employee, 2),
            "esic_employee": round(total_esic_employee, 2),
            "professional_tax": round(total_pt, 2),
            "lop_deduction": round(total_lop, 2),
            "advance_emi": round(total_advance_emi, 2)
        },
        "employer_contributions": {
            "epf": round(total_epf_employer, 2),
            "esic": round(total_esic_employer, 2),
            "total": round(total_epf_employer + total_esic_employer, 2)
        },
        "department_breakdown": [
            {"department": k, **v} for k, v in sorted(dept_breakdown.items())
        ],
        "comparison": {
            "previous_month": f"{prev_month}/{prev_year}",
            "previous_gross": round(prev_gross, 2),
            "previous_net": round(prev_net, 2),
            "gross_change_percent": round(gross_change, 1),
            "net_change_percent": round(net_change, 1),
            "employee_count_prev": len(prev_records)
        }
    }


# ============= PHASE 3: STATUTORY REPORTS =============

@router.get("/reports/epf/{month}/{year}")
async def get_epf_report(month: int, year: int):
    """
    Generate EPF report data for a month
    Includes employee-wise EPF contributions
    """
    records = await db.hr_payroll.find(
        {"month": month, "year": year},
        {"_id": 0}
    ).to_list(500)
    
    if not records:
        raise HTTPException(status_code=404, detail="No payroll records found for this period")
    
    epf_data = []
    total_employee_epf = 0
    total_employer_epf = 0
    total_eps = 0
    total_edli = 0
    
    for r in records:
        emp_epf = r.get("deductions", {}).get("epf", 0)
        emp_employer_epf = r.get("employer_contributions", {}).get("epf", 0)
        
        # EPF split: 3.67% to EPF, 8.33% to EPS (capped at 15000)
        basic = r.get("earnings", {}).get("basic", r.get("gross_salary", 0) * 0.5)
        eps_base = min(basic, 15000)
        eps_amount = round(eps_base * 0.0833, 2)
        epf_amount = round(emp_employer_epf - eps_amount, 2)
        edli = round(eps_base * 0.005, 2)  # 0.5% EDLI
        
        # Get employee details for UAN
        employee = await db.hr_employees.find_one(
            {"$or": [{"emp_id": r.get("emp_id")}, {"id": r.get("emp_id")}]},
            {"_id": 0}
        )
        
        statutory = employee.get("statutory", {}) if employee else {}
        
        epf_data.append({
            "emp_id": r.get("emp_id"),
            "emp_name": r.get("emp_name"),
            "uan": statutory.get("uan_number", ""),
            "pf_account": statutory.get("pf_account_number", ""),
            "gross_salary": r.get("gross_salary", 0),
            "basic": basic,
            "epf_wages": min(basic, 15000),
            "employee_epf": emp_epf,
            "employer_epf_share": epf_amount,
            "eps": eps_amount,
            "edli": edli,
            "total_employer": round(emp_employer_epf + edli, 2)
        })
        
        total_employee_epf += emp_epf
        total_employer_epf += emp_employer_epf
        total_eps += eps_amount
        total_edli += edli
    
    return {
        "month": month,
        "year": year,
        "report_type": "EPF Monthly Return",
        "employee_count": len(epf_data),
        "summary": {
            "total_employee_epf": round(total_employee_epf, 2),
            "total_employer_epf": round(total_employer_epf, 2),
            "total_eps": round(total_eps, 2),
            "total_edli": round(total_edli, 2),
            "grand_total": round(total_employee_epf + total_employer_epf + total_edli, 2)
        },
        "records": epf_data
    }


@router.get("/reports/esic/{month}/{year}")
async def get_esic_report(month: int, year: int):
    """
    Generate ESIC report data for a month
    Only includes employees where ESIC is applicable (gross <= 21000)
    """
    records = await db.hr_payroll.find(
        {"month": month, "year": year},
        {"_id": 0}
    ).to_list(500)
    
    if not records:
        raise HTTPException(status_code=404, detail="No payroll records found for this period")
    
    esic_data = []
    total_employee_esic = 0
    total_employer_esic = 0
    
    for r in records:
        if not r.get("deductions", {}).get("esic_applicable", False):
            continue
        
        emp_esic = r.get("deductions", {}).get("esic", 0)
        employer_esic = r.get("employer_contributions", {}).get("esic", 0)
        
        if emp_esic == 0 and employer_esic == 0:
            continue
        
        # Get employee details for ESIC number
        employee = await db.hr_employees.find_one(
            {"$or": [{"emp_id": r.get("emp_id")}, {"id": r.get("emp_id")}]},
            {"_id": 0}
        )
        
        statutory = employee.get("statutory", {}) if employee else {}
        
        esic_data.append({
            "emp_id": r.get("emp_id"),
            "emp_name": r.get("emp_name"),
            "esic_number": statutory.get("esic_number", ""),
            "gross_salary": r.get("gross_salary", 0),
            "esic_wages": r.get("adjusted_gross", r.get("gross_salary", 0)),
            "employee_esic": emp_esic,
            "employer_esic": employer_esic,
            "total": round(emp_esic + employer_esic, 2)
        })
        
        total_employee_esic += emp_esic
        total_employer_esic += employer_esic
    
    return {
        "month": month,
        "year": year,
        "report_type": "ESIC Monthly Return",
        "employee_count": len(esic_data),
        "summary": {
            "total_employee_esic": round(total_employee_esic, 2),
            "total_employer_esic": round(total_employer_esic, 2),
            "grand_total": round(total_employee_esic + total_employer_esic, 2)
        },
        "records": esic_data
    }


@router.get("/reports/professional-tax/{month}/{year}")
async def get_pt_report(month: int, year: int):
    """Generate Professional Tax report for a month"""
    records = await db.hr_payroll.find(
        {"month": month, "year": year},
        {"_id": 0}
    ).to_list(500)
    
    if not records:
        raise HTTPException(status_code=404, detail="No payroll records found for this period")
    
    pt_data = []
    total_pt = 0
    
    for r in records:
        pt = r.get("deductions", {}).get("professional_tax", 0)
        if pt == 0:
            continue
        
        pt_data.append({
            "emp_id": r.get("emp_id"),
            "emp_name": r.get("emp_name"),
            "department": r.get("department"),
            "gross_salary": r.get("gross_salary", 0),
            "professional_tax": pt
        })
        
        total_pt += pt
    
    return {
        "month": month,
        "year": year,
        "report_type": "Professional Tax - Tamil Nadu",
        "employee_count": len(pt_data),
        "total_pt": round(total_pt, 2),
        "records": pt_data
    }



# ============= ENHANCED LEAVE MANAGEMENT =============
# Connected to HR Employee Records and Payroll

# Default leave allocation per year
DEFAULT_LEAVE_ALLOCATION = {
    "casual_leave": 12,
    "sick_leave": 6,
    "earned_leave": 15,
    "comp_off": 2
}

LEAVE_TYPE_MAPPING = {
    "casual leave": "casual_leave",
    "casual": "casual_leave",
    "sick leave": "sick_leave",
    "sick": "sick_leave",
    "earned leave": "earned_leave",
    "earned": "earned_leave",
    "privilege leave": "earned_leave",
    "comp off": "comp_off",
    "compoff": "comp_off",
    "compensatory off": "comp_off"
}


def normalize_leave_type(leave_type: str) -> str:
    """Normalize leave type string to standard key"""
    return LEAVE_TYPE_MAPPING.get(leave_type.lower().strip(), "casual_leave")


@router.get("/leave/dashboard")
async def get_leave_dashboard():
    """
    Get comprehensive leave dashboard for HR
    Shows pending requests, leave statistics, department breakdown
    """
    # Get all pending leave requests
    pending_requests = await db.leave_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("applied_on", -1).to_list(100)
    
    # Serialize ObjectId if present
    for req in pending_requests:
        if "_id" in req:
            req["id"] = str(req["_id"])
            del req["_id"]
    
    # Get all leave requests for current month
    now = datetime.now()
    month_start = f"{now.year}-{now.month:02d}-01"
    
    all_requests = await db.leave_requests.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate statistics
    total_pending = len(pending_requests)
    total_approved = len([r for r in all_requests if r.get("status") == "approved"])
    total_rejected = len([r for r in all_requests if r.get("status") == "rejected"])
    
    # Days on leave this month (approved)
    days_on_leave = sum(
        r.get("days", 0) for r in all_requests 
        if r.get("status") == "approved" and r.get("from_date", "").startswith(f"{now.year}-{now.month:02d}")
    )
    
    # Department-wise breakdown
    dept_stats = {}
    for req in all_requests:
        if req.get("status") == "approved":
            dept = req.get("department", "Unknown")
            if dept not in dept_stats:
                dept_stats[dept] = {"count": 0, "days": 0}
            dept_stats[dept]["count"] += 1
            dept_stats[dept]["days"] += req.get("days", 0)
    
    # Leave type breakdown
    type_stats = {}
    for req in all_requests:
        if req.get("status") == "approved":
            leave_type = req.get("type", "Unknown")
            if leave_type not in type_stats:
                type_stats[leave_type] = {"count": 0, "days": 0}
            type_stats[leave_type]["count"] += 1
            type_stats[leave_type]["days"] += req.get("days", 0)
    
    # Get employees with low leave balance
    employees = await db.hr_employees.find(
        {"status": "active"},
        {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "leave_balance": 1}
    ).to_list(500)
    
    low_balance_employees = []
    for emp in employees:
        lb = emp.get("leave_balance", {})
        # Handle both old format (flat numbers) and new format (nested dicts)
        def get_remaining(leave_type, default):
            val = lb.get(leave_type, {})
            if isinstance(val, dict):
                return val.get("remaining", default)
            elif isinstance(val, (int, float)):
                return val
            return default
        
        total_remaining = sum([
            get_remaining("casual_leave", DEFAULT_LEAVE_ALLOCATION["casual_leave"]),
            get_remaining("sick_leave", DEFAULT_LEAVE_ALLOCATION["sick_leave"]),
            get_remaining("earned_leave", DEFAULT_LEAVE_ALLOCATION["earned_leave"]),
        ])
        if total_remaining <= 5:
            low_balance_employees.append({
                "emp_id": emp["emp_id"],
                "name": emp["name"],
                "department": emp.get("department", ""),
                "total_remaining": total_remaining
            })
    
    return {
        "summary": {
            "pending_requests": total_pending,
            "approved_this_year": total_approved,
            "rejected_this_year": total_rejected,
            "days_on_leave_this_month": days_on_leave
        },
        "pending_requests": pending_requests[:20],  # Latest 20
        "department_breakdown": [
            {"department": k, **v} for k, v in sorted(dept_stats.items())
        ],
        "leave_type_breakdown": [
            {"type": k, **v} for k, v in sorted(type_stats.items())
        ],
        "low_balance_employees": low_balance_employees[:10]
    }


@router.get("/leave/requests")
async def get_all_leave_requests(
    status: Optional[str] = None,
    department: Optional[str] = None,
    emp_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """Get all leave requests with filters for HR"""
    query = {}
    
    if status:
        query["status"] = status
    if department:
        query["department"] = {"$regex": department, "$options": "i"}
    if emp_id:
        query["$or"] = [{"emp_id": emp_id}, {"user_id": emp_id}]
    if month and year:
        month_str = f"{year}-{month:02d}"
        query["from_date"] = {"$regex": f"^{month_str}"}
    
    requests = await db.leave_requests.find(query, {"_id": 0}).sort("applied_on", -1).to_list(500)
    
    # Add id from _id if not present
    for req in requests:
        if "id" not in req and "_id" in req:
            req["id"] = str(req["_id"])
    
    return requests


@router.post("/leave/approve/{request_id}")
async def hr_approve_leave(request_id: str, approved_by: str = "HR Admin"):
    """
    HR approves leave request and updates employee leave balance
    Also links to HR employee record for payroll integration
    """
    from bson import ObjectId
    
    # Find the leave request
    leave_request = None
    try:
        leave_request = await db.leave_requests.find_one({"_id": ObjectId(request_id)})
    except:
        leave_request = await db.leave_requests.find_one({"id": request_id})
    
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Leave request already processed")
    
    user_id = leave_request.get("user_id")
    leave_type = normalize_leave_type(leave_request.get("type", "casual"))
    days = leave_request.get("days", 1)
    
    # Find linked HR employee record
    employee = await db.hr_employees.find_one(
        {"$or": [{"user_id": user_id}, {"id": user_id}, {"emp_id": user_id}]},
        {"_id": 0}
    )
    
    lop_days = 0
    deducted_days = days
    
    if employee:
        # Get current leave balance
        leave_balance = employee.get("leave_balance", {})
        current_balance = leave_balance.get(leave_type, {})
        remaining = current_balance.get("remaining", DEFAULT_LEAVE_ALLOCATION.get(leave_type, 12))
        
        # Calculate deduction and LOP
        if days > remaining:
            lop_days = days - remaining
            deducted_days = remaining
        
        # Update employee leave balance
        new_remaining = max(0, remaining - deducted_days)
        taken = current_balance.get("taken", 0) + deducted_days
        
        await db.hr_employees.update_one(
            {"$or": [{"user_id": user_id}, {"id": user_id}, {"emp_id": user_id}]},
            {
                "$set": {
                    f"leave_balance.{leave_type}.taken": taken,
                    f"leave_balance.{leave_type}.remaining": new_remaining,
                    f"leave_balance.{leave_type}.total": DEFAULT_LEAVE_ALLOCATION.get(leave_type, 12)
                }
            }
        )
    
    # Update leave request
    update_data = {
        "status": "approved",
        "approved_by": approved_by,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "lop_days": lop_days,
        "deducted_days": deducted_days,
        "emp_id": employee.get("emp_id") if employee else None
    }
    
    try:
        await db.leave_requests.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": update_data}
        )
    except:
        await db.leave_requests.update_one(
            {"id": request_id},
            {"$set": update_data}
        )
    
    return {
        "message": "Leave approved successfully",
        "days_approved": days,
        "deducted_from_balance": deducted_days,
        "lop_days": lop_days,
        "leave_type": leave_type
    }


@router.post("/leave/reject/{request_id}")
async def hr_reject_leave(request_id: str, rejected_by: str = "HR Admin", reason: str = ""):
    """HR rejects leave request"""
    from bson import ObjectId
    
    update_data = {
        "status": "rejected",
        "approved_by": rejected_by,
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": reason
    }
    
    try:
        result = await db.leave_requests.update_one(
            {"_id": ObjectId(request_id), "status": "pending"},
            {"$set": update_data}
        )
    except:
        result = await db.leave_requests.update_one(
            {"id": request_id, "status": "pending"},
            {"$set": update_data}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found or already processed")
    
    return {"message": "Leave request rejected"}


@router.get("/leave/employee-balance/{emp_id}")
async def get_employee_leave_balance_hr(emp_id: str):
    """
    Get detailed leave balance for an employee (HR view)
    Includes leave history and upcoming leaves
    """
    # Find employee
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}, {"user_id": emp_id}]},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp_id_actual = employee.get("emp_id", emp_id)
    user_id = employee.get("user_id", employee.get("id", emp_id))
    
    # Get leave balance from employee record
    leave_balance = employee.get("leave_balance", {})
    
    # Build balance object with defaults
    balance = {}
    for leave_type, default_total in DEFAULT_LEAVE_ALLOCATION.items():
        lb = leave_balance.get(leave_type, {})
        balance[leave_type] = {
            "total": lb.get("total", default_total),
            "taken": lb.get("taken", 0),
            "remaining": lb.get("remaining", default_total)
        }
    
    # Get leave history
    leave_history = await db.leave_requests.find(
        {"$or": [{"user_id": user_id}, {"emp_id": emp_id_actual}]},
        {"_id": 0}
    ).sort("applied_on", -1).to_list(50)
    
    # Get upcoming/current leaves (approved, from_date >= today)
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming_leaves = [
        l for l in leave_history 
        if l.get("status") == "approved" and l.get("from_date", "") >= today
    ]
    
    return {
        "emp_id": emp_id_actual,
        "emp_name": employee.get("name"),
        "department": employee.get("department"),
        "leave_balance": balance,
        "total_remaining": sum(b["remaining"] for b in balance.values()),
        "leave_history": leave_history[:20],
        "upcoming_leaves": upcoming_leaves,
        "pending_requests": len([l for l in leave_history if l.get("status") == "pending"])
    }


@router.put("/leave/balance/{emp_id}/reset")
async def reset_employee_leave_balance(emp_id: str, year: int = None):
    """Reset employee leave balance for a new year"""
    if not year:
        year = datetime.now().year
    
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Reset to default allocation
    new_balance = {}
    for leave_type, total in DEFAULT_LEAVE_ALLOCATION.items():
        new_balance[leave_type] = {
            "total": total,
            "taken": 0,
            "remaining": total,
            "year": year
        }
    
    await db.hr_employees.update_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"$set": {"leave_balance": new_balance}}
    )
    
    return {
        "message": f"Leave balance reset for {year}",
        "emp_id": emp_id,
        "new_balance": new_balance
    }


@router.get("/leave/calendar/{month}/{year}")
async def get_leave_calendar(month: int, year: int):
    """Get leave calendar for a month - shows who is on leave each day"""
    month_str = f"{year}-{month:02d}"
    
    # Get all approved leaves for this month
    leaves = await db.leave_requests.find({
        "status": "approved",
        "$or": [
            {"from_date": {"$regex": f"^{month_str}"}},
            {"to_date": {"$regex": f"^{month_str}"}}
        ]
    }, {"_id": 0}).to_list(500)
    
    # Build calendar
    days_in_month = calendar.monthrange(year, month)[1]
    calendar_data = {}
    
    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{month:02d}-{day:02d}"
        employees_on_leave = []
        
        for leave in leaves:
            from_date = leave.get("from_date", "")
            to_date = leave.get("to_date", from_date)
            
            if from_date <= date_str <= to_date:
                employees_on_leave.append({
                    "user_name": leave.get("user_name"),
                    "department": leave.get("department"),
                    "leave_type": leave.get("type")
                })
        
        if employees_on_leave:
            calendar_data[date_str] = employees_on_leave
    
    return {
        "month": month,
        "year": year,
        "calendar": calendar_data,
        "total_leave_instances": sum(len(v) for v in calendar_data.values())
    }

