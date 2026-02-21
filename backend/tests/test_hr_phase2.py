"""
HR Phase 2 Backend Tests
Tests for: Payslip PDF, Advances & Loans, Overtime Management, Leave Dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://enerzia-workspace.preview.emergentagent.com')

# Test data
TEST_EMPLOYEE_ID = "EMP001"  # Existing employee
TEST_PAYROLL_RECORD_ID = "0b0d4060-ce8e-4643-9a14-5489dee5b193"  # Existing payroll record


class TestPayslipPDF:
    """Test Payslip PDF Generation"""
    
    def test_payslip_pdf_generation_by_record_id(self):
        """Test PDF generation using payroll record ID"""
        response = requests.get(f"{BASE_URL}/api/hr/payslip/{TEST_PAYROLL_RECORD_ID}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        # Verify PDF content starts with PDF header
        content = response.content
        assert content[:5] == b'%PDF-', "Response is not a valid PDF"
        assert len(content) > 1000, f"PDF too small: {len(content)} bytes"
        print(f"✓ Payslip PDF generated successfully: {len(content)} bytes")
    
    def test_payslip_pdf_by_employee_month_year(self):
        """Test PDF generation using employee ID, month, year"""
        response = requests.get(f"{BASE_URL}/api/hr/payslip/{TEST_EMPLOYEE_ID}/2/2026/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        content = response.content
        assert content[:5] == b'%PDF-', "Response is not a valid PDF"
        print(f"✓ Payslip PDF by employee/month/year generated: {len(content)} bytes")
    
    def test_payslip_pdf_not_found(self):
        """Test PDF generation with invalid record ID"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/hr/payslip/{fake_id}/pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Payslip PDF returns 404 for invalid record")


class TestAdvancesLoans:
    """Test Advances & Loans CRUD Operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.created_advance_ids = []
        yield
        # Cleanup - delete test advances
        for adv_id in self.created_advance_ids:
            try:
                # Note: There's no delete endpoint for advances, so we skip cleanup
                pass
            except:
                pass
    
    def test_get_all_advances(self):
        """Test GET /api/hr/advances"""
        response = requests.get(f"{BASE_URL}/api/hr/advances")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET advances returned {len(data)} records")
    
    def test_get_advances_by_status(self):
        """Test GET /api/hr/advances with status filter"""
        for status in ['pending', 'active', 'completed', 'rejected']:
            response = requests.get(f"{BASE_URL}/api/hr/advances?status={status}")
            assert response.status_code == 200, f"Expected 200 for status={status}"
        print("✓ GET advances with status filter works")
    
    def test_create_advance_request(self):
        """Test POST /api/hr/advances - Create new advance request"""
        payload = {
            "amount": 5000,
            "reason": "TEST_Medical emergency",
            "repayment_months": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/advances?emp_id={TEST_EMPLOYEE_ID}",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain id"
        assert data["emp_id"] == TEST_EMPLOYEE_ID
        assert data["amount"] == 5000
        assert data["reason"] == "TEST_Medical emergency"
        assert data["repayment_months"] == 3
        assert data["status"] == "pending"
        assert "emi_amount" in data
        assert data["emi_amount"] == round(5000 / 3, 2)
        
        self.created_advance_ids.append(data["id"])
        print(f"✓ Advance request created: {data['id']}")
        
        return data["id"]
    
    def test_approve_advance(self):
        """Test PUT /api/hr/advances/{id}/approve"""
        # First create an advance
        payload = {
            "amount": 3000,
            "reason": "TEST_Advance for approval test",
            "repayment_months": 2
        }
        create_response = requests.post(
            f"{BASE_URL}/api/hr/advances?emp_id={TEST_EMPLOYEE_ID}",
            json=payload
        )
        assert create_response.status_code == 200
        advance_id = create_response.json()["id"]
        self.created_advance_ids.append(advance_id)
        
        # Approve the advance
        response = requests.put(f"{BASE_URL}/api/hr/advances/{advance_id}/approve?approved_by=TestAdmin")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Advance approved: {advance_id}")
    
    def test_reject_advance(self):
        """Test PUT /api/hr/advances/{id}/reject"""
        # First create an advance
        payload = {
            "amount": 2000,
            "reason": "TEST_Advance for rejection test",
            "repayment_months": 1
        }
        create_response = requests.post(
            f"{BASE_URL}/api/hr/advances?emp_id={TEST_EMPLOYEE_ID}",
            json=payload
        )
        assert create_response.status_code == 200
        advance_id = create_response.json()["id"]
        self.created_advance_ids.append(advance_id)
        
        # Reject the advance
        response = requests.put(f"{BASE_URL}/api/hr/advances/{advance_id}/reject?rejected_by=TestAdmin")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Advance rejected: {advance_id}")
    
    def test_advance_not_found(self):
        """Test approve/reject with invalid ID"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(f"{BASE_URL}/api/hr/advances/{fake_id}/approve?approved_by=Test")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        response = requests.put(f"{BASE_URL}/api/hr/advances/{fake_id}/reject?rejected_by=Test")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Advance approve/reject returns 404 for invalid ID")


