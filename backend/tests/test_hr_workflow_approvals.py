"""
Test HR Workflow Approvals - Leave, Overtime, Permission
Tests the fix for broken HR workflow integration between 'My Workspace' (employee self-service) and 'HR & Admin' modules.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLeaveWorkflow:
    """Test Leave Request submission and approval flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.test_user_name = "Test Employee"
        self.test_department = "Projects"
        self.created_leave_ids = []
        yield
        # Cleanup - delete test leave requests
        for leave_id in self.created_leave_ids:
            try:
                # Try to delete via reject (which changes status)
                pass
            except:
                pass
    
    def test_create_leave_request(self):
        """Test employee can submit a leave request"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "Casual Leave",
            "from_date": tomorrow,
            "to_date": day_after,
            "reason": "Test leave request for workflow testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create leave request: {response.text}"
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        assert data["request"]["type"] == "Casual Leave"
        assert "id" in data["request"]
        
        self.created_leave_ids.append(data["request"]["id"])
        return data["request"]["id"]
    
    def test_get_pending_leave_requests(self):
        """Test fetching pending leave requests"""
        response = requests.get(
            f"{BASE_URL}/api/employee/leave",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        # Should return a list
        assert isinstance(data["requests"], list)
    
    def test_approve_leave_request_via_employee_hub(self):
        """Test approving leave request via /api/employee/leave/{id}/approve endpoint"""
        # First create a leave request
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "Sick Leave",
            "from_date": tomorrow,
            "to_date": day_after,
            "reason": "Test leave for approval testing"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        leave_id = create_response.json()["request"]["id"]
        self.created_leave_ids.append(leave_id)
        
        # Now approve the leave request using the string ID
        approve_response = requests.put(
            f"{BASE_URL}/api/employee/leave/{leave_id}/approve",
            params={"approved_by": "HR Admin Test"}
        )
        
        assert approve_response.status_code == 200, f"Failed to approve leave: {approve_response.text}"
        assert "approved" in approve_response.json()["message"].lower()
    
    def test_reject_leave_request(self):
        """Test rejecting leave request"""
        # First create a leave request
        tomorrow = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "Earned Leave",
            "from_date": tomorrow,
            "to_date": day_after,
            "reason": "Test leave for rejection testing"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        leave_id = create_response.json()["request"]["id"]
        self.created_leave_ids.append(leave_id)
        
        # Now reject the leave request
        reject_response = requests.put(
            f"{BASE_URL}/api/employee/leave/{leave_id}/reject",
            params={"approved_by": "HR Admin Test"}
        )
        
        assert reject_response.status_code == 200, f"Failed to reject leave: {reject_response.text}"
        assert "rejected" in reject_response.json()["message"].lower()
    
    def test_hr_leave_requests_endpoint(self):
        """Test HR can fetch all leave requests"""
        response = requests.get(f"{BASE_URL}/api/hr/leave/requests")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestOvertimeWorkflow:
    """Test Overtime Request submission and approval flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test_ot_user_{uuid.uuid4().hex[:8]}"
        self.test_user_name = "Test OT Employee"
        self.test_department = "Projects"
        self.created_ot_ids = []
        yield
    
    def test_create_overtime_request(self):
        """Test employee can submit an overtime request"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        payload = {
            "date": today,
            "hours": 2.5,
            "reason": "Project deadline - testing workflow",
            "project": "Test Project"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/overtime",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create overtime request: {response.text}"
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        assert data["request"]["hours"] == 2.5
        assert "id" in data["request"]
        
        self.created_ot_ids.append(data["request"]["id"])
        return data["request"]["id"]
    
    def test_get_overtime_requests(self):
        """Test fetching overtime requests"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/hr/overtime",
            params={"month": current_month, "year": current_year}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_approve_overtime_request(self):
        """Test HR can approve overtime request"""
        # First create an overtime request
        today = datetime.now().strftime("%Y-%m-%d")
        
        payload = {
            "date": today,
            "hours": 3.0,
            "reason": "Urgent maintenance - approval test",
            "project": "Maintenance"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/overtime",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        ot_id = create_response.json()["request"]["id"]
        self.created_ot_ids.append(ot_id)
        
        # Now approve the overtime request
        approve_response = requests.put(f"{BASE_URL}/api/hr/overtime/{ot_id}/approve")
        
        assert approve_response.status_code == 200, f"Failed to approve overtime: {approve_response.text}"
        assert "approved" in approve_response.json()["message"].lower()
    
    def test_reject_overtime_request(self):
        """Test HR can reject overtime request"""
        # First create an overtime request
        today = datetime.now().strftime("%Y-%m-%d")
        
        payload = {
            "date": today,
            "hours": 1.5,
            "reason": "Extra work - rejection test",
            "project": "Test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/overtime",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        ot_id = create_response.json()["request"]["id"]
        self.created_ot_ids.append(ot_id)
        
        # Now reject the overtime request
        reject_response = requests.put(f"{BASE_URL}/api/hr/overtime/{ot_id}/reject")
        
        assert reject_response.status_code == 200, f"Failed to reject overtime: {reject_response.text}"
        assert "rejected" in reject_response.json()["message"].lower()


class TestPermissionWorkflow:
    """Test Permission Request submission and approval flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test_perm_user_{uuid.uuid4().hex[:8]}"
        self.test_user_name = "Test Permission Employee"
        self.test_department = "Sales"
        self.created_perm_ids = []
        yield
    
    def test_create_permission_request(self):
        """Test employee can submit a permission request"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "date": tomorrow,
            "type": "Late Coming",
            "time": "10:30",
            "duration": "1 hour",
            "reason": "Doctor appointment - testing workflow"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/employee/permission",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create permission request: {response.text}"
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        assert data["request"]["type"] == "Late Coming"
        assert "id" in data["request"]
        
        self.created_perm_ids.append(data["request"]["id"])
        return data["request"]["id"]
    
    def test_get_permission_requests(self):
        """Test fetching permission requests"""
        response = requests.get(
            f"{BASE_URL}/api/employee/permission",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_approve_permission_request(self):
        """Test approving permission request"""
        # First create a permission request
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        payload = {
            "date": tomorrow,
            "type": "Early Leaving",
            "time": "16:00",
            "duration": "2 hours",
            "reason": "Family event - approval test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/permission",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        perm_id = create_response.json()["request"]["id"]
        self.created_perm_ids.append(perm_id)
        
        # Now approve the permission request using the string ID
        approve_response = requests.put(
            f"{BASE_URL}/api/employee/permission/{perm_id}/approve",
            params={"approved_by": "HR Admin Test"}
        )
        
        assert approve_response.status_code == 200, f"Failed to approve permission: {approve_response.text}"
        assert "approved" in approve_response.json()["message"].lower()
    
    def test_reject_permission_request(self):
        """Test rejecting permission request"""
        # First create a permission request
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        payload = {
            "date": tomorrow,
            "type": "Short Leave",
            "time": "14:00",
            "duration": "3 hours",
            "reason": "Personal work - rejection test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/permission",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        perm_id = create_response.json()["request"]["id"]
        self.created_perm_ids.append(perm_id)
        
        # Now reject the permission request
        reject_response = requests.put(
            f"{BASE_URL}/api/employee/permission/{perm_id}/reject",
            params={"approved_by": "HR Admin Test"}
        )
        
        assert reject_response.status_code == 200, f"Failed to reject permission: {reject_response.text}"
        assert "rejected" in reject_response.json()["message"].lower()


class TestHRLeaveApprovalEndpoint:
    """Test HR-specific leave approval endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_user_id = f"test_hr_leave_{uuid.uuid4().hex[:8]}"
        self.test_user_name = "Test HR Leave Employee"
        self.test_department = "HR"
        self.created_leave_ids = []
        yield
    
    def test_hr_approve_leave_endpoint(self):
        """Test HR can approve leave via /api/hr/leave/approve/{id} endpoint"""
        # First create a leave request
        tomorrow = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "Casual Leave",
            "from_date": tomorrow,
            "to_date": day_after,
            "reason": "Test leave for HR approval endpoint"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        leave_id = create_response.json()["request"]["id"]
        self.created_leave_ids.append(leave_id)
        
        # Now approve via HR endpoint
        approve_response = requests.post(
            f"{BASE_URL}/api/hr/leave/approve/{leave_id}",
            params={"approved_by": "HR Manager"}
        )
        
        assert approve_response.status_code == 200, f"Failed to approve via HR endpoint: {approve_response.text}"
        data = approve_response.json()
        assert "approved" in data["message"].lower()
    
    def test_hr_reject_leave_endpoint(self):
        """Test HR can reject leave via /api/hr/leave/reject/{id} endpoint"""
        # First create a leave request
        tomorrow = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d")
        day_after = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "Sick Leave",
            "from_date": tomorrow,
            "to_date": day_after,
            "reason": "Test leave for HR rejection endpoint"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/employee/leave",
            params={
                "user_id": self.test_user_id,
                "user_name": self.test_user_name,
                "department": self.test_department
            },
            json=payload
        )
        
        assert create_response.status_code == 200
        leave_id = create_response.json()["request"]["id"]
        self.created_leave_ids.append(leave_id)
        
        # Now reject via HR endpoint
        reject_response = requests.post(
            f"{BASE_URL}/api/hr/leave/reject/{leave_id}",
            params={"rejected_by": "HR Manager", "reason": "Insufficient leave balance"}
        )
        
        assert reject_response.status_code == 200, f"Failed to reject via HR endpoint: {reject_response.text}"
        data = reject_response.json()
        assert "rejected" in data["message"].lower()


class TestLeaveDashboard:
    """Test Leave Dashboard API"""
    
    def test_leave_dashboard_endpoint(self):
        """Test HR leave dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/hr/leave/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "department_breakdown" in data
        assert "leave_type_breakdown" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
