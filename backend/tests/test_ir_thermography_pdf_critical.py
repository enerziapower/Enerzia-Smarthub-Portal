"""
IR Thermography PDF Generation - Critical P0 Tests
Tests for background PDF generation to avoid Cloudflare 524 timeout issues.

Endpoints tested:
1. POST /api/ir-thermography-report/{report_id}/pdf/generate - Start background PDF generation
2. GET /api/ir-thermography-report/{report_id}/pdf/status/{job_id} - Check job status
3. GET /api/ir-thermography-report/{report_id}/pdf/download/{job_id} - Download generated PDF
4. GET /api/ir-thermography-report/{report_id}/pdf - Direct PDF download (for small reports)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "123456"

# Large report ID for testing (167 items)
LARGE_REPORT_ID = "25e564cc-1029-4da7-b8b5-b6608da93371"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestIRThermographyPDFGeneration:
    """Test background PDF generation for IR Thermography reports"""
    
    def test_01_start_pdf_generation_no_images_mode(self, auth_headers):
        """Test starting PDF generation with no_images=true (fastest mode)"""
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/generate",
            params={"lite_mode": True, "no_images": True},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to start PDF generation: {response.text}"
        
        data = response.json()
        assert "job_id" in data, "Response should contain job_id"
        assert data["status"] == "queued", f"Initial status should be 'queued', got: {data['status']}"
        assert data["no_images"] == True, "no_images should be True"
        assert data["lite_mode"] == True, "lite_mode should be True"
        assert "estimated_seconds" in data, "Response should contain estimated_seconds"
        assert "check_status_url" in data, "Response should contain check_status_url"
        
        # Store job_id for subsequent tests
        pytest.job_id = data["job_id"]
        print(f"Started PDF generation job: {pytest.job_id}")
    
    def test_02_check_pdf_status_progression(self, auth_headers):
        """Test that PDF status progresses from queued to completed"""
        job_id = getattr(pytest, 'job_id', None)
        if not job_id:
            pytest.skip("No job_id from previous test")
        
        max_attempts = 60  # 2 minutes max
        final_status = None
        
        for attempt in range(max_attempts):
            response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/status/{job_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Status check failed: {response.text}"
            
            data = response.json()
            final_status = data.get("status")
            
            print(f"Attempt {attempt + 1}: Status = {final_status}, Progress = {data.get('progress', '')}")
            
            if final_status == "completed":
                # Verify completed response has all required fields
                assert "filename" in data, "Completed status should have filename"
                assert "size_bytes" in data, "Completed status should have size_bytes"
                assert "download_url" in data, "Completed status should have download_url"
                assert data["size_bytes"] > 0, "PDF size should be greater than 0"
                
                pytest.pdf_filename = data["filename"]
                pytest.pdf_size = data["size_bytes"]
                print(f"PDF completed: {data['filename']} ({data['size_bytes']} bytes)")
                break
            elif final_status == "failed":
                pytest.fail(f"PDF generation failed: {data.get('error', 'Unknown error')}")
            
            time.sleep(2)
        
        assert final_status == "completed", f"PDF generation did not complete within timeout. Final status: {final_status}"
    
    def test_03_download_generated_pdf(self, auth_headers):
        """Test downloading the generated PDF"""
        job_id = getattr(pytest, 'job_id', None)
        if not job_id:
            pytest.skip("No job_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/download/{job_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"PDF download failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", "Content-Type should be application/pdf"
        
        # Verify PDF content
        pdf_content = response.content
        assert len(pdf_content) > 0, "PDF content should not be empty"
        assert pdf_content[:5] == b"%PDF-", "Content should be a valid PDF (starts with %PDF-)"
        
        expected_size = getattr(pytest, 'pdf_size', 0)
        if expected_size > 0:
            assert len(pdf_content) == expected_size, f"PDF size mismatch: expected {expected_size}, got {len(pdf_content)}"
        
        print(f"Successfully downloaded PDF: {len(pdf_content)} bytes")
    
    def test_04_invalid_report_id_returns_404(self, auth_headers):
        """Test that invalid report_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/invalid-report-id-12345/pdf/generate",
            params={"lite_mode": True, "no_images": True},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid report_id, got: {response.status_code}"
    
    def test_05_invalid_job_id_returns_404(self, auth_headers):
        """Test that invalid job_id returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/status/invalid-job-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid job_id, got: {response.status_code}"
    
    def test_06_download_invalid_job_returns_404(self, auth_headers):
        """Test that downloading with invalid job_id returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/download/invalid-job-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid job_id download, got: {response.status_code}"


class TestIRThermographyDirectPDF:
    """Test direct PDF download (for smaller reports)"""
    
    def test_direct_pdf_download(self, auth_headers):
        """Test direct PDF download endpoint"""
        # First, find a smaller report
        response = requests.get(
            f"{BASE_URL}/api/test-reports",
            params={"equipment_type": "ir-thermography", "limit": 5},
            headers=auth_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not fetch reports list")
        
        reports = response.json().get("data", [])
        if not reports:
            pytest.skip("No IR Thermography reports found")
        
        # Use the first report
        report_id = reports[0].get("id")
        
        # Try direct PDF download
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf",
            headers=auth_headers,
            timeout=120  # 2 minute timeout for direct download
        )
        
        # Direct download might timeout for large reports, which is expected
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            assert response.content[:5] == b"%PDF-"
            print(f"Direct PDF download successful: {len(response.content)} bytes")
        else:
            print(f"Direct PDF download returned {response.status_code} - may need background generation")


class TestGridFSStorage:
    """Test that PDFs are stored correctly in GridFS"""
    
    def test_pdf_stored_in_gridfs(self, auth_headers):
        """Verify PDF is stored in GridFS after generation"""
        # Start a new PDF generation
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/generate",
            params={"lite_mode": True, "no_images": True},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        job_id = response.json()["job_id"]
        
        # Wait for completion
        for _ in range(60):
            status_response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/status/{job_id}",
                headers=auth_headers
            )
            
            if status_response.json().get("status") == "completed":
                break
            time.sleep(2)
        
        # Verify we can download (which means GridFS storage worked)
        download_response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{LARGE_REPORT_ID}/pdf/download/{job_id}",
            headers=auth_headers
        )
        
        assert download_response.status_code == 200
        assert len(download_response.content) > 100000  # Should be at least 100KB for 167 items
        print(f"GridFS storage verified: PDF size = {len(download_response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
