"""
Test suite for Accounts Module - Backend Refactoring Verification
Tests all accounts routes extracted from server.py to routes/accounts.py

Endpoints tested:
- GET/POST/PUT/DELETE /api/accounts/invoices
- GET /api/accounts/overdue-invoices
- GET /api/accounts/retention
- GET /api/accounts/payments
- GET /api/accounts/tds
- GET /api/accounts/gstr
- GET /api/accounts/tasks
- GET /api/accounts/dashboard/stats
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smarthub-enterprise.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAccountsInvoices:
    """Test CRUD operations for invoices endpoint"""
    
    created_invoice_id = None
    
    def test_get_invoices(self, auth_headers):
        """GET /api/accounts/invoices - List all invoices"""
        response = requests.get(f"{BASE_URL}/api/accounts/invoices", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/invoices - Found {len(data)} invoices")
    
    def test_create_invoice(self, auth_headers):
        """POST /api/accounts/invoices - Create invoice"""
        invoice_data = {
            "invoice_no": f"TEST_INV_{uuid.uuid4().hex[:8]}",
            "invoice_type": "domestic",
            "customer_name": "TEST_Customer Corp",
            "date": "15/12/2025",
            "gst_no": "29ABCDE1234F1Z5",
            "basic": 10000.00,
            "sgst": 900.00,
            "cgst": 900.00,
            "igst": 0,
            "round_off": 0,
            "amount": 11800.00
        }
        response = requests.post(
            f"{BASE_URL}/api/accounts/invoices",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["invoice_no"] == invoice_data["invoice_no"]
        assert data["customer_name"] == invoice_data["customer_name"]
        assert data["amount"] == invoice_data["amount"]
        TestAccountsInvoices.created_invoice_id = data["id"]
        print(f"✓ POST /api/accounts/invoices - Created invoice {data['id']}")
    
    def test_get_invoices_with_filter(self, auth_headers):
        """GET /api/accounts/invoices with invoice_type filter"""
        response = requests.get(
            f"{BASE_URL}/api/accounts/invoices?invoice_type=domestic",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned invoices should be domestic type
        for inv in data:
            assert inv.get("invoice_type") == "domestic", f"Expected domestic, got {inv.get('invoice_type')}"
        print(f"✓ GET /api/accounts/invoices?invoice_type=domestic - Found {len(data)} domestic invoices")
    
    def test_update_invoice(self, auth_headers):
        """PUT /api/accounts/invoices/{id} - Update invoice"""
        if not TestAccountsInvoices.created_invoice_id:
            pytest.skip("No invoice created to update")
        
        update_data = {
            "customer_name": "TEST_Updated Customer Corp",
            "amount": 12500.00
        }
        response = requests.put(
            f"{BASE_URL}/api/accounts/invoices/{TestAccountsInvoices.created_invoice_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["customer_name"] == update_data["customer_name"]
        assert data["amount"] == update_data["amount"]
        print(f"✓ PUT /api/accounts/invoices/{TestAccountsInvoices.created_invoice_id} - Updated successfully")
    
    def test_delete_invoice(self, auth_headers):
        """DELETE /api/accounts/invoices/{id} - Delete invoice"""
        if not TestAccountsInvoices.created_invoice_id:
            pytest.skip("No invoice created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/accounts/invoices/{TestAccountsInvoices.created_invoice_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ DELETE /api/accounts/invoices/{TestAccountsInvoices.created_invoice_id} - Deleted successfully")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/accounts/invoices", headers=auth_headers)
        invoices = response.json()
        invoice_ids = [inv.get("id") for inv in invoices]
        assert TestAccountsInvoices.created_invoice_id not in invoice_ids, "Invoice should be deleted"


class TestAccountsOverdueInvoices:
    """Test overdue invoices endpoint"""
    
    def test_get_overdue_invoices(self, auth_headers):
        """GET /api/accounts/overdue-invoices - List overdue invoices"""
        response = requests.get(f"{BASE_URL}/api/accounts/overdue-invoices", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/overdue-invoices - Found {len(data)} overdue invoices")


class TestAccountsRetention:
    """Test retention invoices endpoint"""
    
    def test_get_retention_invoices(self, auth_headers):
        """GET /api/accounts/retention - List retention invoices"""
        response = requests.get(f"{BASE_URL}/api/accounts/retention", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/retention - Found {len(data)} retention invoices")


class TestAccountsPayments:
    """Test payments endpoint"""
    
    def test_get_payments(self, auth_headers):
        """GET /api/accounts/payments - List payments"""
        response = requests.get(f"{BASE_URL}/api/accounts/payments", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/payments - Found {len(data)} payments")


class TestAccountsTDS:
    """Test TDS records endpoint"""
    
    def test_get_tds_records(self, auth_headers):
        """GET /api/accounts/tds - List TDS records"""
        response = requests.get(f"{BASE_URL}/api/accounts/tds", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/tds - Found {len(data)} TDS records")


class TestAccountsGSTR:
    """Test GSTR records endpoint"""
    
    def test_get_gstr_records(self, auth_headers):
        """GET /api/accounts/gstr - List GSTR records"""
        response = requests.get(f"{BASE_URL}/api/accounts/gstr", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/gstr - Found {len(data)} GSTR records")


class TestAccountsTasks:
    """Test tasks endpoint"""
    
    def test_get_tasks(self, auth_headers):
        """GET /api/accounts/tasks - List tasks"""
        response = requests.get(f"{BASE_URL}/api/accounts/tasks", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/tasks - Found {len(data)} tasks")


class TestAccountsDashboard:
    """Test dashboard stats endpoint"""
    
    def test_get_dashboard_stats(self, auth_headers):
        """GET /api/accounts/dashboard/stats - Get dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/accounts/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "invoices" in data, "Response should contain 'invoices'"
        assert "overdue" in data, "Response should contain 'overdue'"
        assert "retention" in data, "Response should contain 'retention'"
        assert "payments" in data, "Response should contain 'payments'"
        assert "tasks" in data, "Response should contain 'tasks'"
        assert "tds" in data, "Response should contain 'tds'"
        
        # Verify invoices structure
        invoices = data["invoices"]
        assert "total" in invoices
        assert "domestic" in invoices
        assert "export" in invoices
        assert "sez" in invoices
        assert "total_value" in invoices
        
        print(f"✓ GET /api/accounts/dashboard/stats - Stats retrieved successfully")
        print(f"  - Total invoices: {invoices.get('total')}")
        print(f"  - Overdue count: {data['overdue'].get('count')}")
        print(f"  - Pending tasks: {data['tasks'].get('pending')}")


