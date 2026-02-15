"""
Test Customer Hub (Internal) and Customer Portal (External) APIs
- Customer Hub: Admin management of customers, project linking, portal access
- Customer Portal: Customer view of projects, WCC, service reports
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "test.customer@example.com"
CUSTOMER_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/customer-portal/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ========== CUSTOMER HUB API TESTS (Internal Admin) ==========

class TestCustomerHubCustomers:
    """Test Customer Hub customer management APIs"""
    
    def test_get_all_customers(self, admin_headers):
        """GET /api/customer-hub/customers - List all customers"""
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
        assert "total" in data
        assert isinstance(data["customers"], list)
        print(f"✓ Found {data['total']} customers")
    
    def test_get_customers_with_search(self, admin_headers):
        """GET /api/customer-hub/customers?search=test - Search customers"""
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers?search=test", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
        print(f"✓ Search returned {data['total']} customers")
    
    def test_get_customer_hub_stats(self, admin_headers):
        """GET /api/customer-hub/stats - Get customer hub statistics"""
        response = requests.get(f"{BASE_URL}/api/customer-hub/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_customers" in data
        assert "active_portal_users" in data
        assert "customers_with_projects" in data
        print(f"✓ Stats: {data['total_customers']} total, {data['active_portal_users']} active portal users")
    
    def test_create_customer(self, admin_headers):
        """POST /api/customer-hub/customers - Create new customer"""
        unique_id = str(uuid.uuid4())[:8]
        customer_data = {
            "name": f"TEST_Customer_{unique_id}",
            "company_name": f"TEST_Company_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "contact_number": "1234567890",
            "address": "Test Address",
            "gst_number": "GST123456",
            "portal_access": True
        }
        response = requests.post(f"{BASE_URL}/api/customer-hub/customers", json=customer_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == customer_data["name"]
        assert data["company_name"] == customer_data["company_name"]
        assert data["email"] == customer_data["email"]
        assert "id" in data
        print(f"✓ Created customer: {data['id']}")
        return data["id"]
    
    def test_create_customer_duplicate_email(self, admin_headers):
        """POST /api/customer-hub/customers - Duplicate email should fail"""
        customer_data = {
            "name": "Duplicate Test",
            "company_name": "Duplicate Company",
            "email": CUSTOMER_EMAIL,  # Already exists
            "portal_access": True
        }
        response = requests.post(f"{BASE_URL}/api/customer-hub/customers", json=customer_data, headers=admin_headers)
        assert response.status_code == 400
        print("✓ Duplicate email correctly rejected")
    
    def test_get_single_customer(self, admin_headers):
        """GET /api/customer-hub/customers/{id} - Get customer details"""
        # First get list to find a customer
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers/{customer_id}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == customer_id
        assert "projects" in data
        assert "document_access" in data
        print(f"✓ Got customer details: {data['name']}")
    
    def test_get_customer_not_found(self, admin_headers):
        """GET /api/customer-hub/customers/{id} - Non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers/non-existent-id", headers=admin_headers)
        assert response.status_code == 404
        print("✓ Non-existent customer returns 404")


class TestCustomerHubProjectLinking:
    """Test Customer Hub project linking APIs"""
    
    def test_get_available_projects(self, admin_headers):
        """GET /api/customer-hub/customers/{id}/available-projects - Get linkable projects"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers/{customer_id}/available-projects", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data
        print(f"✓ Found {data['total']} available projects to link")
    
    def test_auto_link_by_company_name(self, admin_headers):
        """POST /api/customer-hub/customers/{id}/auto-link - Auto-link projects by company name"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        response = requests.post(f"{BASE_URL}/api/customer-hub/customers/{customer_id}/auto-link", headers=admin_headers)
        assert response.status_code in [200, 400]  # 400 if no company name set
        if response.status_code == 200:
            data = response.json()
            assert "linked_count" in data
            print(f"✓ Auto-linked {data['linked_count']} projects")
        else:
            print("✓ Auto-link returned expected error (no company name)")
    
    def test_link_projects_to_customer(self, admin_headers):
        """POST /api/customer-hub/customers/{id}/link-projects - Link projects manually"""
        # Get a customer and available projects
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        
        # Get available projects
        projects_response = requests.get(f"{BASE_URL}/api/customer-hub/customers/{customer_id}/available-projects", headers=admin_headers)
        projects = projects_response.json().get("projects", [])
        
        if not projects:
            print("✓ No available projects to link (all may be linked already)")
            return
        
        project_ids = [projects[0]["id"]]
        response = requests.post(
            f"{BASE_URL}/api/customer-hub/customers/{customer_id}/link-projects",
            json=project_ids,
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"✓ Linked project to customer")


class TestCustomerHubPortalAccess:
    """Test Customer Hub portal access management APIs"""
    
    def test_set_portal_password(self, admin_headers):
        """POST /api/customer-hub/customers/{id}/set-portal-password - Set customer password"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        # Find a test customer
        test_customer = None
        for c in customers:
            if c.get("name", "").startswith("TEST_"):
                test_customer = c
                break
        
        if not test_customer:
            print("✓ No test customer to set password (skipping)")
            return
        
        customer_id = test_customer["id"]
        response = requests.post(
            f"{BASE_URL}/api/customer-hub/customers/{customer_id}/set-portal-password?password=testpass123",
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"✓ Set portal password for customer")
    
    def test_toggle_portal_access(self, admin_headers):
        """PUT /api/customer-hub/customers/{id}/toggle-portal-access - Toggle portal access"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        # Find a test customer
        test_customer = None
        for c in customers:
            if c.get("name", "").startswith("TEST_"):
                test_customer = c
                break
        
        if not test_customer:
            print("✓ No test customer to toggle access (skipping)")
            return
        
        customer_id = test_customer["id"]
        response = requests.put(
            f"{BASE_URL}/api/customer-hub/customers/{customer_id}/toggle-portal-access?enabled=true",
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"✓ Toggled portal access")


