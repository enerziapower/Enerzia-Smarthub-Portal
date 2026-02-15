"""
Test AMC Customer Info, Service Provider, and PDF Enhancement Features
Tests:
1. Customer Info tab fields in AMC form
2. Service Provider tab fields in AMC form
3. AMC save with customer_info and service_provider data
4. AMC PDF contains Contract Value and Payment Terms
5. AMC PDF contains Customer Information section
6. AMC PDF contains Service Provider Information section
7. AMC PDF contains Scope of Work in Section C
8. AMC PDF contains Special Conditions in Section C
"""
import pytest
import requests
import os
import json
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test AMC ID with pre-populated data
TEST_AMC_ID = "b86200a3-163b-4638-8591-2ffc08b89637"


class TestAMCCustomerProviderAPI:
    """Test AMC API for customer_info and service_provider fields"""
    
    def test_01_get_amc_has_customer_info(self):
        """Test that AMC GET returns customer_info fields"""
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        data = response.json()
        assert 'customer_info' in data, "customer_info field missing from AMC response"
        
        customer_info = data['customer_info']
        # Verify all customer_info fields exist
        expected_fields = ['customer_name', 'site_location', 'contact_person', 'contact_number', 'email']
        for field in expected_fields:
            assert field in customer_info, f"customer_info.{field} missing"
        
        # Verify data is populated
        assert customer_info['customer_name'] == "Saama Technologies Pvt Ltd", "customer_name mismatch"
        assert customer_info['site_location'] == "Chennai, Tamil Nadu", "site_location mismatch"
        assert customer_info['contact_person'] == "Rajesh Kumar", "contact_person mismatch"
        assert customer_info['contact_number'] == "+91 98765 43210", "contact_number mismatch"
        assert customer_info['email'] == "rajesh@saama.com", "email mismatch"
        print("PASS: AMC GET returns customer_info with all fields populated")
    
    def test_02_get_amc_has_service_provider(self):
        """Test that AMC GET returns service_provider fields"""
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        data = response.json()
        assert 'service_provider' in data, "service_provider field missing from AMC response"
        
        service_provider = data['service_provider']
        # Verify all service_provider fields exist
        expected_fields = ['company_name', 'address', 'contact_person', 'contact_number', 'email', 'gstin']
        for field in expected_fields:
            assert field in service_provider, f"service_provider.{field} missing"
        
        # Verify data is populated
        assert service_provider['company_name'] == "Enerzia Power Solutions", "company_name mismatch"
        assert "Chennai" in service_provider['address'], "address should contain Chennai"
        assert service_provider['contact_person'] == "Suresh Menon", "contact_person mismatch"
        assert service_provider['contact_number'] == "+91 94567 12345", "contact_number mismatch"
        assert service_provider['email'] == "service@enerzia.com", "email mismatch"
        assert service_provider['gstin'] == "33AABCE1234A1ZV", "gstin mismatch"
        print("PASS: AMC GET returns service_provider with all fields populated")
    
    def test_03_get_amc_has_contract_details(self):
        """Test that AMC GET returns contract_details with new fields"""
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        data = response.json()
        assert 'contract_details' in data, "contract_details field missing from AMC response"
        
        contract = data['contract_details']
        # Verify contract_value and payment_terms exist
        assert 'contract_value' in contract, "contract_value missing"
        assert 'payment_terms' in contract, "payment_terms missing"
        assert 'scope_of_work' in contract, "scope_of_work missing"
        assert 'special_conditions' in contract, "special_conditions missing"
        
        # Verify data is populated
        assert contract['contract_value'] == 250000.0, "contract_value mismatch"
        assert contract['payment_terms'] == "Quarterly advance", "payment_terms mismatch"
        assert "preventive maintenance" in contract['scope_of_work'].lower(), "scope_of_work should contain maintenance info"
        assert "24/7" in contract['special_conditions'], "special_conditions should contain 24/7 support"
        print("PASS: AMC GET returns contract_details with contract_value, payment_terms, scope_of_work, special_conditions")
    
    def test_04_update_amc_customer_info(self):
        """Test updating AMC with new customer_info data"""
        # First get current data
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200
        original_data = response.json()
        
        # Update customer_info
        update_payload = {
            "customer_info": {
                "customer_name": "TEST_Updated Customer Name",
                "site_location": "TEST_Updated Location",
                "contact_person": "TEST_Updated Contact",
                "contact_number": "+91 11111 11111",
                "email": "test_updated@example.com"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/amc/{TEST_AMC_ID}", json=update_payload)
        assert response.status_code == 200, f"Failed to update AMC: {response.text}"
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200
        updated_data = response.json()
        
        assert updated_data['customer_info']['customer_name'] == "TEST_Updated Customer Name"
        assert updated_data['customer_info']['site_location'] == "TEST_Updated Location"
        print("PASS: AMC customer_info update works correctly")
        
        # Restore original data
        restore_payload = {
            "customer_info": original_data['customer_info']
        }
        requests.put(f"{BASE_URL}/api/amc/{TEST_AMC_ID}", json=restore_payload)
    
    def test_05_update_amc_service_provider(self):
        """Test updating AMC with new service_provider data"""
        # First get current data
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200
        original_data = response.json()
        
        # Update service_provider
        update_payload = {
            "service_provider": {
                "company_name": "TEST_Updated Company",
                "address": "TEST_Updated Address",
                "contact_person": "TEST_Updated SP Contact",
                "contact_number": "+91 22222 22222",
                "email": "test_sp@example.com",
                "gstin": "TEST123456789"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/amc/{TEST_AMC_ID}", json=update_payload)
        assert response.status_code == 200, f"Failed to update AMC: {response.text}"
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/amc/{TEST_AMC_ID}")
        assert response.status_code == 200
        updated_data = response.json()
        
        assert updated_data['service_provider']['company_name'] == "TEST_Updated Company"
        assert updated_data['service_provider']['gstin'] == "TEST123456789"
        print("PASS: AMC service_provider update works correctly")
        
        # Restore original data
        restore_payload = {
            "service_provider": original_data['service_provider']
        }
        requests.put(f"{BASE_URL}/api/amc/{TEST_AMC_ID}", json=restore_payload)


class TestAMCPDFContent:
    """Test AMC PDF generation includes all required sections"""
    
    def test_06_pdf_download_works(self):
        """Test that AMC PDF can be downloaded"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200, f"Failed to download PDF: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Response is not a PDF"
        assert len(response.content) > 1000, "PDF content too small"
        print(f"PASS: AMC PDF downloaded successfully ({len(response.content)} bytes)")
    
    def test_07_pdf_contains_contract_value(self):
        """Test that PDF contains Contract Value in Document Information section"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        # Use PyPDF2 to extract text
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            
            # Check for Contract Value
            assert 'CONTRACT VALUE' in pdf_text.upper() or '250,000' in pdf_text or '₹' in pdf_text, \
                f"Contract Value not found in PDF. PDF text sample: {pdf_text[:500]}"
            print("PASS: PDF contains Contract Value")
        finally:
            os.unlink(pdf_path)
    
    def test_08_pdf_contains_payment_terms(self):
        """Test that PDF contains Payment Terms in Document Information section"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            
            # Check for Payment Terms
            assert 'PAYMENT TERMS' in pdf_text.upper() or 'Quarterly advance' in pdf_text, \
                f"Payment Terms not found in PDF. PDF text sample: {pdf_text[:500]}"
            print("PASS: PDF contains Payment Terms")
        finally:
            os.unlink(pdf_path)
    
    def test_09_pdf_contains_customer_information_section(self):
        """Test that PDF contains Customer Information section with all fields"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            pdf_text_upper = pdf_text.upper()
            
            # Check for Customer Information section
            assert 'CUSTOMER INFORMATION' in pdf_text_upper or 'CUSTOMER NAME' in pdf_text_upper, \
                f"Customer Information section not found in PDF. PDF text sample: {pdf_text[:500]}"
            
            # Check for customer fields
            assert 'SITE LOCATION' in pdf_text_upper, "Site Location field not found in PDF"
            assert 'CONTACT PERSON' in pdf_text_upper, "Contact Person field not found in PDF"
            assert 'CONTACT NUMBER' in pdf_text_upper, "Contact Number field not found in PDF"
            
            print("PASS: PDF contains Customer Information section with all fields")
        finally:
            os.unlink(pdf_path)
    
    def test_10_pdf_contains_service_provider_section(self):
        """Test that PDF contains Service Provider Information section with all fields"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            pdf_text_upper = pdf_text.upper()
            
            # Check for Service Provider Information section
            assert 'SERVICE PROVIDER' in pdf_text_upper, \
                f"Service Provider section not found in PDF. PDF text sample: {pdf_text[:500]}"
            
            # Check for service provider fields
            assert 'COMPANY NAME' in pdf_text_upper, "Company Name field not found in PDF"
            assert 'ADDRESS' in pdf_text_upper, "Address field not found in PDF"
            assert 'GSTIN' in pdf_text_upper, "GSTIN field not found in PDF"
            
            print("PASS: PDF contains Service Provider Information section with all fields")
        finally:
            os.unlink(pdf_path)
    
    def test_11_pdf_contains_scope_of_work(self):
        """Test that PDF contains Scope of Work in Section C"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            pdf_text_upper = pdf_text.upper()
            
            # Check for Section C: Scope & Objective
            assert 'SECTION' in pdf_text_upper and 'SCOPE' in pdf_text_upper, \
                f"Scope section not found in PDF. PDF text sample: {pdf_text[:500]}"
            
            # Check for actual scope content
            pdf_text_lower = pdf_text.lower()
            assert 'preventive maintenance' in pdf_text_lower or 'maintenance' in pdf_text_lower, \
                "Scope of Work content not found in PDF"
            
            print("PASS: PDF contains Scope of Work in Section C")
        finally:
            os.unlink(pdf_path)
    
    def test_12_pdf_contains_special_conditions(self):
        """Test that PDF contains Special Conditions in Section C"""
        response = requests.get(f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf")
        assert response.status_code == 200
        
        from PyPDF2 import PdfReader
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            pdf_path = f.name
        
        try:
            reader = PdfReader(pdf_path)
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
            
            # Check for Special Conditions
            assert 'Special Conditions' in pdf_text or 'SPECIAL CONDITIONS' in pdf_text.upper(), \
                f"Special Conditions section not found in PDF. PDF text sample: {pdf_text[:500]}"
            
            # Check for actual special conditions content
            assert '24/7' in pdf_text or 'emergency' in pdf_text.lower(), \
                "Special Conditions content not found in PDF"
            
            print("PASS: PDF contains Special Conditions in Section C")
        finally:
            os.unlink(pdf_path)


class TestAMCPydanticModels:
    """Test that Pydantic models accept all required fields"""
    
    def test_13_create_amc_with_all_fields(self):
        """Test creating a new AMC with customer_info and service_provider"""
        # First get a valid project_id
        response = requests.get(f"{BASE_URL}/api/projects?limit=1")
        assert response.status_code == 200
        projects = response.json()
        if isinstance(projects, dict):
            projects = projects.get('projects', [])
        if not projects:
            pytest.skip("No projects available for testing")
        
        project_id = projects[0]['id']
        
        # Create AMC with all new fields
        create_payload = {
            "project_id": project_id,
            "contract_details": {
                "contract_no": "TEST-AMC-001",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "contract_value": 100000.0,
                "payment_terms": "Monthly",
                "scope_of_work": "Test scope of work",
                "special_conditions": "Test special conditions"
            },
            "customer_info": {
                "customer_name": "TEST_Customer",
                "site_location": "TEST_Location",
                "contact_person": "TEST_Contact",
                "contact_number": "1234567890",
                "email": "test@test.com"
            },
            "service_provider": {
                "company_name": "TEST_Provider",
                "address": "TEST_Address",
                "contact_person": "TEST_SP_Contact",
                "contact_number": "0987654321",
                "email": "sp@test.com",
                "gstin": "TEST_GSTIN"
            },
            "status": "active"
        }
        
        response = requests.post(f"{BASE_URL}/api/amc", json=create_payload)
        assert response.status_code == 200, f"Failed to create AMC: {response.text}"
        
        created_amc = response.json()
        assert 'id' in created_amc, "Created AMC should have an id"
        
        # Verify all fields were saved
        assert created_amc['customer_info']['customer_name'] == "TEST_Customer"
        assert created_amc['service_provider']['company_name'] == "TEST_Provider"
        assert created_amc['contract_details']['contract_value'] == 100000.0
        
        print(f"PASS: Created AMC with all fields, id: {created_amc['id']}")
        
        # Cleanup - delete the test AMC
        delete_response = requests.delete(f"{BASE_URL}/api/amc/{created_amc['id']}")
        assert delete_response.status_code == 200, "Failed to cleanup test AMC"
        print("PASS: Test AMC cleaned up successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
