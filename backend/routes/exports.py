"""
Exports routes - Extracted from server.py
Handles export customers, orders, invoices, payments, and dashboard stats
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/exports", tags=["Exports"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia')]


# ==================== MODELS ====================

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
    quote_reference: Optional[str] = None
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


# ==================== CUSTOMERS ROUTES ====================

@router.get("/customers")
async def get_export_customers():
    """Get all export customers"""
    customers = await db.export_customers.find({}, {"_id": 0}).to_list(1000)
    return customers


@router.get("/customers/{customer_id}")
async def get_export_customer(customer_id: str):
    """Get a single export customer"""
    customer = await db.export_customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/customers")
async def create_export_customer(customer: ExportCustomerCreate):
    """Create a new export customer"""
    # Check if code already exists
    existing = await db.export_customers.find_one({"code": customer.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer with code {customer.code} already exists")
    
    new_customer = ExportCustomer(
        **customer.model_dump(),
        code=customer.code.upper()
    )
    doc = new_customer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.export_customers.insert_one(doc)
    return doc


@router.put("/customers/{customer_id}")
async def update_export_customer(customer_id: str, updates: dict):
    """Update an export customer"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.export_customers.update_one(
        {"id": customer_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = await db.export_customers.find_one({"id": customer_id}, {"_id": 0})
    return customer


@router.delete("/customers/{customer_id}")
async def delete_export_customer(customer_id: str):
    """Delete an export customer"""
    result = await db.export_customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}


@router.post("/customers/seed")
async def seed_export_customers():
    """Seed default export customers from the Excel data"""
    default_customers = [
        {
            "name": "HAWA Engineering Limited",
            "code": "HAWA",
            "country": "Saudi Arabia",
            "currency": "USD",
            "contact_person": "Contact Person",
            "payment_terms": "Net 30",
            "iec_no": "413053288"
        },
        {
            "name": "Amwaj International",
            "code": "AMWAJ",
            "country": "Saudi Arabia",
            "currency": "USD",
            "payment_terms": "Net 30"
        },
        {
            "name": "Digital Energy Solutions",
            "code": "DIGITAL",
            "country": "Qatar",
            "currency": "USD",
            "payment_terms": "Net 45"
        },
        {
            "name": "JAL International Trading",
            "code": "JAL",
            "country": "Saudi Arabia",
            "currency": "USD",
            "payment_terms": "Net 30"
        },
        {
            "name": "IEC Power Systems",
            "code": "IEC",
            "country": "Saudi Arabia",
            "currency": "USD",
            "payment_terms": "Net 30"
        }
    ]
    
    created_count = 0
    for customer_data in default_customers:
        existing = await db.export_customers.find_one({"code": customer_data["code"]})
        if not existing:
            customer = ExportCustomer(**customer_data)
            doc = customer.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.export_customers.insert_one(doc)
            created_count += 1
    
    return {"message": f"Created {created_count} export customers", "created": created_count}


# ==================== ORDERS ROUTES ====================

@router.get("/orders")
async def get_export_orders():
    """Get all export orders"""
    orders = await db.export_orders.find({}, {"_id": 0}).to_list(1000)
    return orders


