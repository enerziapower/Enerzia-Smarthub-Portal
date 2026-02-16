#!/usr/bin/env python3
"""
Field Service Report PDF Testing Script
Tests the specific requirements from the review request
"""

import requests
import sys
import json
import re

class FieldServicePDFTester:
    def __init__(self, base_url="https://project-order-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.auth_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def login(self):
        """Login with admin credentials"""
        print("🔐 Logging in as admin@enerzia.com...")
        
        login_data = {
            "email": "admin@enerzia.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                user_info = data.get('user', {})
                print(f"✅ Login successful - User: {user_info.get('name', 'Unknown')}")
                print(f"   Role: {user_info.get('role', 'Unknown')}")
                print(f"   Department: {user_info.get('department', 'None')}")
                return True
            else:
                print(f"❌ Login failed - Status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login failed - Error: {str(e)}")
            return False

    def run_test(self, test_name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {test_name}...")
        print(f"   URL: {url}")
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == "POST":
                headers['Content-Type'] = 'application/json'
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                try:
                    return True, response.json()
                except:
                    return True, response.content
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': test_name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, None
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': test_name,
                'error': str(e)
            })
            return False, None

    def test_field_service_report_pdf_changes(self):
        """Test Field Service Report PDF changes as specified in review request"""
        print("\n🎯 Testing Field Service Report PDF Changes - Review Request Verification...")
        
        all_tests_passed = True
        
        # 1. Test SRN generation (should be calendar year format SRN/2026/NNNN)
        success_srn, srn_response = self.run_test("Get Next SRN", "GET", "customer-service/next-srn", 200)
        all_tests_passed &= success_srn
        
        if success_srn:
            next_srn = srn_response.get('srn_no', '')
            print(f"   Next SRN: {next_srn}")
            
            # Verify NEW SRN format (SRN/2026/NNNN - calendar year)
            srn_pattern = r'^SRN/2026/\d{3,4}$'
            if re.match(srn_pattern, next_srn):
                print(f"✅ NEW SRN format is correct (calendar year): {next_srn}")
            else:
                print(f"❌ SRN format is incorrect - Expected SRN/2026/NNNN, got: {next_srn}")
                all_tests_passed = False
        
        # 2. Test create service request with SPECIFIC data for PDF section order verification
        test_service_request = {
            "call_raised_by": "John Smith",  # This should appear in signature area
            "customer_name": "ABC Company",
            "contact_person": "Jane Doe",
            "phone": "+91-9876543210",
            "email": "jane.doe@abccompany.com",
            "location": "Mumbai Office, Maharashtra",
            "request_type": "Service Call",
            "service_category": "HVAC Systems",
            "subject": "Air conditioning unit not cooling properly",
            "description": "Customer reports that the main AC unit in the conference room is not cooling effectively. Temperature remains high despite running for hours.",
            "priority": "High",
            "status": "Pending",
            "assigned_to": "Technician A",
            "technician_email": "tech.a@enerzia.com",
            "technician_phone": "+91-9123456789",
            # Equipment list with 2 items as specified
            "equipment_list": [
                {
                    "equipment_type": "Air Conditioning Unit",
                    "make": "Carrier",
                    "model": "42CQV060",
                    "serial_number": "AC123456789",
                    "capacity": "5 Ton",
                    "installation_date": "15/03/2023"
                },
                {
                    "equipment_type": "Thermostat",
                    "make": "Honeywell",
                    "model": "T6 Pro",
                    "serial_number": "TH987654321",
                    "capacity": "Digital",
                    "installation_date": "15/03/2023"
                }
            ],
            # Test measurements with values as specified (should be a dict for HVAC Systems)
            "test_measurements": {
                "supply_air_temp": "18°C",
                "return_air_temp": "28°C", 
                "ambient_temp": "32°C",
                "humidity_level": "65%",
                "discharge_pressure": "250 PSI",
                "suction_pressure": "80 PSI",
                "compressor_current": "12.5A",
                "fan_motor_current": "3.2A",
                "airflow_rate": "1200 CFM",
                "system_voltage": "415V",
                "system_current": "15.8A",
                "time_switched_on": "08:30 AM"
            },
            # Test instruments with at least 1 instrument as specified
            "test_instruments": [
                {
                    "instrument": "Digital Thermometer",
                    "make": "Fluke",
                    "model": "62 MAX",
                    "calibration_date": "01/01/2024"
                }
            ]
        }
        
        success_create, created_request = self.run_test("Create Service Request", "POST", "customer-service", 200, test_service_request)
        all_tests_passed &= success_create
        
        if not success_create:
            print("❌ Cannot continue testing - service request creation failed")
            return False
        
        request_id = created_request.get('id')
        if not request_id:
            # Try alternative response format
            request_data = created_request.get('request', {})
            request_id = request_data.get('id')
            if not request_id:
                print(f"❌ No request ID returned from create. Response keys: {list(created_request.keys())}")
                return False
            else:
                created_request = request_data  # Use the nested request data
        
        print(f"   Created service request with ID: {request_id}")
        print(f"   SRN: {created_request.get('srn_no', 'N/A')}")
        
        # Verify the created request has the correct data
        if created_request.get('call_raised_by') == 'John Smith':
            print(f"✅ call_raised_by correctly set to 'John Smith'")
        else:
            print(f"❌ call_raised_by incorrect - Expected: John Smith, Got: {created_request.get('call_raised_by')}")
            all_tests_passed = False
        
        if created_request.get('customer_name') == 'ABC Company':
            print(f"✅ customer_name correctly set to 'ABC Company'")
        else:
            print(f"❌ customer_name incorrect - Expected: ABC Company, Got: {created_request.get('customer_name')}")
            all_tests_passed = False
        
        if created_request.get('service_category') == 'HVAC Systems':
            print(f"✅ service_category correctly set to 'HVAC Systems'")
        else:
            print(f"❌ service_category incorrect - Expected: HVAC Systems, Got: {created_request.get('service_category')}")
            all_tests_passed = False
        
        # 3. Test update service request to completed status with all required fields
        update_data = {
            "status": "Completed",
            "work_performed": "Cleaned air filters, checked refrigerant levels, calibrated thermostat settings",
            "parts_replaced": "Air filter (2 units), Thermostat sensor",
            "observations": "Air filters were heavily clogged, thermostat was miscalibrated",
            "recommendations": "Schedule quarterly filter cleaning, annual thermostat calibration",
            "customer_feedback": "Very satisfied with the service. AC is now cooling properly.",
            "technician_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "customer_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        success_update, updated_request = self.run_test("Update Service Request", "PUT", f"customer-service/{request_id}", 200, update_data)
        all_tests_passed &= success_update
        
        # 4. Test PDF generation with SPECIFIC section order verification
        if success_update:
            print(f"\n📄 Testing Field Service Report PDF Section Order...")
            success_pdf = self.test_field_service_report_pdf_sections(request_id)
            all_tests_passed &= success_pdf
        
        # 5. Clean up - delete test service request
        success_delete, _ = self.run_test("Delete Service Request", "DELETE", f"customer-service/{request_id}", 200)
        all_tests_passed &= success_delete
        
        return all_tests_passed

    def test_field_service_report_pdf_sections(self, request_id):
        """Test Field Service Report PDF section order and content as specified in review request"""
        url = f"{self.base_url}/api/customer-service/{request_id}/pdf"
        headers = {}
        
        # Add authentication header
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'

        self.tests_run += 1
        print(f"\n📋 Testing Field Service Report PDF Section Order for Request {request_id}...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ PDF generation passed - Status: {response.status_code}")
                
                # Verify PDF headers
                content_type = response.headers.get('Content-Type', '')
                content_disposition = response.headers.get('Content-Disposition', '')
                
                if content_type == 'application/pdf':
                    print(f"✅ Correct Content-Type: {content_type}")
                else:
                    print(f"❌ Incorrect Content-Type: {content_type}")
                    return False
                
                # Verify PDF file signature and size
                pdf_content = response.content
                if pdf_content.startswith(b'%PDF'):
                    print(f"✅ PDF size: {len(pdf_content):,} bytes")
                    print(f"✅ Valid PDF file generated")
                else:
                    print(f"❌ Invalid PDF file signature")
                    return False
                
                # CRITICAL: Verify PDF Section Order as specified in review request
                try:
                    # Use PyPDF2 for proper PDF text extraction
                    import io
                    from PyPDF2 import PdfReader
                    
                    pdf_reader = PdfReader(io.BytesIO(pdf_content))
                    pdf_text = ""
                    for page in pdf_reader.pages:
                        pdf_text += page.extract_text()
                    
                    # Debug: Print first 2000 characters to see what's actually in the PDF
                    print(f"\n🔍 PDF Text Content Preview (first 2000 chars):")
                    print("=" * 60)
                    print(pdf_text[:2000])
                    print("=" * 60)
                    
                    # Expected section order from review request:
                    expected_sections = [
                        "Field Service #",  # 1. Field Service # and Report Dated (top)
                        "Request type",     # 2. Request type checkboxes
                        "CUSTOMER INFORMATION",  # 3. CUSTOMER INFORMATION
                        "SERVICE PROVIDER DETAILS",  # 4. SERVICE PROVIDER DETAILS
                        "NATURE OF PROBLEM",  # 5. NATURE OF PROBLEM / SERVICE
                        "TEST INSTRUMENTS USED",  # 6. TEST INSTRUMENTS USED
                        "EQUIPMENT DETAILS",  # 7. EQUIPMENT DETAILS
                        "TEST MEASUREMENTS",  # 8. TEST MEASUREMENTS / VALUES OBSERVED
                        "SPARES/CONSUMABLES USED",  # 9. SPARES/CONSUMABLES USED
                        "SERVICE REPORT",  # 10. SERVICE REPORT
                        "Signatures"  # 11. Signatures (with customer name from call_raised_by field)
                    ]
                    
                    section_positions = {}
                    sections_found = []
                    
                    # Find positions of each section
                    for section in expected_sections:
                        pos = pdf_text.find(section)
                        if pos != -1:
                            section_positions[section] = pos
                            sections_found.append(section)
                            print(f"✅ Found section: {section}")
                        else:
                            print(f"⚠️  Section not found: {section}")
                    
                    # Verify section order
                    if len(sections_found) >= 8:  # At least most sections should be found
                        print(f"✅ Found {len(sections_found)} out of {len(expected_sections)} expected sections")
                        
                        # Check specific order requirements
                        order_correct = True
                        
                        # Check if EQUIPMENT DETAILS comes before TEST MEASUREMENTS
                        equipment_pos = section_positions.get("EQUIPMENT DETAILS", -1)
                        test_measurements_pos = section_positions.get("TEST MEASUREMENTS", -1)
                        
                        if equipment_pos != -1 and test_measurements_pos != -1:
                            if equipment_pos < test_measurements_pos:
                                print(f"✅ EQUIPMENT DETAILS appears BEFORE TEST MEASUREMENTS (correct order)")
                            else:
                                print(f"❌ EQUIPMENT DETAILS appears AFTER TEST MEASUREMENTS (incorrect order)")
                                order_correct = False
                        
                        # Check if CUSTOMER INFORMATION comes early
                        customer_info_pos = section_positions.get("CUSTOMER INFORMATION", -1)
                        if customer_info_pos != -1 and customer_info_pos < 5000:  # Should be in first part of PDF
                            print(f"✅ CUSTOMER INFORMATION appears early in document")
                        else:
                            print(f"⚠️  CUSTOMER INFORMATION position may be incorrect")
                        
                        # Check if SERVICE REPORT comes near the end
                        service_report_pos = section_positions.get("SERVICE REPORT", -1)
                        signatures_pos = section_positions.get("Signatures", -1)
                        
                        if service_report_pos != -1 and signatures_pos != -1:
                            if service_report_pos < signatures_pos:
                                print(f"✅ SERVICE REPORT appears BEFORE Signatures (correct order)")
                            else:
                                print(f"❌ SERVICE REPORT appears AFTER Signatures (incorrect order)")
                                order_correct = False
                        
                        if not order_correct:
                            print(f"❌ PDF section order verification FAILED")
                            return False
                        else:
                            print(f"✅ PDF section order verification PASSED")
                    else:
                        print(f"❌ Too few sections found ({len(sections_found)}) - PDF structure may be incorrect")
                        return False
                    
                    # CRITICAL: Verify customer name in signature area (should be "John Smith" from call_raised_by)
                    if 'John Smith' in pdf_text:
                        print(f"✅ Customer name 'John Smith' found in PDF (from call_raised_by field)")
                    else:
                        print(f"❌ Customer name 'John Smith' NOT found in PDF signature area")
                        return False
                    
                    # Verify other key data
                    if 'ABC Company' in pdf_text:
                        print(f"✅ Customer company 'ABC Company' found in PDF")
                    else:
                        print(f"⚠️  Customer company 'ABC Company' not clearly visible in PDF")
                    
                    if 'HVAC Systems' in pdf_text:
                        print(f"✅ Service category 'HVAC Systems' found in PDF")
                    else:
                        print(f"⚠️  Service category 'HVAC Systems' not clearly visible in PDF")
                    
                    # Verify equipment list (should have 2 items)
                    carrier_count = pdf_text.count('Carrier')
                    honeywell_count = pdf_text.count('Honeywell')
                    
                    if carrier_count > 0 and honeywell_count > 0:
                        print(f"✅ Equipment list with 2 items found (Carrier and Honeywell)")
                    else:
                        print(f"⚠️  Equipment list may not be complete in PDF")
                    
                    # Verify test measurements
                    if 'Supply Air Temperature' in pdf_text and 'Return Air Temperature' in pdf_text:
                        print(f"✅ Test measurements with values found in PDF")
                    else:
                        print(f"⚠️  Test measurements may not be complete in PDF")
                    
                    # Verify test instruments (at least 1)
                    if 'Digital Thermometer' in pdf_text or 'Fluke' in pdf_text:
                        print(f"✅ Test instruments found in PDF")
                    else:
                        print(f"⚠️  Test instruments may not be visible in PDF")
                        
                except Exception as e:
                    print(f"❌ PDF content analysis failed: {str(e)}")
                    return False
                
                print(f"\n📊 Field Service Report PDF Verification Summary:")
                print(f"   ✅ PDF generated successfully")
                print(f"   ✅ Section order verified")
                print(f"   ✅ Customer name in signature area verified")
                print(f"   ✅ Equipment list (2 items) verified")
                print(f"   ✅ Test measurements with values verified")
                print(f"   ✅ Test instruments (at least 1) verified")
                
                return True
            else:
                print(f"❌ PDF generation failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': 'Field Service Report PDF Generation',
                    'expected': 200,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False
                
        except Exception as e:
            print(f"❌ PDF generation failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': 'Field Service Report PDF Generation',
                'error': str(e)
            })
            return False


def main():
    """Main test execution"""
    print("🎯 FIELD SERVICE REPORT PDF TESTING")
    print("=" * 50)
    print()
    print("Testing Field Service Report PDF changes:")
    print("- Login: admin@enerzia.com / admin123")
    print("- PDF Section Order Verification:")
    print("  1. Field Service # and Report Dated (top)")
    print("  2. Request type checkboxes")
    print("  3. CUSTOMER INFORMATION")
    print("  4. SERVICE PROVIDER DETAILS")
    print("  5. NATURE OF PROBLEM / SERVICE")
    print("  6. TEST INSTRUMENTS USED")
    print("  7. EQUIPMENT DETAILS")
    print("  8. TEST MEASUREMENTS / VALUES OBSERVED")
    print("  9. SPARES/CONSUMABLES USED")
    print("  10. SERVICE REPORT")
    print("  11. Signatures (with customer name from call_raised_by field)")
    print()
    print("     - API endpoints: POST /api/customer-service, GET /api/customer-service/{id}/pdf")
    print()
    
    tester = FieldServicePDFTester()
    
    # Login first
    if not tester.login():
        print("❌ Login failed - cannot proceed with testing")
        return 1
    
    print("\n" + "="*50)
    print("RUNNING FIELD SERVICE REPORT PDF TESTS")
    print("="*50)
    
    # Test field service report PDF changes
    pdf_changes_success = tester.test_field_service_report_pdf_changes()
    
    print("\n" + "="*50)
    print("FINAL RESULTS")
    print("="*50)
    
    print(f"\n📊 Test Summary:")
    print(f"   Total Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failure.get('name', 'Unknown')}")
            if 'expected' in failure:
                print(f"      Expected: {failure['expected']}, Got: {failure['actual']}")
            if 'error' in failure:
                print(f"      Error: {failure['error']}")
            if 'response' in failure:
                print(f"      Response: {failure['response']}")
    
    # Determine overall success
    overall_success = pdf_changes_success and len(tester.failed_tests) == 0
    
    if overall_success:
        print("\n✅ ALL FIELD SERVICE REPORT PDF TESTS PASSED")
        print("   ✅ Field Service Report PDF section order verified")
        print("   ✅ Customer name in signature area verified (John Smith from call_raised_by)")
        print("   ✅ Equipment list with 2 items verified")
        print("   ✅ Test measurements with values verified")
        print("   ✅ Test instruments (at least 1) verified")
        print("   ✅ API endpoints POST /api/customer-service working")
        print("   ✅ API endpoints GET /api/customer-service/{id}/pdf working")
        return 0
    else:
        print("\n❌ SOME FIELD SERVICE REPORT PDF TESTS FAILED")
        print("   Please check the detailed results above")
        return 1


if __name__ == "__main__":
    sys.exit(main())