"""
Test Customer 360 API and customer_id linking across sales pipeline
Tests the flow: Customer → Enquiry → Quotation → Order with customer_id linking
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test customer credentials from main agent
TEST_CUSTOMER_NAME = "Indospace"
TEST_CUSTOMER_ID = "cb8cc3d5-9373-440c-a78c-a1d4539de3df"


class TestCustomer360ByName:
    """Test Customer 360 API by customer name"""
    
    def test_customer_360_by_name_returns_200(self):
        """Test that Customer 360 by name endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer/{TEST_CUSTOMER_NAME}/360")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_customer_360_by_name_returns_customer_data(self):
        """Test that Customer 360 returns customer details"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer/{TEST_CUSTOMER_NAME}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Verify customer data structure
        assert "customer" in data, "Response should contain 'customer' field"
        assert "customer_id" in data, "Response should contain 'customer_id' field"
        assert "metrics" in data, "Response should contain 'metrics' field"
        
        # Verify customer_id is returned
        if data.get("customer"):
            assert data["customer"].get("id") is not None, "Customer should have an ID"
    
    def test_customer_360_by_name_returns_metrics(self):
        """Test that Customer 360 returns proper metrics"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer/{TEST_CUSTOMER_NAME}/360")
        assert response.status_code == 200
        data = response.json()
        
        metrics = data.get("metrics", {})
        # Verify metrics structure
        assert "total_enquiries" in metrics, "Metrics should contain total_enquiries"
        assert "total_quotations" in metrics, "Metrics should contain total_quotations"
        assert "total_orders" in metrics, "Metrics should contain total_orders"
        assert "win_rate" in metrics, "Metrics should contain win_rate"
        assert "quote_to_order_rate" in metrics, "Metrics should contain quote_to_order_rate"
        assert "avg_order_value" in metrics, "Metrics should contain avg_order_value"
    
    def test_customer_360_by_name_returns_recent_data(self):
        """Test that Customer 360 returns recent enquiries, quotations, orders"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer/{TEST_CUSTOMER_NAME}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Verify recent data arrays exist
        assert "recent_enquiries" in data, "Response should contain recent_enquiries"
        assert "recent_quotations" in data, "Response should contain recent_quotations"
        assert "recent_orders" in data, "Response should contain recent_orders"
        assert isinstance(data["recent_enquiries"], list), "recent_enquiries should be a list"
        assert isinstance(data["recent_quotations"], list), "recent_quotations should be a list"
        assert isinstance(data["recent_orders"], list), "recent_orders should be a list"


class TestCustomer360ById:
    """Test Customer 360 API by customer ID"""
    
    def test_customer_360_by_id_returns_200(self):
        """Test that Customer 360 by ID endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_customer_360_by_id_returns_customer_data(self):
        """Test that Customer 360 by ID returns customer details"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Verify customer data structure
        assert "customer" in data, "Response should contain 'customer' field"
        assert "customer_id" in data, "Response should contain 'customer_id' field"
        assert data["customer_id"] == TEST_CUSTOMER_ID, f"customer_id should match {TEST_CUSTOMER_ID}"
    
    def test_customer_360_by_id_returns_summary(self):
        """Test that Customer 360 by ID returns summary metrics"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", {})
        # Verify summary structure
        assert "total_enquiries" in summary, "Summary should contain total_enquiries"
        assert "total_quotations" in summary, "Summary should contain total_quotations"
        assert "total_orders" in summary, "Summary should contain total_orders"
        assert "enquiry_to_quote_rate" in summary, "Summary should contain enquiry_to_quote_rate"
        assert "quote_to_order_rate" in summary, "Summary should contain quote_to_order_rate"
    
    def test_customer_360_by_id_returns_linked_data(self):
        """Test that Customer 360 by ID returns enquiries, quotations, orders arrays"""
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Verify data arrays exist
        assert "enquiries" in data, "Response should contain enquiries"
        assert "quotations" in data, "Response should contain quotations"
        assert "orders" in data, "Response should contain orders"
        assert isinstance(data["enquiries"], list), "enquiries should be a list"
        assert isinstance(data["quotations"], list), "quotations should be a list"
        assert isinstance(data["orders"], list), "orders should be a list"
    
    def test_customer_360_by_invalid_id_returns_404(self):
        """Test that Customer 360 by invalid ID returns 404"""
        invalid_id = "invalid-uuid-12345"
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{invalid_id}/360")
        assert response.status_code == 404, f"Expected 404 for invalid ID, got {response.status_code}"


