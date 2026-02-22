"""
Test Suite for Project Orders Integration API
Tests the Sales Order to Project handoff functionality
- Dashboard endpoint
- Pending orders endpoint
- Orders with projects endpoint
- Create project from order endpoint
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProjectOrdersDashboard:
    """Test GET /api/project-orders/dashboard endpoint"""
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_dashboard_returns_pending_orders_count(self):
        """Dashboard should return pending orders count and value"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "pending_orders" in data, "Missing pending_orders in response"
        assert "count" in data["pending_orders"], "Missing count in pending_orders"
        assert "total_value" in data["pending_orders"], "Missing total_value in pending_orders"
        assert isinstance(data["pending_orders"]["count"], int), "count should be integer"
        assert isinstance(data["pending_orders"]["total_value"], (int, float)), "total_value should be numeric"
    
    def test_dashboard_returns_active_projects(self):
        """Dashboard should return active projects from orders count"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "active_projects_from_orders" in data, "Missing active_projects_from_orders"
        assert isinstance(data["active_projects_from_orders"], int), "active_projects_from_orders should be integer"
    
    def test_dashboard_returns_this_week_billing(self):
        """Dashboard should return this week billing amount"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "this_week_billing" in data, "Missing this_week_billing"
        assert isinstance(data["this_week_billing"], (int, float)), "this_week_billing should be numeric"
    
    def test_dashboard_returns_projects_this_month(self):
        """Dashboard should return projects created this month"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "projects_this_month" in data, "Missing projects_this_month"
        assert isinstance(data["projects_this_month"], int), "projects_this_month should be integer"
    
    def test_dashboard_returns_recent_projects(self):
        """Dashboard should return recent projects list"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "recent_projects" in data, "Missing recent_projects"
        assert isinstance(data["recent_projects"], list), "recent_projects should be a list"


class TestPendingOrders:
    """Test GET /api/project-orders/pending-orders endpoint"""
    
    def test_pending_orders_returns_200(self):
        """Pending orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pending_orders_returns_list(self):
        """Pending orders should return a list of orders"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        assert "pending_orders" in data, "Missing pending_orders in response"
        assert isinstance(data["pending_orders"], list), "pending_orders should be a list"
        assert "total" in data, "Missing total count"
    
    def test_pending_orders_have_required_fields(self):
        """Each pending order should have required fields"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        if len(data["pending_orders"]) > 0:
            order = data["pending_orders"][0]
            required_fields = ["id", "order_no", "customer_name", "status"]
            for field in required_fields:
                assert field in order, f"Missing required field: {field}"
    
    def test_pending_orders_status_is_confirmed_or_pending(self):
        """Pending orders should have status confirmed or pending"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        for order in data["pending_orders"]:
            assert order["status"] in ["confirmed", "pending"], f"Unexpected status: {order['status']}"


