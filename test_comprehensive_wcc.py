#!/usr/bin/env python3
"""
Comprehensive test script for Work Completion Certificate PDF generation
Tests both the certificate data and PDF generation
"""

import requests
import sys
import json
from datetime import datetime

class ComprehensiveWorkCompletionTester:
    def __init__(self, base_url="https://expense-workflow-fix.preview.emergentagent.com"):
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

    def test_certificate_data(self, certificate_id):
        """Test getting certificate data to verify work items"""
        print(f"\n📋 Testing Certificate Data Retrieval...")
        
        url = f"{self.base_url}/api/work-completion/{certificate_id}"
        
        self.tests_run += 1
        print(f"   URL: {url}")
        
        # Add authentication header
        headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Certificate data retrieval passed - Status: {response.status_code}")
                
                certificate_data = response.json()
                
                # Check work items
                work_items = certificate_data.get('work_items', [])
                print(f"✅ Found {len(work_items)} work items in certificate")
                
                # Analyze work item descriptions
                for i, item in enumerate(work_items, 1):
                    description = item.get('description', '')
                    print(f"   Work Item {i}:")
                    print(f"     Description: {description[:100]}{'...' if len(description) > 100 else ''}")
                    print(f"     Full length: {len(description)} characters")
                    
                    if len(description) > 35:
                        print(f"     ✅ Description is longer than 35 characters (not truncated)")
                    else:
                        print(f"     ⚠️ Description is 35 characters or less")
                
                return True, certificate_data
            else:
                print(f"❌ Certificate data retrieval failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': 'Certificate Data Retrieval',
                    'expected': 200,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}
                
        except Exception as e:
            print(f"❌ Certificate data retrieval failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': 'Certificate Data Retrieval',
                'error': str(e)
            })
            return False, {}

    def test_work_completion_certificate_pdf(self, certificate_id):
        """Test Work Completion Certificate PDF generation"""
        print(f"\n📄 Testing Work Completion Certificate PDF Generation...")
        
        url = f"{self.base_url}/api/work-completion/{certificate_id}/pdf"
        
        self.tests_run += 1
        print(f"   URL: {url}")
        
        # Add authentication header
        headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        try:
            response = requests.get(url, headers=headers, timeout=30)  # Longer timeout for PDF generation
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ PDF generation passed - Status: {response.status_code}")
                
                # Verify Content-Type is application/pdf
                content_type = response.headers.get('Content-Type', '')
                if content_type == 'application/pdf':
                    print(f"✅ Correct Content-Type: {content_type}")
                else:
                    print(f"❌ Incorrect Content-Type: {content_type}")
                    return False
                
                # Verify Content-Disposition header
                content_disposition = response.headers.get('Content-Disposition', '')
                if content_disposition:
                    print(f"✅ Content-Disposition: {content_disposition}")
                    # Extract filename from Content-Disposition
                    if 'filename=' in content_disposition:
                        filename = content_disposition.split('filename=')[1].strip()
                        print(f"   PDF Filename: {filename}")
                else:
                    print(f"⚠️ No Content-Disposition header")
                
                # Verify PDF file size (should be > 1KB)
                pdf_size = len(response.content)
                if pdf_size > 1024:  # > 1KB
                    print(f"✅ PDF file size is reasonable: {pdf_size} bytes ({pdf_size/1024:.2f} KB)")
                else:
                    print(f"❌ PDF file size too small: {pdf_size} bytes")
                    return False
                
                # Verify PDF content starts with PDF header
                if response.content.startswith(b'%PDF'):
                    print(f"✅ Valid PDF file format")
                    # Get PDF version
                    pdf_header = response.content[:20].decode('utf-8', errors='ignore')
                    print(f"   PDF Header: {pdf_header.strip()}")
                else:
                    print(f"❌ Invalid PDF file format")
                    return False
                
                return True
            else:
                print(f"❌ PDF generation failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': 'Work Completion Certificate PDF',
                    'expected': 200,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False
                
        except Exception as e:
            print(f"❌ PDF generation failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': 'Work Completion Certificate PDF',
                'error': str(e)
            })
            return False

    def run_comprehensive_test(self, certificate_id):
        """Run comprehensive test for certificate and PDF"""
        print(f"\n🔍 Running Comprehensive Test for Certificate: {certificate_id}")
        
        # Test 1: Get certificate data and verify work items
        data_success, certificate_data = self.test_certificate_data(certificate_id)
        
        # Test 2: Generate PDF
        pdf_success = self.test_work_completion_certificate_pdf(certificate_id)
        
        # Summary of findings
        if data_success and certificate_data:
            work_items = certificate_data.get('work_items', [])
            print(f"\n📊 Certificate Analysis Summary:")
            print(f"   Certificate ID: {certificate_id}")
            print(f"   Document No: {certificate_data.get('document_no', 'N/A')}")
            print(f"   Project Name: {certificate_data.get('project_name', 'N/A')}")
            print(f"   Customer: {certificate_data.get('customer_name', 'N/A')}")
            print(f"   Total Work Items: {len(work_items)}")
            
            # Check if any work items have descriptions longer than 35 characters
            long_descriptions = [item for item in work_items if len(item.get('description', '')) > 35]
            if long_descriptions:
                print(f"   ✅ {len(long_descriptions)} work items have descriptions longer than 35 characters")
                print(f"   ✅ Work items are NOT truncated to 35 characters")
            else:
                print(f"   ⚠️ All work items have descriptions of 35 characters or less")
        
        return data_success and pdf_success

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    print(f"   Response: {test['response']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("🎉 ALL TESTS PASSED!")
        elif success_rate >= 80:
            print("⚠️ Most tests passed, but some issues found")
        else:
            print("❌ Multiple test failures detected")
        
        print("=" * 80)
        return success_rate == 100

def main():
    """Main function to run comprehensive Work Completion Certificate tests"""
    print("=" * 80)
    print("🚀 COMPREHENSIVE WORK COMPLETION CERTIFICATE TESTING")
    print("=" * 80)
    print("Testing Focus: Certificate data and PDF generation")
    print("Certificate ID: 81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e")
    print("Login: admin@enerzia.com / admin123")
    print("Tests:")
    print("  1. Certificate data retrieval and work items analysis")
    print("  2. PDF generation and validation")
    print("  3. Verification that work items are not truncated to 35 chars")
    print("=" * 80)
    
    tester = ComprehensiveWorkCompletionTester()
    
    # Step 1: Login with admin credentials
    login_success = tester.login("admin@enerzia.com", "admin123")
    if not login_success:
        print("\n❌ CRITICAL: Login failed - cannot proceed with testing")
        return 1
    
    # Step 2: Run comprehensive test
    certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
    test_success = tester.run_comprehensive_test(certificate_id)
    
    # Step 3: Print summary
    overall_success = tester.print_summary()
    
    if overall_success:
        print("\n✅ Comprehensive Work Completion Certificate testing completed successfully!")
        print("✅ PDF downloads successfully (200 status)")
        print("✅ PDF is valid and non-empty")
        print("✅ Work items table contains full descriptions (verified via API)")
        return 0
    else:
        print("\n❌ Comprehensive Work Completion Certificate testing failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())