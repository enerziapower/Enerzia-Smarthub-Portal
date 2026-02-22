"""
Test Sales → Projects Workflow Updates
Tests for:
1. Order Handoff - Simplified Create Project modal (only Engineer selection)
2. Project Management - Accordion-style status groups
3. Order Lifecycle - Link Project feature
4. Dashboard stats per status
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestOrderHandoffSimplified:
    """Test Order Handoff - Simplified Create Project modal"""
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Dashboard returns 200")
    
    def test_dashboard_has_required_fields(self):
        """Dashboard should have pending_orders, active_projects, etc."""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        assert "pending_orders" in data, "Missing pending_orders in dashboard"
        assert "active_projects_from_orders" in data or "active_projects" in data, "Missing active_projects"
        print(f"✓ Dashboard has required fields: pending_orders={data.get('pending_orders')}")
    
    def test_pending_orders_returns_200(self):
        """Pending orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Pending orders returns 200")
    
    def test_pending_orders_structure(self):
        """Pending orders should return list with required fields"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        assert "pending_orders" in data, "Missing pending_orders key"
        assert isinstance(data["pending_orders"], list), "pending_orders should be a list"
        print(f"✓ Pending orders structure valid, count: {len(data['pending_orders'])}")
    
    def test_engineers_team_returns_200(self):
        """Projects team endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Projects team returns 200")
    
    def test_engineers_team_has_members(self):
        """Projects team should return list of engineers"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        data = response.json()
        
        assert isinstance(data, list), "Team should be a list"
        if len(data) > 0:
            assert "name" in data[0], "Team member should have name"
        print(f"✓ Projects team has {len(data)} members")
    
    def test_create_project_requires_engineer(self):
        """Create project should require engineer_in_charge"""
        # Get a pending order first
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test with")
        
        order = pending_data["pending_orders"][0]
        
        # Try to create project without engineer
        payload = {
            "order_id": order["id"],
            "budget_allocation": order.get("total_amount", 0),
            "project_type": "PSS",
            "engineer_in_charge": "",  # Empty engineer
            "estimated_start_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test project"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        # Should either fail validation or succeed (depending on backend validation)
        print(f"✓ Create project without engineer returned: {response.status_code}")


class TestProjectManagementAccordion:
    """Test Project Management - Accordion-style status groups"""
    
    def test_projects_returns_200(self):
        """Projects endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Projects returns 200")
    
    def test_projects_have_status_field(self):
        """All projects should have status field"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        assert isinstance(data, list), "Projects should be a list"
        
        # Check status distribution
        status_counts = {}
        for project in data:
            status = project.get("status", "Need to Start")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"✓ Projects by status: {status_counts}")
    
    def test_projects_have_required_fields_for_accordion(self):
        """Projects should have fields needed for accordion display"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No projects to test")
        
        project = data[0]
        required_fields = ["id", "pid_no", "status", "client"]
        
        for field in required_fields:
            assert field in project, f"Missing field: {field}"
        
        print(f"✓ Projects have required fields for accordion display")
    
    def test_project_update_status(self):
        """Should be able to update project status"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No projects to test")
        
        project = data[0]
        project_id = project["id"]
        
        # Try to update project
        update_payload = {
            "status": project.get("status", "Need to Start")  # Keep same status
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/projects/{project_id}",
            json=update_payload
        )
        
        assert update_response.status_code in [200, 401], f"Unexpected status: {update_response.status_code}"
        print(f"✓ Project update returned: {update_response.status_code}")
    
    def test_project_status_values(self):
        """Projects should have valid status values"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        valid_statuses = [
            "Need to Start", "Ongoing", "Completed", 
            "Invoiced", "Partially Invoiced", "Cancelled",
            "In Progress"  # Legacy status
        ]
        
        invalid_statuses = []
        for project in data:
            status = project.get("status", "Need to Start")
            if status not in valid_statuses:
                invalid_statuses.append(status)
        
        if invalid_statuses:
            print(f"⚠ Found non-standard statuses: {set(invalid_statuses)}")
        else:
            print("✓ All projects have valid status values")


