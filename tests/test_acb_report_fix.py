"""
Test ACB Report Fix - Testing the bug fixes for:
1. Editing a saved report shows a blank form
2. Input fields display [object Object] and cannot be edited
3. 'Failed to save report' error when submitting
4. PDF text overlapping issues
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-order-system.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"

# Existing ACB report ID for testing
EXISTING_ACB_REPORT_ID = "1667bbd9-0ae5-41b0-8aad-1245195156d0"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestACBReportFetch:
    """Test fetching ACB report data - verifies fix for blank form issue."""
    
    def test_fetch_existing_acb_report(self, auth_headers):
        """Test that existing ACB report can be fetched successfully."""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to fetch report: {response.text}"
        data = response.json()
        
        # Verify report has required fields
        assert "id" in data, "Report should have id"
        assert data["id"] == EXISTING_ACB_REPORT_ID
        assert "equipment_type" in data, "Report should have equipment_type"
        assert data["equipment_type"] == "acb", f"Expected acb, got {data['equipment_type']}"
        print(f"✓ Successfully fetched ACB report: {data.get('report_no', 'N/A')}")
    
    def test_insulation_resistance_not_object_object(self, auth_headers):
        """Test that insulation_resistance fields are strings, not [object Object]."""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        ir = data.get("insulation_resistance", {})
        
        # Check voltage_applied is a string
        voltage_applied = ir.get("voltage_applied", "")
        assert isinstance(voltage_applied, str), f"voltage_applied should be string, got {type(voltage_applied)}"
        assert "[object Object]" not in str(voltage_applied), "voltage_applied contains [object Object]"
        print(f"✓ voltage_applied is valid string: '{voltage_applied}'")
        
        # Check ambient_temp is a string
        ambient_temp = ir.get("ambient_temp", "")
        assert isinstance(ambient_temp, str), f"ambient_temp should be string, got {type(ambient_temp)}"
        assert "[object Object]" not in str(ambient_temp), "ambient_temp contains [object Object]"
        print(f"✓ ambient_temp is valid string: '{ambient_temp}'")
        
        # Check cb_open values are strings
        cb_open = ir.get("cb_open", {})
        for key, value in cb_open.items():
            assert isinstance(value, str), f"cb_open[{key}] should be string, got {type(value)}"
            assert "[object Object]" not in str(value), f"cb_open[{key}] contains [object Object]"
        print(f"✓ cb_open values are valid strings")
        
        # Check cb_close_phase_earth values
        cb_close_pe = ir.get("cb_close_phase_earth", {})
        for key, value in cb_close_pe.items():
            assert isinstance(value, str), f"cb_close_phase_earth[{key}] should be string, got {type(value)}"
            assert "[object Object]" not in str(value), f"cb_close_phase_earth[{key}] contains [object Object]"
        print(f"✓ cb_close_phase_earth values are valid strings")
        
        # Check cb_close_phase_phase values
        cb_close_pp = ir.get("cb_close_phase_phase", {})
        for key, value in cb_close_pp.items():
            assert isinstance(value, str), f"cb_close_phase_phase[{key}] should be string, got {type(value)}"
            assert "[object Object]" not in str(value), f"cb_close_phase_phase[{key}] contains [object Object]"
        print(f"✓ cb_close_phase_phase values are valid strings")
    
    def test_coil_resistance_not_object_object(self, auth_headers):
        """Test that coil_resistance fields are strings, not [object Object]."""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        cr = data.get("coil_resistance", {})
        
        for field in ["ambient_temp", "close_coil", "trip_coil"]:
            value = cr.get(field, "")
            assert isinstance(value, str), f"coil_resistance[{field}] should be string, got {type(value)}"
            assert "[object Object]" not in str(value), f"coil_resistance[{field}] contains [object Object]"
        print(f"✓ coil_resistance values are valid strings")
    
    def test_contact_resistance_not_object_object(self, auth_headers):
        """Test that contact_resistance fields are strings, not [object Object]."""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        contr = data.get("contact_resistance", {})
        
        for field in ["injected_current", "r_phase", "y_phase", "b_phase", "n_phase"]:
            value = contr.get(field, "")
            assert isinstance(value, str), f"contact_resistance[{field}] should be string, got {type(value)}"
            assert "[object Object]" not in str(value), f"contact_resistance[{field}] contains [object Object]"
        print(f"✓ contact_resistance values are valid strings")


class TestACBReportUpdate:
    """Test updating ACB report - verifies fix for 'Failed to save' error."""
    
    def test_update_acb_report_basic_fields(self, auth_headers):
        """Test updating basic fields of ACB report."""
        # First fetch current data
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        original_data = response.json()
        
        # Update with modified remarks
        update_data = {
            "remarks": f"Test update at {pytest.importorskip('datetime').datetime.now().isoformat()}",
            "status": original_data.get("status", "draft")
        }
        
        response = requests.put(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update report: {response.text}"
        print(f"✓ Successfully updated ACB report basic fields")
    
    def test_update_acb_report_insulation_resistance(self, auth_headers):
        """Test updating insulation_resistance section."""
        update_data = {
            "insulation_resistance": {
                "voltage_applied": "1000V DC for 60 Sec",
                "ambient_temp": "25",
                "cb_open": {
                    "R-R'": "1000",
                    "Y-Y'": "1000",
                    "B-B'": "1000",
                    "N-N'": "1000"
                },
                "cb_close_phase_earth": {
                    "R-E": "1000",
                    "Y-E": "1000",
                    "B-E": "1000",
                    "N-E": "1000"
                },
                "cb_close_phase_phase": {
                    "R-Y": "1000",
                    "Y-B": "1000",
                    "B-R": "1000"
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update insulation_resistance: {response.text}"
        
        # Verify the update persisted
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        ir = data.get("insulation_resistance", {})
        
        assert ir.get("ambient_temp") == "25", f"ambient_temp not updated: {ir.get('ambient_temp')}"
        assert ir.get("cb_open", {}).get("R-R'") == "1000", f"cb_open R-R' not updated"
        print(f"✓ Successfully updated and verified insulation_resistance")
    
    def test_update_acb_report_coil_resistance(self, auth_headers):
        """Test updating coil_resistance section."""
        update_data = {
            "coil_resistance": {
                "ambient_temp": "25",
                "close_coil": "50",
                "trip_coil": "45"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update coil_resistance: {response.text}"
        
        # Verify the update persisted
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        cr = data.get("coil_resistance", {})
        
        assert cr.get("close_coil") == "50", f"close_coil not updated: {cr.get('close_coil')}"
        assert cr.get("trip_coil") == "45", f"trip_coil not updated: {cr.get('trip_coil')}"
        print(f"✓ Successfully updated and verified coil_resistance")
    
    def test_update_acb_report_contact_resistance(self, auth_headers):
        """Test updating contact_resistance section."""
        update_data = {
            "contact_resistance": {
                "injected_current": "100 Amps DC",
                "r_phase": "50",
                "y_phase": "52",
                "b_phase": "48",
                "n_phase": "51"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update contact_resistance: {response.text}"
        
        # Verify the update persisted
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{EXISTING_ACB_REPORT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        contr = data.get("contact_resistance", {})
        
        assert contr.get("r_phase") == "50", f"r_phase not updated: {contr.get('r_phase')}"
        print(f"✓ Successfully updated and verified contact_resistance")


class TestACBReportPDF:
    """Test PDF generation for ACB report."""
    
    def test_pdf_generation(self, auth_headers):
        """Test that PDF can be generated without errors."""
        response = requests.get(
            f"{BASE_URL}/api/equipment-report/acb/{EXISTING_ACB_REPORT_ID}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to generate PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", "Response is not a PDF"
        
        # Check PDF has content
        content_length = len(response.content)
        assert content_length > 1000, f"PDF seems too small: {content_length} bytes"
        print(f"✓ Successfully generated PDF ({content_length} bytes)")


class TestACBReportCreate:
    """Test creating new ACB report."""
    
    def test_create_new_acb_report(self, auth_headers):
        """Test creating a new ACB report with all fields."""
        new_report = {
            "equipment_type": "acb",
            "report_category": "equipment",
            "report_type": "Periodical Maintenance",
            "customer_name": "TEST_Customer",
            "location": "TEST_Location",
            "date_of_testing": "2025-01-15",
            "tested_by": "Test Engineer",
            "witnessed_by": "Test Witness",
            "status": "draft",
            "equipment_details": {
                "switchgear": "TEST_Switchgear",
                "feeder_reference": "TEST_Feeder",
                "make_type": "TEST_Make",
                "rated_current": "1000",
                "rated_voltage": "415",
                "serial_number": "TEST_SN001"
            },
            "insulation_resistance": {
                "voltage_applied": "1000V DC for 60 Sec",
                "ambient_temp": "30",
                "cb_open": {
                    "R-R'": "2000",
                    "Y-Y'": "2000",
                    "B-B'": "2000",
                    "N-N'": "2000"
                },
                "cb_close_phase_earth": {
                    "R-E": "2000",
                    "Y-E": "2000",
                    "B-E": "2000",
                    "N-E": "2000"
                },
                "cb_close_phase_phase": {
                    "R-Y": "2000",
                    "Y-B": "2000",
                    "B-R": "2000"
                }
            },
            "coil_resistance": {
                "ambient_temp": "30",
                "close_coil": "55",
                "trip_coil": "50"
            },
            "contact_resistance": {
                "injected_current": "100 Amps DC",
                "r_phase": "45",
                "y_phase": "46",
                "b_phase": "44",
                "n_phase": "45"
            },
            "remarks": "TEST_Report created for testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/test-reports",
            headers=auth_headers,
            json=new_report
        )
        assert response.status_code == 200, f"Failed to create report: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should contain id"
        assert "report_no" in data, "Response should contain report_no"
        
        created_id = data["id"]
        print(f"✓ Successfully created new ACB report: {data['report_no']} (ID: {created_id})")
        
        # Verify the created report can be fetched
        response = requests.get(
            f"{BASE_URL}/api/test-reports/{created_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to fetch created report: {response.text}"
        fetched = response.json()
        
        # Verify fields are correct
        assert fetched["customer_name"] == "TEST_Customer"
        assert fetched["insulation_resistance"]["ambient_temp"] == "30"
        assert fetched["coil_resistance"]["close_coil"] == "55"
        assert fetched["contact_resistance"]["r_phase"] == "45"
        print(f"✓ Verified created report data is correct")
        
        # Cleanup - delete the test report
        response = requests.delete(
            f"{BASE_URL}/api/test-reports/{created_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete test report: {response.text}"
        print(f"✓ Cleaned up test report")


class TestACBReportsList:
    """Test ACB reports list endpoint."""
    
    def test_get_acb_reports_list(self, auth_headers):
        """Test fetching list of ACB reports."""
        response = requests.get(
            f"{BASE_URL}/api/test-reports/equipment/acb",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to fetch ACB reports list: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Successfully fetched ACB reports list ({len(data)} reports)")
        
        # Check that our test report is in the list
        report_ids = [r.get("id") for r in data]
        assert EXISTING_ACB_REPORT_ID in report_ids, "Existing test report not found in list"
        print(f"✓ Existing test report found in list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
