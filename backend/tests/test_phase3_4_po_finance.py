"""
Test Phase 3 & 4 Features:
- PO Creation from approved material requests
- Finance Dashboard with P&L data
- Project P&L endpoint
- Purchase Orders listing
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFinanceDashboard:
    """Test GET /api/project-requests/finance-dashboard endpoint"""
    
    def test_finance_dashboard_returns_200(self):
        """Finance dashboard should return 200 status"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_finance_dashboard_has_summary(self):
        """Finance dashboard should have summary section"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        assert "summary" in data, "Response should have 'summary' key"
        summary = data["summary"]
        
        # Check required summary fields
        assert "total_projects" in summary, "Summary should have total_projects"
        assert "total_revenue" in summary, "Summary should have total_revenue"
        assert "total_budgeted_cost" in summary, "Summary should have total_budgeted_cost"
        assert "total_actual_cost" in summary, "Summary should have total_actual_cost"
        assert "gross_profit" in summary, "Summary should have gross_profit"
        assert "budget_variance" in summary, "Summary should have budget_variance"
    
    def test_finance_dashboard_has_by_status(self):
        """Finance dashboard should have by_status breakdown"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        assert "by_status" in data, "Response should have 'by_status' key"
        by_status = data["by_status"]
        
        # Check status categories
        assert "accepted" in by_status, "by_status should have 'accepted'"
        assert "in_progress" in by_status, "by_status should have 'in_progress'"
        assert "completed" in by_status, "by_status should have 'completed'"
    
    def test_finance_dashboard_has_request_totals(self):
        """Finance dashboard should have request_totals with counts and values"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        assert "request_totals" in data, "Response should have 'request_totals' key"
        request_totals = data["request_totals"]
        
        # Check request types
        assert "materials" in request_totals, "request_totals should have 'materials'"
        assert "vendors" in request_totals, "request_totals should have 'vendors'"
        assert "payments" in request_totals, "request_totals should have 'payments'"
        
        # Check each type has count and value
        for req_type in ["materials", "vendors", "payments"]:
            assert "count" in request_totals[req_type], f"{req_type} should have 'count'"
            assert "value" in request_totals[req_type], f"{req_type} should have 'value'"
    
    def test_finance_dashboard_has_projects_list(self):
        """Finance dashboard should have projects list with P&L data"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        assert "projects" in data, "Response should have 'projects' key"
        projects = data["projects"]
        
        # If there are projects, check structure
        if len(projects) > 0:
            project = projects[0]
            assert "order_id" in project, "Project should have order_id"
            assert "order_no" in project, "Project should have order_no"
            assert "customer_name" in project, "Project should have customer_name"
            assert "order_value" in project, "Project should have order_value"
            assert "total_costs" in project, "Project should have total_costs"
            assert "profit" in project, "Project should have profit"
            assert "profit_percent" in project, "Project should have profit_percent"
            assert "project_status" in project, "Project should have project_status"


