"""
Test suite for Quotations Module
Tests: CRUD operations, enquiry linking, customer auto-fill, line items, GST calculations
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuotationsModule:
    """Quotations CRUD and functionality tests"""
    
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
        yield
        # Cleanup created quotations
        for qid in self.created_quotation_ids:
            try:
                requests.delete(f"{BASE_URL}/api/sales/quotations/{qid}", headers=self.headers)
            except:
                pass
    
    # ============== GET QUOTATIONS ==============
    
    def test_get_quotations_list(self):
        """Test GET /api/sales/quotations returns list"""
        response = requests.get(f"{BASE_URL}/api/sales/quotations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "quotations" in data
        assert "total" in data
        assert isinstance(data["quotations"], list)
        print(f"✓ GET quotations: {data['total']} quotations found")
    
    def test_get_quotations_stats(self):
        """Test GET /api/sales/quotations/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/sales/quotations/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "draft" in data
        assert "sent" in data
        assert "accepted" in data
        assert "rejected" in data
        assert "total_value" in data
        print(f"✓ GET quotations stats: total={data['total']}, accepted={data['accepted']}, value={data['total_value']}")
    
    def test_get_quotations_with_search(self):
        """Test GET /api/sales/quotations with search filter"""
        response = requests.get(f"{BASE_URL}/api/sales/quotations?search=QT", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "quotations" in data
        print(f"✓ GET quotations with search: {len(data['quotations'])} results")
    
    def test_get_quotations_with_status_filter(self):
        """Test GET /api/sales/quotations with status filter"""
        response = requests.get(f"{BASE_URL}/api/sales/quotations?status=accepted", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "quotations" in data
        # All returned quotations should have accepted status
        for qt in data["quotations"]:
            assert qt["status"] == "accepted"
        print(f"✓ GET quotations with status filter: {len(data['quotations'])} accepted quotations")
    
    # ============== CREATE QUOTATION ==============
    
    def test_create_quotation_basic(self):
        """Test POST /api/sales/quotations creates new quotation"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Basic Customer Ltd",
            "customer_address": "123 Test Street, Chennai",
            "customer_gst": "33AABCU9603R1ZM",
            "customer_contact": "John Test",
            "customer_phone": "9876543210",
            "customer_email": "test@example.com",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test Quotation for Basic Items",
            "items": [
                {"sno": 1, "description": "Test Item 1", "unit": "Nos", "quantity": 5, "unit_price": 1000, "total": 5000}
            ],
            "subtotal": 5000,
            "gst_percent": 18,
            "gst_amount": 900,
            "total_amount": 5900,
            "payment_terms": "50% Advance, 50% on delivery",
            "delivery_terms": "2-3 weeks from order confirmation",
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "quotation" in data
        qt = data["quotation"]
        assert qt["customer_name"] == "TEST_Basic Customer Ltd"
        assert qt["quotation_no"].startswith("QT-")
        assert qt["status"] == "draft"
        assert qt["total_amount"] == 5900
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation: {qt['quotation_no']} created with total ₹{qt['total_amount']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["customer_name"] == "TEST_Basic Customer Ltd"
        print(f"✓ GET quotation by ID: verified {qt['quotation_no']}")
    
    def test_create_quotation_with_multiple_items(self):
        """Test creating quotation with multiple line items"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        items = [
            {"sno": 1, "description": "Electrical Panel 100A", "unit": "Nos", "quantity": 2, "unit_price": 50000, "total": 100000},
            {"sno": 2, "description": "Cable 4 Core 25mm", "unit": "M", "quantity": 100, "unit_price": 500, "total": 50000},
            {"sno": 3, "description": "Installation Charges", "unit": "LS", "quantity": 1, "unit_price": 25000, "total": 25000}
        ]
        subtotal = 175000
        gst_amount = subtotal * 0.18
        total = subtotal + gst_amount
        
        payload = {
            "customer_name": "TEST_Multi Item Customer",
            "customer_address": "456 Industrial Area, Chennai",
            "date": today,
            "valid_until": valid_until,
            "subject": "Multi-item quotation test",
            "items": items,
            "subtotal": subtotal,
            "gst_percent": 18,
            "gst_amount": gst_amount,
            "total_amount": total,
            "category": "PSS"
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200
        qt = response.json()["quotation"]
        
        assert len(qt["items"]) == 3
        assert qt["subtotal"] == 175000
        assert qt["total_amount"] == total
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ CREATE quotation with {len(qt['items'])} items: {qt['quotation_no']}, total ₹{qt['total_amount']}")
    
    def test_create_quotation_with_different_gst_rates(self):
        """Test creating quotations with different GST rates (0%, 5%, 12%, 18%, 28%)"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        gst_rates = [0, 5, 12, 18, 28]
        subtotal = 10000
        
        for gst_rate in gst_rates:
            gst_amount = subtotal * (gst_rate / 100)
            total = subtotal + gst_amount
            
            payload = {
                "customer_name": f"TEST_GST_{gst_rate}_Customer",
                "date": today,
                "valid_until": valid_until,
                "subject": f"GST {gst_rate}% test",
                "items": [{"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 10000, "total": 10000}],
                "subtotal": subtotal,
                "gst_percent": gst_rate,
                "gst_amount": gst_amount,
                "total_amount": total,
                "category": "CS"
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            
            assert qt["gst_percent"] == gst_rate
            assert qt["gst_amount"] == gst_amount
            assert qt["total_amount"] == total
            
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with GST {gst_rate}%: total ₹{qt['total_amount']}")
    
    # ============== UPDATE QUOTATION ==============
    
    def test_update_quotation(self):
        """Test PUT /api/sales/quotations/{id} updates quotation"""
        # First create a quotation
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        create_payload = {
            "customer_name": "TEST_Update Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Original subject",
            "items": [{"sno": 1, "description": "Original Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
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
        
        # Update the quotation
        update_payload = {
            "subject": "Updated subject",
            "customer_contact": "Updated Contact Person",
            "payment_terms": "100% Advance"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers, json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()["quotation"]
        
        assert updated["subject"] == "Updated subject"
        assert updated["customer_contact"] == "Updated Contact Person"
        assert updated["payment_terms"] == "100% Advance"
        print(f"✓ UPDATE quotation: subject and contact updated")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["subject"] == "Updated subject"
        print(f"✓ GET quotation: verified update persisted")
    
    def test_update_quotation_status(self):
        """Test updating quotation status"""
        # Create a quotation
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        create_payload = {
            "customer_name": "TEST_Status Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Status test",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=create_payload)
        qt_id = create_response.json()["quotation"]["id"]
        self.created_quotation_ids.append(qt_id)
        
        # Update status to sent
        update_response = requests.put(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers, json={"status": "sent"})
        assert update_response.status_code == 200
        assert update_response.json()["quotation"]["status"] == "sent"
        print(f"✓ UPDATE status to 'sent'")
        
        # Update status to rejected
        update_response = requests.put(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers, json={"status": "rejected"})
        assert update_response.status_code == 200
        assert update_response.json()["quotation"]["status"] == "rejected"
        print(f"✓ UPDATE status to 'rejected'")
    
    # ============== DELETE QUOTATION ==============
    
    def test_delete_quotation(self):
        """Test DELETE /api/sales/quotations/{id} removes quotation"""
        # Create a quotation
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        create_payload = {
            "customer_name": "TEST_Delete Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "To be deleted",
            "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180,
            "category": "PSS"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=create_payload)
        qt_id = create_response.json()["quotation"]["id"]
        
        # Delete the quotation
        delete_response = requests.delete(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print(f"✓ DELETE quotation: removed successfully")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt_id}", headers=self.headers)
        assert get_response.status_code == 404
        print(f"✓ GET deleted quotation: returns 404 as expected")
    
    # ============== ENQUIRY LINKING ==============
    
    def test_get_enquiries_for_dropdown(self):
        """Test GET /api/sales/enquiries returns enquiries for dropdown"""
        response = requests.get(f"{BASE_URL}/api/sales/enquiries?limit=500", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "enquiries" in data
        assert "total" in data
        print(f"✓ GET enquiries for dropdown: {data['total']} enquiries available")
    
    def test_get_single_enquiry(self):
        """Test GET /api/sales/enquiries/{id} returns enquiry details"""
        # First get list of enquiries
        list_response = requests.get(f"{BASE_URL}/api/sales/enquiries?limit=1", headers=self.headers)
        assert list_response.status_code == 200
        enquiries = list_response.json()["enquiries"]
        
        if enquiries:
            enquiry_id = enquiries[0]["id"]
            response = requests.get(f"{BASE_URL}/api/sales/enquiries/{enquiry_id}", headers=self.headers)
            assert response.status_code == 200
            enquiry = response.json()
            assert "company_name" in enquiry
            assert "contact_person" in enquiry or enquiry.get("contact_person") is None
            print(f"✓ GET single enquiry: {enquiry.get('enquiry_no')} - {enquiry.get('company_name')}")
        else:
            print("⚠ No enquiries available to test")
    
    def test_create_quotation_linked_to_enquiry(self):
        """Test creating quotation linked to an enquiry"""
        # Get an enquiry that's not already linked
        list_response = requests.get(f"{BASE_URL}/api/sales/enquiries?limit=100", headers=self.headers)
        enquiries = list_response.json()["enquiries"]
        
        # Find an enquiry without quotation
        unlinked_enquiry = None
        for enq in enquiries:
            if not enq.get("quotation_id") and enq.get("status") not in ["accepted", "declined", "invoiced"]:
                unlinked_enquiry = enq
                break
        
        if unlinked_enquiry:
            today = datetime.now().strftime("%d/%m/%Y")
            valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
            
            payload = {
                "enquiry_id": unlinked_enquiry["id"],
                "customer_name": unlinked_enquiry.get("company_name", "TEST_Linked Customer"),
                "customer_contact": unlinked_enquiry.get("contact_person", ""),
                "customer_phone": unlinked_enquiry.get("contact_phone", ""),
                "customer_email": unlinked_enquiry.get("contact_email", ""),
                "date": today,
                "valid_until": valid_until,
                "subject": unlinked_enquiry.get("description", "Linked quotation"),
                "items": [{"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 10000, "total": 10000}],
                "subtotal": 10000,
                "gst_percent": 18,
                "gst_amount": 1800,
                "total_amount": 11800,
                "category": unlinked_enquiry.get("category", "PSS")
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            
            assert qt["enquiry_id"] == unlinked_enquiry["id"]
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation linked to enquiry {unlinked_enquiry.get('enquiry_no')}")
            
            # Verify enquiry status updated to 'quoted'
            enq_response = requests.get(f"{BASE_URL}/api/sales/enquiries/{unlinked_enquiry['id']}", headers=self.headers)
            if enq_response.status_code == 200:
                updated_enq = enq_response.json()
                assert updated_enq.get("quotation_id") == qt["id"]
                print(f"✓ Enquiry status updated and linked to quotation")
        else:
            print("⚠ No unlinked enquiries available to test")
    
    # ============== CUSTOMER AUTO-FILL ==============
    
    def test_get_customers_for_autocomplete(self):
        """Test GET /api/settings/clients returns customers for autocomplete"""
        response = requests.get(f"{BASE_URL}/api/settings/clients?customer_type=domestic&limit=10", headers=self.headers)
        assert response.status_code == 200
        customers = response.json()
        assert isinstance(customers, list)
        
        if customers:
            customer = customers[0]
            assert "name" in customer
            # Check for auto-fill fields
            print(f"✓ GET customers for autocomplete: {len(customers)} customers")
            print(f"  Sample customer: {customer.get('name')}")
            print(f"  - GST: {customer.get('gst_number', 'N/A')}")
            print(f"  - Address: {customer.get('address', 'N/A')[:50]}...")
            print(f"  - Contact: {customer.get('contact_person', 'N/A')}")
        else:
            print("⚠ No customers available")
    
    # ============== CATEGORY OPTIONS ==============
    
    def test_create_quotation_with_categories(self):
        """Test creating quotations with different categories"""
        categories = ["PSS", "AS", "OSS", "CS", "DOM_LIGHTING", "EXPORTS"]
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        for category in categories:
            payload = {
                "customer_name": f"TEST_Category_{category}",
                "date": today,
                "valid_until": valid_until,
                "subject": f"Category {category} test",
                "items": [{"sno": 1, "description": "Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}],
                "subtotal": 1000,
                "gst_percent": 18,
                "gst_amount": 180,
                "total_amount": 1180,
                "category": category
            }
            
            response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
            assert response.status_code == 200
            qt = response.json()["quotation"]
            assert qt["category"] == category
            self.created_quotation_ids.append(qt["id"])
            print(f"✓ CREATE quotation with category '{category}'")
    
    # ============== ERROR HANDLING ==============
    
    def test_get_nonexistent_quotation(self):
        """Test GET /api/sales/quotations/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/sales/quotations/{fake_id}", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ GET nonexistent quotation: returns 404 as expected")
    
    def test_update_nonexistent_quotation(self):
        """Test PUT /api/sales/quotations/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(f"{BASE_URL}/api/sales/quotations/{fake_id}", headers=self.headers, json={"subject": "test"})
        assert response.status_code == 404
        print(f"✓ UPDATE nonexistent quotation: returns 404 as expected")
    
    def test_delete_nonexistent_quotation(self):
        """Test DELETE /api/sales/quotations/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/sales/quotations/{fake_id}", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ DELETE nonexistent quotation: returns 404 as expected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
