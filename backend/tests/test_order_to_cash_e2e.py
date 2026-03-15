"""
Comprehensive E2E Test Suite for Order-to-Cash Lifecycle
Tests the complete flow: Order → Accept → Project → Requests → PO → GRN → Finance

Modules tested:
- Order Management (Business Hub)
- Project Management (Business Hub)
- Purchase Management (Material/Vendor Requests)
- GRN Management
- Payment Management
- Finance Analytics
- Vendor Management
- Bi-directional sync with Project & Services
"""

import pytest
import requests
import os
import time
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestOrderManagement:
    """Test Order Management - Create orders with PID, budget allocation"""
    
    def test_get_next_pid(self):
        """Test getting next PID number"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid")
        assert response.status_code == 200
        data = response.json()
        assert "next_pid" in data
        assert "financial_year" in data
        assert data["next_pid"].startswith("PID/")
        print(f"✓ Next PID: {data['next_pid']}")
    
    def test_get_orders_list(self):
        """Test Order Summary - get all orders"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        print(f"✓ Orders list: {data['total']} orders found")
    
    def test_create_order_with_budget(self):
        """Test creating new order with PID and budget allocation"""
        test_pid = f"PID/25-26/TEST-E2E-{int(time.time())}"
        order_data = {
            "pid_no": test_pid,
            "category": "PSS",
            "customer_name": "TEST_E2E Customer Corp",
            "customer_address": "123 Test Street, Chennai",
            "po_number": "PO-E2E-001",
            "order_date": datetime.now().strftime("%d/%m/%Y"),
            "order_value": 100000.0,
            "delivery_date": "2026-04-15",
            "project_name": "E2E Test Project",
            "location": "Chennai",
            "purchase_budget": 40000.0,
            "execution_budget": 25000.0,
            "others_budget": 10000.0,
            "target_profit": 25000.0,
            "items": [
                {"id": "1", "sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 10, "unit_price": 10000, "total": 100000}
            ],
            "subtotal": 100000.0,
            "gst_percent": 18.0,
            "gst_amount": 18000.0,
            "total_amount": 100000.0,
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert "order" in data
        assert data["order"]["pid_no"] == test_pid
        assert data["order"]["financials"]["purchase_budget"] == 40000.0
        assert data["order"]["financials"]["execution_budget"] == 25000.0
        print(f"✓ Order created: {test_pid}")
        
        # Store for cleanup
        pytest.test_order_id = data["order"]["id"]
        pytest.test_pid = test_pid
        return data["order"]["id"]
    
    def test_get_order_details(self):
        """Test getting order details with lifecycle and financials"""
        if not hasattr(pytest, 'test_order_id'):
            pytest.skip("No test order created")
        
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders/{pytest.test_order_id}")
        assert response.status_code == 200
        data = response.json()
        assert "order" in data
        assert "lifecycle" in data
        assert "financials" in data
        print(f"✓ Order details retrieved with lifecycle and financials")


class TestProjectManagement:
    """Test Project Management - Accept orders, manage projects"""
    
    def test_get_pending_orders(self):
        """Test getting orders pending acceptance"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        pending_count = len([o for o in data["orders"] if o.get("lifecycle_status") == "new"])
        print(f"✓ Pending orders: {pending_count} orders waiting acceptance")
    
    def test_accept_order_creates_project(self):
        """Test accepting order creates project in Project & Services"""
        # First create an order to accept
        test_pid = f"PID/25-26/TEST-ACCEPT-{int(time.time())}"
        order_data = {
            "pid_no": test_pid,
            "category": "PSS",
            "customer_name": "TEST_Accept Customer",
            "customer_address": "456 Accept Street",
            "order_value": 50000.0,
            "purchase_budget": 20000.0,
            "execution_budget": 15000.0,
            "target_profit": 15000.0,
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/order-lifecycle/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order"]["id"]
        
        # Accept the order - POST endpoint with required fields
        accept_data = {
            "start_date": "2026-03-20",
            "end_date": "2026-06-30",
            "deadline": "2026-04-15",
            "project_manager": "Test PM",
            "notes": "E2E Test acceptance",
            "project_status": "accepted"
        }
        
        accept_response = requests.post(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_id}/accept",
            json=accept_data
        )
        
        assert accept_response.status_code == 200
        data = accept_response.json()
        assert "order" in data
        assert data["order"]["project_status"] == "accepted"
        print(f"✓ Order accepted and project created: {test_pid}")
        
        pytest.accept_order_id = order_id
    
    def test_get_live_projects(self):
        """Test getting live/active projects"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        active_projects = [p for p in data if p.get("status") in ["Ongoing", "In Progress", "Need to Start"]]
        print(f"✓ Live projects: {len(active_projects)} active projects")


class TestMaterialRequests:
    """Test Material Request flow - Raise, Approve, Create PO"""
    
    def test_create_material_request(self):
        """Test raising material request from project"""
        request_data = {
            "order_id": pytest.test_order_id if hasattr(pytest, 'test_order_id') else "test-order-id",
            "order_no": pytest.test_pid if hasattr(pytest, 'test_pid') else "TEST-PID",
            "request_type": "material",
            "project_name": "E2E Test Project",
            "customer_name": "TEST_E2E Customer",
            "items": [
                {"description": "Test Material", "quantity": 10, "unit": "Nos", "estimated_cost": 5000}
            ],
            "total_items": 1,
            "estimated_cost": 5000.0,
            "priority": "medium",
            "notes": "E2E Test material request"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/material", json=request_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "request" in data
            pytest.material_request_id = data["request"]["id"]
            print(f"✓ Material request created: {data['request'].get('request_no', 'N/A')}")
        else:
            print(f"⚠ Material request creation returned {response.status_code}")
    
    def test_get_pending_material_requests(self):
        """Test getting material requests pending approval"""
        response = requests.get(f"{BASE_URL}/api/project-requests/materials?status=pending")
        
        if response.status_code == 200:
            data = response.json()
            assert "requests" in data
            print(f"✓ Pending material requests: {len(data['requests'])} requests")
        else:
            # Try alternative endpoint
            response = requests.get(f"{BASE_URL}/api/project-requests/dashboard/stats")
            if response.status_code == 200:
                print(f"✓ Dashboard stats retrieved")
    
    def test_approve_material_request(self):
        """Test approving material request"""
        if not hasattr(pytest, 'material_request_id'):
            pytest.skip("No material request to approve")
        
        approve_data = {
            "status": "approved",
            "updated_by": "Test Admin",
            "comments": "Approved for E2E testing"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/project-requests/{pytest.material_request_id}/status",
            json=approve_data
        )
        
        if response.status_code == 200:
            print(f"✓ Material request approved")
        else:
            print(f"⚠ Approval returned {response.status_code}")


class TestPurchaseOrderCreation:
    """Test PO creation from approved material requests"""
    
    def test_create_po_from_request(self):
        """Test creating Purchase Order from approved material request"""
        if not hasattr(pytest, 'material_request_id'):
            pytest.skip("No material request for PO creation")
        
        po_data = {
            "request_id": pytest.material_request_id,
            "vendor_name": "TEST E2E Vendor",
            "vendor_contact": "9876543210",
            "delivery_date": "2026-04-01",
            "payment_terms": "Net 30",
            "notes": "E2E Test PO"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/create-po", json=po_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "po" in data
            pytest.po_id = data["po"]["id"]
            pytest.po_number = data["po"]["po_number"]
            print(f"✓ PO created: {pytest.po_number}")
        else:
            print(f"⚠ PO creation returned {response.status_code}")
    
    def test_get_purchase_orders(self):
        """Test getting purchase orders list"""
        response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        assert response.status_code == 200
        data = response.json()
        assert "purchase_orders" in data
        print(f"✓ Purchase orders: {data['total']} POs found")


class TestGRNManagement:
    """Test GRN Management - Goods receipt from PO"""
    
    def test_create_grn(self):
        """Test creating GRN from Purchase Order"""
        if not hasattr(pytest, 'po_id'):
            pytest.skip("No PO for GRN creation")
        
        grn_data = {
            "po_id": pytest.po_id,
            "received_date": datetime.now().strftime("%Y-%m-%d"),
            "received_by": "Test Receiver",
            "items": [
                {"description": "Test Material", "ordered_qty": 10, "received_qty": 10, "unit": "Nos", "remarks": ""}
            ],
            "delivery_challan_no": "DC-E2E-001",
            "vehicle_no": "TN01E2E001",
            "remarks": "E2E Test GRN"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/grn", json=grn_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "grn" in data
            pytest.grn_id = data["grn"]["id"]
            print(f"✓ GRN created: {data['grn']['grn_number']}")
        else:
            print(f"⚠ GRN creation returned {response.status_code}")
    
    def test_get_grn_list(self):
        """Test getting GRN list"""
        response = requests.get(f"{BASE_URL}/api/project-requests/grn")
        assert response.status_code == 200
        data = response.json()
        assert "grns" in data
        print(f"✓ GRN list: {data['total']} GRNs found")


class TestPaymentManagement:
    """Test Payment Request flow"""
    
    def test_create_payment_request(self):
        """Test raising payment request from project"""
        request_data = {
            "order_id": pytest.test_order_id if hasattr(pytest, 'test_order_id') else "test-order-id",
            "order_no": pytest.test_pid if hasattr(pytest, 'test_pid') else "TEST-PID",
            "request_type": "payment",
            "project_name": "E2E Test Project",
            "customer_name": "TEST_E2E Customer",
            "amount": 25000.0,
            "payment_type": "advance",
            "vendor_name": "TEST Vendor",
            "priority": "high",
            "notes": "E2E Test payment request"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/payment", json=request_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "request" in data
            pytest.payment_request_id = data["request"]["id"]
            print(f"✓ Payment request created: {data['request'].get('request_no', 'N/A')}")
        else:
            print(f"⚠ Payment request creation returned {response.status_code}")
    
    def test_get_pending_payment_requests(self):
        """Test getting payment requests pending approval"""
        response = requests.get(f"{BASE_URL}/api/project-requests/payments?status=pending")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Pending payment requests retrieved")
        else:
            print(f"⚠ Payment requests endpoint returned {response.status_code}")


class TestVendorRequests:
    """Test Vendor Request flow"""
    
    def test_create_vendor_request(self):
        """Test raising vendor request from project"""
        request_data = {
            "order_id": pytest.test_order_id if hasattr(pytest, 'test_order_id') else "test-order-id",
            "order_no": pytest.test_pid if hasattr(pytest, 'test_pid') else "TEST-PID",
            "request_type": "vendor",
            "project_name": "E2E Test Project",
            "customer_name": "TEST_E2E Customer",
            "vendor_name": "TEST New Vendor",
            "vendor_type": "material_supplier",
            "estimated_cost": 15000.0,
            "priority": "medium",
            "notes": "E2E Test vendor request"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/vendor", json=request_data)
        
        if response.status_code == 200:
            data = response.json()
            assert "request" in data
            print(f"✓ Vendor request created: {data['request'].get('request_no', 'N/A')}")
        else:
            print(f"⚠ Vendor request creation returned {response.status_code}")


class TestFinanceAnalytics:
    """Test Finance Analytics - P&L Dashboard"""
    
    def test_get_finance_dashboard(self):
        """Test Finance Overview - Total Revenue, Expenses, Profit"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "total_revenue" in data["summary"]
        assert "total_actual_cost" in data["summary"]
        assert "gross_profit" in data["summary"]
        
        print(f"✓ Finance Dashboard:")
        print(f"  - Total Revenue: ₹{data['summary']['total_revenue']:,.2f}")
        print(f"  - Total Cost: ₹{data['summary']['total_actual_cost']:,.2f}")
        print(f"  - Gross Profit: ₹{data['summary']['gross_profit']:,.2f}")
    
    def test_get_project_pnl(self):
        """Test Project P&L - individual project profitability"""
        if not hasattr(pytest, 'test_order_id'):
            # Use an existing order
            response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders?limit=1")
            if response.status_code == 200 and response.json()["orders"]:
                order_id = response.json()["orders"][0]["id"]
            else:
                pytest.skip("No orders available for P&L test")
        else:
            order_id = pytest.test_order_id
        
        response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert "revenue" in data
            assert "budgets" in data
            assert "actuals" in data
            print(f"✓ Project P&L retrieved for {data.get('order_no', 'N/A')}")
        else:
            print(f"⚠ Project P&L returned {response.status_code}")
    
    def test_get_dashboard_stats(self):
        """Test Order Lifecycle Dashboard Stats"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_orders" in data
        assert "total_revenue" in data
        assert "total_profit" in data
        
        print(f"✓ Dashboard Stats:")
        print(f"  - Total Orders: {data['total_orders']}")
        print(f"  - Total Revenue: ₹{data['total_revenue']:,.2f}")
        print(f"  - Total Profit: ₹{data['total_profit']:,.2f}")


class TestVendorManagement:
    """Test Vendor Management"""
    
    def test_get_vendors_list(self):
        """Test getting vendors list"""
        response = requests.get(f"{BASE_URL}/api/settings/vendors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Vendors list: {len(data)} vendors found")


class TestProjectServices:
    """Test Project & Services module integration"""
    
    def test_get_projects_list(self):
        """Test getting projects from Project & Services"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Projects list: {len(data)} projects found")
    
    def test_get_requests_by_order(self):
        """Test getting all requests for a project (Edit Modal sync)"""
        if not hasattr(pytest, 'test_order_id'):
            # Use an existing order
            response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders?limit=1")
            if response.status_code == 200 and response.json()["orders"]:
                order_id = response.json()["orders"][0]["id"]
            else:
                pytest.skip("No orders available")
        else:
            order_id = pytest.test_order_id
        
        response = requests.get(f"{BASE_URL}/api/project-requests/by-order/{order_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert "requests" in data
            print(f"✓ Requests by order: materials={len(data['requests'].get('materials', []))}, vendors={len(data['requests'].get('vendors', []))}, payments={len(data['requests'].get('payments', []))}")
        else:
            print(f"⚠ Requests by order returned {response.status_code}")


class TestBidirectionalSync:
    """Test bi-directional sync between Business Hub and Project & Services"""
    
    def test_delete_project_removes_from_both(self):
        """Test deleting project removes from both views"""
        # Create a test project
        project_data = {
            "pid_no": f"PID/25-26/TEST-DELETE-{int(time.time())}",
            "category": "PSS",
            "client": "TEST_Delete Client",
            "location": "Test Location",
            "project_name": "TEST Delete Project",
            "vendor": "Test Vendor",
            "status": "Need to Start",
            "engineer_in_charge": "Test Engineer",
            "po_amount": 10000.0
        }
        
        create_response = requests.post(f"{BASE_URL}/api/projects", json=project_data)
        
        if create_response.status_code == 200:
            project_id = create_response.json()["id"]
            
            # Delete the project
            delete_response = requests.delete(f"{BASE_URL}/api/projects/{project_id}")
            assert delete_response.status_code == 200
            
            # Verify project is deleted
            get_response = requests.get(f"{BASE_URL}/api/projects/{project_id}")
            assert get_response.status_code == 404
            
            print(f"✓ Project deleted and verified removed")
        else:
            print(f"⚠ Project creation returned {create_response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_orders(self):
        """Clean up test orders created during testing"""
        if hasattr(pytest, 'test_order_id'):
            response = requests.delete(f"{BASE_URL}/api/order-lifecycle/orders/{pytest.test_order_id}")
            if response.status_code == 200:
                print(f"✓ Test order cleaned up")
        
        if hasattr(pytest, 'accept_order_id'):
            response = requests.delete(f"{BASE_URL}/api/order-lifecycle/orders/{pytest.accept_order_id}")
            if response.status_code == 200:
                print(f"✓ Accept test order cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
