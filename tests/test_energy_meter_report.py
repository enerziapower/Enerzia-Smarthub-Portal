"""
Test Energy Meter Report - Backend API Tests
Tests for the new Energy Meter report format with:
- Equipment Details
- Visual Inspection (TEST#1)
- Master Standard Details
- Test Results (Parameters table, Energy Reading table)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEnergyMeterReport:
    """Energy Meter Report API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get('token')
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_energy_meter_template_exists(self):
        """Test that Energy Meter template is available"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/templates/energy_meter",
            headers=self.headers
        )
        assert response.status_code == 200, f"Template fetch failed: {response.text}"
        
        template = response.json()
        assert template.get('equipment_type') == 'energy_meter'
        assert template.get('title') == 'ENERGY METER TEST REPORT'
        
        # Verify template has required sections
        assert 'equipment_details' in template
        assert 'visual_inspection' in template
        assert 'master_standard' in template
        assert 'test_results_config' in template
        assert 'energy_meter_section_toggles' in template
        
        print("PASS - Energy Meter template exists with all required sections")
    
    def test_get_existing_energy_meter_report(self):
        """Test fetching the existing Energy Meter report"""
        report_id = "66502ce9-79a8-484f-a650-54af1125057b"
        
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{report_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Report fetch failed: {response.text}"
        
        report = response.json()
        assert report.get('equipment_type') == 'energy_meter'
        
        # Verify Energy Meter specific fields
        assert 'energy_meter_details' in report
        assert 'energy_meter_section_toggles' in report
        assert 'energy_meter_visual_inspection' in report
        assert 'energy_meter_master_standard' in report
        assert 'energy_meter_parameters' in report
        assert 'energy_meter_test_summary' in report
        assert 'energy_meter_energy_reading' in report
        
        # Verify Equipment Details
        details = report.get('energy_meter_details', {})
        assert details.get('meter_name') == 'Main Energy Meter'
        assert details.get('meter_accuracy') == 'Class 0.5'
        assert details.get('ct_ratio') == '100/5'
        assert details.get('pt_ratio') == '11000/110'
        
        # Verify Visual Inspection items
        visual_items = report.get('energy_meter_visual_inspection', [])
        assert len(visual_items) == 4
        assert visual_items[0].get('description') == 'CHECK NAME PLATE INFORMATION'
        
        # Verify Master Standard
        master_std = report.get('energy_meter_master_standard', {})
        assert master_std.get('nomenclature') == '3Φ Phase Power Analyzer'
        assert master_std.get('make_model') == 'Calmet TE-30'
        
        # Verify Parameters
        params = report.get('energy_meter_parameters', {})
        assert params.get('duc_vry') == '410.5'
        assert params.get('std_vry') == '410.2'
        
        # Verify Energy Reading
        energy = report.get('energy_meter_energy_reading', {})
        assert energy.get('ctr') == '20'
        assert energy.get('ptr') == '100'
        assert energy.get('error_percent') == '0.12'
        
        print("PASS - Existing Energy Meter report has all required data")
    
    def test_energy_meter_pdf_generation(self):
        """Test PDF generation for Energy Meter report"""
        report_id = "66502ce9-79a8-484f-a650-54af1125057b"
        
        response = requests.get(
            f"{BASE_URL}/api/equipment-report/energy_meter/{report_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF, got {content_type}"
        
        # Verify PDF has content
        assert len(response.content) > 50000, f"PDF too small: {len(response.content)} bytes"
        
        # Verify PDF header
        assert response.content[:4] == b'%PDF', "Invalid PDF header"
        
        print(f"PASS - Energy Meter PDF generated successfully ({len(response.content)} bytes)")
    
    def test_create_new_energy_meter_report(self):
        """Test creating a new Energy Meter report with all sections"""
        unique_id = str(uuid.uuid4())[:8]
        
        report_data = {
            "equipment_type": "energy_meter",
            "report_type": "Calibration",
            "customer_info": {
                "company_name": f"TEST_Energy_Meter_{unique_id}",
                "site_location": "Test Site",
                "project_name": "Test Project"
            },
            "energy_meter_details": {
                "meter_name": f"Test Meter {unique_id}",
                "meter_location": "Test Location",
                "meter_accuracy": "Class 1.0",
                "panel_feeder_name": "Test Feeder",
                "make_model": "Test Model",
                "serial_no": f"SN-{unique_id}",
                "ct_ratio": "200/5",
                "pt_ratio": "22000/110",
                "system_frequency": "50 Hz",
                "system_voltage": "440V",
                "date_of_calibration": "2024-01-18",
                "date_of_energization": "2024-01-15"
            },
            "energy_meter_section_toggles": {
                "visual_inspection": True,
                "master_standard": True,
                "test_results": True
            },
            "energy_meter_visual_inspection": [
                {"id": 1, "description": "CHECK NAME PLATE INFORMATION", "checked": True},
                {"id": 2, "description": "INSPECT PHYSICAL DAMAGE / DEFECTS", "checked": True},
                {"id": 3, "description": "VERIFY WIRING CONNECTIONS", "checked": False},
                {"id": 4, "description": "CHECK TIGHTNESS OF ALL CONNECTION", "checked": True}
            ],
            "energy_meter_master_standard": {
                "nomenclature": "Test Power Analyzer",
                "make_model": "Test Model XYZ",
                "sl_no": "12345",
                "certificate_no": "CERT-TEST-001",
                "validity": "2025-12-31"
            },
            "energy_meter_parameters": {
                "duc_vry": "415.0",
                "duc_vyb": "414.5",
                "duc_vbr": "415.2",
                "duc_r": "100.0",
                "duc_y": "99.5",
                "duc_b": "100.2",
                "duc_pf": "0.98",
                "duc_freq": "50.00",
                "std_vry": "414.8",
                "std_vyb": "414.3",
                "std_vbr": "415.0",
                "std_r": "99.8",
                "std_y": "99.3",
                "std_b": "100.0",
                "std_pf": "0.98",
                "std_freq": "50.00"
            },
            "energy_meter_test_summary": {
                "result_1": "PASS",
                "result_2": "Within Limits"
            },
            "energy_meter_energy_reading": {
                "final_duc": "20000.0",
                "final_std": "19999.5",
                "initial_duc": "19000.0",
                "initial_std": "19000.0",
                "difference_duc": "1000.0",
                "difference_std": "999.5",
                "ctr": "40",
                "ptr": "200",
                "mf_duc": "8000",
                "mf_std": "8000",
                "total_duc": "8000000",
                "total_std": "7996000",
                "error_percent": "0.05"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/test-reports",
            headers=self.headers,
            json=report_data
        )
        assert response.status_code == 200, f"Report creation failed: {response.text}"
        
        created_report = response.json()
        report_id = created_report.get('id')
        assert report_id is not None, "Report ID not returned"
        
        # Verify the created report
        get_response = requests.get(
            f"{BASE_URL}/api/test-reports/{report_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        fetched_report = get_response.json()
        assert fetched_report.get('equipment_type') == 'energy_meter'
        assert fetched_report.get('energy_meter_details', {}).get('meter_name') == f"Test Meter {unique_id}"
        assert fetched_report.get('energy_meter_parameters', {}).get('duc_vry') == '415.0'
        assert fetched_report.get('energy_meter_energy_reading', {}).get('error_percent') == '0.05'
        
        # Test PDF generation for new report
        pdf_response = requests.get(
            f"{BASE_URL}/api/equipment-report/energy_meter/{report_id}/pdf",
            headers=self.headers
        )
        assert pdf_response.status_code == 200, f"PDF generation failed for new report: {pdf_response.text}"
        
        # Cleanup - delete test report
        delete_response = requests.delete(
            f"{BASE_URL}/api/test-reports/{report_id}",
            headers=self.headers
        )
        assert delete_response.status_code in [200, 204], f"Cleanup failed: {delete_response.text}"
        
        print(f"PASS - Created, verified, and cleaned up Energy Meter report {report_id}")
    
    def test_energy_meter_section_toggles(self):
        """Test that section toggles work correctly"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create report with some sections disabled
        report_data = {
            "equipment_type": "energy_meter",
            "report_type": "Calibration",
            "customer_info": {
                "company_name": f"TEST_Toggle_{unique_id}",
                "site_location": "Test Site"
            },
            "energy_meter_details": {
                "meter_name": f"Toggle Test {unique_id}",
                "meter_location": "Test"
            },
            "energy_meter_section_toggles": {
                "visual_inspection": False,  # Disabled
                "master_standard": True,
                "test_results": False  # Disabled
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/test-reports",
            headers=self.headers,
            json=report_data
        )
        assert response.status_code == 200, f"Report creation failed: {response.text}"
        
        report_id = response.json().get('id')
        
        # Verify toggles are saved
        get_response = requests.get(
            f"{BASE_URL}/api/test-reports/{report_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        toggles = fetched.get('energy_meter_section_toggles', {})
        assert toggles.get('visual_inspection') == False
        assert toggles.get('master_standard') == True
        assert toggles.get('test_results') == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        
        print("PASS - Section toggles work correctly")


class TestPanelReportTextWrap:
    """Test Panel Report text wrapping fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get('token')
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_panel_pdf_with_long_text(self):
        """Test Panel PDF generation with long text in checklist item #8"""
        report_id = "1140d332-79b7-4359-ae27-4853c884f6dc"
        
        # Get the report to verify it has long text
        get_response = requests.get(
            f"{BASE_URL}/api/test-reports/{report_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        
        report = get_response.json()
        points = report.get('points_to_ensure', [])
        
        # Find item #8 with long text
        item_8 = next((p for p in points if p.get('id') == 8), None)
        assert item_8 is not None, "Item #8 not found"
        
        long_text = item_8.get('item', '')
        assert len(long_text) > 50, f"Item #8 text too short: {long_text}"
        assert "All meters tested" in long_text
        
        # Generate PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/equipment-report/panel/{report_id}/pdf",
            headers=self.headers
        )
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        
        # Verify PDF is valid
        assert pdf_response.content[:4] == b'%PDF'
        assert len(pdf_response.content) > 50000
        
        print(f"PASS - Panel PDF generated with text wrapping ({len(pdf_response.content)} bytes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
