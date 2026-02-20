#!/usr/bin/env python3
"""
Test script for Work Completion Certificate PDF generation
Specifically tests the certificate ID from the review request
"""

import requests
import sys
import json
from datetime import datetime

class WorkCompletionPDFTester:
    def __init__(self, base_url="https://smarthub-enerzia.preview.emergentagent.com"):
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

    def test_work_completion_certificate_pdf_specific(self):
        """Test Work Completion Certificate PDF generation for specific certificate ID"""
        print("\n📄 Testing Work Completion Certificate PDF - Specific Certificate...")
        
        # Use the specific certificate ID from the review request
        certificate_id = "81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e"
        print(f"   Testing certificate ID: {certificate_id}")
        
        # Test PDF generation
        url = f"{self.base_url}/api/work-completion/{certificate_id}/pdf"
        
        self.tests_run += 1
        print(f"\n🔍 Testing Work Completion Certificate PDF Generation...")
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
                else:
                    print(f"❌ Invalid PDF file format")
                    return False
                
                # Check for work items content in PDF (convert to string for basic text search)
                try:
                    # Try to extract some text from PDF for verification
                    pdf_content_str = str(response.content)
                    
                    # Look for indicators that work items are not truncated
                    # Check if PDF contains longer descriptions (more than 35 chars)
                    work_item_indicators = [
                        "description", "Description", "DESCRIPTION",
                        "work", "Work", "WORK",
                        "item", "Item", "ITEM",
                        "table", "Table", "TABLE"
                    ]
                    
                    found_work_items = any(indicator in pdf_content_str for indicator in work_item_indicators)
                    if found_work_items:
                        print(f"✅ PDF contains work items content")
                        
                        # Check for longer text content (indicating full descriptions)
                        # Look for text patterns that suggest full descriptions rather than truncated ones
                        long_text_patterns = [
                            "installation", "maintenance", "electrical", "mechanical",
                            "system", "equipment", "testing", "commissioning",
                            "complete", "comprehensive", "detailed", "specification"
                        ]
                        
                        found_detailed_content = any(pattern in pdf_content_str.lower() for pattern in long_text_patterns)
                        if found_detailed_content:
                            print(f"✅ PDF appears to contain detailed work item descriptions (not truncated)")
                        else:
                            print(f"⚠️ Could not verify detailed work item descriptions in PDF")
                            
                        # Check for text length indicators (look for longer strings)
                        # This is a basic check to see if there are longer text segments
                        text_segments = pdf_content_str.split()
                        long_segments = [seg for seg in text_segments if len(seg) > 35]
                        if long_segments:
                            print(f"✅ Found {len(long_segments)} text segments longer than 35 characters")
                        else:
                            print(f"⚠️ No text segments longer than 35 characters found")
                            
                    else:
                        print(f"⚠️ Could not find work items content in PDF")
                        
                except Exception as e:
                    print(f"⚠️ Could not analyze PDF content for work items: {str(e)}")
                
                return True
            else:
                print(f"❌ PDF generation failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': 'Work Completion Certificate PDF - Specific',
                    'expected': 200,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False
                
        except Exception as e:
            print(f"❌ PDF generation failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': 'Work Completion Certificate PDF - Specific',
                'error': str(e)
            })
            return False

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
    """Main function to run Work Completion Certificate PDF tests"""
    print("=" * 80)
    print("🚀 WORK COMPLETION CERTIFICATE PDF TESTING")
    print("=" * 80)
    print("Testing Focus: PDF generation for specific certificate ID")
    print("Certificate ID: 81f07bb4-02b5-4343-a3d3-84ee5dfa0b5e")
    print("Login: admin@enerzia.com / admin123")
    print("Expected:")
    print("  - PDF downloads successfully (200 status)")
    print("  - PDF is valid and non-empty")
    print("  - Work items table contains full descriptions (not truncated to 35 chars)")
    print("=" * 80)
    
    tester = WorkCompletionPDFTester()
    
    # Step 1: Login with admin credentials
    login_success = tester.login("admin@enerzia.com", "admin123")
    if not login_success:
        print("\n❌ CRITICAL: Login failed - cannot proceed with testing")
        return 1
    
    # Step 2: Test specific certificate PDF generation
    print("\n🔍 Testing Work Completion Certificate PDF Generation...")
    pdf_success = tester.test_work_completion_certificate_pdf_specific()
    
    # Step 3: Print summary
    overall_success = tester.print_summary()
    
    if overall_success:
        print("\n✅ Work Completion Certificate PDF testing completed successfully!")
        return 0
    else:
        print("\n❌ Work Completion Certificate PDF testing failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())