class TestProjectPnL:
    """Test GET /api/project-requests/project-pnl/{order_id} endpoint"""
    
    def test_project_pnl_returns_200_for_valid_order(self):
        """Project P&L should return 200 for valid order"""
        # Use known order from finance dashboard
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_project_pnl_returns_404_for_invalid_order(self):
        """Project P&L should return 404 for non-existent order"""
        fake_order_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{fake_order_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_project_pnl_has_revenue_section(self):
        """Project P&L should have revenue section"""
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            data = response.json()
            
            assert "revenue" in data, "Response should have 'revenue' key"
            assert "order_value" in data["revenue"], "Revenue should have order_value"
    
    def test_project_pnl_has_budgets_section(self):
        """Project P&L should have budgets section"""
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            data = response.json()
            
            assert "budgets" in data, "Response should have 'budgets' key"
            budgets = data["budgets"]
            assert "purchase_budget" in budgets, "Budgets should have purchase_budget"
            assert "execution_budget" in budgets, "Budgets should have execution_budget"
            assert "others_budget" in budgets, "Budgets should have others_budget"
            assert "total_budget" in budgets, "Budgets should have total_budget"
            assert "target_profit" in budgets, "Budgets should have target_profit"
    
    def test_project_pnl_has_actuals_section(self):
        """Project P&L should have actuals section with cost breakdown"""
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            data = response.json()
            
            assert "actuals" in data, "Response should have 'actuals' key"
            actuals = data["actuals"]
            assert "material_costs" in actuals, "Actuals should have material_costs"
            assert "vendor_costs" in actuals, "Actuals should have vendor_costs"
            assert "payment_costs" in actuals, "Actuals should have payment_costs"
            assert "total_costs" in actuals, "Actuals should have total_costs"
            assert "actual_profit" in actuals, "Actuals should have actual_profit"
            assert "actual_profit_percent" in actuals, "Actuals should have actual_profit_percent"
    
    def test_project_pnl_has_variance_section(self):
        """Project P&L should have variance section"""
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            data = response.json()
            
            assert "variance" in data, "Response should have 'variance' key"
            variance = data["variance"]
            assert "cost_variance" in variance, "Variance should have cost_variance"
            assert "profit_variance" in variance, "Variance should have profit_variance"
            assert "is_over_budget" in variance, "Variance should have is_over_budget"
            assert "is_profitable" in variance, "Variance should have is_profitable"
    
    def test_project_pnl_has_request_summary(self):
        """Project P&L should have request_summary counts"""
        dashboard_response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        projects = dashboard_response.json().get("projects", [])
        
        if len(projects) > 0:
            order_id = projects[0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/project-requests/project-pnl/{order_id}")
            data = response.json()
            
            assert "request_summary" in data, "Response should have 'request_summary' key"
            summary = data["request_summary"]
            assert "materials" in summary, "Request summary should have materials count"
            assert "vendors" in summary, "Request summary should have vendors count"
            assert "payments" in summary, "Request summary should have payments count"


class TestPurchaseOrders:
    """Test GET /api/project-requests/purchase-orders endpoint"""
    
    def test_purchase_orders_returns_200(self):
        """Purchase orders endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_purchase_orders_has_correct_structure(self):
        """Purchase orders should return list with total"""
        response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        data = response.json()
        
        assert "purchase_orders" in data, "Response should have 'purchase_orders' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["purchase_orders"], list), "purchase_orders should be a list"


class TestCreatePOFromRequest:
    """Test POST /api/project-requests/create-po endpoint"""
    
    def test_create_po_requires_request_id(self):
        """Create PO should require request_id"""
        response = requests.post(
            f"{BASE_URL}/api/project-requests/create-po",
            json={"vendor_name": "Test Vendor"}
        )
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_create_po_requires_vendor_name(self):
        """Create PO should require vendor_name"""
        response = requests.post(
            f"{BASE_URL}/api/project-requests/create-po",
            json={"request_id": str(uuid.uuid4())}
        )
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
    
    def test_create_po_returns_404_for_invalid_request(self):
        """Create PO should return 404 for non-existent request"""
        response = requests.post(
            f"{BASE_URL}/api/project-requests/create-po",
            json={
                "request_id": str(uuid.uuid4()),
                "vendor_name": "Test Vendor"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_create_po_rejects_pending_request(self):
        """Create PO should reject pending (not approved) requests"""
        # Get a pending material request
        mat_response = requests.get(f"{BASE_URL}/api/project-requests/materials?status=pending")
        requests_list = mat_response.json().get("requests", [])
        
        if len(requests_list) > 0:
            pending_request = requests_list[0]
            response = requests.post(
                f"{BASE_URL}/api/project-requests/create-po",
                json={
                    "request_id": pending_request["id"],
                    "vendor_name": "Test Vendor"
                }
            )
            assert response.status_code == 400, f"Expected 400 for pending request, got {response.status_code}"
            assert "approved" in response.json().get("detail", "").lower(), "Error should mention approved status"


class TestCreatePOWorkflow:
    """Test full PO creation workflow"""
    
    def test_create_po_from_approved_request(self):
        """Test creating PO from an approved material request"""
        # First create a material request
        create_response = requests.post(
            f"{BASE_URL}/api/project-requests/materials",
            json={
                "order_id": "TEST_PO_WORKFLOW_" + str(uuid.uuid4())[:8],
                "order_no": "PID/25-26/TEST-PO-CREATE",
                "project_name": "TEST PO Creation",
                "customer_name": "TEST Customer",
                "items": [
                    {"description": "Test Material", "quantity": 10, "unit": "Nos", "estimated_cost": 1000}
                ],
                "priority": "medium"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create material request for test")
        
        request_data = create_response.json().get("request", {})
        request_id = request_data.get("id")
        
        # Approve the request
        approve_response = requests.put(
            f"{BASE_URL}/api/project-requests/{request_id}/status",
            json={"status": "approved"}
        )
        
        if approve_response.status_code != 200:
            pytest.skip("Could not approve material request for test")
        
        # Now create PO
        po_response = requests.post(
            f"{BASE_URL}/api/project-requests/create-po",
            json={
                "request_id": request_id,
                "vendor_name": "TEST Vendor for PO",
                "vendor_contact": "9876543210",
                "delivery_date": "2026-04-01",
                "payment_terms": "Net 30",
                "notes": "Test PO creation"
            }
        )
        
        assert po_response.status_code == 200, f"Expected 200, got {po_response.status_code}: {po_response.text}"
        
        po_data = po_response.json()
        assert "po" in po_data, "Response should have 'po' key"
        assert "po_number" in po_data["po"], "PO should have po_number"
        assert po_data["po"]["po_number"].startswith("PO-"), "PO number should start with PO-"
        assert po_data["po"]["vendor_name"] == "TEST Vendor for PO", "Vendor name should match"
        assert po_data["po"]["request_id"] == request_id, "Request ID should be linked"
        
        # Verify PO appears in list
        po_list_response = requests.get(f"{BASE_URL}/api/project-requests/purchase-orders")
        po_list = po_list_response.json().get("purchase_orders", [])
        
        created_po = next((po for po in po_list if po.get("id") == po_data["po"]["id"]), None)
        assert created_po is not None, "Created PO should appear in purchase orders list"
        
        # Verify original request status changed to in_progress
        request_response = requests.get(f"{BASE_URL}/api/project-requests/{request_id}")
        updated_request = request_response.json()
        assert updated_request.get("status") == "in_progress", "Request status should be in_progress after PO creation"
        assert updated_request.get("po_number") == po_data["po"]["po_number"], "Request should have PO number linked"


class TestPOStatusUpdate:
    """Test PUT /api/project-requests/purchase-orders/{po_id}/status endpoint"""
    
    def test_update_po_status_invalid_status(self):
        """Update PO status should reject invalid status"""
        response = requests.put(
            f"{BASE_URL}/api/project-requests/purchase-orders/{str(uuid.uuid4())}/status?status=invalid_status"
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_update_po_status_not_found(self):
        """Update PO status should return 404 for non-existent PO"""
        response = requests.put(
            f"{BASE_URL}/api/project-requests/purchase-orders/{str(uuid.uuid4())}/status?status=sent"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestFinanceDashboardCalculations:
    """Test finance dashboard calculations are correct"""
    
    def test_gross_profit_calculation(self):
        """Gross profit should equal revenue minus actual costs"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        summary = data.get("summary", {})
        total_revenue = summary.get("total_revenue", 0)
        total_actual_cost = summary.get("total_actual_cost", 0)
        gross_profit = summary.get("gross_profit", 0)
        
        expected_profit = total_revenue - total_actual_cost
        assert abs(gross_profit - expected_profit) < 0.01, f"Gross profit {gross_profit} should equal {expected_profit}"
    
    def test_budget_variance_calculation(self):
        """Budget variance should equal actual cost minus budgeted cost"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        summary = data.get("summary", {})
        total_actual_cost = summary.get("total_actual_cost", 0)
        total_budgeted_cost = summary.get("total_budgeted_cost", 0)
        budget_variance = summary.get("budget_variance", 0)
        
        expected_variance = total_actual_cost - total_budgeted_cost
        assert abs(budget_variance - expected_variance) < 0.01, f"Budget variance {budget_variance} should equal {expected_variance}"
    
    def test_request_totals_sum_to_actual_cost(self):
        """Request totals should sum to total actual cost"""
        response = requests.get(f"{BASE_URL}/api/project-requests/finance-dashboard")
        data = response.json()
        
        summary = data.get("summary", {})
        request_totals = data.get("request_totals", {})
        
        materials_value = request_totals.get("materials", {}).get("value", 0)
        vendors_value = request_totals.get("vendors", {}).get("value", 0)
        payments_value = request_totals.get("payments", {}).get("value", 0)
        
        calculated_total = materials_value + vendors_value + payments_value
        actual_cost = summary.get("total_actual_cost", 0)
        
        assert abs(calculated_total - actual_cost) < 0.01, f"Request totals {calculated_total} should equal actual cost {actual_cost}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
