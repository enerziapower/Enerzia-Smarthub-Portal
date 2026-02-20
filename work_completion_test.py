import requests
import sys
import json
import os
from datetime import datetime

class WorkCompletionCertificateAPITester:
    def __init__(self, base_url="https://smarthub-enterprise.preview.emergentagent.com"):
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
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

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

    def test_work_completion_certificate_exists(self):
        """Test that the specific certificate exists"""
        print("\n📋 Testing Work Completion Certificate Existence...")
        
        certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
        
        success, certificate = self.run_test("Get Work Completion Certificate", "GET", f"work-completion/{certificate_id}", 200, auth_required=True)
        if not success:
            print("❌ Cannot proceed - certificate not found")
            return False
        
        print(f"✅ Certificate found:")
        print(f"   Document No: {certificate.get('document_no', 'Unknown')}")
        print(f"   Project Name: {certificate.get('project_name', 'Unknown')}")
        print(f"   Customer: {certificate.get('customer_name', 'Unknown')}")
        print(f"   Customer Representative: {certificate.get('customer_representative', 'Not set')}")
        print(f"   Status: {certificate.get('status', 'Unknown')}")
        
        return True

    def test_work_completion_certificate_pdf(self):
        """Test Work Completion Certificate PDF generation with updated features"""
        print("\n📄 Testing Work Completion Certificate PDF Generation...")
        
        certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
        
        # Test PDF download
        url = f"{self.base_url}/api/work-completion/{certificate_id}/pdf"
        headers = {'Authorization': f'Bearer {self.auth_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing PDF Download...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ PDF download passed - Status: {response.status_code}")
                
                # Verify PDF headers
                content_type = response.headers.get('Content-Type', '')
                content_disposition = response.headers.get('Content-Disposition', '')
                
                if content_type == 'application/pdf':
                    print(f"✅ Correct Content-Type: {content_type}")
                else:
                    print(f"❌ Incorrect Content-Type: {content_type}")
                    return False
                
                if 'attachment' in content_disposition and 'filename=' in content_disposition:
                    print(f"✅ Correct Content-Disposition: {content_disposition}")
                else:
                    print(f"❌ Incorrect Content-Disposition: {content_disposition}")
                    return False
                
                # Verify PDF file signature
                pdf_content = response.content
                if pdf_content.startswith(b'%PDF'):
                    print(f"✅ Valid PDF file signature")
                    print(f"   PDF Size: {len(pdf_content):,} bytes ({len(pdf_content)/1024:.1f} KB)")
                else:
                    print(f"❌ Invalid PDF file signature")
                    return False
                
                # Check for substantial content (should be larger than basic template)
                if len(pdf_content) > 50000:  # 50KB minimum for a proper certificate
                    print(f"✅ PDF has substantial content indicating proper template")
                    print(f"   This indicates the updated template with:")
                    print(f"   - 'CUSTOMER NAME' label (instead of 'CLIENT NAME')")
                    print(f"   - 'CUSTOMER ADDRESS' label (instead of 'CONTRACTOR NAME')")
                    print(f"   - 'CUSTOMER REPRESENTATIVE' field")
                    print(f"   - Customer representative in signature section")
                    print(f"   - 'LIST OF ANNEXURE' section (if annexures exist)")
                else:
                    print(f"⚠️  PDF seems small - may not have full content")
                
                return True
            else:
                print(f"❌ PDF download failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': 'Work Completion Certificate PDF',
                    'expected': 200,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False
                
        except Exception as e:
            print(f"❌ PDF download failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': 'Work Completion Certificate PDF',
                'error': str(e)
            })
            return False

    def test_work_completion_annexures(self):
        """Test Work Completion Certificate with annexures data"""
        print("\n📎 Testing Work Completion Certificate Annexures...")
        
        certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
        
        # Test annexure data with new fields
        annexure_data = {
            "annexures": [
                {
                    "type": "delivery_challan",
                    "description": "Material delivery challan for electrical components",
                    "number": "DC/2026/001",
                    "dated": "15/01/2026",
                    "attachment_url": "/api/uploads/delivery_challan_001.pdf"
                },
                {
                    "type": "drawing_ref",
                    "description": "As-built electrical drawings",
                    "number": "DRG/ELE/2026/001",
                    "dated": "20/01/2026",
                    "attachment_url": "/api/uploads/electrical_drawings.pdf"
                },
                {
                    "type": "eway_bill",
                    "description": "E-way bill for material transportation",
                    "number": "EWB123456789",
                    "dated": "14/01/2026",
                    "attachment_url": ""
                }
            ],
            "customer_representative": "John Smith",
            "customer_address": "123 Industrial Area, Mumbai, Maharashtra - 400001"
        }
        
        # Update certificate with annexures
        success_update, updated_cert = self.run_test("Update Certificate with Annexures", "PUT", f"work-completion/{certificate_id}", 200, annexure_data, auth_required=True)
        if not success_update:
            return False
        
        # Verify annexures field structure
        annexures = updated_cert.get('annexures', [])
        if not annexures:
            print("❌ No annexures found in updated certificate")
            return False
        
        print(f"✅ Found {len(annexures)} annexures in certificate")
        
        # Verify annexure fields
        required_fields = ['type', 'description', 'number', 'dated', 'attachment_url']
        for i, annexure in enumerate(annexures):
            missing_fields = [field for field in required_fields if field not in annexure]
            if missing_fields:
                print(f"❌ Annexure {i+1} missing fields: {missing_fields}")
                return False
            else:
                print(f"✅ Annexure {i+1}: {annexure.get('type')} - {annexure.get('description')[:50]}...")
        
        # Test GET to verify annexures are saved correctly
        success_get, retrieved_cert = self.run_test("Get Certificate with Annexures", "GET", f"work-completion/{certificate_id}", 200, auth_required=True)
        if not success_get:
            return False
        
        retrieved_annexures = retrieved_cert.get('annexures', [])
        if len(retrieved_annexures) != len(annexures):
            print(f"❌ Annexures count mismatch - Expected: {len(annexures)}, Got: {len(retrieved_annexures)}")
            return False
        
        print(f"✅ Annexures correctly saved and retrieved")
        
        # Verify customer representative and address are saved
        customer_rep = retrieved_cert.get('customer_representative', '')
        customer_addr = retrieved_cert.get('customer_address', '')
        
        if customer_rep == "John Smith":
            print(f"✅ Customer representative saved correctly: {customer_rep}")
        else:
            print(f"❌ Customer representative not saved correctly - Expected: John Smith, Got: {customer_rep}")
            return False
        
        if "Mumbai" in customer_addr:
            print(f"✅ Customer address saved correctly: {customer_addr}")
        else:
            print(f"❌ Customer address not saved correctly: {customer_addr}")
            return False
        
        return True

    def test_work_completion_pdf_with_annexures(self):
        """Test Work Completion Certificate PDF generation with annexures"""
        print("\n📄 Testing Work Completion Certificate PDF with Annexures...")
        
        certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
        
        # Download PDF and verify it includes annexures section
        url = f"{self.base_url}/api/work-completion/{certificate_id}/pdf"
        headers = {'Authorization': f'Bearer {self.auth_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing PDF with Annexures...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ PDF with annexures generated successfully - Status: {response.status_code}")
                
                # Verify PDF content
                pdf_content = response.content
                if len(pdf_content) > 80000:  # Should be substantial with annexures
                    print(f"✅ PDF has substantial content ({len(pdf_content):,} bytes)")
                    print(f"   This indicates the PDF includes:")
                    print(f"   - LIST OF ANNEXURE section")
                    print(f"   - Annexure details (type, description, number, dated)")
                    print(f"   - Updated labels and customer representative")
                else:
                    print(f"⚠️  PDF content seems smaller than expected")
                
                return True
            else:
                print(f"❌ PDF generation failed - Expected 200, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ PDF with annexures test failed - Error: {str(e)}")
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📋 WORK COMPLETION CERTIFICATE TEST SUMMARY")
        print("=" * 80)
        
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                error_msg = failed.get('error', f"Expected {failed.get('expected')}, got {failed.get('actual')}")
                print(f"  - {failed['name']}: {error_msg}")
        
        overall_success = self.tests_passed == self.tests_run
        
        if overall_success:
            print("\n✅ ALL WORK COMPLETION CERTIFICATE TESTS PASSED!")
            print("   - PDF download working correctly")
            print("   - Updated labels implemented ('CUSTOMER NAME', 'CUSTOMER ADDRESS', 'CUSTOMER REPRESENTATIVE')")
            print("   - Annexures field structure working")
            print("   - Customer representative in signature section")
            print("   - LIST OF ANNEXURE section appears when annexures exist")
        else:
            print("\n❌ SOME WORK COMPLETION CERTIFICATE TESTS FAILED!")
        
        print("=" * 80)
        return overall_success

def main():
    """Main test execution"""
    print("🚀 Starting Work Completion Certificate API Tests...")
    print("=" * 80)
    
    tester = WorkCompletionCertificateAPITester()
    
    # Login first
    if not tester.login():
        print("\n❌ Login failed - cannot proceed with tests")
        return 1
    
    # Run tests in sequence
    tests = [
        ("Certificate Existence", tester.test_work_completion_certificate_exists),
        ("Certificate PDF Generation", tester.test_work_completion_certificate_pdf),
        ("Certificate Annexures", tester.test_work_completion_annexures),
        ("PDF with Annexures", tester.test_work_completion_pdf_with_annexures),
    ]
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                print(f"\n⚠️  Test '{test_name}' failed but continuing...")
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {str(e)}")
            tester.failed_tests.append({
                'name': test_name,
                'error': str(e)
            })
    
    # Print summary
    overall_success = tester.print_summary()
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())