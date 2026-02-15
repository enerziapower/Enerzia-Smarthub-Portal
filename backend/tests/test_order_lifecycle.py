"""
Order Lifecycle Management API Tests
Tests all endpoints for order lifecycle, expenses, and dashboard
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


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


@pytest.fixture(scope="module")
def test_order_id(api_client):
    """Get first available order ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
    if response.status_code == 200:
        orders = response.json().get("orders", [])
        if orders:
            return orders[0]["id"]
    pytest.skip("No orders available for testing")


# ============== ORDERS ENDPOINTS ==============

class TestOrdersEndpoints:
    """Test order listing and details endpoints"""
    
    def test_get_orders_list(self, api_client):
        """GET /orders - Returns list of orders with lifecycle data"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        assert data["total"] >= 0
        
        # Verify order structure if orders exist
        if data["orders"]:
            order = data["orders"][0]
            assert "id" in order
            assert "order_no" in order
            assert "customer_name" in order
            assert "total_amount" in order
            assert "financials" in order
            assert "lifecycle_status" in order
    
    def test_get_orders_with_search(self, api_client):
        """GET /orders?search= - Search filter works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=SO-25")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
    
    def test_get_orders_with_status_filter(self, api_client):
        """GET /orders?status= - Status filter works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?status=new")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
    
    def test_get_order_details(self, api_client, test_order_id):
        """GET /orders/{id} - Returns detailed order with lifecycle, expenses, financials"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "order" in data
        assert "financials" in data
        assert "expenses" in data
        
        # Verify financials structure
        financials = data["financials"]
        assert "order_value" in financials
        assert "purchase_target" in financials
        assert "purchase_actual" in financials
        assert "execution_target" in financials
        assert "execution_actual" in financials
        assert "actual_profit" in financials
        assert "profit_margin" in financials
    
    def test_get_nonexistent_order(self, api_client):
        """GET /orders/{id} - Returns 404 for nonexistent order"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders/{fake_id}")
        assert response.status_code == 404


# ============== LIFECYCLE ENDPOINTS ==============

class TestLifecycleEndpoints:
    """Test lifecycle configuration endpoints"""
    
    def test_create_lifecycle(self, api_client, test_order_id):
        """POST /orders/{id}/lifecycle - Creates lifecycle configuration"""
        lifecycle_data = {
            "sales_order_id": test_order_id,
            "purchase_budget": {"type": "percentage", "value": 40},
            "execution_budget": {"type": "percentage", "value": 25},
            "target_profit": {"type": "percentage", "value": 35},
            "payment_milestones": [
                {"id": "m1", "name": "Advance", "type": "percentage", "value": 30, "due_condition": "On Order Confirmation", "status": "pending"},
                {"id": "m2", "name": "On Delivery", "type": "percentage", "value": 50, "due_condition": "On Material Delivery", "status": "pending"},
                {"id": "m3", "name": "Final", "type": "percentage", "value": 20, "due_condition": "30 days from Invoice", "status": "pending"}
            ],
            "credit_period_days": 30,
            "project_type": "equipment_service",
            "estimated_delivery_date": "2026-03-15",
            "notes": "Test lifecycle configuration"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle",
            json=lifecycle_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "lifecycle" in data
        
        lifecycle = data["lifecycle"]
        assert lifecycle["purchase_budget"]["value"] == 40
        assert lifecycle["execution_budget"]["value"] == 25
        assert lifecycle["target_profit"]["value"] == 35
        assert len(lifecycle["payment_milestones"]) == 3
        assert lifecycle["credit_period_days"] == 30
    
    def test_create_lifecycle_with_value_type(self, api_client, test_order_id):
        """POST /orders/{id}/lifecycle - Creates lifecycle with value type budgets"""
        lifecycle_data = {
            "sales_order_id": test_order_id,
            "purchase_budget": {"type": "value", "value": 50000},
            "execution_budget": {"type": "value", "value": 25000},
            "target_profit": {"type": "value", "value": 40000},
            "payment_milestones": [
                {"id": "m1", "name": "Advance", "type": "value", "value": 35000, "due_condition": "On Order", "status": "pending"}
            ],
            "credit_period_days": 45
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle",
            json=lifecycle_data
        )
        assert response.status_code == 200
        
        data = response.json()
        lifecycle = data["lifecycle"]
        assert lifecycle["purchase_budget"]["type"] == "value"
        assert lifecycle["purchase_budget"]["value"] == 50000
    
    def test_update_lifecycle(self, api_client, test_order_id):
        """PUT /orders/{id}/lifecycle - Updates lifecycle configuration"""
        update_data = {
            "credit_period_days": 60,
            "notes": "Updated notes"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["lifecycle"]["credit_period_days"] == 60
        assert data["lifecycle"]["notes"] == "Updated notes"
    
    def test_update_lifecycle_status(self, api_client, test_order_id):
        """PUT /orders/{id}/lifecycle/status - Updates lifecycle status"""
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle/status?status=procurement"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "procurement"
    
    def test_update_lifecycle_status_all_valid(self, api_client, test_order_id):
        """PUT /orders/{id}/lifecycle/status - All valid statuses work"""
        valid_statuses = ["new", "procurement", "execution", "delivered", "invoiced", "paid", "closed"]
        
        for status in valid_statuses:
            response = api_client.put(
                f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle/status?status={status}"
            )
            assert response.status_code == 200
            assert response.json()["status"] == status
    
    def test_update_lifecycle_invalid_status(self, api_client, test_order_id):
        """PUT /orders/{id}/lifecycle/status - Invalid status returns 400"""
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle/status?status=invalid_status"
        )
        assert response.status_code == 400
    
    def test_update_lifecycle_nonexistent(self, api_client):
        """PUT /orders/{id}/lifecycle - Returns 404 for nonexistent lifecycle"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{fake_id}/lifecycle",
            json={"notes": "test"}
        )
        assert response.status_code == 404


