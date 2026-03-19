"""
Test Budget Sync Fix
Tests for bug fix: Budget set in Order Management was not reflected in Purchase Management

Issue: Budget data stored in sales_orders.financials.execution_budget was not being 
fetched in consolidated/by-pid endpoint - only order_lifecycle was checked (which had null financials)

Fix: Code now checks multiple sources:
1. order_lifecycle.financials.execution_budget
2. sales_orders.financials.execution_budget (backup source)  
3. projects.budget (fallback)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBudgetSync:
    """Budget sync tests - verifies budget from Order Management displays in Purchase Management"""
    
    def test_consolidated_by_pid_returns_correct_budget(self):
        """
        Test: PID/25-26/401 should show Budget: ₹15,000 (not ₹0)
        This budget is stored in sales_orders.financials.execution_budget
        """
        response = requests.get(f"{BASE_URL}/api/project-requests/consolidated/by-pid?limit=100")
        assert response.status_code == 200
        
        data = response.json()
        pids = data.get('pids', [])
        
        # Find PID/25-26/401
        target_pid = None
        for pid in pids:
            if pid.get('order_no') == 'PID/25-26/401':
                target_pid = pid
                break
        
        assert target_pid is not None, "PID/25-26/401 not found in consolidated PIDs"
        
        # Verify budget is 15000, not 0
        budget = target_pid.get('budget', 0)
        assert budget == 15000, f"Expected budget 15000, got {budget}"
        print(f"✅ Budget correctly shows ₹{budget:,} for PID/25-26/401")
    
    def test_pid_detail_returns_correct_budget(self):
        """
        Test: /consolidated/pid/{order_id} returns correct budget
        """
        # First get the order_id for PID/25-26/401
        response = requests.get(f"{BASE_URL}/api/project-requests/consolidated/by-pid?limit=100")
        pids = response.json().get('pids', [])
        
        target_pid = None
        for pid in pids:
            if pid.get('order_no') == 'PID/25-26/401':
                target_pid = pid
                break
        
        assert target_pid is not None
        order_id = target_pid.get('order_id')
        
        # Fetch PID details
        detail_response = requests.get(f"{BASE_URL}/api/project-requests/consolidated/pid/{order_id}")
        assert detail_response.status_code == 200
        
        detail = detail_response.json()
        assert detail.get('budget') == 15000, f"Expected budget 15000, got {detail.get('budget')}"
        print(f"✅ PID detail budget: ₹{detail.get('budget'):,}")
    
    def test_budget_check_for_payment_shows_correct_budget(self):
        """
        Test: Budget warning in payment approval shows correct budget amount
        """
        # Get a payment request for PID/25-26/401
        response = requests.get(f"{BASE_URL}/api/project-requests/payments?limit=50")
        assert response.status_code == 200
        
        payments = response.json().get('requests', [])
        target_payment = None
        for payment in payments:
            if payment.get('order_no') == 'PID/25-26/401':
                target_payment = payment
                break
        
        if target_payment is None:
            pytest.skip("No payment request found for PID/25-26/401")
        
        # Check budget for this payment
        budget_check = requests.get(f"{BASE_URL}/api/project-requests/{target_payment['id']}/budget-check")
        assert budget_check.status_code == 200
        
        budget_data = budget_check.json()
        assert budget_data.get('budget') == 15000, f"Expected budget 15000 in budget-check, got {budget_data.get('budget')}"
        print(f"✅ Budget check shows correct budget: ₹{budget_data.get('budget'):,}")
        print(f"   Available budget: ₹{budget_data.get('available_budget'):,}")
        print(f"   Warning: {budget_data.get('warning')}")
    
    def test_consolidated_endpoint_returns_budget_warning(self):
        """
        Test: Consolidated endpoint returns appropriate budget_warning
        """
        response = requests.get(f"{BASE_URL}/api/project-requests/consolidated/by-pid?limit=100")
        assert response.status_code == 200
        
        pids = response.json().get('pids', [])
        
        # Find PID with budget warning
        found_warning = False
        for pid in pids:
            if pid.get('budget_warning') in ['no_budget', 'over_budget', 'low_budget']:
                found_warning = True
                print(f"✅ PID {pid.get('order_no')} has budget_warning: {pid.get('budget_warning')}")
                break
        
        assert found_warning, "No budget warnings found in any PID"


class TestEditModalLabelFix:
    """
    Test: Edit Project Modal should NOT show '(Set in Order Management)' text
    This is a frontend code verification test
    """
    
    def test_edit_modal_code_has_clean_budget_label(self):
        """
        Verify EditProjectModal.js has clean Budget label without extra text
        """
        # This test verifies the file content - the actual verification was done via grep
        # Frontend file: /app/frontend/src/components/EditProjectModal.js line 486
        # Expected: Budget (₹)
        # NOT expected: Budget (₹) (Set in Order Management)
        
        # Read the file to verify
        import os
        file_path = '/app/frontend/src/components/EditProjectModal.js'
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Check that "(Set in Order Management)" is NOT in the label
            assert "(Set in Order Management)" not in content, \
                "FAIL: '(Set in Order Management)' text still present in EditProjectModal.js"
            
            # Check that "Budget (₹)" label exists
            assert "Budget (₹)" in content, \
                "Budget label should be present"
            
            print("✅ EditProjectModal.js has clean Budget label")
            print("   Label text: 'Budget (₹)' without extra '(Set in Order Management)'")
        else:
            pytest.skip("EditProjectModal.js not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
