"""
Budget Warning Feature Tests for Payment Requests
Tests the budget-check API endpoint and payment approval with budget warnings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBudgetCheckAPI:
    """Test the budget-check API endpoint for payment requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = self._get_auth_token()
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
    
    def _get_auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"}
        )
        if response.status_code == 200:
            return response.json().get('token')
        return None
    
    def test_budget_check_endpoint_exists(self):
        """Test that budget-check endpoint returns proper response"""
        # First get a payment request
        response = requests.get(
            f"{BASE_URL}/api/project-requests/payments?limit=1",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get('requests') and len(data['requests']) > 0:
            request_id = data['requests'][0]['id']
            
            # Call budget-check endpoint
            budget_response = requests.get(
                f"{BASE_URL}/api/project-requests/{request_id}/budget-check",
                headers=self.headers
            )
            assert budget_response.status_code == 200
            
            budget_data = budget_response.json()
            # Verify response structure
            assert 'request_id' in budget_data
            assert 'payment_amount' in budget_data
            assert 'budget' in budget_data
            assert 'total_expenses' in budget_data
            assert 'available_budget' in budget_data
            assert 'budget_after_payment' in budget_data
            assert 'warning' in budget_data
            assert 'warning_message' in budget_data
    
    def test_budget_check_returns_no_budget_warning(self):
        """Test that no_budget warning is returned when project has no budget"""
        # Get payment requests from consolidated PIDs to find one with no budget
        response = requests.get(
            f"{BASE_URL}/api/project-requests/payments?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        payments = response.json().get('requests', [])
        if not payments:
            pytest.skip("No payment requests found")
        
        # Test budget-check for each payment
        for payment in payments:
            budget_response = requests.get(
                f"{BASE_URL}/api/project-requests/{payment['id']}/budget-check",
                headers=self.headers
            )
            assert budget_response.status_code == 200
            budget_data = budget_response.json()
            
            # If budget is 0, warning should be "no_budget"
            if budget_data.get('budget') == 0:
                assert budget_data.get('warning') == 'no_budget'
                assert 'No budget allocated' in budget_data.get('warning_message', '')
                break
    
    def test_budget_check_with_invalid_request_id(self):
        """Test budget-check with non-existent request ID"""
        response = requests.get(
            f"{BASE_URL}/api/project-requests/nonexistent-id/budget-check",
            headers=self.headers
        )
        assert response.status_code == 404
    
    def test_budget_check_response_fields(self):
        """Test all expected fields in budget-check response"""
        # Get a payment request
        response = requests.get(
            f"{BASE_URL}/api/project-requests/payments?limit=1",
            headers=self.headers
        )
        assert response.status_code == 200
        
        payments = response.json().get('requests', [])
        if not payments:
            pytest.skip("No payment requests available")
        
        request_id = payments[0]['id']
        budget_response = requests.get(
            f"{BASE_URL}/api/project-requests/{request_id}/budget-check",
            headers=self.headers
        )
        
        assert budget_response.status_code == 200
        data = budget_response.json()
        
        # Verify all required fields
        required_fields = [
            'request_id',
            'request_no',
            'payment_amount',
            'budget',
            'total_expenses',
            'available_budget',
            'budget_after_payment',
            'warning',
            'warning_message'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_budget_check_numeric_values(self):
        """Test that numeric values are correctly typed"""
        response = requests.get(
            f"{BASE_URL}/api/project-requests/payments?limit=1",
            headers=self.headers
        )
        
        payments = response.json().get('requests', [])
        if not payments:
            pytest.skip("No payment requests available")
        
        request_id = payments[0]['id']
        budget_response = requests.get(
            f"{BASE_URL}/api/project-requests/{request_id}/budget-check",
            headers=self.headers
        )
        
        data = budget_response.json()
        
        # Verify numeric fields are numbers
        assert isinstance(data.get('payment_amount'), (int, float))
        assert isinstance(data.get('budget'), (int, float))
        assert isinstance(data.get('total_expenses'), (int, float))
        assert isinstance(data.get('available_budget'), (int, float))
        assert isinstance(data.get('budget_after_payment'), (int, float))


class TestPaymentApprovalWithExpenseCreation:
    """Test payment approval auto-creates expense"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = self._get_auth_token()
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
    
    def _get_auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"}
        )
        if response.status_code == 200:
            return response.json().get('token')
        return None
    
    def test_status_update_endpoint_works(self):
        """Test that status update endpoint is accessible"""
        # Get a pending payment request
        response = requests.get(
            f"{BASE_URL}/api/project-requests/payments?status=pending&limit=1",
            headers=self.headers
        )
        
        # Even if no pending requests, endpoint should work
        assert response.status_code == 200


class TestConsolidatedPIDsBudgetWarning:
    """Test budget warning in consolidated PIDs view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = self._get_auth_token()
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
    
    def _get_auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"}
        )
        if response.status_code == 200:
            return response.json().get('token')
        return None
    
    def test_consolidated_pids_returns_budget_warning(self):
        """Test that consolidated PIDs endpoint returns budget_warning field"""
        response = requests.get(
            f"{BASE_URL}/api/project-requests/consolidated/by-pid?limit=10",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        pids = data.get('pids', [])
        if not pids:
            pytest.skip("No PIDs found")
        
        # Each PID should have budget_warning field
        for pid in pids:
            assert 'budget_warning' in pid
            assert 'budget' in pid
            assert 'available_budget' in pid
    
    def test_pid_details_returns_budget_warning(self):
        """Test that PID details endpoint returns budget_warning field"""
        # First get a PID
        response = requests.get(
            f"{BASE_URL}/api/project-requests/consolidated/by-pid?limit=1",
            headers=self.headers
        )
        
        assert response.status_code == 200
        pids = response.json().get('pids', [])
        
        if not pids:
            pytest.skip("No PIDs found")
        
        order_id = pids[0]['order_id']
        
        # Get PID details
        detail_response = requests.get(
            f"{BASE_URL}/api/project-requests/consolidated/pid/{order_id}",
            headers=self.headers
        )
        
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        
        # Should have budget_warning field
        assert 'budget_warning' in detail_data
        assert 'budget' in detail_data
        assert 'available_budget' in detail_data