class TestEnquiryCustomerIdLinking:
    """Test that enquiries properly save customer_id"""
    
    @pytest.fixture
    def test_enquiry_id(self):
        """Create a test enquiry with customer_id and return its ID"""
        enquiry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "company_name": f"TEST_Customer360_{uuid.uuid4().hex[:8]}",
            "customer_id": TEST_CUSTOMER_ID,
            "description": "TEST enquiry for customer_id linking test",
            "value": 10000,
            "status": "new"
        }
        response = requests.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert response.status_code == 200, f"Failed to create enquiry: {response.text}"
        data = response.json()
        enquiry_id = data.get("enquiry", {}).get("id")
        yield enquiry_id
        # Cleanup
        if enquiry_id:
            requests.delete(f"{BASE_URL}/api/sales/enquiries/{enquiry_id}")
    
    def test_create_enquiry_with_customer_id(self, test_enquiry_id):
        """Test that creating an enquiry with customer_id saves it correctly"""
        # Fetch the created enquiry
        response = requests.get(f"{BASE_URL}/api/sales/enquiries/{test_enquiry_id}")
        assert response.status_code == 200, f"Failed to get enquiry: {response.text}"
        enquiry = response.json()
        
        # Verify customer_id is saved
        assert enquiry.get("customer_id") == TEST_CUSTOMER_ID, \
            f"Expected customer_id {TEST_CUSTOMER_ID}, got {enquiry.get('customer_id')}"
    
    def test_enquiry_appears_in_customer_360_by_id(self, test_enquiry_id):
        """Test that enquiry with customer_id appears in Customer 360 by ID"""
        # Fetch Customer 360 by ID
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Check if our test enquiry is in the list
        enquiry_ids = [e.get("id") for e in data.get("enquiries", [])]
        assert test_enquiry_id in enquiry_ids, \
            f"Test enquiry {test_enquiry_id} should appear in Customer 360 enquiries"


