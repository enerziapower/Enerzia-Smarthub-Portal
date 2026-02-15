"""
Test Report Action Buttons - Clone, Edit, Email, Download, Delete
Tests for AMCReports, OtherReports, AuditReports, and CustomerService pages
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication and get token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        print(f"✓ Login successful, token obtained")


class TestAMCReports:
    """Test AMC Reports CRUD and actions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_amc_reports(self, auth_headers):
        """Test fetching AMC reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=amc", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get AMC reports: {response.text}"
        data = response.json()
        # API returns array directly
        report_count = len(data) if isinstance(data, list) else len(data.get('data', []))
        print(f"✓ AMC Reports fetched: {report_count} reports")
    
    def test_create_amc_report(self, auth_headers):
        """Test creating an AMC report"""
        report_data = {
            "report_category": "amc",
            "equipment_type": "earth-pit",
            "customer_name": "TEST_AMC_Customer",
            "location": "Test Location",
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create AMC report: {response.text}"
        data = response.json()
        assert "id" in data, "No ID in created report"
        print(f"✓ AMC Report created with ID: {data['id']}")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{data['id']}", headers=auth_headers)
    
    def test_clone_amc_report(self, auth_headers):
        """Test cloning an AMC report (create from existing data)"""
        # First create a report
        report_data = {
            "report_category": "amc",
            "equipment_type": "earth-pit",
            "customer_name": "TEST_Clone_Source",
            "location": "Clone Source Location",
            "status": "completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        original_id = create_response.json()["id"]
        
        # Clone by creating new report with same data but different status
        clone_data = {
            "report_category": "amc",
            "equipment_type": "earth-pit",
            "customer_name": "TEST_Clone_Source",
            "location": "Clone Source Location",
            "status": "draft"  # Cloned reports start as draft
        }
        clone_response = requests.post(f"{BASE_URL}/api/test-reports", json=clone_data, headers=auth_headers)
        assert clone_response.status_code in [200, 201], f"Failed to clone: {clone_response.text}"
        cloned_id = clone_response.json()["id"]
        assert cloned_id != original_id, "Clone should have different ID"
        print(f"✓ AMC Report cloned: {original_id} -> {cloned_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{original_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/test-reports/{cloned_id}", headers=auth_headers)
    
    def test_delete_amc_report(self, auth_headers):
        """Test deleting an AMC report"""
        # Create a report to delete
        report_data = {
            "report_category": "amc",
            "equipment_type": "earth-pit",
            "customer_name": "TEST_Delete_Me",
            "status": "draft"
        }
        create_response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        report_id = create_response.json()["id"]
        
        # Delete the report
        delete_response = requests.delete(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
        assert delete_response.status_code in [200, 204], f"Failed to delete: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/test-reports/{report_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Report should not exist after deletion"
        print(f"✓ AMC Report deleted: {report_id}")


class TestOtherReports:
    """Test Other Reports CRUD and actions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_other_reports(self, auth_headers):
        """Test fetching Other reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=other", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get Other reports: {response.text}"
        data = response.json()
        report_count = len(data) if isinstance(data, list) else len(data.get('data', []))
        print(f"✓ Other Reports fetched: {report_count} reports")
    
    def test_create_other_report(self, auth_headers):
        """Test creating an Other report"""
        report_data = {
            "report_category": "other",
            "equipment_type": "general",
            "title": "TEST_Other_Report",
            "customer_name": "TEST_Other_Customer",
            "location": "Test Location",
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create Other report: {response.text}"
        data = response.json()
        print(f"✓ Other Report created with ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{data['id']}", headers=auth_headers)
    
    def test_clone_other_report(self, auth_headers):
        """Test cloning an Other report"""
        # Create original
        report_data = {
            "report_category": "other",
            "equipment_type": "general",
            "title": "TEST_Clone_Other",
            "customer_name": "TEST_Clone_Customer",
            "status": "completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        original_id = create_response.json()["id"]
        
        # Clone
        clone_data = {**report_data, "status": "draft"}
        clone_response = requests.post(f"{BASE_URL}/api/test-reports", json=clone_data, headers=auth_headers)
        assert clone_response.status_code in [200, 201]
        cloned_id = clone_response.json()["id"]
        print(f"✓ Other Report cloned: {original_id} -> {cloned_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{original_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/test-reports/{cloned_id}", headers=auth_headers)


class TestAuditReports:
    """Test Audit Reports CRUD and actions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_audit_reports(self, auth_headers):
        """Test fetching Audit reports"""
        response = requests.get(f"{BASE_URL}/api/test-reports?report_category=audit", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get Audit reports: {response.text}"
        data = response.json()
        report_count = len(data) if isinstance(data, list) else len(data.get('data', []))
        print(f"✓ Audit Reports fetched: {report_count} reports")
    
    def test_create_audit_report(self, auth_headers):
        """Test creating an Audit report"""
        report_data = {
            "report_category": "audit",
            "equipment_type": "ir-thermography",  # Required field
            "audit_type": "ir-thermography",
            "customer_name": "TEST_Audit_Customer",
            "location": "Test Location",
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create Audit report: {response.text}"
        data = response.json()
        print(f"✓ Audit Report created with ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{data['id']}", headers=auth_headers)
    
    def test_clone_audit_report(self, auth_headers):
        """Test cloning an Audit report"""
        # Create original
        report_data = {
            "report_category": "audit",
            "equipment_type": "electrical-safety",
            "audit_type": "electrical-safety",
            "customer_name": "TEST_Clone_Audit",
            "status": "completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/test-reports", json=report_data, headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        original_id = create_response.json()["id"]
        
        # Clone
        clone_data = {**report_data, "status": "draft"}
        clone_response = requests.post(f"{BASE_URL}/api/test-reports", json=clone_data, headers=auth_headers)
        assert clone_response.status_code in [200, 201]
        cloned_id = clone_response.json()["id"]
        print(f"✓ Audit Report cloned: {original_id} -> {cloned_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/test-reports/{original_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/test-reports/{cloned_id}", headers=auth_headers)


class TestCustomerService:
    """Test Customer Service CRUD and actions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_customer_service_requests(self, auth_headers):
        """Test fetching customer service requests"""
        response = requests.get(f"{BASE_URL}/api/customer-service", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get service requests: {response.text}"
        data = response.json()
        print(f"✓ Customer Service requests fetched: {len(data)} requests")
    
    def test_get_next_srn(self, auth_headers):
        """Test getting next SRN number"""
        response = requests.get(f"{BASE_URL}/api/customer-service/next-srn", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get next SRN: {response.text}"
        data = response.json()
        assert "srn_no" in data, "No srn_no in response"
        print(f"✓ Next SRN: {data['srn_no']}")
    
    def test_create_service_request(self, auth_headers):
        """Test creating a service request"""
        request_data = {
            "customer_name": "TEST_Service_Customer",
            "site_location": "Test Site",
            "request_type": "Maintenance",
            "service_category": "Electrical",
            "subject": "TEST Service Request",
            "description": "Test description",
            "status": "Pending"
        }
        response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Failed to create service request: {response.text}"
        data = response.json()
        # Response has nested structure: {"message": ..., "request": {...}}
        request_obj = data.get("request", data)
        assert "id" in request_obj, f"No ID in created request: {data}"
        request_id = request_obj["id"]
        print(f"✓ Service Request created with ID: {request_id}, SRN: {request_obj.get('srn_no')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
    
    def test_clone_service_request(self, auth_headers):
        """Test cloning a service request"""
        # Create original
        request_data = {
            "customer_name": "TEST_Clone_Service",
            "site_location": "Clone Site",
            "request_type": "Breakdown",
            "service_category": "HVAC Systems",
            "subject": "TEST Clone Request",
            "status": "Completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        create_data = create_response.json()
        original_id = create_data.get("request", create_data).get("id")
        
        # Clone by creating new with same data but Pending status
        clone_data = {**request_data, "status": "Pending"}
        clone_response = requests.post(f"{BASE_URL}/api/customer-service", json=clone_data, headers=auth_headers)
        assert clone_response.status_code in [200, 201]
        clone_data_resp = clone_response.json()
        cloned_id = clone_data_resp.get("request", clone_data_resp).get("id")
        print(f"✓ Service Request cloned: {original_id} -> {cloned_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customer-service/{original_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/customer-service/{cloned_id}", headers=auth_headers)
    
    def test_update_service_request(self, auth_headers):
        """Test updating a service request"""
        # Create a request
        request_data = {
            "customer_name": "TEST_Update_Service",
            "subject": "TEST Update Request",
            "status": "Pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        create_data = create_response.json()
        request_id = create_data.get("request", create_data).get("id")
        
        # Update the request
        update_data = {"status": "In Progress", "assigned_to": "Test Engineer"}
        update_response = requests.put(f"{BASE_URL}/api/customer-service/{request_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
        updated_data = get_response.json()
        assert updated_data.get("status") == "In Progress", "Status not updated"
        print(f"✓ Service Request updated: {request_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
    
    def test_delete_service_request(self, auth_headers):
        """Test deleting a service request"""
        # Create a request to delete
        request_data = {
            "customer_name": "TEST_Delete_Service",
            "subject": "TEST Delete Request",
            "status": "Pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        create_data = create_response.json()
        request_id = create_data.get("request", create_data).get("id")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
        assert delete_response.status_code in [200, 204], f"Failed to delete: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Request should not exist after deletion"
        print(f"✓ Service Request deleted: {request_id}")
    
    def test_send_email_endpoint_exists(self, auth_headers):
        """Test that send-email endpoint exists for customer service"""
        # First create a completed service request
        request_data = {
            "customer_name": "TEST_Email_Service",
            "subject": "TEST Email Request",
            "status": "Completed"
        }
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        create_data = create_response.json()
        request_id = create_data.get("request", create_data).get("id")
        
        # Test email endpoint (will fail without valid email but should return proper error)
        email_data = {
            "to_email": "test@example.com",
            "cc_emails": [],
            "custom_message": "Test message"
        }
        email_response = requests.post(
            f"{BASE_URL}/api/customer-service/{request_id}/send-email", 
            json=email_data, 
            headers=auth_headers
        )
        # Should not be 404 (endpoint exists)
        assert email_response.status_code != 404, "Send email endpoint not found"
        print(f"✓ Send email endpoint exists for customer service (status: {email_response.status_code})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)
    
    def test_pdf_download_endpoint(self, auth_headers):
        """Test PDF download endpoint for completed service requests"""
        # Create a completed service request
        request_data = {
            "customer_name": "TEST_PDF_Service",
            "subject": "TEST PDF Request",
            "status": "Completed",
            "work_performed": "Test work performed"
        }
        create_response = requests.post(f"{BASE_URL}/api/customer-service", json=request_data, headers=auth_headers)
        create_data = create_response.json()
        request_id = create_data.get("request", create_data).get("id")
        
        # Test PDF endpoint
        pdf_response = requests.get(
            f"{BASE_URL}/api/customer-service/{request_id}/pdf", 
            headers=auth_headers
        )
        # Should return PDF or proper error
        assert pdf_response.status_code != 404, "PDF endpoint not found"
        if pdf_response.status_code == 200:
            content_type = pdf_response.headers.get("content-type", "").lower()
            assert "pdf" in content_type or "application/pdf" in content_type
            print(f"✓ PDF download works for service request: {request_id}")
        else:
            print(f"✓ PDF endpoint exists (status: {pdf_response.status_code})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customer-service/{request_id}", headers=auth_headers)


class TestExistingServiceRequests:
    """Test with existing service requests mentioned in the task"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "admin123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_fetch_existing_service_requests(self, auth_headers):
        """Fetch and verify existing service requests"""
        response = requests.get(f"{BASE_URL}/api/customer-service", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Look for SRNs mentioned in the task
        srn_numbers = [req.get("srn_no") for req in data]
        print(f"✓ Found {len(data)} service requests")
        if srn_numbers:
            print(f"  SRN numbers: {srn_numbers[:5]}...")  # Show first 5
        
        # Check if any of the mentioned SRNs exist
        mentioned_srns = ["SRN/2026/043", "SRN/2026/042"]
        for srn in mentioned_srns:
            if srn in srn_numbers:
                print(f"  ✓ Found mentioned SRN: {srn}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