class TestCustomerHubDocuments:
    """Test Customer Hub document access APIs"""
    
    def test_get_customer_documents(self, admin_headers):
        """GET /api/customer-hub/customers/{id}/documents - Get customer documents"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        response = requests.get(f"{BASE_URL}/api/customer-hub/customers/{customer_id}/documents", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "amcs" in data
        assert "wcc" in data
        assert "test_reports" in data
        assert "service_reports" in data
        assert "projects" in data
        print(f"✓ Got customer documents")
    
    def test_update_document_access(self, admin_headers):
        """PUT /api/customer-hub/customers/{id}/document-access - Update document access"""
        # Get a customer first
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        if not customers:
            pytest.skip("No customers to test")
        
        customer_id = customers[0]["id"]
        access_types = ["amc", "wcc", "projects"]
        response = requests.put(
            f"{BASE_URL}/api/customer-hub/customers/{customer_id}/document-access",
            json=access_types,
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_types" in data
        print(f"✓ Updated document access")


# ========== CUSTOMER PORTAL API TESTS (External Customer) ==========

class TestCustomerPortalProjects:
    """Test Customer Portal projects APIs"""
    
    def test_get_customer_projects(self, customer_token):
        """GET /api/customer-portal/projects - Get customer's linked projects"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/projects?token={customer_token}")
        assert response.status_code in [200, 403]  # 403 if projects access not enabled
        if response.status_code == 200:
            data = response.json()
            assert "projects" in data
            assert "total" in data
            print(f"✓ Customer has {data['total']} linked projects")
        else:
            print("✓ Projects access not enabled for customer (expected)")
    
    def test_get_customer_projects_no_token(self):
        """GET /api/customer-portal/projects - Without token should fail"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/projects")
        assert response.status_code in [401, 422]
        print("✓ Projects endpoint requires authentication")


class TestCustomerPortalWCC:
    """Test Customer Portal WCC (Work Completion Certificates) APIs"""
    
    def test_get_customer_wcc(self, customer_token):
        """GET /api/customer-portal/wcc - Get customer's WCCs"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/wcc?token={customer_token}")
        assert response.status_code in [200, 403]  # 403 if WCC access not enabled
        if response.status_code == 200:
            data = response.json()
            assert "wcc" in data
            assert "total" in data
            print(f"✓ Customer has {data['total']} WCCs")
        else:
            print("✓ WCC access not enabled for customer (expected)")
    
    def test_get_customer_wcc_no_token(self):
        """GET /api/customer-portal/wcc - Without token should fail"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/wcc")
        assert response.status_code in [401, 422]
        print("✓ WCC endpoint requires authentication")


class TestCustomerPortalServiceReports:
    """Test Customer Portal service reports APIs"""
    
    def test_get_customer_service_reports(self, customer_token):
        """GET /api/customer-portal/service-reports - Get customer's service reports"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/service-reports?token={customer_token}")
        assert response.status_code in [200, 403]  # 403 if service reports access not enabled
        if response.status_code == 200:
            data = response.json()
            assert "service_reports" in data
            assert "total" in data
            print(f"✓ Customer has {data['total']} service reports")
        else:
            print("✓ Service reports access not enabled for customer (expected)")


class TestCustomerPortalDashboard:
    """Test Customer Portal dashboard APIs"""
    
    def test_get_full_dashboard(self, customer_token):
        """GET /api/customer-portal/dashboard/full - Get full dashboard with all stats"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/dashboard/full?token={customer_token}")
        assert response.status_code == 200
        data = response.json()
        assert "customer_name" in data
        assert "company_name" in data
        assert "stats" in data
        stats = data["stats"]
        assert "total_projects" in stats
        assert "ongoing_projects" in stats
        assert "completed_projects" in stats
        assert "total_amcs" in stats
        assert "active_amcs" in stats
        assert "total_wcc" in stats
        assert "total_reports" in stats
        print(f"✓ Full dashboard: {stats['total_projects']} projects, {stats['total_amcs']} AMCs, {stats['total_wcc']} WCCs")
    
    def test_get_basic_dashboard(self, customer_token):
        """GET /api/customer-portal/dashboard - Get basic dashboard"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/dashboard?token={customer_token}")
        assert response.status_code == 200
        data = response.json()
        assert "total_amcs" in data
        assert "active_amcs" in data
        print(f"✓ Basic dashboard: {data['total_amcs']} total AMCs")


class TestCustomerPortalAuth:
    """Test Customer Portal authentication"""
    
    def test_customer_login_success(self):
        """POST /api/customer-portal/login - Valid credentials"""
        response = requests.post(f"{BASE_URL}/api/customer-portal/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "customer" in data
        assert data["customer"]["email"] == CUSTOMER_EMAIL
        print(f"✓ Customer login successful")
    
    def test_customer_login_invalid(self):
        """POST /api/customer-portal/login - Invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/customer-portal/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_customer_profile(self, customer_token):
        """GET /api/customer-portal/me - Get customer profile"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/me?token={customer_token}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Got customer profile: {data['name']}")


# ========== CLEANUP ==========

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_customers(self, admin_headers):
        """Delete TEST_ prefixed customers"""
        list_response = requests.get(f"{BASE_URL}/api/customer-hub/customers", headers=admin_headers)
        customers = list_response.json().get("customers", [])
        
        deleted = 0
        for customer in customers:
            if customer.get("name", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/customer-hub/customers/{customer['id']}",
                    headers=admin_headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test customers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
