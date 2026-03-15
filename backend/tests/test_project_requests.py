"""
Test Project Requests API - Material, Vendor, and Payment Requests
Tests the 'Raise Request' feature from Project Management that flows to Purchase/Payment Management

Endpoints tested:
- POST /api/project-requests/materials - Create material request
- POST /api/project-requests/vendors - Create vendor request
- POST /api/project-requests/payments - Create payment request
- GET /api/project-requests/materials - List material requests
- GET /api/project-requests/vendors - List vendor requests
- GET /api/project-requests/payments - List payment requests
- GET /api/project-requests/by-order/{order_id} - Get requests by order
- PUT /api/project-requests/{request_id}/status - Update request status
- GET /api/project-requests/all - Get all requests
- DELETE /api/project-requests/{request_id} - Delete request
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_PROJECT_REQ_"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@enerzia.com",
        "password": "123456"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_order_id():
    """Generate a test order ID for linking requests"""
    return f"{TEST_PREFIX}{uuid.uuid4().hex[:8]}"


class TestMaterialRequests:
    """Material Request CRUD tests"""
    
    created_request_id = None
    created_request_no = None
    
    def test_create_material_request(self, authenticated_client, test_order_id):
        """Test creating a material request with multiple items"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-001",
            "project_name": f"{TEST_PREFIX}Test Project",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "items": [
                {
                    "description": "Test Material Item 1",
                    "quantity": 10,
                    "unit": "Nos",
                    "estimated_cost": 1000
                },
                {
                    "description": "Test Material Item 2",
                    "quantity": 5,
                    "unit": "Kg",
                    "estimated_cost": 500
                }
            ],
            "required_by": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "priority": "high",
            "notes": "Test material request notes"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/materials", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "request" in data
        assert "MR-" in data["request"]["request_no"]
        assert data["request"]["request_type"] == "material"
        assert data["request"]["status"] == "pending"
        assert data["request"]["total_items"] == 2
        assert data["request"]["estimated_cost"] == 12500  # (10*1000) + (5*500)
        
        # Store for later tests
        TestMaterialRequests.created_request_id = data["request"]["id"]
        TestMaterialRequests.created_request_no = data["request"]["request_no"]
        print(f"Created material request: {TestMaterialRequests.created_request_no}")
    
    def test_get_material_requests_list(self, authenticated_client):
        """Test listing all material requests"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/materials")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        assert isinstance(data["requests"], list)
        
        # Verify our created request is in the list
        if TestMaterialRequests.created_request_no:
            request_nos = [r["request_no"] for r in data["requests"]]
            assert TestMaterialRequests.created_request_no in request_nos
    
    def test_get_material_requests_with_status_filter(self, authenticated_client):
        """Test filtering material requests by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/materials?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned requests should be pending
        for req in data["requests"]:
            assert req["status"] == "pending"


class TestVendorRequests:
    """Vendor Request CRUD tests"""
    
    created_request_id = None
    created_request_no = None
    
    def test_create_vendor_request(self, authenticated_client, test_order_id):
        """Test creating a vendor/subcontractor request"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-001",
            "project_name": f"{TEST_PREFIX}Test Project",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "service_type": "Subcontractor",
            "description": "Need subcontractor for electrical installation work",
            "estimated_cost": 50000,
            "required_by": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "priority": "medium",
            "notes": "Test vendor request notes"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/vendors", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "request" in data
        assert "VR-" in data["request"]["request_no"]
        assert data["request"]["request_type"] == "vendor"
        assert data["request"]["status"] == "pending"
        assert data["request"]["service_type"] == "Subcontractor"
        assert data["request"]["estimated_cost"] == 50000
        
        # Store for later tests
        TestVendorRequests.created_request_id = data["request"]["id"]
        TestVendorRequests.created_request_no = data["request"]["request_no"]
        print(f"Created vendor request: {TestVendorRequests.created_request_no}")
    
    def test_get_vendor_requests_list(self, authenticated_client):
        """Test listing all vendor requests"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/vendors")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        assert isinstance(data["requests"], list)
        
        # Verify our created request is in the list
        if TestVendorRequests.created_request_no:
            request_nos = [r["request_no"] for r in data["requests"]]
            assert TestVendorRequests.created_request_no in request_nos


class TestPaymentRequests:
    """Payment Request CRUD tests"""
    
    created_request_id = None
    created_request_no = None
    
    def test_create_payment_request(self, authenticated_client, test_order_id):
        """Test creating a payment request"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-001",
            "project_name": f"{TEST_PREFIX}Test Project",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "payment_type": "Advance",
            "payee": "Test Vendor Pvt Ltd",
            "amount": 100000,
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "bank_details": "HDFC Bank, A/C: 1234567890",
            "priority": "urgent",
            "notes": "Advance payment for material procurement"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/payments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "request" in data
        assert "PR-" in data["request"]["request_no"]
        assert data["request"]["request_type"] == "payment"
        assert data["request"]["status"] == "pending"
        assert data["request"]["payment_type"] == "Advance"
        assert data["request"]["payee"] == "Test Vendor Pvt Ltd"
        assert data["request"]["amount"] == 100000
        
        # Store for later tests
        TestPaymentRequests.created_request_id = data["request"]["id"]
        TestPaymentRequests.created_request_no = data["request"]["request_no"]
        print(f"Created payment request: {TestPaymentRequests.created_request_no}")
    
    def test_get_payment_requests_list(self, authenticated_client):
        """Test listing all payment requests"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/payments")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        assert isinstance(data["requests"], list)
        
        # Verify our created request is in the list
        if TestPaymentRequests.created_request_no:
            request_nos = [r["request_no"] for r in data["requests"]]
            assert TestPaymentRequests.created_request_no in request_nos


