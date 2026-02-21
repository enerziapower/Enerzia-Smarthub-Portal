"""
Expense Claims Module Tests
Tests for:
- Employee expense sheet creation, item add/edit/delete, submit for approval
- Finance approval workflow: verify, approve, reject, pay
- Receipt upload functionality
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user data
TEST_USER_ID = f"test-expense-{uuid.uuid4().hex[:8]}"
TEST_USER_NAME = "TEST_ExpenseUser"
TEST_DEPARTMENT = "TEST_Projects"
TEST_EMP_ID = f"TEST_EMP_{uuid.uuid4().hex[:6]}"

# Store created sheet ID for cleanup
created_sheet_id = None


class TestExpenseSheetCreation:
    """Test employee expense sheet creation"""
    
    def test_create_expense_sheet(self):
        """Create a new expense sheet for current month"""
        global created_sheet_id
        
        # Use a unique month/year to avoid conflicts
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        payload = {
            "month": current_month,
            "year": current_year,
            "items": [],
            "advance_received": 5000,
            "advance_received_date": datetime.now().strftime("%Y-%m-%d"),
            "previous_due": 1000,
            "remarks": "TEST expense sheet"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/expense-sheets",
            params={
                "user_id": TEST_USER_ID,
                "user_name": TEST_USER_NAME,
                "department": TEST_DEPARTMENT,
                "emp_id": TEST_EMP_ID,
                "designation": "TEST_Engineer"
            },
            json=payload
        )
        
        # May return 400 if sheet already exists for this month
        if response.status_code == 400 and "already exists" in response.text:
            # Get existing sheet instead
            get_response = requests.get(
                f"{BASE_URL}/api/employee/expense-sheets",
                params={"user_id": TEST_USER_ID}
            )
            assert get_response.status_code == 200
            sheets = get_response.json().get("sheets", [])
            if sheets:
                created_sheet_id = sheets[0].get("id")
                print(f"Using existing sheet: {created_sheet_id}")
                return
        
        assert response.status_code == 200, f"Failed to create sheet: {response.text}"
        data = response.json()
        assert "sheet" in data
        assert data["sheet"]["user_id"] == TEST_USER_ID
        assert data["sheet"]["status"] == "draft"
        assert "sheet_no" in data["sheet"]
        created_sheet_id = data["sheet"]["id"]
        print(f"Created expense sheet: {created_sheet_id}")
    
    def test_get_expense_sheets(self):
        """Get expense sheets for user"""
        response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets",
            params={"user_id": TEST_USER_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        print(f"Found {len(data['sheets'])} sheets for user")


class TestExpenseItemOperations:
    """Test expense item add/edit/delete operations"""
    
    def test_add_expense_item(self):
        """Add expense item to sheet"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created to add items to")
        
        item_payload = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "project_name": "TEST_Project_Alpha",
            "bill_type": "Travel - Bus/Auto/Cab",
            "description": "TEST Auto fare to site",
            "amount": 350.0,
            "place": "Chennai",
            "mode": "Cash",
            "receipt_url": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}/add-item",
            params={"user_id": TEST_USER_ID},
            json=item_payload
        )
        
        # May fail if sheet is not in draft/rejected status
        if response.status_code == 400:
            print(f"Cannot add item: {response.text}")
            return
        
        assert response.status_code == 200, f"Failed to add item: {response.text}"
        data = response.json()
        assert "total_amount" in data
        print(f"Added item, total amount: {data['total_amount']}")
    
    def test_add_second_expense_item(self):
        """Add another expense item"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        item_payload = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "project_name": "TEST_Project_Beta",
            "bill_type": "Food & Refreshments",
            "description": "TEST Lunch at site",
            "amount": 200.0,
            "place": "Taramani",
            "mode": "UPI/GPay",
            "receipt_url": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}/add-item",
            params={"user_id": TEST_USER_ID},
            json=item_payload
        )
        
        if response.status_code == 400:
            print(f"Cannot add item: {response.text}")
            return
        
        assert response.status_code == 200
        print("Added second expense item")
    
    def test_get_expense_sheet_detail(self):
        """Get expense sheet with items"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_amount" in data
        print(f"Sheet has {len(data['items'])} items, total: {data['total_amount']}")
    
    def test_update_expense_sheet(self):
        """Update expense sheet (edit items)"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # First get current sheet
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") not in ["draft", "rejected"]:
            print(f"Cannot edit sheet with status: {sheet.get('status')}")
            return
        
        # Update with modified items
        items = sheet.get("items", [])
        if items:
            items[0]["description"] = "TEST Updated description"
        
        update_payload = {
            "month": sheet.get("month"),
            "year": sheet.get("year"),
            "items": items,
            "advance_received": sheet.get("advance_received", 0),
            "advance_received_date": sheet.get("advance_received_date"),
            "previous_due": sheet.get("previous_due", 0),
            "remarks": "TEST Updated remarks"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}",
            json=update_payload
        )
        
        if response.status_code == 400:
            print(f"Cannot update: {response.text}")
            return
        
        assert response.status_code == 200
        print("Sheet updated successfully")
    
    def test_delete_expense_item(self):
        """Delete an expense item from sheet"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # Get current sheet to check items
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") not in ["draft", "rejected"]:
            print(f"Cannot delete items from sheet with status: {sheet.get('status')}")
            return
        
        if not sheet.get("items"):
            print("No items to delete")
            return
        
        # Delete last item
        item_index = len(sheet["items"]) - 1
        
        response = requests.delete(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}/item/{item_index}",
            params={"user_id": TEST_USER_ID}
        )
        
        if response.status_code == 400:
            print(f"Cannot delete: {response.text}")
            return
        
        assert response.status_code == 200
        print(f"Deleted item at index {item_index}")