@router.post("/orders")
async def create_export_order(order: ExportOrderCreate):
    """Create a new export order"""
    # Get customer details
    customer = await db.export_customers.find_one({"id": order.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    new_order = ExportOrder(
        **order.model_dump(),
        customer_name=customer['name'],
        country=customer['country'],
        currency=customer['currency'],
        order_date=datetime.fromisoformat(order.order_date) if isinstance(order.order_date, str) else order.order_date
    )
    doc = new_order.model_dump()
    doc['order_date'] = doc['order_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.export_orders.insert_one(doc)
    
    # Update customer totals
    await db.export_customers.update_one(
        {"id": order.customer_id},
        {
            "$inc": {"total_orders": 1, "total_value": order.order_value},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return doc


@router.put("/orders/{order_id}")
async def update_export_order(order_id: str, updates: dict):
    """Update an export order"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.export_orders.update_one(
        {"id": order_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = await db.export_orders.find_one({"id": order_id}, {"_id": 0})
    return order


@router.delete("/orders/{order_id}")
async def delete_export_order(order_id: str):
    """Delete an export order"""
    result = await db.export_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}


# ==================== INVOICES ROUTES ====================

@router.get("/invoices")
async def get_export_invoices():
    """Get all export invoices"""
    invoices = await db.export_invoices.find({}, {"_id": 0}).to_list(1000)
    return invoices


@router.post("/invoices")
async def create_export_invoice(invoice: dict):
    """Create a new export invoice"""
    # Get customer details
    customer = await db.export_customers.find_one({"id": invoice.get('customer_id')}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    new_invoice = ExportInvoice(
        invoice_no=invoice.get('invoice_no'),
        customer_id=invoice.get('customer_id'),
        customer_name=customer['name'],
        country=customer['country'],
        currency=customer['currency'],
        invoice_date=datetime.fromisoformat(invoice.get('invoice_date')) if invoice.get('invoice_date') else datetime.now(timezone.utc),
        invoice_value=float(invoice.get('invoice_value', 0)),
        inr_value=float(invoice.get('inr_value', 0)),
        shipping_bill_no=invoice.get('shipping_bill_no'),
        port_code=invoice.get('port_code', 'INMAA4'),
        awb_no=invoice.get('awb_no'),
        ebrc_no=invoice.get('ebrc_no'),
        rodtep=float(invoice.get('rodtep', 0))
    )
    doc = new_invoice.model_dump()
    doc['invoice_date'] = doc['invoice_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('shipping_bill_date'):
        doc['shipping_bill_date'] = doc['shipping_bill_date'].isoformat()
    
    await db.export_invoices.insert_one(doc)
    return doc


# ==================== PAYMENTS ROUTES ====================

@router.get("/payments")
async def get_export_payments():
    """Get all export payments"""
    payments = await db.export_payments.find({}, {"_id": 0}).to_list(1000)
    return payments


@router.post("/payments")
async def create_export_payment(payment: dict):
    """Create a new export payment record"""
    customer = await db.export_customers.find_one({"id": payment.get('customer_id')}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    new_payment = ExportPayment(
        customer_id=payment.get('customer_id'),
        customer_name=customer['name'],
        country=customer['country'],
        invoice_references=payment.get('invoice_references', ''),
        irm_no=payment.get('irm_no', ''),
        irm_date=datetime.fromisoformat(payment.get('irm_date')) if payment.get('irm_date') else datetime.now(timezone.utc),
        amount_usd=float(payment.get('amount_usd', 0)),
        amount_inr=float(payment.get('amount_inr', 0)),
        bank_name=payment.get('bank_name', ''),
        received_date=datetime.fromisoformat(payment.get('received_date')) if payment.get('received_date') else datetime.now(timezone.utc),
        month=payment.get('month', datetime.now().strftime('%B'))
    )
    doc = new_payment.model_dump()
    doc['irm_date'] = doc['irm_date'].isoformat()
    doc['received_date'] = doc['received_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.export_payments.insert_one(doc)
    return doc


# ==================== DASHBOARD STATS ====================

@router.get("/dashboard/stats")
async def get_export_dashboard_stats():
    """Get export department dashboard statistics"""
    # Get counts
    total_customers = await db.export_customers.count_documents({"is_active": True})
    total_orders = await db.export_orders.count_documents({})
    pending_orders = await db.export_orders.count_documents({"status": {"$in": ["pending", "in_progress"]}})
    completed_orders = await db.export_orders.count_documents({"status": "completed"})
    
    # Calculate total values
    orders = await db.export_orders.find({}, {"order_value": 1, "_id": 0}).to_list(10000)
    total_order_value = sum(o.get('order_value', 0) for o in orders)
    
    payments = await db.export_payments.find({}, {"amount_usd": 1, "amount_inr": 1, "_id": 0}).to_list(10000)
    total_payment_usd = sum(p.get('amount_usd', 0) for p in payments)
    total_payment_inr = sum(p.get('amount_inr', 0) for p in payments)
    
    invoices = await db.export_invoices.find({}, {"invoice_value": 1, "_id": 0}).to_list(10000)
    total_invoice_value = sum(i.get('invoice_value', 0) for i in invoices)
    
    return {
        "total_customers": total_customers,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_order_value_usd": total_order_value,
        "total_invoice_value_usd": total_invoice_value,
        "total_payment_received_usd": total_payment_usd,
        "total_payment_received_inr": total_payment_inr,
        "outstanding_usd": total_invoice_value - total_payment_usd
    }
