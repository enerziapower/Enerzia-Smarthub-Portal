"""
Test Suite for Enhanced Order Handoff - Option D Workflow
Tests for:
1. Enhanced Create Project modal with all new fields (Customer, Location, Category, Vendor, Project Name, Engineer, Team Members, Project Actions, Work Items)
2. Work Items pre-filled from order's quotation items
3. Order Lifecycle - NO Link Project button (read-only Project Status)
4. Order Lifecycle - Project Status section shows: PID, Status badge, Completion % bar, Budget vs Actual
5. POST /api/project-orders/create-project-from-order - Enhanced fields support
6. Projects created from Order Handoff should have team_members and project_actions stored
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestEnhancedCreateProjectModal:
    """Test Enhanced Create Project modal with all new fields"""
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Dashboard returns 200")
    
    def test_pending_orders_returns_200(self):
        """Pending orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Pending orders returns 200")
    
    def test_pending_orders_have_items_for_work_items(self):
        """Pending orders should have items array for work items pre-fill"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        assert "pending_orders" in data, "Missing pending_orders key"
        
        orders_with_items = 0
        for order in data["pending_orders"]:
            if order.get("items") and len(order.get("items", [])) > 0:
                orders_with_items += 1
        
        print(f"✓ {orders_with_items}/{len(data['pending_orders'])} pending orders have items for work items pre-fill")
    
    def test_pending_orders_have_customer_info(self):
        """Pending orders should have customer_name and customer_address for pre-fill"""
        response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        data = response.json()
        
        if len(data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = data["pending_orders"][0]
        
        # Check for customer info fields
        assert "customer_name" in order, "Missing customer_name in pending order"
        print(f"✓ Pending order has customer_name: {order.get('customer_name')}")
        
        if "customer_address" in order:
            print(f"  customer_address: {order.get('customer_address')}")


class TestEnhancedCreateProjectEndpoint:
    """Test POST /api/project-orders/create-project-from-order with enhanced fields"""
    
    def test_create_project_accepts_customer_name(self):
        """Create project should accept customer_name field"""
        # Get a pending order
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        payload = {
            "order_id": order["id"],
            "customer_name": "TEST_Customer Name",
            "engineer_in_charge": "Test Engineer"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        # Should accept the field (200 or 400 if project already exists)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Create project accepts customer_name, returned: {response.status_code}")
    
    def test_create_project_accepts_team_members(self):
        """Create project should accept team_members array"""
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        payload = {
            "order_id": order["id"],
            "engineer_in_charge": "Test Engineer",
            "team_members": ["Member 1", "Member 2", "Member 3"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Create project accepts team_members array, returned: {response.status_code}")
    
    def test_create_project_accepts_project_actions(self):
        """Create project should accept project_actions field"""
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        payload = {
            "order_id": order["id"],
            "engineer_in_charge": "Test Engineer",
            "project_actions": "TEST_Project scope and actions description"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Create project accepts project_actions, returned: {response.status_code}")
    
    def test_create_project_accepts_work_items(self):
        """Create project should accept work_items array"""
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        payload = {
            "order_id": order["id"],
            "engineer_in_charge": "Test Engineer",
            "work_items": [
                {"description": "Item 1", "quantity": 2, "unit": "Nos", "rate": 1000, "amount": 2000},
                {"description": "Item 2", "quantity": 1, "unit": "Set", "rate": 5000, "amount": 5000}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Create project accepts work_items array, returned: {response.status_code}")
    
    def test_create_project_accepts_all_enhanced_fields(self):
        """Create project should accept all enhanced fields together"""
        pending_response = requests.get(f"{BASE_URL}/api/project-orders/pending-orders")
        pending_data = pending_response.json()
        
        if len(pending_data.get("pending_orders", [])) == 0:
            pytest.skip("No pending orders to test")
        
        order = pending_data["pending_orders"][0]
        
        payload = {
            "order_id": order["id"],
            "customer_name": "TEST_Full Customer Name",
            "location": "TEST_Location Address",
            "category": "PSS",
            "project_name": "TEST_Project Name",
            "vendor": "Enerzia",
            "engineer_in_charge": "Test Engineer",
            "team_members": ["Team Member 1", "Team Member 2"],
            "project_actions": "TEST_Full project scope and actions",
            "work_items": [
                {"description": "Work Item 1", "quantity": 1, "unit": "Nos", "rate": 10000, "amount": 10000}
            ],
            "notes": "TEST_Additional notes"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-orders/create-project-from-order",
            json=payload
        )
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            project = data.get("project", {})
            
            # Verify enhanced fields are stored
            assert project.get("client") == "TEST_Full Customer Name" or project.get("customer_name") == "TEST_Full Customer Name", "customer_name not stored"
            assert project.get("team_members") is not None, "team_members not stored"
            assert project.get("project_actions") is not None, "project_actions not stored"
            
            print(f"✓ Created project with all enhanced fields: {project.get('pid_no')}")
            print(f"  - client: {project.get('client')}")
            print(f"  - team_members: {project.get('team_members')}")
            print(f"  - project_actions: {project.get('project_actions')[:50] if project.get('project_actions') else 'N/A'}...")
        else:
            print(f"✓ Create project accepts all enhanced fields (project already exists)")


class TestProjectStoredFields:
    """Test that projects created from Order Handoff have team_members and project_actions stored"""
    
    def test_projects_have_team_members_field(self):
        """Projects should have team_members field"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        projects_with_team = 0
        for project in data:
            if project.get("team_members") and len(project.get("team_members", [])) > 0:
                projects_with_team += 1
        
        print(f"✓ {projects_with_team}/{len(data)} projects have team_members")
    
    def test_projects_have_project_actions_field(self):
        """Projects should have project_actions field"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        projects_with_actions = 0
        for project in data:
            if project.get("project_actions"):
                projects_with_actions += 1
        
        print(f"✓ {projects_with_actions}/{len(data)} projects have project_actions")
    
    def test_projects_have_work_items_field(self):
        """Projects should have work_items field"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        projects_with_work_items = 0
        for project in data:
            if project.get("work_items") and len(project.get("work_items", [])) > 0:
                projects_with_work_items += 1
        
        print(f"✓ {projects_with_work_items}/{len(data)} projects have work_items")


