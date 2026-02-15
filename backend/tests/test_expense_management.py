"""
Test Suite for Expense Management Module (Phase 3)
- Expense CRUD operations
- Receipt/Bill upload functionality
- Approval workflow (Submit → Approve/Reject/Request Info)
- Bulk approve
- Dashboard stats and analytics
"""

import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_EXP_"


class TestExpenseManagementSetup:
    """Setup tests - verify API is accessible and get auth token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        """Get or create a test sales order for expense linking"""
        # First try to get existing orders
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        
        # If no orders, try sales orders
        response = api_client.get(f"{BASE_URL}/api/sales/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        
        pytest.skip("No sales orders available for testing")
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/expense-management/dashboard/stats")
        assert response.status_code == 200
        print(f"API Health: OK - Dashboard stats accessible")


class TestDashboardStats:
    """Test dashboard statistics endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_dashboard_stats(self, api_client):
        """Test GET /dashboard/stats returns all required fields"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/dashboard/stats")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields
        assert "total_expenses" in data
        assert "total_amount" in data
        assert "approved_amount" in data
        assert "pending_approval" in data
        assert "pending_amount" in data
        assert "by_status" in data
        assert "by_category" in data
        assert "this_month" in data
        
        # Verify this_month structure
        assert "count" in data["this_month"]
        assert "amount" in data["this_month"]
        
        print(f"Dashboard Stats: total_expenses={data['total_expenses']}, approved_amount={data['approved_amount']}")
    
    def test_get_categories(self, api_client):
        """Test GET /categories returns expense categories"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        # Verify category structure
        category = data["categories"][0]
        assert "value" in category
        assert "label" in category
        
        print(f"Categories: {len(data['categories'])} categories available")
    
    def test_get_payment_modes(self, api_client):
        """Test GET /payment-modes returns payment modes"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/payment-modes")
        assert response.status_code == 200
        
        data = response.json()
        assert "payment_modes" in data
        assert len(data["payment_modes"]) > 0
        
        print(f"Payment Modes: {len(data['payment_modes'])} modes available")


class TestExpenseCRUD:
    """Test expense CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        """Get a test sales order for expense linking"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        pytest.skip("No sales orders available for testing")
    
    @pytest.fixture(scope="class")
    def created_expense(self, api_client, test_order_id):
        """Create a test expense and return it"""
        expense_data = {
            "order_id": test_order_id,
            "category": "material_purchase",
            "description": f"{TEST_PREFIX}Test Material Purchase",
            "amount": 5000.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "vendor": "Test Vendor",
            "reference_no": "BILL-001",
            "payment_mode": "bank",
            "remarks": "Test expense for automated testing",
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        
        yield expense
        
        # Cleanup - delete the expense after tests
        api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense['id']}")
    
    def test_create_expense(self, api_client, test_order_id):
        """Test POST /expenses creates expense with expense_no"""
        expense_data = {
            "order_id": test_order_id,
            "category": "labor",
            "description": f"{TEST_PREFIX}Labor Cost for Installation",
            "amount": 3500.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "vendor": "Labor Contractor",
            "reference_no": "LAB-001",
            "payment_mode": "cash",
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        
        # Verify expense structure
        assert "id" in expense
        assert "expense_no" in expense
        assert expense["expense_no"].startswith("EXP-")
        assert expense["category"] == "labor"
        assert expense["amount"] == 3500.00
        assert expense["approval_status"] == "pending"
        assert expense["attachments"] == []
        
        print(f"Created expense: {expense['expense_no']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense['id']}")
    
    def test_get_expenses_list(self, api_client, created_expense):
        """Test GET /expenses returns list with totals"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert "expenses" in data
        assert "total" in data
        assert "total_amount" in data
        assert "approved_amount" in data
        assert "pending_amount" in data
        
        print(f"Expenses list: {data['total']} expenses, total_amount={data['total_amount']}")
    
    def test_get_expense_by_id(self, api_client, created_expense):
        """Test GET /expenses/{id} returns expense details"""
        expense_id = created_expense["id"]
        
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        
        assert expense["id"] == expense_id
        assert expense["expense_no"] == created_expense["expense_no"]
        
        print(f"Got expense details: {expense['expense_no']}")
    
    def test_get_expense_not_found(self, api_client):
        """Test GET /expenses/{id} returns 404 for non-existent expense"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses/non-existent-id")
        assert response.status_code == 404
    
    def test_update_expense(self, api_client, created_expense):
        """Test PUT /expenses/{id} updates expense"""
        expense_id = created_expense["id"]
        
        update_data = {
            "description": f"{TEST_PREFIX}Updated Description",
            "amount": 5500.00,
            "vendor": "Updated Vendor"
        }
        
        response = api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        
        assert expense["description"] == f"{TEST_PREFIX}Updated Description"
        assert expense["amount"] == 5500.00
        assert expense["vendor"] == "Updated Vendor"
        
        print(f"Updated expense: {expense['expense_no']}")
    
    def test_filter_expenses_by_status(self, api_client):
        """Test GET /expenses with status filter"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        assert "expenses" in data
        
        # All returned expenses should be pending
        for expense in data["expenses"]:
            assert expense["approval_status"] == "pending"
        
        print(f"Filtered by status=pending: {len(data['expenses'])} expenses")
    
    def test_filter_expenses_by_category(self, api_client):
        """Test GET /expenses with category filter"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses?category=material_purchase")
        assert response.status_code == 200
        
        data = response.json()
        assert "expenses" in data
        
        # All returned expenses should be material_purchase
        for expense in data["expenses"]:
            assert expense["category"] == "material_purchase"
        
        print(f"Filtered by category=material_purchase: {len(data['expenses'])} expenses")


class TestFileUpload:
    """Test file upload functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        api_client.headers.update({"Content-Type": "application/json"})
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        pytest.skip("No sales orders available for testing")
    
    @pytest.fixture(scope="class")
    def expense_for_upload(self, api_client, test_order_id):
        """Create expense for upload testing"""
        api_client.headers.update({"Content-Type": "application/json"})
        expense_data = {
            "order_id": test_order_id,
            "category": "transport",
            "description": f"{TEST_PREFIX}Transport Expense for Upload Test",
            "amount": 2000.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "upi",
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        assert response.status_code == 200
        
        expense = response.json()["expense"]
        yield expense
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense['id']}")
    
    def test_upload_receipt_jpg(self, api_client, expense_for_upload):
        """Test uploading JPG receipt"""
        expense_id = expense_for_upload["id"]
        
        # Create a simple test file
        file_content = b"fake jpg content for testing"
        files = {
            "file": ("test_receipt.jpg", io.BytesIO(file_content), "image/jpeg")
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "attachment" in data
        attachment = data["attachment"]
        
        assert "id" in attachment
        assert attachment["original_name"] == "test_receipt.jpg"
        assert attachment["type"] == "jpg"
        
        print(f"Uploaded JPG receipt: {attachment['original_name']}")
    
    def test_upload_receipt_pdf(self, api_client, expense_for_upload):
        """Test uploading PDF receipt"""
        expense_id = expense_for_upload["id"]
        
        file_content = b"%PDF-1.4 fake pdf content"
        files = {
            "file": ("invoice.pdf", io.BytesIO(file_content), "application/pdf")
        }
        
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["attachment"]["type"] == "pdf"
        
        print(f"Uploaded PDF receipt")
    
    def test_upload_invalid_file_type(self, api_client, expense_for_upload):
        """Test uploading invalid file type returns error"""
        expense_id = expense_for_upload["id"]
        
        file_content = b"fake exe content"
        files = {
            "file": ("malware.exe", io.BytesIO(file_content), "application/octet-stream")
        }
        
        headers = {"Authorization": api_client.headers.get("Authorization")}
        
        response = requests.post(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 400
        
        print("Invalid file type correctly rejected")
    
    def test_get_attachment(self, api_client, expense_for_upload):
        """Test downloading attachment"""
        expense_id = expense_for_upload["id"]
        
        # First get expense to find attachment ID
        api_client.headers.update({"Content-Type": "application/json"})
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
        assert response.status_code == 200
        
        expense = response.json()["expense"]
        if expense.get("attachments"):
            attachment_id = expense["attachments"][0]["id"]
            
            # Download attachment
            response = api_client.get(
                f"{BASE_URL}/api/expense-management/expenses/{expense_id}/attachments/{attachment_id}"
            )
            assert response.status_code == 200
            
            print(f"Downloaded attachment: {attachment_id}")
        else:
            print("No attachments to download")


class TestApprovalWorkflow:
    """Test approval workflow endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        pytest.skip("No sales orders available for testing")
    
    @pytest.fixture
    def expense_for_approval(self, api_client, test_order_id):
        """Create expense for approval testing"""
        expense_data = {
            "order_id": test_order_id,
            "category": "site_expenses",
            "description": f"{TEST_PREFIX}Site Expense for Approval Test",
            "amount": 1500.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "petty_cash",
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        assert response.status_code == 200
        
        expense = response.json()["expense"]
        yield expense
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense['id']}")
    
    def test_submit_for_approval(self, api_client, expense_for_approval):
        """Test PUT /expenses/{id}/submit changes status to submitted"""
        expense_id = expense_for_approval["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "expense" in data
        expense = data["expense"]
        
        assert expense["approval_status"] == "submitted"
        assert len(expense["approval_history"]) > 0
        assert expense["approval_history"][-1]["action"] == "submitted"
        
        print(f"Submitted expense: {expense['expense_no']}")
    
    def test_approval_queue(self, api_client, expense_for_approval):
        """Test GET /approval-queue returns submitted expenses"""
        # First submit the expense
        expense_id = expense_for_approval["id"]
        api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
        
        response = api_client.get(f"{BASE_URL}/api/expense-management/approval-queue")
        assert response.status_code == 200
        
        data = response.json()
        assert "expenses" in data
        assert "total" in data
        assert "total_amount" in data
        
        # All expenses in queue should be submitted
        for expense in data["expenses"]:
            assert expense["approval_status"] == "submitted"
        
        print(f"Approval queue: {data['total']} expenses, total_amount={data['total_amount']}")
    
    def test_approve_expense(self, api_client, expense_for_approval):
        """Test PUT /expenses/{id}/approve with action=approve"""
        expense_id = expense_for_approval["id"]
        
        # First submit
        api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
        
        # Then approve
        approval_data = {
            "action": "approve",
            "approved_by": "admin",
            "comments": "Approved for testing"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/approve",
            json=approval_data
        )
        assert response.status_code == 200
        
        data = response.json()
        expense = data["expense"]
        
        assert expense["approval_status"] == "approved"
        assert expense["approved_by"] == "admin"
        assert "approved_at" in expense
        
        # Check approval history
        history = expense["approval_history"]
        assert any(h["action"] == "approve" for h in history)
        
        print(f"Approved expense: {expense['expense_no']}")
    
    def test_reject_expense(self, api_client, test_order_id):
        """Test PUT /expenses/{id}/approve with action=reject"""
        # Create new expense for rejection test
        expense_data = {
            "order_id": test_order_id,
            "category": "misc",
            "description": f"{TEST_PREFIX}Expense for Rejection Test",
            "amount": 500.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        expense = response.json()["expense"]
        expense_id = expense["id"]
        
        try:
            # Submit
            api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
            
            # Reject
            rejection_data = {
                "action": "reject",
                "approved_by": "admin",
                "comments": "Rejected - insufficient documentation"
            }
            
            response = api_client.put(
                f"{BASE_URL}/api/expense-management/expenses/{expense_id}/approve",
                json=rejection_data
            )
            assert response.status_code == 200
            
            data = response.json()
            expense = data["expense"]
            
            assert expense["approval_status"] == "rejected"
            
            # Check rejection in history
            history = expense["approval_history"]
            reject_entry = next((h for h in history if h["action"] == "reject"), None)
            assert reject_entry is not None
            assert reject_entry["comments"] == "Rejected - insufficient documentation"
            
            print(f"Rejected expense: {expense['expense_no']}")
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
    
    def test_request_info(self, api_client, test_order_id):
        """Test PUT /expenses/{id}/approve with action=request_info"""
        # Create new expense
        expense_data = {
            "order_id": test_order_id,
            "category": "equipment_rental",
            "description": f"{TEST_PREFIX}Expense for Info Request Test",
            "amount": 8000.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        expense = response.json()["expense"]
        expense_id = expense["id"]
        
        try:
            # Submit
            api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
            
            # Request info
            info_request_data = {
                "action": "request_info",
                "approved_by": "admin",
                "comments": "Please provide vendor invoice"
            }
            
            response = api_client.put(
                f"{BASE_URL}/api/expense-management/expenses/{expense_id}/approve",
                json=info_request_data
            )
            assert response.status_code == 200
            
            data = response.json()
            expense = data["expense"]
            
            assert expense["approval_status"] == "info_requested"
            
            print(f"Info requested for expense: {expense['expense_no']}")
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
    
    def test_cannot_edit_approved_expense(self, api_client, test_order_id):
        """Test that approved expenses cannot be edited"""
        # Create and approve expense
        expense_data = {
            "order_id": test_order_id,
            "category": "travel",
            "description": f"{TEST_PREFIX}Approved Expense Edit Test",
            "amount": 3000.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        expense = response.json()["expense"]
        expense_id = expense["id"]
        
        try:
            # Submit and approve
            api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
            api_client.put(
                f"{BASE_URL}/api/expense-management/expenses/{expense_id}/approve",
                json={"action": "approve", "approved_by": "admin"}
            )
            
            # Try to edit
            update_data = {"amount": 5000.00}
            response = api_client.put(
                f"{BASE_URL}/api/expense-management/expenses/{expense_id}",
                json=update_data
            )
            assert response.status_code == 400
            
            print("Correctly prevented editing approved expense")
        finally:
            # Note: Cannot delete approved expense, but we'll try
            api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")


class TestBulkApprove:
    """Test bulk approval functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        pytest.skip("No sales orders available for testing")
    
    def test_bulk_approve(self, api_client, test_order_id):
        """Test POST /bulk-approve approves multiple expenses"""
        expense_ids = []
        
        try:
            # Create multiple expenses
            for i in range(3):
                expense_data = {
                    "order_id": test_order_id,
                    "category": "misc",
                    "description": f"{TEST_PREFIX}Bulk Approve Test {i+1}",
                    "amount": 1000.00 * (i + 1),
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "created_by": "admin"
                }
                
                response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
                expense = response.json()["expense"]
                expense_ids.append(expense["id"])
                
                # Submit each expense
                api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense['id']}/submit?submitted_by=admin")
            
            # Bulk approve
            bulk_data = {
                "expense_ids": expense_ids,
                "approved_by": "admin",
                "comments": "Bulk approved for testing"
            }
            
            response = api_client.post(
                f"{BASE_URL}/api/expense-management/bulk-approve",
                json=bulk_data
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["approved_count"] == 3
            
            # Verify all are approved
            for expense_id in expense_ids:
                response = api_client.get(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
                expense = response.json()["expense"]
                assert expense["approval_status"] == "approved"
            
            print(f"Bulk approved {data['approved_count']} expenses")
        finally:
            # Cleanup
            for expense_id in expense_ids:
                api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")


class TestDeleteExpense:
    """Test expense deletion"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_order_id(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders")
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                return orders[0]["id"]
        pytest.skip("No sales orders available for testing")
    
    def test_delete_pending_expense(self, api_client, test_order_id):
        """Test DELETE /expenses/{id} deletes pending expense"""
        # Create expense
        expense_data = {
            "order_id": test_order_id,
            "category": "subcontractor",
            "description": f"{TEST_PREFIX}Expense for Delete Test",
            "amount": 2500.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        expense = response.json()["expense"]
        expense_id = expense["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
        assert response.status_code == 200
        
        # Verify deleted
        response = api_client.get(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
        assert response.status_code == 404
        
        print("Successfully deleted pending expense")
    
    def test_cannot_delete_approved_expense(self, api_client, test_order_id):
        """Test DELETE /expenses/{id} fails for approved expense"""
        # Create and approve expense
        expense_data = {
            "order_id": test_order_id,
            "category": "labor",
            "description": f"{TEST_PREFIX}Approved Expense Delete Test",
            "amount": 4000.00,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_by": "admin"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expense-management/expenses", json=expense_data)
        expense = response.json()["expense"]
        expense_id = expense["id"]
        
        # Submit and approve
        api_client.put(f"{BASE_URL}/api/expense-management/expenses/{expense_id}/submit?submitted_by=admin")
        api_client.put(
            f"{BASE_URL}/api/expense-management/expenses/{expense_id}/approve",
            json={"action": "approve", "approved_by": "admin"}
        )
        
        # Try to delete
        response = api_client.delete(f"{BASE_URL}/api/expense-management/expenses/{expense_id}")
        assert response.status_code == 400
        
        print("Correctly prevented deleting approved expense")


class TestReports:
    """Test report endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_category_report(self, api_client):
        """Test GET /dashboard/category-report"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/dashboard/category-report")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert "total" in data
        
        print(f"Category report: {len(data['categories'])} categories, total={data['total']}")
    
    def test_vendor_report(self, api_client):
        """Test GET /dashboard/vendor-report"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/dashboard/vendor-report")
        assert response.status_code == 200
        
        data = response.json()
        assert "vendors" in data
        
        print(f"Vendor report: {len(data['vendors'])} vendors")
    
    def test_order_expenses_summary(self, api_client):
        """Test GET /dashboard/order-expenses"""
        response = api_client.get(f"{BASE_URL}/api/expense-management/dashboard/order-expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        
        print(f"Order expenses summary: {len(data['orders'])} orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
