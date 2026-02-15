"""
Test P0 Backend Refactoring - Modular Routes
Tests for:
- /api/notifications (GET, POST)
- /api/notifications/count
- /api/department-tasks (GET, POST)
- /api/department-tasks/stats/{department}
- /api/test-reports (GET, POST)
- /api/test-reports/next-report-no/{equipment_type}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ==================== NOTIFICATIONS TESTS ====================

class TestNotificationsEndpoints:
    """Tests for /api/notifications modular routes"""
    
    def test_get_notifications(self, api_client):
        """Test GET /api/notifications"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_notifications_with_department_filter(self, api_client):
        """Test GET /api/notifications with department filter"""
        response = api_client.get(f"{BASE_URL}/api/notifications?department=PROJECTS")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_notifications_with_unread_filter(self, api_client):
        """Test GET /api/notifications with unread_only filter"""
        response = api_client.get(f"{BASE_URL}/api/notifications?unread_only=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_notification_count(self, api_client):
        """Test GET /api/notifications/count"""
        response = api_client.get(f"{BASE_URL}/api/notifications/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
    
    def test_get_notification_count_with_department(self, api_client):
        """Test GET /api/notifications/count with department filter"""
        response = api_client.get(f"{BASE_URL}/api/notifications/count?department=PROJECTS")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"
    
    def test_create_notification(self, api_client):
        """Test POST /api/notifications - Create and verify"""
        test_id = str(uuid.uuid4())[:8]
        notification_data = {
            "type": "department_requirement",
            "title": f"TEST_Notification_{test_id}",
            "message": f"Test notification message {test_id}",
            "department": "PROJECTS",
            "from_department": "ACCOUNTS"
        }
        
        # Create notification
        response = api_client.post(f"{BASE_URL}/api/notifications", json=notification_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain notification id"
        assert "message" in data, "Response should contain success message"
        
        # Verify notification was created by fetching notifications
        get_response = api_client.get(f"{BASE_URL}/api/notifications?department=PROJECTS&limit=10")
        assert get_response.status_code == 200
        notifications = get_response.json()
        created_notif = next((n for n in notifications if n.get("title") == notification_data["title"]), None)
        assert created_notif is not None, "Created notification should be in the list"


# ==================== DEPARTMENT TASKS TESTS ====================

class TestDepartmentTasksEndpoints:
    """Tests for /api/department-tasks modular routes"""
    
    def test_get_department_tasks(self, api_client):
        """Test GET /api/department-tasks"""
        response = api_client.get(f"{BASE_URL}/api/department-tasks")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_department_tasks_with_department_filter(self, api_client):
        """Test GET /api/department-tasks with department filter"""
        response = api_client.get(f"{BASE_URL}/api/department-tasks?department=PROJECTS")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_department_tasks_with_status_filter(self, api_client):
        """Test GET /api/department-tasks with status filter"""
        response = api_client.get(f"{BASE_URL}/api/department-tasks?status=Pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_department_task_stats(self, api_client):
        """Test GET /api/department-tasks/stats/{department}"""
        response = api_client.get(f"{BASE_URL}/api/department-tasks/stats/PROJECTS")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "created" in data, "Response should contain 'created' stats"
        assert "assigned" in data, "Response should contain 'assigned' stats"
        assert "total" in data["created"], "Created stats should have 'total'"
        assert "pending" in data["created"], "Created stats should have 'pending'"
        assert "completed" in data["created"], "Created stats should have 'completed'"
        assert "total" in data["assigned"], "Assigned stats should have 'total'"
        assert "pending" in data["assigned"], "Assigned stats should have 'pending'"
        assert "in_progress" in data["assigned"], "Assigned stats should have 'in_progress'"
        assert "completed" in data["assigned"], "Assigned stats should have 'completed'"
    
    def test_get_department_task_stats_accounts(self, api_client):
        """Test GET /api/department-tasks/stats/ACCOUNTS"""
        response = api_client.get(f"{BASE_URL}/api/department-tasks/stats/ACCOUNTS")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "created" in data and "assigned" in data
    
    def test_create_department_task(self, api_client):
        """Test POST /api/department-tasks - Create and verify"""
        test_id = str(uuid.uuid4())[:8]
        task_data = {
            "title": f"TEST_Task_{test_id}",
            "description": f"Test task description {test_id}",
            "task_type": "General",
            "assigned_to_department": "ACCOUNTS",
            "priority": "Medium"
        }
        
        # Create task
        response = api_client.post(f"{BASE_URL}/api/department-tasks", json=task_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain task id"
        assert data["title"] == task_data["title"], "Title should match"
        
        task_id = data["id"]
        
        # Verify task was created by fetching it
        get_response = api_client.get(f"{BASE_URL}/api/department-tasks/{task_id}")
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        fetched_task = get_response.json()
        assert fetched_task["title"] == task_data["title"], "Fetched task title should match"
        assert fetched_task["assigned_to_department"] == task_data["assigned_to_department"]


# ==================== TEST REPORTS TESTS ====================

class TestTestReportsEndpoints:
    """Tests for /api/test-reports modular routes"""
    
    def test_get_test_reports(self, api_client):
        """Test GET /api/test-reports"""
        response = api_client.get(f"{BASE_URL}/api/test-reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_test_reports_with_equipment_filter(self, api_client):
        """Test GET /api/test-reports with equipment_type filter"""
        response = api_client.get(f"{BASE_URL}/api/test-reports?equipment_type=transformer")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_next_report_no_transformer(self, api_client):
        """Test GET /api/test-reports/next-report-no/transformer"""
        response = api_client.get(f"{BASE_URL}/api/test-reports/next-report-no/transformer")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "report_no" in data, "Response should contain report_no"
        assert data["report_no"].startswith("TR/"), f"Transformer report should start with TR/, got {data['report_no']}"
    
    def test_get_next_report_no_earth_pit(self, api_client):
        """Test GET /api/test-reports/next-report-no/earth-pit"""
        response = api_client.get(f"{BASE_URL}/api/test-reports/next-report-no/earth-pit")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "report_no" in data, "Response should contain report_no"
        assert data["report_no"].startswith("EP/"), f"Earth pit report should start with EP/, got {data['report_no']}"
    
    def test_get_next_report_no_amc(self, api_client):
        """Test GET /api/test-reports/next-report-no/amc"""
        response = api_client.get(f"{BASE_URL}/api/test-reports/next-report-no/amc")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "report_no" in data, "Response should contain report_no"
        assert data["report_no"].startswith("AMC/"), f"AMC report should start with AMC/, got {data['report_no']}"
    
    def test_create_test_report(self, api_client):
        """Test POST /api/test-reports - Create and verify"""
        test_id = str(uuid.uuid4())[:8]
        report_data = {
            "equipment_type": "transformer",
            "report_category": "equipment",
            "project_name": f"TEST_Project_{test_id}",
            "customer_name": f"TEST_Customer_{test_id}",
            "location": "Test Location",
            "test_date": "2025-01-15",
            "tested_by": "Test Engineer",
            "overall_condition": "satisfactory",
            "status": "draft"
        }
        
        # Create report
        response = api_client.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain report id"
        assert "report_no" in data, "Response should contain report_no"
        assert data["report_no"].startswith("TR/"), "Report number should start with TR/"
        
        report_id = data["id"]
        
        # Verify report was created by fetching it
        get_response = api_client.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        fetched_report = get_response.json()
        assert fetched_report["project_name"] == report_data["project_name"], "Project name should match"
        assert fetched_report["equipment_type"] == report_data["equipment_type"]


# ==================== CLEANUP ====================

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(auth_token):
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    # Cleanup is optional - test data has TEST_ prefix for identification
    print("Test data cleanup: TEST_ prefixed items can be manually removed if needed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
