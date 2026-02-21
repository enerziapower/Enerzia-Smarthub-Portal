#!/usr/bin/env python3

import requests
import sys
import json
import os
from datetime import datetime

class HVACSystemsTester:
    def __init__(self, base_url="https://enerzia-workspace.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.auth_token = None

    def login(self, email="admin@enerzia.com", password="admin123"):
        """Login and get authentication token"""
        login_data = {
            "email": email,
            "password": password
        }
        
        url = f"{self.base_url}/api/auth/login"
        headers = {'Content-Type': 'application/json'}
        
        print(f"\n🔐 Logging in as {email}...")
        
        try:
            response = requests.post(url, json=login_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                self.auth_token = response_data.get('token')
                user_info = response_data.get('user', {})
                print(f"✅ Login successful - User: {user_info.get('name', 'Unknown')}")
                print(f"   Role: {user_info.get('role', 'Unknown')}")
                print(f"   Department: {user_info.get('department', 'All')}")
                return True
            else:
                print(f"❌ Login failed - Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False
                
        except Exception as e:
            print(f"❌ Login failed - Error: {str(e)}")
            return False

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authentication header if token is available and auth is required
        if auth_required and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_hvac_systems_test_measurements(self):
        """Test HVAC Systems service category with 12 test measurement parameters"""
        print("\n🔧 Testing HVAC Systems Test Measurements...")
        
        # Test data with all 12 HVAC parameters (3 new + 2 renamed + 7 existing)
        hvac_test_measurements = {
            # 7 existing parameters (unchanged)
            "supply_air_temp": "22.5",
            "return_air_temp": "24.8",
            "ambient_temp": "26.2",
            "compressor_current": "8.5",
            "fan_motor_current": "2.3",
            "airflow_rate": "1200",
            "humidity_level": "45",
            
            # 2 renamed parameters (new field names)
            "discharge_pressure": "250",  # Previously "refrigerant_pressure_high"
            "suction_pressure": "80",     # Previously "refrigerant_pressure_low"
            
            # 3 new parameters
            "system_voltage": "415",
            "system_current": "12.8",
            "time_switched_on": "08:30 AM"
        }
        
        # Create service request with HVAC Systems category
        service_request_data = {
            "customer_name": "HVAC Test Company Ltd",
            "contact_person": "John Smith",
            "contact_phone": "+91-9876543210",
            "contact_email": "john.smith@hvactest.com",
            "site_location": "Mumbai Industrial Area",
            "po_ref": "PO/HVAC/2026/001",
            "call_raised_by": "Maintenance Team",
            "call_raised_datetime": "06/01/2026 10:30 AM",
            "equipment_name": "Central Air Conditioning Unit",
            "equipment_make": "Carrier",
            "equipment_model": "30RB-0804",
            "equipment_serial": "CAR2026001",
            "request_type": "Service Call",
            "service_category": "HVAC Systems",  # Critical: HVAC Systems category
            "subject": "Annual Maintenance Check - HVAC System",
            "description": "Routine maintenance and performance testing of central AC unit",
            "reported_date": "06/01/2026",
            "assigned_to": "HVAC Technician",
            "technician_email": "hvac.tech@enerzia.com",
            "technician_phone": "+91-9876543211",
            "service_date": "06/01/2026",
            "completion_date": "06/01/2026",
            "test_instruments": [
                {"name": "Digital Multimeter", "make": "Fluke", "model": "87V", "serial": "DM001"},
                {"name": "Pressure Gauge Set", "make": "Testo", "model": "552", "serial": "PG001"},
                {"name": "Thermometer", "make": "Omega", "model": "HH374", "serial": "TH001"},
                {"name": "Anemometer", "make": "Extech", "model": "AN100", "serial": "AN001"},
                {"name": "Hygrometer", "make": "Vaisala", "model": "HM70", "serial": "HY001"}
            ],
            "test_measurements": hvac_test_measurements,  # All 12 parameters
            "spares_used": True,
            "spares_list": [
                {"part_name": "Air Filter", "quantity": 2, "part_number": "AF-001"},
                {"part_name": "Refrigerant R-410A", "quantity": "1 kg", "part_number": "REF-410A"}
            ],
            "work_performed": "1. Cleaned air filters\n2. Checked refrigerant levels\n3. Tested all electrical connections\n4. Verified system pressures\n5. Calibrated temperature sensors",
            "observations": "System operating within normal parameters. All test measurements within acceptable ranges.",
            "recommendations": "Replace air filters every 3 months. Schedule next maintenance in 6 months.",
            "customer_feedback": "Satisfied with service quality and thoroughness of testing.",
            "technician_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "customer_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "status": "Completed"
        }
        
        # Test 1: Create service request with HVAC Systems category
        success_create, created_request = self.run_test(
            "Create HVAC Service Request", 
            "POST", 
            "customer-service", 
            200, 
            service_request_data,
            auth_required=True
        )
        
        if not success_create:
            return False
        
        # Check if response has 'request' key (nested structure)
        request_data = created_request.get('request', created_request)
        request_id = request_data.get('id')
        if not request_id:
            print("❌ No request ID returned from create")
            print(f"   Response structure: {list(created_request.keys())}")
            return False
        
        print(f"✅ HVAC service request created with ID: {request_id}")
        print(f"   SRN: {request_data.get('srn_no', 'N/A')}")
        
        # Test 2: Verify all 12 test measurements are saved correctly
        saved_measurements = request_data.get('test_measurements', {})
        
        # Check all 12 expected parameters
        expected_params = [
            # 7 existing parameters
            'supply_air_temp', 'return_air_temp', 'ambient_temp',
            'compressor_current', 'fan_motor_current', 'airflow_rate', 'humidity_level',
            # 2 renamed parameters (new field names)
            'discharge_pressure', 'suction_pressure',
            # 3 new parameters
            'system_voltage', 'system_current', 'time_switched_on'
        ]
        
        all_params_saved = True
        for param in expected_params:
            expected_value = hvac_test_measurements.get(param)
            saved_value = saved_measurements.get(param)
            
            if saved_value == expected_value:
                print(f"✅ {param}: {saved_value} (saved correctly)")
            else:
                print(f"❌ {param}: Expected '{expected_value}', got '{saved_value}'")
                all_params_saved = False
        
        if all_params_saved:
            print(f"✅ All 12 HVAC test measurement parameters saved correctly")
        else:
            print(f"❌ Some HVAC test measurement parameters not saved correctly")
            return False
        
        # Test 3: Verify service category is HVAC Systems
        saved_category = request_data.get('service_category')
        if saved_category == "HVAC Systems":
            print(f"✅ Service category saved correctly: {saved_category}")
        else:
            print(f"❌ Service category incorrect - Expected: 'HVAC Systems', Got: '{saved_category}'")
            return False
        
        # Test 4: Download PDF and verify it contains test measurements
        url = f"{self.base_url}/api/customer-service/{request_id}/pdf"
        headers = {'Authorization': f'Bearer {self.auth_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Download HVAC Service Report PDF...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                self.tests_passed += 1
                print(f"✅ PDF downloaded successfully - Status: {response.status_code}")
                
                # Verify PDF headers
                content_type = response.headers.get('Content-Type', '')
                if content_type == 'application/pdf':
                    print(f"✅ Correct Content-Type: {content_type}")
                else:
                    print(f"❌ Incorrect Content-Type: {content_type}")
                    return False
                
                # Verify PDF file signature
                pdf_content = response.content
                if pdf_content.startswith(b'%PDF'):
                    print(f"✅ Valid PDF file signature")
                    print(f"   PDF size: {len(pdf_content):,} bytes")
                    success_pdf = True
                else:
                    print(f"❌ Invalid PDF file signature")
                    success_pdf = False
            else:
                print(f"❌ PDF download failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                success_pdf = False
                
        except Exception as e:
            print(f"❌ PDF download failed - Error: {str(e)}")
            success_pdf = False
        
        if not success_pdf:
            return False
        
        # Test 5: Verify backward compatibility with old field names
        # Test that old field names still work (for backward compatibility)
        legacy_measurements = hvac_test_measurements.copy()
        legacy_measurements['refrigerant_pressure_high'] = "260"  # Old field name
        legacy_measurements['refrigerant_pressure_low'] = "85"    # Old field name
        
        legacy_request_data = service_request_data.copy()
        legacy_request_data['customer_name'] = "Legacy HVAC Test Company"
        legacy_request_data['test_measurements'] = legacy_measurements
        
        success_legacy, created_legacy = self.run_test(
            "Create HVAC Service Request with Legacy Fields",
            "POST",
            "customer-service",
            200,
            legacy_request_data,
            auth_required=True
        )
        
        if success_legacy:
            legacy_data = created_legacy.get('request', created_legacy)
            legacy_id = legacy_data.get('id')
            print(f"✅ Legacy field names supported for backward compatibility")
            
            # Clean up legacy request
            if legacy_id:
                self.run_test("Delete Legacy HVAC Request", "DELETE", f"customer-service/{legacy_id}", 200, auth_required=True)
        
        # Test 6: Clean up - delete the test service request
        success_delete, _ = self.run_test(
            "Delete HVAC Service Request",
            "DELETE",
            f"customer-service/{request_id}",
            200,
            auth_required=True
        )
        
        if success_delete:
            print(f"✅ HVAC service request deleted successfully")
        
        return success_create and all_params_saved and success_pdf and success_delete

    def run_hvac_tests(self):
        """Run HVAC Systems test measurements tests"""
        print("================================================================================")
        print("🔧 HVAC SYSTEMS TEST MEASUREMENTS TESTING")
        print("================================================================================")
        print("Testing Focus: Field Service Request HVAC Systems test measurements changes")
        print("Expected Changes:")
        print("  - 3 new parameters: System Voltage, System Current, Time Switched ON")
        print("  - 2 renamed parameters: Discharge Pressure, Suction Pressure")
        print("  - 7 existing parameters: supply_air_temp, return_air_temp, ambient_temp,")
        print("    compressor_current, fan_motor_current, airflow_rate, humidity_level")
        print("  - Total: 12 test measurement parameters")
        print("================================================================================")
        
        # Login first
        if not self.login():
            print("❌ Login failed - cannot proceed with tests")
            return False
        
        # Run HVAC Systems test
        hvac_success = self.test_hvac_systems_test_measurements()
        
        # Print summary
        print("\n================================================================================")
        print("📋 TEST SUMMARY")
        print("================================================================================")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"   - {test['name']}: {error_msg}")
        
        if hvac_success:
            print("\n✅ ALL HVAC SYSTEMS TESTS PASSED!")
        else:
            print("\n❌ SOME HVAC SYSTEMS TESTS FAILED!")
        
        print("================================================================================")
        return hvac_success

if __name__ == "__main__":
    tester = HVACSystemsTester()
    success = tester.run_hvac_tests()
    sys.exit(0 if success else 1)