class TestOvertimeManagement:
    """Test Overtime Management CRUD Operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.created_overtime_ids = []
        yield
        # Cleanup - delete test overtime records
        for ot_id in self.created_overtime_ids:
            try:
                requests.delete(f"{BASE_URL}/api/hr/overtime/{ot_id}")
            except:
                pass
    
    def test_get_all_overtime(self):
        """Test GET /api/hr/overtime"""
        response = requests.get(f"{BASE_URL}/api/hr/overtime")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET overtime returned {len(data)} records")
    
    def test_get_overtime_with_filters(self):
        """Test GET /api/hr/overtime with month/year/status filters"""
        response = requests.get(f"{BASE_URL}/api/hr/overtime?month=2&year=2026")
        assert response.status_code == 200
        
        response = requests.get(f"{BASE_URL}/api/hr/overtime?status=pending")
        assert response.status_code == 200
        
        print("✓ GET overtime with filters works")
    
    def test_create_overtime(self):
        """Test POST /api/hr/overtime - Create new overtime record"""
        payload = {
            "emp_id": TEST_EMPLOYEE_ID,
            "date": "2026-02-15",
            "hours": 3.5,
            "reason": "TEST_Project deadline",
            "rate_per_hour": 150
        }
        
        response = requests.post(f"{BASE_URL}/api/hr/overtime", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["emp_id"] == TEST_EMPLOYEE_ID
        assert data["hours"] == 3.5
        assert data["rate_per_hour"] == 150
        assert data["amount"] == 3.5 * 150  # 525
        assert data["status"] == "pending"
        
        self.created_overtime_ids.append(data["id"])
        print(f"✓ Overtime record created: {data['id']}")
        
        return data["id"]
    
    def test_update_overtime(self):
        """Test PUT /api/hr/overtime/{id} - Update overtime record"""
        # First create an overtime record
        payload = {
            "emp_id": TEST_EMPLOYEE_ID,
            "date": "2026-02-16",
            "hours": 2,
            "reason": "TEST_Update test",
            "rate_per_hour": 100
        }
        create_response = requests.post(f"{BASE_URL}/api/hr/overtime", json=payload)
        assert create_response.status_code == 200
        overtime_id = create_response.json()["id"]
        self.created_overtime_ids.append(overtime_id)
        
        # Update the record
        update_payload = {
            "hours": 4,
            "reason": "TEST_Updated reason"
        }
        response = requests.put(f"{BASE_URL}/api/hr/overtime/{overtime_id}", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["hours"] == 4
        assert data["amount"] == 4 * 100  # Recalculated
        print(f"✓ Overtime record updated: {overtime_id}")
    
    def test_approve_overtime(self):
        """Test PUT /api/hr/overtime/{id}/approve"""
        # First create an overtime record
        payload = {
            "emp_id": TEST_EMPLOYEE_ID,
            "date": "2026-02-17",
            "hours": 2.5,
            "reason": "TEST_Approval test",
            "rate_per_hour": 100
        }
        create_response = requests.post(f"{BASE_URL}/api/hr/overtime", json=payload)
        assert create_response.status_code == 200
        overtime_id = create_response.json()["id"]
        self.created_overtime_ids.append(overtime_id)
        
        # Approve
        response = requests.put(f"{BASE_URL}/api/hr/overtime/{overtime_id}/approve")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Overtime approved: {overtime_id}")
    
    def test_reject_overtime(self):
        """Test PUT /api/hr/overtime/{id}/reject"""
        # First create an overtime record
        payload = {
            "emp_id": TEST_EMPLOYEE_ID,
            "date": "2026-02-18",
            "hours": 1.5,
            "reason": "TEST_Rejection test",
            "rate_per_hour": 100
        }
        create_response = requests.post(f"{BASE_URL}/api/hr/overtime", json=payload)
        assert create_response.status_code == 200
        overtime_id = create_response.json()["id"]
        self.created_overtime_ids.append(overtime_id)
        
        # Reject
        response = requests.put(f"{BASE_URL}/api/hr/overtime/{overtime_id}/reject")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Overtime rejected: {overtime_id}")
    
    def test_delete_overtime(self):
        """Test DELETE /api/hr/overtime/{id}"""
        # First create an overtime record
        payload = {
            "emp_id": TEST_EMPLOYEE_ID,
            "date": "2026-02-19",
            "hours": 1,
            "reason": "TEST_Delete test",
            "rate_per_hour": 100
        }
        create_response = requests.post(f"{BASE_URL}/api/hr/overtime", json=payload)
        assert create_response.status_code == 200
        overtime_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/hr/overtime/{overtime_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Overtime deleted: {overtime_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/hr/overtime")
        overtime_ids = [r["id"] for r in get_response.json()]
        assert overtime_id not in overtime_ids, "Overtime should be deleted"
    
    def test_overtime_summary(self):
        """Test GET /api/hr/overtime/summary/{emp_id}"""
        response = requests.get(f"{BASE_URL}/api/hr/overtime/summary/{TEST_EMPLOYEE_ID}?month=2&year=2026")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "emp_id" in data
        assert "total_hours" in data
        assert "total_amount" in data
        assert "record_count" in data
        print(f"✓ Overtime summary: {data['total_hours']} hours, ₹{data['total_amount']}")


class TestLeaveDashboard:
    """Test Leave Dashboard APIs"""
    
    def test_get_leave_balance(self):
        """Test GET /api/hr/leave-balance/{emp_id}"""
        response = requests.get(f"{BASE_URL}/api/hr/leave-balance/{TEST_EMPLOYEE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "emp_id" in data
        assert "name" in data
        assert "leave_balance" in data
        
        leave_balance = data["leave_balance"]
        assert "casual_leave" in leave_balance
        assert "sick_leave" in leave_balance
        assert "earned_leave" in leave_balance
        assert "comp_off" in leave_balance
        
        # Each leave type should have total, taken, remaining
        for leave_type in ["casual_leave", "sick_leave", "earned_leave", "comp_off"]:
            assert "total" in leave_balance[leave_type]
            assert "taken" in leave_balance[leave_type]
            assert "remaining" in leave_balance[leave_type]
        
        print(f"✓ Leave balance retrieved for {data['name']}")
        print(f"  CL: {leave_balance['casual_leave']['remaining']}/{leave_balance['casual_leave']['total']}")
        print(f"  SL: {leave_balance['sick_leave']['remaining']}/{leave_balance['sick_leave']['total']}")
        print(f"  EL: {leave_balance['earned_leave']['remaining']}/{leave_balance['earned_leave']['total']}")
    
    def test_leave_balance_not_found(self):
        """Test leave balance for non-existent employee"""
        response = requests.get(f"{BASE_URL}/api/hr/leave-balance/INVALID_EMP")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Leave balance returns 404 for invalid employee")
    
    def test_update_leave_balance(self):
        """Test PUT /api/hr/leave-balance/{emp_id}"""
        # Get current balance first
        get_response = requests.get(f"{BASE_URL}/api/hr/leave-balance/{TEST_EMPLOYEE_ID}")
        assert get_response.status_code == 200
        
        # Update leave balance
        new_balance = {
            "casual_leave": 12,
            "sick_leave": 12,
            "earned_leave": 15,
            "comp_off": 2  # Add some comp off
        }
        
        response = requests.put(
            f"{BASE_URL}/api/hr/leave-balance/{TEST_EMPLOYEE_ID}",
            json=new_balance
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Leave balance updated successfully")


class TestPayrollProcessing:
    """Test Payroll Processing APIs"""
    
    def test_get_payroll_records(self):
        """Test GET /api/hr/payroll"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET payroll returned {len(data)} records")
    
    def test_get_payroll_with_filters(self):
        """Test GET /api/hr/payroll with month/year filters"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll?month=2&year=2026")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all records are for Feb 2026
        for record in data:
            assert record["month"] == 2
            assert record["year"] == 2026
        
        print(f"✓ GET payroll with filters returned {len(data)} records for Feb 2026")
    
    def test_get_single_payroll_record(self):
        """Test GET /api/hr/payroll/{record_id}"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll/{TEST_PAYROLL_RECORD_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["id"] == TEST_PAYROLL_RECORD_ID
        assert "emp_id" in data
        assert "emp_name" in data
        assert "gross_salary" in data
        assert "net_salary" in data
        assert "deductions" in data
        assert "earnings" in data
        
        print(f"✓ Payroll record retrieved: {data['emp_name']} - Net: ₹{data['net_salary']}")
    
    def test_statutory_report(self):
        """Test GET /api/hr/reports/statutory/{month}/{year}"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/statutory/2/2026")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "employee_count" in data
        assert "summary" in data
        
        summary = data["summary"]
        assert "total_gross_salary" in summary
        assert "total_net_salary" in summary
        assert "epf" in summary
        assert "esic" in summary
        assert "professional_tax" in summary
        
        print(f"✓ Statutory report: {data['employee_count']} employees")
        print(f"  Total Gross: ₹{summary['total_gross_salary']}")
        print(f"  Total EPF: ₹{summary['epf']['total']}")
        print(f"  Total PT: ₹{summary['professional_tax']['total']}")


class TestHRDashboard:
    """Test HR Dashboard Stats API"""
    
    def test_hr_dashboard_stats(self):
        """Test GET /api/hr/dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/hr/dashboard/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "employees" in data
        assert "department_wise" in data
        assert "pending_requests" in data
        assert "upcoming_celebrations" in data
        
        employees = data["employees"]
        assert "total" in employees
        assert "active" in employees
        
        print(f"✓ HR Dashboard Stats:")
        print(f"  Total Employees: {employees['total']}")
        print(f"  Active: {employees['active']}")
        print(f"  Pending Leaves: {data['pending_requests']['leaves']}")
        print(f"  Pending Advances: {data['pending_requests']['advances']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
