"""
HR Payroll Phase 3 - Backend API Tests
Tests for: Attendance Integration, Bulk Payroll, Finalize/Unlock, Dashboard, Statutory Reports
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAttendanceSummary:
    """Test Attendance Summary API for payroll integration"""
    
    def test_get_attendance_summary_valid_employee(self):
        """Test attendance summary for valid employee"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance-summary/EMP001?month=2&year=2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "emp_id" in data
        assert "emp_name" in data
        assert "month" in data
        assert "year" in data
        assert "days_in_month" in data
        assert "working_days" in data
        assert "present_days" in data
        assert "half_days" in data
        assert "leave_days" in data
        assert "lop_days" in data
        assert "attendance_records_found" in data
        
        # Verify data types
        assert isinstance(data["working_days"], int)
        assert isinstance(data["lop_days"], (int, float))
    
    def test_get_attendance_summary_invalid_employee(self):
        """Test attendance summary for non-existent employee"""
        response = requests.get(f"{BASE_URL}/api/hr/attendance-summary/INVALID_EMP?month=2&year=2026")
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()


class TestPayrollPreview:
    """Test Payroll Preview API with attendance integration"""
    
    def test_preview_payroll_success(self):
        """Test payroll preview returns calculated values"""
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/preview",
            json={"month": 2, "year": 2026, "fetch_attendance": True}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "employee_count" in data
        assert "summary" in data
        assert "records" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_gross" in summary
        assert "total_deductions" in summary
        assert "total_net" in summary
        assert "total_epf" in summary
        
        # Verify records structure
        if data["records"]:
            record = data["records"][0]
            assert "emp_id" in record
            assert "emp_name" in record
            assert "attendance" in record
            assert "earnings" in record
            assert "deductions" in record
            assert "net_salary" in record
    
    def test_preview_payroll_with_department_filter(self):
        """Test payroll preview with department filter"""
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/preview",
            json={"month": 2, "year": 2026, "department": "Projects"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "records" in data


class TestBulkPayrollRun:
    """Test Bulk Payroll Run API"""
    
    def test_bulk_payroll_run_success(self):
        """Test bulk payroll processing"""
        # First unlock if finalized
        requests.post(f"{BASE_URL}/api/hr/payroll/unlock/3/2026")
        
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/bulk-run",
            json={"month": 3, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "run_id" in data
        assert "month" in data
        assert "year" in data
        assert "summary" in data
        assert "status" in data
        
        # Verify status
        assert data["status"] == "processed"
    
    def test_bulk_payroll_run_creates_records(self):
        """Test that bulk payroll creates payroll records"""
        # Run payroll for a test month
        requests.post(f"{BASE_URL}/api/hr/payroll/unlock/4/2026")
        requests.post(
            f"{BASE_URL}/api/hr/payroll/bulk-run",
            json={"month": 4, "year": 2026}
        )
        
        # Verify records were created
        response = requests.get(f"{BASE_URL}/api/hr/payroll?month=4&year=2026")
        assert response.status_code == 200
        records = response.json()
        assert len(records) > 0


class TestPayrollFinalize:
    """Test Payroll Finalize and Unlock APIs"""
    
    def test_finalize_payroll_success(self):
        """Test finalizing payroll for a month"""
        # First ensure payroll exists
        requests.post(f"{BASE_URL}/api/hr/payroll/unlock/5/2026")
        requests.post(
            f"{BASE_URL}/api/hr/payroll/bulk-run",
            json={"month": 5, "year": 2026}
        )
        
        # Finalize
        response = requests.post(f"{BASE_URL}/api/hr/payroll/finalize/5/2026")
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "finalized" in data["message"].lower()
        assert "finalized_at" in data
    
    def test_finalize_prevents_modification(self):
        """Test that finalized payroll cannot be modified"""
        # Ensure finalized
        requests.post(f"{BASE_URL}/api/hr/payroll/finalize/5/2026")
        
        # Try to run payroll again - should fail
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/bulk-run",
            json={"month": 5, "year": 2026}
        )
        # Should return 400 because payroll is finalized
        assert response.status_code == 400
        assert "finalized" in response.json().get("detail", "").lower()
    
    def test_unlock_payroll_success(self):
        """Test unlocking finalized payroll"""
        # Ensure finalized first
        requests.post(f"{BASE_URL}/api/hr/payroll/finalize/5/2026")
        
        # Unlock
        response = requests.post(f"{BASE_URL}/api/hr/payroll/unlock/5/2026")
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "unlocked" in data["message"].lower()
    
    def test_finalize_no_payroll_run(self):
        """Test finalizing when no payroll run exists"""
        response = requests.post(f"{BASE_URL}/api/hr/payroll/finalize/12/2030")
        assert response.status_code == 404


class TestPayrollDashboard:
    """Test Payroll Dashboard API"""
    
    def test_dashboard_with_data(self):
        """Test dashboard returns data for processed month"""
        # Ensure payroll exists
        requests.post(f"{BASE_URL}/api/hr/payroll/unlock/2/2026")
        requests.post(
            f"{BASE_URL}/api/hr/payroll/bulk-run",
            json={"month": 2, "year": 2026}
        )
        
        response = requests.get(f"{BASE_URL}/api/hr/payroll/dashboard/2/2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "employee_count" in data
        assert "summary" in data
        assert "deductions_breakdown" in data
        assert "employer_contributions" in data
        assert "department_breakdown" in data
        assert "comparison" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_gross" in summary
        assert "total_net" in summary
        assert "total_deductions" in summary
        
        # Verify department breakdown is a list
        assert isinstance(data["department_breakdown"], list)
    
    def test_dashboard_no_data(self):
        """Test dashboard returns appropriate response when no data"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll/dashboard/12/2030")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_data" or data.get("employee_count") == 0


class TestEPFReport:
    """Test EPF Report API"""
    
    def test_epf_report_success(self):
        """Test EPF report generation"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/epf/2/2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "report_type" in data
        assert "employee_count" in data
        assert "summary" in data
        assert "records" in data
        
        # Verify report type
        assert "EPF" in data["report_type"]
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_employee_epf" in summary
        assert "total_employer_epf" in summary
        assert "total_eps" in summary
        assert "total_edli" in summary
        assert "grand_total" in summary
        
        # Verify records structure if present
        if data["records"]:
            record = data["records"][0]
            assert "emp_id" in record
            assert "emp_name" in record
            assert "employee_epf" in record
            assert "employer_epf_share" in record
    
    def test_epf_report_no_data(self):
        """Test EPF report when no payroll data"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/epf/12/2030")
        assert response.status_code == 404


class TestESICReport:
    """Test ESIC Report API"""
    
    def test_esic_report_success(self):
        """Test ESIC report generation"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/esic/2/2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "report_type" in data
        assert "employee_count" in data
        assert "summary" in data
        assert "records" in data
        
        # Verify report type
        assert "ESIC" in data["report_type"]
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_employee_esic" in summary
        assert "total_employer_esic" in summary
        assert "grand_total" in summary


class TestProfessionalTaxReport:
    """Test Professional Tax Report API"""
    
    def test_pt_report_success(self):
        """Test Professional Tax report generation"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/professional-tax/2/2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "report_type" in data
        assert "employee_count" in data
        assert "total_pt" in data
        assert "records" in data
        
        # Verify report type
        assert "Professional Tax" in data["report_type"]
        
        # Verify records structure if present
        if data["records"]:
            record = data["records"][0]
            assert "emp_id" in record
            assert "emp_name" in record
            assert "department" in record
            assert "gross_salary" in record
            assert "professional_tax" in record
    
    def test_pt_report_no_data(self):
        """Test PT report when no payroll data"""
        response = requests.get(f"{BASE_URL}/api/hr/reports/professional-tax/12/2030")
        assert response.status_code == 404


class TestPayrollRunStatus:
    """Test Payroll Run Status API"""
    
    def test_get_run_status(self):
        """Test getting payroll run status"""
        response = requests.get(f"{BASE_URL}/api/hr/payroll/run-status/2/2026")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "status" in data
        
        # Status should be one of: not_processed, processed, finalized
        assert data["status"] in ["not_processed", "processed", "finalized"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
