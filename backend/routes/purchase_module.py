"""
Purchase Module API Routes (Phase 2)
- Purchase Requests (auto from orders or manual)
- Vendor Quotes comparison
- Purchase Orders with approval workflow
- GRN (Goods Receipt Notes)
- Savings tracking (Target vs Actual)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/purchase-module", tags=["Purchase Module"])


# ============== MODELS ==============

class PurchaseRequestItem(BaseModel):
    """Item in a purchase request"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    quantity: float = 1
    unit: str = "Nos"
    estimated_price: float = 0
    notes: Optional[str] = None


class PurchaseRequestCreate(BaseModel):
    """Create a purchase request"""
    sales_order_id: Optional[str] = None
    title: str
    items: List[PurchaseRequestItem]
    required_by: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent
    notes: Optional[str] = None
    requested_by: Optional[str] = None


class VendorQuote(BaseModel):
    """Vendor quote for a purchase request"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: Optional[str] = None
    vendor_name: str
    items: List[dict]  # {item_id, quoted_price, delivery_days, notes}
    total_amount: float = 0
    delivery_days: int = 7
    validity_days: int = 30
    payment_terms: Optional[str] = None
    quote_date: str
    quote_ref: Optional[str] = None
    notes: Optional[str] = None
    selected: bool = False


class PurchaseOrderCreate(BaseModel):
    """Create a purchase order"""
    purchase_request_id: Optional[str] = None
    sales_order_id: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name: str
    vendor_address: Optional[str] = None
    vendor_gst: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    date: str
    delivery_date: Optional[str] = None
    items: List[dict]  # {description, quantity, unit, unit_price, total}
    subtotal: float = 0
    gst_percent: float = 18
    gst_amount: float = 0
    total_amount: float = 0
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    notes: Optional[str] = None


class GRNCreate(BaseModel):
    """Create a Goods Receipt Note"""
    purchase_order_id: str
    received_date: str
    received_by: Optional[str] = None
    items: List[dict]  # {item_id, received_qty, accepted_qty, rejected_qty, notes}
    delivery_challan_no: Optional[str] = None
    vehicle_no: Optional[str] = None
    notes: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def generate_pr_number(sales_order_id: str = None):
    """
    Generate unique PR number.
    If linked to PID: PR-PID/25-26/363-01
    If standalone: PR-{year}-{seq}
    """
    from utils.pid_system import get_next_purchase_request_number
    
    # Get the PID from sales order if linked
    linked_pid = None
    if sales_order_id:
        order = await db.sales_orders.find_one({"id": sales_order_id}, {"order_no": 1, "_id": 0})
        if order and order.get("order_no", "").startswith("PID/"):
            linked_pid = order["order_no"]
    
    return await get_next_purchase_request_number(linked_pid)


async def generate_po_number(sales_order_id: str = None):
    """
    Generate unique PO number.
    If linked to PID: PO-PID/25-26/363-01
    If standalone: PO-{year}-{seq}
    """
    from utils.pid_system import get_next_purchase_order_number
    
    # Get the PID from sales order if linked
    linked_pid = None
    if sales_order_id:
        order = await db.sales_orders.find_one({"id": sales_order_id}, {"order_no": 1, "_id": 0})
        if order and order.get("order_no", "").startswith("PID/"):
            linked_pid = order["order_no"]
    
    return await get_next_purchase_order_number(linked_pid)


async def generate_grn_number():
    """Generate unique GRN number"""
    count = await db.grn.count_documents({})
    year = datetime.now().year
    return f"GRN-{year}-{str(count + 1).zfill(4)}"


# ============== PURCHASE REQUEST ENDPOINTS ==============

@router.get("/requests")
async def get_purchase_requests(
    status: Optional[str] = None,
    order_id: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all purchase requests"""
    query = {}
    if status:
        query["status"] = status
    if order_id:
        query["sales_order_id"] = order_id
    if priority:
        query["priority"] = priority
    
    cursor = db.purchase_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    requests = await cursor.to_list(length=limit)
    total = await db.purchase_requests.count_documents(query)
    
    return {"requests": requests, "total": total}


@router.get("/requests/{request_id}")
async def get_purchase_request(request_id: str):
    """Get purchase request details"""
    pr = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Get vendor quotes
    quotes = await db.vendor_quotes.find({"purchase_request_id": request_id}, {"_id": 0}).to_list(100)
    
    # Get linked order if any
    order = None
    if pr.get("sales_order_id"):
        order = await db.sales_orders.find_one({"id": pr["sales_order_id"]}, {"_id": 0})
    
    return {"request": pr, "quotes": quotes, "order": order}


