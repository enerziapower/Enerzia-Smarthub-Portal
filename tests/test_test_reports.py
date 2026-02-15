"""
Test Reports API Tests
Tests for the Test Reports module - equipment test report CRUD operations
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


class TestTestReportsAPI:
    """Test Reports API endpoint tests"""
    
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
    
    # ==================== GET ENDPOINTS ====================
    
    def test_get_all_test_reports(self):
        """Test GET /api/test-reports - list all reports"""
        response = self.session.get(f"{BASE_URL}/api/test-reports")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} test reports")
    
    def test_get_test_reports_by_equipment_type(self):
        """Test GET /api/test-reports/equipment/{equipment_type}"""
        equipment_types = ['transformer', 'earth-pit', 'mccb', 'acb', 'vcb', 'dg']
        
        for eq_type in equipment_types:
            response = self.session.get(f"{BASE_URL}/api/test-reports/equipment/{eq_type}")
            assert response.status_code == 200, f"Failed for {eq_type}: {response.text}"
            data = response.json()
            assert isinstance(data, list)
            print(f"Equipment type '{eq_type}': {len(data)} reports")
    
    def test_get_next_report_number_transformer(self):
        """Test GET /api/test-reports/next-report-no/transformer"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/next-report-no/transformer")
        
        assert response.status_code == 200
        data = response.json()
        assert "report_no" in data
        assert data["report_no"].startswith("TR/")
        print(f"Next Transformer report number: {data['report_no']}")
    
    def test_get_next_report_number_all_equipment_types(self):
        """Test next report number generation for all equipment types"""
        equipment_prefixes = {
            'transformer': 'TR',
            'earth-pit': 'EP',
            'energy-meter': 'EM',
            'mccb': 'MCCB',
            'acb': 'ACB',
            'vcb': 'VCB',
            'dg': 'DG',
            'lighting': 'LUX',
            'lightning-arrestor': 'LA',
            'ups': 'UPS',
            'ir-thermography': 'IR',
            'electrical-panel': 'PNL'
        }
        
        for eq_type, prefix in equipment_prefixes.items():
            response = self.session.get(f"{BASE_URL}/api/test-reports/next-report-no/{eq_type}")
            assert response.status_code == 200, f"Failed for {eq_type}: {response.text}"
            data = response.json()
            assert "report_no" in data
            assert data["report_no"].startswith(f"{prefix}/"), f"Expected prefix {prefix}/ for {eq_type}, got {data['report_no']}"
            print(f"{eq_type}: {data['report_no']}")
    
    # ==================== CREATE ENDPOINTS ====================
    
    def test_create_transformer_report(self):
        """Test POST /api/test-reports - create transformer report"""
        report_data = {
            "equipment_type": "transformer",
            "location": "Test Location",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "witnessed_by": "Customer Rep",
            "ambient_temperature": "30",
            "remarks": "Test report created by automated test",
            "overall_condition": "satisfactory",
            "status": "draft",
            # Transformer-specific fields
            "transformer_type": "Distribution",
            "capacity": 500,
            "voltage_ratio": "11000/433V",
            "serial_no": "TEST-TR-001",
            "make": "Test Manufacturer",
            "ir_value_hv": 100.5,
            "ir_value_lv": 150.2,
            "oil_level": "Normal"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "report_no" in data
        assert data["report_no"].startswith("TR/")
        
        self.created_report_ids.append(data["id"])
        print(f"Created transformer report: {data['report_no']} (ID: {data['id']})")
    
    def test_create_mccb_report(self):
        """Test POST /api/test-reports - create MCCB report"""
        report_data = {
            "equipment_type": "mccb",
            "location": "Test Panel Room",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "overall_condition": "satisfactory",
            "status": "draft",
            # MCCB-specific fields
            "mccb_rating": 100,
            "frame_size": "100A",
            "poles": "3P",
            "make": "Schneider",
            "serial_no": "TEST-MCCB-001",
            "breaking_capacity": 25,
            "ir_value": 500,
            "contact_resistance": 50,
            "trip_test": "Pass",
            "overload_test": "Pass",
            "mechanical_operation": "Smooth"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "report_no" in data
        assert data["report_no"].startswith("MCCB/")
        
        self.created_report_ids.append(data["id"])
        print(f"Created MCCB report: {data['report_no']} (ID: {data['id']})")
    
    def test_create_earth_pit_report(self):
        """Test POST /api/test-reports - create Earth Pit report"""
        report_data = {
            "equipment_type": "earth-pit",
            "location": "Substation Area",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "overall_condition": "satisfactory",
            "status": "completed",
            # Earth Pit-specific fields
            "pit_type": "Pipe Type",
            "pit_no": "EP-001",
            "depth": 3.0,
            "soil_type": "Clay",
            "earth_resistance": 2.5,
            "soil_resistivity": 100,
            "moisture_content": 15,
            "test_method": "Fall of Potential",
            "weather_condition": "Sunny"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "report_no" in data
        assert data["report_no"].startswith("EP/")
        
        self.created_report_ids.append(data["id"])
        print(f"Created Earth Pit report: {data['report_no']} (ID: {data['id']})")
    
    def test_create_report_without_equipment_type_fails(self):
        """Test that creating report without equipment_type fails"""
        report_data = {
            "location": "Test Location",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer"
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected report without equipment_type")
    
    # ==================== UPDATE ENDPOINTS ====================
    
    def test_update_test_report(self):
        """Test PUT /api/test-reports/{report_id} - update report"""
        # First create a report
        create_data = {
            "equipment_type": "dg",
            "location": "Generator Room",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=create_data)
        assert create_response.status_code == 200
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Update the report
        update_data = {
            "status": "completed",
            "remarks": "Updated by automated test",
            "overall_condition": "needs_attention"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/test-reports/{report_id}", json=update_data)
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"Successfully updated report {report_id}")
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 200
        updated_report = get_response.json()
        assert updated_report["status"] == "completed"
        assert updated_report["remarks"] == "Updated by automated test"
        print("Update verified successfully")
    
    # ==================== DELETE ENDPOINTS ====================
    
    def test_delete_test_report(self):
        """Test DELETE /api/test-reports/{report_id}"""
        # First create a report
        create_data = {
            "equipment_type": "ups",
            "location": "UPS Room",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=create_data)
        assert create_response.status_code == 200
        report_id = create_response.json()["id"]
        
        # Delete the report
        delete_response = self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"Successfully deleted report {report_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 404
        print("Deletion verified - report not found")
    
    def test_delete_nonexistent_report_fails(self):
        """Test that deleting non-existent report returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/test-reports/nonexistent-id-12345")
        
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent report")
    
    # ==================== GET BY ID ====================
    
    def test_get_test_report_by_id(self):
        """Test GET /api/test-reports/{report_id}"""
        # First create a report
        create_data = {
            "equipment_type": "acb",
            "location": "Main Panel",
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "tested_by": "Test Engineer",
            "status": "draft",
            "acb_rating": 1600,
            "voltage_rating": 415
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=create_data)
        assert create_response.status_code == 200
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Get the report by ID
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        
        assert get_response.status_code == 200
        report = get_response.json()
        assert report["id"] == report_id
        assert report["equipment_type"] == "acb"
        assert report["location"] == "Main Panel"
        assert report["acb_rating"] == 1600
        print(f"Successfully retrieved report: {report['report_no']}")
    
    def test_get_nonexistent_report_fails(self):
        """Test that getting non-existent report returns 404"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/nonexistent-id-12345")
        
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent report")


class TestTestReportsFiltering:
    """Test filtering and query parameters for test reports"""
    
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
        assert response.status_code == 200
        
        token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_filter_by_equipment_type(self):
        """Test filtering reports by equipment_type query param"""
        response = self.session.get(f"{BASE_URL}/api/test-reports", params={"equipment_type": "transformer"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned reports should be transformer type
        for report in data:
            assert report["equipment_type"] == "transformer"
        
        print(f"Found {len(data)} transformer reports")
    
    def test_filter_by_status(self):
        """Test filtering reports by status query param"""
        response = self.session.get(f"{BASE_URL}/api/test-reports", params={"status": "completed"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned reports should have completed status
        for report in data:
            assert report["status"] == "completed"
        
        print(f"Found {len(data)} completed reports")
    
    def test_limit_parameter(self):
        """Test limit query parameter"""
        response = self.session.get(f"{BASE_URL}/api/test-reports", params={"limit": 5})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5
        print(f"Limit parameter working - returned {len(data)} reports")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
