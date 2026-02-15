"""
Customer Management Module - Backend API Tests
Tests all 8 endpoints for the Customer Management module:
1. GET /api/customer-management/overview
2. GET /api/customer-management/enquiry-analysis
3. GET /api/customer-management/quote-analysis
4. GET /api/customer-management/order-analysis
5. GET /api/customer-management/projections
6. GET /api/customer-management/customer-targeting
7. GET /api/customer-management/customers
8. GET /api/customer-management/customer/{customer_name}/360
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@enerzia.com", "password": "admin123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestOverviewEndpoint:
    """Tests for GET /api/customer-management/overview"""
    
    def test_overview_returns_200(self, api_client):
        """Test overview endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/overview")
        assert response.status_code == 200
    
    def test_overview_has_summary(self, api_client):
        """Test overview contains summary with required fields"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/overview")
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_customers" in summary
        assert "active_customers" in summary
        assert "pipeline_value" in summary
        assert "total_revenue" in summary
        assert "conversion_rate" in summary
    
    def test_overview_has_enquiry_stats(self, api_client):
        """Test overview contains enquiry stats"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/overview")
        data = response.json()
        
        assert "enquiry_stats" in data
        stats = data["enquiry_stats"]
        assert "total" in stats
        assert "new" in stats
        assert "quoted" in stats
        assert "won" in stats
        assert "lost" in stats
    
    def test_overview_has_top_customers(self, api_client):
        """Test overview contains top customers list"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/overview")
        data = response.json()
        
        assert "top_customers" in data
        assert isinstance(data["top_customers"], list)


class TestEnquiryAnalysisEndpoint:
    """Tests for GET /api/customer-management/enquiry-analysis"""
    
    def test_enquiry_analysis_returns_200(self, api_client):
        """Test enquiry analysis endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        assert response.status_code == 200
    
    def test_enquiry_analysis_has_status_distribution(self, api_client):
        """Test enquiry analysis contains status distribution"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        data = response.json()
        
        assert "status_distribution" in data
        assert isinstance(data["status_distribution"], list)
    
    def test_enquiry_analysis_has_category_distribution(self, api_client):
        """Test enquiry analysis contains category distribution"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        data = response.json()
        
        assert "category_distribution" in data
        assert isinstance(data["category_distribution"], list)
    
    def test_enquiry_analysis_has_conversion_funnel(self, api_client):
        """Test enquiry analysis contains conversion funnel"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        data = response.json()
        
        assert "conversion_funnel" in data
        funnel = data["conversion_funnel"]
        assert "total_enquiries" in funnel
        assert "quoted" in funnel
        assert "won" in funnel
        assert "quote_rate" in funnel
        assert "win_rate" in funnel
    
    def test_enquiry_analysis_has_top_companies(self, api_client):
        """Test enquiry analysis contains top companies"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        data = response.json()
        
        assert "top_companies" in data
        assert isinstance(data["top_companies"], list)


