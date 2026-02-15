"""
AMC Module Tests
Tests for AMC CRUD operations, PDF download, equipment reports ordering, and dashboard stats
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"

# Known AMC ID for testing
KNOWN_AMC_ID = "0b3e7060-470e-4cef-82cd-add7754f7962"

# Expected equipment order
EQUIPMENT_ORDER = ['transformer', 'vcb', 'acb', 'relay', 'earth-pit']


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestAMCDashboardStats:
    """Test AMC Dashboard Stats endpoint"""
    
    def test_get_dashboard_stats(self, api_client):
        """Test GET /api/amc/dashboard/stats returns correct structure"""
        response = api_client.get(f"{BASE_URL}/api/amc/dashboard/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_amcs" in data, "Missing total_amcs field"
        assert "active_amcs" in data, "Missing active_amcs field"
        assert "expired_amcs" in data, "Missing expired_amcs field"
        assert "expiring_soon" in data, "Missing expiring_soon field"
        assert "upcoming_visits" in data, "Missing upcoming_visits field"
        
        # Verify data types
        assert isinstance(data["total_amcs"], int)
        assert isinstance(data["active_amcs"], int)
        assert isinstance(data["expired_amcs"], int)
        assert isinstance(data["expiring_soon"], int)
        assert isinstance(data["upcoming_visits"], list)
        
        print(f"Dashboard Stats: Total={data['total_amcs']}, Active={data['active_amcs']}, Expired={data['expired_amcs']}")


class TestAMCList:
    """Test AMC List endpoint"""
    
    def test_get_all_amcs(self, api_client):
        """Test GET /api/amc returns list of AMCs"""
        response = api_client.get(f"{BASE_URL}/api/amc")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "amcs" in data, "Missing amcs field"
        assert "total" in data, "Missing total field"
        assert isinstance(data["amcs"], list)
        
        print(f"Total AMCs: {data['total']}")
        
        # Verify AMC structure if any exist
        if data["amcs"]:
            amc = data["amcs"][0]
            assert "id" in amc, "AMC missing id field"
            assert "amc_no" in amc, "AMC missing amc_no field"
            print(f"First AMC: {amc.get('amc_no')}")


class TestAMCGetSingle:
    """Test getting a single AMC"""
    
    def test_get_amc_by_id(self, api_client):
        """Test GET /api/amc/{id} returns AMC details"""
        response = api_client.get(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == KNOWN_AMC_ID, "AMC ID mismatch"
        assert "amc_no" in data, "Missing amc_no field"
        assert "equipment_list" in data, "Missing equipment_list field"
        assert "service_visits" in data, "Missing service_visits field"
        
        print(f"AMC: {data.get('amc_no')}, Equipment: {len(data.get('equipment_list', []))}")
    
    def test_get_amc_not_found(self, api_client):
        """Test GET /api/amc/{id} returns 404 for non-existent AMC"""
        response = api_client.get(f"{BASE_URL}/api/amc/non-existent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAMCEquipmentReports:
    """Test AMC Equipment Reports endpoint - verifies report ordering"""
    
    def test_get_equipment_reports(self, api_client):
        """Test GET /api/amc/{id}/equipment-reports returns sorted reports"""
        response = api_client.get(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}/equipment-reports")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "amc_id" in data, "Missing amc_id field"
        assert "total_reports" in data, "Missing total_reports field"
        assert "test_reports" in data, "Missing test_reports field"
        
        print(f"Total Reports: {data['total_reports']}")
        
        # Verify reports are sorted by equipment order
        reports = data["test_reports"]
        if reports:
            equipment_types_in_order = [r.get("equipment_type", "").lower() for r in reports]
            
            # Check that equipment types appear in the correct order
            last_order_index = -1
            for eq_type in equipment_types_in_order:
                if eq_type in EQUIPMENT_ORDER:
                    current_index = EQUIPMENT_ORDER.index(eq_type)
                    assert current_index >= last_order_index, \
                        f"Reports not sorted correctly: {eq_type} appeared after higher-order equipment"
                    last_order_index = current_index
            
            print(f"Report order verified: {equipment_types_in_order[:5]}...")
    
    def test_equipment_reports_order_transformer_first(self, api_client):
        """Verify transformer reports appear before other equipment types"""
        response = api_client.get(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}/equipment-reports")
        
        assert response.status_code == 200
        
        data = response.json()
        reports = data.get("test_reports", [])
        
        if reports:
            first_report = reports[0]
            first_eq_type = first_report.get("equipment_type", "").lower()
            
            # First report should be transformer (if transformer reports exist)
            transformer_reports = [r for r in reports if r.get("equipment_type", "").lower() == "transformer"]
            if transformer_reports:
                assert first_eq_type == "transformer", \
                    f"Expected transformer first, got {first_eq_type}"
                print("✓ Transformer reports appear first")
    
    def test_equipment_reports_order_earth_pit_last(self, api_client):
        """Verify earth-pit reports appear last"""
        response = api_client.get(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}/equipment-reports")
        
        assert response.status_code == 200
        
        data = response.json()
        reports = data.get("test_reports", [])
        
        if reports:
            last_report = reports[-1]
            last_eq_type = last_report.get("equipment_type", "").lower()
            
            # Last report should be earth-pit (if earth-pit reports exist)
            earth_pit_reports = [r for r in reports if r.get("equipment_type", "").lower() == "earth-pit"]
            if earth_pit_reports:
                assert last_eq_type == "earth-pit", \
                    f"Expected earth-pit last, got {last_eq_type}"
                print("✓ Earth-pit reports appear last")


class TestAMCPDFDownload:
    """Test AMC PDF Download functionality"""
    
    def test_pdf_download_returns_200(self, api_client):
        """Test GET /api/amc-report/{id}/pdf returns 200"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{KNOWN_AMC_ID}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ PDF endpoint returns 200")
    
    def test_pdf_download_content_type(self, api_client):
        """Test PDF download returns correct content type"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{KNOWN_AMC_ID}/pdf")
        
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, \
            f"Expected application/pdf, got {content_type}"
        print("✓ PDF content type is correct")
    
    def test_pdf_download_has_content(self, api_client):
        """Test PDF download has actual content"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{KNOWN_AMC_ID}/pdf")
        
        assert response.status_code == 200
        
        content = response.content
        assert len(content) > 1000, f"PDF too small: {len(content)} bytes"
        
        # Verify PDF header
        assert content[:5] == b'%PDF-', "Content is not a valid PDF"
        print(f"✓ PDF downloaded successfully: {len(content)} bytes")
    
    def test_pdf_download_filename_header(self, api_client):
        """Test PDF download has correct filename in header"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/{KNOWN_AMC_ID}/pdf")
        
        assert response.status_code == 200
        
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment disposition"
        assert "AMC_Report" in content_disposition, "Missing AMC_Report in filename"
        print(f"✓ Content-Disposition: {content_disposition}")
    
    def test_pdf_download_not_found(self, api_client):
        """Test PDF download returns error for non-existent AMC"""
        response = api_client.get(f"{BASE_URL}/api/amc-report/non-existent-id-12345/pdf")
        
        # Should return error status (404, 500, or 520 for server error)
        assert response.status_code in [404, 500, 520], \
            f"Expected 404, 500, or 520, got {response.status_code}"


class TestAMCCRUD:
    """Test AMC Create, Update, Delete operations"""
    
    @pytest.fixture
    def test_project_id(self, api_client):
        """Get a valid project ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/projects?limit=1")
        if response.status_code == 200:
            data = response.json()
            projects = data.get("projects", data) if isinstance(data, dict) else data
            if projects and len(projects) > 0:
                return projects[0].get("id")
        pytest.skip("No projects available for testing")
    
    def test_create_amc(self, api_client, test_project_id):
        """Test POST /api/amc creates new AMC"""
        amc_data = {
            "project_id": test_project_id,
            "contract_details": {
                "contract_no": "TEST-AMC-001",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "contract_value": 50000,
                "payment_terms": "Quarterly",
                "scope_of_work": "Test AMC scope",
                "special_conditions": "Test conditions"
            },
            "customer_info": {
                "customer_name": "Test Customer",
                "site_location": "Test Location",
                "contact_person": "Test Contact",
                "contact_number": "1234567890",
                "email": "test@test.com"
            },
            "equipment_list": [
                {
                    "equipment_type": "transformer",
                    "equipment_name": "Test Transformer",
                    "quantity": 1,
                    "service_frequency": "quarterly"
                }
            ],
            "status": "active"
        }
        
        response = api_client.post(f"{BASE_URL}/api/amc", json=amc_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing id in response"
        assert "amc_no" in data, "Missing amc_no in response"
        assert data["status"] == "active"
        
        created_id = data["id"]
        print(f"✓ Created AMC: {data.get('amc_no')}")
        
        # Cleanup - delete the test AMC
        delete_response = api_client.delete(f"{BASE_URL}/api/amc/{created_id}")
        assert delete_response.status_code == 200, "Failed to cleanup test AMC"
        print(f"✓ Cleaned up test AMC")
    
    def test_update_amc(self, api_client):
        """Test PUT /api/amc/{id} updates AMC"""
        # First get the existing AMC
        get_response = api_client.get(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}")
        assert get_response.status_code == 200
        
        original_data = get_response.json()
        original_status = original_data.get("status")
        
        # Update with same data (no actual change to avoid breaking existing data)
        update_data = {
            "status": original_status
        }
        
        response = api_client.put(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == KNOWN_AMC_ID
        print(f"✓ Updated AMC: {data.get('amc_no')}")


class TestAMCServiceVisits:
    """Test AMC Service Visit operations"""
    
    def test_add_service_visit(self, api_client):
        """Test POST /api/amc/{id}/service-visit adds a visit"""
        visit_data = {
            "visit_date": "2026-02-15",
            "visit_type": "scheduled",
            "status": "scheduled",
            "equipment_serviced": ["transformer"],
            "technician_name": "Test Technician",
            "remarks": "Test visit"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}/service-visit",
            json=visit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "visit_id" in data, "Missing visit_id in response"
        print(f"✓ Added service visit: {data.get('visit_id')}")


class TestAMCClone:
    """Test AMC Clone functionality"""
    
    def test_clone_amc(self, api_client):
        """Test POST /api/amc/{id}/clone creates a copy"""
        response = api_client.post(f"{BASE_URL}/api/amc/{KNOWN_AMC_ID}/clone")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Missing id in response"
        assert "amc_no" in data, "Missing amc_no in response"
        assert data["id"] != KNOWN_AMC_ID, "Cloned AMC should have different ID"
        
        cloned_id = data["id"]
        print(f"✓ Cloned AMC: {data.get('amc_no')}")
        
        # Cleanup - delete the cloned AMC
        delete_response = api_client.delete(f"{BASE_URL}/api/amc/{cloned_id}")
        assert delete_response.status_code == 200, "Failed to cleanup cloned AMC"
        print(f"✓ Cleaned up cloned AMC")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
