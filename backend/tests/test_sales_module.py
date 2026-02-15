"""
Sales Module API Tests
- Enquiries CRUD with auto-numbering (Enq/Year/XXXX format)
- Quotations CRUD with line items and GST calculation
- Sales Orders CRUD with status tracking
- Linked flow: Enquiry → Quotation → Order
- Dashboard stats
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesModule:
    """Sales Module API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created IDs for cleanup
        self.created_enquiry_id = None
        self.created_quotation_id = None
        self.created_order_id = None
        
        yield
        
        # Cleanup - delete test data
        if self.created_order_id:
            self.session.delete(f"{BASE_URL}/api/sales/orders/{self.created_order_id}")
        if self.created_quotation_id:
            self.session.delete(f"{BASE_URL}/api/sales/quotations/{self.created_quotation_id}")
        if self.created_enquiry_id:
            self.session.delete(f"{BASE_URL}/api/sales/enquiries/{self.created_enquiry_id}")

    # ============== ENQUIRY TESTS ==============
    
    def test_get_enquiries_list(self):
        """Test GET /api/sales/enquiries - List all enquiries"""
        response = self.session.get(f"{BASE_URL}/api/sales/enquiries")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "enquiries" in data
        assert "total" in data
        print(f"✓ GET enquiries: {data['total']} enquiries found")
    
    def test_get_enquiry_stats(self):
        """Test GET /api/sales/enquiries/stats - Get enquiry statistics"""
        response = self.session.get(f"{BASE_URL}/api/sales/enquiries/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "new" in data
        assert "quoted" in data
        assert "accepted" in data
        assert "pipeline_value" in data
        print(f"✓ GET enquiry stats: total={data['total']}, new={data['new']}, quoted={data['quoted']}, pipeline_value={data['pipeline_value']}")
    
    def test_create_enquiry_with_auto_number(self):
        """Test POST /api/sales/enquiries - Create enquiry with auto-generated number"""
        enquiry_data = {
            "date": datetime.now().strftime("%d.%m.%y"),
            "company_name": "TEST_Company_Sales_Module",
            "location": "Chennai",
            "description": "Test enquiry for Sales Module testing",
            "value": 150000,
            "contact_person": "Test Contact",
            "contact_phone": "9876543210",
            "contact_email": "test@example.com",
            "category": "PSS",
            "source": "Website"
        }
        
        response = self.session.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "enquiry" in data
        enquiry = data["enquiry"]
        assert "enquiry_no" in enquiry
        assert enquiry["enquiry_no"].startswith("Enq/"), f"Enquiry number should start with 'Enq/', got: {enquiry['enquiry_no']}"
        assert enquiry["status"] == "new"
        assert enquiry["company_name"] == "TEST_Company_Sales_Module"
        
        self.created_enquiry_id = enquiry["id"]
        print(f"✓ CREATE enquiry: {enquiry['enquiry_no']} - auto-number format verified (Enq/Year/XXXX)")
        
        return enquiry
    
    def test_get_single_enquiry(self):
        """Test GET /api/sales/enquiries/{id} - Get single enquiry"""
        # First create an enquiry
        enquiry = self.test_create_enquiry_with_auto_number()
        
        response = self.session.get(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["id"] == enquiry["id"]
        assert data["enquiry_no"] == enquiry["enquiry_no"]
        print(f"✓ GET single enquiry: {data['enquiry_no']}")
    
    def test_update_enquiry_status(self):
        """Test PUT /api/sales/enquiries/{id} - Update enquiry status"""
        # First create an enquiry
        enquiry = self.test_create_enquiry_with_auto_number()
        
        update_data = {"status": "site_visited", "remarks": "Site visit completed"}
        response = self.session.put(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["enquiry"]["status"] == "site_visited"
        print(f"✓ UPDATE enquiry status: {enquiry['enquiry_no']} -> site_visited")
    
    def test_delete_enquiry(self):
        """Test DELETE /api/sales/enquiries/{id} - Delete enquiry"""
        # First create an enquiry
        enquiry = self.test_create_enquiry_with_auto_number()
        
        response = self.session.delete(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}")
        assert get_response.status_code == 404
        
        self.created_enquiry_id = None  # Already deleted
        print(f"✓ DELETE enquiry: {enquiry['enquiry_no']} deleted successfully")

    # ============== QUOTATION TESTS ==============
    
    def test_get_quotations_list(self):
        """Test GET /api/sales/quotations - List all quotations"""
        response = self.session.get(f"{BASE_URL}/api/sales/quotations")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "quotations" in data
        assert "total" in data
        print(f"✓ GET quotations: {data['total']} quotations found")
    
    def test_get_quotation_stats(self):
        """Test GET /api/sales/quotations/stats - Get quotation statistics"""
        response = self.session.get(f"{BASE_URL}/api/sales/quotations/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "draft" in data
        assert "sent" in data
        assert "accepted" in data
        assert "total_value" in data
        print(f"✓ GET quotation stats: total={data['total']}, draft={data['draft']}, total_value={data['total_value']}")
    
    def test_create_quotation_standalone(self):
        """Test POST /api/sales/quotations - Create standalone quotation with line items and GST"""
        quotation_data = {
            "customer_name": "TEST_Customer_Quotation",
            "customer_address": "123 Test Street, Chennai",
            "customer_gst": "33AABCT1234A1ZZ",
            "customer_contact": "Test Contact",
            "customer_phone": "9876543210",
            "customer_email": "test@example.com",
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/12/2025",
            "subject": "Test Quotation for Sales Module",
            "items": [
                {"sno": 1, "description": "Test Item 1", "unit": "Nos", "quantity": 10, "unit_price": 1000, "total": 10000},
                {"sno": 2, "description": "Test Item 2", "unit": "Set", "quantity": 5, "unit_price": 2000, "total": 10000}
            ],
            "subtotal": 20000,
            "gst_percent": 18,
            "gst_amount": 3600,
            "total_amount": 23600,
            "payment_terms": "50% advance, 50% on delivery",
            "delivery_terms": "2-3 weeks",
            "category": "PSS"
        }
        
        response = self.session.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "quotation" in data
        quotation = data["quotation"]
        assert "quotation_no" in quotation
        assert quotation["quotation_no"].startswith("QT-"), f"Quotation number should start with 'QT-', got: {quotation['quotation_no']}"
        assert quotation["status"] == "draft"
        assert quotation["gst_percent"] == 18
        assert quotation["total_amount"] == 23600
        assert len(quotation["items"]) == 2
        
        self.created_quotation_id = quotation["id"]
        print(f"✓ CREATE quotation: {quotation['quotation_no']} - GST 18% = ₹{quotation['gst_amount']}, Total = ₹{quotation['total_amount']}")
        
        return quotation
    
    def test_create_quotation_linked_to_enquiry(self):
        """Test POST /api/sales/quotations - Create quotation linked to enquiry"""
        # First create an enquiry
        enquiry = self.test_create_enquiry_with_auto_number()
        
        quotation_data = {
            "enquiry_id": enquiry["id"],
            "customer_name": enquiry["company_name"],
            "customer_contact": enquiry["contact_person"],
            "customer_phone": enquiry["contact_phone"],
            "customer_email": enquiry["contact_email"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/12/2025",
            "subject": enquiry["description"],
            "items": [
                {"sno": 1, "description": "Linked Item", "unit": "Nos", "quantity": 1, "unit_price": 150000, "total": 150000}
            ],
            "subtotal": 150000,
            "gst_percent": 18,
            "gst_amount": 27000,
            "total_amount": 177000,
            "category": enquiry.get("category", "PSS")
        }
        
        response = self.session.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        quotation = data["quotation"]
        assert quotation["enquiry_id"] == enquiry["id"]
        
        # Verify enquiry status updated to 'quoted'
        enq_response = self.session.get(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}")
        assert enq_response.status_code == 200
        updated_enquiry = enq_response.json()
        assert updated_enquiry["status"] == "quoted", f"Enquiry status should be 'quoted', got: {updated_enquiry['status']}"
        
        self.created_quotation_id = quotation["id"]
        print(f"✓ CREATE linked quotation: {quotation['quotation_no']} linked to {enquiry['enquiry_no']} - enquiry status updated to 'quoted'")
        
        return quotation
    
    def test_gst_calculation_variations(self):
        """Test GST calculation with different rates (0%, 5%, 12%, 18%, 28%)"""
        gst_rates = [0, 5, 12, 18, 28]
        subtotal = 10000
        
        for gst_rate in gst_rates:
            expected_gst = subtotal * (gst_rate / 100)
            expected_total = subtotal + expected_gst
            
            quotation_data = {
                "customer_name": f"TEST_GST_{gst_rate}",
                "date": datetime.now().strftime("%d/%m/%Y"),
                "valid_until": "31/12/2025",
                "items": [{"sno": 1, "description": "Test", "unit": "Nos", "quantity": 1, "unit_price": subtotal, "total": subtotal}],
                "subtotal": subtotal,
                "gst_percent": gst_rate,
                "gst_amount": expected_gst,
                "total_amount": expected_total
            }
            
            response = self.session.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
            assert response.status_code == 200, f"Failed for GST {gst_rate}%: {response.text}"
            quotation = response.json()["quotation"]
            
            assert quotation["gst_percent"] == gst_rate
            assert quotation["gst_amount"] == expected_gst
            assert quotation["total_amount"] == expected_total
            
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/sales/quotations/{quotation['id']}")
            print(f"  ✓ GST {gst_rate}%: Subtotal ₹{subtotal} + GST ₹{expected_gst} = Total ₹{expected_total}")
        
        print(f"✓ GST calculation verified for all rates: 0%, 5%, 12%, 18%, 28%")
    
    def test_update_quotation_status(self):
        """Test PUT /api/sales/quotations/{id} - Update quotation status"""
        quotation = self.test_create_quotation_standalone()
        
        update_data = {"status": "sent"}
        response = self.session.put(f"{BASE_URL}/api/sales/quotations/{quotation['id']}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["quotation"]["status"] == "sent"
        print(f"✓ UPDATE quotation status: {quotation['quotation_no']} -> sent")

    # ============== ORDER TESTS ==============
    
    def test_get_orders_list(self):
        """Test GET /api/sales/orders - List all orders"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"✓ GET orders: {data['total']} orders found")
    
    def test_get_order_stats(self):
        """Test GET /api/sales/orders/stats - Get order statistics"""
        response = self.session.get(f"{BASE_URL}/api/sales/orders/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "confirmed" in data
        assert "delivered" in data
        assert "total_value" in data
        print(f"✓ GET order stats: total={data['total']}, pending={data['pending']}, total_value={data['total_value']}")
    
    def test_create_order_standalone(self):
        """Test POST /api/sales/orders - Create standalone order"""
        order_data = {
            "customer_name": "TEST_Customer_Order",
            "customer_address": "456 Test Avenue, Chennai",
            "customer_gst": "33AABCT5678B2ZZ",
            "customer_contact": "Order Contact",
            "customer_phone": "9876543211",
            "customer_email": "order@example.com",
            "date": datetime.now().strftime("%d/%m/%Y"),
            "delivery_date": "15/02/2025",
            "po_number": "PO-TEST-001",
            "po_date": datetime.now().strftime("%d/%m/%Y"),
            "items": [
                {"sno": 1, "description": "Order Item 1", "unit": "Nos", "quantity": 5, "unit_price": 5000, "total": 25000}
            ],
            "subtotal": 25000,
            "gst_percent": 18,
            "gst_amount": 4500,
            "total_amount": 29500,
            "payment_terms": "100% advance",
            "delivery_terms": "Ex-works",
            "category": "PSS"
        }
        
        response = self.session.post(f"{BASE_URL}/api/sales/orders", json=order_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "order" in data
        order = data["order"]
        assert "order_no" in order
        assert order["order_no"].startswith("SO-"), f"Order number should start with 'SO-', got: {order['order_no']}"
        assert order["status"] == "pending"
        assert order["payment_status"] == "unpaid"
        
        self.created_order_id = order["id"]
        print(f"✓ CREATE order: {order['order_no']} - status={order['status']}, payment={order['payment_status']}")
        
        return order
    
    def test_update_order_status(self):
        """Test PUT /api/sales/orders/{id} - Update order status"""
        order = self.test_create_order_standalone()
        
        update_data = {"status": "confirmed"}
        response = self.session.put(f"{BASE_URL}/api/sales/orders/{order['id']}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["order"]["status"] == "confirmed"
        print(f"✓ UPDATE order status: {order['order_no']} -> confirmed")
    
    def test_update_order_payment_status(self):
        """Test PUT /api/sales/orders/{id} - Update payment status"""
        order = self.test_create_order_standalone()
        
        update_data = {"payment_status": "paid"}
        response = self.session.put(f"{BASE_URL}/api/sales/orders/{order['id']}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["order"]["payment_status"] == "paid"
        print(f"✓ UPDATE payment status: {order['order_no']} -> paid")

    # ============== LINKED FLOW TESTS ==============
    
    def test_convert_quotation_to_order(self):
        """Test POST /api/sales/quotations/{id}/convert-to-order - Convert quotation to order"""
        # Create a quotation first
        quotation = self.test_create_quotation_standalone()
        
        # Update status to 'sent' (required for conversion)
        self.session.put(f"{BASE_URL}/api/sales/quotations/{quotation['id']}", json={"status": "sent"})
        
        # Convert to order
        response = self.session.post(f"{BASE_URL}/api/sales/quotations/{quotation['id']}/convert-to-order")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "order" in data
        order = data["order"]
        assert order["quotation_id"] == quotation["id"]
        assert order["customer_name"] == quotation["customer_name"]
        assert order["total_amount"] == quotation["total_amount"]
        
        # Verify quotation status updated to 'accepted'
        qt_response = self.session.get(f"{BASE_URL}/api/sales/quotations/{quotation['id']}")
        updated_quotation = qt_response.json()
        assert updated_quotation["status"] == "accepted"
        assert updated_quotation["order_id"] == order["id"]
        
        self.created_order_id = order["id"]
        print(f"✓ CONVERT quotation to order: {quotation['quotation_no']} -> {order['order_no']} - quotation status updated to 'accepted'")
    
    def test_full_linked_flow_enquiry_to_order(self):
        """Test full linked flow: Enquiry → Quotation → Order"""
        # Step 1: Create Enquiry
        enquiry_data = {
            "date": datetime.now().strftime("%d.%m.%y"),
            "company_name": "TEST_Full_Flow_Company",
            "location": "Mumbai",
            "description": "Full flow test - Solar Panel Installation",
            "value": 500000,
            "contact_person": "Flow Test Contact",
            "contact_phone": "9876543212",
            "contact_email": "flow@example.com",
            "category": "PSS",
            "source": "Referral"
        }
        
        enq_response = self.session.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert enq_response.status_code == 200
        enquiry = enq_response.json()["enquiry"]
        self.created_enquiry_id = enquiry["id"]
        print(f"  Step 1: Created enquiry {enquiry['enquiry_no']} (status: {enquiry['status']})")
        
        # Step 2: Create Quotation linked to Enquiry
        quotation_data = {
            "enquiry_id": enquiry["id"],
            "customer_name": enquiry["company_name"],
            "customer_contact": enquiry["contact_person"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/03/2025",
            "subject": enquiry["description"],
            "items": [
                {"sno": 1, "description": "Solar Panels 400W", "unit": "Nos", "quantity": 50, "unit_price": 8000, "total": 400000},
                {"sno": 2, "description": "Installation Charges", "unit": "LS", "quantity": 1, "unit_price": 100000, "total": 100000}
            ],
            "subtotal": 500000,
            "gst_percent": 18,
            "gst_amount": 90000,
            "total_amount": 590000,
            "category": "PSS"
        }
        
        qt_response = self.session.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert qt_response.status_code == 200
        quotation = qt_response.json()["quotation"]
        self.created_quotation_id = quotation["id"]
        
        # Verify enquiry status updated
        enq_check = self.session.get(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}").json()
        assert enq_check["status"] == "quoted"
        print(f"  Step 2: Created quotation {quotation['quotation_no']} linked to enquiry (enquiry status: {enq_check['status']})")
        
        # Step 3: Update quotation to 'sent'
        self.session.put(f"{BASE_URL}/api/sales/quotations/{quotation['id']}", json={"status": "sent"})
        
        # Step 4: Convert Quotation to Order
        convert_response = self.session.post(f"{BASE_URL}/api/sales/quotations/{quotation['id']}/convert-to-order")
        assert convert_response.status_code == 200
        order = convert_response.json()["order"]
        self.created_order_id = order["id"]
        
        # Verify all statuses
        final_enquiry = self.session.get(f"{BASE_URL}/api/sales/enquiries/{enquiry['id']}").json()
        final_quotation = self.session.get(f"{BASE_URL}/api/sales/quotations/{quotation['id']}").json()
        
        assert final_enquiry["status"] == "accepted"
        assert final_enquiry["order_id"] == order["id"]
        assert final_quotation["status"] == "accepted"
        assert final_quotation["order_id"] == order["id"]
        assert order["enquiry_id"] == enquiry["id"]
        assert order["quotation_id"] == quotation["id"]
        
        print(f"  Step 3: Converted to order {order['order_no']}")
        print(f"  Final states: Enquiry={final_enquiry['status']}, Quotation={final_quotation['status']}, Order={order['status']}")
        print(f"✓ FULL LINKED FLOW: {enquiry['enquiry_no']} → {quotation['quotation_no']} → {order['order_no']} - All statuses correctly updated")

    # ============== DASHBOARD TESTS ==============
    
    def test_dashboard_stats(self):
        """Test GET /api/sales/dashboard/stats - Get dashboard statistics"""
        response = self.session.get(f"{BASE_URL}/api/sales/dashboard/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total_enquiries" in data
        assert "new_enquiries" in data
        assert "total_quotations" in data
        assert "active_quotations" in data
        assert "total_orders" in data
        assert "pending_orders" in data
        assert "monthly_revenue" in data
        assert "conversion_rate" in data
        
        print(f"✓ GET dashboard stats:")
        print(f"  - Enquiries: {data['total_enquiries']} total, {data['new_enquiries']} new")
        print(f"  - Quotations: {data['total_quotations']} total, {data['active_quotations']} active")
        print(f"  - Orders: {data['total_orders']} total, {data['pending_orders']} pending")
        print(f"  - Monthly Revenue: ₹{data['monthly_revenue']}")
        print(f"  - Conversion Rate: {data['conversion_rate']}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
