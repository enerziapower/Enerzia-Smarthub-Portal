"""
VCB (Vacuum Circuit Breaker) Report Tests
Tests for VCB-specific sections:
- Section 1: Service Checks
- Section 2: Contact Resistance Test
- Section 3: Insulation Resistance Test
- Section 4: Breaker Timings Test
- Section 5: Operational Checks
- Section 6: Functional Checks
- Section Enable/Disable toggles
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-debug-erp.preview.emergentagent.com')

class TestVCBReports:
    """VCB Report API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    # ==================== VCB Template Tests ====================
    
    def test_vcb_template_exists(self):
        """Test VCB template is available"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200, f"Failed to get VCB template: {response.text}"
        
        template = response.json()
        assert template.get("equipment_type") == "vcb"
        assert template.get("title") == "VCB SERVICE REPORT"
        print("PASS: VCB template exists")
    
    def test_vcb_template_has_equipment_fields(self):
        """Test VCB template has required equipment fields including No. of Poles and Frequency"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        equipment_fields = template.get("equipment_fields", [])
        field_names = [f["name"] for f in equipment_fields]
        
        # Check required fields
        assert "no_of_poles" in field_names, "Missing 'no_of_poles' field"
        assert "frequency" in field_names, "Missing 'frequency' field"
        assert "make" in field_names, "Missing 'make' field"
        assert "rated_voltage" in field_names, "Missing 'rated_voltage' field"
        assert "rated_current" in field_names, "Missing 'rated_current' field"
        
        # Check no_of_poles has correct options
        poles_field = next((f for f in equipment_fields if f["name"] == "no_of_poles"), None)
        assert poles_field is not None
        assert poles_field.get("type") == "select"
        assert "3P" in poles_field.get("options", [])
        assert "4P" in poles_field.get("options", [])
        
        print(f"PASS: VCB template has equipment fields: {field_names}")
    
    def test_vcb_template_has_service_checks(self):
        """Test VCB template has Section 1: Service Checks"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        service_checks = template.get("service_checks")
        assert service_checks is not None, "Missing service_checks section"
        assert service_checks.get("title") == "Service Checks"
        
        items = service_checks.get("items", [])
        item_ids = [i["id"] for i in items]
        
        # Check all required service check items
        required_items = [
            "spring_motor_resistance", "closing_coil", "tripping_coil",
            "counter_reading", "visual_inspection", "replacement",
            "thorough_cleaning", "lubrication", "gap_travel", "torque", "onoff_operation"
        ]
        for item in required_items:
            assert item in item_ids, f"Missing service check item: {item}"
        
        print(f"PASS: VCB template has service_checks with items: {item_ids}")
    
    def test_vcb_template_has_contact_resistance_test(self):
        """Test VCB template has Section 2: Contact Resistance Test"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        contact_test = template.get("contact_resistance_test")
        assert contact_test is not None, "Missing contact_resistance_test section"
        assert contact_test.get("title") == "Contact Resistance Test"
        assert contact_test.get("phases") == ["R", "Y", "B"]
        assert "resistance_measured" in contact_test.get("fields", [])
        assert "current_injected" in contact_test.get("fields", [])
        
        print("PASS: VCB template has contact_resistance_test section")
    
    def test_vcb_template_has_insulation_resistance_test(self):
        """Test VCB template has Section 3: Insulation Resistance Test"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        ir_test = template.get("insulation_resistance_test")
        assert ir_test is not None, "Missing insulation_resistance_test section"
        assert ir_test.get("title") == "Insulation Resistance Test"
        assert ir_test.get("phases") == ["R", "Y", "B"]
        
        # Check breaker_closed section
        breaker_closed = ir_test.get("breaker_closed")
        assert breaker_closed is not None
        assert breaker_closed.get("title") == "Breaker in Closed Condition"
        
        # Check breaker_open section
        breaker_open = ir_test.get("breaker_open")
        assert breaker_open is not None
        assert breaker_open.get("title") == "Breaker in Open Condition"
        
        print("PASS: VCB template has insulation_resistance_test section")
    
    def test_vcb_template_has_breaker_timings_test(self):
        """Test VCB template has Section 4: Breaker Timings Test"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        timings_test = template.get("breaker_timings_test")
        assert timings_test is not None, "Missing breaker_timings_test section"
        assert timings_test.get("title") == "Breaker Timings Test"
        assert timings_test.get("phases") == ["R", "Y", "B"]
        
        rows = timings_test.get("rows", [])
        row_ids = [r["id"] for r in rows]
        assert "closing_time" in row_ids
        assert "opening_time" in row_ids
        assert "close_open" in row_ids
        
        print(f"PASS: VCB template has breaker_timings_test with rows: {row_ids}")
    
    def test_vcb_template_has_operational_checks(self):
        """Test VCB template has Section 5: Operational Checks"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        op_checks = template.get("operational_checks")
        assert op_checks is not None, "Missing operational_checks section"
        assert op_checks.get("title") == "Operational Checks"
        assert op_checks.get("columns") == ["Manual", "Electrical"]
        
        rows = op_checks.get("rows", [])
        row_ids = [r["id"] for r in rows]
        assert "close" in row_ids
        assert "open" in row_ids
        
        print("PASS: VCB template has operational_checks section")
    
    def test_vcb_template_has_functional_checks(self):
        """Test VCB template has Section 6: Functional Checks"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/templates/vcb")
        assert response.status_code == 200
        
        template = response.json()
        func_checks = template.get("functional_checks")
        assert func_checks is not None, "Missing functional_checks section"
        assert func_checks.get("title") == "Functional Checks"
        
        items = func_checks.get("items", [])
        assert len(items) >= 10, f"Expected at least 10 functional check items, got {len(items)}"
        
        # Check some specific items
        item_texts = [i["item"] for i in items]
        assert any("Trip" in t for t in item_texts), "Missing Trip-related functional check"
        assert any("Spring" in t for t in item_texts), "Missing Spring-related functional check"
        
        print(f"PASS: VCB template has functional_checks with {len(items)} items")
    
    # ==================== VCB Report CRUD Tests ====================
    
    def test_create_vcb_report_with_all_sections(self):
        """Test creating a new VCB report with all VCB-specific sections"""
        report_data = {
            "equipment_type": "vcb",
            "report_category": "equipment",
            "customer_name": "TEST_VCB_Customer",
            "location": "Test Location",
            "tested_by": "Test Engineer",
            "status": "draft",
            
            # Equipment details with No. of Poles and Frequency
            "equipment_details": {
                "make": "ABB",
                "type_model": "VD4",
                "serial_no": "VCB-TEST-001",
                "feeder_name": "Incomer",
                "rated_voltage": "11",
                "rated_current": "1250",
                "breaking_capacity": "25",
                "frequency": "50",
                "no_of_poles": "3P"
            },
            
            # Section 1: Service Checks
            "vcb_service_checks": {
                "spring_motor_resistance": {"voltage": "230", "resistance": "150"},
                "closing_coil": {"voltage": "110", "resistance": "85"},
                "tripping_coil": {"voltage": "110", "resistance": "45"},
                "counter_reading": "1234",
                "visual_inspection": "No Damage Found",
                "replacement": "None",
                "thorough_cleaning": "Done with CRC",
                "lubrication": "Done with Isoflex Grease",
                "gap_travel": {
                    "roller_gap_before": "2.5",
                    "roller_gap_after": "2.8",
                    "damper_gap_before": "1.2",
                    "damper_gap_after": "1.5"
                },
                "torque": {"contact_arm": "25", "vi_fixing": "30"},
                "onoff_operation": {"count": "10", "method": "Electrical & Mechanical"}
            },
            
            # Section 2: Contact Resistance Test
            "vcb_contact_resistance": {
                "R": {"resistance": "45", "current": "100"},
                "Y": {"resistance": "48", "current": "100"},
                "B": {"resistance": "46", "current": "100"}
            },
            
            # Section 3: Insulation Resistance Test
            "vcb_insulation_resistance": {
                "breaker_closed": {
                    "ir_top_ground": {"R": "5.2", "Y": "5.1", "B": "5.3"},
                    "ir_phase_phase": {"R": "4.8", "Y": "4.9", "B": "5.0"}
                },
                "breaker_open": {
                    "ir_pole_pole": {"R": "6.0", "Y": "5.9", "B": "6.1"}
                }
            },
            
            # Section 4: Breaker Timings Test
            "vcb_breaker_timings": {
                "closing_time": {"R": "65", "Y": "66", "B": "64"},
                "opening_time": {"R": "35", "Y": "36", "B": "34"},
                "close_open": {"R": "100", "Y": "102", "B": "98"}
            },
            
            # Section 5: Operational Checks
            "vcb_operational_checks": {
                "close": {"manual": "OK", "electrical": "OK"},
                "open": {"manual": "OK", "electrical": "OK"}
            },
            
            # Section 6: Functional Checks
            "vcb_functional_checks": [
                {"id": 1, "item": "Trip/Trip circuit healthy Lamp Indication", "status": "Checked and Found OK"},
                {"id": 2, "item": "Limit Switch for spring charge motor", "status": "Checked and Found OK"},
                {"id": 3, "item": "Test/Service Limit Switch", "status": "Checked and Found OK"}
            ],
            
            # Section toggles
            "section_toggles": {
                "service_checks": True,
                "contact_resistance_test": True,
                "insulation_resistance_test": True,
                "breaker_timings_test": True,
                "operational_checks": True,
                "functional_checks": True
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/test-reports", json=report_data)
        assert response.status_code == 200, f"Failed to create VCB report: {response.text}"
        
        result = response.json()
        assert "id" in result
        assert "report_no" in result
        assert result["report_no"].startswith("VCB/")
        
        # Store for cleanup
        self.created_report_id = result["id"]
        
        print(f"PASS: Created VCB report with ID: {result['id']}, Report No: {result['report_no']}")
        
        # Verify the created report
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{result['id']}")
        assert get_response.status_code == 200
        
        saved_report = get_response.json()
        
        # Verify equipment details
        assert saved_report.get("equipment_details", {}).get("no_of_poles") == "3P"
        assert saved_report.get("equipment_details", {}).get("frequency") == "50"
        
        # Verify VCB-specific sections
        assert saved_report.get("vcb_service_checks") is not None
        assert saved_report.get("vcb_contact_resistance") is not None
        assert saved_report.get("vcb_insulation_resistance") is not None
        assert saved_report.get("vcb_breaker_timings") is not None
        assert saved_report.get("vcb_operational_checks") is not None
        
        # Verify section toggles
        assert saved_report.get("section_toggles", {}).get("service_checks") == True
        
        print("PASS: VCB report data verified after creation")
        
        # Cleanup
        delete_response = self.session.delete(f"{BASE_URL}/api/test-reports/{result['id']}")
        assert delete_response.status_code == 200
        print("PASS: Cleaned up test VCB report")
    
    def test_get_existing_vcb_report(self):
        """Test fetching existing VCB report"""
        report_id = "3aa9c6c5-32ef-4e20-8f2a-d02e1990e4fd"
        response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert response.status_code == 200, f"Failed to get VCB report: {response.text}"
        
        report = response.json()
        assert report.get("id") == report_id
        assert report.get("equipment_type") == "vcb"
        
        print(f"PASS: Fetched existing VCB report: {report.get('report_no')}")
    
    def test_update_vcb_report_section_toggles(self):
        """Test updating VCB report with section toggles"""
        # First create a report
        create_data = {
            "equipment_type": "vcb",
            "report_category": "equipment",
            "customer_name": "TEST_Toggle_Customer",
            "section_toggles": {
                "service_checks": True,
                "contact_resistance_test": True,
                "insulation_resistance_test": True,
                "breaker_timings_test": True,
                "operational_checks": True,
                "functional_checks": True
            }
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/test-reports", json=create_data)
        assert create_response.status_code == 200
        report_id = create_response.json()["id"]
        
        # Update with disabled sections
        update_data = {
            "section_toggles": {
                "service_checks": True,
                "contact_resistance_test": False,  # Disabled
                "insulation_resistance_test": True,
                "breaker_timings_test": False,  # Disabled
                "operational_checks": True,
                "functional_checks": True
            }
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/test-reports/{report_id}", json=update_data)
        assert update_response.status_code == 200
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/test-reports/{report_id}")
        assert get_response.status_code == 200
        
        updated_report = get_response.json()
        toggles = updated_report.get("section_toggles", {})
        assert toggles.get("contact_resistance_test") == False
        assert toggles.get("breaker_timings_test") == False
        assert toggles.get("service_checks") == True
        
        print("PASS: Section toggles updated correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/test-reports/{report_id}")
    
    def test_list_vcb_reports(self):
        """Test listing VCB reports"""
        response = self.session.get(f"{BASE_URL}/api/test-reports/equipment/vcb")
        assert response.status_code == 200, f"Failed to list VCB reports: {response.text}"
        
        reports = response.json()
        assert isinstance(reports, list)
        
        # All reports should be VCB type
        for report in reports:
            assert report.get("equipment_type") == "vcb"
        
        print(f"PASS: Listed {len(reports)} VCB reports")
    
    # ==================== ACB Regression Tests ====================
    
    def test_acb_reports_still_work(self):
        """Regression test: ACB reports should still work correctly"""
        # Get ACB template
        template_response = self.session.get(f"{BASE_URL}/api/test-reports/templates/acb")
        assert template_response.status_code == 200, "ACB template should still be available"
        
        template = template_response.json()
        assert template.get("equipment_type") == "acb"
        assert template.get("insulation_resistance_test") is not None
        assert template.get("coil_resistance_test") is not None
        assert template.get("contact_resistance_test") is not None
        
        # List ACB reports
        list_response = self.session.get(f"{BASE_URL}/api/test-reports/equipment/acb")
        assert list_response.status_code == 200, "Should be able to list ACB reports"
        
        print("PASS: ACB reports still work correctly (regression test)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