# ============== EXPENSE ENDPOINTS ==============

class TestExpenseEndpoints:
    """Test expense management endpoints"""
    
    @pytest.fixture
    def created_expense_id(self, api_client, test_order_id):
        """Create an expense for testing"""
        expense_data = {
            "order_id": test_order_id,
            "category": "material_purchase",
            "description": "TEST_Expense for testing",
            "amount": 5000,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "vendor": "Test Vendor",
            "reference_no": "TEST-REF-001"
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/expenses", json=expense_data)
        if response.status_code == 200:
            return response.json()["expense"]["id"]
        return None
    
    def test_create_expense(self, api_client, test_order_id):
        """POST /expenses - Creates expense entry"""
        expense_data = {
            "order_id": test_order_id,
            "category": "labor",
            "description": "TEST_Labor cost for installation",
            "amount": 10000,
            "date": "2026-02-15",
            "vendor": "Labor Contractor",
            "reference_no": "LAB-001"
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/expenses", json=expense_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        assert expense["category"] == "labor"
        assert expense["amount"] == 10000
        assert expense["approved"] == False
    
    def test_create_expense_all_categories(self, api_client, test_order_id):
        """POST /expenses - All 7 expense categories work"""
        categories = [
            "material_purchase", "labor", "transport", 
            "site_expenses", "subcontractor", "equipment_rental", "misc"
        ]
        
        for category in categories:
            expense_data = {
                "order_id": test_order_id,
                "category": category,
                "description": f"TEST_{category} expense",
                "amount": 1000,
                "date": "2026-02-15"
            }
            
            response = api_client.post(f"{BASE_URL}/api/order-lifecycle/expenses", json=expense_data)
            assert response.status_code == 200
            assert response.json()["expense"]["category"] == category
    
    def test_get_expenses_list(self, api_client):
        """GET /expenses - Returns list of expenses"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert "expenses" in data
        assert "total" in data
        assert "total_amount" in data
        assert "approved_amount" in data
    
    def test_get_expenses_by_order(self, api_client, test_order_id):
        """GET /expenses?order_id= - Filter by order works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expenses?order_id={test_order_id}")
        assert response.status_code == 200
        
        data = response.json()
        for expense in data["expenses"]:
            assert expense["order_id"] == test_order_id
    
    def test_get_expenses_by_category(self, api_client):
        """GET /expenses?category= - Filter by category works"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expenses?category=labor")
        assert response.status_code == 200
        
        data = response.json()
        for expense in data["expenses"]:
            assert expense["category"] == "labor"
    
    def test_update_expense(self, api_client, created_expense_id):
        """PUT /expenses/{id} - Updates expense"""
        if not created_expense_id:
            pytest.skip("No expense created")
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/expenses/{created_expense_id}",
            json={"amount": 7500, "description": "Updated description"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["expense"]["amount"] == 7500
    
    def test_approve_expense(self, api_client, created_expense_id):
        """PUT /expenses/{id}/approve - Approves expense"""
        if not created_expense_id:
            pytest.skip("No expense created")
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/expenses/{created_expense_id}/approve?approved_by=admin"
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Expense approved"
    
    def test_delete_expense(self, api_client, test_order_id):
        """DELETE /expenses/{id} - Deletes expense"""
        # Create expense to delete
        expense_data = {
            "order_id": test_order_id,
            "category": "misc",
            "description": "TEST_To be deleted",
            "amount": 100,
            "date": "2026-02-15"
        }
        create_response = api_client.post(f"{BASE_URL}/api/order-lifecycle/expenses", json=expense_data)
        expense_id = create_response.json()["expense"]["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/order-lifecycle/expenses/{expense_id}")
        assert response.status_code == 200
        
        # Verify deleted - should not appear in list
        list_response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expenses")
        expense_ids = [e["id"] for e in list_response.json()["expenses"]]
        assert expense_id not in expense_ids
    
    def test_delete_nonexistent_expense(self, api_client):
        """DELETE /expenses/{id} - Returns 404 for nonexistent expense"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/order-lifecycle/expenses/{fake_id}")
        assert response.status_code == 404
    
    def test_create_expense_invalid_order(self, api_client):
        """POST /expenses - Returns 404 for invalid order_id"""
        expense_data = {
            "order_id": str(uuid.uuid4()),
            "category": "misc",
            "description": "Test",
            "amount": 100,
            "date": "2026-02-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/order-lifecycle/expenses", json=expense_data)
        assert response.status_code == 404


# ============== DASHBOARD ENDPOINTS ==============

class TestDashboardEndpoints:
    """Test dashboard and analytics endpoints"""
    
    def test_get_dashboard_stats(self, api_client):
        """GET /dashboard/stats - Returns dashboard statistics"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/dashboard/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_orders" in data
        assert "orders_by_status" in data
        assert "total_revenue" in data
        assert "total_purchase" in data
        assert "total_expenses" in data
        assert "total_profit" in data
        assert "profit_margin" in data
        assert "pending_payments" in data
        
        # Verify data types
        assert isinstance(data["total_orders"], int)
        assert isinstance(data["orders_by_status"], dict)
        assert isinstance(data["profit_margin"], (int, float))
    
    def test_get_profitability_report(self, api_client):
        """GET /dashboard/profitability - Returns order-wise profitability"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/dashboard/profitability")
        assert response.status_code == 200
        
        data = response.json()
        assert "profitability" in data
        assert isinstance(data["profitability"], list)
        
        if data["profitability"]:
            item = data["profitability"][0]
            assert "order_no" in item
            assert "order_value" in item
            assert "actual_profit" in item
            assert "profit_margin" in item
    
    def test_get_savings_report(self, api_client):
        """GET /dashboard/savings-report - Returns savings report"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/dashboard/savings-report")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "details" in data
        
        summary = data["summary"]
        assert "total_purchase_target" in summary
        assert "total_purchase_actual" in summary
        assert "total_purchase_savings" in summary
        assert "total_execution_target" in summary
        assert "total_execution_actual" in summary
        assert "grand_total_savings" in summary
    
    def test_get_payment_tracking(self, api_client):
        """GET /dashboard/payment-tracking - Returns payment tracking"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/dashboard/payment-tracking")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "pending_payments" in data
        assert "overdue_payments" in data
        
        summary = data["summary"]
        assert "total_pending" in summary
        assert "total_overdue" in summary
        assert "pending_count" in summary
        assert "overdue_count" in summary


