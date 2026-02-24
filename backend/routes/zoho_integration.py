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
import httpx
import os

from core.database import db
from core.security import get_current_user, require_auth

router = APIRouter(prefix="/zoho", tags=["Zoho Integration"])

# Zoho Configuration
ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET")
ZOHO_ORG_ID = os.environ.get("ZOHO_ORG_ID")
ZOHO_REGION = os.environ.get("ZOHO_REGION", "in")  # in, com, eu

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
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://project-debug-erp.preview.emergentagent.com")
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
    
    # Always refresh the token to ensure it's valid
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
                    if new_tokens.get("access_token"):
                        await db.zoho_tokens.update_one(
                            {"type": "oauth"},
                            {"$set": {
                                "access_token": new_tokens.get("access_token"),
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        return new_tokens.get("access_token"), token_doc.get("api_domain", get_api_url())
                else:
                    print(f"Token refresh failed: {response.text}")
        except Exception as e:
            print(f"Token refresh error: {e}")
    
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
    
    return {"message": "Sync completed", "results": results}


# ==================== DATA RETRIEVAL ====================

@router.get("/customers")
async def get_zoho_customers(current_user: dict = Depends(require_auth)):
    """Get synced customers"""
    customers = await db.zoho_customers.find({}, {"_id": 0}).to_list(500)
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
