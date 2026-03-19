"""
Business Hub Phase 5 Tests - Vendor, GRN, Billing Management
Tests for:
- Vendor Management (CRUD, import/export)
- GRN Management (create from PO, partial receipt)
- Billing Management (milestones, invoices, weekly billing)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-finance-hub-5.preview.emergentagent.com').rstrip('/')


class TestVendorManagement:
    """Vendor Management endpoint tests"""
    
    def test_get_vendors_returns_200(self):
        """Test GET /api/settings/vendors returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings/vendors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/settings/vendors - Found {len(data)} vendors")
    
    def test_create_vendor(self):
        """Test POST /api/settings/vendors creates a vendor"""
        vendor_data = {
            "name": f"TEST_Vendor_{uuid.uuid4().hex[:8]}",
            "contact_person": "Test Contact",
            "email": "test@vendor.com",
            "phone": "9876543210",
            "category": "Electrical",
            "gst_number": "29TESTGST1234F1Z5"
        }
        response = requests.post(f"{BASE_URL}/api/settings/vendors", json=vendor_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data or "vendor" in data
        print(f"✓ POST /api/settings/vendors - Created vendor: {vendor_data['name']}")
        return data.get("id") or data.get("vendor", {}).get("id")
    
    def test_vendor_crud_workflow(self):
        """Test full CRUD workflow for vendors"""
        # CREATE
        vendor_name = f"TEST_CRUD_Vendor_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/settings/vendors", json={
            "name": vendor_name,
            "contact_person": "CRUD Test",
            "email": "crud@test.com",
            "phone": "1234567890",
            "category": "General"
        })
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        vendor_id = created.get("id") or created.get("vendor", {}).get("id")
        print(f"✓ Created vendor: {vendor_name}")
        
        # READ - Verify in list
        list_response = requests.get(f"{BASE_URL}/api/settings/vendors")
        assert list_response.status_code == 200
        vendors = list_response.json()
        found = any(v.get("name") == vendor_name for v in vendors)
        assert found, f"Vendor {vendor_name} not found in list"
        print(f"✓ Verified vendor in list")
        
        # UPDATE
        if vendor_id:
            update_response = requests.put(f"{BASE_URL}/api/settings/vendors/{vendor_id}", json={
                "name": vendor_name,
                "contact_person": "Updated Contact",
                "email": "updated@test.com"
            })
            assert update_response.status_code == 200
            print(f"✓ Updated vendor")
        
        # DELETE
        if vendor_id:
            delete_response = requests.delete(f"{BASE_URL}/api/settings/vendors/{vendor_id}")
            assert delete_response.status_code == 200
            print(f"✓ Deleted vendor")


