"""
Business Hub Feature Tests
Tests for the new Business Hub module including:
- SOM Tasks API (Daily Stand-up)
- Tab navigation
- Finance Analytics data
- Order Management data
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://unified-workflow-6.preview.emergentagent.com')

class TestBusinessHubSOMTasks:
    """SOM (Stand-up Meeting) Tasks API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_task_ids = []
        yield
        # Cleanup - delete test tasks
        for task_id in self.created_task_ids:
            try:
                requests.delete(f"{BASE_URL}/api/som-tasks/{task_id}", headers=self.headers)
            except:
                pass
    
    def test_01_get_som_tasks_empty(self):
        """Test GET /api/som-tasks returns list (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/som-tasks", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} existing SOM tasks")
    
    def test_02_create_som_task(self):
        """Test POST /api/som-tasks creates a new task"""
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "purchase",
            "task": "TEST_Review vendor quotations for Q1",
            "assignee": "Test User",
            "due_date": today,
            "som_date": today,
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["department"] == "purchase"
        assert data["task"] == "TEST_Review vendor quotations for Q1"
        assert data["status"] == "pending"
        
        self.created_task_ids.append(data["id"])
        print(f"Created task with ID: {data['id']}")
    
    def test_03_get_som_task_by_id(self):
        """Test GET /api/som-tasks/{id} returns specific task"""
        # First create a task
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "sales",
            "task": "TEST_Follow up with client ABC",
            "som_date": today,
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        self.created_task_ids.append(task_id)
        
        # Get the task
        response = requests.get(f"{BASE_URL}/api/som-tasks/{task_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == task_id
        assert data["department"] == "sales"
        assert data["task"] == "TEST_Follow up with client ABC"
    
    def test_04_update_som_task(self):
        """Test PUT /api/som-tasks/{id} updates task"""
        # First create a task
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "finance",
            "task": "TEST_Prepare monthly report",
            "som_date": today,
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        self.created_task_ids.append(task_id)
        
        # Update the task
        update_data = {"status": "completed"}
        response = requests.put(f"{BASE_URL}/api/som-tasks/{task_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert "completed_at" in data
        print(f"Task updated to completed at: {data.get('completed_at')}")
    
    def test_05_delete_som_task(self):
        """Test DELETE /api/som-tasks/{id} removes task"""
        # First create a task
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "hr",
            "task": "TEST_Task to be deleted",
            "som_date": today,
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Delete the task
        response = requests.delete(f"{BASE_URL}/api/som-tasks/{task_id}", headers=self.headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Task deleted successfully"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/som-tasks/{task_id}", headers=self.headers)
        assert get_response.status_code == 404
        print("Task deleted and verified")
    
    def test_06_get_som_tasks_with_date_filter(self):
        """Test GET /api/som-tasks?date=YYYY-MM-DD filters by date"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create a task for today
        task_data = {
            "department": "projects",
            "task": "TEST_Project review meeting",
            "som_date": today,
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert create_response.status_code == 200
        self.created_task_ids.append(create_response.json()["id"])
        
        # Get tasks for today
        response = requests.get(f"{BASE_URL}/api/som-tasks?date={today}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned tasks should have today's date
        for task in data:
            assert task["som_date"] == today
        print(f"Found {len(data)} tasks for {today}")
    
    def test_07_get_som_stats_summary(self):
        """Test GET /api/som-tasks/stats/summary returns statistics"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/som-tasks/stats/summary?date={today}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "pending_tasks" in data
        assert "completion_rate" in data
        assert "by_department" in data
        
        # Check department breakdown
        departments = ["purchase", "sales", "finance", "projects", "exports", "accounts", "hr", "operations"]
        for dept in departments:
            assert dept in data["by_department"]
            assert "total" in data["by_department"][dept]
            assert "completed" in data["by_department"][dept]
        
        print(f"Stats: {data['total_tasks']} total, {data['completed_tasks']} completed, {data['completion_rate']}% rate")
    
    def test_08_validate_department_values(self):
        """Test that invalid department values are rejected"""
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "invalid_department",
            "task": "TEST_Invalid department task",
            "som_date": today,
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert response.status_code == 400
        assert "Invalid department" in response.json()["detail"]
        print("Invalid department correctly rejected")
    
    def test_09_validate_status_values(self):
        """Test that invalid status values are rejected"""
        today = datetime.now().strftime("%Y-%m-%d")
        task_data = {
            "department": "purchase",
            "task": "TEST_Invalid status task",
            "som_date": today,
            "status": "invalid_status"
        }
        
        response = requests.post(f"{BASE_URL}/api/som-tasks", json=task_data, headers=self.headers)
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]
        print("Invalid status correctly rejected")


class TestBusinessHubOrderManagement:
    """Order Management Tab Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_order_lifecycle(self):
        """Test GET /api/order-lifecycle returns orders"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data or isinstance(data, list)
        print(f"Order lifecycle endpoint working")


class TestBusinessHubFinanceAnalytics:
    """Finance Analytics Tab Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_projects_for_finance(self):
        """Test GET /api/projects returns data for finance calculations"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check that projects have financial fields
        if len(data) > 0:
            project = data[0]
            # These fields are used in Finance Analytics
            financial_fields = ["po_amount", "invoiced_amount", "actual_expenses", "budget", "pid_savings"]
            for field in financial_fields:
                assert field in project, f"Missing field: {field}"
        
        print(f"Found {len(data)} projects with financial data")


class TestBusinessHubProjectManagement:
    """Project Management Tab Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_projects(self):
        """Test GET /api/projects returns project list"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            project = data[0]
            required_fields = ["id", "pid_no", "project_name", "status", "client"]
            for field in required_fields:
                assert field in project, f"Missing field: {field}"
        
        print(f"Found {len(data)} projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