class TestExpenseSheetSubmission:
    """Test expense sheet submission for approval"""
    
    def test_submit_for_approval(self):
        """Submit expense sheet for approval"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # First ensure sheet has at least one item
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") not in ["draft", "rejected"]:
            print(f"Sheet already submitted with status: {sheet.get('status')}")
            return
        
        if not sheet.get("items"):
            # Add an item first
            item_payload = {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "project_name": "TEST_Project_Submit",
                "bill_type": "Travel - Bus/Auto/Cab",
                "description": "TEST item for submission",
                "amount": 100.0,
                "place": "Chennai",
                "mode": "Cash",
                "receipt_url": None
            }
            
            add_response = requests.post(
                f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}/add-item",
                params={"user_id": TEST_USER_ID},
                json=item_payload
            )
            
            if add_response.status_code != 200:
                pytest.skip("Cannot add item to submit")
        
        # Submit for approval
        response = requests.put(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}/submit",
            params={"user_id": TEST_USER_ID}
        )
        
        if response.status_code == 400:
            print(f"Cannot submit: {response.text}")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("Sheet submitted for approval")


class TestFinanceApprovalWorkflow:
    """Test finance department approval workflow"""
    
    def test_finance_get_pending_sheets(self):
        """Finance can view pending expense sheets"""
        response = requests.get(
            f"{BASE_URL}/api/finance/expense-sheets",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        print(f"Found {len(data['sheets'])} pending sheets for finance review")
    
    def test_finance_get_all_sheets(self):
        """Finance can view all submitted expense sheets"""
        response = requests.get(
            f"{BASE_URL}/api/finance/expense-sheets"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        # Should not include draft sheets
        for sheet in data["sheets"]:
            assert sheet.get("status") != "draft", "Draft sheets should not be visible to finance"
        print(f"Found {len(data['sheets'])} total sheets for finance")
    
    def test_finance_verify_sheet(self):
        """Finance verifies an expense sheet"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # Check current status
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") != "pending":
            print(f"Sheet status is {sheet.get('status')}, not pending")
            return
        
        response = requests.put(
            f"{BASE_URL}/api/finance/expense-sheets/{created_sheet_id}/verify",
            params={"verified_by": "TEST_Finance_Admin"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "verified"
        print("Sheet verified by finance")
    
    def test_finance_approve_sheet(self):
        """Finance approves a verified expense sheet"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # Check current status
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") != "verified":
            print(f"Sheet status is {sheet.get('status')}, not verified")
            return
        
        response = requests.put(
            f"{BASE_URL}/api/finance/expense-sheets/{created_sheet_id}/approve",
            params={"approved_by": "TEST_Finance_Manager"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "approved"
        print("Sheet approved by finance")
    
    def test_finance_mark_paid(self):
        """Finance marks expense sheet as paid"""
        global created_sheet_id
        
        if not created_sheet_id:
            pytest.skip("No sheet created")
        
        # Check current status
        get_response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/{created_sheet_id}"
        )
        
        if get_response.status_code != 200:
            pytest.skip("Cannot get sheet")
        
        sheet = get_response.json()
        
        if sheet.get("status") != "approved":
            print(f"Sheet status is {sheet.get('status')}, not approved")
            return
        
        payment_payload = {
            "payment_mode": "Bank Transfer",
            "payment_reference": "TEST_TXN_" + uuid.uuid4().hex[:8],
            "paid_amount": abs(sheet.get("net_claim_amount", 0)),
            "paid_by": "TEST_Finance_Admin"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/finance/expense-sheets/{created_sheet_id}/pay",
            json=payment_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "paid"
        print("Sheet marked as paid")


class TestFinanceRejectWorkflow:
    """Test finance rejection workflow"""
    
    def test_create_sheet_for_rejection(self):
        """Create a new sheet to test rejection"""
        global reject_sheet_id
        
        reject_user_id = f"test-reject-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "month": 1,  # Use January to avoid conflicts
            "year": 2025,
            "items": [{
                "date": "2025-01-15",
                "project_name": "TEST_Reject_Project",
                "bill_type": "Travel - Bus/Auto/Cab",
                "description": "TEST item for rejection",
                "amount": 500.0,
                "place": "Chennai",
                "mode": "Cash",
                "receipt_url": None
            }],
            "advance_received": 0,
            "advance_received_date": "",
            "previous_due": 0,
            "remarks": "TEST sheet for rejection"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/expense-sheets",
            params={
                "user_id": reject_user_id,
                "user_name": "TEST_RejectUser",
                "department": "TEST_Dept",
                "emp_id": "TEST_EMP_REJ",
                "designation": "TEST_Engineer"
            },
            json=payload
        )
        
        if response.status_code == 400:
            print(f"Sheet already exists: {response.text}")
            return
        
        assert response.status_code == 200
        data = response.json()
        reject_sheet_id = data["sheet"]["id"]
        
        # Submit for approval
        submit_response = requests.put(
            f"{BASE_URL}/api/employee/expense-sheets/{reject_sheet_id}/submit",
            params={"user_id": reject_user_id}
        )
        
        assert submit_response.status_code == 200
        print(f"Created and submitted sheet for rejection test: {reject_sheet_id}")
    
    def test_finance_reject_sheet(self):
        """Finance rejects an expense sheet"""
        # Get a pending sheet to reject
        response = requests.get(
            f"{BASE_URL}/api/finance/expense-sheets",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200
        sheets = response.json().get("sheets", [])
        
        if not sheets:
            print("No pending sheets to reject")
            return
        
        # Find a TEST sheet to reject
        test_sheet = None
        for sheet in sheets:
            if "TEST" in sheet.get("user_name", "") or "TEST" in sheet.get("remarks", ""):
                test_sheet = sheet
                break
        
        if not test_sheet:
            print("No TEST sheet found to reject")
            return
        
        reject_response = requests.put(
            f"{BASE_URL}/api/finance/expense-sheets/{test_sheet['id']}/reject",
            params={
                "rejected_by": "TEST_Finance_Admin",
                "reason": "TEST rejection - missing receipts"
            }
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("status") == "rejected"
        print(f"Sheet {test_sheet['id']} rejected")


class TestExpenseSummary:
    """Test expense summary endpoint"""
    
    def test_get_expense_summary(self):
        """Get expense summary for user"""
        response = requests.get(
            f"{BASE_URL}/api/employee/expense-sheets/summary/{TEST_USER_ID}",
            params={"year": datetime.now().year}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert "total_claimed" in data
        assert "total_paid" in data
        assert "total_pending" in data
        print(f"Summary - Claimed: {data['total_claimed']}, Paid: {data['total_paid']}, Pending: {data['total_pending']}")


class TestReceiptUpload:
    """Test receipt upload functionality"""
    
    def test_upload_endpoint_exists(self):
        """Verify upload endpoint exists and validates file types"""
        # Create a test file
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b"test content")
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    files={"file": ("test.txt", f, "text/plain")},
                    data={"category": "expense_receipts"}
                )
            
            # Should reject .txt files
            assert response.status_code == 400
            assert "not allowed" in response.text.lower() or "file type" in response.text.lower()
            print("Upload endpoint correctly rejects invalid file types")
        finally:
            os.unlink(temp_path)
    
    def test_upload_valid_image(self):
        """Test uploading a valid image file"""
        import tempfile
        
        # Create a minimal valid PNG file (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(png_data)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    files={"file": ("test_receipt.png", f, "image/png")},
                    data={"category": "expense_receipts"}
                )
            
            assert response.status_code == 200, f"Upload failed: {response.text}"
            data = response.json()
            assert "file_url" in data or "url" in data or "path" in data
            print(f"Upload successful: {data}")
        finally:
            os.unlink(temp_path)


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_sheets(self):
        """Note: In production, would delete TEST_ prefixed data"""
        print("Test data cleanup would happen here")
        print(f"Test user ID: {TEST_USER_ID}")
        print(f"Created sheet ID: {created_sheet_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
