"""
Accounts Department Routes
Handles invoices, payments, TDS, GST, tasks and projections for the Accounts department
"""
import io
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
import pandas as pd

# Import shared dependencies from core modules
from core.database import db
from core.security import get_current_user, require_auth

router = APIRouter(prefix="/accounts", tags=["Accounts Department"])


# ==================== MODELS ====================

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_no: str
    invoice_type: str = "domestic"  # domestic, sez, export, cancelled, credit_note
    customer_name: str
    date: str  # DD/MM/YYYY
    gst_no: Optional[str] = None
    basic: float = 0
    sgst: float = 0
    cgst: float = 0
    igst: float = 0
    round_off: float = 0
    amount: float = 0
    cn_no: Optional[str] = None  # Credit Note number
    cd_no: Optional[str] = None  # Cancelled Document number
    status: str = "active"  # active, cancelled
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvoiceCreate(BaseModel):
    invoice_no: str
    invoice_type: str = "domestic"
    customer_name: str
    date: str
    gst_no: Optional[str] = None
    basic: float = 0
    sgst: float = 0
    cgst: float = 0
    igst: float = 0
    round_off: float = 0
    amount: float = 0
    cn_no: Optional[str] = None
    cd_no: Optional[str] = None


class OverdueInvoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_no: str
    customer_name: str
    date: str
    due_date: str
    amount: float = 0
    balance_due: float = 0
    status: str = "overdue"  # overdue, partially_paid, paid
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RetentionInvoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_no: str
    customer_name: str
    category: str = ""
    date: str
    due_date: str
    amount: float = 0
    balance_due: float = 0
    status: str = "pending"  # pending, released, partial
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentCollection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    invoice_no: Optional[str] = None
    date: str
    amount: float = 0
    payment_mode: str = "bank_transfer"  # bank_transfer, cheque, cash, upi
    reference_no: Optional[str] = None
    remarks: Optional[str] = None
    status: str = "received"  # pending, received
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TDSRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: str
    section: str  # 194C, 194I, 194J, etc.
    party_name: str
    pan_no: Optional[str] = None
    tds_rate: float = 0
    gross_amount: float = 0
    tds_amount: float = 0
    date_of_deduction: str
    date_of_deposit: Optional[str] = None
    challan_no: Optional[str] = None
    status: str = "pending"  # pending, deposited
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GSTRRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: str
    year: int
    gstr1_status: str = "pending"  # pending, filed
    gstr3b_status: str = "pending"
    cgst: float = 0
    sgst: float = 0
    igst: float = 0
    input_value: float = 0
    arn_no: Optional[str] = None
    filing_date: Optional[str] = None
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_name: str
    description: Optional[str] = None
    assigned_to: str
    due_date: str
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "pending"  # pending, in_progress, completed, cancelled
    category: str = "general"  # general, followup, payment, invoice, gst, tds
    related_customer: Optional[str] = None
    related_invoice: Optional[str] = None
    remarks: Optional[str] = None
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BillingProjection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    period: str  # e.g., "Q1 2025-26", "April 2025"
    domestic_target: float = 0
    export_target: float = 0
    gross_target: float = 0
    domestic_achieved: float = 0
    export_achieved: float = 0
    gross_achieved: float = 0
    payment_collected: float = 0
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WeeklyInvoiceSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week: str  # e.g., "W1", "W2"
    month: str  # e.g., "April"
    year: int
    domestic_value: float = 0
    domestic_count: int = 0
    sez_value: float = 0
    sez_count: int = 0
    export_value: float = 0
    export_count: int = 0
    cancelled_value: float = 0
    cancelled_count: int = 0
    credit_note_value: float = 0
    credit_note_count: int = 0
    total_value: float = 0
    total_count: int = 0
    department: str = "ACCOUNTS"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== INVOICE ROUTES ====================

