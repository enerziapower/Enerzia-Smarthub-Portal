"""
Test AMC Service Reports Linking Feature
Tests the ability to link service reports to AMC service visits
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAMCServiceReportsLinking:
    """Test AMC Service Reports linking functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.amc_id = "b86200a3-163b-4638-8591-2ffc08b89637"
        self.linked_report_id = "a6b567fd-cf1a-4a4b-992c-e43967c0a070"
        
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get('token')
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_amc_with_service_report_ids(self):
        """Test that AMC returns service_report_ids in service visits"""
        response = requests.get(
            f"{BASE_URL}/api/amc/{self.amc_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        data = response.json()
        assert 'service_visits' in data, "service_visits field missing"
        assert len(data['service_visits']) > 0, "No service visits found"
        
        # Check first visit has service_report_ids
        first_visit = data['service_visits'][0]
        assert 'service_report_ids' in first_visit, "service_report_ids field missing in visit"
        assert isinstance(first_visit['service_report_ids'], list), "service_report_ids should be a list"
        
        # Verify the linked report is present
        assert self.linked_report_id in first_visit['service_report_ids'], \
            f"Expected linked report {self.linked_report_id} not found in service_report_ids"
        
        print(f"✓ AMC has {len(first_visit['service_report_ids'])} linked service reports")
    
    def test_get_test_reports_for_linking(self):
        """Test that test reports API returns reports for linking"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get test reports: {response.text}"
        
        data = response.json()
        reports = data if isinstance(data, list) else data.get('reports', [])
        assert len(reports) > 0, "No test reports found"
        
        # Verify the linked report exists
        linked_report = next((r for r in reports if r.get('id') == self.linked_report_id), None)
        assert linked_report is not None, f"Linked report {self.linked_report_id} not found in test reports"
        assert linked_report.get('report_no') == 'TRN/2026/0008', "Report number mismatch"
        
        print(f"✓ Found {len(reports)} test reports, linked report TRN/2026/0008 exists")
    
    def test_amc_pdf_generation(self):
        """Test that AMC PDF is generated successfully"""
        response = requests.get(
            f"{BASE_URL}/api/amc-report/{self.amc_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to generate PDF: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Response is not a PDF"
        
        # Check PDF size is reasonable (should be > 1KB)
        content_length = len(response.content)
        assert content_length > 1000, f"PDF too small: {content_length} bytes"
        
        # Verify it's a valid PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF', "Invalid PDF header"
        
        print(f"✓ PDF generated successfully, size: {content_length} bytes")
    
    def test_update_amc_with_service_report_ids(self):
        """Test updating AMC with new service_report_ids"""
        # First get current AMC data
        response = requests.get(
            f"{BASE_URL}/api/amc/{self.amc_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        amc_data = response.json()
        
        # Prepare update payload with existing service visits
        service_visits = amc_data.get('service_visits', [])
        if len(service_visits) > 0:
            # Keep existing service_report_ids
            original_ids = service_visits[0].get('service_report_ids', [])
            
            # Update AMC (no changes, just verify it works)
            update_payload = {
                "service_visits": service_visits
            }
            
            response = requests.put(
                f"{BASE_URL}/api/amc/{self.amc_id}",
                headers=self.headers,
                json=update_payload
            )
            assert response.status_code == 200, f"Failed to update AMC: {response.text}"
            
            # Verify service_report_ids persisted
            response = requests.get(
                f"{BASE_URL}/api/amc/{self.amc_id}",
                headers=self.headers
            )
            updated_data = response.json()
            updated_ids = updated_data['service_visits'][0].get('service_report_ids', [])
            assert updated_ids == original_ids, "service_report_ids not persisted after update"
            
            print(f"✓ AMC update preserves service_report_ids: {updated_ids}")
    
    def test_amc_list_endpoint(self):
        """Test AMC list endpoint returns AMCs"""
        response = requests.get(
            f"{BASE_URL}/api/amc",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get AMC list: {response.text}"
        
        data = response.json()
        amcs = data if isinstance(data, list) else data.get('amcs', [])
        assert len(amcs) > 0, "No AMCs found"
        
        # Find our test AMC
        test_amc = next((a for a in amcs if a.get('id') == self.amc_id), None)
        assert test_amc is not None, f"Test AMC {self.amc_id} not found in list"
        
        print(f"✓ AMC list contains {len(amcs)} AMCs")
    
    def test_service_report_details(self):
        """Test getting details of the linked service report"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{self.linked_report_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get report details: {response.text}"
        
        data = response.json()
        assert data.get('id') == self.linked_report_id, "Report ID mismatch"
        assert data.get('report_no') == 'TRN/2026/0008', "Report number mismatch"
        assert data.get('equipment_type') == 'transformer', "Equipment type mismatch"
        
        print(f"✓ Service report details: {data.get('report_no')} - {data.get('equipment_type')}")


class TestAMCServiceVisitFields:
    """Test AMC Service Visit model fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.amc_id = "b86200a3-163b-4638-8591-2ffc08b89637"
        
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        self.token = response.json().get('token')
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_service_visit_has_all_report_id_fields(self):
        """Test that service visit has all report ID fields"""
        response = requests.get(
            f"{BASE_URL}/api/amc/{self.amc_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        visit = data['service_visits'][0]
        
        # Check all report ID fields exist
        assert 'test_report_ids' in visit, "test_report_ids field missing"
        assert 'ir_thermography_report_ids' in visit, "ir_thermography_report_ids field missing"
        assert 'service_report_ids' in visit, "service_report_ids field missing"
        
        print(f"✓ Service visit has all report ID fields:")
        print(f"  - test_report_ids: {len(visit.get('test_report_ids', []))} reports")
        print(f"  - ir_thermography_report_ids: {len(visit.get('ir_thermography_report_ids', []))} reports")
        print(f"  - service_report_ids: {len(visit.get('service_report_ids', []))} reports")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
