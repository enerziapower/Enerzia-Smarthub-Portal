"""
Test P1 Features:
1. Customer Search Dropdown - API endpoints for customer search
2. Bi-directional Project Delete Flow - DELETE endpoint with order cleanup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCustomerSearchDropdown:
    """Test customer search functionality for Add New Order modal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_customers_simple_endpoint_exists(self):
        """Test that customers-simple endpoint returns customer list"""
        response = requests.get(
            f"{BASE_URL}/api/customer-management/customers-simple",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        data = response.json()
        assert "customers" in data, "Response should contain 'customers' key"
        assert isinstance(data["customers"], list), "Customers should be a list"
        print(f"PASS: Found {len(data['customers'])} customers")
    
    def test_customer_has_required_fields_for_dropdown(self):
        """Test that customers have name and address for dropdown display"""
        response = requests.get(
            f"{BASE_URL}/api/customer-management/customers-simple",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["customers"]) > 0:
            customer = data["customers"][0]
            # Check for name field (could be 'name' or 'company_name')
            has_name = "name" in customer or "company_name" in customer
            assert has_name, f"Customer should have name or company_name field: {customer.keys()}"
            
            # Check for address field
            has_address = "address" in customer
            assert has_address, f"Customer should have address field: {customer.keys()}"
            
            # Check for id field
            assert "id" in customer, f"Customer should have id field: {customer.keys()}"
            print(f"PASS: Customer has required fields - id, name/company_name, address")
        else:
            pytest.skip("No customers found to verify fields")
    
    def test_customer_search_filtering(self):
        """Test that customer list can be filtered (frontend handles this)"""
        response = requests.get(
            f"{BASE_URL}/api/customer-management/customers-simple",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify we can filter customers by name (simulating frontend behavior)
        customers = data["customers"]
        if len(customers) > 0:
            # Get first customer's name
            first_customer = customers[0]
            search_term = (first_customer.get("name") or first_customer.get("company_name", ""))[:3]
            
            # Filter customers (simulating frontend filtering)
            filtered = [c for c in customers if 
                        search_term.lower() in (c.get("name", "") or c.get("company_name", "")).lower()]
            
            assert len(filtered) > 0, f"Should find at least one customer matching '{search_term}'"
            print(f"PASS: Filtering by '{search_term}' found {len(filtered)} customers")


class TestProjectDeleteFlow:
    """Test bi-directional project delete flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_delete_endpoint_exists(self):
        """Test that DELETE /api/projects/{id} endpoint exists"""
        # Get a project to test with
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) > 0:
            # Try to delete with a non-existent ID to verify endpoint exists
            response = requests.delete(
                f"{BASE_URL}/api/projects/non-existent-id",
                headers=self.headers
            )
            # Should return 404 for non-existent project, not 405 (method not allowed)
            assert response.status_code == 404, f"Expected 404 for non-existent project, got {response.status_code}"
            print("PASS: DELETE endpoint exists and returns 404 for non-existent project")
        else:
            pytest.skip("No projects found to test delete endpoint")
    
    def test_delete_project_removes_from_list(self):
        """Test that deleting a project removes it from the projects list"""
        # First, create a test project
        test_project = {
            "pid_no": "TEST-DELETE-001",
            "category": "PSS",
            "client": "Test Delete Client",
            "location": "Test Location",
            "project_name": "Test Project for Delete",
            "vendor": "Test Vendor",
            "status": "Ongoing",
            "engineer_in_charge": "Test Engineer",
            "po_amount": 10000,
            "budget": 8000
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.headers,
            json=test_project
        )
        
        if create_response.status_code == 400 and "already exists" in create_response.text:
            # Project already exists, find it
            projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
            projects = projects_response.json()
            project = next((p for p in projects if p["pid_no"] == "TEST-DELETE-001"), None)
            if project:
                project_id = project["id"]
            else:
                pytest.skip("Could not find or create test project")
                return
        else:
            assert create_response.status_code == 200, f"Failed to create test project: {create_response.text}"
            project_id = create_response.json()["id"]
        
        print(f"Created/Found test project with ID: {project_id}")
        
        # Delete the project
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Failed to delete project: {delete_response.text}"
        
        # Verify response message
        delete_data = delete_response.json()
        assert "message" in delete_data, "Delete response should contain message"
        assert "deleted" in delete_data["message"].lower(), f"Message should confirm deletion: {delete_data['message']}"
        print(f"PASS: Project deleted successfully - {delete_data['message']}")
        
        # Verify project is no longer in list
        verify_response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
        assert verify_response.status_code == 404, f"Deleted project should return 404, got {verify_response.status_code}"
        print("PASS: Deleted project no longer exists in database")
    
    def test_delete_project_cleans_linked_order(self):
        """Test that deleting a project clears linked_project_id from associated order"""
        # First, check if there are any orders with linked_project_id
        orders_response = requests.get(
            f"{BASE_URL}/api/order-lifecycle/orders",
            headers=self.headers
        )
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        orders = orders_data.get("orders", [])
        
        # Find an order with linked_project_id
        linked_order = next((o for o in orders if o.get("linked_project_id")), None)
        
        if linked_order:
            project_id = linked_order["linked_project_id"]
            order_id = linked_order["id"]
            
            print(f"Found order {order_id} linked to project {project_id}")
            
            # Verify project exists
            project_response = requests.get(
                f"{BASE_URL}/api/projects/{project_id}",
                headers=self.headers
            )
            
            if project_response.status_code == 200:
                # Delete the project
                delete_response = requests.delete(
                    f"{BASE_URL}/api/projects/{project_id}",
                    headers=self.headers
                )
                assert delete_response.status_code == 200, f"Failed to delete project: {delete_response.text}"
                
                # Check if order's linked_project_id was cleared
                order_check_response = requests.get(
                    f"{BASE_URL}/api/order-lifecycle/orders",
                    headers=self.headers
                )
                assert order_check_response.status_code == 200
                updated_orders = order_check_response.json().get("orders", [])
                updated_order = next((o for o in updated_orders if o["id"] == order_id), None)
                
                if updated_order:
                    # linked_project_id should be None or not present
                    linked_id = updated_order.get("linked_project_id")
                    assert linked_id is None, f"Order's linked_project_id should be cleared, got: {linked_id}"
                    print(f"PASS: Order {order_id}'s linked_project_id was cleared after project deletion")
                else:
                    print(f"WARNING: Could not find order {order_id} after project deletion")
            else:
                print(f"Project {project_id} not found (may have been deleted already)")
                pytest.skip("Linked project not found")
        else:
            print("No orders with linked_project_id found - creating test scenario")
            pytest.skip("No linked orders found to test bi-directional delete")


class TestProjectManagementUI:
    """Test Project Management UI elements for delete flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_projects_list_returns_data(self):
        """Test that projects list endpoint returns data for UI"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        print(f"PASS: Projects endpoint returns {len(projects)} projects")
    
    def test_projects_have_required_fields_for_delete_modal(self):
        """Test that projects have fields needed for delete confirmation modal"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) > 0:
            project = projects[0]
            required_fields = ["id", "pid_no", "project_name", "client"]
            
            for field in required_fields:
                assert field in project, f"Project should have '{field}' field for delete modal"
            
            print(f"PASS: Project has all required fields for delete modal: {required_fields}")
        else:
            pytest.skip("No projects found to verify fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