class TestRequestsByOrder:
    """Test getting requests grouped by order"""
    
    def test_get_requests_by_order(self, authenticated_client, test_order_id):
        """Test getting all requests for a specific order"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/by-order/{test_order_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "order_id" in data
        assert "requests" in data
        assert "total" in data
        
        # Verify grouped structure
        assert "materials" in data["requests"]
        assert "vendors" in data["requests"]
        assert "payments" in data["requests"]
        
        # Should have at least one of each type from our tests
        assert len(data["requests"]["materials"]) >= 1
        assert len(data["requests"]["vendors"]) >= 1
        assert len(data["requests"]["payments"]) >= 1
        
        print(f"Order {test_order_id} has {data['total']} total requests")


class TestRequestStatusUpdate:
    """Test request status update workflow"""
    
    def test_approve_material_request(self, authenticated_client):
        """Test approving a material request (Purchase Management action)"""
        if not TestMaterialRequests.created_request_id:
            pytest.skip("No material request created")
        
        payload = {
            "status": "approved",
            "comments": "Approved by Purchase Manager"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestMaterialRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        
        # Verify status was updated
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/project-requests/{TestMaterialRequests.created_request_id}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "approved"
    
    def test_approve_vendor_request(self, authenticated_client):
        """Test approving a vendor request (Purchase Management action)"""
        if not TestVendorRequests.created_request_id:
            pytest.skip("No vendor request created")
        
        payload = {
            "status": "approved",
            "comments": "Vendor approved for engagement"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestVendorRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
    
    def test_approve_payment_request(self, authenticated_client):
        """Test approving a payment request (Payment Management action)"""
        if not TestPaymentRequests.created_request_id:
            pytest.skip("No payment request created")
        
        payload = {
            "status": "approved",
            "comments": "Payment approved by Finance"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestPaymentRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
    
    def test_update_to_in_progress(self, authenticated_client):
        """Test updating status to in_progress"""
        if not TestMaterialRequests.created_request_id:
            pytest.skip("No material request created")
        
        payload = {
            "status": "in_progress",
            "comments": "Processing started"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestMaterialRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"
    
    def test_update_to_completed(self, authenticated_client):
        """Test updating status to completed"""
        if not TestMaterialRequests.created_request_id:
            pytest.skip("No material request created")
        
        payload = {
            "status": "completed",
            "comments": "Materials delivered"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestMaterialRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "completed"
    
    def test_reject_request(self, authenticated_client, test_order_id):
        """Test rejecting a request"""
        # Create a new request to reject
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-REJECT",
            "project_name": f"{TEST_PREFIX}Reject Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "items": [{"description": "Test Item", "quantity": 1, "unit": "Nos", "estimated_cost": 100}],
            "priority": "low"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/project-requests/materials", json=payload)
        assert create_response.status_code == 200
        request_id = create_response.json()["request"]["id"]
        
        # Reject it
        reject_payload = {
            "status": "rejected",
            "comments": "Budget not available"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{request_id}/status",
            json=reject_payload
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"
    
    def test_invalid_status_update(self, authenticated_client):
        """Test that invalid status returns error"""
        if not TestVendorRequests.created_request_id:
            pytest.skip("No vendor request created")
        
        payload = {
            "status": "invalid_status",
            "comments": "This should fail"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{TestVendorRequests.created_request_id}/status",
            json=payload
        )
        
        assert response.status_code == 400
    
    def test_update_nonexistent_request(self, authenticated_client):
        """Test updating a non-existent request returns 404"""
        payload = {
            "status": "approved"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/nonexistent-id-12345/status",
            json=payload
        )
        
        assert response.status_code == 404


class TestGetAllRequests:
    """Test getting all requests with filters"""
    
    def test_get_all_requests(self, authenticated_client):
        """Test getting all project requests"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/all")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "total" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pending" in stats
        assert "approved" in stats
        assert "materials" in stats
        assert "vendors" in stats
        assert "payments" in stats
    
    def test_get_all_requests_with_type_filter(self, authenticated_client):
        """Test filtering all requests by type"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/all?request_type=material")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned requests should be material type
        for req in data["requests"]:
            assert req["request_type"] == "material"


class TestExistingTestData:
    """Verify existing test data mentioned in agent context"""
    
    def test_existing_material_request(self, authenticated_client):
        """Check if existing MR-2526-001 exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/materials")
        
        assert response.status_code == 200
        data = response.json()
        
        # Look for MR-2526-001 pattern
        mr_requests = [r for r in data["requests"] if r["request_no"].startswith("MR-")]
        print(f"Found {len(mr_requests)} material requests")
        
        if mr_requests:
            print(f"Sample MR: {mr_requests[0]['request_no']}")
    
    def test_existing_vendor_request(self, authenticated_client):
        """Check if existing VR-2526-001 exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/vendors")
        
        assert response.status_code == 200
        data = response.json()
        
        # Look for VR-2526-001 pattern
        vr_requests = [r for r in data["requests"] if r["request_no"].startswith("VR-")]
        print(f"Found {len(vr_requests)} vendor requests")
        
        if vr_requests:
            print(f"Sample VR: {vr_requests[0]['request_no']}")
    
    def test_existing_payment_request(self, authenticated_client):
        """Check if existing PR-2526-001 exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/project-requests/payments")
        
        assert response.status_code == 200
        data = response.json()
        
        # Look for PR-2526-001 pattern
        pr_requests = [r for r in data["requests"] if r["request_no"].startswith("PR-")]
        print(f"Found {len(pr_requests)} payment requests")
        
        if pr_requests:
            print(f"Sample PR: {pr_requests[0]['request_no']}")


