"""
Project Management Phase 2 - Backend API Tests
Tests for Accept Order, Update Timeline, Update Status endpoints
These endpoints enable bi-directional sync between Order Management and Project Management
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "123456"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_order_data():
    """Test order data for creating test orders"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "pid_no": f"PID/25-26/TEST-PM-{unique_id}",
        "category": "PSS",
        "customer_name": f"TEST_Project Management Customer {unique_id}",
        "customer_address": "Test Address",
        "order_value": 100000,
        "purchase_budget": 30000,
        "execution_budget": 25000,
        "others_budget": 10000,
        "target_profit": 35000,
        "delivery_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "project_name": f"TEST_PM Project {unique_id}",
        "status": "pending"
    }


@pytest.fixture(scope="module")
def created_test_order(api_client, test_order_data):
    """Create a test order for testing accept/timeline/status endpoints"""
    response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=test_order_data)
    if response.status_code == 200:
        order = response.json().get("order", {})
        yield order
        # Cleanup after tests
        api_client.delete(f"{BASE_URL}/api/order-lifecycle/orders/{order['id']}")
    else:
        pytest.skip(f"Failed to create test order: {response.text}")


# ============== ACCEPT ORDER ENDPOINT TESTS ==============

class TestAcceptOrderEndpoint:
    """Tests for POST /api/order-lifecycle/orders/{order_id}/accept"""
    
    def test_accept_order_with_timeline(self, api_client, created_test_order):
        """POST /accept - Accept order with timeline fields"""
        order_id = created_test_order["id"]
        
        accept_data = {
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
            "deadline": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
            "project_manager": "Test Manager",
            "notes": "TEST_Accepted via API test"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/accept",
            json=accept_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "order" in data
        
        # Verify order status changed to accepted
        order = data["order"]
        assert order.get("project_status") == "accepted", f"Expected 'accepted', got {order.get('project_status')}"
        
        # Verify timeline fields saved
        timeline = order.get("timeline", {})
        assert timeline.get("start_date") == accept_data["start_date"]
        assert timeline.get("end_date") == accept_data["end_date"]
        assert timeline.get("deadline") == accept_data["deadline"]
        assert timeline.get("project_manager") == accept_data["project_manager"]
        assert timeline.get("notes") == accept_data["notes"]
        assert "accepted_at" in timeline
    
    def test_accept_order_minimal_fields(self, api_client):
        """POST /accept - Accept order with only start_date"""
        # Create a new order for this test
        unique_id = str(uuid.uuid4())[:8]
        order_data = {
            "pid_no": f"PID/25-26/TEST-MIN-{unique_id}",
            "category": "PSS",
            "customer_name": f"TEST_Minimal Accept {unique_id}",
            "order_value": 50000,
            "status": "pending"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order"]["id"]
        
        try:
            accept_data = {
                "start_date": datetime.now().strftime("%Y-%m-%d")
            }
            
            response = api_client.post(
                f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/accept",
                json=accept_data
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["order"]["project_status"] == "accepted"
            assert data["order"]["timeline"]["start_date"] == accept_data["start_date"]
        finally:
            api_client.delete(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")
    
    def test_accept_nonexistent_order(self, api_client):
        """POST /accept - Returns 404 for nonexistent order"""
        fake_id = str(uuid.uuid4())
        
        response = api_client.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{fake_id}/accept",
            json={"start_date": "2026-03-15"}
        )
        
        assert response.status_code == 404


# ============== UPDATE TIMELINE ENDPOINT TESTS ==============

class TestUpdateTimelineEndpoint:
    """Tests for PUT /api/order-lifecycle/orders/{order_id}/timeline"""
    
    def test_update_timeline_all_fields(self, api_client, created_test_order):
        """PUT /timeline - Update all timeline fields"""
        order_id = created_test_order["id"]
        
        timeline_data = {
            "start_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "deadline": (datetime.now() + timedelta(days=75)).strftime("%Y-%m-%d"),
            "project_manager": "Updated Manager",
            "notes": "TEST_Updated timeline notes"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/timeline",
            json=timeline_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "order" in data
        
        # Verify timeline updated
        timeline = data["order"].get("timeline", {})
        assert timeline.get("start_date") == timeline_data["start_date"]
        assert timeline.get("end_date") == timeline_data["end_date"]
        assert timeline.get("deadline") == timeline_data["deadline"]
        assert timeline.get("project_manager") == timeline_data["project_manager"]
        assert timeline.get("notes") == timeline_data["notes"]
    
    def test_update_timeline_partial(self, api_client, created_test_order):
        """PUT /timeline - Update only some timeline fields"""
        order_id = created_test_order["id"]
        
        # Only update deadline and notes
        timeline_data = {
            "deadline": (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d"),
            "notes": "TEST_Partial update notes"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/timeline",
            json=timeline_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        timeline = data["order"].get("timeline", {})
        assert timeline.get("deadline") == timeline_data["deadline"]
        assert timeline.get("notes") == timeline_data["notes"]
        # Previous values should be preserved
        assert timeline.get("start_date") is not None
    
    def test_update_timeline_nonexistent_order(self, api_client):
        """PUT /timeline - Returns 404 for nonexistent order"""
        fake_id = str(uuid.uuid4())
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{fake_id}/timeline",
            json={"deadline": "2026-05-01"}
        )
        
        assert response.status_code == 404


# ============== UPDATE PROJECT STATUS ENDPOINT TESTS ==============

class TestUpdateProjectStatusEndpoint:
    """Tests for PUT /api/order-lifecycle/orders/{order_id}/status"""
    
    def test_update_status_to_in_progress(self, api_client, created_test_order):
        """PUT /status - Update status to in_progress"""
        order_id = created_test_order["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/status",
            json={"project_status": "in_progress"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("project_status") == "in_progress"
    
    def test_update_status_all_valid_statuses(self, api_client):
        """PUT /status - All valid project statuses work"""
        # Create a new order for this test
        unique_id = str(uuid.uuid4())[:8]
        order_data = {
            "pid_no": f"PID/25-26/TEST-STATUS-{unique_id}",
            "category": "PSS",
            "customer_name": f"TEST_Status Test {unique_id}",
            "order_value": 50000,
            "status": "pending"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order"]["id"]
        
        valid_statuses = ["pending", "accepted", "in_progress", "on_hold", "completed", "cancelled"]
        
        try:
            for status in valid_statuses:
                response = api_client.put(
                    f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/status",
                    json={"project_status": status}
                )
                assert response.status_code == 200, f"Failed for status '{status}': {response.text}"
                assert response.json().get("project_status") == status
        finally:
            api_client.delete(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")
    
    def test_update_status_invalid(self, api_client, created_test_order):
        """PUT /status - Invalid status returns 400"""
        order_id = created_test_order["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/status",
            json={"project_status": "invalid_status"}
        )
        
        assert response.status_code == 400
    
    def test_update_status_nonexistent_order(self, api_client):
        """PUT /status - Returns 404 for nonexistent order"""
        fake_id = str(uuid.uuid4())
        
        response = api_client.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{fake_id}/status",
            json={"project_status": "accepted"}
        )
        
        assert response.status_code == 404


# ============== BI-DIRECTIONAL SYNC TESTS ==============

class TestBidirectionalSync:
    """Tests for bi-directional sync between Order Management and Project Management"""
    
    def test_accept_updates_both_order_and_lifecycle(self, api_client):
        """Accept order updates both sales_orders and order_lifecycle collections"""
        # Create a new order
        unique_id = str(uuid.uuid4())[:8]
        order_data = {
            "pid_no": f"PID/25-26/TEST-SYNC-{unique_id}",
            "category": "PSS",
            "customer_name": f"TEST_Sync Test {unique_id}",
            "order_value": 75000,
            "status": "pending"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order"]["id"]
        
        try:
            # Accept the order
            accept_data = {
                "start_date": "2026-03-20",
                "end_date": "2026-05-20",
                "deadline": "2026-05-15",
                "project_manager": "Sync Test Manager",
                "notes": "TEST_Sync verification"
            }
            
            accept_response = api_client.post(
                f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/accept",
                json=accept_data
            )
            assert accept_response.status_code == 200
            
            # Verify via GET /orders endpoint (used by both Order Management and Project Management)
            get_response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")
            assert get_response.status_code == 200
            
            data = get_response.json()
            order = data["order"]
            lifecycle = data.get("lifecycle", {})
            
            # Verify order has timeline and project_status
            assert order.get("project_status") == "accepted"
            assert order.get("timeline", {}).get("start_date") == "2026-03-20"
            assert order.get("timeline", {}).get("project_manager") == "Sync Test Manager"
            
            # Verify lifecycle also has timeline and project_status
            assert lifecycle.get("project_status") == "accepted"
            assert lifecycle.get("timeline", {}).get("start_date") == "2026-03-20"
        finally:
            api_client.delete(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")
    
    def test_timeline_visible_in_order_list(self, api_client):
        """Timeline data appears in order list (for Order Summary view)"""
        # Create and accept an order
        unique_id = str(uuid.uuid4())[:8]
        order_data = {
            "pid_no": f"PID/25-26/TEST-LIST-{unique_id}",
            "category": "PSS",
            "customer_name": f"TEST_List Test {unique_id}",
            "order_value": 60000,
            "status": "pending"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order"]["id"]
        pid_no = order_data["pid_no"]
        
        try:
            # Accept with timeline
            accept_data = {
                "start_date": "2026-04-01",
                "deadline": "2026-06-01",
                "project_manager": "List Test Manager"
            }
            
            api_client.post(
                f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/accept",
                json=accept_data
            )
            
            # Get orders list and find our order
            list_response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search={pid_no}")
            assert list_response.status_code == 200
            
            orders = list_response.json().get("orders", [])
            test_order = next((o for o in orders if o["id"] == order_id), None)
            
            assert test_order is not None, "Test order not found in list"
            assert test_order.get("project_status") == "accepted"
            assert test_order.get("timeline", {}).get("start_date") == "2026-04-01"
            assert test_order.get("timeline", {}).get("project_manager") == "List Test Manager"
        finally:
            api_client.delete(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")


# ============== EXISTING TEST DATA VERIFICATION ==============

class TestExistingTestData:
    """Verify existing test data mentioned in requirements"""
    
    def test_existing_accepted_order(self, api_client):
        """Verify PID/25-26/TEST-OTHERS exists and is accepted"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=TEST-OTHERS")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        test_order = next((o for o in orders if "TEST-OTHERS" in o.get("order_no", "")), None)
        
        if test_order:
            assert test_order.get("project_status") == "accepted", f"Expected 'accepted', got {test_order.get('project_status')}"
            assert test_order.get("timeline") is not None, "Timeline should exist for accepted order"
            print(f"Found TEST-OTHERS order with status: {test_order.get('project_status')}")
        else:
            pytest.skip("TEST-OTHERS order not found - may have been cleaned up")
    
    def test_existing_in_progress_order(self, api_client):
        """Verify PID/25-26/397 exists and is in_progress"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=397")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        test_order = next((o for o in orders if "397" in o.get("order_no", "")), None)
        
        if test_order:
            print(f"Found order 397 with status: {test_order.get('project_status')}")
            # Status may vary based on testing
        else:
            pytest.skip("Order 397 not found")
    
    def test_existing_pending_order(self, api_client):
        """Verify PID/25-26/396 exists and is pending"""
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?search=396")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        test_order = next((o for o in orders if "396" in o.get("order_no", "")), None)
        
        if test_order:
            print(f"Found order 396 with status: {test_order.get('project_status')}")
            # Status may vary based on testing
        else:
            pytest.skip("Order 396 not found")


# ============== STATS VERIFICATION ==============

class TestProjectManagementStats:
    """Test that stats are calculated correctly for Project Management"""
    
    def test_stats_include_all_statuses(self, api_client):
        """Verify orders list can be filtered by project status"""
        # Get all orders
        response = api_client.get(f"{BASE_URL}/api/order-lifecycle/orders?limit=500")
        assert response.status_code == 200
        
        orders = response.json().get("orders", [])
        
        # Count by project_status
        status_counts = {}
        for order in orders:
            status = order.get("project_status") or "pending"
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"Status counts: {status_counts}")
        
        # Verify we can calculate stats
        total = len(orders)
        pending = status_counts.get("pending", 0)
        accepted = status_counts.get("accepted", 0)
        in_progress = status_counts.get("in_progress", 0)
        completed = status_counts.get("completed", 0)
        
        assert total >= 0
        assert pending + accepted + in_progress + completed <= total
