"""
Test Work Completion Certificate (WCC) Customer Dropdown Feature
Tests the new customer selection from Domestic Customers database
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWCCCustomerDropdown:
    """Test WCC Customer Dropdown Feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {"Content-Type": "application/json"}
        # Login to get auth token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"},
            headers=self.headers
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.headers["Authorization"] = f"Bearer {token}"
        yield
    
    def test_01_domestic_customers_endpoint(self):
        """Test GET /api/settings/clients?customer_type=domestic returns customers"""
        response = requests.get(
            f"{BASE_URL}/api/settings/clients",
            params={"customer_type": "domestic"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one domestic customer"
        
        # Verify customer structure
        first_customer = data[0]
        assert "id" in first_customer, "Customer should have id"
        assert "name" in first_customer, "Customer should have name"
        assert "address" in first_customer, "Customer should have address"
        assert first_customer.get("customer_type") == "domestic", "Should be domestic customer"
        
        print(f"✓ Found {len(data)} domestic customers")
        print(f"✓ Sample customer: {first_customer.get('name')}")
    
    def test_02_wcc_list_endpoint(self):
        """Test GET /api/work-completion returns certificates list"""
        response = requests.get(
            f"{BASE_URL}/api/work-completion",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Found {len(data)} work completion certificates")
        
        # If there are certificates, verify structure
        if len(data) > 0:
            cert = data[0]
            assert "id" in cert, "Certificate should have id"
            assert "document_no" in cert, "Certificate should have document_no"
            assert "customer_name" in cert, "Certificate should have customer_name"
            print(f"✓ Sample certificate: {cert.get('document_no')} - Customer: {cert.get('customer_name')}")
    
    def test_03_get_completed_projects(self):
        """Test GET /api/projects returns projects for WCC creation"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Filter for completed/invoiced projects
        eligible_projects = [p for p in data if p.get('status') in ['Completed', 'Invoiced', 'Partially Invoiced']]
        print(f"✓ Found {len(eligible_projects)} eligible projects for WCC")
        
        if len(eligible_projects) > 0:
            project = eligible_projects[0]
            print(f"✓ Sample project: {project.get('pid_no')} - {project.get('project_name')}")
            return project
        return None
    
    def test_04_create_wcc_with_customer_name(self):
        """Test POST /api/work-completion with explicit customer_name"""
        # First get a project
        projects_response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=self.headers
        )
        projects = projects_response.json()
        eligible_projects = [p for p in projects if p.get('status') in ['Completed', 'Invoiced', 'Partially Invoiced', 'Ongoing']]
        
        if len(eligible_projects) == 0:
            pytest.skip("No eligible projects found for WCC creation")
        
        project = eligible_projects[0]
        
        # Get a domestic customer
        customers_response = requests.get(
            f"{BASE_URL}/api/settings/clients",
            params={"customer_type": "domestic"},
            headers=self.headers
        )
        customers = customers_response.json()
        active_customers = [c for c in customers if c.get('is_active', True)]
        
        if len(active_customers) == 0:
            pytest.skip("No active domestic customers found")
        
        customer = active_customers[0]
        
        # Create WCC with explicit customer_name
        wcc_data = {
            "project_id": project.get("id"),
            "work_started_on": "01/01/2026",
            "completed_on": "15/01/2026",
            "customer_name": customer.get("name"),  # Explicit customer name from dropdown
            "customer_address": customer.get("address", ""),
            "order_no": project.get("po_number", "TEST-PO-001"),
            "order_amount": project.get("po_amount", 100000),
            "billed_amount": project.get("invoiced_amount", 50000),
            "work_items": [],
            "quality_compliance": "Complied",
            "status": "Draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/work-completion",
            json=wcc_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "certificate" in data, "Response should contain certificate"
        
        cert = data["certificate"]
        assert cert.get("customer_name") == customer.get("name"), \
            f"Customer name mismatch: expected '{customer.get('name')}', got '{cert.get('customer_name')}'"
        
        print(f"✓ Created WCC: {cert.get('document_no')}")
        print(f"✓ Customer name correctly set to: {cert.get('customer_name')}")
        
        # Store for cleanup
        self.__class__.created_wcc_id = cert.get("id")
        return cert
    
    def test_05_verify_wcc_customer_in_list(self):
        """Test that WCC list shows correct customer name"""
        if not hasattr(self.__class__, 'created_wcc_id'):
            pytest.skip("No WCC created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/work-completion",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        created_wcc = next((c for c in data if c.get("id") == self.__class__.created_wcc_id), None)
        
        assert created_wcc is not None, "Created WCC not found in list"
        assert created_wcc.get("customer_name"), "Customer name should not be empty"
        
        print(f"✓ WCC in list shows customer: {created_wcc.get('customer_name')}")
    
    def test_06_update_wcc_customer_name(self):
        """Test PUT /api/work-completion/{id} can update customer_name"""
        if not hasattr(self.__class__, 'created_wcc_id'):
            pytest.skip("No WCC created in previous test")
        
        # Get another customer
        customers_response = requests.get(
            f"{BASE_URL}/api/settings/clients",
            params={"customer_type": "domestic"},
            headers=self.headers
        )
        customers = customers_response.json()
        active_customers = [c for c in customers if c.get('is_active', True)]
        
        if len(active_customers) < 2:
            pytest.skip("Need at least 2 customers to test update")
        
        new_customer = active_customers[1]  # Use second customer
        
        update_data = {
            "customer_name": new_customer.get("name"),
            "customer_address": new_customer.get("address", "")
        }
        
        response = requests.put(
            f"{BASE_URL}/api/work-completion/{self.__class__.created_wcc_id}",
            json=update_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("customer_name") == new_customer.get("name"), \
            f"Customer name not updated: expected '{new_customer.get('name')}', got '{data.get('customer_name')}'"
        
        print(f"✓ Updated WCC customer to: {data.get('customer_name')}")
    
    def test_07_wcc_pdf_generation(self):
        """Test GET /api/work-completion/{id}/pdf generates PDF with correct customer"""
        if not hasattr(self.__class__, 'created_wcc_id'):
            pytest.skip("No WCC created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/work-completion/{self.__class__.created_wcc_id}/pdf",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected PDF content type, got {response.headers.get('content-type')}"
        
        # Verify PDF has content
        assert len(response.content) > 1000, "PDF should have substantial content"
        
        print(f"✓ PDF generated successfully, size: {len(response.content)} bytes")
    
    def test_08_cleanup_test_wcc(self):
        """Cleanup: Delete test WCC"""
        if not hasattr(self.__class__, 'created_wcc_id'):
            pytest.skip("No WCC to cleanup")
        
        response = requests.delete(
            f"{BASE_URL}/api/work-completion/{self.__class__.created_wcc_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Cleaned up test WCC: {self.__class__.created_wcc_id}")


class TestWCCCustomerNamePriority:
    """Test that frontend-provided customer_name takes priority over auto-detection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {"Content-Type": "application/json"}
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"},
            headers=self.headers
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.headers["Authorization"] = f"Bearer {token}"
        yield
    
    def test_customer_name_priority(self):
        """Test that explicit customer_name overrides project.client"""
        # Get a project
        projects_response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=self.headers
        )
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects found")
        
        project = projects[0]
        project_client = project.get("client", "")
        
        # Get a different customer
        customers_response = requests.get(
            f"{BASE_URL}/api/settings/clients",
            params={"customer_type": "domestic"},
            headers=self.headers
        )
        customers = customers_response.json()
        
        # Find a customer different from project.client
        different_customer = next(
            (c for c in customers if c.get("name") != project_client and c.get("is_active", True)),
            None
        )
        
        if not different_customer:
            pytest.skip("Could not find a different customer")
        
        # Create WCC with explicit different customer
        wcc_data = {
            "project_id": project.get("id"),
            "work_started_on": "01/02/2026",
            "completed_on": "15/02/2026",
            "customer_name": different_customer.get("name"),  # Different from project.client
            "customer_address": different_customer.get("address", ""),
            "work_items": [],
            "status": "Draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/work-completion",
            json=wcc_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        cert = response.json().get("certificate", {})
        
        # Verify customer_name is the explicitly provided one, not project.client
        assert cert.get("customer_name") == different_customer.get("name"), \
            f"Customer name should be '{different_customer.get('name')}' (from dropdown), not '{project_client}' (from project)"
        
        print(f"✓ Project client: {project_client}")
        print(f"✓ Selected customer: {different_customer.get('name')}")
        print(f"✓ WCC customer_name correctly set to selected customer")
        
        # Cleanup
        if cert.get("id"):
            requests.delete(
                f"{BASE_URL}/api/work-completion/{cert.get('id')}",
                headers=self.headers
            )
            print(f"✓ Cleaned up test WCC")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