class TestDeleteRequest:
    """Test request deletion"""
    
    def test_delete_pending_request(self, authenticated_client, test_order_id):
        """Test deleting a pending request"""
        # Create a request to delete
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-DELETE",
            "project_name": f"{TEST_PREFIX}Delete Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "items": [{"description": "Delete Test Item", "quantity": 1, "unit": "Nos", "estimated_cost": 100}],
            "priority": "low"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/project-requests/materials", json=payload)
        assert create_response.status_code == 200
        request_id = create_response.json()["request"]["id"]
        
        # Delete it
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/project-requests/{request_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = authenticated_client.get(f"{BASE_URL}/api/project-requests/{request_id}")
        assert get_response.status_code == 404
    
    def test_cannot_delete_approved_request(self, authenticated_client, test_order_id):
        """Test that approved requests cannot be deleted"""
        # Create and approve a request
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-NODELETE",
            "project_name": f"{TEST_PREFIX}No Delete Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "items": [{"description": "No Delete Item", "quantity": 1, "unit": "Nos", "estimated_cost": 100}],
            "priority": "low"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/project-requests/materials", json=payload)
        assert create_response.status_code == 200
        request_id = create_response.json()["request"]["id"]
        
        # Approve it
        approve_response = authenticated_client.put(
            f"{BASE_URL}/api/project-requests/{request_id}/status",
            json={"status": "approved"}
        )
        assert approve_response.status_code == 200
        
        # Try to delete - should fail
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/project-requests/{request_id}")
        assert delete_response.status_code == 400


class TestRequestNumberGeneration:
    """Test request number generation format"""
    
    def test_material_request_number_format(self, authenticated_client, test_order_id):
        """Test MR-FYFY-NNN format"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-MR-FORMAT",
            "project_name": f"{TEST_PREFIX}MR Format Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "items": [{"description": "Format Test", "quantity": 1, "unit": "Nos", "estimated_cost": 100}],
            "priority": "low"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/materials", json=payload)
        assert response.status_code == 200
        
        request_no = response.json()["request"]["request_no"]
        
        # Verify format: MR-FYFY-NNN (e.g., MR-2526-001)
        assert request_no.startswith("MR-")
        parts = request_no.split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 4  # FYFY format (e.g., 2526)
        assert parts[2].isdigit()  # Sequential number
        
        print(f"Generated MR number: {request_no}")
    
    def test_vendor_request_number_format(self, authenticated_client, test_order_id):
        """Test VR-FYFY-NNN format"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-VR-FORMAT",
            "project_name": f"{TEST_PREFIX}VR Format Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "service_type": "Rental",
            "description": "Format test vendor request",
            "estimated_cost": 1000,
            "priority": "low"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/vendors", json=payload)
        assert response.status_code == 200
        
        request_no = response.json()["request"]["request_no"]
        
        # Verify format: VR-FYFY-NNN
        assert request_no.startswith("VR-")
        parts = request_no.split("-")
        assert len(parts) == 3
        
        print(f"Generated VR number: {request_no}")
    
    def test_payment_request_number_format(self, authenticated_client, test_order_id):
        """Test PR-FYFY-NNN format"""
        payload = {
            "order_id": test_order_id,
            "order_no": "PID/25-26/TEST-PR-FORMAT",
            "project_name": f"{TEST_PREFIX}PR Format Test",
            "customer_name": f"{TEST_PREFIX}Test Customer",
            "payment_type": "Milestone",
            "payee": "Format Test Vendor",
            "amount": 5000,
            "priority": "low"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/project-requests/payments", json=payload)
        assert response.status_code == 200
        
        request_no = response.json()["request"]["request_no"]
        
        # Verify format: PR-FYFY-NNN
        assert request_no.startswith("PR-")
        parts = request_no.split("-")
        assert len(parts) == 3
        
        print(f"Generated PR number: {request_no}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
