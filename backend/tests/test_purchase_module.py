"""
Test Purchase Module API Endpoints
- Purchase Requests CRUD
- Vendor Quotes CRUD
- Purchase Orders CRUD
- GRN CRUD
- Dashboard Stats and Savings
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data storage
test_data = {
    "request_id": None,
    "quote_id": None,
    "order_id": None,
    "grn_id": None
}


class TestPurchaseModuleDashboard:
    """Dashboard and Stats endpoints"""
    
    def test_get_dashboard_stats(self):
        """Test GET /api/purchase-module/dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "purchase_requests" in data
        assert "purchase_orders" in data
        assert "grn_count" in data
        assert "pending_deliveries" in data
        
        # Verify purchase_requests structure
        pr = data["purchase_requests"]
        assert "total" in pr
        assert "pending" in pr
        assert "quoted" in pr
        assert "approved" in pr
        
        # Verify purchase_orders structure
        po = data["purchase_orders"]
        assert "total" in po
        assert "draft" in po
        assert "confirmed" in po
        assert "received" in po
        assert "total_value" in po
        assert "received_value" in po
        print(f"Dashboard stats: PRs={pr['total']}, POs={po['total']}, GRNs={data['grn_count']}")
    
    def test_get_savings_analysis(self):
        """Test GET /api/purchase-module/dashboard/savings"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/dashboard/savings")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "summary" in data
        assert "details" in data
        
        summary = data["summary"]
        assert "total_budget" in summary
        assert "total_actual" in summary
        assert "total_savings" in summary
        assert "savings_percent" in summary
        print(f"Savings: Budget={summary['total_budget']}, Actual={summary['total_actual']}, Savings={summary['total_savings']}")


class TestPurchaseRequests:
    """Purchase Request CRUD tests"""
    
    def test_get_requests_empty(self):
        """Test GET /api/purchase-module/requests"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "total" in data
        print(f"Total requests: {data['total']}")
    
    def test_create_purchase_request(self):
        """Test POST /api/purchase-module/requests"""
        payload = {
            "title": "TEST_Materials for Project ABC",
            "items": [
                {
                    "id": str(uuid.uuid4()),
                    "description": "Steel Plates 10mm",
                    "quantity": 50,
                    "unit": "Nos",
                    "estimated_price": 500
                },
                {
                    "id": str(uuid.uuid4()),
                    "description": "Copper Wire 2.5mm",
                    "quantity": 100,
                    "unit": "M",
                    "estimated_price": 25
                }
            ],
            "required_by": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "priority": "high",
            "notes": "Urgent requirement for project"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-module/requests",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "request" in data
        
        request = data["request"]
        assert "id" in request
        assert "pr_no" in request
        assert request["title"] == payload["title"]
        assert request["priority"] == "high"
        assert request["status"] == "pending"
        assert len(request["items"]) == 2
        assert request["total_estimated"] == 50 * 500 + 100 * 25  # 27500
        
        test_data["request_id"] = request["id"]
        test_data["request_items"] = request["items"]
        print(f"Created PR: {request['pr_no']} with ID: {request['id']}")
    
    def test_get_request_by_id(self):
        """Test GET /api/purchase-module/requests/{id}"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/requests/{request_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "request" in data
        assert "quotes" in data
        assert data["request"]["id"] == request_id
        print(f"Retrieved request: {data['request']['pr_no']}")
    
    def test_get_request_not_found(self):
        """Test GET /api/purchase-module/requests/{invalid_id}"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/requests/invalid-id-12345")
        assert response.status_code == 404
    
    def test_update_request_status(self):
        """Test PUT /api/purchase-module/requests/{id}/status"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request created")
        
        response = requests.put(
            f"{BASE_URL}/api/purchase-module/requests/{request_id}/status?status=quoted"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "quoted"
        print("Updated request status to 'quoted'")
    
    def test_update_request_invalid_status(self):
        """Test PUT /api/purchase-module/requests/{id}/status with invalid status"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request created")
        
        response = requests.put(
            f"{BASE_URL}/api/purchase-module/requests/{request_id}/status?status=invalid_status"
        )
        assert response.status_code == 400
    
    def test_filter_requests_by_status(self):
        """Test GET /api/purchase-module/requests with status filter"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/requests?status=quoted")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        # All returned requests should have status 'quoted'
        for req in data["requests"]:
            assert req["status"] == "quoted"
        print(f"Found {len(data['requests'])} quoted requests")
    
    def test_filter_requests_by_priority(self):
        """Test GET /api/purchase-module/requests with priority filter"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/requests?priority=high")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        for req in data["requests"]:
            assert req["priority"] == "high"
        print(f"Found {len(data['requests'])} high priority requests")