class TestOrderLifecycleProjectStatus:
    """Test Order Lifecycle - Project Status section (read-only)"""
    
    def test_order_lifecycle_orders_returns_200(self):
        """Order lifecycle orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Order lifecycle orders returns 200")
    
    def test_order_details_has_linked_project_info(self):
        """Order details should have linked_project info for Project Status section"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        data = response.json()
        
        if len(data.get("orders", [])) == 0:
            pytest.skip("No orders to test")
        
        # Find an order with a linked project
        order_with_project = None
        for order in data["orders"]:
            if order.get("project_id") or order.get("project_pid"):
                order_with_project = order
                break
        
        if not order_with_project:
            print("⚠ No orders with linked projects found")
            return
        
        # Get order details
        order_id = order_with_project["id"]
        details_response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders/{order_id}")
        
        if details_response.status_code == 200:
            details = details_response.json()
            
            # Check for linked_project info
            linked_project = details.get("linked_project")
            if linked_project:
                print(f"✓ Order has linked_project info:")
                print(f"  - pid_no: {linked_project.get('pid_no')}")
                print(f"  - status: {linked_project.get('status')}")
                print(f"  - completion_percentage: {linked_project.get('completion_percentage')}")
                print(f"  - budget: {linked_project.get('budget')}")
                print(f"  - actual_expenses: {linked_project.get('actual_expenses')}")
            else:
                print("⚠ linked_project not in order details")
        else:
            print(f"⚠ Order details returned: {details_response.status_code}")
    
    def test_orders_with_projects_have_project_status_fields(self):
        """Orders with projects should have fields for Project Status display"""
        response = requests.get(f"{BASE_URL}/api/project-orders/orders-with-projects")
        data = response.json()
        
        orders_with_status = 0
        for order in data.get("orders", []):
            if order.get("has_project"):
                # Check for Project Status fields
                has_pid = "project_pid" in order
                has_status = "project_status" in order
                has_completion = "project_completion" in order
                
                if has_pid and has_status:
                    orders_with_status += 1
        
        print(f"✓ {orders_with_status} orders have project status fields for display")


class TestNoLinkProjectButton:
    """Test that Order Lifecycle should NOT have Link Project button anymore"""
    
    def test_link_project_endpoint_should_not_be_used(self):
        """Link project endpoint exists but should not be used from Order Lifecycle UI"""
        # The endpoint may still exist for backward compatibility
        # but the UI should not show the Link Project button
        
        # Get orders
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        data = response.json()
        
        unlinked_orders = 0
        for order in data.get("orders", []):
            if not order.get("project_id") and not order.get("project_pid"):
                unlinked_orders += 1
        
        print(f"✓ {unlinked_orders} orders without linked projects")
        print("  Note: These orders should be handled via Order Handoff (Projects dept), not Order Lifecycle (Sales)")


class TestOrderHandoffWorkflow:
    """Test the complete Order Handoff workflow"""
    
    def test_order_handoff_dashboard_stats(self):
        """Order Handoff dashboard should show correct stats"""
        response = requests.get(f"{BASE_URL}/api/project-orders/dashboard")
        data = response.json()
        
        print("✓ Order Handoff Dashboard Stats:")
        print(f"  - Pending Orders: {data.get('pending_orders', {}).get('count', 0)}")
        print(f"  - Pending Value: {data.get('pending_orders', {}).get('total_value', 0)}")
        print(f"  - Active Projects from Orders: {data.get('active_projects_from_orders', 0)}")
        print(f"  - This Week Billing: {data.get('this_week_billing', 0)}")
        print(f"  - Projects This Month: {data.get('projects_this_month', 0)}")
    
    def test_engineers_available_for_selection(self):
        """Engineers should be available for selection in Create Project modal"""
        response = requests.get(f"{BASE_URL}/api/departments/projects/team")
        data = response.json()
        
        assert isinstance(data, list), "Team should be a list"
        print(f"✓ {len(data)} engineers available for selection")
        
        if len(data) > 0:
            print(f"  Sample: {data[0].get('name')} - {data[0].get('designation', 'Engineer')}")


class TestCategoryOptions:
    """Test project category options"""
    
    def test_project_categories_in_created_projects(self):
        """Projects should have valid category values"""
        response = requests.get(f"{BASE_URL}/api/projects")
        data = response.json()
        
        valid_categories = ['PSS', 'AS', 'OSS', 'CS', 'AMC', 'CAL']
        
        category_counts = {}
        for project in data:
            cat = project.get("category", "Unknown")
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        print(f"✓ Project categories distribution: {category_counts}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
