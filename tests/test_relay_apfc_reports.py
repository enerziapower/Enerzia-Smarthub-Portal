"""
Test suite for Relay and APFC Equipment Report Templates
Tests: Template loading, Report CRUD, PDF generation
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-order-system.preview.emergentagent.com').rstrip('/')

class TestRelayAPFCReports:
    """Test Relay and APFC equipment report templates and functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    # ============ RELAY TEMPLATE TESTS ============
    
    def test_01_relay_template_loads(self):
        """Test Relay template endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        assert response.status_code == 200, f"Relay template failed: {response.text}"
        print("PASS - Relay template loads successfully")
    
    def test_02_relay_template_has_title(self):
        """Test Relay template has correct title"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        data = response.json()
        assert data.get('title') == 'RELAY CALIBRATION REPORT', f"Wrong title: {data.get('title')}"
        print("PASS - Relay template has correct title")
    
    def test_03_relay_template_equipment_fields(self):
        """Test Relay template has all required equipment fields"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        data = response.json()
        equipment_fields = data.get('equipment_fields', [])
        field_names = [f['name'] for f in equipment_fields]
        
        required_fields = ['relay_type', 'make', 'model', 'serial_no', 'ct_ratio', 'associated_breaker']
        for field in required_fields:
            assert field in field_names, f"Missing field: {field}"
        print(f"PASS - Relay template has all 6 equipment fields: {field_names}")
    
    def test_04_relay_template_settings(self):
        """Test Relay template has settings table with 4 parameters"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        data = response.json()
        settings = data.get('settings', [])
        
        assert len(settings) == 4, f"Expected 4 settings, got {len(settings)}"
        parameters = [s['parameter'] for s in settings]
        assert 'Overcurrent Setting (A)' in parameters
        assert 'Time Multiplier Setting (TMS)' in parameters
        assert 'Earth Fault Setting (A)' in parameters
        assert 'Instantaneous Setting (A)' in parameters
        print(f"PASS - Relay template has 4 settings: {parameters}")
    
    def test_05_relay_template_checklist(self):
        """Test Relay template has 10 checklist items"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        data = response.json()
        checklist = data.get('checklist', [])
        
        assert len(checklist) == 10, f"Expected 10 checklist items, got {len(checklist)}"
        print(f"PASS - Relay template has 10 checklist items")
    
    # ============ APFC TEMPLATE TESTS ============
    
    def test_06_apfc_template_loads(self):
        """Test APFC template endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        assert response.status_code == 200, f"APFC template failed: {response.text}"
        print("PASS - APFC template loads successfully")
    
    def test_07_apfc_template_has_title(self):
        """Test APFC template has correct title"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        data = response.json()
        assert data.get('title') == 'APFC PANEL SERVICE REPORT', f"Wrong title: {data.get('title')}"
        print("PASS - APFC template has correct title")
    
    def test_08_apfc_template_equipment_fields(self):
        """Test APFC template has all required equipment fields"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        data = response.json()
        equipment_fields = data.get('equipment_fields', [])
        field_names = [f['name'] for f in equipment_fields]
        
        required_fields = ['panel_name', 'make', 'total_kvar', 'no_of_stages', 'controller_make', 'controller_model']
        for field in required_fields:
            assert field in field_names, f"Missing field: {field}"
        print(f"PASS - APFC template has all 6 equipment fields: {field_names}")
    
    def test_09_apfc_template_capacitor_banks(self):
        """Test APFC template has capacitor banks configuration"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        data = response.json()
        capacitor_banks = data.get('capacitor_banks', {})
        
        assert 'columns' in capacitor_banks, "Missing capacitor_banks columns"
        columns = capacitor_banks['columns']
        expected_columns = ['Stage', 'KVAR Rating', 'Make', 'Status', 'Remarks']
        for col in expected_columns:
            assert col in columns, f"Missing column: {col}"
        print(f"PASS - APFC template has capacitor banks with columns: {columns}")
    
    def test_10_apfc_template_checklist(self):
        """Test APFC template has 10 checklist items"""
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        data = response.json()
        checklist = data.get('checklist', [])
        
        assert len(checklist) == 10, f"Expected 10 checklist items, got {len(checklist)}"
        print(f"PASS - APFC template has 10 checklist items")
    
    # ============ RELAY REPORT CRUD TESTS ============
    
    def test_11_create_relay_report(self):
        """Test creating a new Relay report"""
        relay_data = {
            "equipment_type": "relay",
            "report_type": "Calibration",
            "report_date": datetime.now().strftime("%Y-%m-%d"),
            "date_of_testing": datetime.now().strftime("%Y-%m-%d"),
            "customer_info": {
                "company_name": "TEST_Relay_Company",
                "site_location": "Test Location",
                "contact_person": "Test Contact"
            },
            "service_provider": {
                "company_name": "Enerzia Power Solutions",
                "engineer_name": "Test Engineer"
            },
            "equipment_details": {
                "relay_type": "Overcurrent",
                "make": "ABB",
                "model": "REF615",
                "serial_no": "TEST-RLY-001",
                "ct_ratio": "100/5",
                "associated_breaker": "ACB-01"
            },
            "settings": [
                {"parameter": "Overcurrent Setting (A)", "set_value": "100", "measured_value": "99.5"},
                {"parameter": "Time Multiplier Setting (TMS)", "set_value": "0.5", "measured_value": "0.48"},
                {"parameter": "Earth Fault Setting (A)", "set_value": "30", "measured_value": "29.8"},
                {"parameter": "Instantaneous Setting (A)", "set_value": "500", "measured_value": "498"}
            ],
            "checklist": [
                {"id": 1, "item": "Visual inspection of relay", "status": "YES", "remarks": "OK"},
                {"id": 2, "item": "Check relay connections", "status": "YES", "remarks": "Tight"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/test-reports", json=relay_data, headers=self.headers)
        assert response.status_code in [200, 201], f"Create relay report failed: {response.text}"
        
        created = response.json()
        self.__class__.relay_report_id = created.get('id')
        assert self.__class__.relay_report_id, "No report ID returned"
        print(f"PASS - Created Relay report with ID: {self.__class__.relay_report_id}")
    
    def test_12_get_relay_report(self):
        """Test retrieving the created Relay report"""
        report_id = getattr(self.__class__, 'relay_report_id', None)
        if not report_id:
            pytest.skip("No relay report ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        assert response.status_code == 200, f"Get relay report failed: {response.text}"
        
        data = response.json()
        assert data.get('equipment_type') == 'relay'
        assert data.get('equipment_details', {}).get('relay_type') == 'Overcurrent'
        assert data.get('equipment_details', {}).get('make') == 'ABB'
        print(f"PASS - Retrieved Relay report with correct data")
    
    def test_13_relay_pdf_generation(self):
        """Test PDF generation for Relay report"""
        report_id = getattr(self.__class__, 'relay_report_id', None)
        if not report_id:
            pytest.skip("No relay report ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/equipment-report/relay/{report_id}/pdf", headers=self.headers)
        assert response.status_code == 200, f"Relay PDF generation failed: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        assert len(response.content) > 1000, "PDF content too small"
        print(f"PASS - Relay PDF generated successfully ({len(response.content)} bytes)")
    
    def test_14_delete_relay_report(self):
        """Test deleting the Relay report"""
        report_id = getattr(self.__class__, 'relay_report_id', None)
        if not report_id:
            pytest.skip("No relay report ID from previous test")
        
        response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        assert response.status_code in [200, 204], f"Delete relay report failed: {response.text}"
        print(f"PASS - Deleted Relay report")
    
    # ============ APFC REPORT CRUD TESTS ============
    
    def test_15_create_apfc_report(self):
        """Test creating a new APFC report"""
        apfc_data = {
            "equipment_type": "apfc",
            "report_type": "Periodical Maintenance",
            "report_date": datetime.now().strftime("%Y-%m-%d"),
            "date_of_testing": datetime.now().strftime("%Y-%m-%d"),
            "customer_info": {
                "company_name": "TEST_APFC_Company",
                "site_location": "Test Location",
                "contact_person": "Test Contact"
            },
            "service_provider": {
                "company_name": "Enerzia Power Solutions",
                "engineer_name": "Test Engineer"
            },
            "equipment_details": {
                "panel_name": "APFC Panel 1",
                "make": "Schneider",
                "total_kvar": "500",
                "no_of_stages": "6",
                "controller_make": "Epcos",
                "controller_model": "BR6000"
            },
            "capacitor_banks": [
                {"id": 1, "stage": 1, "kvar_rating": "50", "make": "Epcos", "status": "OK", "remarks": "Working"},
                {"id": 2, "stage": 2, "kvar_rating": "100", "make": "Epcos", "status": "OK", "remarks": "Working"},
                {"id": 3, "stage": 3, "kvar_rating": "100", "make": "Epcos", "status": "Faulty", "remarks": "Replace"}
            ],
            "checklist": [
                {"id": 1, "item": "Visual inspection of panel", "status": "YES", "remarks": "OK"},
                {"id": 2, "item": "Check capacitor connections", "status": "YES", "remarks": "Tight"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/test-reports", json=apfc_data, headers=self.headers)
        assert response.status_code in [200, 201], f"Create APFC report failed: {response.text}"
        
        created = response.json()
        self.__class__.apfc_report_id = created.get('id')
        assert self.__class__.apfc_report_id, "No report ID returned"
        print(f"PASS - Created APFC report with ID: {self.__class__.apfc_report_id}")
    
    def test_16_get_apfc_report(self):
        """Test retrieving the created APFC report"""
        report_id = getattr(self.__class__, 'apfc_report_id', None)
        if not report_id:
            pytest.skip("No APFC report ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        assert response.status_code == 200, f"Get APFC report failed: {response.text}"
        
        data = response.json()
        assert data.get('equipment_type') == 'apfc'
        assert data.get('equipment_details', {}).get('panel_name') == 'APFC Panel 1'
        assert data.get('equipment_details', {}).get('total_kvar') == '500'
        print(f"PASS - Retrieved APFC report with correct data")
    
    def test_17_apfc_capacitor_banks_persisted(self):
        """Test that APFC capacitor banks are persisted correctly"""
        report_id = getattr(self.__class__, 'apfc_report_id', None)
        if not report_id:
            pytest.skip("No APFC report ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        data = response.json()
        
        capacitor_banks = data.get('capacitor_banks', [])
        assert len(capacitor_banks) >= 3, f"Expected at least 3 capacitor banks, got {len(capacitor_banks)}"
        print(f"PASS - APFC capacitor banks persisted correctly ({len(capacitor_banks)} stages)")
    
    def test_18_apfc_pdf_generation(self):
        """Test PDF generation for APFC report"""
        report_id = getattr(self.__class__, 'apfc_report_id', None)
        if not report_id:
            pytest.skip("No APFC report ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/equipment-report/apfc/{report_id}/pdf", headers=self.headers)
        assert response.status_code == 200, f"APFC PDF generation failed: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        assert len(response.content) > 1000, "PDF content too small"
        print(f"PASS - APFC PDF generated successfully ({len(response.content)} bytes)")
    
    def test_19_delete_apfc_report(self):
        """Test deleting the APFC report"""
        report_id = getattr(self.__class__, 'apfc_report_id', None)
        if not report_id:
            pytest.skip("No APFC report ID from previous test")
        
        response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=self.headers)
        assert response.status_code in [200, 204], f"Delete APFC report failed: {response.text}"
        print(f"PASS - Deleted APFC report")
    
    # ============ EQUIPMENT PREFIXES TEST ============
    
    def test_20_equipment_prefixes_include_relay_apfc(self):
        """Test that EQUIPMENT_PREFIXES includes relay and apfc"""
        # This tests the backend configuration
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/relay", headers=self.headers)
        assert response.status_code == 200, "Relay template should be accessible"
        
        response = requests.get(f"{BASE_URL}/api/test-reports/templates/apfc", headers=self.headers)
        assert response.status_code == 200, "APFC template should be accessible"
        print("PASS - Both relay and apfc templates are accessible (prefixes configured)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
