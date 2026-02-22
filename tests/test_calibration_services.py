"""
Calibration Services Module Tests
Tests CRUD operations, PDF generation, and all API endpoints for calibration contracts
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smarthub-erp-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"

# Existing test contract ID
EXISTING_CONTRACT_ID = "b0752409-3f2a-4e96-9747-2524833603e8"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCalibrationDashboardStats:
    """Test dashboard statistics endpoint"""
    
    def test_01_dashboard_stats_returns_200(self, api_client):
        """Dashboard stats endpoint should return 200"""
        response = api_client.get(f"{BASE_URL}/api/calibration/dashboard/stats")
        assert response.status_code == 200
        print(f"Dashboard stats: {response.json()}")
    
    def test_02_dashboard_stats_has_required_fields(self, api_client):
        """Dashboard stats should have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/calibration/dashboard/stats")
        data = response.json()
        
        required_fields = ['total_contracts', 'active_contracts', 'expired_contracts', 'expiring_soon', 'total_meters']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be integer"
        print(f"All required fields present: {required_fields}")


class TestCalibrationContractsList:
    """Test contracts list endpoint"""
    
    def test_03_list_contracts_returns_200(self, api_client):
        """List contracts endpoint should return 200"""
        response = api_client.get(f"{BASE_URL}/api/calibration")
        assert response.status_code == 200
        print(f"List contracts response: {response.status_code}")
    
    def test_04_list_contracts_has_pagination(self, api_client):
        """List contracts should have pagination fields"""
        response = api_client.get(f"{BASE_URL}/api/calibration")
        data = response.json()
        
        assert 'contracts' in data
        assert 'total' in data
        assert 'skip' in data
        assert 'limit' in data
        print(f"Pagination: total={data['total']}, skip={data['skip']}, limit={data['limit']}")
    
    def test_05_list_contracts_status_filter(self, api_client):
        """Status filter should work"""
        response = api_client.get(f"{BASE_URL}/api/calibration?status=active")
        assert response.status_code == 200
        data = response.json()
        
        # All returned contracts should be active
        for contract in data.get('contracts', []):
            assert contract.get('status') == 'active', f"Contract {contract.get('id')} has status {contract.get('status')}"
        print(f"Status filter working - {len(data.get('contracts', []))} active contracts")


