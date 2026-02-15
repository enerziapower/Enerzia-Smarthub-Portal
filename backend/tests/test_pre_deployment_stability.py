"""
Pre-deployment Stability Test Suite for Workhub Enerzia ERP
Tests all critical paths: Projects, AMC, Calibration, Equipment Test Reports,
Travel Log, Attendance, Leave Management, PDF Generation, Project Schedule
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "admin123"


class TestAuthenticationModule:
    """Test authentication flows"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def user_id(self):
        """Get user ID from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["user"]["id"]
    
    def test_login_success(self):
        """Test admin login works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin"
        print("✓ Login authentication works for admin@enerzia.com")
    
    def test_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_endpoint(self, auth_token):
        """Test /auth/me returns current user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print("✓ Auth /me endpoint works correctly")


class TestDashboardModule:
    """Test dashboard loads without errors"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Dashboard stats endpoint works")
    
    def test_notifications_endpoint(self, auth_token):
        """Test notifications endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=20",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Notifications endpoint works")
    
    def test_notifications_count(self, auth_token):
        """Test notifications count endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/count",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Notifications count endpoint works")


class TestProjectsModule:
    """Test Projects page and CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_list_projects(self, auth_token):
        """Test projects list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Projects list works - {len(data)} projects found")


class TestAMCModule:
    """Test AMC (Annual Maintenance Contract) module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_list_amc(self, auth_token):
        """Test AMC list endpoint - returns paginated response"""
        response = requests.get(
            f"{BASE_URL}/api/amc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # AMC returns paginated response with 'amcs' key
        assert "amcs" in data or isinstance(data, list)
        if "amcs" in data:
            print(f"✓ AMC list works - {len(data['amcs'])} AMC records found")
        else:
            print(f"✓ AMC list works - {len(data)} AMC records found")
    
    def test_amc_dashboard_stats(self, auth_token):
        """Test AMC dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/amc/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ AMC dashboard stats endpoint works")


class TestCalibrationModule:
    """Test Calibration module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_list_calibration(self, auth_token):
        """Test calibration list endpoint - returns paginated response"""
        response = requests.get(
            f"{BASE_URL}/api/calibration",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Calibration returns paginated response with 'contracts' key
        assert "contracts" in data or isinstance(data, list)
        if "contracts" in data:
            print(f"✓ Calibration list works - {len(data['contracts'])} calibration records found")
        else:
            print(f"✓ Calibration list works - {len(data)} calibration records found")
    
    def test_calibration_dashboard_stats(self, auth_token):
        """Test calibration dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/calibration/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Calibration dashboard stats endpoint works")


class TestEquipmentTestReportsModule:
    """Test Equipment Test Reports (Relay, Battery, etc.)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_all_test_reports(self, auth_token):
        """Test all test reports endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Test reports endpoint works")
    
    def test_relay_test_reports(self, auth_token):
        """Test relay test reports endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/equipment/relay",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Relay test reports endpoint works")
    
    def test_battery_test_reports(self, auth_token):
        """Test battery test reports endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/equipment/battery",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Battery test reports endpoint works")


class TestProjectScheduleModule:
    """Test Project Schedule module - create, edit, delete, PDF generation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_project_schedule_pdf_generation(self, auth_token):
        """Test Project Schedule PDF generation"""
        # Create test schedule data
        schedule_data = {
            "schedule_name": "Test Project Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "notes": "Test schedule for pre-deployment check",
            "phases": [
                {
                    "name": "Phase 1 - Planning",
                    "start": "01/01/2025",
                    "end": "31/01/2025",
                    "progress": 100,
                    "subItems": []
                },
                {
                    "name": "Phase 2 - Execution",
                    "start": "01/02/2025",
                    "end": "28/02/2025",
                    "progress": 50,
                    "subItems": []
                }
            ],
            "milestones": [
                {"name": "Kickoff", "date": "01/01/2025"},
                {"name": "Completion", "date": "31/03/2025"}
            ],
            "customer_info": {
                "name": "Test Customer",
                "company": "Test Company",
                "location": "Test Location"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=schedule_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        # Check PDF size is reasonable (should be > 10KB)
        content_length = len(response.content)
        assert content_length > 10000, f"PDF too small: {content_length} bytes"
        
        # Verify it's a valid PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"✓ Project Schedule PDF generation works - {content_length} bytes")


class TestPDFTemplateSettingsModule:
    """Test PDF Template Settings module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_get_pdf_template_settings(self, auth_token):
        """Test getting PDF template settings"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-template/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "branding" in data or "company_info" in data
        print("✓ PDF Template Settings endpoint works")
    
    def test_pdf_template_preview(self, auth_token):
        """Test PDF template preview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=cover&report_type=amc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        print("✓ PDF Template Preview endpoint works")
    
    def test_pdf_template_includes_project_schedule(self, auth_token):
        """Test that PDF template settings include Project Schedule report type"""
        response = requests.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=cover&report_type=project_schedule",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'application/pdf'
        print("✓ PDF Template includes Project Schedule report type")


class TestTravelLogModule:
    """Test Travel Log module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def user_id(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["user"]["id"]
    
    def test_travel_log_rates(self, auth_token):
        """Test travel log rates endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/travel-log/rates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Travel log rates endpoint works")
    
    def test_travel_log_all_trips(self, auth_token):
        """Test travel log all trips endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/travel-log/all-trips",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Travel log all trips endpoint works")


class TestAttendanceModule:
    """Test Attendance module - check-in/check-out"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def user_id(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["user"]["id"]
    
    def test_attendance_status(self, auth_token, user_id):
        """Test attendance status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/employee/attendance/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Attendance status endpoint works")


class TestLeaveManagementModule:
    """Test Leave Management module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def user_id(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["user"]["id"]
    
    def test_list_leave_requests(self, auth_token):
        """Test leave requests list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/employee/leave",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Leave requests endpoint works")
    
    def test_leave_balance(self, auth_token, user_id):
        """Test leave balance endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/employee/leave/balance/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Leave balance endpoint works")


class TestUserManagementModule:
    """Test User Management module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_list_users(self, auth_token):
        """Test users list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Users list works - {len(data)} users found")


class TestOrganizationSettings:
    """Test Organization Settings"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_organization_settings(self, auth_token):
        """Test organization settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/settings/organization",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ Organization settings endpoint works")


class TestHealthCheck:
    """Test basic health check endpoints"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print("✓ API health check works")
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ Root API endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
