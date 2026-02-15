#!/usr/bin/env python3
"""
Comprehensive API Health Check for Enerzia Enterprise Management System
Performs health check on critical API endpoints as requested in the review.
"""

import requests
import sys
import json
import os
from datetime import datetime

class EnerziaAPIHealthChecker:
    def __init__(self, base_url="https://order-flow-system-5.preview.emergentagent.com"):
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

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
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
                response = requests.get(url, headers=headers, timeout=10)
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
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:100]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_api_health_check(self):
        """Comprehensive API health check for Enerzia Enterprise Management System"""
        print("\n🏥 Running Comprehensive API Health Check...")
        
        # Critical API endpoints to test
        health_check_endpoints = [
            ("Authentication", "POST", "auth/login", 200, {
                "email": "admin@enerzia.com",
                "password": "admin123"
            }, False),
            ("Dashboard Stats", "GET", "dashboard/stats", 200, None, True),
            ("Projects List", "GET", "projects", 200, None, True),
            ("Work Completion", "GET", "work-completion", 200, None, True),
            ("Customer Service", "GET", "customer-service", 200, None, True),
            ("Weekly Meeting", "GET", "weekly-meetings", 200, None, True),
            ("Billing", "GET", "billing/weekly", 200, None, True),
            ("Reports Custom", "GET", "reports/custom", 200, None, True)
        ]
        
        all_passed = True
        results = {}
        
        print(f"\n📋 Testing {len(health_check_endpoints)} critical API endpoints...")
        
        for name, method, endpoint, expected_status, data, auth_required in health_check_endpoints:
            success, response = self.run_test(f"Health Check - {name}", method, endpoint, expected_status, data, auth_required)
            results[name] = {
                'success': success,
                'response': response
            }
            all_passed &= success
        
        # Detailed validation for specific endpoints
        print(f"\n🔍 Performing detailed validation...")
        
        # Validate Dashboard Stats structure
        if results.get('Dashboard Stats', {}).get('success'):
            dashboard_data = results['Dashboard Stats']['response']
            required_fields = ['total_projects', 'total_billing', 'active_projects', 'this_week_billing']
            missing_fields = [field for field in required_fields if field not in dashboard_data]
            if missing_fields:
                print(f"⚠️  Dashboard Stats missing fields: {missing_fields}")
                all_passed = False
            else:
                print(f"✅ Dashboard Stats structure valid")
                print(f"   Total Projects: {dashboard_data.get('total_projects', 0)}")
                print(f"   Active Projects: {dashboard_data.get('active_projects', 0)}")
                print(f"   This Week Billing: ₹{dashboard_data.get('this_week_billing', 0):,.0f}")
        
        # Validate Projects List structure
        if results.get('Projects List', {}).get('success'):
            projects_data = results['Projects List']['response']
            if isinstance(projects_data, list) and len(projects_data) > 0:
                project = projects_data[0]
                required_fields = ['id', 'pid_no', 'project_name', 'status', 'client']
                missing_fields = [field for field in required_fields if field not in project]
                if missing_fields:
                    print(f"⚠️  Projects List missing fields: {missing_fields}")
                    all_passed = False
                else:
                    print(f"✅ Projects List structure valid ({len(projects_data)} projects)")
            else:
                print(f"⚠️  Projects List returned empty or invalid data")
        
        # Validate Work Completion structure
        if results.get('Work Completion', {}).get('success'):
            wc_data = results['Work Completion']['response']
            if isinstance(wc_data, list):
                print(f"✅ Work Completion endpoint accessible ({len(wc_data)} certificates)")
            else:
                print(f"⚠️  Work Completion returned unexpected data structure")
        
        # Validate Customer Service structure
        if results.get('Customer Service', {}).get('success'):
            cs_data = results['Customer Service']['response']
            if isinstance(cs_data, list):
                print(f"✅ Customer Service endpoint accessible ({len(cs_data)} service requests)")
            else:
                print(f"⚠️  Customer Service returned unexpected data structure")
        
        # Validate Weekly Meeting structure
        if results.get('Weekly Meeting', {}).get('success'):
            wm_data = results['Weekly Meeting']['response']
            if isinstance(wm_data, list):
                print(f"✅ Weekly Meeting endpoint accessible ({len(wm_data)} meetings)")
            else:
                print(f"⚠️  Weekly Meeting returned unexpected data structure")
        
        # Validate Billing structure
        if results.get('Billing', {}).get('success'):
            billing_data = results['Billing']['response']
            if isinstance(billing_data, list):
                print(f"✅ Billing endpoint accessible ({len(billing_data)} weeks of data)")
            else:
                print(f"⚠️  Billing returned unexpected data structure")
        
        return all_passed

    def run_health_check(self):
        """Run the comprehensive API health check"""
        print("🚀 Starting Enerzia Enterprise Management System API Health Check...")
        print(f"   Base URL: {self.base_url}")
        print(f"   Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Login first
        if not self.login():
            print("\n❌ Login failed - cannot proceed with tests")
            return False
        
        # Run comprehensive health check
        print(f"\n{'='*60}")
        print(f"🏥 COMPREHENSIVE API HEALTH CHECK")
        print(f"{'='*60}")
        health_check_passed = self.test_api_health_check()
        
        if health_check_passed:
            print(f"\n✅ API HEALTH CHECK PASSED - All critical endpoints are stable")
        else:
            print(f"\n❌ API HEALTH CHECK FAILED - Some critical endpoints have issues")
        
        # Print summary
        self.print_summary()
        
        return health_check_passed

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if 'response' in test:
                    print(f"   Response: {test['response']}")
        else:
            print(f"\n✅ ALL TESTS PASSED!")


def main():
    """Main function to run the health check"""
    checker = EnerziaAPIHealthChecker()
    success = checker.run_health_check()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())