@router.post("/requests")
async def create_purchase_request(data: PurchaseRequestCreate):
    """Create a new purchase request"""
    pr_no = await generate_pr_number(data.sales_order_id)
    
    # Calculate total estimated value
    total_estimated = sum(item.quantity * item.estimated_price for item in data.items)
    
    # Get linked PID if sales order is linked
    linked_pid = None
    if data.sales_order_id:
        order = await db.sales_orders.find_one({"id": data.sales_order_id}, {"order_no": 1, "_id": 0})
        if order:
            linked_pid = order.get("order_no")
    
    pr = {
        "id": str(uuid.uuid4()),
        "pr_no": pr_no,
        "linked_pid": linked_pid,
        "sales_order_id": data.sales_order_id,
        "title": data.title,
        "items": [item.model_dump() for item in data.items],
        "total_estimated": total_estimated,
        "required_by": data.required_by,
        "priority": data.priority,
        "status": "pending",  # pending, quoted, approved, ordered, closed
        "notes": data.notes,
        "requested_by": data.requested_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.purchase_requests.insert_one(pr)
    pr.pop("_id", None)
    
    return {"message": "Purchase request created", "request": pr}


@router.post("/requests/from-order/{order_id}")
async def create_request_from_order(order_id: str, items: List[PurchaseRequestItem]):
    """Create purchase request from a sales order"""
    # Verify order exists
    order = await db.sales_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Get order lifecycle for budget
    lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
    purchase_budget = 0
    if lifecycle and lifecycle.get("purchase_budget"):
        budget = lifecycle["purchase_budget"]
        if budget.get("type") == "percentage":
            purchase_budget = order.get("total_amount", 0) * (budget.get("value", 0) / 100)
        else:
            purchase_budget = budget.get("value", 0)
    
    pr_no = await generate_pr_number()
    total_estimated = sum(item.quantity * item.estimated_price for item in items)
    
    pr = {
        "id": str(uuid.uuid4()),
        "pr_no": pr_no,
        "sales_order_id": order_id,
        "order_no": order.get("order_no"),
        "customer_name": order.get("customer_name"),
        "title": f"Materials for {order.get('order_no')}",
        "items": [item.model_dump() for item in items],
        "total_estimated": total_estimated,
        "purchase_budget": purchase_budget,
        "required_by": None,
        "priority": "normal",
        "status": "pending",
        "notes": None,
        "requested_by": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.purchase_requests.insert_one(pr)
    pr.pop("_id", None)
    
    return {"message": "Purchase request created from order", "request": pr}


@router.put("/requests/{request_id}")
async def update_purchase_request(request_id: str, data: dict):
    """Update a purchase request"""
    update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "pr_no", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.purchase_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    pr = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
    return {"message": "Request updated", "request": pr}


@router.put("/requests/{request_id}/status")
async def update_request_status(request_id: str, status: str):
    """Update purchase request status"""
    valid_statuses = ["pending", "quoted", "approved", "ordered", "closed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.purchase_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    return {"message": "Status updated", "status": status}


@router.delete("/requests/{request_id}")
async def delete_purchase_request(request_id: str):
    """Delete a purchase request"""
    result = await db.purchase_requests.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Also delete related quotes
    await db.vendor_quotes.delete_many({"purchase_request_id": request_id})
    
    return {"message": "Request deleted"}


# ============== VENDOR QUOTES ENDPOINTS ==============

@router.get("/quotes")
async def get_vendor_quotes(
    request_id: Optional[str] = None,
    vendor_name: Optional[str] = None,
    limit: int = 100
):
    """Get vendor quotes"""
    query = {}
    if request_id:
        query["purchase_request_id"] = request_id
    if vendor_name:
        query["vendor_name"] = {"$regex": vendor_name, "$options": "i"}
    
    cursor = db.vendor_quotes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    quotes = await cursor.to_list(length=limit)
    
    return {"quotes": quotes}


@router.post("/quotes")
async def add_vendor_quote(request_id: str, quote: VendorQuote):
    """Add a vendor quote for a purchase request"""
    # Verify request exists
    pr = await db.purchase_requests.find_one({"id": request_id})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    quote_data = quote.model_dump()
    quote_data["purchase_request_id"] = request_id
    quote_data["created_at"] = datetime.now(timezone.utc)
    
    await db.vendor_quotes.insert_one(quote_data)
    quote_data.pop("_id", None)
    
    # Update request status to quoted
    await db.purchase_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "quoted", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Quote added", "quote": quote_data}


@router.put("/quotes/{quote_id}/select")
async def select_vendor_quote(quote_id: str):
    """Select a vendor quote as the winning quote"""
    quote = await db.vendor_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Unselect all other quotes for this request
    await db.vendor_quotes.update_many(
        {"purchase_request_id": quote["purchase_request_id"]},
        {"$set": {"selected": False}}
    )
    
    # Select this quote
    await db.vendor_quotes.update_one(
        {"id": quote_id},
        {"$set": {"selected": True}}
    )
    
    # Update request status to approved
    await db.purchase_requests.update_one(
        {"id": quote["purchase_request_id"]},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Quote selected"}


@router.delete("/quotes/{quote_id}")
async def delete_vendor_quote(quote_id: str):
    """Delete a vendor quote"""
    result = await db.vendor_quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}


@router.get("/quotes/compare/{request_id}")
async def compare_vendor_quotes(request_id: str):
    """Compare all vendor quotes for a purchase request"""
    pr = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    quotes = await db.vendor_quotes.find({"purchase_request_id": request_id}, {"_id": 0}).to_list(100)
    
    if not quotes:
        return {"request": pr, "quotes": [], "comparison": None}
    
    # Build comparison matrix
    comparison = {
        "items": [],
        "totals": [],
        "lowest_total": None,
        "savings_potential": 0
    }
    
    # For each item in the request, compare prices
    for item in pr.get("items", []):
        item_comparison = {
            "item_id": item["id"],
            "description": item["description"],
            "quantity": item["quantity"],
            "estimated_price": item.get("estimated_price", 0),
            "vendor_prices": []
        }
        
        for quote in quotes:
            quote_item = next((qi for qi in quote.get("items", []) if qi.get("item_id") == item["id"]), None)
            if quote_item:
                item_comparison["vendor_prices"].append({
                    "vendor_name": quote["vendor_name"],
                    "quoted_price": quote_item.get("quoted_price", 0),
                    "delivery_days": quote_item.get("delivery_days", quote.get("delivery_days", 7))
                })
        
        # Find lowest price for this item
        if item_comparison["vendor_prices"]:
            lowest = min(item_comparison["vendor_prices"], key=lambda x: x["quoted_price"])
            item_comparison["lowest_vendor"] = lowest["vendor_name"]
            item_comparison["lowest_price"] = lowest["quoted_price"]
        
        comparison["items"].append(item_comparison)
    
    # Compare totals
    for quote in quotes:
        comparison["totals"].append({
            "vendor_name": quote["vendor_name"],
            "total_amount": quote["total_amount"],
            "delivery_days": quote["delivery_days"],
            "selected": quote.get("selected", False)
        })
    
    # Find lowest total
    if comparison["totals"]:
        lowest = min(comparison["totals"], key=lambda x: x["total_amount"])
        highest = max(comparison["totals"], key=lambda x: x["total_amount"])
        comparison["lowest_total"] = lowest
        comparison["savings_potential"] = highest["total_amount"] - lowest["total_amount"]
    
    return {"request": pr, "quotes": quotes, "comparison": comparison}


# ============== PURCHASE ORDER ENDPOINTS ==============

@router.get("/orders")
async def get_purchase_orders(
    status: Optional[str] = None,
    vendor: Optional[str] = None,
    order_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all purchase orders"""
    query = {}
    if status:
        query["status"] = status
    if vendor:
        query["vendor_name"] = {"$regex": vendor, "$options": "i"}
    if order_id:
        query["sales_order_id"] = order_id
    
    cursor = db.purchase_orders_v2.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(length=limit)
    total = await db.purchase_orders_v2.count_documents(query)
    
    # Calculate totals
    total_value = sum(o.get("total_amount", 0) for o in orders)
    
    return {"orders": orders, "total": total, "total_value": total_value}


@router.get("/orders/{po_id}")
async def get_purchase_order(po_id: str):
    """Get purchase order details"""
    po = await db.purchase_orders_v2.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Get GRNs for this PO
    grns = await db.grn.find({"purchase_order_id": po_id}, {"_id": 0}).to_list(100)
    
    # Get linked request if any
    request = None
    if po.get("purchase_request_id"):
        request = await db.purchase_requests.find_one({"id": po["purchase_request_id"]}, {"_id": 0})
    
    return {"order": po, "grns": grns, "request": request}


@router.post("/orders")
async def create_purchase_order(data: PurchaseOrderCreate):
    """Create a new purchase order"""
    po_no = await generate_po_number(data.sales_order_id)
    
    # Get linked PID if sales order is linked
    linked_pid = None
    if data.sales_order_id:
        order = await db.sales_orders.find_one({"id": data.sales_order_id}, {"order_no": 1, "_id": 0})
        if order:
            linked_pid = order.get("order_no")
    
    po = {
        "id": str(uuid.uuid4()),
        "po_no": po_no,
        "linked_pid": linked_pid,
        "purchase_request_id": data.purchase_request_id,
        "sales_order_id": data.sales_order_id,
        "vendor_id": data.vendor_id,
        "vendor_name": data.vendor_name,
        "vendor_address": data.vendor_address,
        "vendor_gst": data.vendor_gst,
        "vendor_contact": data.vendor_contact,
        "vendor_phone": data.vendor_phone,
        "vendor_email": data.vendor_email,
        "date": data.date,
        "delivery_date": data.delivery_date,
        "items": data.items,
        "subtotal": data.subtotal,
        "gst_percent": data.gst_percent,
        "gst_amount": data.gst_amount,
        "total_amount": data.total_amount,
        "payment_terms": data.payment_terms,
        "delivery_terms": data.delivery_terms,
        "notes": data.notes,
        "status": "draft",  # draft, sent, confirmed, partial, received, cancelled
        "received_amount": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.purchase_orders_v2.insert_one(po)
    po.pop("_id", None)
    
    # Update request status if linked
    if data.purchase_request_id:
        await db.purchase_requests.update_one(
            {"id": data.purchase_request_id},
            {"$set": {"status": "ordered", "updated_at": datetime.now(timezone.utc)}}
        )
    
    return {"message": "Purchase order created", "order": po}


@router.post("/orders/from-quote/{quote_id}")
async def create_po_from_quote(quote_id: str):
    """Create a purchase order from a selected vendor quote"""
    quote = await db.vendor_quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get the purchase request
    pr = await db.purchase_requests.find_one({"id": quote["purchase_request_id"]}, {"_id": 0})
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Generate PO number linked to PID
    sales_order_id = pr.get("sales_order_id")
    po_no = await generate_po_number(sales_order_id)
    
    # Get linked PID
    linked_pid = None
    if sales_order_id:
        order = await db.sales_orders.find_one({"id": sales_order_id}, {"order_no": 1, "_id": 0})
        if order:
            linked_pid = order.get("order_no")
    
    # Build items from quote
    items = []
    for qi in quote.get("items", []):
        # Find matching request item
        req_item = next((ri for ri in pr.get("items", []) if ri["id"] == qi.get("item_id")), {})
        items.append({
            "description": req_item.get("description", ""),
            "quantity": req_item.get("quantity", 1),
            "unit": req_item.get("unit", "Nos"),
            "unit_price": qi.get("quoted_price", 0),
            "total": req_item.get("quantity", 1) * qi.get("quoted_price", 0)
        })
    
    subtotal = sum(i["total"] for i in items)
    gst_percent = 18
    gst_amount = subtotal * (gst_percent / 100)
    total_amount = subtotal + gst_amount
    
    po = {
        "id": str(uuid.uuid4()),
        "po_no": po_no,
        "linked_pid": linked_pid,
        "purchase_request_id": pr["id"],
        "sales_order_id": pr.get("sales_order_id"),
        "vendor_id": quote.get("vendor_id"),
        "vendor_name": quote["vendor_name"],
        "vendor_address": None,
        "vendor_gst": None,
        "vendor_contact": None,
        "vendor_phone": None,
        "vendor_email": None,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "delivery_date": None,
        "items": items,
        "subtotal": subtotal,
        "gst_percent": gst_percent,
        "gst_amount": gst_amount,
        "total_amount": total_amount,
        "payment_terms": quote.get("payment_terms"),
        "delivery_terms": None,
        "notes": None,
        "status": "draft",
        "received_amount": 0,
        "quote_id": quote_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.purchase_orders_v2.insert_one(po)
    po.pop("_id", None)
    
    # Update request status
    await db.purchase_requests.update_one(
        {"id": pr["id"]},
        {"$set": {"status": "ordered", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Mark quote as selected
    await db.vendor_quotes.update_many(
        {"purchase_request_id": pr["id"]},
        {"$set": {"selected": False}}
    )
    await db.vendor_quotes.update_one(
        {"id": quote_id},
        {"$set": {"selected": True}}
    )
    
    return {"message": "Purchase order created from quote", "order": po}


@router.put("/orders/{po_id}")
async def update_purchase_order(po_id: str, data: dict):
    """Update a purchase order"""
    update_data = {k: v for k, v in data.items() if v is not None and k not in ["id", "po_no", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.purchase_orders_v2.update_one(
        {"id": po_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    po = await db.purchase_orders_v2.find_one({"id": po_id}, {"_id": 0})
    return {"message": "Order updated", "order": po}


@router.put("/orders/{po_id}/status")
async def update_po_status(po_id: str, status: str):
    """Update purchase order status"""
    valid_statuses = ["draft", "sent", "confirmed", "partial", "received", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.purchase_orders_v2.update_one(
        {"id": po_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return {"message": "Status updated", "status": status}


@router.delete("/orders/{po_id}")
async def delete_purchase_order(po_id: str):
    """Delete a purchase order"""
    result = await db.purchase_orders_v2.delete_one({"id": po_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"message": "Order deleted"}


# ============== GRN ENDPOINTS ==============

@router.get("/grn")
async def get_grns(
    po_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all GRNs"""
    query = {}
    if po_id:
        query["purchase_order_id"] = po_id
    
    cursor = db.grn.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    grns = await cursor.to_list(length=limit)
    total = await db.grn.count_documents(query)
    
    return {"grns": grns, "total": total}


@router.post("/grn")
async def create_grn(data: GRNCreate):
    """Create a Goods Receipt Note"""
    # Verify PO exists
    po = await db.purchase_orders_v2.find_one({"id": data.purchase_order_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    grn_no = await generate_grn_number()
    
    # Calculate received totals
    total_received_value = 0
    for item in data.items:
        po_item = next((pi for pi in po.get("items", []) if pi.get("description") == item.get("description")), None)
        if po_item:
            item["unit_price"] = po_item.get("unit_price", 0)
            item["received_value"] = item.get("accepted_qty", 0) * po_item.get("unit_price", 0)
            total_received_value += item["received_value"]
    
    grn = {
        "id": str(uuid.uuid4()),
        "grn_no": grn_no,
        "purchase_order_id": data.purchase_order_id,
        "po_no": po.get("po_no"),
        "vendor_name": po.get("vendor_name"),
        "received_date": data.received_date,
        "received_by": data.received_by,
        "items": data.items,
        "total_received_value": total_received_value,
        "delivery_challan_no": data.delivery_challan_no,
        "vehicle_no": data.vehicle_no,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.grn.insert_one(grn)
    grn.pop("_id", None)
    
    # Update PO received amount and status
    current_received = po.get("received_amount", 0) + total_received_value
    new_status = po.get("status")
    
    if current_received >= po.get("total_amount", 0) * 0.95:  # 95% threshold
        new_status = "received"
    elif current_received > 0:
        new_status = "partial"
    
    await db.purchase_orders_v2.update_one(
        {"id": data.purchase_order_id},
        {"$set": {
            "received_amount": current_received,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "GRN created", "grn": grn}


@router.get("/grn/{grn_id}")
async def get_grn(grn_id: str):
    """Get GRN details"""
    grn = await db.grn.find_one({"id": grn_id}, {"_id": 0})
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    
    # Get PO details
    po = await db.purchase_orders_v2.find_one({"id": grn["purchase_order_id"]}, {"_id": 0})
    
    return {"grn": grn, "order": po}


@router.delete("/grn/{grn_id}")
async def delete_grn(grn_id: str):
    """Delete a GRN"""
    grn = await db.grn.find_one({"id": grn_id})
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    
    # Update PO received amount
    po = await db.purchase_orders_v2.find_one({"id": grn["purchase_order_id"]})
    if po:
        new_received = max(0, po.get("received_amount", 0) - grn.get("total_received_value", 0))
        new_status = "confirmed" if new_received == 0 else "partial"
        
        await db.purchase_orders_v2.update_one(
            {"id": grn["purchase_order_id"]},
            {"$set": {"received_amount": new_received, "status": new_status, "updated_at": datetime.now(timezone.utc)}}
        )
    
    await db.grn.delete_one({"id": grn_id})
    return {"message": "GRN deleted"}


# ============== DASHBOARD & ANALYTICS ==============

@router.get("/dashboard/stats")
async def get_purchase_dashboard_stats():
    """Get purchase module dashboard statistics"""
    # Purchase requests stats
    pr_total = await db.purchase_requests.count_documents({})
    pr_pending = await db.purchase_requests.count_documents({"status": "pending"})
    pr_quoted = await db.purchase_requests.count_documents({"status": "quoted"})
    pr_approved = await db.purchase_requests.count_documents({"status": "approved"})
    
    # Purchase orders stats
    po_total = await db.purchase_orders_v2.count_documents({})
    po_draft = await db.purchase_orders_v2.count_documents({"status": "draft"})
    po_confirmed = await db.purchase_orders_v2.count_documents({"status": "confirmed"})
    po_received = await db.purchase_orders_v2.count_documents({"status": "received"})
    
    # Total purchase value
    po_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "received": {"$sum": "$received_amount"}}}
    ]
    po_result = await db.purchase_orders_v2.aggregate(po_pipeline).to_list(1)
    total_po_value = po_result[0]["total"] if po_result else 0
    total_received_value = po_result[0]["received"] if po_result else 0
    
    # GRN stats
    grn_total = await db.grn.count_documents({})
    
    # Pending deliveries (POs confirmed but not fully received)
    pending_deliveries = await db.purchase_orders_v2.count_documents({
        "status": {"$in": ["sent", "confirmed", "partial"]}
    })
    
    return {
        "purchase_requests": {
            "total": pr_total,
            "pending": pr_pending,
            "quoted": pr_quoted,
            "approved": pr_approved
        },
        "purchase_orders": {
            "total": po_total,
            "draft": po_draft,
            "confirmed": po_confirmed,
            "received": po_received,
            "total_value": total_po_value,
            "received_value": total_received_value
        },
        "grn_count": grn_total,
        "pending_deliveries": pending_deliveries
    }


@router.get("/dashboard/savings")
async def get_purchase_savings():
    """Get purchase savings analysis - Budget vs Actual"""
    # Get all orders with lifecycle that have purchase budgets
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$match": {"purchase_budget": {"$exists": True, "$ne": None}}}
    ]
    
    lifecycles = await db.order_lifecycle.aggregate(pipeline).to_list(100)
    
    savings_details = []
    total_budget = 0
    total_actual = 0
    
    for lc in lifecycles:
        order_value = lc["order"].get("total_amount", 0)
        budget = lc.get("purchase_budget", {})
        
        if budget.get("type") == "percentage":
            purchase_budget = order_value * (budget.get("value", 0) / 100)
        else:
            purchase_budget = budget.get("value", 0)
        
        # Get actual purchase from POs
        po_result = await db.purchase_orders_v2.aggregate([
            {"$match": {"sales_order_id": lc["sales_order_id"], "status": {"$ne": "cancelled"}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]).to_list(1)
        actual_purchase = po_result[0]["total"] if po_result else 0
        
        savings = purchase_budget - actual_purchase
        savings_percent = (savings / purchase_budget * 100) if purchase_budget > 0 else 0
        
        total_budget += purchase_budget
        total_actual += actual_purchase
        
        savings_details.append({
            "order_no": lc["order"].get("order_no"),
            "customer": lc["order"].get("customer_name"),
            "order_value": order_value,
            "purchase_budget": purchase_budget,
            "actual_purchase": actual_purchase,
            "savings": savings,
            "savings_percent": round(savings_percent, 1)
        })
    
    total_savings = total_budget - total_actual
    savings_percent = (total_savings / total_budget * 100) if total_budget > 0 else 0
    
    return {
        "summary": {
            "total_budget": total_budget,
            "total_actual": total_actual,
            "total_savings": total_savings,
            "savings_percent": round(savings_percent, 1)
        },
        "details": savings_details
    }


@router.get("/vendors")
async def get_vendors_list():
    """Get list of vendors from existing data"""
    # Get vendors from vendors collection
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(500)
    
    # Also get unique vendors from purchase orders
    po_vendors = await db.purchase_orders_v2.distinct("vendor_name")
    
    # Merge
    vendor_names = set([v.get("name", v.get("vendor_name", "")) for v in vendors])
    vendor_names.update(po_vendors)
    
    return {"vendors": sorted([v for v in vendor_names if v])}