class TestQuoteAnalysisEndpoint:
    """Tests for GET /api/customer-management/quote-analysis"""
    
    def test_quote_analysis_returns_200(self, api_client):
        """Test quote analysis endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        assert response.status_code == 200
    
    def test_quote_analysis_has_summary(self, api_client):
        """Test quote analysis contains summary"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_quotes" in summary
        assert "accepted_count" in summary
        assert "declined_count" in summary
        assert "pending_count" in summary
        assert "win_rate" in summary
        assert "avg_quote_value" in summary
    
    def test_quote_analysis_has_value_breakdown(self, api_client):
        """Test quote analysis contains value breakdown"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        data = response.json()
        
        assert "value_breakdown" in data
        breakdown = data["value_breakdown"]
        assert "total_value" in breakdown
        assert "accepted_value" in breakdown
        assert "declined_value" in breakdown
        assert "pending_value" in breakdown
    
    def test_quote_analysis_has_aging(self, api_client):
        """Test quote analysis contains aging buckets"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        data = response.json()
        
        assert "aging" in data
        aging = data["aging"]
        assert "0-7 days" in aging
        assert "8-14 days" in aging
        assert "15-30 days" in aging
        assert "30+ days" in aging
    
    def test_quote_analysis_has_pending_quotes(self, api_client):
        """Test quote analysis contains pending quotes list"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        data = response.json()
        
        assert "pending_quotes" in data
        assert isinstance(data["pending_quotes"], list)


class TestOrderAnalysisEndpoint:
    """Tests for GET /api/customer-management/order-analysis"""
    
    def test_order_analysis_returns_200(self, api_client):
        """Test order analysis endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/order-analysis")
        assert response.status_code == 200
    
    def test_order_analysis_has_summary(self, api_client):
        """Test order analysis contains summary"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/order-analysis")
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_orders" in summary
        assert "total_value" in summary
        assert "avg_order_value" in summary
        assert "unique_customers" in summary
        assert "repeat_customers" in summary
        assert "repeat_rate" in summary
    
    def test_order_analysis_has_top_customers(self, api_client):
        """Test order analysis contains top customers"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/order-analysis")
        data = response.json()
        
        assert "top_customers" in data
        assert isinstance(data["top_customers"], list)
    
    def test_order_analysis_has_category_breakdown(self, api_client):
        """Test order analysis contains category breakdown"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/order-analysis")
        data = response.json()
        
        assert "category_breakdown" in data
        assert isinstance(data["category_breakdown"], list)
    
    def test_order_analysis_has_recent_orders(self, api_client):
        """Test order analysis contains recent orders"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/order-analysis")
        data = response.json()
        
        assert "recent_orders" in data
        assert isinstance(data["recent_orders"], list)


class TestProjectionsEndpoint:
    """Tests for GET /api/customer-management/projections"""
    
    def test_projections_returns_200(self, api_client):
        """Test projections endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/projections")
        assert response.status_code == 200
    
    def test_projections_has_metrics(self, api_client):
        """Test projections contains metrics"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/projections")
        data = response.json()
        
        assert "metrics" in data
        metrics = data["metrics"]
        assert "avg_monthly_revenue" in metrics
        assert "growth_rate" in metrics
        assert "pipeline_value" in metrics
        assert "weighted_pipeline" in metrics
    
    def test_projections_has_projections_list(self, api_client):
        """Test projections contains 3-month projections"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/projections")
        data = response.json()
        
        assert "projections" in data
        projections = data["projections"]
        assert isinstance(projections, list)
        assert len(projections) == 3  # 3 months
        
        for p in projections:
            assert "month" in p
            assert "projected_revenue" in p
            assert "confidence" in p
    
    def test_projections_has_pipeline_breakdown(self, api_client):
        """Test projections contains pipeline breakdown"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/projections")
        data = response.json()
        
        assert "pipeline_breakdown" in data
        assert isinstance(data["pipeline_breakdown"], dict)


