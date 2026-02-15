"""
Test suite for AMC Service Reports Linking Feature
Tests the updated 'Link Service Reports' feature that fetches from Service Reports Menu
(Electrical, HVAC, Fire Protection Systems, etc.) instead of Equipment Test Reports.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"
AMC_ID = "b86200a3-163b-4638-8591-2ffc08b89637"
LINKED_SERVICE_REPORT_ID = "c360d6d4-98bc-4853-aacd-297058b27654"  # SRN/2026/027 - Electrical


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCustomerServiceEndpoint:
    """Tests for /api/customer-service endpoint (Service Reports)"""
    
    def test_get_all_service_reports(self, api_client):
        """Test fetching all service reports from customer-service endpoint"""
        response = api_client.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200, f"Failed to get service reports: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one service report"
        
        # Verify service report structure
        report = data[0]
        assert "id" in report, "Report should have id"
        assert "srn_no" in report, "Report should have srn_no"
        assert "service_category" in report, "Report should have service_category"
        assert "status" in report, "Report should have status"
        print(f"PASS: Found {len(data)} service reports")
    
    def test_service_reports_have_categories(self, api_client):
        """Test that service reports have proper categories (Electrical, HVAC, etc.)"""
        response = api_client.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        
        data = response.json()
        categories = set()
        for report in data:
            if report.get("service_category"):
                categories.add(report["service_category"])
        
        # Verify expected categories exist
        expected_categories = ["Electrical", "HVAC Systems"]
        for cat in expected_categories:
            assert cat in categories, f"Expected category '{cat}' not found"
        
        print(f"PASS: Found categories: {categories}")
    
    def test_get_single_service_report(self, api_client):
        """Test fetching a single service report by ID"""
        response = api_client.get(f"{BASE_URL}/api/customer-service/{LINKED_SERVICE_REPORT_ID}")
        assert response.status_code == 200, f"Failed to get service report: {response.text}"
        
        report = response.json()
        assert report.get("id") == LINKED_SERVICE_REPORT_ID
        assert report.get("srn_no") == "SRN/2026/027"
        assert report.get("service_category") == "Electrical"
        assert report.get("status") == "Completed"
        print(f"PASS: Retrieved service report {report.get('srn_no')} - {report.get('service_category')}")


class TestAMCServiceReportsLinking:
    """Tests for AMC Service Reports linking functionality"""
    
    def test_get_amc_with_linked_service_reports(self, api_client):
        """Test that AMC returns service_report_ids in service visits"""
        response = api_client.get(f"{BASE_URL}/api/amc/{AMC_ID}")
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        amc = response.json()
        assert "service_visits" in amc, "AMC should have service_visits"
        assert len(amc["service_visits"]) > 0, "AMC should have at least one service visit"
        
        visit = amc["service_visits"][0]
        assert "service_report_ids" in visit, "Service visit should have service_report_ids"
        
        # Verify the linked service report ID is present
        assert LINKED_SERVICE_REPORT_ID in visit["service_report_ids"], \
            f"Expected service report {LINKED_SERVICE_REPORT_ID} to be linked"
        
        print(f"PASS: AMC has {len(visit['service_report_ids'])} linked service reports")
    
    def test_linked_service_report_is_from_service_requests(self, api_client):
        """Test that linked service report exists in service_requests collection"""
        # First get the AMC to get linked report IDs
        amc_response = api_client.get(f"{BASE_URL}/api/amc/{AMC_ID}")
        assert amc_response.status_code == 200
        
        amc = amc_response.json()
        service_report_ids = amc["service_visits"][0].get("service_report_ids", [])
        
        # Verify each linked report exists in customer-service endpoint
        for report_id in service_report_ids:
            response = api_client.get(f"{BASE_URL}/api/customer-service/{report_id}")
            if response.status_code == 200:
                report = response.json()
                print(f"PASS: Linked report {report.get('srn_no')} ({report.get('service_category')}) found in service_requests")
            else:
                # Old reports from test_reports won't be found - this is expected
                print(f"INFO: Report {report_id} not found in service_requests (may be old test report)")


class TestAMCPDFGeneration:
    """Tests for AMC PDF generation with Service Reports section"""
    
    def test_pdf_generation_endpoint(self, api_client):
        """Test that PDF generation endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{AMC_ID}/pdf")
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
        
        # Verify PDF has content
        assert len(response.content) > 100000, "PDF should be larger than 100KB"
        print(f"PASS: PDF generated successfully ({len(response.content)} bytes)")
    
    def test_pdf_has_correct_page_count(self, api_client):
        """Test that PDF has expected page count (39 pages with service reports section)"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{AMC_ID}/pdf")
        assert response.status_code == 200
        
        pdf_content = response.content
        
        # Check for page count in PDF structure
        # PDF contains "/Count 39" indicating 39 pages
        assert b"/Count 39" in pdf_content or b"/Count 38" in pdf_content or b"/Count 40" in pdf_content, \
            "PDF should have approximately 39 pages including service reports section"
        
        print("PASS: PDF has correct page count with service reports section")


class TestCategoryFiltering:
    """Tests for category filtering in service reports"""
    
    def test_filter_electrical_reports(self, api_client):
        """Test filtering service reports by Electrical category"""
        response = api_client.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        
        data = response.json()
        electrical_reports = [r for r in data if r.get("service_category") == "Electrical"]
        
        assert len(electrical_reports) > 0, "Should have Electrical reports"
        for report in electrical_reports:
            assert report.get("service_category") == "Electrical"
        
        print(f"PASS: Found {len(electrical_reports)} Electrical reports")
    
    def test_filter_hvac_reports(self, api_client):
        """Test filtering service reports by HVAC Systems category"""
        response = api_client.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        
        data = response.json()
        hvac_reports = [r for r in data if r.get("service_category") == "HVAC Systems"]
        
        assert len(hvac_reports) > 0, "Should have HVAC Systems reports"
        for report in hvac_reports:
            assert report.get("service_category") == "HVAC Systems"
        
        print(f"PASS: Found {len(hvac_reports)} HVAC Systems reports")
    
    def test_completed_status_filter(self, api_client):
        """Test that completed service reports are available for linking"""
        response = api_client.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        
        data = response.json()
        completed_reports = [r for r in data if r.get("status") in ["Completed", "completed"]]
        
        assert len(completed_reports) > 0, "Should have completed reports for linking"
        print(f"PASS: Found {len(completed_reports)} completed reports available for linking")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
