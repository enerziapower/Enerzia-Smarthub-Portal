from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class ExportCustomer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    currency: str = "USD"
    payment_terms: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExportCustomerCreate(BaseModel):
    name: str
    country: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    currency: str = "USD"
    payment_terms: Optional[str] = None
    is_active: bool = True

class ExportOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: str
    customer_name: str
    order_date: str
    delivery_date: Optional[str] = None
    items: List[dict] = []
    total_value: float = 0
    currency: str = "USD"
    status: str = "Pending"
    shipping_details: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExportOrderCreate(BaseModel):
    order_number: str
    customer_id: str
    customer_name: str
    order_date: str
    delivery_date: Optional[str] = None
    items: List[dict] = []
    total_value: float = 0
    currency: str = "USD"
    status: str = "Pending"

class ExportInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    order_id: str
    customer_id: str
    customer_name: str
    invoice_date: str
    amount: float
    currency: str = "USD"
    exchange_rate: float = 1.0
    inr_value: float = 0
    status: str = "Pending"
    shipping_bill_number: Optional[str] = None
    shipping_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExportPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    customer_id: str
    customer_name: str
    amount: float
    currency: str = "USD"
    exchange_rate: float = 1.0
    inr_value: float = 0
    payment_date: str
    payment_mode: str = "Wire Transfer"
    bank_reference: Optional[str] = None
    firc_received: bool = False
    firc_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