class TestCustomerTargetingEndpoint:
    """Tests for GET /api/customer-management/customer-targeting"""
    
    def test_customer_targeting_returns_200(self, api_client):
        """Test customer targeting endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customer-targeting")
        assert response.status_code == 200
    
    def test_customer_targeting_has_summary(self, api_client):
        """Test customer targeting contains summary"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customer-targeting")
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_customers" in summary
        assert "active_customers" in summary
        assert "prospects" in summary
        assert "dormant_customers" in summary
        assert "high_value_customers" in summary
    
    def test_customer_targeting_has_prospects(self, api_client):
        """Test customer targeting contains prospects list"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customer-targeting")
        data = response.json()
        
        assert "prospects" in data
        assert isinstance(data["prospects"], list)
    
    def test_customer_targeting_has_dormant_customers(self, api_client):
        """Test customer targeting contains dormant customers list"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customer-targeting")
        data = response.json()
        
        assert "dormant_customers" in data
        assert isinstance(data["dormant_customers"], list)
    
    def test_customer_targeting_has_high_value_customers(self, api_client):
        """Test customer targeting contains high value customers list"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customer-targeting")
        data = response.json()
        
        assert "high_value_customers" in data
        assert isinstance(data["high_value_customers"], list)


class TestCustomersEndpoint:
    """Tests for GET /api/customer-management/customers"""
    
    def test_customers_returns_200(self, api_client):
        """Test customers endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customers?limit=10")
        assert response.status_code == 200
    
    def test_customers_has_pagination(self, api_client):
        """Test customers endpoint has pagination"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customers?limit=10")
        data = response.json()
        
        assert "customers" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
    
    def test_customers_has_analytics(self, api_client):
        """Test each customer has analytics"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customers?limit=5")
        data = response.json()
        
        assert len(data["customers"]) > 0
        for customer in data["customers"]:
            assert "analytics" in customer
            analytics = customer["analytics"]
            assert "total_enquiries" in analytics
            assert "total_value" in analytics
            assert "won_orders" in analytics
            assert "pending_enquiries" in analytics
    
    def test_customers_limit_works(self, api_client):
        """Test customers limit parameter works"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/customers?limit=3")
        data = response.json()
        
        assert len(data["customers"]) <= 3


class TestCustomer360Endpoint:
    """Tests for GET /api/customer-management/customer/{customer_name}/360"""
    
    def test_customer_360_returns_200(self, api_client):
        """Test customer 360 endpoint returns 200"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/Test%20Industries%20Pvt%20Ltd/360"
        )
        assert response.status_code == 200
    
    def test_customer_360_has_metrics(self, api_client):
        """Test customer 360 contains metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/Test%20Industries%20Pvt%20Ltd/360"
        )
        data = response.json()
        
        assert "metrics" in data
        metrics = data["metrics"]
        assert "total_enquiries" in metrics
        assert "total_value" in metrics
        assert "won_value" in metrics
        assert "pending_value" in metrics
        assert "win_rate" in metrics
        assert "avg_order_value" in metrics
        assert "won_count" in metrics
        assert "lost_count" in metrics
        assert "pending_count" in metrics
    
    def test_customer_360_has_status_breakdown(self, api_client):
        """Test customer 360 contains status breakdown"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/Test%20Industries%20Pvt%20Ltd/360"
        )
        data = response.json()
        
        assert "status_breakdown" in data
        assert isinstance(data["status_breakdown"], dict)
    
    def test_customer_360_has_monthly_trend(self, api_client):
        """Test customer 360 contains monthly trend"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/Test%20Industries%20Pvt%20Ltd/360"
        )
        data = response.json()
        
        assert "monthly_trend" in data
        assert isinstance(data["monthly_trend"], list)
        assert len(data["monthly_trend"]) == 12  # 12 months
    
    def test_customer_360_has_recent_enquiries(self, api_client):
        """Test customer 360 contains recent enquiries"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/Test%20Industries%20Pvt%20Ltd/360"
        )
        data = response.json()
        
        assert "recent_enquiries" in data
        assert isinstance(data["recent_enquiries"], list)
    
    def test_customer_360_with_no_enquiries(self, api_client):
        """Test customer 360 for customer with no enquiries"""
        response = api_client.get(
            f"{BASE_URL}/api/customer-management/customer/4I%20Apps%20Solutions%20Private%20Limited%20HQ/360"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["metrics"]["total_enquiries"] == 0
        assert data["metrics"]["total_value"] == 0


class TestDataIntegrity:
    """Tests for data integrity across endpoints"""
    
    def test_overview_total_matches_customers_total(self, api_client):
        """Test overview total customers matches customers endpoint total"""
        overview_response = api_client.get(f"{BASE_URL}/api/customer-management/overview")
        customers_response = api_client.get(f"{BASE_URL}/api/customer-management/customers?limit=1")
        
        overview_total = overview_response.json()["summary"]["total_customers"]
        customers_total = customers_response.json()["total"]
        
        assert overview_total == customers_total
    
    def test_enquiry_funnel_consistency(self, api_client):
        """Test enquiry funnel numbers are consistent"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/enquiry-analysis")
        data = response.json()
        
        funnel = data["conversion_funnel"]
        # Won should be <= Quoted <= Total
        assert funnel["won"] <= funnel["quoted"]
        assert funnel["quoted"] <= funnel["total_enquiries"]
    
    def test_quote_analysis_counts_consistent(self, api_client):
        """Test quote analysis counts are consistent"""
        response = api_client.get(f"{BASE_URL}/api/customer-management/quote-analysis")
        data = response.json()
        
        summary = data["summary"]
        # Total = Accepted + Declined + Pending
        assert summary["total_quotes"] == (
            summary["accepted_count"] + 
            summary["declined_count"] + 
            summary["pending_count"]
        )