class TestCalibrationContractCRUD:
    """Test CRUD operations for calibration contracts"""
    
    def test_06_get_existing_contract(self, api_client):
        """Get existing contract by ID"""
        response = api_client.get(f"{BASE_URL}/api/calibration/{EXISTING_CONTRACT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('id') == EXISTING_CONTRACT_ID
        assert 'contract_no' in data
        assert 'contract_details' in data
        assert 'customer_info' in data
        assert 'service_provider' in data
        assert 'meter_list' in data
        assert 'calibration_visits' in data
        print(f"Contract retrieved: {data.get('contract_no')}")
    
    def test_07_contract_has_customer_info(self, api_client):
        """Contract should have customer_info with all fields"""
        response = api_client.get(f"{BASE_URL}/api/calibration/{EXISTING_CONTRACT_ID}")
        data = response.json()
        
        customer_info = data.get('customer_info', {})
        expected_fields = ['customer_name', 'site_location', 'contact_person', 'contact_number', 'email']
        for field in expected_fields:
            assert field in customer_info, f"Missing customer_info field: {field}"
        print(f"Customer info: {customer_info.get('customer_name')}")
    
    def test_08_contract_has_service_provider(self, api_client):
        """Contract should have service_provider with all fields"""
        response = api_client.get(f"{BASE_URL}/api/calibration/{EXISTING_CONTRACT_ID}")
        data = response.json()
        
        service_provider = data.get('service_provider', {})
        expected_fields = ['company_name', 'address', 'contact_person', 'contact_number', 'email', 'nabl_cert_no']
        for field in expected_fields:
            assert field in service_provider, f"Missing service_provider field: {field}"
        print(f"Service provider: {service_provider.get('company_name')}")
    
    def test_09_contract_has_contract_details(self, api_client):
        """Contract should have contract_details with all fields"""
        response = api_client.get(f"{BASE_URL}/api/calibration/{EXISTING_CONTRACT_ID}")
        data = response.json()
        
        contract_details = data.get('contract_details', {})
        expected_fields = ['start_date', 'end_date', 'calibration_frequency', 'scope_of_work', 'special_conditions']
        for field in expected_fields:
            assert field in contract_details, f"Missing contract_details field: {field}"
        print(f"Contract period: {contract_details.get('start_date')} to {contract_details.get('end_date')}")
    
    def test_10_contract_has_meter_list(self, api_client):
        """Contract should have meter_list"""
        response = api_client.get(f"{BASE_URL}/api/calibration/{EXISTING_CONTRACT_ID}")
        data = response.json()
        
        meter_list = data.get('meter_list', [])
        assert isinstance(meter_list, list)
        
        if len(meter_list) > 0:
            meter = meter_list[0]
            expected_fields = ['id', 'meter_type', 'make', 'model', 'serial_no', 'range', 'accuracy_class', 'location', 'tag_no']
            for field in expected_fields:
                assert field in meter, f"Missing meter field: {field}"
        print(f"Meter list: {len(meter_list)} meters")


class TestCalibrationContractCreate:
    """Test creating new calibration contracts"""
    
    created_contract_id = None
    
    def test_11_create_contract(self, api_client):
        """Create a new calibration contract"""
        payload = {
            "project_id": None,
            "status": "active",
            "contract_details": {
                "contract_no": "",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "calibration_frequency": "quarterly",
                "scope_of_work": "Test calibration scope",
                "special_conditions": "Test special conditions"
            },
            "customer_info": {
                "customer_name": "TEST_Calibration Customer",
                "site_location": "Test Location",
                "contact_person": "Test Person",
                "contact_number": "1234567890",
                "email": "test@calibration.com"
            },
            "service_provider": {
                "company_name": "Enerzia Power Solutions",
                "address": "Test Address",
                "contact_person": "Service Person",
                "contact_number": "0987654321",
                "email": "service@enerzia.com",
                "nabl_cert_no": "TEST-NABL-001"
            },
            "meter_list": [
                {
                    "meter_type": "voltmeter",
                    "make": "Test Make",
                    "model": "Test Model",
                    "serial_no": "TEST-SN-001",
                    "range": "0-500V",
                    "accuracy_class": "0.5",
                    "location": "Test Panel",
                    "tag_no": "VM-TEST-01"
                }
            ],
            "calibration_visits": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/calibration", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert 'id' in data
        assert 'contract_no' in data
        assert data['contract_no'].startswith('CAL/')
        
        TestCalibrationContractCreate.created_contract_id = data['id']
        print(f"Created contract: {data['contract_no']} (ID: {data['id']})")
    
    def test_12_verify_created_contract(self, api_client):
        """Verify created contract data persisted"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract created")
        
        response = api_client.get(f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['customer_info']['customer_name'] == "TEST_Calibration Customer"
        assert data['contract_details']['calibration_frequency'] == "quarterly"
        assert len(data['meter_list']) == 1
        assert data['meter_list'][0]['meter_type'] == "voltmeter"
        print("Contract data verified successfully")


class TestCalibrationContractUpdate:
    """Test updating calibration contracts"""
    
    def test_13_update_contract_customer_info(self, api_client):
        """Update contract customer info"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract created")
        
        payload = {
            "customer_info": {
                "customer_name": "TEST_Updated Customer Name",
                "site_location": "Updated Location",
                "contact_person": "Updated Person",
                "contact_number": "9999999999",
                "email": "updated@test.com"
            }
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['customer_info']['customer_name'] == "TEST_Updated Customer Name"
        print("Customer info updated successfully")
    
    def test_14_add_meter_to_contract(self, api_client):
        """Add a new meter to contract"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract created")
        
        # First get current meters
        response = api_client.get(f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}")
        current_meters = response.json().get('meter_list', [])
        
        # Add new meter
        new_meter = {
            "meter_type": "ammeter",
            "make": "New Make",
            "model": "New Model",
            "serial_no": "TEST-SN-002",
            "range": "0-100A",
            "accuracy_class": "1.0",
            "location": "Test Panel 2",
            "tag_no": "AM-TEST-01"
        }
        current_meters.append(new_meter)
        
        payload = {"meter_list": current_meters}
        response = api_client.put(
            f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data['meter_list']) == 2
        print(f"Meter added - now {len(data['meter_list'])} meters")
    
    def test_15_add_calibration_visit(self, api_client):
        """Add a calibration visit to contract"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract created")
        
        visit_payload = {
            "visit_date": "2026-03-15",
            "visit_type": "scheduled",
            "status": "scheduled",
            "technician": "Test Technician",
            "remarks": "Quarterly calibration visit",
            "test_results": []
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}/visits",
            json=visit_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'visit_id' in data
        print(f"Visit added: {data['visit_id']}")


class TestCalibrationPDFGeneration:
    """Test PDF generation for calibration contracts"""
    
    def test_16_download_pdf_report(self, api_client):
        """Download PDF report for existing contract"""
        response = api_client.get(f"{BASE_URL}/api/calibration-report/{EXISTING_CONTRACT_ID}/pdf")
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp
        assert 'Calibration_Report' in content_disp
        
        # Check PDF content
        content = response.content
        assert len(content) > 1000, "PDF too small"
        assert content[:4] == b'%PDF', "Not a valid PDF"
        
        print(f"PDF downloaded: {len(content)} bytes")
    
    def test_17_pdf_is_valid_reportlab_pdf(self, api_client):
        """PDF should be a valid ReportLab generated PDF"""
        response = api_client.get(f"{BASE_URL}/api/calibration-report/{EXISTING_CONTRACT_ID}/pdf")
        content = response.content.decode('latin-1', errors='ignore')
        
        # Check for ReportLab signature (PDF content is compressed)
        assert 'ReportLab' in content or 'REPORTLAB' in content.upper(), "Not a ReportLab PDF"
        assert response.status_code == 200
        print("PDF is valid ReportLab generated document")


class TestCalibrationMeterTypes:
    """Test meter types endpoint"""
    
    def test_18_get_meter_types(self, api_client):
        """Get list of supported meter types"""
        response = api_client.get(f"{BASE_URL}/api/calibration/meter-types")
        assert response.status_code == 200
        
        data = response.json()
        assert 'meter_types' in data
        
        expected_types = ['energy_meter', 'voltmeter', 'ammeter', 'ct', 'pt', 'pf_meter']
        for meter_type in expected_types:
            assert meter_type in data['meter_types'], f"Missing meter type: {meter_type}"
        
        print(f"Meter types: {list(data['meter_types'].keys())}")


class TestCalibrationContractDelete:
    """Test deleting calibration contracts"""
    
    def test_19_delete_contract(self, api_client):
        """Delete the test contract"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data
        print(f"Contract deleted: {TestCalibrationContractCreate.created_contract_id}")
    
    def test_20_verify_contract_deleted(self, api_client):
        """Verify contract no longer exists"""
        if not TestCalibrationContractCreate.created_contract_id:
            pytest.skip("No contract to verify")
        
        response = api_client.get(f"{BASE_URL}/api/calibration/{TestCalibrationContractCreate.created_contract_id}")
        assert response.status_code == 404
        print("Contract deletion verified")


class TestCalibrationErrorHandling:
    """Test error handling"""
    
    def test_21_get_nonexistent_contract(self, api_client):
        """Get non-existent contract should return 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/calibration/{fake_id}")
        assert response.status_code == 404
        print("404 returned for non-existent contract")
    
    def test_22_delete_nonexistent_contract(self, api_client):
        """Delete non-existent contract should return 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/calibration/{fake_id}")
        assert response.status_code == 404
        print("404 returned for delete non-existent contract")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
