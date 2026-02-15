"""
Test P0 (Backend Refactoring) and P1 (AMC/Audit/Other Reports) Features
Tests modular routes and report_category filtering
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


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestP0ModularProjectsRoutes:
    """Test P0 - Backend refactoring: Projects routes from modular file"""
    
    def test_projects_list(self, auth_headers):
        """GET /api/projects - List all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Projects list returned {len(data)} projects")
    
    def test_projects_next_pid(self, auth_headers):
        """GET /api/projects/next-pid - Get next PID"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "next_pid" in data
        assert "financial_year" in data
        assert data["next_pid"].startswith("PID/")
        print(f"✓ Next PID: {data['next_pid']} for FY {data['financial_year']}")
    
    def test_projects_next_pid_with_custom_fy(self, auth_headers):
        """GET /api/projects/next-pid?financial_year=24-25 - Get next PID for specific FY"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid?financial_year=24-25", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "next_pid" in data
        assert "24-25" in data["next_pid"]
        print(f"✓ Next PID for FY 24-25: {data['next_pid']}")


class TestP0ModularDashboardRoutes:
    """Test P0 - Backend refactoring: Dashboard routes from modular file"""
    
    def test_dashboard_stats(self, auth_headers):
        """GET /api/dashboard/stats - Dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_projects" in data
        assert "total_billing" in data
        assert "active_projects" in data
        assert "category_breakdown" in data
        assert "status_breakdown" in data
        print(f"✓ Dashboard stats: {data['total_projects']} projects, ₹{data['total_billing']:,.0f} billing")
    
    def test_dashboard_this_week_breakdown(self, auth_headers):
        """GET /api/dashboard/this-week-breakdown - This week billing breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/this-week-breakdown", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "count" in data
        assert "projects" in data
        print(f"✓ This week breakdown: ₹{data['total']:,.0f} from {data['count']} projects")
    
    def test_dashboard_active_projects_breakdown(self, auth_headers):
        """GET /api/dashboard/active-projects-breakdown - Active projects breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/active-projects-breakdown", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "projects" in data
        print(f"✓ Active projects breakdown: {data['total']} ongoing projects")
    
    def test_dashboard_total_billing_breakdown(self, auth_headers):
        """GET /api/dashboard/total-billing-breakdown - Total billing breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/total-billing-breakdown", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_po_amount" in data
        assert "total_invoiced" in data
        assert "total_balance" in data
        print(f"✓ Total billing: PO ₹{data['total_po_amount']:,.0f}, Invoiced ₹{data['total_invoiced']:,.0f}")


class TestP1TestReportsWithCategory:
    """Test P1 - Test Reports API with report_category filtering"""
    
    def test_get_all_test_reports(self, auth_headers):
        """GET /api/test-reports - Get all test reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Test reports returned {len(data)} reports")
    
    def test_filter_by_amc_category(self, auth_headers):
        """GET /api/test-reports?report_category=amc - Filter AMC reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=amc", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned reports have report_category=amc
        for report in data:
            assert report.get("report_category") == "amc", f"Expected amc, got {report.get('report_category')}"
        print(f"✓ AMC reports filter returned {len(data)} reports")
    
    def test_filter_by_audit_category(self, auth_headers):
        """GET /api/test-reports?report_category=audit - Filter Audit reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=audit", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for report in data:
            assert report.get("report_category") == "audit", f"Expected audit, got {report.get('report_category')}"
        print(f"✓ Audit reports filter returned {len(data)} reports")
    
    def test_filter_by_other_category(self, auth_headers):
        """GET /api/test-reports?report_category=other - Filter Other reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=other", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for report in data:
            assert report.get("report_category") == "other", f"Expected other, got {report.get('report_category')}"
        print(f"✓ Other reports filter returned {len(data)} reports")