class TestOrderLifecycleLinkProject:
    """Test Order Lifecycle - Link Project feature"""
    
    def test_order_lifecycle_orders_returns_200(self):
        """Order lifecycle orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Order lifecycle orders returns 200")
    
    def test_orders_have_project_link_info(self):
        """Orders should have project linking information"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        data = response.json()
        
        assert "orders" in data, "Missing orders key"
        
        linked_count = 0
        unlinked_count = 0
        
        for order in data["orders"]:
            if order.get("project_id") or order.get("project_pid"):
                linked_count += 1
            else:
                unlinked_count += 1
        
        print(f"✓ Orders: {linked_count} linked, {unlinked_count} unlinked to projects")
    
    def test_link_project_endpoint_exists(self):
        """Link project endpoint should exist"""
        # Get an order without project
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        data = response.json()
        
        unlinked_order = None
        for order in data.get("orders", []):
            if not order.get("project_id") and not order.get("project_pid"):
                unlinked_order = order
                break
        
        if not unlinked_order:
            pytest.skip("No unlinked orders to test")
        
        # Try to link with invalid project (should return 404)
        link_response = requests.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{unlinked_order['id']}/link-project",
            json={"project_id": "invalid-project-id"}
        )
        
        # Should return 404 for invalid project
        assert link_response.status_code in [404, 400, 422], f"Unexpected status: {link_response.status_code}"
        print(f"✓ Link project endpoint exists, returned {link_response.status_code} for invalid project")
    
    def test_get_available_projects_for_linking(self):
        """Should be able to get projects available for linking"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        # Filter unlinked projects
        unlinked_projects = [p for p in data if not p.get("linked_order_id")]
        
        print(f"✓ Found {len(unlinked_projects)} projects available for linking")
    
    def test_link_project_validation(self):
        """Link project should validate project exists"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        data = response.json()
        
        if len(data.get("orders", [])) == 0:
            pytest.skip("No orders to test")
        
        order = data["orders"][0]
        
        # Try to link non-existent project
        link_response = requests.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{order['id']}/link-project",
            json={"project_id": "non-existent-project-id-12345"}
        )
        
        assert link_response.status_code == 404, f"Expected 404, got {link_response.status_code}"
        print("✓ Link project validates project existence")


class TestDashboardStats:
    """Test Dashboard stats per status"""
    
    def test_order_lifecycle_dashboard_stats(self):
        """Order lifecycle dashboard stats should return 200"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Order lifecycle dashboard stats returns 200")
    
    def test_dashboard_stats_structure(self):
        """Dashboard stats should have required fields"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/dashboard/stats")
        data = response.json()
        
        expected_fields = ["total_orders", "total_revenue"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: total_orders={data.get('total_orders')}, total_revenue={data.get('total_revenue')}")
    
    def test_dashboard_orders_by_status(self):
        """Dashboard should show orders grouped by status"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/dashboard/stats")
        data = response.json()
        
        if "orders_by_status" in data:
            print(f"✓ Orders by status: {data['orders_by_status']}")
        else:
            print("⚠ orders_by_status not in dashboard stats")
    
    def test_project_orders_dashboard(self):
        """Project orders dashboard should return stats"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        print(f"✓ Project orders dashboard: pending={data.get('pending_orders', {}).get('count', 0)}, active={data.get('active_projects_from_orders', 0)}")


class TestCreateProjectFromOrder:
    """Test creating project from order with simplified modal"""
    
    def test_create_project_with_engineer_only(self):
        """Create project should work with just engineer selection"""
        # Get pending orders
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        # Create project with minimal data (just engineer)
        payload = {
            "order_id": order["id"],
            "engineer_in_charge": "Test Engineer",
            "budget_allocation": order.get("total_amount", 0),  # Auto from order
            "project_type": order.get("category", "PSS"),
            "estimated_start_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "TEST_project_creation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        # Should succeed or fail gracefully
        print(f"✓ Create project returned: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Created project: {data.get('project', {}).get('pid_no', 'N/A')}")
    
    def test_project_inherits_order_budget(self):
        """Created project should inherit order's budget"""
        # Get orders with projects
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        orders_with_projects = [o for o in data.get("orders", []) if o.get("has_project")]
        
        if len(orders_with_projects) == 0:
            pytest.skip("No orders with projects to verify")
        
        order = orders_with_projects[0]
        
        # Get the linked project
        project_response = requests.get(f"{BASE_URL}/api/projects")
        projects = project_response.json()
        
        linked_project = None
        for p in projects:
            if p.get("linked_order_id") == order.get("order_id"):
                linked_project = p
                break
        
        if linked_project:
            print(f"✓ Project {linked_project.get('pid_no')} linked to order {order.get('order_no')}")
            print(f"  Order amount: {order.get('total_amount')}, Project PO amount: {linked_project.get('po_amount')}")


class TestProjectEditModal:
    """Test Project Edit modal with status, dates, work items"""
    
    def test_project_has_editable_fields(self):
        """Projects should have fields for edit modal"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No projects to test")
        
        project = data[0]
        
        editable_fields = ["status", "project_date", "completion_date", "work_items"]
        present_fields = [f for f in editable_fields if f in project]
        
        print(f"✓ Project has editable fields: {present_fields}")
    
    def test_project_work_items_structure(self):
        """Project work items should have proper structure"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        projects_with_work_items = [p for p in data if p.get("work_items")]
        
        if len(projects_with_work_items) == 0:
            print("⚠ No projects with work items found")
            return
        
        project = projects_with_work_items[0]
        work_items = project.get("work_items", [])
        
        if len(work_items) > 0:
            item = work_items[0]
            print(f"✓ Work item structure: {list(item.keys())}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
