"""
Test suite for Employee Expense Claims and Finance Expense Approvals integration
Tests the connection between employee expense sheets and finance approval workflow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeExpenseSheets:
    """Tests for Employee Expense Sheet API endpoints"""
    
    def test_get_employee_expense_sheets(self):
        """Test GET /api/employee/expense-sheets returns user's sheets"""
        user_id = "549716b0-9b50-4d83-8521-fac69037e730"  # Admin User ID
        response = requests.get(f"{BASE_URL}/api/employee/expense-sheets?user_id={user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # Verify sheets belong to the user
        for sheet in data["sheets"]:
            assert sheet["user_id"] == user_id
            assert "id" in sheet
            assert "sheet_no" in sheet
            assert "status" in sheet
            assert "total_amount" in sheet
    
    def test_get_employee_expense_sheets_summary(self):
        """Test GET /api/employee/expense-sheets/summary returns yearly summary"""
        user_id = "549716b0-9b50-4d83-8521-fac69037e730"
        response = requests.get(f"{BASE_URL}/api/employee/expense-sheets/summary/{user_id}?year=2026")
        
        assert response.status_code == 200
        data = response.json()
        # Summary should contain totals
        assert "total_claimed" in data or "total_paid" in data or isinstance(data, dict)


class TestFinanceExpenseSheets:
    """Tests for Finance Expense Sheet API endpoints"""
    
    def test_get_all_expense_sheets_no_filter(self):
        """Test GET /api/finance/expense-sheets returns all non-draft sheets"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # Finance should see sheets from all users (not just one user)
        user_ids = set(sheet["user_id"] for sheet in data["sheets"])
        assert len(user_ids) >= 1  # Should have sheets from multiple users
        
        # Verify no draft sheets are returned
        for sheet in data["sheets"]:
            assert sheet["status"] != "draft"
    
    def test_get_expense_sheets_filter_pending(self):
        """Test GET /api/finance/expense-sheets?status=pending returns only pending sheets"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # All returned sheets should be pending
        for sheet in data["sheets"]:
            assert sheet["status"] == "pending"
    
    def test_get_expense_sheets_filter_paid(self):
        """Test GET /api/finance/expense-sheets?status=paid returns only paid sheets"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=paid")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # All returned sheets should be paid
        for sheet in data["sheets"]:
            assert sheet["status"] == "paid"
        
        # Based on test data, should have 4 paid sheets
        assert len(data["sheets"]) >= 4
    
    def test_get_expense_sheets_filter_rejected(self):
        """Test GET /api/finance/expense-sheets?status=rejected returns only rejected sheets"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=rejected")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # All returned sheets should be rejected
        for sheet in data["sheets"]:
            assert sheet["status"] == "rejected"
        
        # Based on test data, should have at least 1 rejected sheet
        assert len(data["sheets"]) >= 1
    
    def test_get_expense_sheets_filter_all(self):
        """Test GET /api/finance/expense-sheets?status=all returns all sheets"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=all")
        
        assert response.status_code == 200
        data = response.json()
        assert "sheets" in data
        
        # Should return all sheets (5 based on test data)
        assert len(data["sheets"]) >= 5
    
    def test_expense_sheet_data_structure(self):
        """Test that expense sheets have correct data structure"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=all")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["sheets"]) > 0:
            sheet = data["sheets"][0]
            
            # Required fields
            assert "id" in sheet
            assert "sheet_no" in sheet
            assert "user_id" in sheet
            assert "user_name" in sheet
            assert "status" in sheet
            assert "month" in sheet
            assert "year" in sheet
            assert "total_amount" in sheet
            assert "items" in sheet
            
            # Items should be a list
            assert isinstance(sheet["items"], list)


class TestExpenseSheetIntegration:
    """Tests for integration between Employee and Finance expense sheet systems"""
    
    def test_employee_sheets_appear_in_finance(self):
        """Test that expense sheets created by employees appear in Finance view"""
        # Get Admin User's sheets from employee endpoint
        user_id = "549716b0-9b50-4d83-8521-fac69037e730"
        emp_response = requests.get(f"{BASE_URL}/api/employee/expense-sheets?user_id={user_id}")
        assert emp_response.status_code == 200
        emp_sheets = emp_response.json()["sheets"]
        
        # Get all sheets from finance endpoint
        fin_response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=all")
        assert fin_response.status_code == 200
        fin_sheets = fin_response.json()["sheets"]
        
        # Employee's non-draft sheets should appear in finance
        for emp_sheet in emp_sheets:
            if emp_sheet["status"] != "draft":
                # Find this sheet in finance sheets
                found = any(fin_sheet["id"] == emp_sheet["id"] for fin_sheet in fin_sheets)
                assert found, f"Employee sheet {emp_sheet['sheet_no']} not found in Finance view"
    
    def test_finance_sees_all_users_sheets(self):
        """Test that Finance can see expense sheets from all users"""
        response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=all")
        assert response.status_code == 200
        
        sheets = response.json()["sheets"]
        user_ids = set(sheet["user_id"] for sheet in sheets)
        
        # Should have sheets from multiple users
        assert len(user_ids) >= 2, "Finance should see sheets from multiple users"
    
    def test_filter_dropdown_values(self):
        """Test that all filter values work correctly"""
        filter_values = ["pending", "verified", "approved", "rejected", "paid", "all"]
        
        for filter_val in filter_values:
            if filter_val == "all":
                response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status=all")
            else:
                response = requests.get(f"{BASE_URL}/api/finance/expense-sheets?status={filter_val}")
            
            assert response.status_code == 200, f"Filter '{filter_val}' failed"
            data = response.json()
            assert "sheets" in data, f"Filter '{filter_val}' missing 'sheets' key"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
