"""
Backend API Tests for Planning & Execution (Work Schedule) Feature
Tests: Projects API, Work Items, Tasks, Team Members, Company Overview
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crm-lead-manager-6.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_auth_check(self):
        """Test auth check endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/check")
        assert response.status_code == 200
        data = response.json()
        assert "has_users" in data
        print(f"Auth check: has_users={data.get('has_users')}")
    
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
        print(f"Login successful for user: {data['user']['name']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestProjectsAPI:
    """Projects API tests - core functionality for Work Schedule"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_all_projects(self, auth_headers):
        """Test getting all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} projects")
        
        # Check if any projects have work_items
        projects_with_work_items = [p for p in data if p.get('work_items') and len(p.get('work_items', [])) > 0]
        print(f"Projects with work_items: {len(projects_with_work_items)}")
        return data
    
    def test_get_project_by_id(self, auth_headers):
        """Test getting a specific project"""
        # First get all projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available to test")
        
        project_id = projects[0]["id"]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        project = response.json()
        assert project["id"] == project_id
        print(f"Retrieved project: {project.get('pid_no')} - {project.get('project_name')}")
    
    def test_update_project_work_items(self, auth_headers):
        """Test updating project with work_items (line items)"""
        # First get all projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available to test")
        
        project = projects[0]
        project_id = project["id"]
        
        # Create test work_items
        test_work_items = [
            {
                "id": f"test-item-{datetime.now().timestamp()}",
                "description": "TEST_Line Item 1 - Installation",
                "quantity": 10,
                "unit": "Nos",
                "status": "Pending",
                "assigned_to": "",
                "tasks": []
            }
        ]
        
        # Update project with work_items
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers,
            json={"work_items": test_work_items}
        )
        assert response.status_code == 200
        updated_project = response.json()
        
        # Verify work_items were saved
        assert "work_items" in updated_project
        assert len(updated_project["work_items"]) >= 1
        print(f"Updated project {project.get('pid_no')} with work_items")
        
        # Verify by GET
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        fetched_project = response.json()
        assert fetched_project.get("work_items") is not None
        print(f"Verified work_items persisted: {len(fetched_project.get('work_items', []))} items")
    
    def test_add_task_to_work_item(self, auth_headers):
        """Test adding a task to a work item (line item)"""
        # Get projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available to test")
        
        # Find a project with work_items or create one
        project = projects[0]
        project_id = project["id"]
        
        # Create work_items with a task
        test_task = {
            "id": f"task-{datetime.now().timestamp()}",
            "description": "TEST_Task - Complete installation",
            "assigned_to": "Test Engineer",
            "due_date": "31/12/2025",
            "priority": "High",
            "status": "Pending",
            "created_at": datetime.now().isoformat()
        }
        
        test_work_items = [
            {
                "id": f"item-{datetime.now().timestamp()}",
                "description": "TEST_Line Item with Task",
                "quantity": 5,
                "unit": "Sets",
                "status": "Pending",
                "assigned_to": "",
                "tasks": [test_task]
            }
        ]
        
        # Update project
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers,
            json={"work_items": test_work_items}
        )
        assert response.status_code == 200
        updated_project = response.json()
        
        # Verify task was saved
        work_items = updated_project.get("work_items", [])
        assert len(work_items) >= 1
        
        # Find the work item with tasks
        item_with_tasks = next((item for item in work_items if item.get("tasks")), None)
        assert item_with_tasks is not None
        assert len(item_with_tasks.get("tasks", [])) >= 1
        print(f"Task added successfully to work item")
    
    def test_toggle_line_item_status(self, auth_headers):
        """Test toggling line item status"""
        # Get projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        if not projects:
            pytest.skip("No projects available to test")
        
        project = projects[0]
        project_id = project["id"]
        
        # Create work_items with Pending status
        test_work_items = [
            {
                "id": f"toggle-item-{datetime.now().timestamp()}",
                "description": "TEST_Toggle Status Item",
                "quantity": 1,
                "unit": "Lot",
                "status": "Pending",
                "assigned_to": "",
                "tasks": []
            }
        ]
        
        # Update with Pending status
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers,
            json={"work_items": test_work_items}
        )
        assert response.status_code == 200
        
        # Now toggle to Completed
        test_work_items[0]["status"] = "Completed"
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers,
            json={"work_items": test_work_items}
        )
        assert response.status_code == 200
        updated_project = response.json()
        
        # Verify status changed
        work_items = updated_project.get("work_items", [])
        completed_item = next((item for item in work_items if "Toggle Status" in item.get("description", "")), None)
        if completed_item:
            assert completed_item.get("status") == "Completed"
            print("Line item status toggled successfully")


