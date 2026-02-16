"""
Test suite for Quotation Module - Zoho-like Fields
Tests: HSN/SAC in line items, Transport Mode, Incoterms, GST Treatment, 
       Place of Supply, Shipping Address, Salesperson, Reference No, 
       Kind Attention, Delivery Days
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuotationZohoFields:
    """Tests for new Zoho-like fields in Quotation module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.created_quotation_ids = []
        self.created_order_ids = []
        yield
        # Cleanup
        for oid in self.created_order_ids:
            try:
                requests.delete(f"{BASE_URL}/api/sales/orders/{oid}", headers=self.headers)
            except:
                pass
        for qid in self.created_quotation_ids:
            try:
                requests.delete(f"{BASE_URL}/api/sales/quotations/{qid}", headers=self.headers)
            except:
                pass
    
    # ============== HSN/SAC IN LINE ITEMS ==============
    
    def test_create_quotation_with_hsn_sac(self):
        """Test creating quotation with HSN/SAC codes in line items"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_HSN_SAC_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "HSN/SAC Test Quotation",
            "items": [
                {"sno": 1, "description": "Electrical Panel", "hsn_sac": "8537", "unit": "Nos", "quantity": 2, "unit_price": 50000, "total": 100000},
                {"sno": 2, "description": "Cable 4 Core", "hsn_sac": "8544", "unit": "M", "quantity": 100, "unit_price": 500, "total": 50000},
                {"sno": 3, "description": "Installation Service", "hsn_sac": "998719", "unit": "LS", "quantity": 1, "unit_price": 25000, "total": 25000}
            ],
            "subtotal": 175000,
            "gst_percent": 18,
            "gst_amount": 31500,
            "total_amount": 206500,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Verify HSN/SAC codes are stored
        assert len(qt["items"]) == 3
        assert qt["items"][0]["hsn_sac"] == "8537"
        assert qt["items"][1]["hsn_sac"] == "8544"
        assert qt["items"][2]["hsn_sac"] == "998719"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with HSN/SAC: {qt['quotation_no']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["items"][0]["hsn_sac"] == "8537"
        print(f"✓ GET quotation: HSN/SAC codes verified")
    
    # ============== TRANSPORT MODE & INCOTERMS ==============
    
    def test_create_quotation_with_transport_mode(self):
        """Test creating quotation with Transport Mode"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        transport_modes = ["Road", "Rail", "Air", "Sea", "Courier", "Hand Delivery"]
        
        for mode in transport_modes:
            payload = {
                "customer_name": f"TEST_Transport_{mode}_Customer",
                "date": today,
                "valid_until": valid_until,
                "subject": f"Transport Mode {mode} Test",
                "transport_mode": mode,
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": "PSS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["transport_mode"] == mode
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with transport_mode='{mode}'")
    
    def test_create_quotation_with_incoterms(self):
        """Test creating quotation with Incoterms"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        incoterms = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"]
        
        for term in incoterms:
            payload = {
                "customer_name": f"TEST_Incoterm_{term}_Customer",
                "date": today,
                "valid_until": valid_until,
                "subject": f"Incoterm {term} Test",
                "incoterms": term,
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": "EXPORTS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["incoterms"] == term
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with incoterms='{term}'")
    
    # ============== GST TREATMENT & PLACE OF SUPPLY ==============
    
    def test_create_quotation_with_gst_treatment(self):
        """Test creating quotation with different GST treatments"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        gst_treatments = [
            "registered_regular",
            "registered_composition",
            "unregistered",
            "consumer",
            "overseas",
            "sez"
        ]
        
        for treatment in gst_treatments:
            payload = {
                "customer_name": f"TEST_GST_{treatment}_Customer",
                "date": today,
                "valid_until": valid_until,
                "subject": f"GST Treatment {treatment} Test",
                "gst_treatment": treatment,
                "customer_gst": "33AABCU9603R1ZM" if "registered" in treatment else "",
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": "PSS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["gst_treatment"] == treatment
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with gst_treatment='{treatment}'")
    
    def test_create_quotation_with_place_of_supply(self):
        """Test creating quotation with Place of Supply (Indian states)"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        states = ["Tamil Nadu", "Karnataka", "Maharashtra", "Delhi", "Gujarat"]
        
        for state in states:
            payload = {
                "customer_name": f"TEST_State_{state.replace(' ', '_')}_Customer",
                "date": today,
                "valid_until": valid_until,
                "subject": f"Place of Supply {state} Test",
                "place_of_supply": state,
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": "PSS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["place_of_supply"] == state
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with place_of_supply='{state}'")
    
    # ============== SHIPPING ADDRESS ==============
    
    def test_create_quotation_with_shipping_address(self):
        """Test creating quotation with separate billing and shipping addresses"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Shipping_Address_Customer",
            "customer_address": "123 Billing Street, Chennai, Tamil Nadu 600001",
            "shipping_address": "456 Shipping Lane, Coimbatore, Tamil Nadu 641001",
            "date": today,
            "valid_until": valid_until,
            "subject": "Shipping Address Test",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200
        qt = response.json()["quotation"]
        
        assert qt["customer_address"] == "123 Billing Street, Chennai, Tamil Nadu 600001"
        assert qt["shipping_address"] == "456 Shipping Lane, Coimbatore, Tamil Nadu 641001"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with separate billing/shipping addresses")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers)
        fetched = get_response.json()
        assert fetched["shipping_address"] == "456 Shipping Lane, Coimbatore, Tamil Nadu 641001"
        print(f"✓ GET quotation: shipping address verified")
    
    # ============== SALESPERSON ==============
    
    def test_create_quotation_with_salesperson(self):
        """Test creating quotation with salesperson details"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Salesperson_Customer",
            "salesperson": "sales-person-id-123",
            "salesperson_name": "Arun Kumar",
            "date": today,
            "valid_until": valid_until,
            "subject": "Salesperson Test",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200
        qt = response.json()["quotation"]
        
        assert qt["salesperson"] == "sales-person-id-123"
        assert qt["salesperson_name"] == "Arun Kumar"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with salesperson: {qt['salesperson_name']}")
    
    # ============== REFERENCE NO ==============
    
    def test_create_quotation_with_reference_no(self):
        """Test creating quotation with customer reference number"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Reference_Customer",
            "reference_no": "CUST-REF-2026-001",
            "date": today,
            "valid_until": valid_until,
            "subject": "Reference No Test",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200
        qt = response.json()["quotation"]
        
        assert qt["reference_no"] == "CUST-REF-2026-001"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with reference_no: {qt['reference_no']}")
    
    # ============== KIND ATTENTION ==============
    
    def test_create_quotation_with_kind_attention(self):
        """Test creating quotation with Kind Attention field"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Kind_Attention_Customer",
            "kind_attention": "Mr. Rajesh Kumar - Purchase Manager",
            "date": today,
            "valid_until": valid_until,
            "subject": "Kind Attention Test",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200
        qt = response.json()["quotation"]
        
        assert qt["kind_attention"] == "Mr. Rajesh Kumar - Purchase Manager"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with kind_attention: {qt['kind_attention']}")
    
    # ============== DELIVERY DAYS ==============
    
    def test_create_quotation_with_delivery_days(self):
        """Test creating quotation with Delivery Days field"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        delivery_options = ["7 days", "15-20 working days", "30 days", "45-60 days", "Immediate"]
        
        for delivery in delivery_options:
            payload = {
                "customer_name": f"TEST_Delivery_{delivery.replace(' ', '_')}_Customer",
                "delivery_days": delivery,
                "date": today,
                "valid_until": valid_until,
                "subject": f"Delivery Days {delivery} Test",
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": "PSS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["delivery_days"] == delivery
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with delivery_days='{delivery}'")
    
    # ============== ALL FIELDS COMBINED ==============
    
    def test_create_quotation_with_all_zoho_fields(self):
        """Test creating quotation with ALL new Zoho-like fields"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_All_Zoho_Fields_Customer",
            "customer_address": "123 Billing Street, Chennai, Tamil Nadu 600001",
            "shipping_address": "456 Shipping Lane, Coimbatore, Tamil Nadu 641001",
            "customer_gst": "33AABCU9603R1ZM",
            "gst_treatment": "registered_regular",
            "place_of_supply": "Tamil Nadu",
            "customer_contact": "Rajesh Kumar",
            "customer_phone": "9876543210",
            "customer_email": "rajesh@testcompany.com",
            "salesperson": "sales-person-id-123",
            "salesperson_name": "Arun Sales",
            "reference_no": "REF-2026-FULL-001",
            "date": today,
            "valid_until": valid_until,
            "subject": "Complete Zoho Fields Test Quotation",
            "delivery_days": "15-20 working days",
            "kind_attention": "Mr. Rajesh Kumar - Purchase Manager",
            "transport_mode": "Road",
            "incoterms": "FOB",
            "items": [
                {"sno": 1, "description": "Electrical Panel 100A", "hsn_sac": "8537", "unit": "Nos", "quantity": 2, "unit_price": 50000, "total": 100000},
                {"sno": 2, "description": "Cable 4 Core 25mm", "hsn_sac": "8544", "unit": "M", "quantity": 100, "unit_price": 500, "total": 50000},
                {"sno": 3, "description": "Installation Service", "hsn_sac": "998719", "unit": "LS", "quantity": 1, "unit_price": 25000, "total": 25000}
            ],
            "subtotal": 175000,
            "gst_percent": 18,
            "gst_amount": 31500,
            "total_amount": 206500,
            "payment_terms": "50% Advance, 50% on delivery",
            "delivery_terms": "2-3 weeks from order confirmation",
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Verify ALL new fields
        assert qt["shipping_address"] == "456 Shipping Lane, Coimbatore, Tamil Nadu 641001"
        assert qt["gst_treatment"] == "registered_regular"
        assert qt["place_of_supply"] == "Tamil Nadu"
        assert qt["salesperson"] == "sales-person-id-123"
        assert qt["salesperson_name"] == "Arun Sales"
        assert qt["reference_no"] == "REF-2026-FULL-001"
        assert qt["delivery_days"] == "15-20 working days"
        assert qt["kind_attention"] == "Mr. Rajesh Kumar - Purchase Manager"
        assert qt["transport_mode"] == "Road"
        assert qt["incoterms"] == "FOB"
        assert qt["items"][0]["hsn_sac"] == "8537"
        assert qt["items"][1]["hsn_sac"] == "8544"
        assert qt["items"][2]["hsn_sac"] == "998719"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with ALL Zoho fields: {qt['quotation_no']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        
        # Verify all fields persisted
        assert fetched["shipping_address"] == "456 Shipping Lane, Coimbatore, Tamil Nadu 641001"
        assert fetched["gst_treatment"] == "registered_regular"
        assert fetched["place_of_supply"] == "Tamil Nadu"
        assert fetched["transport_mode"] == "Road"
        assert fetched["incoterms"] == "FOB"
        print(f"✓ GET quotation: ALL Zoho fields verified")
    
    # ============== UPDATE ZOHO FIELDS ==============
    
    def test_update_quotation_zoho_fields(self):
        """Test updating quotation with new Zoho-like fields"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        # Create quotation
        create_payload = {
            "customer_name": "TEST_Update_Zoho_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Update Zoho Fields Test",
            "transport_mode": "Road",
            "incoterms": "FOB",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=create_payload)
        assert create_response.status_code == 200
        qt_id = create_response.json()["quotation"]["id"]
        self.created_quotation_ids.append(qt_id)
        
        # Update Zoho fields
        update_payload = {
            "transport_mode": "Air",
            "incoterms": "CIF",
            "delivery_days": "10-15 working days",
            "kind_attention": "Mr. Updated Contact",
            "shipping_address": "789 New Shipping Address, Mumbai",
            "gst_treatment": "sez",
            "place_of_supply": "Maharashtra"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers, json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()["quotation"]
        
        assert updated["transport_mode"] == "Air"
        assert updated["incoterms"] == "CIF"
        assert updated["delivery_days"] == "10-15 working days"
        assert updated["kind_attention"] == "Mr. Updated Contact"
        assert updated["shipping_address"] == "789 New Shipping Address, Mumbai"
        assert updated["gst_treatment"] == "sez"
        assert updated["place_of_supply"] == "Maharashtra"
        
        print(f"✓ UPDATE quotation Zoho fields: all fields updated successfully")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers)
        fetched = get_response.json()
        assert fetched["transport_mode"] == "Air"
        assert fetched["incoterms"] == "CIF"
        print(f"✓ GET quotation: updated Zoho fields verified")
    
    # ============== CONVERT TO ORDER ==============
    
    def test_convert_quotation_to_order(self):
        """Test converting quotation with Zoho fields to order"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        # Create quotation with all fields
        create_payload = {
            "customer_name": "TEST_Convert_Order_Customer",
            "customer_address": "123 Billing Street, Chennai",
            "shipping_address": "456 Shipping Lane, Coimbatore",
            "customer_gst": "33AABCU9603R1ZM",
            "gst_treatment": "registered_regular",
            "place_of_supply": "Tamil Nadu",
            "date": today,
            "valid_until": valid_until,
            "subject": "Convert to Order Test",
            "transport_mode": "Road",
            "incoterms": "FOB",
            "items": [
                {"sno": 1, "description": "Panel", "hsn_sac": "8537", "unit": "Nos", "quantity": 1, "unit_price": 50000, "total": 50000}
            ],
            "subtotal": 50000,
            "gst_percent": 18,
            "gst_amount": 9000,
            "total_amount": 59000,
            "payment_terms": "50% Advance",
            "category": "PSS"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=create_payload)
        assert create_response.status_code == 200
        qt = create_response.json()["quotation"]
        self.created_quotation_ids.append(qt["id"])
        
        # Update status to sent
        requests.put(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers, json={"status": "sent"})
        
        # Create order from quotation
        order_payload = {
            "quotation_id": qt["id"],
            "customer_name": qt["customer_name"],
            "customer_address": qt["customer_address"],
            "customer_gst": qt["customer_gst"],
            "customer_contact": "Test Contact",
            "customer_phone": "9876543210",
            "customer_email": "test@example.com",
            "date": "2026-02-16",
            "delivery_date": "2026-03-15",
            "po_number": f"PO-TEST-{uuid.uuid4().hex[:8].upper()}",
            "po_date": "2026-02-16",
            "acceptance_type": "written_po",
            "acceptance_remarks": "Customer accepted",
            "items": qt["items"],
            "subtotal": qt["subtotal"],
            "gst_percent": qt["gst_percent"],
            "gst_amount": qt["gst_amount"],
            "total_amount": qt["total_amount"],
            "payment_terms": qt["payment_terms"],
            "category": qt["category"]
        }
        
        order_response = requests.post(f"{BASE_URL}/api/sales/orders", headers=self.headers, json=order_payload)
        assert order_response.status_code == 200, f"Order creation failed: {order_response.text}"
        order = order_response.json()["order"]
        
        assert order["quotation_id"] == qt["id"]
        assert order["customer_name"] == qt["customer_name"]
        assert order["items"][0]["hsn_sac"] == "8537"
        
        self.created_order_ids.append(order["id"])
        print(f"✓ CONVERT quotation to order: {order['order_no']}")
        print(f"  - HSN/SAC preserved in order items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