class TestVendorQuotes:
    """Vendor Quote CRUD tests"""
    
    def test_get_quotes_empty(self):
        """Test GET /api/purchase-module/quotes"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/quotes")
        assert response.status_code == 200
        data = response.json()
        assert "quotes" in data
        print(f"Total quotes: {len(data['quotes'])}")
    
    def test_add_vendor_quote(self):
        """Test POST /api/purchase-module/quotes"""
        request_id = test_data.get("request_id")
        request_items = test_data.get("request_items", [])
        if not request_id:
            pytest.skip("No request created")
        
        # Create quote with item prices
        items = []
        for item in request_items:
            items.append({
                "item_id": item["id"],
                "quoted_price": item["estimated_price"] * 0.9,  # 10% discount
                "delivery_days": 7
            })
        
        payload = {
            "id": str(uuid.uuid4()),
            "vendor_name": "TEST_Vendor A",
            "items": items,
            "total_amount": sum(i["quoted_price"] * request_items[idx]["quantity"] for idx, i in enumerate(items)),
            "delivery_days": 7,
            "validity_days": 30,
            "payment_terms": "Net 30",
            "quote_date": datetime.now().strftime("%Y-%m-%d"),
            "quote_ref": "QT-001",
            "notes": "Best price offer"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-module/quotes?request_id={request_id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "quote" in data
        assert data["quote"]["vendor_name"] == "TEST_Vendor A"
        
        test_data["quote_id"] = data["quote"]["id"]
        print(f"Added quote from {data['quote']['vendor_name']} with ID: {data['quote']['id']}")
    
    def test_add_second_vendor_quote(self):
        """Test adding a second quote for comparison"""
        request_id = test_data.get("request_id")
        request_items = test_data.get("request_items", [])
        if not request_id:
            pytest.skip("No request created")
        
        # Create second quote with different prices
        items = []
        for item in request_items:
            items.append({
                "item_id": item["id"],
                "quoted_price": item["estimated_price"] * 0.85,  # 15% discount
                "delivery_days": 10
            })
        
        payload = {
            "id": str(uuid.uuid4()),
            "vendor_name": "TEST_Vendor B",
            "items": items,
            "total_amount": sum(i["quoted_price"] * request_items[idx]["quantity"] for idx, i in enumerate(items)),
            "delivery_days": 10,
            "validity_days": 30,
            "payment_terms": "Net 45",
            "quote_date": datetime.now().strftime("%Y-%m-%d"),
            "quote_ref": "QT-002",
            "notes": "Competitive pricing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-module/quotes?request_id={request_id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["quote"]["vendor_name"] == "TEST_Vendor B"
        test_data["quote_id_2"] = data["quote"]["id"]
        print(f"Added second quote from {data['quote']['vendor_name']}")
    
    def test_compare_quotes(self):
        """Test GET /api/purchase-module/quotes/compare/{request_id}"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/quotes/compare/{request_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "request" in data
        assert "quotes" in data
        assert "comparison" in data
        
        comparison = data["comparison"]
        if comparison:
            assert "items" in comparison
            assert "totals" in comparison
            assert "lowest_total" in comparison
            assert "savings_potential" in comparison
            
            # Verify lowest total is identified
            if comparison["lowest_total"]:
                print(f"Lowest quote: {comparison['lowest_total']['vendor_name']} at {comparison['lowest_total']['total_amount']}")
                print(f"Savings potential: {comparison['savings_potential']}")
    
    def test_get_quotes_by_request(self):
        """Test GET /api/purchase-module/quotes with request_id filter"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/quotes?request_id={request_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["quotes"]) >= 2  # We added 2 quotes
        print(f"Found {len(data['quotes'])} quotes for request")
    
    def test_select_quote(self):
        """Test PUT /api/purchase-module/quotes/{id}/select"""
        quote_id = test_data.get("quote_id_2")  # Select the lower priced quote
        if not quote_id:
            pytest.skip("No quote created")
        
        response = requests.put(f"{BASE_URL}/api/purchase-module/quotes/{quote_id}/select")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Quote selected"
        print(f"Selected quote: {quote_id}")


class TestPurchaseOrders:
    """Purchase Order CRUD tests"""
    
    def test_get_orders_empty(self):
        """Test GET /api/purchase-module/orders"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert "total_value" in data
        print(f"Total orders: {data['total']}, Value: {data['total_value']}")
    
    def test_create_po_from_quote(self):
        """Test POST /api/purchase-module/orders/from-quote/{quote_id}"""
        quote_id = test_data.get("quote_id_2")
        if not quote_id:
            pytest.skip("No quote created")
        
        response = requests.post(f"{BASE_URL}/api/purchase-module/orders/from-quote/{quote_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "order" in data
        
        order = data["order"]
        assert "id" in order
        assert "po_no" in order
        assert order["status"] == "draft"
        assert "items" in order
        assert "total_amount" in order
        assert "gst_amount" in order
        
        test_data["order_id"] = order["id"]
        print(f"Created PO: {order['po_no']} with total: {order['total_amount']}")
    
    def test_get_order_by_id(self):
        """Test GET /api/purchase-module/orders/{id}"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/orders/{order_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "order" in data
        assert "grns" in data
        assert data["order"]["id"] == order_id
        print(f"Retrieved order: {data['order']['po_no']}")
    
    def test_get_order_not_found(self):
        """Test GET /api/purchase-module/orders/{invalid_id}"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/orders/invalid-id-12345")
        assert response.status_code == 404
    
    def test_update_order_status(self):
        """Test PUT /api/purchase-module/orders/{id}/status"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        response = requests.put(
            f"{BASE_URL}/api/purchase-module/orders/{order_id}/status?status=confirmed"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"
        print("Updated order status to 'confirmed'")
    
    def test_update_order_invalid_status(self):
        """Test PUT /api/purchase-module/orders/{id}/status with invalid status"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        response = requests.put(
            f"{BASE_URL}/api/purchase-module/orders/{order_id}/status?status=invalid_status"
        )
        assert response.status_code == 400
    
    def test_filter_orders_by_status(self):
        """Test GET /api/purchase-module/orders with status filter"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/orders?status=confirmed")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        for order in data["orders"]:
            assert order["status"] == "confirmed"
        print(f"Found {len(data['orders'])} confirmed orders")


class TestGRN:
    """GRN CRUD tests"""
    
    def test_get_grns_empty(self):
        """Test GET /api/purchase-module/grn"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/grn")
        assert response.status_code == 200
        data = response.json()
        assert "grns" in data
        assert "total" in data
        print(f"Total GRNs: {data['total']}")
    
    def test_create_grn(self):
        """Test POST /api/purchase-module/grn"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        # Get order details first
        order_response = requests.get(f"{BASE_URL}/api/purchase-module/orders/{order_id}")
        order = order_response.json()["order"]
        
        # Create GRN with received items
        items = []
        for item in order.get("items", []):
            items.append({
                "description": item["description"],
                "received_qty": item["quantity"],
                "accepted_qty": item["quantity"],
                "rejected_qty": 0
            })
        
        payload = {
            "purchase_order_id": order_id,
            "received_date": datetime.now().strftime("%Y-%m-%d"),
            "received_by": "Test User",
            "items": items,
            "delivery_challan_no": "DC-001",
            "vehicle_no": "TN-01-AB-1234",
            "notes": "All items received in good condition"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-module/grn",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "grn" in data
        
        grn = data["grn"]
        assert "id" in grn
        assert "grn_no" in grn
        assert grn["purchase_order_id"] == order_id
        assert "total_received_value" in grn
        
        test_data["grn_id"] = grn["id"]
        print(f"Created GRN: {grn['grn_no']} with value: {grn['total_received_value']}")
    
    def test_get_grn_by_id(self):
        """Test GET /api/purchase-module/grn/{id}"""
        grn_id = test_data.get("grn_id")
        if not grn_id:
            pytest.skip("No GRN created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/grn/{grn_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "grn" in data
        assert "order" in data
        assert data["grn"]["id"] == grn_id
        print(f"Retrieved GRN: {data['grn']['grn_no']}")
    
    def test_get_grn_not_found(self):
        """Test GET /api/purchase-module/grn/{invalid_id}"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/grn/invalid-id-12345")
        assert response.status_code == 404
    
    def test_get_grns_by_po(self):
        """Test GET /api/purchase-module/grn with po_id filter"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/grn?po_id={order_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["grns"]) >= 1
        for grn in data["grns"]:
            assert grn["purchase_order_id"] == order_id
        print(f"Found {len(data['grns'])} GRNs for order")
    
    def test_verify_po_status_after_grn(self):
        """Verify PO status updated after GRN creation"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order created")
        
        response = requests.get(f"{BASE_URL}/api/purchase-module/orders/{order_id}")
        assert response.status_code == 200
        order = response.json()["order"]
        
        # Status should be 'received' or 'partial' after GRN
        assert order["status"] in ["received", "partial"]
        assert order["received_amount"] > 0
        print(f"PO status after GRN: {order['status']}, received: {order['received_amount']}")