class TestDepartmentTeamAPI:
    """Department Team API tests - for team member assignment"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Authentication failed")
    
    def test_get_projects_team(self, auth_headers):
        """Test getting projects department team members"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} team members in projects department")
        
        # Check team member structure
        if data:
            member = data[0]
            assert "id" in member
            assert "name" in member
            print(f"Sample team member: {member.get('name')}")
    
    def test_get_all_departments(self, auth_headers):
        """Test getting all departments"""
        response = requests.get(f"{BASE_URL}/api/departments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} departments")
        
        # Verify department structure
        dept = data[0]
        assert "code" in dept
        assert "name" in dept


class TestDashboardAPI:
    """Dashboard API tests - for Company Overview"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Authentication failed")
    
    def test_get_dashboard_stats(self, auth_headers):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total_projects" in data
        assert "total_billing" in data
        assert "active_projects" in data
        assert "category_breakdown" in data
        assert "status_breakdown" in data
        
        print(f"Dashboard stats: {data.get('total_projects')} projects, {data.get('active_projects')} active")
    
    def test_get_weekly_billing(self, auth_headers):
        """Test getting weekly billing data"""
        response = requests.get(f"{BASE_URL}/api/billing/weekly", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Weekly billing data: {len(data)} weeks")


class TestSettingsAPI:
    """Settings API tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Authentication failed")
    
    def test_get_organization_settings(self, auth_headers):
        """Test getting organization settings"""
        response = requests.get(f"{BASE_URL}/api/settings/organization", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        print(f"Organization: {data.get('name')}")


class TestFiltersAPI:
    """Test filter functionality for Work Schedule"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Authentication failed")
    
    def test_filter_projects_by_status(self, auth_headers):
        """Test filtering projects by status"""
        response = requests.get(f"{BASE_URL}/api/projects?status=Ongoing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned projects should have Ongoing status
        for project in data:
            assert project.get("status") == "Ongoing"
        print(f"Found {len(data)} ongoing projects")
    
    def test_filter_projects_by_category(self, auth_headers):
        """Test filtering projects by category"""
        response = requests.get(f"{BASE_URL}/api/projects?category=PSS", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned projects should have PSS category
        for project in data:
            assert project.get("category") == "PSS"
        print(f"Found {len(data)} PSS projects")


# Cleanup test data
class TestCleanup:
    """Cleanup test data after tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Authentication failed")
    
    def test_cleanup_test_work_items(self, auth_headers):
        """Clean up TEST_ prefixed work items"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        if response.status_code != 200:
            return
        
        projects = response.json()
        cleaned = 0
        
        for project in projects:
            work_items = project.get("work_items", [])
            if not work_items:
                continue
            
            # Filter out TEST_ items
            original_count = len(work_items)
            filtered_items = [item for item in work_items if not item.get("description", "").startswith("TEST_")]
            
            if len(filtered_items) < original_count:
                # Update project to remove test items
                response = requests.put(
                    f"{BASE_URL}/api/projects/{project['id']}",
                    headers=auth_headers,
                    json={"work_items": filtered_items}
                )
                if response.status_code == 200:
                    cleaned += original_count - len(filtered_items)
        
        print(f"Cleaned up {cleaned} test work items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
