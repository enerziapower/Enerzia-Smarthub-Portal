"""
Transformer Test Reports API Tests
Tests for the comprehensive transformer test report form and PDF generation.
"""
import pytest
import requests
import os
import uuid

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
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestTransformerReportEndpoints:
    """Test transformer report CRUD operations"""
    
    created_report_id = None
    
    def test_get_next_report_number(self, api_client):
        """Test getting next report number for transformer type"""
        response = api_client.get(f"{BASE_URL}/api/test-reports/next-report-no/transformer")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "report_no" in data
        # Verify format: ENERZIA/TRN/YEAR/NUMBER
        report_no = data["report_no"]
        assert report_no.startswith("ENERZIA/TRN/"), f"Report number format incorrect: {report_no}"
        print(f"✓ Next report number: {report_no}")
    
    def test_create_transformer_report(self, api_client):
        """Test creating a new transformer test report"""
        report_data = {
            "equipment_type": "transformer",
            "report_category": "equipment",
            "report_type": "Periodical Maintenance",
            "report_date": "2025-01-13",
            
            # Customer Information
            "customer_name": "TEST_Transformer_Customer",
            "site_location": "Test Site Location, Chennai",
            "project_name": "Test Project",
            "po_ref": "PO-TEST-001",
            "contact_person": "Test Contact",
            "contact_phone": "9876543210",
            
            # Service Provider Details
            "service_company": "Enerzia Power Solutions",
            "engineer_name": "Test Engineer",
            "engineer_email": "engineer@test.com",
            "engineer_mobile": "9876543211",
            
            # Main Equipment Details
            "equipment_name": "250 KVA Distribution Transformer",
            "equipment_location": "Transformer Yard",
            "rating_kva": "250",
            "transformer_type": "Distribution",
            "feeder_name": "Main Feeder",
            "voltage_ratio_hv": "11000",
            "voltage_ratio_lv": "433",
            "make": "ABB",
            "current_ratio_hv": "13.12",
            "current_ratio_lv": "333.33",
            "serial_no": "TRN-2024-001",
            "frequency": "50",
            "test_date": "2025-01-13",
            "vector_group": "Dyn11",
            "energization_date": "2024-01-01",
            "cooling_type": "ONAN",
            "next_due_date": "2026-01-13",
            "year_of_manufacture": "2023",
            
            # Maintenance Checklist
            "checklist_cleaned": True,
            "checklist_no_defects": True,
            "checklist_double_earthing": True,
            "checklist_bushings_clean": True,
            "checklist_bolts_tight": True,
            "checklist_silica_gel_ok": True,
            "checklist_pressure_valve_ok": True,
            "checklist_remarks": "All checks passed",
            
            # Test Instruments
            "test_instruments": [
                {"name": "Clamp Meter", "make": "Fluke", "model": "376", "serial": "CM-001"},
                {"name": "Megger / IR Tester", "make": "Megger", "model": "MIT525", "serial": "IR-001"},
                {"name": "BDV Test Kit", "make": "Megger", "model": "OTS60", "serial": "BDV-001"}
            ],
            
            # Oil BDV Test
            "oil_sample_location": "Bottom",
            "oil_bdv_before_flash_point": "45",
            "oil_bdv_after_value": "65",
            "oil_bdv_after_flash_point": "70",
            "oil_bdv_remarks": "Transformer Oil BDV tested and found satisfactory",
            
            # IR Test
            "ir_applied_voltage": "5000",
            "ir_tests": [
                {"circuit": "Primary to Earth", "voltage": "5000", "measured": "2.82 GΩ", "acceptance": "> 100 MΩ"},
                {"circuit": "Primary to Secondary", "voltage": "5000", "measured": "3.15 GΩ", "acceptance": "> 100 MΩ"},
                {"circuit": "Secondary to Earth", "voltage": "500", "measured": "1.25 GΩ", "acceptance": "> 10 MΩ"}
            ],
            
            # Magnetic Balance Test
            "magnetic_balance_tap": "TAP5 (Normal Tap)",
            "magnetic_balance_tests": [
                {"circuit": "R-Open", "applied_voltage": "415", "measured_voltage": "16.5"},
                {"circuit": "Y-Open", "applied_voltage": "415", "measured_voltage": "16.3"},
                {"circuit": "B-Open", "applied_voltage": "415", "measured_voltage": "16.4"}
            ],
            
            # Vector Group Test
            "vector_group_tests": [
                {"parameter": "1W2W < 1W2V", "observed": "Verified"},
                {"parameter": "1U1V = 1U2N + 1V2N", "observed": "Verified"},
                {"parameter": "1V2W = 1V2V", "observed": "Verified"}
            ],
            "vector_group_remarks": "The test results are found satisfactory and the transformer found healthy",
            
            # OLTC (optional - disabled)
            "has_oltc": False,
            
            # Results
            "overall_result": "satisfactory",
            "final_remarks": "The test results are found satisfactory and the transformer found healthy",
            
            # Signatures
            "engineer_signature_name": "Test Engineer",
            "engineer_signature_date": "2025-01-13",
            "customer_signature_name": "Customer Rep",
            "customer_signature_date": "2025-01-13",
            
            "status": "completed"
        }
        
        response = api_client.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code == 200, f"Failed to create report: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "report_no" in data
        assert data["report_no"].startswith("ENERZIA/TRN/"), f"Report number format incorrect: {data['report_no']}"
        
        TestTransformerReportEndpoints.created_report_id = data["id"]
        print(f"✓ Created transformer report: {data['report_no']} (ID: {data['id']})")
    
    def test_get_transformer_report(self, api_client):
        """Test retrieving the created transformer report"""
        report_id = TestTransformerReportEndpoints.created_report_id
        if not report_id:
            pytest.skip("No report created to retrieve")
        
        response = api_client.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert response.status_code == 200, f"Failed to get report: {response.text}"
        
        data = response.json()
        assert data["id"] == report_id
        assert data["equipment_type"] == "transformer"
        assert data["customer_name"] == "TEST_Transformer_Customer"
        assert data["rating_kva"] == "250"
        assert data["vector_group"] == "Dyn11"
        print(f"✓ Retrieved transformer report successfully")
    
    def test_get_reports_by_equipment_type(self, api_client):
        """Test getting all transformer reports"""
        response = api_client.get(f"{BASE_URL}/api/test-reports/equipment/transformer")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} transformer reports")
    
    def test_update_transformer_report(self, api_client):
        """Test updating a transformer report"""
        report_id = TestTransformerReportEndpoints.created_report_id
        if not report_id:
            pytest.skip("No report created to update")
        
        update_data = {
            "checklist_remarks": "Updated remarks - All checks passed with flying colors",
            "final_remarks": "Updated final remarks - Transformer in excellent condition"
        }
        
        response = api_client.put(f"{BASE_URL}/api/test-reports/{report_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update report: {response.text}"
        
        # Verify update
        get_response = api_client.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["checklist_remarks"] == update_data["checklist_remarks"]
        print(f"✓ Updated transformer report successfully")


class TestTransformerPDFGeneration:
    """Test PDF generation for transformer reports"""
    
    def test_generate_pdf_for_existing_report(self, api_client):
        """Test PDF generation for an existing report"""
        # Use the report created in previous tests or the provided test ID
        report_id = TestTransformerReportEndpoints.created_report_id or "125df0a6-27f5-44af-b2a2-c73f7839bf69"
        
        response = api_client.get(f"{BASE_URL}/api/transformer-report/{report_id}/pdf")
        
        if response.status_code == 404:
            pytest.skip(f"Report {report_id} not found for PDF generation")
        
        assert response.status_code == 200, f"Failed to generate PDF: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got: {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition
        
        # Verify PDF content starts with PDF header
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        print(f"✓ PDF generated successfully ({len(content)} bytes)")
    
    def test_pdf_generation_for_nonexistent_report(self, api_client):
        """Test PDF generation returns 404 for non-existent report"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/transformer-report/{fake_id}/pdf")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print(f"✓ Correctly returns 404 for non-existent report")


class TestTransformerReportWithOLTC:
    """Test transformer report with OLTC section enabled"""
    
    created_oltc_report_id = None
    
    def test_create_report_with_oltc(self, api_client):
        """Test creating a transformer report with OLTC tests"""
        report_data = {
            "equipment_type": "transformer",
            "report_category": "equipment",
            "report_type": "Testing & Commissioning",
            "report_date": "2025-01-13",
            
            # Basic info
            "customer_name": "TEST_OLTC_Customer",
            "site_location": "OLTC Test Site",
            "equipment_name": "400 KVA Power Transformer with OLTC",
            "rating_kva": "400",
            "transformer_type": "Power",
            "vector_group": "Dyn11",
            "cooling_type": "ONAN",
            "test_date": "2025-01-13",
            
            # Service provider
            "service_company": "Enerzia Power Solutions",
            "engineer_name": "OLTC Test Engineer",
            
            # OLTC Enabled
            "has_oltc": True,
            
            # OLTC Equipment Details
            "oltc_equipment_name": "OLTC of 400KVA Transformer",
            "oltc_location": "Transformer Yard",
            "oltc_rating": "400",
            "oltc_total_taps": "9",
            "oltc_normal_tap": "5",
            "oltc_make": "ABB",
            "oltc_serial_no": "OLTC-2024-001",
            
            # OLTC Oil BDV Test
            "oltc_bdv_before": "42",
            "oltc_bdv_after": "68",
            "oltc_bdv_flash_point": "72",
            "oltc_bdv_remarks": "OLTC oil tested and found satisfactory",
            
            # OLTC Operational Checklist
            "oltc_visual_inspection": True,
            "oltc_local_operation": True,
            "oltc_remote_operation": True,
            "oltc_tap_position_indicator": True,
            "oltc_limit_switch": True,
            "oltc_cooling_equipment": False,
            "oltc_pump_fan_rotation": False,
            "oltc_spares_oil_topup": True,
            "oltc_deficiencies": "None observed",
            
            # Results
            "overall_result": "satisfactory",
            "final_remarks": "Transformer with OLTC tested and found healthy",
            
            "status": "completed"
        }
        
        response = api_client.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code == 200, f"Failed to create OLTC report: {response.text}"
        
        data = response.json()
        assert "id" in data
        TestTransformerReportWithOLTC.created_oltc_report_id = data["id"]
        print(f"✓ Created transformer report with OLTC: {data['report_no']}")
    
    def test_verify_oltc_data_persisted(self, api_client):
        """Verify OLTC data was correctly saved"""
        report_id = TestTransformerReportWithOLTC.created_oltc_report_id
        if not report_id:
            pytest.skip("No OLTC report created")
        
        response = api_client.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_oltc"] == True
        assert data["oltc_equipment_name"] == "OLTC of 400KVA Transformer"
        assert data["oltc_total_taps"] == "9"
        assert data["oltc_visual_inspection"] == True
        print(f"✓ OLTC data persisted correctly")
    
    def test_generate_pdf_with_oltc(self, api_client):
        """Test PDF generation includes OLTC sections"""
        report_id = TestTransformerReportWithOLTC.created_oltc_report_id
        if not report_id:
            pytest.skip("No OLTC report created")
        
        response = api_client.get(f"{BASE_URL}/api/transformer-report/{report_id}/pdf")
        assert response.status_code == 200, f"Failed to generate OLTC PDF: {response.text}"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF file"
        print(f"✓ PDF with OLTC sections generated ({len(content)} bytes)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_reports(self, api_client):
        """Delete test-created reports"""
        # Delete main test report
        if TestTransformerReportEndpoints.created_report_id:
            response = api_client.delete(f"{BASE_URL}/api/test-reports/{TestTransformerReportEndpoints.created_report_id}")
            if response.status_code == 200:
                print(f"✓ Deleted test report: {TestTransformerReportEndpoints.created_report_id}")
        
        # Delete OLTC test report
        if TestTransformerReportWithOLTC.created_oltc_report_id:
            response = api_client.delete(f"{BASE_URL}/api/test-reports/{TestTransformerReportWithOLTC.created_oltc_report_id}")
            if response.status_code == 200:
                print(f"✓ Deleted OLTC test report: {TestTransformerReportWithOLTC.created_oltc_report_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