class TestQuotationCustomerIdInheritance:
    """Test that quotations inherit customer_id from enquiry"""
    
    @pytest.fixture
    def test_enquiry_and_quotation(self):
        """Create a test enquiry and quotation, return their IDs"""
        # Create enquiry with customer_id
        enquiry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "company_name": f"TEST_QuoteInherit_{uuid.uuid4().hex[:8]}",
            "customer_id": TEST_CUSTOMER_ID,
            "description": "TEST enquiry for quotation inheritance test",
            "value": 15000,
            "status": "new"
        }
        enq_response = requests.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert enq_response.status_code == 200, f"Failed to create enquiry: {enq_response.text}"
        enquiry = enq_response.json().get("enquiry", {})
        enquiry_id = enquiry.get("id")
        
        # Create quotation linked to enquiry
        quotation_data = {
            "enquiry_id": enquiry_id,
            "customer_id": TEST_CUSTOMER_ID,  # Explicitly pass customer_id
            "customer_name": enquiry_data["company_name"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/12/2026",
            "items": [{"id": "1", "sno": 1, "description": "Test item", "unit": "Nos", "quantity": 1, "unit_price": 15000, "total": 15000}],
            "subtotal": 15000,
            "gst_percent": 18,
            "gst_amount": 2700,
            "total_amount": 17700
        }
        quote_response = requests.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert quote_response.status_code == 200, f"Failed to create quotation: {quote_response.text}"
        quotation = quote_response.json().get("quotation", {})
        quotation_id = quotation.get("id")
        
        yield {"enquiry_id": enquiry_id, "quotation_id": quotation_id}
        
        # Cleanup
        if quotation_id:
            requests.delete(f"{BASE_URL}/api/sales/quotations/{quotation_id}")
        if enquiry_id:
            requests.delete(f"{BASE_URL}/api/sales/enquiries/{enquiry_id}")
    
    def test_quotation_has_customer_id(self, test_enquiry_and_quotation):
        """Test that quotation has customer_id field"""
        quotation_id = test_enquiry_and_quotation["quotation_id"]
        response = requests.get(f"{BASE_URL}/api/sales/quotations/{quotation_id}")
        assert response.status_code == 200, f"Failed to get quotation: {response.text}"
        quotation = response.json()
        
        # Verify customer_id is present
        assert quotation.get("customer_id") == TEST_CUSTOMER_ID, \
            f"Expected customer_id {TEST_CUSTOMER_ID}, got {quotation.get('customer_id')}"
    
    def test_quotation_appears_in_customer_360_by_id(self, test_enquiry_and_quotation):
        """Test that quotation with customer_id appears in Customer 360 by ID"""
        quotation_id = test_enquiry_and_quotation["quotation_id"]
        
        # Fetch Customer 360 by ID
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Check if our test quotation is in the list
        quotation_ids = [q.get("id") for q in data.get("quotations", [])]
        assert quotation_id in quotation_ids, \
            f"Test quotation {quotation_id} should appear in Customer 360 quotations"


class TestOrderCustomerIdInheritance:
    """Test that orders inherit customer_id from quotation/enquiry"""
    
    @pytest.fixture
    def test_full_pipeline(self):
        """Create enquiry → quotation → order pipeline with customer_id"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create enquiry with customer_id
        enquiry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "company_name": f"TEST_OrderInherit_{unique_id}",
            "customer_id": TEST_CUSTOMER_ID,
            "description": "TEST enquiry for order inheritance test",
            "value": 20000,
            "status": "new"
        }
        enq_response = requests.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert enq_response.status_code == 200, f"Failed to create enquiry: {enq_response.text}"
        enquiry = enq_response.json().get("enquiry", {})
        enquiry_id = enquiry.get("id")
        
        # Create quotation linked to enquiry with customer_id
        quotation_data = {
            "enquiry_id": enquiry_id,
            "customer_id": TEST_CUSTOMER_ID,
            "customer_name": enquiry_data["company_name"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/12/2026",
            "items": [{"id": "1", "sno": 1, "description": "Test item", "unit": "Nos", "quantity": 1, "unit_price": 20000, "total": 20000}],
            "subtotal": 20000,
            "gst_percent": 18,
            "gst_amount": 3600,
            "total_amount": 23600
        }
        quote_response = requests.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert quote_response.status_code == 200, f"Failed to create quotation: {quote_response.text}"
        quotation = quote_response.json().get("quotation", {})
        quotation_id = quotation.get("id")
        
        # Create order linked to quotation with customer_id
        order_data = {
            "quotation_id": quotation_id,
            "enquiry_id": enquiry_id,
            "customer_id": TEST_CUSTOMER_ID,
            "customer_name": enquiry_data["company_name"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "po_number": f"TEST-PO-{unique_id}",
            "items": quotation_data["items"],
            "subtotal": 20000,
            "gst_percent": 18,
            "gst_amount": 3600,
            "total_amount": 23600
        }
        order_response = requests.post(f"{BASE_URL}/api/sales/orders", json=order_data)
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        order = order_response.json().get("order", {})
        order_id = order.get("id")
        
        yield {
            "enquiry_id": enquiry_id,
            "quotation_id": quotation_id,
            "order_id": order_id
        }
        
        # Cleanup
        if order_id:
            requests.delete(f"{BASE_URL}/api/sales/orders/{order_id}")
        if quotation_id:
            requests.delete(f"{BASE_URL}/api/sales/quotations/{quotation_id}")
        if enquiry_id:
            requests.delete(f"{BASE_URL}/api/sales/enquiries/{enquiry_id}")
    
    def test_order_has_customer_id(self, test_full_pipeline):
        """Test that order has customer_id field"""
        order_id = test_full_pipeline["order_id"]
        response = requests.get(f"{BASE_URL}/api/sales/orders/{order_id}")
        assert response.status_code == 200, f"Failed to get order: {response.text}"
        order = response.json()
        
        # Verify customer_id is present
        assert order.get("customer_id") == TEST_CUSTOMER_ID, \
            f"Expected customer_id {TEST_CUSTOMER_ID}, got {order.get('customer_id')}"
    
    def test_order_appears_in_customer_360_by_id(self, test_full_pipeline):
        """Test that order with customer_id appears in Customer 360 by ID"""
        order_id = test_full_pipeline["order_id"]
        
        # Fetch Customer 360 by ID
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Check if our test order is in the list
        order_ids = [o.get("id") for o in data.get("orders", [])]
        assert order_id in order_ids, \
            f"Test order {order_id} should appear in Customer 360 orders"
    
    def test_full_pipeline_in_customer_360(self, test_full_pipeline):
        """Test that all pipeline items appear in Customer 360 by ID"""
        enquiry_id = test_full_pipeline["enquiry_id"]
        quotation_id = test_full_pipeline["quotation_id"]
        order_id = test_full_pipeline["order_id"]
        
        # Fetch Customer 360 by ID
        response = requests.get(f"{BASE_URL}/api/customer-management/customer-by-id/{TEST_CUSTOMER_ID}/360")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all items are present
        enquiry_ids = [e.get("id") for e in data.get("enquiries", [])]
        quotation_ids = [q.get("id") for q in data.get("quotations", [])]
        order_ids = [o.get("id") for o in data.get("orders", [])]
        
        assert enquiry_id in enquiry_ids, "Enquiry should be in Customer 360"
        assert quotation_id in quotation_ids, "Quotation should be in Customer 360"
        assert order_id in order_ids, "Order should be in Customer 360"
        
        # Verify summary counts increased
        summary = data.get("summary", {})
        assert summary.get("total_enquiries", 0) >= 1, "Should have at least 1 enquiry"
        assert summary.get("total_quotations", 0) >= 1, "Should have at least 1 quotation"
        assert summary.get("total_orders", 0) >= 1, "Should have at least 1 order"


class TestOrderCustomerIdInheritanceFromQuotation:
    """Test that order inherits customer_id from quotation when not explicitly provided"""
    
    @pytest.fixture
    def test_order_inherits_from_quotation(self):
        """Create quotation with customer_id, then order without explicit customer_id"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create enquiry with customer_id
        enquiry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "company_name": f"TEST_InheritQuote_{unique_id}",
            "customer_id": TEST_CUSTOMER_ID,
            "description": "TEST enquiry for inheritance from quotation",
            "value": 25000,
            "status": "new"
        }
        enq_response = requests.post(f"{BASE_URL}/api/sales/enquiries", json=enquiry_data)
        assert enq_response.status_code == 200
        enquiry = enq_response.json().get("enquiry", {})
        enquiry_id = enquiry.get("id")
        
        # Create quotation with customer_id
        quotation_data = {
            "enquiry_id": enquiry_id,
            "customer_id": TEST_CUSTOMER_ID,
            "customer_name": enquiry_data["company_name"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "valid_until": "31/12/2026",
            "items": [{"id": "1", "sno": 1, "description": "Test item", "unit": "Nos", "quantity": 1, "unit_price": 25000, "total": 25000}],
            "subtotal": 25000,
            "gst_percent": 18,
            "gst_amount": 4500,
            "total_amount": 29500
        }
        quote_response = requests.post(f"{BASE_URL}/api/sales/quotations", json=quotation_data)
        assert quote_response.status_code == 200
        quotation = quote_response.json().get("quotation", {})
        quotation_id = quotation.get("id")
        
        # Create order WITHOUT explicit customer_id - should inherit from quotation
        order_data = {
            "quotation_id": quotation_id,
            "enquiry_id": enquiry_id,
            # customer_id NOT provided - should be inherited
            "customer_name": enquiry_data["company_name"],
            "date": datetime.now().strftime("%d/%m/%Y"),
            "po_number": f"TEST-PO-INHERIT-{unique_id}",
            "items": quotation_data["items"],
            "subtotal": 25000,
            "gst_percent": 18,
            "gst_amount": 4500,
            "total_amount": 29500
        }
        order_response = requests.post(f"{BASE_URL}/api/sales/orders", json=order_data)
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        order = order_response.json().get("order", {})
        order_id = order.get("id")
        
        yield {
            "enquiry_id": enquiry_id,
            "quotation_id": quotation_id,
            "order_id": order_id
        }
        
        # Cleanup
        if order_id:
            requests.delete(f"{BASE_URL}/api/sales/orders/{order_id}")
        if quotation_id:
            requests.delete(f"{BASE_URL}/api/sales/quotations/{quotation_id}")
        if enquiry_id:
            requests.delete(f"{BASE_URL}/api/sales/enquiries/{enquiry_id}")
    
    def test_order_inherits_customer_id_from_quotation(self, test_order_inherits_from_quotation):
        """Test that order inherits customer_id from quotation"""
        order_id = test_order_inherits_from_quotation["order_id"]
        response = requests.get(f"{BASE_URL}/api/sales/orders/{order_id}")
        assert response.status_code == 200
        order = response.json()
        
        # Verify customer_id was inherited from quotation
        assert order.get("customer_id") == TEST_CUSTOMER_ID, \
            f"Order should inherit customer_id {TEST_CUSTOMER_ID} from quotation, got {order.get('customer_id')}"


class TestCustomerManagementOverview:
    """Test Customer Management overview endpoint"""
    
    def test_overview_returns_200(self):
        """Test that overview endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_overview_returns_summary(self):
        """Test that overview returns summary data"""
        response = requests.get(f"{BASE_URL}/api/customer-management/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Response should contain summary"
        summary = data["summary"]
        assert "total_customers" in summary
        assert "active_customers" in summary
        assert "pipeline_value" in summary
        assert "total_revenue" in summary
        assert "conversion_rate" in summary
    
    def test_overview_returns_enquiry_stats(self):
        """Test that overview returns enquiry statistics"""
        response = requests.get(f"{BASE_URL}/api/customer-management/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "enquiry_stats" in data, "Response should contain enquiry_stats"
        stats = data["enquiry_stats"]
        assert "total" in stats
        assert "new" in stats
        assert "quoted" in stats
        assert "won" in stats
        assert "lost" in stats


class TestEnquiryAnalysis:
    """Test Enquiry Analysis endpoint"""
    
    def test_enquiry_analysis_returns_200(self):
        """Test that enquiry analysis endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_enquiry_analysis_returns_distributions(self):
        """Test that enquiry analysis returns distribution data"""
        response = requests.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert "status_distribution" in data
        assert "category_distribution" in data
        assert "conversion_funnel" in data


class TestQuoteAnalysis:
    """Test Quote Analysis endpoint"""
    
    def test_quote_analysis_returns_200(self):
        """Test that quote analysis endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_quote_analysis_returns_summary(self):
        """Test that quote analysis returns summary data"""
        response = requests.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_quotes" in summary
        assert "win_rate" in summary


class TestOrderAnalysis:
    """Test Order Analysis endpoint"""
    
    def test_order_analysis_returns_200(self):
        """Test that order analysis endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/customer-management/order-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_order_analysis_returns_summary(self):
        """Test that order analysis returns summary data"""
        response = requests.get(f"{BASE_URL}/api/customer-management/order-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_orders" in summary
        assert "total_value" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
