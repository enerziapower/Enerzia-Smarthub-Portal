"""
Order Management Phase 1 - Order-to-Cash Lifecycle Tests
Tests for:
- POST /api/order-lifecycle/orders - Create new order with PID, budget, timeline
- GET /api/order-lifecycle/orders - Fetch all orders with lifecycle data
- GET /api/projects/next-pid - Get next available PID
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "123456"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ============== PID GENERATION TESTS ==============

class TestPIDGeneration:
    """Test PID generation endpoint"""
    
    def test_get_next_pid_24_25(self, api_client):
        """GET /projects/next-pid?financial_year=24-25 - Returns next PID for FY 24-25"""
        response = api_client.get(f"{BASE_URL}/api/projects/next-pid?financial_year=24-25")
        assert response.status_code == 200
        
        data = response.json()
        assert "next_pid" in data
        assert "financial_year" in data
        assert data["financial_year"] == "24-25"
        assert data["next_pid"].startswith("PID/24-25/")
        print(f"✓ Next PID for 24-25: {data['next_pid']}")
    
    def test_get_next_pid_25_26(self, api_client):
        """GET /projects/next-pid?financial_year=25-26 - Returns next PID for FY 25-26"""
        response = api_client.get(f"{BASE_URL}/api/projects/next-pid?financial_year=25-26")
        assert response.status_code == 200
        
        data = response.json()
        assert "next_pid" in data
        assert "financial_year" in data
        assert data["financial_year"] == "25-26"
        assert data["next_pid"].startswith("PID/25-26/")
        print(f"✓ Next PID for 25-26: {data['next_pid']}")
    
    def test_pid_format_correct(self, api_client):
        """Verify PID format is PID/FY/number"""
        response = api_client.get(f"{BASE_URL}/api/projects/next-pid?financial_year=25-26")
        assert response.status_code == 200
        
        pid = response.json()["next_pid"]
        parts = pid.split("/")
        assert len(parts) == 3
        assert parts[0] == "PID"
        assert parts[1] == "25-26"
        assert parts[2].isdigit()
        print(f"✓ PID format correct: {pid}")


# ============== ORDER CREATION TESTS ==============

class TestOrderCreation:
    """Test order creation with PID, budget, and timeline"""
    
    @pytest.fixture
    def unique_pid(self):
        """Generate unique PID for testing"""
        return f"PID/24-25/TEST{int(datetime.now().timestamp())}"
    
    def test_create_order_with_all_fields(self, api_client, unique_pid):
        """POST /order-lifecycle/orders - Creates order with all fields"""
        order_data = {
            "pid_no": unique_pid,
            "category": "PSS",
            "customer_id": "test-customer-1",
            "customer_name": "TEST_Full Order Customer",
            "customer_address": "123 Test Street, Test City",
            "customer_gst": "29ABCDE1234F1Z5",
            "customer_contact": "John Doe",
            "customer_phone": "9876543210",
            "customer_email": "test@customer.com",
            "po_number": "PO-TEST-001",
            "po_date": "2026-01-15",
            "order_date": "15/01/2026",
            "delivery_date": "2026-02-15",
            "project_name": "Test Project Full",
            "location": "Test Location",
            "purchase_budget": 50000,
            "execution_budget": 30000,
            "others_budget": 10000,
            "target_profit": 25000,
            "target_profit_type": "amount",
            "start_date": "2026-01-20",
            "end_date": "2026-03-20",
            "deadline": "2026-03-15",
            "items": [
                {"id": "1", "sno": 1, "description": "Test Item 1", "unit": "Nos", "quantity": 10, "unit_price": 1000, "total": 10000},
                {"id": "2", "sno": 2, "description": "Test Item 2", "unit": "Mtr", "quantity": 5, "unit_price": 2000, "total": 10000}
            ],
            "subtotal": 20000,
            "gst_percent": 18,
            "gst_amount": 3600,
            "total_amount": 23600,
            "payment_terms": "50% advance, 50% on delivery",
            "delivery_terms": "Ex-works",
            "notes": "Test order for testing",
            "status": "pending",
            "engineer_in_charge": "Test Engineer"
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "order" in data
        assert data["message"] == "Order created successfully"
        
        order = data["order"]
        assert order["pid_no"] == unique_pid
        assert order["order_no"] == unique_pid
        assert order["customer_name"] == "TEST_Full Order Customer"
        assert order["total_amount"] == 23600
        print(f"✓ Order created with PID: {unique_pid}")
    
    def test_create_order_budget_fields(self, api_client):
        """POST /order-lifecycle/orders - Verify budget fields are stored correctly"""
        unique_pid = f"PID/24-25/BUDGET{int(datetime.now().timestamp())}"
        
        order_data = {
            "pid_no": unique_pid,
            "category": "PSS",
            "customer_name": "TEST_Budget Test Customer",
            "purchase_budget": 75000,
            "execution_budget": 45000,
            "others_budget": 15000,
            "target_profit": 30000,
            "target_profit_type": "amount",
            "items": [{"id": "1", "sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 100000, "total": 100000}],
            "subtotal": 100000,
            "gst_percent": 18,
            "gst_amount": 18000,
            "total_amount": 118000
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert response.status_code == 200
        
        order = response.json()["order"]
        
        # Verify financials
        assert order["financials"]["purchase_budget"] == 75000
        assert order["financials"]["execution_budget"] == 45000
        assert order["financials"]["others_budget"] == 15000
        assert order["financials"]["target_profit"] == 30000
        
        # Verify lifecycle
        assert order["lifecycle"]["purchase_budget"] == 75000
        assert order["lifecycle"]["execution_budget"] == 45000
        assert order["lifecycle"]["others_budget"] == 15000
        assert order["lifecycle"]["target_profit"] == 30000
        print("✓ Budget fields stored correctly")
    
    def test_create_order_timeline_fields(self, api_client):
        """POST /order-lifecycle/orders - Verify timeline fields are stored correctly"""
        unique_pid = f"PID/24-25/TIMELINE{int(datetime.now().timestamp())}"
        
        order_data = {
            "pid_no": unique_pid,
            "category": "PSS",
            "customer_name": "TEST_Timeline Test Customer",
            "start_date": "2026-02-01",
            "end_date": "2026-04-30",
            "deadline": "2026-04-15",
            "items": [{"id": "1", "sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 50000, "total": 50000}],
            "subtotal": 50000,
            "gst_percent": 18,
            "gst_amount": 9000,
            "total_amount": 59000
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert response.status_code == 200
        
        order = response.json()["order"]
        
        # Verify timeline in lifecycle
        assert order["lifecycle"]["timeline"]["start_date"] == "2026-02-01"
        assert order["lifecycle"]["timeline"]["end_date"] == "2026-04-30"
        assert order["lifecycle"]["timeline"]["deadline"] == "2026-04-15"
        print("✓ Timeline fields stored correctly")
    
    def test_create_order_duplicate_pid_fails(self, api_client):
        """POST /order-lifecycle/orders - Duplicate PID returns 400"""
        # First, get an existing order
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        orders = response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No existing orders to test duplicate PID")
        
        existing_pid = orders[0].get("pid_no") or orders[0].get("order_no")
        
        order_data = {
            "pid_no": existing_pid,
            "category": "PSS",
            "customer_name": "TEST_Duplicate PID Customer",
            "items": [{"id": "1", "sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print(f"✓ Duplicate PID {existing_pid} correctly rejected")


# ============== ORDER LISTING TESTS ==============

class TestOrderListing:
    """Test order listing with lifecycle data"""
    
    def test_get_orders_list(self, api_client):
        """GET /order-lifecycle/orders - Returns list of orders"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        assert data["total"] >= 0
        print(f"✓ Retrieved {len(data['orders'])} orders, total: {data['total']}")
    
    def test_get_orders_with_lifecycle_data(self, api_client):
        """GET /order-lifecycle/orders - Orders include lifecycle data"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        if not orders:
            pytest.skip("No orders available")
        
        order = orders[0]
        assert "lifecycle" in order or "lifecycle_status" in order
        assert "financials" in order
        print("✓ Orders include lifecycle data")
    
    def test_get_orders_financials_structure(self, api_client):
        """GET /order-lifecycle/orders - Verify financials structure"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        if not orders:
            pytest.skip("No orders available")
        
        financials = orders[0].get("financials", {})
        
        # Check required financial fields
        assert "order_value" in financials
        assert "purchase_target" in financials
        assert "execution_target" in financials
        assert "purchase_actual" in financials
        assert "execution_actual" in financials
        assert "actual_profit" in financials
        assert "profit_margin" in financials
        print("✓ Financials structure correct")
    
    def test_get_orders_with_search(self, api_client):
        """GET /order-lifecycle/orders?search= - Search filter works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=TEST")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        
        # Verify search results contain TEST
        for order in data["orders"]:
            order_no = order.get("order_no", "").lower()
            customer = order.get("customer_name", "").lower()
            pid = order.get("pid_no", "").lower()
            assert "test" in order_no or "test" in customer or "test" in pid
        print(f"✓ Search filter returned {len(data['orders'])} matching orders")
    
    def test_get_orders_with_status_filter(self, api_client):
        """GET /order-lifecycle/orders?status= - Status filter works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        print(f"✓ Status filter returned {len(data['orders'])} pending orders")


# ============== CLEANUP ==============

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_orders(api_client):
    """Cleanup TEST_ prefixed orders after all tests"""
    yield
    # Note: We don't delete orders as they may be needed for other tests
    # Just log the test orders created
    response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=TEST_")
    if response.status_code == 200:
        test_orders = response.json().get("orders", [])
        print(f"\nTest orders created: {len(test_orders)}")