# ============== REFERENCE DATA ENDPOINTS ==============

class TestReferenceDataEndpoints:
    """Test reference data endpoints"""
    
    def test_get_expense_categories(self, api_client):
        """GET /expense-categories - Returns expense categories"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expense-categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) == 7
        
        category_values = [c["value"] for c in data["categories"]]
        expected = ["material_purchase", "labor", "transport", "site_expenses", 
                   "subcontractor", "equipment_rental", "misc"]
        for exp in expected:
            assert exp in category_values
    
    def test_get_project_types(self, api_client):
        """GET /project-types - Returns project types"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/project-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "types" in data
        assert len(data["types"]) == 6
        
        type_values = [t["value"] for t in data["types"]]
        expected = ["amc", "equipment_service", "calibration", 
                   "transformer_testing", "ir_thermography", "custom"]
        for exp in expected:
            assert exp in type_values


# ============== PAYMENT MILESTONE ENDPOINTS ==============

class TestPaymentMilestoneEndpoints:
    """Test payment milestone update endpoint"""
    
    def test_update_payment_milestone(self, api_client, test_order_id):
        """PUT /orders/{id}/payment/{milestone_id} - Updates payment milestone"""
        # First ensure lifecycle exists with milestones
        lifecycle_data = {
            "sales_order_id": test_order_id,
            "purchase_budget": {"type": "percentage", "value": 40},
            "execution_budget": {"type": "percentage", "value": 25},
            "target_profit": {"type": "percentage", "value": 35},
            "payment_milestones": [
                {"id": "test-milestone-1", "name": "Advance", "type": "percentage", "value": 30, "due_condition": "On Order", "status": "pending"}
            ],
            "credit_period_days": 30
        }
        api_client.post(f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/lifecycle", json=lifecycle_data)
        
        # Update milestone
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/payment/test-milestone-1?status=paid&paid_amount=35000&paid_date=2026-02-15"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "milestones" in data
        
        # Find updated milestone
        updated = next((m for m in data["milestones"] if m["id"] == "test-milestone-1"), None)
        assert updated is not None
        assert updated["status"] == "paid"
        assert updated["paid_amount"] == 35000
    
    def test_update_nonexistent_milestone(self, api_client, test_order_id):
        """PUT /orders/{id}/payment/{milestone_id} - Returns 404 for nonexistent milestone"""
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{test_order_id}/payment/nonexistent-milestone?status=paid"
        )
        assert response.status_code == 404


# ============== CLEANUP ==============

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(api_client):
    """Cleanup TEST_ prefixed expenses after all tests"""
    yield
    # Cleanup test expenses
    response = api_client.get(f"{BASE_URL}/api/order-lifecycle/expenses")
    if response.status_code == 200:
        for expense in response.json().get("expenses", []):
            if expense.get("description", "").startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/order-lifecycle/expenses/{expense['id']}")
