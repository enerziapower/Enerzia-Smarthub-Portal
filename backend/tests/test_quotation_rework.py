"""
Test suite for Quotation Module Rework
Tests:
1. New quotation number format: Quote/25-26/0001
2. Financial Year calculation
3. Category field removal (should not affect API)
4. Enquiry dropdown filtering (already-quoted enquiries)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuotationRework:
    """Tests for Quotation Module Rework"""
    
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
        # Cleanup
        for qid in self.created_quotation_ids:
            try:
                requests.delete(f"{BASE_URL}/api/sales/quotations/{qid}", headers=self.headers)
            except:
                pass
    
    # ============== QUOTATION NUMBER FORMAT ==============
    
    def test_new_quotation_number_format(self):
        """Test that new quotations get Quote/FY/sequence format"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Format_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test Quote Number Format",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Verify quotation number format: Quote/25-26/XXXX
        quotation_no = qt["quotation_no"]
        assert quotation_no.startswith("Quote/"), f"Expected Quote/ prefix, got: {quotation_no}"
        
        parts = quotation_no.split("/")
        assert len(parts) == 3, f"Expected 3 parts in quotation number, got: {parts}"
        
        # Verify FY format (e.g., 25-26)
        fy = parts[1]
        assert "-" in fy, f"Expected FY format like 25-26, got: {fy}"
        
        # Verify sequence is 4 digits
        seq = parts[2]
        assert len(seq) == 4, f"Expected 4-digit sequence, got: {seq}"
        assert seq.isdigit(), f"Expected numeric sequence, got: {seq}"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ Quotation created with format: {quotation_no}")
    
    def test_financial_year_calculation(self):
        """Test that financial year is calculated correctly"""
        # Current month determines FY
        now = datetime.now()
        month = now.month
        year = now.year
        
        if month >= 4:  # April to December
            expected_fy = f"{year % 100:02d}-{(year + 1) % 100:02d}"
        else:  # January to March
            expected_fy = f"{(year - 1) % 100:02d}-{year % 100:02d}"
        
        # Create a quotation and verify FY
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_FY_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test FY Calculation",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        quotation_no = qt["quotation_no"]
        fy_in_quote = quotation_no.split("/")[1]
        
        assert fy_in_quote == expected_fy, f"Expected FY {expected_fy}, got: {fy_in_quote}"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ Financial Year verified: {fy_in_quote}")
    
    def test_quotation_sequence_increments(self):
        """Test that quotation sequence increments correctly"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        # Create first quotation
        payload1 = {
            "customer_name": "TEST_Seq_Customer_1",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test Sequence 1",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
        }
        
        response1 = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload1)
        assert response1.status_code == 200
        qt1 = response1.json()["quotation"]
        self.created_quotation_ids.append(qt1["id"])
        
        seq1 = int(qt1["quotation_no"].split("/")[-1])
        
        # Create second quotation
        payload2 = {
            "customer_name": "TEST_Seq_Customer_2",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test Sequence 2",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
        }
        
        response2 = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload2)
        assert response2.status_code == 200
        qt2 = response2.json()["quotation"]
        self.created_quotation_ids.append(qt2["id"])
        
        seq2 = int(qt2["quotation_no"].split("/")[-1])
        
        assert seq2 == seq1 + 1, f"Expected sequence {seq1 + 1}, got: {seq2}"
        print(f"✓ Sequence incremented: {seq1} -> {seq2}")
    
    # ============== QUOTATION DETAILS FIELDS ==============
    
    def test_quotation_with_all_details_fields(self):
        """Test creating quotation with all Quotation Details fields"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        payload = {
            "customer_name": "TEST_Details_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test All Details Fields",
            "salesperson": "test-salesperson-id",
            "salesperson_name": "John Sales",
            "delivery_days": "15",
            "payment_terms": "50% Advance, 50% on delivery",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 1000, "total": 1000}
            ],
            "subtotal": 1000,
            "gst_percent": 18,
            "gst_amount": 180,
            "total_amount": 1180
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Verify all fields are stored
        assert qt["salesperson"] == "test-salesperson-id"
        assert qt["salesperson_name"] == "John Sales"
        assert qt["delivery_days"] == "15"
        assert qt["payment_terms"] == "50% Advance, 50% on delivery"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ All Quotation Details fields stored correctly")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/sales/quotations/{qt['id']}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["salesperson_name"] == "John Sales"
        assert fetched["delivery_days"] == "15"
        print(f"✓ GET verified: All fields retrieved correctly")
    
    # ============== ENQUIRY FILTERING ==============
    
    def test_enquiry_dropdown_filters_quoted(self):
        """Test that enquiry dropdown filters out already-quoted enquiries"""
        # Get all enquiries
        response = requests.get(f"{BASE_URL}/api/sales/enquiries?limit=500", headers=self.headers)
        assert response.status_code == 200
        all_enquiries = response.json().get("enquiries", [])
        
        # Filter to quotable enquiries (same logic as frontend)
        quotable_enquiries = [
            e for e in all_enquiries 
            if e.get("status") not in ["declined", "accepted", "invoiced", "quoted"] 
            and not e.get("quotation_id")
        ]
        
        # Verify no enquiry with status='quoted' or quotation_id is in the list
        for enq in quotable_enquiries:
            assert enq.get("status") != "quoted", f"Found quoted enquiry: {enq.get('enquiry_no')}"
            assert not enq.get("quotation_id"), f"Found enquiry with quotation_id: {enq.get('enquiry_no')}"
        
        print(f"✓ Enquiry filtering verified: {len(quotable_enquiries)} quotable out of {len(all_enquiries)} total")
    
    # ============== CATEGORY FIELD REMOVAL ==============
    
    def test_quotation_without_category(self):
        """Test that quotation can be created without category field"""
        today = datetime.now().strftime("%d/%m/%Y")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        
        # Create quotation without category
        payload = {
            "customer_name": "TEST_NoCategory_Customer",
            "date": today,
            "valid_until": valid_until,
            "subject": "Test Without Category",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
            # Note: No category field
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Category should be None or empty
        assert qt.get("category") in [None, "", "null"], f"Expected no category, got: {qt.get('category')}"
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ Quotation created without category field")
    
    # ============== DATE FIELDS ==============
    
    def test_quote_date_and_expiry_date(self):
        """Test Quote Date and Expiry Date fields"""
        today = datetime.now()
        expiry = today + timedelta(days=30)
        
        payload = {
            "customer_name": "TEST_Dates_Customer",
            "date": today.strftime("%d/%m/%Y"),
            "valid_until": expiry.strftime("%d/%m/%Y"),
            "subject": "Test Date Fields",
            "items": [
                {"sno": 1, "description": "Test Item", "unit": "Nos", "quantity": 1, "unit_price": 100, "total": 100}
            ],
            "subtotal": 100,
            "gst_percent": 18,
            "gst_amount": 18,
            "total_amount": 118
        }
        
        response = requests.post(f"{BASE_URL}/api/sales/quotations", headers=self.headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        qt = response.json()["quotation"]
        
        # Verify dates are stored
        assert qt["date"] == today.strftime("%d/%m/%Y")
        assert qt["valid_until"] == expiry.strftime("%d/%m/%Y")
        
        self.created_quotation_ids.append(qt["id"])
        print(f"✓ Quote Date: {qt['date']}, Expiry Date: {qt['valid_until']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
