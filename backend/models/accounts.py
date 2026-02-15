from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    client: str
    amount: float
    gst_amount: float = 0
    total_amount: float
    invoice_date: str
    due_date: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    invoice_number: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    client: str
    amount: float
    gst_amount: float = 0
    total_amount: float
    invoice_date: str
    due_date: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None

class OverdueInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client: str
    amount: float
    due_date: str
    days_overdue: int = 0
    status: str = "Overdue"
    follow_up_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RetentionInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    project_name: str
    client: str
    retention_amount: float
    release_date: Optional[str] = None
    status: str = "Held"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCollection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client: str
    amount_collected: float
    collection_date: str
    payment_mode: str = "Bank Transfer"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TDSRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    financial_year: str
    quarter: str
    client: str
    invoice_number: Optional[str] = None
    tds_amount: float
    tds_rate: float = 10
    certificate_received: bool = False
    certificate_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GSTRRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    return_type: str  # GSTR-1, GSTR-3B
    period: str  # e.g., "January 2024"
    filing_date: Optional[str] = None
    due_date: str
    status: str = "Pending"
    tax_liability: float = 0
    itc_claimed: float = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    category: str = "General"  # Invoice, TDS, GST, Collection, Other
    related_id: Optional[str] = None  # ID of related invoice/record
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BillingProjection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: str
    year: int
    projected_billing: float
    actual_billing: float = 0
    variance: float = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyInvoiceSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_start: str
    week_end: str
    invoices_raised: int = 0
    total_amount: float = 0
    collections: float = 0
    outstanding: float = 0
    overdue_count: int = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
