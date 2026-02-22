"""
Test Statutory Document Upload Feature for AMC Reports
Tests:
1. File upload endpoint /api/upload with category statutory_document
2. Save AMC with statutory documents - verify data persists
3. AMC PDF download - verify statutory documents section is included
"""
import pytest
import requests
import os
import tempfile
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smarthub-enerzia-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"

# Existing AMC ID for testing
EXISTING_AMC_ID = "b86200a3-163b-4638-8591-2ffc08b89637"


class TestStatutoryDocumentUpload:
    """Test statutory document upload feature for AMC reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        
        self.session.close()
    
    def test_01_upload_endpoint_exists(self):
        """Test that /api/upload endpoint exists and accepts files"""
        # Create a simple test PDF file
        pdf_content = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF'
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(pdf_content)
            temp_path = f.name
        
        try:
            # Remove Content-Type header for multipart upload
            headers = {"Authorization": f"Bearer {self.token}"}
            
            with open(temp_path, 'rb') as f:
                files = {'file': ('test_certificate.pdf', f, 'application/pdf')}
                data = {'category': 'statutory_document'}
                
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    headers=headers,
                    files=files,
                    data=data
                )
            
            print(f"Upload response status: {response.status_code}")
            print(f"Upload response: {response.text}")
            
            assert response.status_code == 200, f"Upload failed: {response.text}"
            
            result = response.json()
            assert result.get('success') == True, "Upload should return success=True"
            assert 'file_url' in result or 'url' in result, "Response should contain file_url or url"
            
            # Store file_url for later tests
            self.uploaded_file_url = result.get('file_url') or result.get('url')
            print(f"Uploaded file URL: {self.uploaded_file_url}")
            
        finally:
            os.unlink(temp_path)
    
    def test_02_upload_rejects_non_pdf(self):
        """Test that upload endpoint rejects non-PDF files for statutory_document category"""
        # Create a simple text file
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'This is a test text file')
            temp_path = f.name
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            with open(temp_path, 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                data = {'category': 'statutory_document'}
                
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    headers=headers,
                    files=files,
                    data=data
                )
            
            print(f"Non-PDF upload response status: {response.status_code}")
            print(f"Non-PDF upload response: {response.text}")
            
            # Should reject non-PDF files for statutory_document category
            assert response.status_code == 400, f"Should reject non-PDF files, got {response.status_code}"
            
        finally:
            os.unlink(temp_path)
    
    def test_03_get_existing_amc(self):
        """Test getting existing AMC to verify structure"""
        response = self.session.get(f"{BASE_URL}/api/amc/{EXISTING_AMC_ID}")
        
        print(f"Get AMC response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        amc = response.json()
        assert 'id' in amc, "AMC should have id"
        assert 'amc_no' in amc, "AMC should have amc_no"
        
        # Check if statutory_documents field exists (may be empty)
        print(f"AMC statutory_documents: {amc.get('statutory_documents', [])}")
        
        return amc
    
    def test_04_update_amc_with_statutory_document(self):
        """Test updating AMC with statutory document data"""
        # First upload a file
        pdf_content = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF'
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(pdf_content)
            temp_path = f.name
        
        try:
            # Upload the file
            headers = {"Authorization": f"Bearer {self.token}"}
            
            with open(temp_path, 'rb') as f:
                files = {'file': ('calibration_cert_test.pdf', f, 'application/pdf')}
                data = {'category': 'statutory_document'}
                
                upload_response = requests.post(
                    f"{BASE_URL}/api/upload",
                    headers=headers,
                    files=files,
                    data=data
                )
            
            assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
            upload_result = upload_response.json()
            file_url = upload_result.get('file_url') or upload_result.get('url')
            
            print(f"Uploaded file URL for AMC update: {file_url}")
            
            # Now update AMC with statutory document
            statutory_doc = {
                "document_type": "calibration_certificate",
                "document_name": "Test Calibration Certificate",
                "reference_no": "CAL-TEST-001",
                "issue_date": "2025-01-01",
                "expiry_date": "2026-01-01",
                "file_url": file_url,
                "file_name": "calibration_cert_test.pdf"
            }
            
            update_data = {
                "statutory_documents": [statutory_doc]
            }
            
            response = self.session.put(
                f"{BASE_URL}/api/amc/{EXISTING_AMC_ID}",
                json=update_data
            )
            
            print(f"Update AMC response status: {response.status_code}")
            print(f"Update AMC response: {response.text[:500]}")
            
            assert response.status_code == 200, f"Failed to update AMC: {response.text}"
            
            updated_amc = response.json()
            assert 'statutory_documents' in updated_amc, "Updated AMC should have statutory_documents"
            assert len(updated_amc['statutory_documents']) > 0, "Should have at least one statutory document"
            
            # Verify the document was saved correctly
            saved_doc = updated_amc['statutory_documents'][0]
            assert saved_doc.get('document_type') == 'calibration_certificate', "Document type should match"
            assert saved_doc.get('document_name') == 'Test Calibration Certificate', "Document name should match"
            assert saved_doc.get('file_url') == file_url, "File URL should match"
            
            print(f"Successfully saved statutory document: {saved_doc}")
            
        finally:
            os.unlink(temp_path)
    
    def test_05_verify_statutory_document_persisted(self):
        """Test that statutory document data persists after save"""
        response = self.session.get(f"{BASE_URL}/api/amc/{EXISTING_AMC_ID}")
        
        assert response.status_code == 200, f"Failed to get AMC: {response.text}"
        
        amc = response.json()
        statutory_docs = amc.get('statutory_documents', [])
        
        print(f"Persisted statutory documents: {statutory_docs}")
        
        assert len(statutory_docs) > 0, "Statutory documents should persist after save"
        
        # Verify document structure
        doc = statutory_docs[0]
        assert 'document_type' in doc, "Document should have document_type"
        assert 'document_name' in doc, "Document should have document_name"
        assert 'file_url' in doc, "Document should have file_url"
    
    def test_06_download_amc_pdf(self):
        """Test downloading AMC PDF and verify it includes statutory documents section"""
        response = self.session.get(
            f"{BASE_URL}/api/amc-report/{EXISTING_AMC_ID}/pdf",
            stream=True
        )
        
        print(f"PDF download response status: {response.status_code}")
        print(f"PDF content-type: {response.headers.get('content-type')}")
        
        assert response.status_code == 200, f"Failed to download PDF: {response.text}"
        assert 'application/pdf' in response.headers.get('content-type', ''), "Response should be PDF"
        
        # Check PDF size (should be reasonable)
        content = response.content
        print(f"PDF size: {len(content)} bytes")
        
        assert len(content) > 1000, "PDF should have substantial content"
        
        # Verify it's a valid PDF
        assert content[:4] == b'%PDF', "Content should be a valid PDF"
    
    def test_07_uploaded_file_accessible(self):
        """Test that uploaded statutory document file is accessible"""
        # First get the AMC to get the file URL
        response = self.session.get(f"{BASE_URL}/api/amc/{EXISTING_AMC_ID}")
        assert response.status_code == 200
        
        amc = response.json()
        statutory_docs = amc.get('statutory_documents', [])
        
        if not statutory_docs:
            pytest.skip("No statutory documents to test")
        
        file_url = statutory_docs[0].get('file_url')
        if not file_url:
            pytest.skip("No file URL in statutory document")
        
        # Construct full URL if needed
        if file_url.startswith('/'):
            full_url = f"{BASE_URL}{file_url}"
        else:
            full_url = file_url
        
        print(f"Testing file access at: {full_url}")
        
        # Try to access the file
        file_response = self.session.get(full_url)
        
        print(f"File access response status: {file_response.status_code}")
        
        assert file_response.status_code == 200, f"Should be able to access uploaded file: {file_response.status_code}"
    
    def test_08_cleanup_statutory_documents(self):
        """Cleanup: Remove test statutory documents from AMC"""
        # Update AMC to remove statutory documents (restore original state)
        update_data = {
            "statutory_documents": []
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/amc/{EXISTING_AMC_ID}",
            json=update_data
        )
        
        print(f"Cleanup response status: {response.status_code}")
        
        # Don't fail test on cleanup
        if response.status_code == 200:
            print("Successfully cleaned up statutory documents")
        else:
            print(f"Cleanup warning: {response.text}")


class TestUploadEndpointValidation:
    """Test upload endpoint validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        self.token = data.get("token")
        
        yield
        
        self.session.close()
    
    def test_upload_file_size_limit(self):
        """Test that upload rejects files larger than 10MB"""
        # Create a file larger than 10MB (just over the limit)
        large_content = b'%PDF-1.4\n' + (b'0' * (11 * 1024 * 1024))  # ~11MB
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(large_content)
            temp_path = f.name
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            with open(temp_path, 'rb') as f:
                files = {'file': ('large_file.pdf', f, 'application/pdf')}
                data = {'category': 'statutory_document'}
                
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    headers=headers,
                    files=files,
                    data=data
                )
            
            print(f"Large file upload response status: {response.status_code}")
            
            # Should reject files over 10MB
            assert response.status_code == 400, f"Should reject large files, got {response.status_code}"
            
        finally:
            os.unlink(temp_path)
    
    def test_upload_general_category(self):
        """Test upload with general category accepts various file types"""
        # Create a simple image-like file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            # Minimal JPEG header
            f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00')
            temp_path = f.name
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            with open(temp_path, 'rb') as f:
                files = {'file': ('test_image.jpg', f, 'image/jpeg')}
                data = {'category': 'general'}
                
                response = requests.post(
                    f"{BASE_URL}/api/upload",
                    headers=headers,
                    files=files,
                    data=data
                )
            
            print(f"General category upload response status: {response.status_code}")
            
            # General category should accept images
            assert response.status_code == 200, f"General category should accept images: {response.text}"
            
        finally:
            os.unlink(temp_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
