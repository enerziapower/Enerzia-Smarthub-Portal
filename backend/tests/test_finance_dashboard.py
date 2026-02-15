"""
Finance Dashboard Module (Phase 4) - Backend API Tests
Tests for Order-wise P&L, Cash Flow, Savings Analysis, Expense Breakdown, 
Department Performance, Monthly Trends, and Financial KPIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFinanceDashboardOverview:
    """Test /api/finance-dashboard/overview endpoint"""
    
    def test_overview_returns_200(self):
        """Test overview endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        assert response.status_code == 200
        
    def test_overview_has_revenue_section(self):
        """Test overview has revenue data"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        data = response.json()
        
        assert "revenue" in data
        assert "total" in data["revenue"]
        assert "this_month" in data["revenue"]
        assert "orders_count" in data["revenue"]
        assert "month_orders" in data["revenue"]
        
    def test_overview_has_costs_section(self):
        """Test overview has costs data"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        data = response.json()
        
        assert "costs" in data
        assert "total_purchase" in data["costs"]
        assert "total_expenses" in data["costs"]
        assert "total_cost" in data["costs"]
        
    def test_overview_has_profit_section(self):
        """Test overview has profit data"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        data = response.json()
        
        assert "profit" in data
        assert "gross_profit" in data["profit"]
        assert "margin_percent" in data["profit"]
        
    def test_overview_has_pending_section(self):
        """Test overview has pending payments/expenses data"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        data = response.json()
        
        assert "pending" in data
        assert "payments" in data["pending"]
        assert "payments_count" in data["pending"]
        assert "expenses" in data["pending"]
        assert "expenses_count" in data["pending"]


class TestOrderProfitability:
    """Test /api/finance-dashboard/order-profitability endpoint"""
    
    def test_order_profitability_returns_200(self):
        """Test order profitability endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability")
        assert response.status_code == 200
        
    def test_order_profitability_has_orders_list(self):
        """Test order profitability returns orders list"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability")
        data = response.json()
        
        assert "orders" in data
        assert isinstance(data["orders"], list)
        
    def test_order_profitability_has_totals(self):
        """Test order profitability returns totals"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability")
        data = response.json()
        
        assert "totals" in data
        assert "total_revenue" in data["totals"]
        assert "total_purchase" in data["totals"]
        assert "total_expenses" in data["totals"]
        assert "total_cost" in data["totals"]
        assert "total_profit" in data["totals"]
        assert "total_savings" in data["totals"]
        assert "avg_margin" in data["totals"]
        
    def test_order_profitability_order_fields(self):
        """Test each order has required fields"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability")
        data = response.json()
        
        if data["orders"]:
            order = data["orders"][0]
            required_fields = [
                "order_id", "order_no", "customer_name", "order_value",
                "purchase_cost", "execution_expenses", "total_cost",
                "actual_profit", "profit_margin", "status"
            ]
            for field in required_fields:
                assert field in order, f"Missing field: {field}"
                
    def test_order_profitability_with_limit(self):
        """Test order profitability with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["orders"]) <= 5


class TestCashFlow:
    """Test /api/finance-dashboard/cash-flow endpoint"""
    
    def test_cash_flow_returns_200(self):
        """Test cash flow endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/cash-flow")
        assert response.status_code == 200
        
    def test_cash_flow_has_projections(self):
        """Test cash flow returns projections list"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/cash-flow")
        data = response.json()
        
        assert "projections" in data
        assert isinstance(data["projections"], list)
        
    def test_cash_flow_has_summary(self):
        """Test cash flow returns summary"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/cash-flow")
        data = response.json()
        
        assert "summary" in data
        assert "total_expected_inflow" in data["summary"]
        assert "months_covered" in data["summary"]
        
    def test_cash_flow_projection_fields(self):
        """Test each projection has required fields"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/cash-flow")
        data = response.json()
        
        if data["projections"]:
            projection = data["projections"][0]
            required_fields = [
                "month", "month_name", "expected_inflow", 
                "expected_outflow", "net_flow", "milestone_count"
            ]
            for field in required_fields:
                assert field in projection, f"Missing field: {field}"
                
    def test_cash_flow_with_months_param(self):
        """Test cash flow with custom months parameter"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/cash-flow?months=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["projections"]) == 3


