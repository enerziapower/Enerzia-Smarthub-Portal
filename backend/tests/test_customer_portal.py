"""
Customer Portal API Tests
Tests for customer login, dashboard, AMCs, and reports endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test.customer@example.com"
CUSTOMER_PASSWORD = "test123"

class TestCustomerPortalAuth:
    """Customer Portal Authentication Tests"""
    
    def test_customer_login_success(self):
        """Test successful customer login"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "customer" in data, "Response should contain customer info"
        assert data["customer"]["email"] == CUSTOMER_EMAIL
        assert data["customer"]["is_active"] == True
        print(f"✓ Customer login successful: {data['customer']['name']}")
    
    def test_customer_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_customer_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/register",
            json={
                "email": CUSTOMER_EMAIL,
                "password": "test123",
                "name": "Duplicate User",
                "company_name": "Test Company"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate email registration correctly rejected")


class TestCustomerPortalDashboard:
    """Customer Portal Dashboard Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.customer = response.json()["customer"]
        else:
            pytest.skip("Could not authenticate customer")
    
    def test_dashboard_endpoint(self):
        """Test customer dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/dashboard",
            params={"token": self.token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_amcs" in data, "Dashboard should contain total_amcs"
        assert "active_amcs" in data, "Dashboard should contain active_amcs"
        assert "expired_amcs" in data, "Dashboard should contain expired_amcs"
        assert "upcoming_visits" in data, "Dashboard should contain upcoming_visits"
        assert "recent_reports_count" in data, "Dashboard should contain recent_reports_count"
        print(f"✓ Dashboard loaded: {data['total_amcs']} total AMCs, {data['active_amcs']} active")
    
    def test_dashboard_without_token(self):
        """Test dashboard without authentication"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/dashboard")
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✓ Dashboard correctly requires authentication")
    
    def test_customer_profile(self):
        """Test customer profile endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/me",
            params={"token": self.token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] == CUSTOMER_EMAIL
        assert "name" in data
        assert "company_name" in data
        print(f"✓ Profile loaded: {data['name']} ({data['company_name']})")


class TestCustomerPortalAMCs:
    """Customer Portal AMC Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Could not authenticate customer")
    
    def test_get_customer_amcs(self):
        """Test getting customer AMCs list"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/amcs",
            params={"token": self.token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "amcs" in data, "Response should contain amcs list"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["amcs"], list), "amcs should be a list"
        print(f"✓ AMCs list loaded: {data['total']} AMCs found")
    
    def test_amcs_without_token(self):
        """Test AMCs endpoint without authentication"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/amcs")
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✓ AMCs endpoint correctly requires authentication")


class TestCustomerPortalReports:
    """Customer Portal Reports Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Could not authenticate customer")
    
    def test_get_customer_reports(self):
        """Test getting customer reports list"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/reports",
            params={"token": self.token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reports" in data, "Response should contain reports list"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["reports"], list), "reports should be a list"
        print(f"✓ Reports list loaded: {data['total']} reports found")
    
    def test_reports_filter_by_type(self):
        """Test filtering reports by type"""
        for report_type in ["test", "ir", "calibration"]:
            response = requests.get(
                f"{BASE_URL}/api/customer-portal/reports",
                params={"token": self.token, "report_type": report_type}
            )
            assert response.status_code == 200, f"Expected 200 for {report_type}, got {response.status_code}"
            print(f"✓ Reports filter by {report_type} works")
    
    def test_reports_without_token(self):
        """Test reports endpoint without authentication"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/reports")
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✓ Reports endpoint correctly requires authentication")


class TestCustomerPortalRegistration:
    """Customer Portal Registration Tests"""
    
    def test_register_new_customer(self):
        """Test registering a new customer"""
        unique_email = f"TEST_customer_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/customer-portal/register",
            json={
                "email": unique_email,
                "password": "testpass123",
                "name": "TEST New Customer",
                "company_name": "TEST Company Ltd",
                "contact_number": "9876543210"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "customer" in data, "Response should contain customer info"
        assert data["customer"]["email"] == unique_email
        assert data["customer"]["name"] == "TEST New Customer"
        print(f"✓ New customer registered: {unique_email}")


class TestDashboardAPIs:
    """Main Dashboard API Tests (for chart data)"""
    
    def test_dashboard_stats(self):
        """Test main dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check for category breakdown (for Category-wise Billing chart)
        assert "category_breakdown" in data or "total_projects" in data, "Dashboard should have stats"
        print(f"✓ Dashboard stats loaded")
    
    def test_weekly_billing(self):
        """Test weekly billing endpoint"""
        response = requests.get(f"{BASE_URL}/api/billing/weekly")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Weekly billing endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
