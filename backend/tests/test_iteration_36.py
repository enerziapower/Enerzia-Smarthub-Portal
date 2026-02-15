"""
Test Suite for Iteration 36 - Dashboard Company Overview, Attendance, Journey, Navigation
Tests: Dashboard API, Attendance Check-in/Check-out, Journey API
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardCompanyOverview:
    """Test Dashboard Company Overview - fetches announcements, events, holidays from admin APIs"""
    
    def test_admin_dashboard_data_endpoint(self):
        """Test GET /api/admin/dashboard-data returns announcements, events, holidays"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard-data")
        assert response.status_code == 200
        
        data = response.json()
        assert "announcements" in data
        assert "events" in data
        assert "holidays" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "totalAnnouncements" in stats
        assert "highPriorityAnnouncements" in stats
        assert "upcomingEvents" in stats
        assert "upcomingHolidays" in stats
        print(f"Dashboard data: {len(data['announcements'])} announcements, {len(data['events'])} events, {len(data['holidays'])} holidays")


class TestEmployeeAttendance:
    """Test Employee Attendance - Check-in, Check-out, Calendar view"""
    
    def test_get_attendance_records(self):
        """Test GET /api/employee/attendance/{user_id} returns attendance records"""
        user_id = "test-attendance-user"
        month = datetime.now().month
        year = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/employee/attendance/{user_id}",
            params={"month": month, "year": year}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "records" in data
        assert "summary" in data
        assert "month" in data
        assert "year" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "present" in summary
        assert "absent" in summary
        assert "halfDays" in summary
        assert "onLeave" in summary
        assert "totalDays" in summary
        print(f"Attendance summary: {summary}")
    
    def test_check_in(self):
        """Test POST /api/employee/attendance/check-in"""
        user_id = "TEST_checkin_user_36"
        user_name = "Test CheckIn User"
        
        response = requests.post(
            f"{BASE_URL}/api/employee/attendance/check-in",
            params={"user_id": user_id, "user_name": user_name}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "record" in data
        
        record = data["record"]
        assert record["user_id"] == user_id
        assert record["user_name"] == user_name
        assert record["check_in"] is not None
        assert record["status"] == "present"
        print(f"Check-in successful: {record['check_in']}")
    
    def test_check_out(self):
        """Test POST /api/employee/attendance/check-out"""
        user_id = "TEST_checkin_user_36"
        
        response = requests.post(
            f"{BASE_URL}/api/employee/attendance/check-out",
            params={"user_id": user_id}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"Check-out response: {data['message']}")


class TestEmployeeJourney:
    """Test Employee Journey - Career milestones, promotions, awards, certifications"""
    
    def test_get_journey_with_valid_user(self):
        """Test GET /api/employee/journey/{user_id} returns journey data"""
        user_id = "test-journey-user"
        
        response = requests.get(f"{BASE_URL}/api/employee/journey/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "joinDate" in data
        assert "yearsWithCompany" in data
        assert "currentRole" in data
        assert "department" in data
        assert "totalProjects" in data
        assert "promotions" in data
        assert "awards" in data
        assert "certifications" in data
        assert "milestones" in data
        
        # Verify data types
        assert isinstance(data["promotions"], list)
        assert isinstance(data["awards"], list)
        assert isinstance(data["certifications"], list)
        assert isinstance(data["milestones"], list)
        
        print(f"Journey data: {data['yearsWithCompany']} years, {len(data['promotions'])} promotions, {len(data['awards'])} awards")
    
    def test_get_journey_with_invalid_objectid(self):
        """Test GET /api/employee/journey/{user_id} handles invalid ObjectId gracefully"""
        user_id = "invalid-user-id-123"
        
        response = requests.get(f"{BASE_URL}/api/employee/journey/{user_id}")
        # Should return 200 with default data, not 500
        assert response.status_code == 200
        
        data = response.json()
        assert "joinDate" in data
        print("Journey API handles invalid ObjectId gracefully")


class TestExistingEmployeeHubFeatures:
    """Test existing Employee Hub features still work"""
    
    def test_overtime_requests(self):
        """Test GET /api/employee/overtime"""
        response = requests.get(f"{BASE_URL}/api/employee/overtime")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Overtime requests: {len(data['requests'])} found")
    
    def test_permission_requests(self):
        """Test GET /api/employee/permission"""
        response = requests.get(f"{BASE_URL}/api/employee/permission")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Permission requests: {len(data['requests'])} found")
    
    def test_transport_requests(self):
        """Test GET /api/employee/transport"""
        response = requests.get(f"{BASE_URL}/api/employee/transport")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Transport requests: {len(data['requests'])} found")
    
    def test_leave_requests(self):
        """Test GET /api/employee/leave"""
        response = requests.get(f"{BASE_URL}/api/employee/leave")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Leave requests: {len(data['requests'])} found")
    
    def test_expense_claims(self):
        """Test GET /api/employee/expenses"""
        response = requests.get(f"{BASE_URL}/api/employee/expenses")
        assert response.status_code == 200
        data = response.json()
        assert "claims" in data
        print(f"Expense claims: {len(data['claims'])} found")
    
    def test_leave_balance(self):
        """Test GET /api/employee/leave/balance/{user_id}"""
        user_id = "test-user"
        response = requests.get(f"{BASE_URL}/api/employee/leave/balance/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        
        balance = data["balance"]
        assert "casual" in balance
        assert "sick" in balance
        assert "earned" in balance
        print(f"Leave balance: casual={balance['casual']['balance']}, sick={balance['sick']['balance']}")


class TestAdminAPIs:
    """Test Admin APIs for announcements, events, holidays"""
    
    def test_get_announcements(self):
        """Test GET /api/admin/announcements"""
        response = requests.get(f"{BASE_URL}/api/admin/announcements")
        assert response.status_code == 200
        data = response.json()
        assert "announcements" in data
        print(f"Announcements: {len(data['announcements'])} found")
    
    def test_get_events(self):
        """Test GET /api/admin/events"""
        response = requests.get(f"{BASE_URL}/api/admin/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"Events: {len(data['events'])} found")
    
    def test_get_holidays(self):
        """Test GET /api/admin/holidays"""
        response = requests.get(f"{BASE_URL}/api/admin/holidays")
        assert response.status_code == 200
        data = response.json()
        assert "holidays" in data
        print(f"Holidays: {len(data['holidays'])} found")
    
    def test_get_upcoming_events(self):
        """Test GET /api/admin/events/upcoming"""
        response = requests.get(f"{BASE_URL}/api/admin/events/upcoming")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        print(f"Upcoming events: {len(data['events'])} found")
    
    def test_get_upcoming_holidays(self):
        """Test GET /api/admin/holidays/upcoming"""
        response = requests.get(f"{BASE_URL}/api/admin/holidays/upcoming")
        assert response.status_code == 200
        data = response.json()
        assert "holidays" in data
        print(f"Upcoming holidays: {len(data['holidays'])} found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
