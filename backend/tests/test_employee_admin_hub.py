"""
Backend API Tests for Employee Hub and Admin Hub
Tests: Overtime, Permission, Transport, Leave, Expense, Announcements, Events, Holidays
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user data
TEST_USER_ID = "TEST_user_123"
TEST_USER_NAME = "TEST User"
TEST_DEPARTMENT = "Projects"


class TestEmployeeOvertimeRequests:
    """Test Employee Hub - Overtime Requests CRUD"""
    
    def test_get_overtime_requests(self):
        """GET /api/employee/overtime - List all overtime requests"""
        response = requests.get(f"{BASE_URL}/api/employee/overtime")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_create_overtime_request(self):
        """POST /api/employee/overtime - Create overtime request"""
        payload = {
            "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "hours": 3.0,
            "reason": "TEST_overtime_request_reason",
            "project": "TEST_Project"
        }
        response = requests.post(
            f"{BASE_URL}/api/employee/overtime",
            json=payload,
            params={"user_id": TEST_USER_ID, "user_name": TEST_USER_NAME, "department": TEST_DEPARTMENT}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request" in data
        assert data["request"]["hours"] == 3.0
        assert data["request"]["status"] == "pending"
        assert "id" in data["request"]
        
        # Store ID for cleanup
        TestEmployeeOvertimeRequests.created_id = data["request"]["id"]
    
    def test_get_overtime_by_user(self):
        """GET /api/employee/overtime?user_id=X - Filter by user"""
        response = requests.get(f"{BASE_URL}/api/employee/overtime", params={"user_id": TEST_USER_ID})
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        # Should have at least the one we created
        test_requests = [r for r in data["requests"] if "TEST_" in r.get("reason", "")]
        assert len(test_requests) >= 1
    
    def test_delete_overtime_request(self):
        """DELETE /api/employee/overtime/{id} - Delete overtime request"""
        if hasattr(TestEmployeeOvertimeRequests, 'created_id'):
            response = requests.delete(f"{BASE_URL}/api/employee/overtime/{TestEmployeeOvertimeRequests.created_id}")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data


class TestEmployeePermissionRequests:
    """Test Employee Hub - Permission Requests CRUD"""
    
    def test_get_permission_requests(self):
        """GET /api/employee/permission - List all permission requests"""
        response = requests.get(f"{BASE_URL}/api/employee/permission")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_create_permission_request(self):
        """POST /api/employee/permission - Create permission request"""
        payload = {
            "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "type": "Late Coming",
            "time": "10:30",
            "duration": "1 hour",
            "reason": "TEST_permission_request_reason"
        }
        response = requests.post(
            f"{BASE_URL}/api/employee/permission",
            json=payload,
            params={"user_id": TEST_USER_ID, "user_name": TEST_USER_NAME, "department": TEST_DEPARTMENT}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request" in data
        assert data["request"]["type"] == "Late Coming"
        assert data["request"]["status"] == "pending"
        
        TestEmployeePermissionRequests.created_id = data["request"]["id"]
    
    def test_verify_permission_persisted(self):
        """GET /api/employee/permission - Verify created permission exists"""
        response = requests.get(f"{BASE_URL}/api/employee/permission", params={"user_id": TEST_USER_ID})
        assert response.status_code == 200
        data = response.json()
        test_requests = [r for r in data["requests"] if "TEST_" in r.get("reason", "")]
        assert len(test_requests) >= 1


class TestEmployeeTransportRequests:
    """Test Employee Hub - Transport Requests CRUD"""
    
    def test_get_transport_requests(self):
        """GET /api/employee/transport - List all transport requests"""
        response = requests.get(f"{BASE_URL}/api/employee/transport")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_create_transport_request(self):
        """POST /api/employee/transport - Create transport request"""
        payload = {
            "date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
            "type": "Company Vehicle",
            "pickup": "TEST_Office",
            "drop": "TEST_Client Site",
            "time": "09:00",
            "purpose": "TEST_transport_request_purpose"
        }
        response = requests.post(
            f"{BASE_URL}/api/employee/transport",
            json=payload,
            params={"user_id": TEST_USER_ID, "user_name": TEST_USER_NAME, "department": TEST_DEPARTMENT}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request" in data
        assert data["request"]["type"] == "Company Vehicle"
        assert data["request"]["status"] == "pending"
        
        TestEmployeeTransportRequests.created_id = data["request"]["id"]


class TestEmployeeLeaveRequests:
    """Test Employee Hub - Leave Requests CRUD"""
    
    def test_get_leave_requests(self):
        """GET /api/employee/leave - List all leave requests"""
        response = requests.get(f"{BASE_URL}/api/employee/leave")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_create_leave_request(self):
        """POST /api/employee/leave - Create leave request"""
        from_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        payload = {
            "type": "Casual Leave",
            "from_date": from_date,
            "to_date": to_date,
            "reason": "TEST_leave_request_reason"
        }
        response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            json=payload,
            params={"user_id": TEST_USER_ID, "user_name": TEST_USER_NAME, "department": TEST_DEPARTMENT}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request" in data
        assert data["request"]["type"] == "Casual Leave"
        assert data["request"]["days"] == 2  # 2 days leave
        assert data["request"]["status"] == "pending"
        
        TestEmployeeLeaveRequests.created_id = data["request"]["id"]
    
    def test_get_leave_balance(self):
        """GET /api/employee/leave/balance/{user_id} - Get leave balance"""
        response = requests.get(f"{BASE_URL}/api/employee/leave/balance/{TEST_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "casual" in data["balance"]
        assert "sick" in data["balance"]
        assert "earned" in data["balance"]
        # Verify balance structure
        assert "total" in data["balance"]["casual"]
        assert "used" in data["balance"]["casual"]
        assert "balance" in data["balance"]["casual"]


class TestEmployeeExpenseClaims:
    """Test Employee Hub - Expense Claims CRUD"""
    
    def test_get_expense_claims(self):
        """GET /api/employee/expenses - List all expense claims"""
        response = requests.get(f"{BASE_URL}/api/employee/expenses")
        assert response.status_code == 200
        data = response.json()
        assert "claims" in data
        assert isinstance(data["claims"], list)
    
    def test_create_expense_claim(self):
        """POST /api/employee/expenses - Create expense claim"""
        payload = {
            "category": "Travel",
            "description": "TEST_expense_claim_description",
            "amount": 1500.50,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "receipt_url": None
        }
        response = requests.post(
            f"{BASE_URL}/api/employee/expenses",
            json=payload,
            params={"user_id": TEST_USER_ID, "user_name": TEST_USER_NAME, "department": TEST_DEPARTMENT}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "claim" in data
        assert data["claim"]["category"] == "Travel"
        assert data["claim"]["amount"] == 1500.50
        assert data["claim"]["status"] == "pending"
        
        TestEmployeeExpenseClaims.created_id = data["claim"]["id"]


class TestEmployeeDashboard:
    """Test Employee Hub - Dashboard API"""
    
    def test_get_employee_dashboard(self):
        """GET /api/employee/dashboard/{user_id} - Get dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/employee/dashboard/{TEST_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "recentActivity" in data
        # Verify stats structure
        stats = data["stats"]
        assert "pendingLeaves" in stats
        assert "pendingExpenses" in stats
        assert "pendingOT" in stats
        assert "totalLeaveBalance" in stats


class TestAdminAnnouncements:
    """Test Administration - Announcements CRUD"""
    
    def test_get_announcements(self):
        """GET /api/admin/announcements - List all announcements"""
        response = requests.get(f"{BASE_URL}/api/admin/announcements")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        assert isinstance(data["announcements"], list)
    
    def test_create_announcement(self):
        """POST /api/admin/announcements - Create announcement"""
        payload = {
            "title": "TEST_Announcement_Title",
            "content": "TEST_announcement_content_for_testing",
            "priority": "medium",
            "target_audience": "all",
            "expiry_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/announcements",
            json=payload,
            params={"created_by": TEST_USER_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "announcement" in data
        assert data["announcement"]["title"] == "TEST_Announcement_Title"
        assert data["announcement"]["status"] == "active"
        
        TestAdminAnnouncements.created_id = data["announcement"]["id"]
    
    def test_update_announcement(self):
        """PUT /api/admin/announcements/{id} - Update announcement"""
        if hasattr(TestAdminAnnouncements, 'created_id'):
            payload = {
                "title": "TEST_Announcement_Updated",
                "content": "TEST_updated_content",
                "priority": "high",
                "target_audience": "all",
                "expiry_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
            }
            response = requests.put(
                f"{BASE_URL}/api/admin/announcements/{TestAdminAnnouncements.created_id}",
                json=payload
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
    
    def test_delete_announcement(self):
        """DELETE /api/admin/announcements/{id} - Delete announcement"""
        if hasattr(TestAdminAnnouncements, 'created_id'):
            response = requests.delete(f"{BASE_URL}/api/admin/announcements/{TestAdminAnnouncements.created_id}")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data


class TestAdminEvents:
    """Test Administration - Events CRUD"""
    
    def test_get_events(self):
        """GET /api/admin/events - List all events"""
        response = requests.get(f"{BASE_URL}/api/admin/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
    
    def test_create_event(self):
        """POST /api/admin/events - Create event"""
        payload = {
            "title": "TEST_Event_Title",
            "date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "time": "14:00",
            "location": "TEST_Conference Room",
            "type": "meeting",
            "attendees": "All Employees",
            "description": "TEST_event_description"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/events",
            json=payload,
            params={"created_by": TEST_USER_NAME}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "event" in data
        assert data["event"]["title"] == "TEST_Event_Title"
        
        TestAdminEvents.created_id = data["event"]["id"]
    
    def test_get_upcoming_events(self):
        """GET /api/admin/events/upcoming - Get upcoming events"""
        response = requests.get(f"{BASE_URL}/api/admin/events/upcoming")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
    
    def test_update_event(self):
        """PUT /api/admin/events/{id} - Update event"""
        if hasattr(TestAdminEvents, 'created_id'):
            payload = {
                "title": "TEST_Event_Updated",
                "date": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
                "time": "15:00",
                "location": "TEST_Updated Room",
                "type": "training",
                "attendees": "Management",
                "description": "TEST_updated_description"
            }
            response = requests.put(
                f"{BASE_URL}/api/admin/events/{TestAdminEvents.created_id}",
                json=payload
            )
            assert response.status_code == 200
    
    def test_delete_event(self):
        """DELETE /api/admin/events/{id} - Delete event"""
        if hasattr(TestAdminEvents, 'created_id'):
            response = requests.delete(f"{BASE_URL}/api/admin/events/{TestAdminEvents.created_id}")
            assert response.status_code == 200


class TestAdminHolidays:
    """Test Administration - Holidays CRUD"""
    
    def test_get_holidays(self):
        """GET /api/admin/holidays - List all holidays"""
        response = requests.get(f"{BASE_URL}/api/admin/holidays")
        assert response.status_code == 200
        data = response.json()
        assert "holidays" in data
        assert isinstance(data["holidays"], list)
    
    def test_create_holiday(self):
        """POST /api/admin/holidays - Create holiday"""
        payload = {
            "name": "TEST_Holiday_Name",
            "date": "2026-08-15",
            "type": "national"
        }
        response = requests.post(f"{BASE_URL}/api/admin/holidays", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "holiday" in data
        assert data["holiday"]["name"] == "TEST_Holiday_Name"
        assert "day" in data["holiday"]  # Should have day of week
        assert "year" in data["holiday"]  # Should have year
        
        TestAdminHolidays.created_id = data["holiday"]["id"]
    
    def test_get_holidays_by_year(self):
        """GET /api/admin/holidays?year=2026 - Filter by year"""
        response = requests.get(f"{BASE_URL}/api/admin/holidays", params={"year": 2026})
        assert response.status_code == 200
        data = response.json()
        assert "holidays" in data
    
    def test_get_upcoming_holidays(self):
        """GET /api/admin/holidays/upcoming - Get upcoming holidays"""
        response = requests.get(f"{BASE_URL}/api/admin/holidays/upcoming")
        assert response.status_code == 200
        data = response.json()
        assert "holidays" in data
    
    def test_update_holiday(self):
        """PUT /api/admin/holidays/{id} - Update holiday"""
        if hasattr(TestAdminHolidays, 'created_id'):
            payload = {
                "name": "TEST_Holiday_Updated",
                "date": "2026-08-16",
                "type": "company"
            }
            response = requests.put(
                f"{BASE_URL}/api/admin/holidays/{TestAdminHolidays.created_id}",
                json=payload
            )
            assert response.status_code == 200
    
    def test_delete_holiday(self):
        """DELETE /api/admin/holidays/{id} - Delete holiday"""
        if hasattr(TestAdminHolidays, 'created_id'):
            response = requests.delete(f"{BASE_URL}/api/admin/holidays/{TestAdminHolidays.created_id}")
            assert response.status_code == 200


class TestAdminStats:
    """Test Administration - Stats API"""
    
    def test_get_admin_stats(self):
        """GET /api/admin/stats - Get admin panel statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        assert "events" in data
        assert "holidays" in data
        # Verify structure
        assert "total" in data["announcements"]
        assert "highPriority" in data["announcements"]
        assert "upcoming" in data["events"]
    
    def test_get_dashboard_data(self):
        """GET /api/admin/dashboard-data - Get dashboard data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-data")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        assert "events" in data
        assert "holidays" in data
        assert "stats" in data


# Cleanup fixture - runs after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    # Cleanup overtime requests
    try:
        response = requests.get(f"{BASE_URL}/api/employee/overtime")
        if response.status_code == 200:
            for req in response.json().get("requests", []):
                if "TEST_" in req.get("reason", "") or "TEST_" in req.get("project", ""):
                    requests.delete(f"{BASE_URL}/api/employee/overtime/{req['id']}")
    except:
        pass
    
    # Cleanup permission requests
    try:
        response = requests.get(f"{BASE_URL}/api/employee/permission")
        if response.status_code == 200:
            for req in response.json().get("requests", []):
                if "TEST_" in req.get("reason", ""):
                    # No delete endpoint for permission, skip
                    pass
    except:
        pass
    
    # Cleanup announcements
    try:
        response = requests.get(f"{BASE_URL}/api/admin/announcements")
        if response.status_code == 200:
            for ann in response.json().get("announcements", []):
                if "TEST_" in ann.get("title", ""):
                    requests.delete(f"{BASE_URL}/api/admin/announcements/{ann['id']}")
    except:
        pass
    
    # Cleanup events
    try:
        response = requests.get(f"{BASE_URL}/api/admin/events")
        if response.status_code == 200:
            for event in response.json().get("events", []):
                if "TEST_" in event.get("title", ""):
                    requests.delete(f"{BASE_URL}/api/admin/events/{event['id']}")
    except:
        pass
    
    # Cleanup holidays
    try:
        response = requests.get(f"{BASE_URL}/api/admin/holidays")
        if response.status_code == 200:
            for holiday in response.json().get("holidays", []):
                if "TEST_" in holiday.get("name", ""):
                    requests.delete(f"{BASE_URL}/api/admin/holidays/{holiday['id']}")
    except:
        pass
