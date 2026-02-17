"""
Test MCCB Report Section 5 and Section 6 functionality
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://erp-zoho-sync.preview.emergentagent.com')

class TestMCCBSections:
    """Test MCCB Section 5 (Micrologic Trip Test) and Section 6 (Carbon Test Report)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"Login successful, token obtained")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_mccb_template_has_sections(self):
        """Test that MCCB template is available"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/mccb")
        assert response.status_code == 200, f"Failed to get MCCB template: {response.status_code}"
        
        template = response.json()
        assert template.get('equipment_type') == 'mccb', "Template should be for MCCB"
        print(f"MCCB template loaded: {template.get('title')}")
    
    def test_create_mccb_report_with_section5_and_section6(self):
        """Test creating MCCB report with Section 5 and Section 6 data"""
        
        # Create MCCB report with Section 5 and Section 6 data
        report_data = {
            "report_type": "Periodical Maintenance",
            "report_date": "2026-01-17",
            "equipment_type": "mccb",
            "report_category": "equipment",
            "customer_info": {
                "company_name": "Test Company MCCB",
                "site_location": "Test Location",
                "project_name": "MCCB Test Project"
            },
            "service_provider": {
                "company_name": "Enerzia Power Solutions",
                "engineer_name": "Test Engineer"
            },
            "date_of_testing": "2026-01-17",
            "mccb_section_toggles": {
                "detailed_checklist": True,
                "insulation_resistance_test": True,
                "coil_resistance_test": True,
                "contact_resistance_test": True,
                "micrologic_trip_test": True,
                "carbon_test_report": True
            },
            "micrologic_trip_test": {
                "switchboard_details": {
                    "report_no": "MCCB-TEST-001",
                    "test_conducted_on": "2026-01-17",
                    "location": "Test Location",
                    "panel_name": "Test Panel",
                    "feeder_name": "Test Feeder"
                },
                "breaker_details": {
                    "product_type": "MCCB 400A",
                    "manufacturer": "Schneider",
                    "rated_current": "400A"
                },
                "trip_unit_details": {
                    "release_model": "Micrologic 5.0",
                    "release_type": "Electronic",
                    "serial_no": "SN123456"
                },
                "protection_settings": {
                    "long_time_pickup_ir": "0.8",
                    "long_time_delay_tr": "10s",
                    "short_time_pickup_isd": "5",
                    "short_time_delay_tsd": "0.1s",
                    "instantaneous_pickup_ii": "10",
                    "ground_fault_pickup_ig": "0.3",
                    "ground_fault_delay_tg": "0.2s"
                },
                "test_results": [
                    {"protection": "Long time", "injected_current": "800A", "expected_min_time": "8s", "expected_max_time": "12s", "actual_trip_time": "10s", "result": "PASS"},
                    {"protection": "Short time", "injected_current": "2000A", "expected_min_time": "0.08s", "expected_max_time": "0.12s", "actual_trip_time": "0.1s", "result": "PASS"},
                    {"protection": "Instantaneous", "injected_current": "4000A", "expected_min_time": "0.01s", "expected_max_time": "0.05s", "actual_trip_time": "0.02s", "result": "PASS"},
                    {"protection": "Ground fault", "injected_current": "120A", "expected_min_time": "0.15s", "expected_max_time": "0.25s", "actual_trip_time": "0.2s", "result": "PASS"}
                ],
                "remarks": "All tests passed successfully"
            },
            "carbon_test_report": {
                "description": "Carbon test completed. No significant wear observed.",
                "images": []
            },
            "overall_result": "Satisfactory",
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code in [200, 201], f"Failed to create MCCB report: {response.status_code} - {response.text}"
        
        created_report = response.json()
        report_id = created_report.get('id')
        assert report_id, "Report ID should be returned"
        print(f"Created MCCB report with ID: {report_id}")
        
        # Verify the report was saved with Section 5 and Section 6 data
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 200, f"Failed to get created report: {get_response.status_code}"
        
        saved_report = get_response.json()
        
        # Verify mccb_section_toggles
        toggles = saved_report.get('mccb_section_toggles', {})
        assert toggles.get('micrologic_trip_test') == True, "micrologic_trip_test toggle should be True"
        assert toggles.get('carbon_test_report') == True, "carbon_test_report toggle should be True"
        print("✓ MCCB section toggles saved correctly")
        
        # Verify micrologic_trip_test data
        micrologic = saved_report.get('micrologic_trip_test', {})
        assert micrologic.get('switchboard_details', {}).get('report_no') == "MCCB-TEST-001", "Switchboard report_no should be saved"
        assert micrologic.get('breaker_details', {}).get('product_type') == "MCCB 400A", "Breaker product_type should be saved"
        print("✓ Section 5 (Micrologic Trip Test) data saved correctly")
        
        # Verify carbon_test_report data
        carbon = saved_report.get('carbon_test_report', {})
        assert carbon.get('description') == "Carbon test completed. No significant wear observed.", "Carbon test description should be saved"
        print("✓ Section 6 (Carbon Test Report) data saved correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")
    
    def test_mccb_pdf_generation_with_sections(self):
        """Test that MCCB PDF includes Section 5 and Section 6"""
        
        # First create a report
        report_data = {
            "report_type": "Periodical Maintenance",
            "report_date": "2026-01-17",
            "equipment_type": "mccb",
            "report_category": "equipment",
            "customer_info": {
                "company_name": "Test Company MCCB PDF",
                "site_location": "Test Location"
            },
            "mccb_section_toggles": {
                "detailed_checklist": True,
                "insulation_resistance_test": True,
                "coil_resistance_test": True,
                "contact_resistance_test": True,
                "micrologic_trip_test": True,
                "carbon_test_report": True
            },
            "micrologic_trip_test": {
                "switchboard_details": {
                    "report_no": "MCCB-PDF-TEST",
                    "location": "PDF Test Location"
                },
                "breaker_details": {
                    "product_type": "MCCB 250A"
                },
                "test_results": [
                    {"protection": "Long time", "injected_current": "500A", "result": "PASS"}
                ]
            },
            "carbon_test_report": {
                "description": "PDF test carbon description"
            },
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code in [200, 201], f"Failed to create report: {response.status_code}"
        
        report_id = response.json().get('id')
        print(f"Created MCCB report for PDF test: {report_id}")
        
        # Test PDF generation - correct endpoint: /api/equipment-report/{equipment_type}/{report_id}/pdf
        pdf_response = self.session.get(f"{BASE_URL}/api/equipment-report/mccb/{report_id}/pdf")
        
        assert pdf_response.status_code == 200, f"Failed to generate PDF: {pdf_response.status_code} - {pdf_response.text}"
        assert 'application/pdf' in pdf_response.headers.get('content-type', ''), "Response should be PDF"
        
        # Check PDF size (should be reasonable)
        pdf_size = len(pdf_response.content)
        assert pdf_size > 1000, f"PDF seems too small: {pdf_size} bytes"
        print(f"✓ MCCB PDF generated successfully, size: {pdf_size} bytes")
        
        # Cleanup - delete the test report
        delete_response = self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")
        print(f"Cleanup: Deleted test report {report_id}")
    
    def test_mccb_section_toggles_disable(self):
        """Test that disabling Section 5 and 6 toggles works"""
        
        # Create MCCB report with sections disabled
        report_data = {
            "report_type": "Periodical Maintenance",
            "report_date": "2026-01-17",
            "equipment_type": "mccb",
            "report_category": "equipment",
            "customer_info": {
                "company_name": "Test Company MCCB Disabled",
                "site_location": "Test Location"
            },
            "mccb_section_toggles": {
                "detailed_checklist": True,
                "insulation_resistance_test": True,
                "coil_resistance_test": True,
                "contact_resistance_test": True,
                "micrologic_trip_test": False,  # Disabled
                "carbon_test_report": False     # Disabled
            },
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code in [200, 201], f"Failed to create report: {response.status_code}"
        
        report_id = response.json().get('id')
        
        # Verify toggles are saved as disabled
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        saved_report = get_response.json()
        
        toggles = saved_report.get('mccb_section_toggles', {})
        assert toggles.get('micrologic_trip_test') == False, "micrologic_trip_test should be False"
        assert toggles.get('carbon_test_report') == False, "carbon_test_report should be False"
        print("✓ Section toggles can be disabled correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
