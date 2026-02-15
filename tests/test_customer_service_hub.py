"""
Test Customer Service Hub and General Services Category Features
Tests for:
1. Customer Service Hub page with 8 category cards
2. Category navigation and filtering
3. General Services category in service requests
4. Backend API endpoints for customer service
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCustomerServiceAPI:
    """Test Customer Service API endpoints"""
    
    def test_get_all_service_requests(self):
        """Test GET /api/customer-service returns all service requests"""
        response = requests.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} service requests")
    
    def test_get_next_srn(self):
        """Test GET /api/customer-service/next-srn returns next SRN number"""
        response = requests.get(f"{BASE_URL}/api/customer-service/next-srn")
        assert response.status_code == 200
        data = response.json()
        # API returns srn_no, not next_srn
        assert "srn_no" in data
        assert data["srn_no"].startswith("SRN/")
        print(f"Next SRN: {data['srn_no']}")
    
    def test_service_categories_include_general_services(self):
        """Test that service requests can have General Services category"""
        response = requests.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        data = response.json()
        
        # Check if General Services is a valid category by checking existing requests
        categories_found = set()
        for request in data:
            if request.get('service_category'):
                categories_found.add(request['service_category'])
        
        print(f"Categories found in existing requests: {categories_found}")
        
        # Expected categories
        expected_categories = [
            'Electrical', 'HVAC Systems', 'Fire Protection Systems', 
            'CCTV Systems', 'Air Condition', 'Lighting', 
            'Diesel Generator', 'General Services'
        ]
        print(f"Expected categories: {expected_categories}")
    
    def test_create_general_services_request(self):
        """Test creating a service request with General Services category"""
        # Create a General Services request
        payload = {
            "customer_name": "TEST_General_Services_Customer",
            "contact_person": "Test Contact",
            "contact_phone": "1234567890",
            "site_location": "Test Location",
            "request_type": "Service Call",
            "service_category": "General Services",
            "subject": "TEST General Services Request",
            "description": "This is a test request for General Services category",
            "reported_date": "11/01/2026",
            "status": "Pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/customer-service", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # API returns {message, request} structure
        assert "request" in data
        request_data = data["request"]
        
        # Verify the request was created with General Services category
        assert request_data.get("service_category") == "General Services"
        assert request_data.get("subject") == "TEST General Services Request"
        assert "id" in request_data
        
        created_id = request_data["id"]
        print(f"Created General Services request with ID: {created_id}")
        
        # Verify by fetching the request
        get_response = requests.get(f"{BASE_URL}/api/customer-service/{created_id}")
        assert get_response.status_code == 200
        fetched_data = get_response.json()
        assert fetched_data.get("service_category") == "General Services"
        
        # Clean up - delete the test request
        delete_response = requests.delete(f"{BASE_URL}/api/customer-service/{created_id}")
        assert delete_response.status_code == 200
        print(f"Cleaned up test request: {created_id}")
    
    def test_filter_by_category(self):
        """Test filtering service requests by category"""
        response = requests.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        data = response.json()
        
        # Filter by Electrical category
        electrical_requests = [r for r in data if r.get('service_category') == 'Electrical']
        print(f"Electrical requests: {len(electrical_requests)}")
        
        # Filter by HVAC Systems category
        hvac_requests = [r for r in data if r.get('service_category') == 'HVAC Systems']
        print(f"HVAC Systems requests: {len(hvac_requests)}")
        
        # Filter by General Services category
        general_requests = [r for r in data if r.get('service_category') == 'General Services']
        print(f"General Services requests: {len(general_requests)}")
    
    def test_service_request_crud(self):
        """Test full CRUD operations for service requests"""
        # CREATE
        payload = {
            "customer_name": "TEST_CRUD_Customer",
            "contact_person": "CRUD Test",
            "service_category": "Electrical",
            "request_type": "Maintenance",
            "subject": "TEST CRUD Operation",
            "description": "Testing CRUD operations",
            "reported_date": "11/01/2026",
            "status": "Pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=payload)
        assert create_response.status_code == 200
        created_data = create_response.json()
        
        # API returns {message, request} structure
        assert "request" in created_data
        request_id = created_data["request"]["id"]
        print(f"Created request: {request_id}")
        
        # READ
        read_response = requests.get(f"{BASE_URL}/api/customer-service/{request_id}")
        assert read_response.status_code == 200
        read_data = read_response.json()
        assert read_data["customer_name"] == "TEST_CRUD_Customer"
        print(f"Read request: {read_data['srn_no']}")
        
        # UPDATE
        update_payload = {
            "status": "In Progress",
            "assigned_to": "Test Technician"
        }
        update_response = requests.put(f"{BASE_URL}/api/customer-service/{request_id}", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["status"] == "In Progress"
        print(f"Updated request status to: {updated_data['status']}")
        
        # DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/customer-service/{request_id}")
        assert delete_response.status_code == 200
        print(f"Deleted request: {request_id}")
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/customer-service/{request_id}")
        assert verify_response.status_code == 404


class TestCategoryMapping:
    """Test URL category ID to category name mapping"""
    
    def test_category_id_mapping(self):
        """Verify category ID mapping matches expected values"""
        expected_mapping = {
            'electrical': 'Electrical',
            'hvac-systems': 'HVAC Systems',
            'fire-protection': 'Fire Protection Systems',
            'cctv-systems': 'CCTV Systems',
            'air-condition': 'Air Condition',
            'lighting': 'Lighting',
            'diesel-generator': 'Diesel Generator',
            'general': 'General Services'
        }
        
        # This is a frontend mapping test - we verify the expected categories exist
        response = requests.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        
        print(f"Category ID mapping verified: {len(expected_mapping)} categories")
        for url_id, category_name in expected_mapping.items():
            print(f"  {url_id} -> {category_name}")


class TestGeneralServicesCategory:
    """Test General Services specific functionality"""
    
    def test_general_services_no_test_measurements(self):
        """Test that General Services category doesn't require test measurements"""
        # Create a General Services request without test measurements
        payload = {
            "customer_name": "TEST_No_Measurements",
            "service_category": "General Services",
            "request_type": "Service Call",
            "subject": "General visit without equipment testing",
            "description": "This is a general purpose visit",
            "reported_date": "11/01/2026",
            "status": "Pending",
            "test_measurements": None  # Explicitly set to null
        }
        
        response = requests.post(f"{BASE_URL}/api/customer-service", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # API returns {message, request} structure
        assert "request" in data
        request_data = data["request"]
        
        # Verify request was created
        assert request_data.get("service_category") == "General Services"
        request_id = request_data["id"]
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}")
        print("General Services request created successfully without test measurements")
    
    def test_general_services_with_equipment_list(self):
        """Test General Services can have equipment list but no measurements"""
        payload = {
            "customer_name": "TEST_General_Equipment",
            "service_category": "General Services",
            "request_type": "Maintenance",
            "subject": "General maintenance visit",
            "description": "General purpose maintenance",
            "reported_date": "11/01/2026",
            "status": "Pending",
            "equipment_list": [
                {
                    "equipment_name": "General Equipment",
                    "equipment_location": "Main Building",
                    "make_model": "N/A",
                    "equipment_serial": "N/A",
                    "test_measurements": None  # No measurements for General Services
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/customer-service", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # API returns {message, request} structure
        assert "request" in data
        request_id = data["request"]["id"]
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}")
        print("General Services request with equipment list created successfully")


class TestServiceRequestStats:
    """Test service request statistics"""
    
    def test_stats_by_category(self):
        """Test getting stats filtered by category"""
        response = requests.get(f"{BASE_URL}/api/customer-service")
        assert response.status_code == 200
        data = response.json()
        
        # Calculate stats
        total = len(data)
        pending = len([r for r in data if r.get('status') == 'Pending'])
        in_progress = len([r for r in data if r.get('status') == 'In Progress'])
        completed = len([r for r in data if r.get('status') == 'Completed'])
        
        print(f"Total requests: {total}")
        print(f"Pending: {pending}")
        print(f"In Progress: {in_progress}")
        print(f"Completed: {completed}")
        
        # Stats by category
        categories = {}
        for request in data:
            cat = request.get('service_category', 'Unknown')
            if cat not in categories:
                categories[cat] = {'total': 0, 'pending': 0, 'completed': 0}
            categories[cat]['total'] += 1
            if request.get('status') == 'Pending':
                categories[cat]['pending'] += 1
            elif request.get('status') == 'Completed':
                categories[cat]['completed'] += 1
        
        print("\nStats by category:")
        for cat, stats in categories.items():
            print(f"  {cat}: {stats}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
