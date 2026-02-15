"""
Test suite for Projects and Dashboard routes after backend refactoring
Tests the new modular routes: /app/backend/routes/projects.py and /app/backend/routes/dashboard.py
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


class TestAuthSetup:
    """Authentication tests - run first to get token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for subsequent tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestProjectsNextPID:
    """Test GET /api/projects/next-pid endpoint"""
    
    def test_get_next_pid_default_year(self):
        """Test getting next PID for current financial year"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid")
        assert response.status_code == 200
        data = response.json()
        assert "next_pid" in data
        assert "financial_year" in data
        # PID format should be PID/YY-YY/NNN
        assert data["next_pid"].startswith("PID/")
        print(f"✓ Next PID: {data['next_pid']} for FY {data['financial_year']}")
    
    def test_get_next_pid_specific_year(self):
        """Test getting next PID for specific financial year"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid?financial_year=24-25")
        assert response.status_code == 200
        data = response.json()
        assert "next_pid" in data
        assert data["financial_year"] == "24-25"
        print(f"✓ Next PID for FY 24-25: {data['next_pid']}")


class TestProjectsCRUD:
    """Test Projects CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project_id(self, auth_headers):
        """Create a test project and return its ID for other tests"""
        unique_id = str(uuid.uuid4())[:8]
        project_data = {
            "pid_no": f"TEST/PID/{unique_id}",
            "category": "PSS",
            "client": "Test Client",
            "location": "Test Location",
            "project_name": f"Test Project {unique_id}",
            "vendor": "Test Vendor",
            "status": "Ongoing",
            "engineer_in_charge": "Test Engineer",
            "po_amount": 100000,
            "budget": 80000,
            "actual_expenses": 50000
        }
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test project: {response.text}"
        data = response.json()
        yield data["id"]
        # Cleanup: Delete the test project
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=auth_headers)
    
    def test_get_projects_list(self, auth_headers):
        """Test GET /api/projects - list all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} projects")
    
    def test_get_projects_with_status_filter(self, auth_headers):
        """Test GET /api/projects with status filter"""
        response = requests.get(f"{BASE_URL}/api/projects?status=Ongoing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned projects should have status "Ongoing"
        for project in data:
            assert project.get("status") == "Ongoing"
        print(f"✓ Retrieved {len(data)} ongoing projects")
    
    def test_get_projects_with_category_filter(self, auth_headers):
        """Test GET /api/projects with category filter"""
        response = requests.get(f"{BASE_URL}/api/projects?category=PSS", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} PSS category projects")
    
    def test_create_project(self, auth_headers):
        """Test POST /api/projects - create new project"""
        unique_id = str(uuid.uuid4())[:8]
        project_data = {
            "pid_no": f"TEST/CREATE/{unique_id}",
            "category": "AS",
            "client": "Create Test Client",
            "location": "Create Test Location",
            "project_name": f"Create Test Project {unique_id}",
            "vendor": "Create Test Vendor",
            "status": "Need to Start",
            "engineer_in_charge": "Create Test Engineer",
            "po_amount": 50000,
            "budget": 40000,
            "actual_expenses": 0
        }
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["pid_no"] == project_data["pid_no"]
        assert data["client"] == project_data["client"]
        assert "id" in data
        # Verify calculated fields
        assert data["pid_savings"] == 40000  # budget - actual_expenses
        assert data["balance"] == 50000  # po_amount - invoiced_amount (0)
        print(f"✓ Created project: {data['pid_no']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=auth_headers)
    
    def test_create_project_duplicate_pid_check(self, auth_headers, test_project_id):
        """Test POST /api/projects - duplicate PID should fail"""
        # First get the existing project's PID
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}", headers=auth_headers)
        existing_pid = response.json()["pid_no"]
        
        # Try to create with same PID
        project_data = {
            "pid_no": existing_pid,  # Duplicate PID
            "category": "PSS",
            "client": "Duplicate Test",
            "location": "Test",
            "project_name": "Duplicate Test",
            "vendor": "Test",
            "status": "Ongoing",
            "engineer_in_charge": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=auth_headers)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print(f"✓ Duplicate PID check working - rejected {existing_pid}")
    
    def test_get_single_project(self, auth_headers, test_project_id):
        """Test GET /api/projects/{id} - get single project"""
        response = requests.get(f"{BASE_URL}/api/projects/{test_project_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_project_id
        print(f"✓ Retrieved project: {data['pid_no']}")
    
    def test_get_nonexistent_project(self, auth_headers):
        """Test GET /api/projects/{id} - nonexistent project returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/projects/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        print("✓ Nonexistent project returns 404")
    
    def test_update_project(self, auth_headers, test_project_id):
        """Test PUT /api/projects/{id} - update project"""
        update_data = {
            "status": "Completed",
            "completion_percentage": 100,
            "invoiced_amount": 90000
        }
        response = requests.put(f"{BASE_URL}/api/projects/{test_project_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Completed"
        assert data["completion_percentage"] == 100
        # Balance should be recalculated: po_amount - invoiced_amount
        assert data["balance"] == data["po_amount"] - 90000
        print(f"✓ Updated project status to Completed")
    
    def test_update_project_budget_recalculates_savings(self, auth_headers, test_project_id):
        """Test PUT /api/projects/{id} - budget update recalculates pid_savings"""
        update_data = {
            "budget": 100000,
            "actual_expenses": 60000
        }
        response = requests.put(f"{BASE_URL}/api/projects/{test_project_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["pid_savings"] == 40000  # 100000 - 60000
        print(f"✓ Budget update recalculated pid_savings: {data['pid_savings']}")
    
    def test_delete_project(self, auth_headers):
        """Test DELETE /api/projects/{id} - delete project"""
        # Create a project to delete
        unique_id = str(uuid.uuid4())[:8]
        project_data = {
            "pid_no": f"TEST/DELETE/{unique_id}",
            "category": "OSS",
            "client": "Delete Test",
            "location": "Test",
            "project_name": "Delete Test Project",
            "vendor": "Test",
            "status": "Cancelled",
            "engineer_in_charge": "Test"
        }
        create_response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=auth_headers)
        project_id = create_response.json()["id"]
        
        # Delete the project
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        assert "deleted" in response.json().get("message", "").lower()
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted project and verified 404")
    
    def test_delete_nonexistent_project(self, auth_headers):
        """Test DELETE /api/projects/{id} - nonexistent project returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/projects/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        print("✓ Delete nonexistent project returns 404")


class TestDashboardStats:
    """Test Dashboard statistics endpoints"""
    
    def test_get_dashboard_stats(self):
        """Test GET /api/dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields are present
        required_fields = [
            "total_projects", "total_billing", "pending_pos", 
            "active_projects", "this_week_billing", "completion_avg",
            "category_breakdown", "status_breakdown"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_projects"], int)
        assert isinstance(data["total_billing"], (int, float))
        assert isinstance(data["category_breakdown"], dict)
        assert isinstance(data["status_breakdown"], dict)
        
        print(f"✓ Dashboard stats: {data['total_projects']} projects, ₹{data['total_billing']:,.0f} total billing")
    
    def test_get_this_week_breakdown(self):
        """Test GET /api/dashboard/this-week-breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/this-week-breakdown")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "count" in data
        assert "projects" in data
        assert isinstance(data["projects"], list)
        
        print(f"✓ This week breakdown: {data['count']} projects, ₹{data['total']:,.0f} billing")
    
    def test_get_active_projects_breakdown(self):
        """Test GET /api/dashboard/active-projects-breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/active-projects-breakdown")
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "projects" in data
        assert isinstance(data["projects"], list)
        
        # Verify projects are sorted by completion_percentage
        if len(data["projects"]) > 1:
            for i in range(len(data["projects"]) - 1):
                assert data["projects"][i].get("completion_percentage", 0) <= data["projects"][i+1].get("completion_percentage", 0)
        
        print(f"✓ Active projects breakdown: {data['total']} ongoing projects")
    
    def test_get_total_billing_breakdown(self):
        """Test GET /api/dashboard/total-billing-breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/total-billing-breakdown")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_po_amount" in data
        assert "total_invoiced" in data
        assert "total_balance" in data
        assert "count" in data
        assert "projects" in data
        
        # Verify balance calculation
        assert data["total_balance"] == data["total_po_amount"] - data["total_invoiced"]
        
        # Verify each project has balance calculated
        for project in data["projects"]:
            expected_balance = project.get("po_amount", 0) - project.get("invoiced_amount", 0)
            assert project.get("balance") == expected_balance
        
        print(f"✓ Total billing breakdown: ₹{data['total_po_amount']:,.0f} PO, ₹{data['total_invoiced']:,.0f} invoiced, ₹{data['total_balance']:,.0f} balance")


class TestScheduledInspections:
    """Test Scheduled Inspections feature (regression test from iteration_7)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_scheduled_inspections_dashboard(self, auth_headers):
        """Test GET /api/scheduled-inspections/dashboard"""
        response = requests.get(f"{BASE_URL}/api/scheduled-inspections/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["total_active", "overdue", "due_today", "due_this_week", "due_this_month"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Scheduled inspections dashboard: {data['total_active']} active, {data['overdue']} overdue")
    
    def test_get_scheduled_inspections_list(self, auth_headers):
        """Test GET /api/scheduled-inspections"""
        response = requests.get(f"{BASE_URL}/api/scheduled-inspections", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} scheduled inspections")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
