"""
Zoho Books Integration Module
Two-way sync with Zoho Books to Smarthub ERP
- Customers (Read)
- Vendors (Read)
- Invoices (Read)
- Sales Orders (Read)
- Payments (Read)
- Estimates/Quotations (Full CRUD - Read, Create, Update, Delete)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from pathlib import Path
import httpx
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

from core.database import db
from core.security import get_current_user, require_auth

router = APIRouter(prefix="/zoho", tags=["Zoho Integration"])

# Zoho Configuration
ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET")
ZOHO_ORG_ID = os.environ.get("ZOHO_ORG_ID")
ZOHO_REGION = os.environ.get("ZOHO_REGION", "in")  # in, com, eu

print(f"Zoho Integration loaded: CLIENT_ID={ZOHO_CLIENT_ID[:20] if ZOHO_CLIENT_ID else 'None'}..., REGION={ZOHO_REGION}")

# Zoho API URLs based on region
ZOHO_AUTH_URLS = {
    "in": "https://accounts.zoho.in",
    "com": "https://accounts.zoho.com",
    "eu": "https://accounts.zoho.eu"
}

ZOHO_API_URLS = {
    "in": "https://www.zohoapis.in/books/v3",
    "com": "https://www.zohoapis.com/books/v3",
    "eu": "https://www.zohoapis.eu/books/v3"
}

def get_auth_url():
    return ZOHO_AUTH_URLS.get(ZOHO_REGION, ZOHO_AUTH_URLS["in"])

def get_api_url():
    return ZOHO_API_URLS.get(ZOHO_REGION, ZOHO_API_URLS["in"])


# ==================== TOKEN MANAGEMENT ====================

# Get the base URL for redirects
def get_redirect_uri():
    """Get the redirect URI for OAuth callback"""
    # Try to get from environment, fallback to preview URL
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://hub-network-erp.preview.emergentagent.com")
    return f"{base_url}/api/zoho/callback"

@router.get("/auth-url")
async def get_zoho_auth_url(current_user: dict = Depends(require_auth)):
    """Get the Zoho OAuth authorization URL"""
    if not ZOHO_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Zoho Client ID not configured")
    
    redirect_uri = get_redirect_uri()
    # Updated scope to include estimates (quotations) with full CRUD permissions
    scope = (
        "ZohoBooks.contacts.READ,"
        "ZohoBooks.invoices.READ,"
        "ZohoBooks.salesorders.READ,"
        "ZohoBooks.bills.READ,"
        "ZohoBooks.customerpayments.READ,"
        "ZohoBooks.estimates.READ,"
        "ZohoBooks.estimates.CREATE,"
        "ZohoBooks.estimates.UPDATE,"
        "ZohoBooks.estimates.DELETE"
    )
    
    auth_url = (
        f"{get_auth_url()}/oauth/v2/auth"
        f"?client_id={ZOHO_CLIENT_ID}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&redirect_uri={redirect_uri}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}


@router.get("/callback")
async def zoho_callback(code: str, location: str = "in", accounts_server: str = None):
    """Handle OAuth callback from Zoho and exchange code for tokens"""
    if not ZOHO_CLIENT_ID or not ZOHO_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Zoho credentials not configured")
    
    redirect_uri = get_redirect_uri()
    
    # Use the location from callback to determine correct auth URL
    # Zoho sends location=us, location=in, location=eu etc
    location_map = {
        "us": "com",
        "in": "in", 
        "eu": "eu",
        "au": "com.au",
        "jp": "jp"
    }
    actual_region = location_map.get(location, location)
    
    # Build auth URL based on actual location from callback
    if actual_region == "com":
        token_url = "https://accounts.zoho.com/oauth/v2/token"
    elif actual_region == "in":
        token_url = "https://accounts.zoho.in/oauth/v2/token"
    elif actual_region == "eu":
        token_url = "https://accounts.zoho.eu/oauth/v2/token"
    else:
        token_url = f"https://accounts.zoho.{actual_region}/oauth/v2/token"
    
    print(f"Using token URL: {token_url} (location={location}, actual_region={actual_region})")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "code": code,
                "client_id": ZOHO_CLIENT_ID,
                "client_secret": ZOHO_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        
        tokens = response.json()
        print(f"Zoho token response status: {response.status_code}")
        print(f"Zoho token response keys: {tokens.keys() if isinstance(tokens, dict) else 'not a dict'}")
        
        if response.status_code != 200 or "error" in tokens:
            error_msg = tokens.get("error", "Unknown error")
            print(f"Zoho OAuth error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Zoho OAuth error: {error_msg}")
        
        # Store tokens securely along with the actual region
        await db.zoho_tokens.update_one(
            {"type": "oauth"},
            {"$set": {
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
                "expires_in": tokens.get("expires_in"),
                "token_type": tokens.get("token_type"),
                "api_domain": tokens.get("api_domain"),
                "actual_region": actual_region,
                "updated_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        return {"message": "Zoho connected successfully", "status": "connected"}


async def get_valid_token():
    """Get a valid access token, refreshing if necessary"""
    token_doc = await db.zoho_tokens.find_one({"type": "oauth"}, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=401, detail="Zoho not connected. Please authorize first.")
    
    # Get the correct auth URL based on stored region
    actual_region = token_doc.get("actual_region", ZOHO_REGION)
    if actual_region == "com":
        auth_url = "https://accounts.zoho.com"
    elif actual_region == "in":
        auth_url = "https://accounts.zoho.in"
    elif actual_region == "eu":
        auth_url = "https://accounts.zoho.eu"
    else:
        auth_url = f"https://accounts.zoho.{actual_region}"
    
    # Try to refresh the token
    refresh_token = token_doc.get("refresh_token")
    if refresh_token:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{auth_url}/oauth/v2/token",
                    data={
                        "refresh_token": refresh_token,
                        "client_id": ZOHO_CLIENT_ID,
                        "client_secret": ZOHO_CLIENT_SECRET,
                        "grant_type": "refresh_token"
                    }
                )
                
                if response.status_code == 200:
                    new_tokens = response.json()
                    # Check if response contains error
                    if new_tokens.get("error"):
                        print(f"Token refresh returned error: {new_tokens}")
                        # Use existing access token instead
                        return token_doc.get("access_token"), token_doc.get("api_domain", get_api_url())
                    
                    if new_tokens.get("access_token"):
                        new_access_token = new_tokens.get("access_token")
                        await db.zoho_tokens.update_one(
                            {"type": "oauth"},
                            {"$set": {
                                "access_token": new_access_token,
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        return new_access_token, token_doc.get("api_domain", get_api_url())
                else:
                    print(f"Token refresh failed with status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Token refresh error: {e}")
    
    # Return existing access token if refresh didn't work
    return token_doc.get("access_token"), token_doc.get("api_domain", get_api_url())


# ==================== SYNC STATUS ====================

@router.get("/status")
async def get_zoho_status(current_user: dict = Depends(require_auth)):
    """Check Zoho connection status and last sync times"""
    token_doc = await db.zoho_tokens.find_one({"type": "oauth"}, {"_id": 0})
    sync_doc = await db.zoho_sync_log.find_one({"type": "summary"}, {"_id": 0})
    
    return {
        "connected": bool(token_doc and token_doc.get("access_token")),
        "last_token_update": token_doc.get("updated_at") if token_doc else None,
        "last_sync": sync_doc.get("last_sync") if sync_doc else None,
        "sync_counts": sync_doc.get("counts") if sync_doc else {},
        "zoho_org_id": ZOHO_ORG_ID,
        "zoho_region": ZOHO_REGION
    }


# ==================== SYNC ENDPOINTS ====================

@router.post("/sync/customers")
async def sync_customers(current_user: dict = Depends(require_auth)):
    """Sync customers from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    
    # Use /books/v3 path with the correct domain
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/contacts",
            params={"organization_id": ZOHO_ORG_ID, "contact_type": "customer"},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        contacts = data.get("contacts", [])
        
        synced = 0
        for contact in contacts:
            await db.zoho_customers.update_one(
                {"zoho_contact_id": contact.get("contact_id")},
                {"$set": {
                    "zoho_contact_id": contact.get("contact_id"),
                    "contact_name": contact.get("contact_name"),
                    "company_name": contact.get("company_name"),
                    "email": contact.get("email"),
                    "phone": contact.get("phone"),
                    "billing_address": contact.get("billing_address"),
                    "shipping_address": contact.get("shipping_address"),
                    "gst_no": contact.get("gst_no"),
                    "outstanding_receivable_amount": contact.get("outstanding_receivable_amount", 0),
                    "unused_credits_receivable_amount": contact.get("unused_credits_receivable_amount", 0),
                    "status": contact.get("status"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        # Update sync log
        await update_sync_log("customers", synced)
        
        return {"message": f"Synced {synced} customers from Zoho", "count": synced}


@router.post("/sync/vendors")
async def sync_vendors(current_user: dict = Depends(require_auth)):
    """Sync vendors from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/contacts",
            params={"organization_id": ZOHO_ORG_ID, "contact_type": "vendor"},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        contacts = data.get("contacts", [])
        
        synced = 0
        for contact in contacts:
            await db.zoho_vendors.update_one(
                {"zoho_contact_id": contact.get("contact_id")},
                {"$set": {
                    "zoho_contact_id": contact.get("contact_id"),
                    "contact_name": contact.get("contact_name"),
                    "company_name": contact.get("company_name"),
                    "email": contact.get("email"),
                    "phone": contact.get("phone"),
                    "billing_address": contact.get("billing_address"),
                    "gst_no": contact.get("gst_no"),
                    "outstanding_payable_amount": contact.get("outstanding_payable_amount", 0),
                    "status": contact.get("status"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        await update_sync_log("vendors", synced)
        
        return {"message": f"Synced {synced} vendors from Zoho", "count": synced}


@router.post("/sync/invoices")
async def sync_invoices(current_user: dict = Depends(require_auth)):
    """Sync invoices from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/invoices",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        synced = 0
        for invoice in invoices:
            await db.zoho_invoices.update_one(
                {"zoho_invoice_id": invoice.get("invoice_id")},
                {"$set": {
                    "zoho_invoice_id": invoice.get("invoice_id"),
                    "invoice_number": invoice.get("invoice_number"),
                    "customer_name": invoice.get("customer_name"),
                    "customer_id": invoice.get("customer_id"),
                    "status": invoice.get("status"),
                    "date": invoice.get("date"),
                    "due_date": invoice.get("due_date"),
                    "total": invoice.get("total", 0),
                    "balance": invoice.get("balance", 0),
                    "currency_code": invoice.get("currency_code"),
                    "reference_number": invoice.get("reference_number"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        await update_sync_log("invoices", synced)
        
        return {"message": f"Synced {synced} invoices from Zoho", "count": synced}


@router.post("/sync/salesorders")
async def sync_sales_orders(current_user: dict = Depends(require_auth)):
    """Sync sales orders from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/salesorders",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        orders = data.get("salesorders", [])
        
        synced = 0
        for order in orders:
            await db.zoho_salesorders.update_one(
                {"zoho_salesorder_id": order.get("salesorder_id")},
                {"$set": {
                    "zoho_salesorder_id": order.get("salesorder_id"),
                    "salesorder_number": order.get("salesorder_number"),
                    "customer_name": order.get("customer_name"),
                    "customer_id": order.get("customer_id"),
                    "status": order.get("status"),
                    "date": order.get("date"),
                    "delivery_date": order.get("delivery_date"),
                    "total": order.get("total", 0),
                    "reference_number": order.get("reference_number"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        await update_sync_log("salesorders", synced)
        
        return {"message": f"Synced {synced} sales orders from Zoho", "count": synced}


@router.post("/sync/payments")
async def sync_payments(current_user: dict = Depends(require_auth)):
    """Sync customer payments from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/customerpayments",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        payments = data.get("customerpayments", [])
        
        synced = 0
        for payment in payments:
            await db.zoho_payments.update_one(
                {"zoho_payment_id": payment.get("payment_id")},
                {"$set": {
                    "zoho_payment_id": payment.get("payment_id"),
                    "payment_number": payment.get("payment_number"),
                    "customer_name": payment.get("customer_name"),
                    "customer_id": payment.get("customer_id"),
                    "date": payment.get("date"),
                    "amount": payment.get("amount", 0),
                    "payment_mode": payment.get("payment_mode"),
                    "reference_number": payment.get("reference_number"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        await update_sync_log("payments", synced)
        
        return {"message": f"Synced {synced} payments from Zoho", "count": synced}


@router.post("/sync/all")
async def sync_all(current_user: dict = Depends(require_auth)):
    """Sync all data from Zoho Books"""
    results = {}
    
    try:
        customers = await sync_customers(current_user)
        results["customers"] = customers.get("count", 0)
    except Exception as e:
        results["customers_error"] = str(e)
    
    try:
        vendors = await sync_vendors(current_user)
        results["vendors"] = vendors.get("count", 0)
    except Exception as e:
        results["vendors_error"] = str(e)
    
    try:
        invoices = await sync_invoices(current_user)
        results["invoices"] = invoices.get("count", 0)
    except Exception as e:
        results["invoices_error"] = str(e)
    
    try:
        orders = await sync_sales_orders(current_user)
        results["salesorders"] = orders.get("count", 0)
    except Exception as e:
        results["salesorders_error"] = str(e)
    
    try:
        payments = await sync_payments(current_user)
        results["payments"] = payments.get("count", 0)
    except Exception as e:
        results["payments_error"] = str(e)
    
    try:
        estimates = await sync_estimates(current_user)
        results["estimates"] = estimates.get("count", 0)
    except Exception as e:
        results["estimates_error"] = str(e)
    
    return {"message": "Sync completed", "results": results}


# ==================== DATA RETRIEVAL ====================

@router.get("/customers")
async def get_zoho_customers(current_user: dict = Depends(require_auth)):
    """Get synced customers"""
    customers = await db.zoho_customers.find({}, {"_id": 0}).sort("contact_name", 1).to_list(1000)
    return {"customers": customers, "count": len(customers)}


@router.get("/vendors")
async def get_zoho_vendors(current_user: dict = Depends(require_auth)):
    """Get synced vendors"""
    vendors = await db.zoho_vendors.find({}, {"_id": 0}).to_list(500)
    return {"vendors": vendors, "count": len(vendors)}


@router.get("/invoices")
async def get_zoho_invoices(current_user: dict = Depends(require_auth)):
    """Get synced invoices"""
    invoices = await db.zoho_invoices.find({}, {"_id": 0}).to_list(500)
    return {"invoices": invoices, "count": len(invoices)}


@router.get("/salesorders")
async def get_zoho_salesorders(current_user: dict = Depends(require_auth)):
    """Get synced sales orders"""
    orders = await db.zoho_salesorders.find({}, {"_id": 0}).to_list(500)
    return {"salesorders": orders, "count": len(orders)}


@router.get("/payments")
async def get_zoho_payments(current_user: dict = Depends(require_auth)):
    """Get synced payments"""
    payments = await db.zoho_payments.find({}, {"_id": 0}).to_list(500)
    return {"payments": payments, "count": len(payments)}


# ==================== HELPER FUNCTIONS ====================

async def update_sync_log(sync_type: str, count: int):
    """Update the sync log with latest sync info"""
    await db.zoho_sync_log.update_one(
        {"type": "summary"},
        {
            "$set": {
                f"counts.{sync_type}": count,
                f"last_sync_{sync_type}": datetime.now(timezone.utc),
                "last_sync": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )



# ==================== ESTIMATES/QUOTATIONS - FULL CRUD ====================

class ZohoLineItem(BaseModel):
    """Line item for Zoho estimate"""
    item_id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    quantity: float = 1
    rate: float = 0
    unit: Optional[str] = ""
    tax_id: Optional[str] = None
    hsn_or_sac: Optional[str] = ""


class ZohoEstimateCreate(BaseModel):
    """Model for creating/updating Zoho estimate"""
    customer_id: str
    estimate_number: Optional[str] = None
    reference_number: Optional[str] = ""
    date: Optional[str] = None  # YYYY-MM-DD format
    expiry_date: Optional[str] = None
    line_items: List[ZohoLineItem] = []
    notes: Optional[str] = ""
    terms: Optional[str] = ""
    discount: Optional[float] = 0
    discount_type: Optional[str] = "entity_level"  # entity_level or item_level
    is_discount_before_tax: Optional[bool] = True
    subject: Optional[str] = ""
    salesperson_name: Optional[str] = ""
    custom_fields: Optional[List[dict]] = []


class ZohoEstimateUpdate(BaseModel):
    """Model for updating Zoho estimate"""
    customer_id: Optional[str] = None
    reference_number: Optional[str] = None
    date: Optional[str] = None
    expiry_date: Optional[str] = None
    line_items: Optional[List[ZohoLineItem]] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    discount: Optional[float] = None
    subject: Optional[str] = None
    salesperson_name: Optional[str] = None


@router.post("/sync/estimates")
async def sync_estimates(current_user: dict = Depends(require_auth)):
    """Sync estimates/quotations from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/estimates",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        estimates = data.get("estimates", [])
        
        synced = 0
        for estimate in estimates:
            await db.zoho_estimates.update_one(
                {"zoho_estimate_id": estimate.get("estimate_id")},
                {"$set": {
                    "zoho_estimate_id": estimate.get("estimate_id"),
                    "estimate_number": estimate.get("estimate_number"),
                    "reference_number": estimate.get("reference_number"),
                    "customer_id": estimate.get("customer_id"),
                    "customer_name": estimate.get("customer_name"),
                    "status": estimate.get("status"),
                    "date": estimate.get("date"),
                    "expiry_date": estimate.get("expiry_date"),
                    "total": estimate.get("total", 0),
                    "sub_total": estimate.get("sub_total", 0),
                    "tax_total": estimate.get("tax_total", 0),
                    "discount": estimate.get("discount", 0),
                    "currency_code": estimate.get("currency_code"),
                    "currency_symbol": estimate.get("currency_symbol"),
                    "created_time": estimate.get("created_time"),
                    "last_modified_time": estimate.get("last_modified_time"),
                    "synced_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            synced += 1
        
        await update_sync_log("estimates", synced)
        
        return {"message": f"Synced {synced} estimates from Zoho", "count": synced}


@router.get("/estimates")
async def get_zoho_estimates(current_user: dict = Depends(require_auth)):
    """Get synced estimates/quotations"""
    estimates = await db.zoho_estimates.find({}, {"_id": 0}).sort("date", -1).to_list(500)
    return {"estimates": estimates, "count": len(estimates)}


@router.get("/estimates/{estimate_id}")
async def get_zoho_estimate_detail(estimate_id: str, current_user: dict = Depends(require_auth)):
    """Get detailed estimate from Zoho Books (includes line items)"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/estimates/{estimate_id}",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        estimate = data.get("estimate", {})
        
        return {"estimate": estimate}


@router.post("/estimates")
async def create_zoho_estimate(estimate_data: ZohoEstimateCreate, current_user: dict = Depends(require_auth)):
    """Create a new estimate/quotation in Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    # Prepare line items
    line_items = []
    for item in estimate_data.line_items:
        line_item = {
            "name": item.name,
            "description": item.description or "",
            "quantity": item.quantity,
            "rate": item.rate
        }
        if item.item_id:
            line_item["item_id"] = item.item_id
        if item.unit:
            line_item["unit"] = item.unit
        if item.tax_id:
            line_item["tax_id"] = item.tax_id
        if item.hsn_or_sac:
            line_item["hsn_or_sac"] = item.hsn_or_sac
        line_items.append(line_item)
    
    # Build payload
    payload = {
        "customer_id": estimate_data.customer_id,
        "line_items": line_items
    }
    
    if estimate_data.estimate_number:
        payload["estimate_number"] = estimate_data.estimate_number
    if estimate_data.reference_number:
        payload["reference_number"] = estimate_data.reference_number
    if estimate_data.date:
        payload["date"] = estimate_data.date
    if estimate_data.expiry_date:
        payload["expiry_date"] = estimate_data.expiry_date
    if estimate_data.notes:
        payload["notes"] = estimate_data.notes
    if estimate_data.terms:
        payload["terms"] = estimate_data.terms
    if estimate_data.discount:
        payload["discount"] = estimate_data.discount
        payload["discount_type"] = estimate_data.discount_type
        payload["is_discount_before_tax"] = estimate_data.is_discount_before_tax
    if estimate_data.subject:
        payload["subject"] = estimate_data.subject
    if estimate_data.salesperson_name:
        payload["salesperson_name"] = estimate_data.salesperson_name
    if estimate_data.custom_fields:
        payload["custom_fields"] = estimate_data.custom_fields
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/estimates",
            params={"organization_id": ZOHO_ORG_ID},
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        if response.status_code not in [200, 201]:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        data = response.json()
        estimate = data.get("estimate", {})
        
        # Store in local DB
        await db.zoho_estimates.update_one(
            {"zoho_estimate_id": estimate.get("estimate_id")},
            {"$set": {
                "zoho_estimate_id": estimate.get("estimate_id"),
                "estimate_number": estimate.get("estimate_number"),
                "reference_number": estimate.get("reference_number"),
                "customer_id": estimate.get("customer_id"),
                "customer_name": estimate.get("customer_name"),
                "status": estimate.get("status"),
                "date": estimate.get("date"),
                "expiry_date": estimate.get("expiry_date"),
                "total": estimate.get("total", 0),
                "sub_total": estimate.get("sub_total", 0),
                "tax_total": estimate.get("tax_total", 0),
                "currency_code": estimate.get("currency_code"),
                "created_time": estimate.get("created_time"),
                "synced_at": datetime.now(timezone.utc),
                "created_from_erp": True
            }},
            upsert=True
        )
        
        return {"message": "Estimate created successfully", "estimate": estimate}


@router.put("/estimates/{estimate_id}")
async def update_zoho_estimate(estimate_id: str, estimate_data: ZohoEstimateUpdate, current_user: dict = Depends(require_auth)):
    """Update an existing estimate/quotation in Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    # Build payload with only non-null fields
    payload = {}
    
    if estimate_data.customer_id:
        payload["customer_id"] = estimate_data.customer_id
    if estimate_data.reference_number is not None:
        payload["reference_number"] = estimate_data.reference_number
    if estimate_data.date:
        payload["date"] = estimate_data.date
    if estimate_data.expiry_date:
        payload["expiry_date"] = estimate_data.expiry_date
    if estimate_data.notes is not None:
        payload["notes"] = estimate_data.notes
    if estimate_data.terms is not None:
        payload["terms"] = estimate_data.terms
    if estimate_data.discount is not None:
        payload["discount"] = estimate_data.discount
    if estimate_data.subject is not None:
        payload["subject"] = estimate_data.subject
    if estimate_data.salesperson_name is not None:
        payload["salesperson_name"] = estimate_data.salesperson_name
    
    if estimate_data.line_items is not None:
        line_items = []
        for item in estimate_data.line_items:
            line_item = {
                "name": item.name,
                "description": item.description or "",
                "quantity": item.quantity,
                "rate": item.rate
            }
            if item.item_id:
                line_item["item_id"] = item.item_id
            if item.unit:
                line_item["unit"] = item.unit
            if item.tax_id:
                line_item["tax_id"] = item.tax_id
            if item.hsn_or_sac:
                line_item["hsn_or_sac"] = item.hsn_or_sac
            line_items.append(line_item)
        payload["line_items"] = line_items
    
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{api_url}/estimates/{estimate_id}",
            params={"organization_id": ZOHO_ORG_ID},
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        data = response.json()
        estimate = data.get("estimate", {})
        
        # Update local DB
        await db.zoho_estimates.update_one(
            {"zoho_estimate_id": estimate_id},
            {"$set": {
                "estimate_number": estimate.get("estimate_number"),
                "reference_number": estimate.get("reference_number"),
                "customer_id": estimate.get("customer_id"),
                "customer_name": estimate.get("customer_name"),
                "status": estimate.get("status"),
                "date": estimate.get("date"),
                "expiry_date": estimate.get("expiry_date"),
                "total": estimate.get("total", 0),
                "sub_total": estimate.get("sub_total", 0),
                "tax_total": estimate.get("tax_total", 0),
                "last_modified_time": estimate.get("last_modified_time"),
                "synced_at": datetime.now(timezone.utc),
                "updated_from_erp": True
            }}
        )
        
        return {"message": "Estimate updated successfully", "estimate": estimate}


@router.delete("/estimates/{estimate_id}")
async def delete_zoho_estimate(estimate_id: str, current_user: dict = Depends(require_auth)):
    """Delete an estimate/quotation from Zoho Books"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{api_url}/estimates/{estimate_id}",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        # Remove from local DB
        await db.zoho_estimates.delete_one({"zoho_estimate_id": estimate_id})
        
        return {"message": "Estimate deleted successfully"}


@router.post("/estimates/{estimate_id}/send")
async def send_zoho_estimate(estimate_id: str, to_emails: List[str], current_user: dict = Depends(require_auth)):
    """Send estimate to customer via email through Zoho"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/estimates/{estimate_id}/email",
            params={"organization_id": ZOHO_ORG_ID},
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
                "Content-Type": "application/json"
            },
            json={"to_mail_ids": to_emails}
        )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        # Update status in local DB
        await db.zoho_estimates.update_one(
            {"zoho_estimate_id": estimate_id},
            {"$set": {"status": "sent", "synced_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Estimate sent successfully"}


@router.post("/estimates/{estimate_id}/mark-as-accepted")
async def mark_estimate_accepted(estimate_id: str, current_user: dict = Depends(require_auth)):
    """Mark estimate as accepted in Zoho"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/estimates/{estimate_id}/status/accepted",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        # Update local DB
        await db.zoho_estimates.update_one(
            {"zoho_estimate_id": estimate_id},
            {"$set": {"status": "accepted", "synced_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Estimate marked as accepted"}


@router.post("/estimates/{estimate_id}/mark-as-declined")
async def mark_estimate_declined(estimate_id: str, current_user: dict = Depends(require_auth)):
    """Mark estimate as declined in Zoho"""
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/estimates/{estimate_id}/status/declined",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            error_data = response.json()
            raise HTTPException(
                status_code=400, 
                detail=f"Zoho API error: {error_data.get('message', response.text)}"
            )
        
        # Update local DB
        await db.zoho_estimates.update_one(
            {"zoho_estimate_id": estimate_id},
            {"$set": {"status": "declined", "synced_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Estimate marked as declined"}


@router.post("/estimates/{estimate_id}/convert-to-order")
async def convert_estimate_to_erp_order(estimate_id: str, current_user: dict = Depends(require_auth)):
    """Convert a Zoho estimate to an ERP Sales Order for Order Lifecycle Management"""
    import uuid
    
    # First get the detailed estimate from Zoho
    access_token, api_domain = await get_valid_token()
    api_url = f"{api_domain}/books/v3"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/estimates/{estimate_id}",
            params={"organization_id": ZOHO_ORG_ID},
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
        
        data = response.json()
        estimate = data.get("estimate", {})
    
    # Check if already converted
    existing_order = await db.orders.find_one({"zoho_estimate_id": estimate_id})
    if existing_order:
        raise HTTPException(
            status_code=400, 
            detail=f"This estimate has already been converted to order {existing_order.get('order_number')}"
        )
    
    # Generate new order number
    current_year = datetime.now().year
    next_year = current_year + 1
    financial_year = f"{str(current_year)[-2:]}-{str(next_year)[-2:]}"
    
    # Get next sequence number
    last_order = await db.orders.find_one(
        {"order_number": {"$regex": f"^SO-{financial_year}"}},
        sort=[("created_at", -1)]
    )
    
    if last_order and last_order.get("order_number"):
        try:
            seq = int(last_order["order_number"].split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    
    order_number = f"SO-{financial_year}-{str(seq).zfill(4)}"
    
    # Map line items
    items = []
    for item in estimate.get("line_items", []):
        items.append({
            "description": item.get("name", ""),
            "hsn_sac": item.get("hsn_or_sac", ""),
            "unit": item.get("unit", "Nos"),
            "quantity": item.get("quantity", 1),
            "unit_price": item.get("rate", 0),
            "amount": item.get("item_total", 0)
        })
    
    # Create the ERP order
    # Safely extract contact person info
    contact_person_name = ""
    if estimate.get("contact_persons") and isinstance(estimate.get("contact_persons"), list):
        first_contact = estimate.get("contact_persons", [{}])[0]
        if isinstance(first_contact, dict):
            contact_person_name = first_contact.get("salutation", "") or first_contact.get("first_name", "")
    
    # Safely extract address info
    billing_addr = estimate.get("billing_address") or {}
    if isinstance(billing_addr, str):
        billing_addr = {"address": billing_addr}
    
    shipping_addr = estimate.get("shipping_address") or {}
    if isinstance(shipping_addr, str):
        shipping_addr = {"address": shipping_addr}
    
    new_order = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "customer_name": estimate.get("customer_name", ""),
        "customer_id": estimate.get("customer_id", ""),
        "zoho_customer_id": estimate.get("customer_id", ""),  # Store Zoho customer ID
        "contact_person": contact_person_name,
        "phone": billing_addr.get("phone", "") if isinstance(billing_addr, dict) else "",
        "email": estimate.get("email", ""),
        "gst_number": estimate.get("gst_no", "") or estimate.get("gst_treatment", ""),
        "billing_address": billing_addr.get("address", "") if isinstance(billing_addr, dict) else str(billing_addr),
        "shipping_address": shipping_addr.get("address", "") if isinstance(shipping_addr, dict) else str(shipping_addr),
        "order_date": estimate.get("date", datetime.now().strftime("%Y-%m-%d")),
        "expected_delivery_date": estimate.get("expiry_date", ""),
        "items": items,
        "sub_total": estimate.get("sub_total", 0),
        "gst_percent": 18,  # Default GST
        "gst_amount": estimate.get("tax_total", 0),
        "total_amount": estimate.get("total", 0),
        "payment_terms": estimate.get("terms", ""),
        "delivery_terms": "",
        "notes": estimate.get("notes", ""),
        "status": "confirmed",
        "category": "PSS",  # Default category
        "zoho_estimate_id": estimate_id,
        "zoho_estimate_number": estimate.get("estimate_number"),
        "source": "zoho_estimate",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id", ""),
        "created_by_name": current_user.get("name", "")
    }
    
    await db.orders.insert_one(new_order)
    
    # Update the estimate status in local DB
    await db.zoho_estimates.update_one(
        {"zoho_estimate_id": estimate_id},
        {"$set": {
            "converted_to_order": True,
            "erp_order_id": new_order["id"],
            "erp_order_number": order_number,
            "converted_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "message": "Estimate converted to Sales Order successfully",
        "order": {
            "id": new_order["id"],
            "order_number": order_number,
            "total_amount": new_order["total_amount"]
        }
    }



# ==================== CUSTOMER SYNC - ZOHO TO ERP ====================

@router.post("/sync/customers-to-erp")
async def sync_zoho_customers_to_erp(
    delete_existing: bool = True,
    current_user: dict = Depends(require_auth)
):
    """
    Sync all Zoho customers to ERP customers collection.
    This makes Zoho the single source of truth for customers.
    
    Args:
        delete_existing: If True, deletes all existing ERP customers first
    """
    import uuid
    
    # First sync latest customers from Zoho
    try:
        access_token, api_domain = await get_valid_token()
        api_url = f"{api_domain}/books/v3"
        
        async with httpx.AsyncClient() as client:
            # Fetch all customers from Zoho (paginated)
            all_contacts = []
            page = 1
            has_more = True
            
            while has_more:
                response = await client.get(
                    f"{api_url}/contacts",
                    params={
                        "organization_id": ZOHO_ORG_ID,
                        "contact_type": "customer",
                        "per_page": 200,
                        "page": page
                    },
                    headers={"Authorization": f"Zoho-oauthtoken {access_token}"}
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"Zoho API error: {response.text}")
                
                data = response.json()
                contacts = data.get("contacts", [])
                all_contacts.extend(contacts)
                
                # Check if there are more pages
                page_context = data.get("page_context", {})
                has_more = page_context.get("has_more_page", False)
                page += 1
                
                if page > 10:  # Safety limit
                    break
        
        print(f"Fetched {len(all_contacts)} customers from Zoho")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch Zoho customers: {str(e)}")
    
    # Delete existing ERP customers if requested
    deleted_count = 0
    if delete_existing:
        result = await db.customers.delete_many({})
        deleted_count = result.deleted_count
        print(f"Deleted {deleted_count} existing ERP customers")
    
    # Insert Zoho customers as ERP customers
    inserted_count = 0
    for contact in all_contacts:
        try:
            # Extract address info safely
            billing_addr = contact.get("billing_address") or {}
            if isinstance(billing_addr, str):
                billing_addr = {"address": billing_addr}
            
            shipping_addr = contact.get("shipping_address") or {}
            if isinstance(shipping_addr, str):
                shipping_addr = {"address": shipping_addr}
            
            # Build full address string
            billing_address_str = ""
            if isinstance(billing_addr, dict):
                parts = [
                    billing_addr.get("address", ""),
                    billing_addr.get("street2", ""),
                    billing_addr.get("city", ""),
                    billing_addr.get("state", ""),
                    billing_addr.get("zip", ""),
                    billing_addr.get("country", "")
                ]
                billing_address_str = ", ".join([p for p in parts if p])
            
            shipping_address_str = ""
            if isinstance(shipping_addr, dict):
                parts = [
                    shipping_addr.get("address", ""),
                    shipping_addr.get("street2", ""),
                    shipping_addr.get("city", ""),
                    shipping_addr.get("state", ""),
                    shipping_addr.get("zip", ""),
                    shipping_addr.get("country", "")
                ]
                shipping_address_str = ", ".join([p for p in parts if p])
            
            # Create ERP customer record
            erp_customer = {
                "id": str(uuid.uuid4()),
                "zoho_contact_id": contact.get("contact_id"),
                "name": contact.get("contact_name", ""),
                "company_name": contact.get("company_name", "") or contact.get("contact_name", ""),
                "email": contact.get("email", ""),
                "contact_number": contact.get("phone", "") or contact.get("mobile", ""),
                "gst_number": contact.get("gst_no", ""),
                "pan_number": contact.get("pan_no", ""),
                "billing_address": billing_address_str,
                "shipping_address": shipping_address_str,
                "city": billing_addr.get("city", "") if isinstance(billing_addr, dict) else "",
                "state": billing_addr.get("state", "") if isinstance(billing_addr, dict) else "",
                "country": billing_addr.get("country", "") if isinstance(billing_addr, dict) else "",
                "pincode": billing_addr.get("zip", "") if isinstance(billing_addr, dict) else "",
                "currency_code": contact.get("currency_code", "INR"),
                "payment_terms": contact.get("payment_terms", 0),
                "payment_terms_label": contact.get("payment_terms_label", ""),
                "outstanding_amount": contact.get("outstanding_receivable_amount", 0),
                "unused_credits": contact.get("unused_credits_receivable_amount", 0),
                "status": "active" if contact.get("status") == "active" else "inactive",
                "is_active": contact.get("status") == "active",
                "source": "zoho",
                "portal_access": False,
                "linked_amcs": [],
                "linked_projects": [],
                "document_access": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "synced_from_zoho_at": datetime.now(timezone.utc)
            }
            
            await db.customers.insert_one(erp_customer)
            inserted_count += 1
            
        except Exception as e:
            print(f"Error inserting customer {contact.get('contact_name')}: {e}")
            continue
    
    # Also update the zoho_customers collection
    for contact in all_contacts:
        await db.zoho_customers.update_one(
            {"zoho_contact_id": contact.get("contact_id")},
            {"$set": {
                "zoho_contact_id": contact.get("contact_id"),
                "contact_name": contact.get("contact_name"),
                "company_name": contact.get("company_name"),
                "email": contact.get("email"),
                "phone": contact.get("phone"),
                "gst_no": contact.get("gst_no"),
                "status": contact.get("status"),
                "billing_address": contact.get("billing_address"),
                "shipping_address": contact.get("shipping_address"),
                "outstanding_receivable_amount": contact.get("outstanding_receivable_amount", 0),
                "unused_credits_receivable_amount": contact.get("unused_credits_receivable_amount", 0),
                "synced_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
    
    return {
        "message": f"Synced {inserted_count} customers from Zoho to ERP",
        "deleted_existing": deleted_count,
        "inserted": inserted_count,
        "total_zoho_customers": len(all_contacts)
    }
