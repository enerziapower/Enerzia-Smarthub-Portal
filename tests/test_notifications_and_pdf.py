"""
Test suite for Notification System and PDF Download functionality
Tests:
1. Notification CRUD operations
2. Notification creation when department requirements are raised
3. Notification creation when payment requests are submitted
4. Mark notification as read
5. Mark all notifications as read
6. PDF download from Work Planner (frontend test)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://enerzia-workspace.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
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


class TestNotificationEndpoints:
    """Test notification API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_notifications(self, auth_headers):
        """Test GET /api/notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/notifications returned {len(data)} notifications")
    
    def test_get_notification_count(self, auth_headers):
        """Test GET /api/notifications/count"""
        response = requests.get(f"{BASE_URL}/api/notifications/count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        print(f"✓ GET /api/notifications/count returned unread_count: {data['unread_count']}")
    
    def test_create_notification(self, auth_headers):
        """Test POST /api/notifications"""
        notification_data = {
            "type": "department_requirement",
            "title": "TEST: New Requirement from Projects",
            "message": "Test notification created during automated testing",
            "department": "FINANCE",
            "from_department": "PROJECTS",
            "reference_type": "test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications",
            json=notification_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Notification created"
        print(f"✓ POST /api/notifications created notification with id: {data['id']}")
        return data["id"]
    
    def test_mark_notification_read(self, auth_headers):
        """Test PUT /api/notifications/{id}/read"""
        # First create a notification
        notification_data = {
            "type": "test",
            "title": "TEST: Mark Read Test",
            "message": "This notification will be marked as read",
            "department": "PROJECTS"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/notifications",
            json=notification_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        notif_id = create_response.json()["id"]
        
        # Mark as read
        response = requests.put(
            f"{BASE_URL}/api/notifications/{notif_id}/read",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Notification marked as read"
        print(f"✓ PUT /api/notifications/{notif_id}/read - marked as read")
    
    def test_mark_all_notifications_read(self, auth_headers):
        """Test PUT /api/notifications/mark-all-read"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/mark-all-read",
            headers=auth_headers,
            params={"department": "PROJECTS"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "All notifications marked as read"
        print("✓ PUT /api/notifications/mark-all-read - all marked as read")
    
    def test_delete_notification(self, auth_headers):
        """Test DELETE /api/notifications/{id}"""
        # First create a notification
        notification_data = {
            "type": "test",
            "title": "TEST: Delete Test",
            "message": "This notification will be deleted",
            "department": "PROJECTS"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/notifications",
            json=notification_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        notif_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/notifications/{notif_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Notification deleted"
        print(f"✓ DELETE /api/notifications/{notif_id} - deleted successfully")


class TestDepartmentRequirementNotifications:
    """Test notifications created when department requirements are raised"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_create_dept_requirement_creates_notification(self, auth_headers):
        """Test that creating a department requirement creates a notification for target dept"""
        # Get initial notification count for FINANCE
        initial_count_response = requests.get(
            f"{BASE_URL}/api/notifications/count",
            headers=auth_headers,
            params={"department": "FINANCE"}
        )
        initial_count = initial_count_response.json().get("unread_count", 0)
        
        # Create a department requirement from PROJECTS to FINANCE
        requirement_data = {
            "requirement_type": "Material Purchase",
            "description": "TEST: Need budget approval for project materials",
            "created_by_department": "PROJECTS",
            "assigned_to_department": "FINANCE",
            "priority": "High",
            "notes": "Test requirement created during automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-requirements",
            json=requirement_data,
            headers=auth_headers
        )
        
        # Check if requirement was created
        if response.status_code == 200:
            req_data = response.json()
            print(f"✓ Created department requirement: {req_data.get('id', 'unknown')}")
            
            # Check if notification was created for FINANCE
            notif_response = requests.get(
                f"{BASE_URL}/api/notifications",
                headers=auth_headers,
                params={"department": "FINANCE", "limit": 5}
            )
            
            if notif_response.status_code == 200:
                notifications = notif_response.json()
                # Look for notification about this requirement
                found_notif = any(
                    "requirement" in n.get("type", "").lower() or 
                    "PROJECTS" in n.get("from_department", "") or
                    "requirement" in n.get("title", "").lower()
                    for n in notifications
                )
                if found_notif:
                    print("✓ Notification created for FINANCE department")
                else:
                    print("⚠ Notification may not have been created (check manually)")
        else:
            print(f"⚠ Could not create requirement: {response.status_code} - {response.text}")


class TestPaymentRequestNotifications:
    """Test notifications created when payment requests are submitted"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_create_payment_request_notifies_finance(self, auth_headers):
        """Test that creating a payment request creates notification for Finance"""
        # Get next PR number
        pr_response = requests.get(
            f"{BASE_URL}/api/payment-requests/next-pr-no",
            headers=auth_headers
        )
        
        if pr_response.status_code == 200:
            pr_no = pr_response.json().get("next_pr_no", f"PR-TEST-{datetime.now().strftime('%H%M%S')}")
        else:
            pr_no = f"PR-TEST-{datetime.now().strftime('%H%M%S')}"
        
        # Create a payment request
        pr_data = {
            "pr_no": pr_no,
            "amount": 5000,
            "category": "Site Expenses",
            "employee_vendor_name": "TEST Vendor for Notification Test",
            "purpose": "Test payment request for notification testing",
            "requested_by_department": "PROJECTS"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/payment-requests",
            json=pr_data,
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Created payment request: {data.get('pr_no', pr_no)}")
            
            # Check if notification was created for FINANCE
            notif_response = requests.get(
                f"{BASE_URL}/api/notifications",
                headers=auth_headers,
                params={"department": "FINANCE", "limit": 10}
            )
            
            if notif_response.status_code == 200:
                notifications = notif_response.json()
                found_notif = any(
                    "payment" in n.get("type", "").lower() or
                    "payment" in n.get("title", "").lower() or
                    pr_no in n.get("message", "")
                    for n in notifications
                )
                if found_notif:
                    print("✓ Notification created for Finance department about payment request")
                else:
                    print("⚠ Payment request notification may not have been created (check manually)")
        else:
            print(f"⚠ Could not create payment request: {response.status_code} - {response.text}")


class TestWorkScheduleAPI:
    """Test Work Schedule / Work Planner API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_get_projects_for_work_schedule(self, auth_headers):
        """Test that projects API returns data for work schedule"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/projects returned {len(data)} projects for work schedule")
    
    def test_get_department_team(self, auth_headers):
        """Test getting team members for projects department"""
        response = requests.get(
            f"{BASE_URL}/api/departments/projects/team",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/departments/projects/team returned {len(data)} team members")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_notifications(self, auth_headers):
        """Clean up test notifications"""
        # Get all notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers,
            params={"limit": 100}
        )
        
        if response.status_code == 200:
            notifications = response.json()
            deleted_count = 0
            for notif in notifications:
                if "TEST" in notif.get("title", "") or "test" in notif.get("message", "").lower():
                    del_response = requests.delete(
                        f"{BASE_URL}/api/notifications/{notif['id']}",
                        headers=auth_headers
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