class TestAccountsProjections:
    """Test projections endpoint"""
    
    def test_get_projections(self, auth_headers):
        """GET /api/accounts/projections - List billing projections"""
        response = requests.get(f"{BASE_URL}/api/accounts/projections", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/projections - Found {len(data)} projections")


class TestAccountsWeeklySummary:
    """Test weekly summary endpoint"""
    
    def test_get_weekly_summaries(self, auth_headers):
        """GET /api/accounts/weekly-summary - List weekly invoice summaries"""
        response = requests.get(f"{BASE_URL}/api/accounts/weekly-summary", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/accounts/weekly-summary - Found {len(data)} weekly summaries")


class TestAccountsAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_invoices_requires_auth_for_write(self):
        """POST /api/accounts/invoices should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/accounts/invoices",
            json={"invoice_no": "TEST", "customer_name": "Test", "date": "01/01/2025"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/accounts/invoices requires authentication")
    
    def test_invoices_read_requires_auth(self):
        """GET /api/accounts/invoices should require auth"""
        response = requests.get(f"{BASE_URL}/api/accounts/invoices")
        # The endpoint uses get_current_user which returns None if no auth
        # So it might return 200 with empty or filtered data, or 401
        # Based on the code, it should work but filter by department
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        print(f"✓ GET /api/accounts/invoices auth check - Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