class TestP1CreateAMCReport:
    """Test P1 - Create AMC Report"""
    
    def test_create_amc_report(self, auth_headers):
        """POST /api/test-reports - Create AMC report with report_category"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "equipment_type": "amc",
            "report_category": "amc",
            "customer_name": f"TEST_AMC_Customer_{test_id}",
            "location": "Test Location",
            "visit_date": datetime.now().strftime("%Y-%m-%d"),
            "amc_contract_no": f"AMC-TEST-{test_id}",
            "service_engineer": "Test Engineer",
            "work_performed": "Test maintenance work",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/test-reports", json=payload, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify create response has id and report_no
        assert "id" in data
        assert data.get("report_no", "").startswith("AMC/")
        report_id = data.get("id")
        
        print(f"✓ Created AMC report: {data.get('report_no')} with ID {report_id}")
        
        # Fetch the report to verify report_category was saved correctly
        get_response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
        assert get_response.status_code == 200, f"Failed to fetch report: {get_response.status_code}"
        fetched_data = get_response.json()
        
        # Verify report_category is correctly saved
        assert fetched_data.get("report_category") == "amc", f"Expected amc, got {fetched_data.get('report_category')}"
        assert fetched_data.get("equipment_type") == "amc"
        assert fetched_data.get("customer_name") == f"TEST_AMC_Customer_{test_id}"
        print(f"  ✓ Verified report_category=amc in database")
        
        # Cleanup - delete the test report
        if report_id:
            delete_response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
            print(f"  Cleanup: Deleted test report (status: {delete_response.status_code})")


class TestP1CreateAuditReport:
    """Test P1 - Create Audit Report"""
    
    def test_create_audit_report(self, auth_headers):
        """POST /api/test-reports - Create Audit report with report_category"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "equipment_type": "audit",
            "report_category": "audit",
            "audit_type": "electrical-safety",
            "customer_name": f"TEST_Audit_Customer_{test_id}",
            "location": "Test Audit Location",
            "audit_date": datetime.now().strftime("%Y-%m-%d"),
            "auditor_name": "Test Auditor",
            "scope_of_audit": "Test audit scope",
            "overall_rating": "satisfactory",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/test-reports", json=payload, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify create response
        assert "id" in data
        assert data.get("report_no", "").startswith("AUD/")
        report_id = data.get("id")
        
        print(f"✓ Created Audit report: {data.get('report_no')} with ID {report_id}")
        
        # Fetch the report to verify report_category was saved correctly
        get_response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
        assert get_response.status_code == 200, f"Failed to fetch report: {get_response.status_code}"
        fetched_data = get_response.json()
        
        # Verify report_category is correctly saved
        assert fetched_data.get("report_category") == "audit", f"Expected audit, got {fetched_data.get('report_category')}"
        assert fetched_data.get("equipment_type") == "audit"
        assert fetched_data.get("audit_type") == "electrical-safety"
        print(f"  ✓ Verified report_category=audit in database")
        
        # Cleanup
        if report_id:
            delete_response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
            print(f"  Cleanup: Deleted test report (status: {delete_response.status_code})")


class TestP1CreateOtherReport:
    """Test P1 - Create Other Report"""
    
    def test_create_other_report(self, auth_headers):
        """POST /api/test-reports - Create Other report with report_category"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "equipment_type": "other",
            "report_category": "other",
            "title": f"TEST_Other_Report_{test_id}",
            "customer_name": f"TEST_Other_Customer_{test_id}",
            "location": "Test Other Location",
            "report_date": datetime.now().strftime("%Y-%m-%d"),
            "prepared_by": "Test Preparer",
            "description": "Test report description",
            "findings": "Test findings",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/test-reports", json=payload, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify create response
        assert "id" in data
        assert data.get("report_no", "").startswith("OTH/")
        report_id = data.get("id")
        
        print(f"✓ Created Other report: {data.get('report_no')} with ID {report_id}")
        
        # Fetch the report to verify report_category was saved correctly
        get_response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
        assert get_response.status_code == 200, f"Failed to fetch report: {get_response.status_code}"
        fetched_data = get_response.json()
        
        # Verify report_category is correctly saved
        assert fetched_data.get("report_category") == "other", f"Expected other, got {fetched_data.get('report_category')}"
        assert fetched_data.get("equipment_type") == "other"
        assert fetched_data.get("title") == f"TEST_Other_Report_{test_id}"
        print(f"  ✓ Verified report_category=other in database")
        
        # Cleanup
        if report_id:
            delete_response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
            print(f"  Cleanup: Deleted test report (status: {delete_response.status_code})")


class TestP3PIDPreviewFix:
    """Test P3 - PID Preview Fix: Financial year change should update PID"""
    
    def test_pid_changes_with_financial_year(self, auth_headers):
        """Verify PID changes when financial year is changed"""
        # Get PID for current FY
        response1 = requests.get(f"{BASE_URL}/api/projects/next-pid", headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        current_fy = data1["financial_year"]
        current_pid = data1["next_pid"]
        
        # Get PID for different FY (24-25)
        response2 = requests.get(f"{BASE_URL}/api/projects/next-pid?financial_year=24-25", headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Get PID for another FY (23-24)
        response3 = requests.get(f"{BASE_URL}/api/projects/next-pid?financial_year=23-24", headers=auth_headers)
        assert response3.status_code == 200
        data3 = response3.json()
        
        # Verify PIDs are different for different FYs
        assert "24-25" in data2["next_pid"]
        assert "23-24" in data3["next_pid"]
        
        print(f"✓ PID changes with FY:")
        print(f"  Current FY ({current_fy}): {current_pid}")
        print(f"  FY 24-25: {data2['next_pid']}")
        print(f"  FY 23-24: {data3['next_pid']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