class TestVendors:
    """Vendor list endpoint"""
    
    def test_get_vendors_list(self):
        """Test GET /api/purchase-module/vendors"""
        response = requests.get(f"{BASE_URL}/api/purchase-module/vendors")
        assert response.status_code == 200
        data = response.json()
        
        assert "vendors" in data
        assert isinstance(data["vendors"], list)
        print(f"Total vendors: {len(data['vendors'])}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_grn(self):
        """Test DELETE /api/purchase-module/grn/{id}"""
        grn_id = test_data.get("grn_id")
        if not grn_id:
            pytest.skip("No GRN to delete")
        
        response = requests.delete(f"{BASE_URL}/api/purchase-module/grn/{grn_id}")
        assert response.status_code == 200
        print(f"Deleted GRN: {grn_id}")
    
    def test_delete_order(self):
        """Test DELETE /api/purchase-module/orders/{id}"""
        order_id = test_data.get("order_id")
        if not order_id:
            pytest.skip("No order to delete")
        
        response = requests.delete(f"{BASE_URL}/api/purchase-module/orders/{order_id}")
        assert response.status_code == 200
        print(f"Deleted order: {order_id}")
    
    def test_delete_quotes(self):
        """Test DELETE /api/purchase-module/quotes/{id}"""
        quote_id = test_data.get("quote_id")
        quote_id_2 = test_data.get("quote_id_2")
        
        if quote_id:
            response = requests.delete(f"{BASE_URL}/api/purchase-module/quotes/{quote_id}")
            assert response.status_code == 200
            print(f"Deleted quote: {quote_id}")
        
        if quote_id_2:
            response = requests.delete(f"{BASE_URL}/api/purchase-module/quotes/{quote_id_2}")
            assert response.status_code == 200
            print(f"Deleted quote: {quote_id_2}")
    
    def test_delete_request(self):
        """Test DELETE /api/purchase-module/requests/{id}"""
        request_id = test_data.get("request_id")
        if not request_id:
            pytest.skip("No request to delete")
        
        response = requests.delete(f"{BASE_URL}/api/purchase-module/requests/{request_id}")
        assert response.status_code == 200
        print(f"Deleted request: {request_id}")
    
    def test_verify_cleanup(self):
        """Verify all test data is cleaned up"""
        # Verify request deleted
        request_id = test_data.get("request_id")
        if request_id:
            response = requests.get(f"{BASE_URL}/api/purchase-module/requests/{request_id}")
            assert response.status_code == 404
        
        # Verify order deleted
        order_id = test_data.get("order_id")
        if order_id:
            response = requests.get(f"{BASE_URL}/api/purchase-module/orders/{order_id}")
            assert response.status_code == 404
        
        print("All test data cleaned up successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
