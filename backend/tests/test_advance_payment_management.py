"""
Test Advance Payment Management Feature
Tests for:
- Employee advance balance viewing
- Employee advance request creation
- Employee advance request withdrawal
- Finance advance request approval/rejection
- Finance advance payment recording
- Finance direct advance payment
- Running balance calculation
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user IDs
TEST_USER_ID = f"TEST_advance_user_{uuid.uuid4().hex[:8]}"
TEST_USER_NAME = "TEST Advance User"
TEST_DEPARTMENT = "Engineering"
TEST_EMP_ID = f"TEST_EMP_{uuid.uuid4().hex[:6]}"

# Store created request IDs for cleanup
created_request_ids = []


class TestEmployeeAdvanceBalance:
    """Test employee advance balance endpoints"""
    
    def test_get_advance_balance_new_user(self):
        """Test getting advance balance for a user with no history"""
        response = requests.get(f"{BASE_URL}/api/employee/advance-balance/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["user_id"] == TEST_USER_ID
        assert data["running_balance"] == 0
        assert data["total_advances_received"] == 0
        assert data["total_advance_used"] == 0
        assert data["pending_requests_count"] == 0
        assert "advance_history" in data
        assert "recent_transactions" in data
    
    def test_get_advance_balance_existing_user(self):
        """Test getting advance balance for user with existing data"""
        # Use the test employee from main agent's curl tests
        response = requests.get(f"{BASE_URL}/api/employee/advance-balance/67ad0eb2d60d45ca2c4d8555")
        assert response.status_code == 200
        
        data = response.json()
        assert "running_balance" in data
        assert "total_advances_received" in data
        assert "total_advance_used" in data


class TestEmployeeAdvanceRequests:
    """Test employee advance request creation and management"""
    
    def test_create_advance_request(self):
        """Test creating a new advance request"""
        payload = {
            "amount": 3000.0,
            "purpose": "TEST Site visit expenses",
            "project_name": "TEST Project Alpha",
            "remarks": "Urgent requirement for testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/advance-requests",
            params={
                "user_id": TEST_USER_ID,
                "user_name": TEST_USER_NAME,
                "department": TEST_DEPARTMENT,
                "emp_id": TEST_EMP_ID
            },
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        assert data["request"]["amount"] == 3000.0
        assert data["request"]["purpose"] == "TEST Site visit expenses"
        
        # Store for cleanup
        created_request_ids.append(data["request"]["id"])
    
    def test_get_employee_advance_requests(self):
        """Test getting advance requests for an employee"""
        response = requests.get(
            f"{BASE_URL}/api/employee/advance-requests",
            params={"user_id": TEST_USER_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert len(data["requests"]) >= 1
        
        # Verify the created request is in the list
        request_ids = [r["id"] for r in data["requests"]]
        assert created_request_ids[0] in request_ids
    
    def test_create_second_advance_request(self):
        """Test creating another advance request"""
        payload = {
            "amount": 2000.0,
            "purpose": "TEST Material purchase",
            "project_name": "TEST Project Beta",
            "remarks": "For withdrawal test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/advance-requests",
            params={
                "user_id": TEST_USER_ID,
                "user_name": TEST_USER_NAME,
                "department": TEST_DEPARTMENT,
                "emp_id": TEST_EMP_ID
            },
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["request"]["status"] == "pending"
        created_request_ids.append(data["request"]["id"])
    
    def test_withdraw_advance_request(self):
        """Test withdrawing a pending advance request"""
        # Withdraw the second request
        request_id = created_request_ids[1]
        
        response = requests.delete(
            f"{BASE_URL}/api/employee/advance-requests/{request_id}",
            params={"user_id": TEST_USER_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "withdrawn" in data["message"].lower() or "deleted" in data["message"].lower()
    
    def test_verify_balance_shows_pending_request(self):
        """Test that pending requests are reflected in balance"""
        response = requests.get(f"{BASE_URL}/api/employee/advance-balance/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        # Should have 1 pending request (first one, second was withdrawn)
        assert data["pending_requests_count"] >= 1
        assert data["pending_requests_amount"] >= 3000.0


class TestFinanceAdvanceRequests:
    """Test finance advance request management"""
    
    def test_get_all_advance_requests(self):
        """Test getting all advance requests for finance review"""
        response = requests.get(f"{BASE_URL}/api/finance/advance-requests")
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "stats" in data
        assert "pending_count" in data["stats"]
        assert "pending_amount" in data["stats"]
        assert "approved_count" in data["stats"]
        assert "paid_count" in data["stats"]
    
    def test_get_advance_requests_filtered_by_status(self):
        """Test filtering advance requests by status"""
        response = requests.get(
            f"{BASE_URL}/api/finance/advance-requests",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned requests should be pending
        for req in data["requests"]:
            assert req["status"] == "pending"
    
    def test_approve_advance_request(self):
        """Test approving an advance request"""
        request_id = created_request_ids[0]
        
        response = requests.put(
            f"{BASE_URL}/api/finance/advance-requests/{request_id}/approve",
            params={"approved_by": "TEST Finance Admin"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert "approved" in data["message"].lower()
    
    def test_verify_request_status_after_approval(self):
        """Verify the request status changed to approved"""
        response = requests.get(f"{BASE_URL}/api/finance/advance-requests")
        assert response.status_code == 200
        
        data = response.json()
        request = next((r for r in data["requests"] if r["id"] == created_request_ids[0]), None)
        assert request is not None
        assert request["status"] == "approved"
        assert request["approved_by"] == "TEST Finance Admin"


class TestFinanceAdvancePayment:
    """Test finance advance payment recording"""
    
    def test_record_advance_payment(self):
        """Test recording payment for an approved advance"""
        request_id = created_request_ids[0]
        
        payload = {
            "paid_amount": 3000.0,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "Bank Transfer",
            "payment_reference": "TEST_TXN_123456",
            "remarks": "Test payment"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/finance/advance-requests/{request_id}/pay",
            params={"paid_by": "TEST Finance Admin"},
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paid"
        assert "payment recorded" in data["message"].lower()
    
    def test_verify_payment_recorded(self):
        """Verify payment details were recorded"""
        response = requests.get(f"{BASE_URL}/api/finance/advance-requests")
        assert response.status_code == 200
        
        data = response.json()
        request = next((r for r in data["requests"] if r["id"] == created_request_ids[0]), None)
        assert request is not None
        assert request["status"] == "paid"
        assert request["paid_amount"] == 3000.0
        assert request["payment_mode"] == "Bank Transfer"
        assert request["payment_reference"] == "TEST_TXN_123456"
    
    def test_verify_employee_balance_updated(self):
        """Verify employee's advance balance was updated after payment"""
        response = requests.get(f"{BASE_URL}/api/employee/advance-balance/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        # Balance should now include the paid advance
        assert data["total_advances_received"] >= 3000.0
        assert data["running_balance"] >= 3000.0


class TestFinanceDirectAdvance:
    """Test direct advance payment without prior request"""
    
    def test_record_direct_advance(self):
        """Test recording a direct advance payment"""
        direct_user_id = f"TEST_direct_user_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "user_id": direct_user_id,
            "user_name": "TEST Direct Advance User",
            "emp_id": f"TEST_EMP_DIRECT_{uuid.uuid4().hex[:6]}",
            "department": "Operations",
            "amount": 5000.0,
            "purpose": "TEST Urgent site requirement",
            "project_name": "TEST Emergency Project",
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "Cash",
            "payment_reference": "CASH_DIRECT_001",
            "remarks": "Direct payment for testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/finance/advances/direct",
            params={"paid_by": "TEST Finance Admin"},
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "advance" in data
        assert data["advance"]["status"] == "paid"
        assert data["advance"]["is_direct_payment"] == True
        assert data["advance"]["paid_amount"] == 5000.0
        
        # Store for verification
        created_request_ids.append(data["advance"]["id"])
    
    def test_direct_advance_appears_in_balances(self):
        """Verify direct advance appears in employee balances"""
        response = requests.get(f"{BASE_URL}/api/finance/advances/balances")
        assert response.status_code == 200
        
        data = response.json()
        assert "balances" in data
        assert "summary" in data
        # Should have at least the direct advance user
        assert data["summary"]["total_advances_given"] >= 5000.0


class TestFinanceAdvanceBalances:
    """Test finance advance balance overview"""
    
    def test_get_all_employee_balances(self):
        """Test getting all employee advance balances"""
        response = requests.get(f"{BASE_URL}/api/finance/advances/balances")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "balances" in data
        assert "summary" in data
        assert "total_outstanding_advances" in data["summary"]
        assert "total_advances_given" in data["summary"]
        assert "total_advances_recovered" in data["summary"]
        assert "employees_with_balance" in data["summary"]
        
        # Verify balance structure
        if len(data["balances"]) > 0:
            balance = data["balances"][0]
            assert "user_id" in balance
            assert "user_name" in balance
            assert "total_advances" in balance
            assert "total_used" in balance
            assert "running_balance" in balance
    
    def test_get_employee_advance_history(self):
        """Test getting detailed advance history for an employee"""
        response = requests.get(f"{BASE_URL}/api/finance/advances/employee/{TEST_USER_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == TEST_USER_ID
        assert "running_balance" in data
        assert "total_advances_paid" in data
        assert "total_advance_used" in data
        assert "advance_payments" in data
        assert "expense_sheets_with_advance" in data
        assert "pending_requests" in data


class TestFinanceRejectAdvance:
    """Test advance request rejection workflow"""
    
    def test_create_request_for_rejection(self):
        """Create a new request to test rejection"""
        payload = {
            "amount": 10000.0,
            "purpose": "TEST Request for rejection",
            "project_name": "TEST Reject Project",
            "remarks": "This will be rejected"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/advance-requests",
            params={
                "user_id": TEST_USER_ID,
                "user_name": TEST_USER_NAME,
                "department": TEST_DEPARTMENT,
                "emp_id": TEST_EMP_ID
            },
            json=payload
        )
        
        assert response.status_code == 200
        created_request_ids.append(response.json()["request"]["id"])
    
    def test_reject_advance_request(self):
        """Test rejecting an advance request"""
        request_id = created_request_ids[-1]  # Last created request
        
        response = requests.put(
            f"{BASE_URL}/api/finance/advance-requests/{request_id}/reject",
            params={
                "rejected_by": "TEST Finance Admin",
                "reason": "Amount exceeds limit for testing"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"
    
    def test_verify_rejection_recorded(self):
        """Verify rejection details were recorded"""
        response = requests.get(f"{BASE_URL}/api/finance/advance-requests")
        assert response.status_code == 200
        
        data = response.json()
        request = next((r for r in data["requests"] if r["id"] == created_request_ids[-1]), None)
        assert request is not None
        assert request["status"] == "rejected"
        assert request["rejected_by"] == "TEST Finance Admin"
        assert "exceeds limit" in request.get("rejection_reason", "").lower()


class TestRunningBalanceCalculation:
    """Test running balance calculation accuracy"""
    
    def test_balance_calculation_formula(self):
        """Verify running balance = total advances - total used"""
        # Get balance for the test employee with existing data
        response = requests.get(f"{BASE_URL}/api/employee/advance-balance/67ad0eb2d60d45ca2c4d8555")
        assert response.status_code == 200
        
        data = response.json()
        calculated_balance = data["total_advances_received"] - data["total_advance_used"]
        assert data["running_balance"] == calculated_balance
    
    def test_finance_balance_summary_totals(self):
        """Verify finance balance summary totals are correct"""
        response = requests.get(f"{BASE_URL}/api/finance/advances/balances")
        assert response.status_code == 200
        
        data = response.json()
        
        # Calculate totals from individual balances
        calc_total_given = sum(b["total_advances"] for b in data["balances"])
        calc_total_recovered = sum(b["total_used"] for b in data["balances"])
        calc_outstanding = sum(b["running_balance"] for b in data["balances"] if b["running_balance"] > 0)
        
        assert data["summary"]["total_advances_given"] == calc_total_given
        assert data["summary"]["total_advances_recovered"] == calc_total_recovered
        assert data["summary"]["total_outstanding_advances"] == calc_outstanding


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_requests(self):
        """Clean up test advance requests"""
        # Get all requests and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/finance/advance-requests")
        if response.status_code == 200:
            data = response.json()
            for req in data["requests"]:
                if req.get("user_name", "").startswith("TEST") or req.get("purpose", "").startswith("TEST"):
                    # Try to delete via employee endpoint
                    requests.delete(
                        f"{BASE_URL}/api/employee/advance-requests/{req['id']}",
                        params={"user_id": req.get("user_id", TEST_USER_ID)}
                    )
        
        # Verify cleanup
        assert True  # Cleanup attempted


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