class TestSavingsAnalysis:
    """Test /api/finance-dashboard/savings-analysis endpoint"""
    
    def test_savings_analysis_returns_200(self):
        """Test savings analysis endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/savings-analysis")
        assert response.status_code == 200
        
    def test_savings_analysis_has_orders(self):
        """Test savings analysis returns orders list"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/savings-analysis")
        data = response.json()
        
        assert "orders" in data
        assert isinstance(data["orders"], list)
        
    def test_savings_analysis_has_summary(self):
        """Test savings analysis returns summary"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/savings-analysis")
        data = response.json()
        
        assert "summary" in data
        summary_fields = [
            "total_purchase_budget", "total_purchase_actual", "total_purchase_savings",
            "purchase_savings_percent", "total_execution_budget", "total_execution_actual",
            "total_execution_savings", "execution_savings_percent", "grand_total_savings"
        ]
        for field in summary_fields:
            assert field in data["summary"], f"Missing summary field: {field}"


class TestExpenseBreakdown:
    """Test /api/finance-dashboard/expense-breakdown endpoint"""
    
    def test_expense_breakdown_returns_200(self):
        """Test expense breakdown endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown")
        assert response.status_code == 200
        
    def test_expense_breakdown_has_categories(self):
        """Test expense breakdown returns categories list"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown")
        data = response.json()
        
        assert "categories" in data
        assert isinstance(data["categories"], list)
        
    def test_expense_breakdown_has_grand_total(self):
        """Test expense breakdown returns grand total"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown")
        data = response.json()
        
        assert "grand_total" in data
        assert isinstance(data["grand_total"], (int, float))
        
    def test_expense_breakdown_category_fields(self):
        """Test each category has required fields"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown")
        data = response.json()
        
        if data["categories"]:
            category = data["categories"][0]
            required_fields = ["category", "label", "total", "count", "average", "percentage"]
            for field in required_fields:
                assert field in category, f"Missing field: {field}"
                
    def test_expense_breakdown_with_period(self):
        """Test expense breakdown with period parameter"""
        for period in ["all", "month", "quarter", "year"]:
            response = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown?period={period}")
            assert response.status_code == 200
            data = response.json()
            assert data["period"] == period


class TestPaymentStatus:
    """Test /api/finance-dashboard/payment-status endpoint"""
    
    def test_payment_status_returns_200(self):
        """Test payment status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/payment-status")
        assert response.status_code == 200
        
    def test_payment_status_has_summary(self):
        """Test payment status returns summary"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/payment-status")
        data = response.json()
        
        assert "summary" in data
        summary_fields = [
            "total_receivable", "total_collected", "total_overdue",
            "fully_paid_count", "partially_paid_count", "unpaid_count", "overdue_count"
        ]
        for field in summary_fields:
            assert field in data["summary"], f"Missing summary field: {field}"
            
    def test_payment_status_has_order_lists(self):
        """Test payment status returns order lists"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/payment-status")
        data = response.json()
        
        assert "overdue_orders" in data
        assert "partially_paid" in data
        assert "unpaid" in data


class TestDepartmentPerformance:
    """Test /api/finance-dashboard/department-performance endpoint"""
    
    def test_department_performance_returns_200(self):
        """Test department performance endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/department-performance")
        assert response.status_code == 200
        
    def test_department_performance_has_purchase(self):
        """Test department performance has purchase metrics"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/department-performance")
        data = response.json()
        
        assert "purchase" in data
        assert "requests" in data["purchase"]
        assert "orders" in data["purchase"]
        assert "efficiency" in data["purchase"]
        
    def test_department_performance_has_sales(self):
        """Test department performance has sales metrics"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/department-performance")
        data = response.json()
        
        assert "sales" in data
        assert "orders_count" in data["sales"]
        assert "total_revenue" in data["sales"]
        assert "avg_order_value" in data["sales"]
        
    def test_department_performance_has_accounts(self):
        """Test department performance has accounts metrics"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/department-performance")
        data = response.json()
        
        assert "accounts" in data
        assert "expenses_by_status" in data["accounts"]
        assert "approval_rate" in data["accounts"]


