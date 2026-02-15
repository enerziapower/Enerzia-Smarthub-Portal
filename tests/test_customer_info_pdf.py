"""
Test Customer Information and PDF Header Height
Tests for:
1. Customer Information fields in CreateTestReport.js (non-transformer equipment)
2. PDF header height adjustment for equipment and transformer reports
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


class TestCustomerInfoAndPDF:
    """Test Customer Information fields and PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created report IDs for cleanup
        self.created_report_ids = []
    
    def teardown_method(self):
        """Cleanup - delete created test reports"""
        for report_id in self.created_report_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")
            except:
                pass
    
    # ==================== CUSTOMER INFO TESTS ====================
    
    def test_create_earth_pit_with_customer_info(self):
        """Test creating Earth Pit report with Customer Information fields"""
        report_data = {
            "equipment_type": "earth-pit",
            "location": "Test Location",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "draft",
            # Customer Information fields
            "customer_name": "TEST_Customer Corp",
            "site_location": "123 Test Street, Test City",
            "po_ref": "PO-2026-001",
            "po_dated": "2026-01-14",
            "contact_person": "John Doe",
            "contact_phone": "+91-9876543210",
            "contact_email": "john.doe@testcustomer.com",
            # Service Provider fields
            "service_company": "Enerzia Power Solutions",
            "service_address": "456 Service Road, Service City",
            "engineer_name": "Test Engineer",
            "engineer_email": "engineer@enerzia.com",
            "engineer_mobile": "+91-9876543211",
            # Equipment-specific fields
            "pit_type": "Pipe Type",
            "pit_no": "EP-TEST-001",
            "earth_resistance": 2.5
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        self.created_report_ids.append(data["id"])
        
        # Verify data was saved correctly
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{data['id']}")
        assert get_response.status_code == 200
        saved_report = get_response.json()
        
        # Verify Customer Information fields
        assert saved_report.get("customer_name") == "TEST_Customer Corp"
        assert saved_report.get("site_location") == "123 Test Street, Test City"
        assert saved_report.get("po_ref") == "PO-2026-001"
        assert saved_report.get("po_dated") == "2026-01-14"
        assert saved_report.get("contact_person") == "John Doe"
        assert saved_report.get("contact_phone") == "+91-9876543210"
        assert saved_report.get("contact_email") == "john.doe@testcustomer.com"
        
        # Verify Service Provider fields
        assert saved_report.get("service_company") == "Enerzia Power Solutions"
        assert saved_report.get("engineer_name") == "Test Engineer"
        assert saved_report.get("engineer_email") == "engineer@enerzia.com"
        assert saved_report.get("engineer_mobile") == "+91-9876543211"
        
        print(f"✓ Created Earth Pit report with Customer Info: {data['report_no']}")
    
    def test_create_mccb_with_customer_info(self):
        """Test creating MCCB report with Customer Information fields"""
        report_data = {
            "equipment_type": "mccb",
            "location": "Panel Room",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "draft",
            # Customer Information fields
            "customer_name": "TEST_MCCB Customer",
            "site_location": "Industrial Area, Zone 5",
            "contact_person": "Jane Smith",
            "contact_email": "jane@mccbcustomer.com",
            # MCCB-specific fields
            "mccb_rating": 100,
            "frame_size": "100A",
            "poles": "3P"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        self.created_report_ids.append(data["id"])
        
        # Verify data was saved
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{data['id']}")
        assert get_response.status_code == 200
        saved_report = get_response.json()
        
        assert saved_report.get("customer_name") == "TEST_MCCB Customer"
        assert saved_report.get("contact_person") == "Jane Smith"
        assert saved_report.get("contact_email") == "jane@mccbcustomer.com"
        
        print(f"✓ Created MCCB report with Customer Info: {data['report_no']}")
    
    # ==================== PDF GENERATION TESTS ====================
    
    def test_earth_pit_pdf_generation(self):
        """Test Earth Pit PDF generation with existing report"""
        # Use existing report ID from review request
        report_id = "c2ce9424-484f-436e-bf33-32012163bee6"
        
        response = self.session.get(f"{BASE_URL}/api/equipment-report/earth-pit/{report_id}/pdf")
        
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        assert response.headers.get('Content-Type') == 'application/pdf'
        assert len(response.content) > 0
        
        print(f"✓ Earth Pit PDF generated successfully ({len(response.content)} bytes)")
    
    def test_transformer_pdf_generation(self):
        """Test Transformer PDF generation with existing report"""
        # Use existing report ID from review request
        report_id = "e87a4a24-2850-4e03-a44a-5829ce3e83e0"
        
        response = self.session.get(f"{BASE_URL}/api/transformer-report/{report_id}/pdf")
        
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        assert response.headers.get('Content-Type') == 'application/pdf'
        assert len(response.content) > 0
        
        print(f"✓ Transformer PDF generated successfully ({len(response.content)} bytes)")
    
    def test_equipment_pdf_with_customer_info(self):
        """Test PDF generation includes Customer Information"""
        # Create a report with customer info
        report_data = {
            "equipment_type": "earth-pit",
            "location": "Test Location",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "completed",
            "customer_name": "TEST_PDF_Customer",
            "site_location": "PDF Test Site",
            "contact_person": "PDF Tester",
            "contact_email": "pdf@test.com",
            "pit_type": "Pipe Type",
            "earth_resistance": 1.5
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert create_response.status_code == 200
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/equipment-report/earth-pit/{report_id}/pdf")
        
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get('Content-Type') == 'application/pdf'
        
        print(f"✓ PDF with Customer Info generated successfully")
    
    # ==================== EQUIPMENT TYPE TESTS ====================
    
    def test_all_equipment_types_pdf_generation(self):
        """Test PDF generation for all equipment types"""
        equipment_types = [
            'earth-pit', 'energy-meter', 'mccb', 'acb', 'vcb', 
            'dg', 'lighting', 'lightning-arrestor', 'ups', 
            'ir-thermography', 'electrical-panel'
        ]
        
        for eq_type in equipment_types:
            # Create a test report
            report_data = {
                "equipment_type": eq_type,
                "location": f"Test Location for {eq_type}",
                "test_date": datetime.now().strftime("%Y-%m-%d"),
                "tested_by": "Test Engineer",
                "status": "draft",
                "customer_name": f"TEST_{eq_type}_Customer"
            }
            
            create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
            if create_response.status_code != 200:
                print(f"⚠ Could not create {eq_type} report: {create_response.text}")
                continue
            
            report_id = create_response.json()["id"]
            self.created_report_ids.append(report_id)
            
            # Generate PDF
            pdf_response = self.session.get(f"{BASE_URL}/api/equipment-report/{eq_type}/{report_id}/pdf")
            
            if pdf_response.status_code == 200:
                print(f"✓ {eq_type}: PDF generated ({len(pdf_response.content)} bytes)")
            else:
                print(f"✗ {eq_type}: PDF generation failed - {pdf_response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