class TestGRNManagement:
    """GRN Management endpoint tests"""
    
    def test_get_grn_list_returns_200(self):
        """Test GET /api/project-requests/grn returns 200"""
        response = requests.get(f"{BASE_URL}/api/project-requests/grn")
        assert response.status_code == 200
        data = response.json()
        assert "grns" in data
        assert "total" in data
        print(f"✓ GET /api/project-requests/grn - Found {data['total']} GRNs")
    
    def test_get_purchase_orders_for_grn(self):
        """Test GET /api/project-requests/purchase-orders returns POs for GRN creation"""
        response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        assert response.status_code == 200
        data = response.json()
        assert "purchase_orders" in data
        print(f"✓ GET /api/project-requests/purchase-orders - Found {data['total']} POs")
        return data.get("purchase_orders", [])
    
    def test_create_grn_requires_po_id(self):
        """Test POST /api/project-requests/grn requires po_id"""
        response = requests.post(f"{BASE_URL}/api/project-requests/grn", json={
            "received_date": "2026-01-15",
            "items": []
        })
        assert response.status_code == 422  # Validation error
        print("✓ POST /api/project-requests/grn - Validates required po_id")
    
    def test_create_grn_from_po(self):
        """Test creating GRN from existing PO"""
        # Get existing POs
        po_response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        pos = po_response.json().get("purchase_orders", [])
        
        if not pos:
            pytest.skip("No POs available for GRN creation test")
        
        # Use first PO that's not already received
        eligible_po = None
        for po in pos:
            if po.get("status") in ["created", "sent", "confirmed", "partially_received"]:
                eligible_po = po
                break
        
        if not eligible_po:
            pytest.skip("No eligible POs for GRN creation")
        
        # Create GRN
        grn_data = {
            "po_id": eligible_po["id"],
            "received_date": "2026-01-15",
            "received_by": "Test User",
            "delivery_challan_no": "DC-TEST-001",
            "vehicle_no": "TN01AB1234",
            "remarks": "Test GRN",
            "items": [
                {
                    "description": item.get("description", "Test Item"),
                    "ordered_qty": item.get("quantity", 1),
                    "received_qty": item.get("quantity", 1),
                    "unit": item.get("unit", "Nos"),
                    "remarks": ""
                }
                for item in eligible_po.get("items", [{"description": "Test", "quantity": 1}])
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/grn", json=grn_data)
        assert response.status_code == 200
        data = response.json()
        assert "grn" in data
        assert "grn_number" in data["grn"]
        print(f"✓ POST /api/project-requests/grn - Created GRN: {data['grn']['grn_number']}")


class TestBillingManagement:
    """Billing Management endpoint tests"""
    
    def test_get_invoices_returns_200(self):
        """Test GET /api/project-requests/invoices returns 200"""
        response = requests.get(f"{BASE_URL}/api/project-requests/invoices")
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert "total" in data
        print(f"✓ GET /api/project-requests/invoices - Found {data['total']} invoices")
    
    def test_get_billing_dashboard(self):
        """Test GET /api/project-requests/billing-dashboard returns summary"""
        response = requests.get(f"{BASE_URL}/api/project-requests/billing-dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "by_status" in data
        assert "by_type" in data
        print(f"✓ GET /api/project-requests/billing-dashboard - Summary retrieved")
    
    def test_get_orders_with_items(self):
        """Test GET /api/order-lifecycle/orders returns orders with items for milestone tracking"""
        response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        orders = data["orders"]
        print(f"✓ GET /api/order-lifecycle/orders - Found {len(orders)} orders")
        
        # Check if orders have items
        orders_with_items = [o for o in orders if o.get("items")]
        print(f"  - Orders with items: {len(orders_with_items)}")
        return orders
    
    def test_update_order_items_completion(self):
        """Test PUT /api/order-lifecycle/orders/{id} updates item completion percentage"""
        # Get orders with items
        orders_response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        orders = orders_response.json().get("orders", [])
        
        # Find order with items
        order_with_items = None
        for order in orders:
            if order.get("items") and len(order.get("items", [])) > 0:
                order_with_items = order
                break
        
        if not order_with_items:
            pytest.skip("No orders with items found for completion test")
        
        # Update items with completion percentage
        items = order_with_items.get("items", [])
        updated_items = []
        for item in items:
            updated_item = {**item}
            updated_item["completion_percentage"] = 50  # Set 50% completion
            updated_items.append(updated_item)
        
        response = requests.put(
            f"{BASE_URL}/api/order-lifecycle/orders/{order_with_items['id']}",
            json={"items": updated_items}
        )
        assert response.status_code == 200
        print(f"✓ PUT /api/order-lifecycle/orders/{order_with_items['id']} - Updated item completion")
    
    def test_create_invoice_requires_order_id(self):
        """Test POST /api/project-requests/invoices requires order_id"""
        response = requests.post(f"{BASE_URL}/api/project-requests/invoices", json={
            "invoice_type": "Progress",
            "items": [],
            "subtotal": 0,
            "total_amount": 0
        })
        assert response.status_code == 422  # Validation error
        print("✓ POST /api/project-requests/invoices - Validates required order_id")
    
    def test_create_invoice_from_order(self):
        """Test creating invoice from existing order"""
        # Get orders
        orders_response = requests.get(f"{BASE_URL}/api/order-lifecycle/orders")
        orders = orders_response.json().get("orders", [])
        
        if not orders:
            pytest.skip("No orders available for invoice creation test")
        
        order = orders[0]
        order_value = order.get("order_value", 0) or order.get("total_amount", 10000)
        
        # Create invoice
        invoice_data = {
            "order_id": order["id"],
            "invoice_type": "Progress",
            "items": [
                {
                    "description": "Progress Payment - 50%",
                    "quantity": 1,
                    "unit": "Nos",
                    "rate": order_value * 0.5,
                    "amount": order_value * 0.5
                }
            ],
            "subtotal": order_value * 0.5,
            "cgst_percent": 9.0,
            "sgst_percent": 9.0,
            "igst_percent": 0.0,
            "cgst_amount": order_value * 0.5 * 0.09,
            "sgst_amount": order_value * 0.5 * 0.09,
            "igst_amount": 0,
            "total_amount": order_value * 0.5 * 1.18,
            "payment_terms": "Net 30",
            "notes": "Test invoice"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-requests/invoices", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        assert "invoice" in data
        assert "invoice_number" in data["invoice"]
        print(f"✓ POST /api/project-requests/invoices - Created invoice: {data['invoice']['invoice_number']}")
        return data["invoice"]
    
    def test_update_invoice_status(self):
        """Test PUT /api/project-requests/invoices/{id}/status updates status"""
        # Get invoices
        invoices_response = requests.get(f"{BASE_URL}/api/project-requests/invoices")
        invoices = invoices_response.json().get("invoices", [])
        
        if not invoices:
            # Create one first
            self.test_create_invoice_from_order()
            invoices_response = requests.get(f"{BASE_URL}/api/project-requests/invoices")
            invoices = invoices_response.json().get("invoices", [])
        
        if not invoices:
            pytest.skip("No invoices available for status update test")
        
        invoice = invoices[0]
        
        # Update status to sent
        response = requests.put(
            f"{BASE_URL}/api/project-requests/invoices/{invoice['id']}/status?status=sent"
        )
        assert response.status_code == 200
        print(f"✓ PUT /api/project-requests/invoices/{invoice['id']}/status - Updated to 'sent'")


class TestWeeklyBilling:
    """Weekly Billing endpoint tests"""
    
    def test_get_weekly_billing(self):
        """Test GET /api/billing/weekly returns weekly billing data"""
        response = requests.get(f"{BASE_URL}/api/billing/weekly")
        assert response.status_code == 200
        data = response.json()
        # Check structure
        assert isinstance(data, (list, dict))
        print(f"✓ GET /api/billing/weekly - Weekly billing data retrieved")
    
    def test_get_projects_for_billing(self):
        """Test GET /api/projects returns projects for billing sync"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data or isinstance(data, list)
        projects = data.get("projects", data) if isinstance(data, dict) else data
        print(f"✓ GET /api/projects - Found {len(projects)} projects for billing sync")


class TestFinanceDashboard:
    """Finance Dashboard endpoint tests"""
    
    def test_get_finance_dashboard(self):
        """Test GET /api/project-requests/finance-dashboard returns P&L summary"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "by_status" in data
        assert "request_totals" in data
        assert "projects" in data
        print(f"✓ GET /api/project-requests/finance-dashboard - P&L summary retrieved")
        print(f"  - Total projects: {data['summary'].get('total_projects', 0)}")
        print(f"  - Total revenue: {data['summary'].get('total_revenue', 0)}")


class TestVendorRequestsIntegration:
    """Vendor Requests integration tests"""
    
    def test_get_vendor_requests(self):
        """Test GET /api/project-requests/vendors returns vendor requests"""
        response = requests.get(f"{BASE_URL}/api/project-requests/vendors")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "total" in data
        print(f"✓ GET /api/project-requests/vendors - Found {data['total']} vendor requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