@router.get("/invoices")
async def get_invoices(
    invoice_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices with optional filtering"""
    query = {"department": "ACCOUNTS"}
    if invoice_type:
        query["invoice_type"] = invoice_type
    if status:
        query["status"] = status
    
    invoices = await db.accounts_invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices


@router.post("/invoices")
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(require_auth)):
    """Create a new invoice"""
    invoice_obj = Invoice(**invoice.model_dump())
    doc = invoice_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_invoices.insert_one(doc)
    return invoice_obj


@router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update an invoice"""
    update_data.pop('id', None)
    update_data.pop('created_at', None)
    
    result = await db.accounts_invoices.update_one(
        {"id": invoice_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    updated = await db.accounts_invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(require_auth)):
    """Delete an invoice"""
    result = await db.accounts_invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


# ==================== OVERDUE INVOICE ROUTES ====================

@router.get("/overdue-invoices")
async def get_overdue_invoices(current_user: dict = Depends(get_current_user)):
    """Get all overdue invoices"""
    invoices = await db.accounts_overdue.find({"department": "ACCOUNTS"}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return invoices


@router.post("/overdue-invoices")
async def create_overdue_invoice(invoice: dict, current_user: dict = Depends(require_auth)):
    """Create a new overdue invoice entry"""
    obj = OverdueInvoice(**invoice)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_overdue.insert_one(doc)
    return obj


@router.put("/overdue-invoices/{invoice_id}")
async def update_overdue_invoice(invoice_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update an overdue invoice"""
    update_data.pop('id', None)
    result = await db.accounts_overdue.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await db.accounts_overdue.find_one({"id": invoice_id}, {"_id": 0})


@router.delete("/overdue-invoices/{invoice_id}")
async def delete_overdue_invoice(invoice_id: str, current_user: dict = Depends(require_auth)):
    """Delete an overdue invoice"""
    result = await db.accounts_overdue.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


# ==================== RETENTION ROUTES ====================

@router.get("/retention")
async def get_retention_invoices(current_user: dict = Depends(get_current_user)):
    """Get all retention invoices"""
    invoices = await db.accounts_retention.find({"department": "ACCOUNTS"}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return invoices


@router.post("/retention")
async def create_retention_invoice(invoice: dict, current_user: dict = Depends(require_auth)):
    """Create a new retention invoice"""
    obj = RetentionInvoice(**invoice)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_retention.insert_one(doc)
    return obj


@router.put("/retention/{invoice_id}")
async def update_retention_invoice(invoice_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a retention invoice"""
    update_data.pop('id', None)
    result = await db.accounts_retention.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await db.accounts_retention.find_one({"id": invoice_id}, {"_id": 0})


@router.delete("/retention/{invoice_id}")
async def delete_retention_invoice(invoice_id: str, current_user: dict = Depends(require_auth)):
    """Delete a retention invoice"""
    result = await db.accounts_retention.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


# ==================== PAYMENT ROUTES ====================

@router.get("/payments")
async def get_payments(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all payment collections"""
    query = {"department": "ACCOUNTS"}
    if status:
        query["status"] = status
    payments = await db.accounts_payments.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return payments


@router.post("/payments")
async def create_payment(payment: dict, current_user: dict = Depends(require_auth)):
    """Create a new payment collection"""
    obj = PaymentCollection(**payment)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_payments.insert_one(doc)
    return obj


@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a payment collection"""
    update_data.pop('id', None)
    result = await db.accounts_payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return await db.accounts_payments.find_one({"id": payment_id}, {"_id": 0})


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(require_auth)):
    """Delete a payment collection"""
    result = await db.accounts_payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted successfully"}


# ==================== TDS ROUTES ====================

@router.get("/tds")
async def get_tds_records(
    month: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all TDS records with optional filtering"""
    query = {"department": "ACCOUNTS"}
    if month:
        query["month"] = month
    if status:
        query["status"] = status
    records = await db.accounts_tds.find(query, {"_id": 0}).sort("date_of_deduction", -1).to_list(1000)
    return records


@router.post("/tds")
async def create_tds_record(record: dict, current_user: dict = Depends(require_auth)):
    """Create a new TDS record"""
    obj = TDSRecord(**record)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_tds.insert_one(doc)
    return obj


@router.put("/tds/{record_id}")
async def update_tds_record(record_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a TDS record"""
    update_data.pop('id', None)
    result = await db.accounts_tds.update_one({"id": record_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="TDS record not found")
    return await db.accounts_tds.find_one({"id": record_id}, {"_id": 0})


@router.delete("/tds/{record_id}")
async def delete_tds_record(record_id: str, current_user: dict = Depends(require_auth)):
    """Delete a TDS record"""
    result = await db.accounts_tds.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="TDS record not found")
    return {"message": "TDS record deleted successfully"}


# ==================== GSTR ROUTES ====================

@router.get("/gstr")
async def get_gstr_records(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all GSTR records"""
    query = {"department": "ACCOUNTS"}
    if year:
        query["year"] = year
    records = await db.accounts_gstr.find(query, {"_id": 0}).sort([("year", -1), ("month", 1)]).to_list(100)
    return records


@router.post("/gstr")
async def create_gstr_record(record: dict, current_user: dict = Depends(require_auth)):
    """Create a new GSTR record"""
    obj = GSTRRecord(**record)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_gstr.insert_one(doc)
    return obj


@router.put("/gstr/{record_id}")
async def update_gstr_record(record_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a GSTR record"""
    update_data.pop('id', None)
    result = await db.accounts_gstr.update_one({"id": record_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="GSTR record not found")
    return await db.accounts_gstr.find_one({"id": record_id}, {"_id": 0})


# ==================== TASKS ROUTES ====================

@router.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks with optional filtering"""
    query = {"department": "ACCOUNTS"}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tasks = await db.accounts_tasks.find(query, {"_id": 0}).sort([("priority", 1), ("due_date", 1)]).to_list(1000)
    return tasks


@router.post("/tasks")
async def create_task(task: dict, current_user: dict = Depends(require_auth)):
    """Create a new task"""
    obj = TaskItem(**task)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.accounts_tasks.insert_one(doc)
    return obj


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a task"""
    update_data.pop('id', None)
    update_data.pop('created_at', None)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.accounts_tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return await db.accounts_tasks.find_one({"id": task_id}, {"_id": 0})


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(require_auth)):
    """Delete a task"""
    result = await db.accounts_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


# ==================== PROJECTIONS ROUTES ====================

@router.get("/projections")
async def get_projections(current_user: dict = Depends(get_current_user)):
    """Get all billing projections"""
    projections = await db.accounts_projections.find({"department": "ACCOUNTS"}, {"_id": 0}).to_list(100)
    return projections


@router.post("/projections")
async def create_projection(projection: dict, current_user: dict = Depends(require_auth)):
    """Create a new billing projection"""
    obj = BillingProjection(**projection)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_projections.insert_one(doc)
    return obj


@router.put("/projections/{projection_id}")
async def update_projection(projection_id: str, update_data: dict, current_user: dict = Depends(require_auth)):
    """Update a billing projection"""
    update_data.pop('id', None)
    result = await db.accounts_projections.update_one({"id": projection_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projection not found")
    return await db.accounts_projections.find_one({"id": projection_id}, {"_id": 0})


# ==================== WEEKLY SUMMARY ROUTES ====================

@router.get("/weekly-summary")
async def get_weekly_summaries(
    month: Optional[str] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all weekly invoice summaries"""
    query = {"department": "ACCOUNTS"}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    summaries = await db.accounts_weekly_summary.find(query, {"_id": 0}).sort([("year", -1), ("month", 1), ("week", 1)]).to_list(500)
    return summaries


@router.post("/weekly-summary")
async def create_weekly_summary(summary: dict, current_user: dict = Depends(require_auth)):
    """Create a new weekly summary"""
    obj = WeeklyInvoiceSummary(**summary)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts_weekly_summary.insert_one(doc)
    return obj


# ==================== DASHBOARD STATS ====================

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for accounts department"""
    # Invoice counts
    total_invoices = await db.accounts_invoices.count_documents({"department": "ACCOUNTS"})
    domestic_invoices = await db.accounts_invoices.count_documents({"department": "ACCOUNTS", "invoice_type": "domestic"})
    export_invoices = await db.accounts_invoices.count_documents({"department": "ACCOUNTS", "invoice_type": "export"})
    sez_invoices = await db.accounts_invoices.count_documents({"department": "ACCOUNTS", "invoice_type": "sez"})
    
    # Invoice values
    invoices = await db.accounts_invoices.find({"department": "ACCOUNTS"}, {"_id": 0}).to_list(10000)
    total_invoice_value = sum(inv.get('amount', 0) for inv in invoices)
    domestic_value = sum(inv.get('amount', 0) for inv in invoices if inv.get('invoice_type') == 'domestic')
    export_value = sum(inv.get('amount', 0) for inv in invoices if inv.get('invoice_type') == 'export')
    
    # Overdue stats
    overdue_invoices = await db.accounts_overdue.find({"department": "ACCOUNTS"}, {"_id": 0}).to_list(1000)
    overdue_count = len(overdue_invoices)
    overdue_value = sum(inv.get('balance_due', 0) for inv in overdue_invoices)
    
    # Retention stats
    retention_invoices = await db.accounts_retention.find({"department": "ACCOUNTS"}, {"_id": 0}).to_list(1000)
    retention_count = len(retention_invoices)
    retention_value = sum(inv.get('balance_due', 0) for inv in retention_invoices)
    
    # Payment stats
    payments = await db.accounts_payments.find({"department": "ACCOUNTS"}, {"_id": 0}).to_list(1000)
    payment_collected = sum(p.get('amount', 0) for p in payments)
    
    # Task stats
    pending_tasks = await db.accounts_tasks.count_documents({"department": "ACCOUNTS", "status": "pending"})
    overdue_tasks = await db.accounts_tasks.count_documents({
        "department": "ACCOUNTS",
        "status": {"$ne": "completed"},
        "due_date": {"$lt": datetime.now(timezone.utc).strftime("%d/%m/%Y")}
    })
    
    # TDS stats
    tds_pending = await db.accounts_tds.count_documents({"department": "ACCOUNTS", "status": "pending"})
    tds_records = await db.accounts_tds.find({"department": "ACCOUNTS", "status": "pending"}, {"_id": 0}).to_list(100)
    tds_amount = sum(t.get('tds_amount', 0) for t in tds_records)
    
    return {
        "invoices": {
            "total": total_invoices,
            "domestic": domestic_invoices,
            "export": export_invoices,
            "sez": sez_invoices,
            "total_value": total_invoice_value,
            "domestic_value": domestic_value,
            "export_value": export_value
        },
        "overdue": {
            "count": overdue_count,
            "value": overdue_value
        },
        "retention": {
            "count": retention_count,
            "value": retention_value
        },
        "payments": {
            "collected": payment_collected
        },
        "tasks": {
            "pending": pending_tasks,
            "overdue": overdue_tasks
        },
        "tds": {
            "pending": tds_pending,
            "amount": tds_amount
        }
    }


# ==================== IMPORT ROUTES ====================

@router.post("/import/invoices")
async def import_invoices_excel(file: UploadFile = File(...), current_user: dict = Depends(require_auth)):
    """Import invoices from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.strip().str.lower()
        
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                data = {
                    'invoice_no': str(row.get('invoice no', row.get('invoice_no', f'INV-{index+1}'))),
                    'invoice_type': str(row.get('type', row.get('invoice_type', 'domestic'))).lower(),
                    'customer_name': str(row.get('customer name', row.get('customer_name', row.get('customer', 'Unknown')))),
                    'date': str(row.get('date', '')),
                    'gst_no': str(row.get('gst no', row.get('gst_no', row.get('gstin', '')))) if pd.notna(row.get('gst no', row.get('gst_no', row.get('gstin')))) else None,
                    'basic': float(row.get('basic', 0)) if pd.notna(row.get('basic')) else 0,
                    'sgst': float(row.get('sgst', 0)) if pd.notna(row.get('sgst')) else 0,
                    'cgst': float(row.get('cgst', 0)) if pd.notna(row.get('cgst')) else 0,
                    'igst': float(row.get('igst', 0)) if pd.notna(row.get('igst')) else 0,
                    'round_off': float(row.get('round off', row.get('round_off', 0))) if pd.notna(row.get('round off', row.get('round_off'))) else 0,
                    'amount': float(row.get('amount', row.get('total', 0))) if pd.notna(row.get('amount', row.get('total'))) else 0,
                }
                
                obj = Invoice(**data)
                doc = obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.accounts_invoices.insert_one(doc)
                imported_count += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {"message": f"Successfully imported {imported_count} invoices", "imported": imported_count, "errors": errors if errors else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("/import/overdue")
async def import_overdue_excel(file: UploadFile = File(...), current_user: dict = Depends(require_auth)):
    """Import overdue invoices from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.strip().str.lower()
        
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                data = {
                    'invoice_no': str(row.get('invoice no', row.get('invoice_no', f'INV-{index+1}'))),
                    'customer_name': str(row.get('customer name', row.get('customer_name', row.get('customer', 'Unknown')))),
                    'date': str(row.get('date', row.get('invoice date', ''))),
                    'due_date': str(row.get('due date', row.get('due_date', ''))),
                    'amount': float(row.get('amount', row.get('total', 0))) if pd.notna(row.get('amount', row.get('total'))) else 0,
                    'balance_due': float(row.get('balance due', row.get('balance_due', row.get('balance', 0)))) if pd.notna(row.get('balance due', row.get('balance_due', row.get('balance')))) else 0,
                }
                
                obj = OverdueInvoice(**data)
                doc = obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.accounts_overdue.insert_one(doc)
                imported_count += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {"message": f"Successfully imported {imported_count} overdue invoices", "imported": imported_count, "errors": errors if errors else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("/import/retention")
async def import_retention_excel(file: UploadFile = File(...), current_user: dict = Depends(require_auth)):
    """Import retention invoices from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.strip().str.lower()
        
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                data = {
                    'invoice_no': str(row.get('invoice no', row.get('invoice_no', f'RET-{index+1}'))),
                    'customer_name': str(row.get('customer name', row.get('customer_name', row.get('customer', 'Unknown')))),
                    'category': str(row.get('category', '')) if pd.notna(row.get('category')) else '',
                    'date': str(row.get('date', row.get('invoice date', ''))),
                    'due_date': str(row.get('due date', row.get('due_date', ''))),
                    'amount': float(row.get('amount', row.get('total', 0))) if pd.notna(row.get('amount', row.get('total'))) else 0,
                    'balance_due': float(row.get('balance due', row.get('balance_due', row.get('balance', 0)))) if pd.notna(row.get('balance due', row.get('balance_due', row.get('balance')))) else 0,
                }
                
                obj = RetentionInvoice(**data)
                doc = obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.accounts_retention.insert_one(doc)
                imported_count += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {"message": f"Successfully imported {imported_count} retention invoices", "imported": imported_count, "errors": errors if errors else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.post("/import/tasks")
async def import_tasks_excel(file: UploadFile = File(...), current_user: dict = Depends(require_auth)):
    """Import tasks from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df.columns = df.columns.str.strip().str.lower()
        
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                data = {
                    'task_name': str(row.get('task name', row.get('task_name', row.get('task', f'Task-{index+1}')))),
                    'description': str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    'assigned_to': str(row.get('assigned to', row.get('assigned_to', 'Unassigned'))),
                    'due_date': str(row.get('due date', row.get('due_date', ''))),
                    'priority': str(row.get('priority', 'medium')).lower(),
                    'status': str(row.get('status', 'pending')).lower(),
                    'category': str(row.get('category', 'general')).lower(),
                    'related_customer': str(row.get('customer', row.get('related_customer', ''))) if pd.notna(row.get('customer', row.get('related_customer'))) else None,
                    'remarks': str(row.get('remarks', '')) if pd.notna(row.get('remarks')) else None,
                }
                
                obj = TaskItem(**data)
                doc = obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                doc['updated_at'] = doc['updated_at'].isoformat()
                await db.accounts_tasks.insert_one(doc)
                imported_count += 1
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {"message": f"Successfully imported {imported_count} tasks", "imported": imported_count, "errors": errors if errors else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