class TestOrdersWithProjects:
    """Test GET /api/project-orders/orders-with-projects endpoint"""
    
    def test_orders_with_projects_returns_200(self):
        """Orders with projects endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_orders_with_projects_returns_list(self):
        """Should return a list of orders with project status"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        assert "orders" in data, "Missing orders in response"
        assert isinstance(data["orders"], list), "orders should be a list"
    
    def test_orders_with_projects_returns_summary(self):
        """Should return summary statistics"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        assert "summary" in data, "Missing summary in response"
        summary = data["summary"]
        assert "total_orders" in summary, "Missing total_orders in summary"
        assert "with_project" in summary, "Missing with_project in summary"
        assert "without_project" in summary, "Missing without_project in summary"
        assert "assignment_rate" in summary, "Missing assignment_rate in summary"
    
    def test_orders_have_has_project_flag(self):
        """Each order should have has_project boolean flag"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        for order in data["orders"]:
            assert "has_project" in order, "Missing has_project flag"
            assert isinstance(order["has_project"], bool), "has_project should be boolean"
    
    def test_orders_with_project_have_project_details(self):
        """Orders with has_project=True should have project details"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        for order in data["orders"]:
            if order["has_project"]:
                assert "project_id" in order, "Missing project_id for order with project"
                assert "project_pid" in order, "Missing project_pid for order with project"


class TestCreateProjectFromOrder:
    """Test POST /api/project-orders/create-project-from-order endpoint"""
    
    @pytest.fixture
    def pending_order_id(self):
        """Get a pending order ID for testing"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        if len(data["pending_orders"]) > 0:
            return data["pending_orders"][0]["id"]
        pytest.skip("No pending orders available for testing")
    
    @pytest.fixture
    def engineer_name(self):
        """Get an engineer name for testing"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        data = response.json()
        if len(data) > 0:
            return data[0]["name"]
        return "Test Engineer"
    
    def test_create_project_missing_order_id_returns_422(self):
        """Creating project without order_id should return 422"""
        payload = {
            "budget_allocation": 100000,
            "engineer_in_charge": "Test Engineer"
        }
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    
    def test_create_project_invalid_order_returns_404(self):
        """Creating project with invalid order_id should return 404"""
        payload = {
            "order_id": str(uuid.uuid4()),
            "budget_allocation": 100000,
            "engineer_in_charge": "Test Engineer"
        }
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_create_project_success(self, pending_order_id, engineer_name):
        """Creating project from valid order should succeed"""
        payload = {
            "order_id": pending_order_id,
            "budget_allocation": 150000,
            "project_type": "PSS",
            "engineer_in_charge": engineer_name,
            "estimated_start_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "TEST_project_creation"
        }
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        # Could be 200 (success) or 400 (project already exists)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Missing message in response"
            assert "project" in data, "Missing project in response"
            assert "pid_no" in data["project"], "Missing pid_no in created project"
            assert "linked_order_id" in data["project"], "Missing linked_order_id"
            assert data["project"]["linked_order_id"] == pending_order_id
            print(f"Created project: {data['project']['pid_no']}")
        else:
            # Project already exists for this order
            data = response.json()
            assert "detail" in data, "Missing detail in error response"
            print(f"Project already exists: {data['detail']}")


class TestWeeklyBilling:
    """Test weekly billing endpoints"""
    
    def test_current_week_billing_summary_returns_200(self):
        """Current week billing summary should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/weekly-billing/summary/current-week")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_current_week_billing_summary_structure(self):
        """Current week billing summary should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/project-orders/weekly-billing/summary/current-week")
        data = response.json()
        
        assert "week_number" in data, "Missing week_number"
        assert "year" in data, "Missing year"
        assert "total_billing" in data, "Missing total_billing"
        assert "total_entries" in data, "Missing total_entries"
        assert "by_project" in data, "Missing by_project"


class TestProjectOrderDetails:
    """Test project order details endpoint"""
    
    @pytest.fixture
    def project_with_order(self):
        """Get a project ID that has a linked order"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        for order in data["orders"]:
            if order["has_project"] and order.get("project_id"):
                return order["project_id"]
        pytest.skip("No projects with linked orders found")
    
    def test_project_order_details_invalid_id_returns_404(self):
        """Invalid project ID should return 404"""
        response = requests.get(f"{BASE_URL}/api/project-orders/project/{str(uuid.uuid4())}/order-details")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_project_order_details_returns_200(self, project_with_order):
        """Valid project ID should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/project/{project_with_order}/order-details")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_project_order_details_structure(self, project_with_order):
        """Project order details should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/project-orders/project/{project_with_order}/order-details")
        data = response.json()
        
        assert "project" in data, "Missing project"
        assert "order" in data, "Missing order"
        assert "billing_history" in data, "Missing billing_history"
        assert "total_billed" in data, "Missing total_billed"


class TestDepartmentsTeam:
    """Test departments team endpoint used for engineer selection"""
    
    def test_projects_team_returns_200(self):
        """Projects team endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_projects_team_returns_list(self):
        """Projects team should return a list of team members"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
    
    def test_projects_team_members_have_required_fields(self):
        """Team members should have required fields"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        data = response.json()
        
        if len(data) > 0:
            member = data[0]
            assert "id" in member, "Missing id"
            assert "name" in member, "Missing name"
            assert "department" in member, "Missing department"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