class TestMonthlyTrends:
    """Test /api/finance-dashboard/monthly-trends endpoint"""
    
    def test_monthly_trends_returns_200(self):
        """Test monthly trends endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/monthly-trends")
        assert response.status_code == 200
        
    def test_monthly_trends_has_trends_list(self):
        """Test monthly trends returns trends list"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/monthly-trends")
        data = response.json()
        
        assert "trends" in data
        assert isinstance(data["trends"], list)
        
    def test_monthly_trends_default_12_months(self):
        """Test monthly trends returns 12 months by default"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/monthly-trends")
        data = response.json()
        
        assert len(data["trends"]) == 12
        
    def test_monthly_trends_with_months_param(self):
        """Test monthly trends with custom months parameter"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/monthly-trends?months=6")
        assert response.status_code == 200
        data = response.json()
        assert len(data["trends"]) == 6
        
    def test_monthly_trends_trend_fields(self):
        """Test each trend has required fields"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/monthly-trends")
        data = response.json()
        
        if data["trends"]:
            trend = data["trends"][0]
            required_fields = [
                "month", "month_name", "revenue", "purchase", 
                "expenses", "total_cost", "profit", "margin", "orders_count"
            ]
            for field in required_fields:
                assert field in trend, f"Missing field: {field}"


class TestFinancialKPIs:
    """Test /api/finance-dashboard/kpis endpoint"""
    
    def test_kpis_returns_200(self):
        """Test KPIs endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        assert response.status_code == 200
        
    def test_kpis_has_revenue_kpis(self):
        """Test KPIs has revenue section"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        data = response.json()
        
        assert "revenue_kpis" in data
        assert "total_revenue" in data["revenue_kpis"]
        assert "monthly_revenue" in data["revenue_kpis"]
        assert "avg_order_value" in data["revenue_kpis"]
        assert "total_orders" in data["revenue_kpis"]
        
    def test_kpis_has_profitability_kpis(self):
        """Test KPIs has profitability section"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        data = response.json()
        
        assert "profitability_kpis" in data
        assert "gross_profit" in data["profitability_kpis"]
        assert "profit_margin" in data["profitability_kpis"]
        assert "cost_ratio" in data["profitability_kpis"]
        
    def test_kpis_has_collection_kpis(self):
        """Test KPIs has collection section"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        data = response.json()
        
        assert "collection_kpis" in data
        assert "collection_rate" in data["collection_kpis"]
        assert "pending_receivables" in data["collection_kpis"]
        assert "overdue_amount" in data["collection_kpis"]
        
    def test_kpis_has_operational_kpis(self):
        """Test KPIs has operational section"""
        response = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        data = response.json()
        
        assert "operational_kpis" in data
        assert "pending_expenses" in data["operational_kpis"]
        assert "approved_expenses" in data["operational_kpis"]
        assert "expense_approval_rate" in data["operational_kpis"]


class TestDataIntegrity:
    """Test data integrity across endpoints"""
    
    def test_overview_totals_match_profitability(self):
        """Test overview totals match order profitability totals"""
        overview_res = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        profit_res = requests.get(f"{BASE_URL}/api/finance-dashboard/order-profitability")
        
        overview = overview_res.json()
        profit = profit_res.json()
        
        # Revenue should match
        assert overview["revenue"]["total"] == profit["totals"]["total_revenue"]
        
    def test_expense_breakdown_matches_overview(self):
        """Test expense breakdown total matches overview expenses"""
        overview_res = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        expense_res = requests.get(f"{BASE_URL}/api/finance-dashboard/expense-breakdown")
        
        overview = overview_res.json()
        expense = expense_res.json()
        
        # Total expenses should match (approximately, due to different sources)
        # Note: expense_breakdown only shows approved expenses from expenses_v2
        assert expense["grand_total"] <= overview["costs"]["total_expenses"]
        
    def test_kpis_match_overview(self):
        """Test KPIs match overview data"""
        overview_res = requests.get(f"{BASE_URL}/api/finance-dashboard/overview")
        kpis_res = requests.get(f"{BASE_URL}/api/finance-dashboard/kpis")
        
        overview = overview_res.json()
        kpis = kpis_res.json()
        
        # Revenue should match
        assert overview["revenue"]["total"] == kpis["revenue_kpis"]["total_revenue"]
        # Profit margin should match
        assert overview["profit"]["margin_percent"] == kpis["profitability_kpis"]["profit_margin"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
