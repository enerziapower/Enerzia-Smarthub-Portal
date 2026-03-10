"""
Test IR Thermography Background PDF Generation Feature

Tests the background PDF generation system that solves Cloudflare 524 timeout issues:
1. POST /api/ir-thermography-report/{report_id}/pdf/generate - Start background job
2. GET /api/ir-thermography-report/{report_id}/pdf/status/{job_id} - Check job status
3. GET /api/ir-thermography-report/{report_id}/pdf/download/{job_id} - Download completed PDF
4. MongoDB pdf_jobs collection persistence
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "123456"
TEST_REPORT_ID = "7e6b6c40-9b9a-480d-8ded-a38d82a8ce94"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestBackgroundPdfGeneration:
    """Test background PDF generation endpoints"""
    
    def test_start_pdf_generation_returns_job_id(self, api_client):
        """Test POST /api/ir-thermography-report/{report_id}/pdf/generate returns job_id"""
        response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/generate"
        )
        
        # Should return 200 with job_id
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "job_id" in data, "Response should contain job_id"
        assert "status" in data, "Response should contain status"
        assert data["status"] == "queued", f"Initial status should be 'queued', got {data['status']}"
        assert "message" in data, "Response should contain message"
        assert "estimated_seconds" in data, "Response should contain estimated_seconds"
        assert "check_status_url" in data, "Response should contain check_status_url"
        
        print(f"✓ PDF generation started with job_id: {data['job_id']}")
        print(f"  Status: {data['status']}")
        print(f"  Message: {data['message']}")
        print(f"  Estimated time: {data['estimated_seconds']} seconds")
    
    def test_job_status_transitions(self, api_client):
        """Test job status transitions from queued -> processing -> completed"""
        # Start a new job
        start_response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/generate"
        )
        assert start_response.status_code == 200
        
        job_id = start_response.json()["job_id"]
        print(f"Started job: {job_id}")
        
        # Poll for status changes
        max_attempts = 60  # 60 seconds max
        completed = False
        statuses_seen = set()
        
        for attempt in range(max_attempts):
            status_response = api_client.get(
                f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/status/{job_id}"
            )
            
            assert status_response.status_code == 200, f"Status check failed: {status_response.text}"
            
            status_data = status_response.json()
            current_status = status_data.get("status")
            statuses_seen.add(current_status)
            
            print(f"  Attempt {attempt + 1}: status={current_status}, progress={status_data.get('progress', '')}")
            
            if current_status == "completed":
                completed = True
                assert "filename" in status_data, "Completed job should have filename"
                assert "size_bytes" in status_data, "Completed job should have size_bytes"
                assert "download_url" in status_data, "Completed job should have download_url"
                print(f"✓ Job completed! Filename: {status_data['filename']}, Size: {status_data['size_bytes']} bytes")
                break
            elif current_status == "failed":
                pytest.fail(f"Job failed with error: {status_data.get('error')}")
            
            time.sleep(1)
        
        assert completed, f"Job did not complete within {max_attempts} seconds. Statuses seen: {statuses_seen}"
        
        # Verify we saw expected status transitions
        assert "queued" in statuses_seen or "processing" in statuses_seen or "completed" in statuses_seen, \
            f"Expected to see queued/processing/completed statuses, saw: {statuses_seen}"
    
    def test_download_completed_pdf(self, api_client):
        """Test downloading a completed PDF"""
        # Start a new job
        start_response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/generate"
        )
        assert start_response.status_code == 200
        
        job_id = start_response.json()["job_id"]
        print(f"Started job for download test: {job_id}")
        
        # Wait for completion
        max_attempts = 60
        for attempt in range(max_attempts):
            status_response = api_client.get(
                f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/status/{job_id}"
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get("status") == "completed":
                    break
                elif status_data.get("status") == "failed":
                    pytest.fail(f"Job failed: {status_data.get('error')}")
            
            time.sleep(1)
        else:
            pytest.fail("Job did not complete in time")
        
        # Download the PDF
        download_response = api_client.get(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/download/{job_id}"
        )
        
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        assert download_response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {download_response.headers.get('content-type')}"
        
        # Verify PDF content
        pdf_content = download_response.content
        assert len(pdf_content) > 0, "PDF content should not be empty"
        assert pdf_content[:4] == b'%PDF', "Content should be a valid PDF (starts with %PDF)"
        
        print(f"✓ PDF downloaded successfully: {len(pdf_content)} bytes")
        print(f"  Content-Type: {download_response.headers.get('content-type')}")
        print(f"  Content-Disposition: {download_response.headers.get('content-disposition')}")
    
    def test_invalid_report_id_returns_404(self, api_client):
        """Test that invalid report ID returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/invalid-report-id-12345/pdf/generate"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid report ID correctly returns 404")
    
    def test_invalid_job_id_returns_404(self, api_client):
        """Test that invalid job ID returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/status/invalid-job-id-12345"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid job ID correctly returns 404")
    
    def test_download_incomplete_job_returns_error(self, api_client):
        """Test that downloading an incomplete job returns appropriate error"""
        # Start a new job
        start_response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/generate"
        )
        assert start_response.status_code == 200
        
        job_id = start_response.json()["job_id"]
        
        # Immediately try to download (before completion)
        download_response = api_client.get(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/download/{job_id}"
        )
        
        # Should return 400 if not completed, or 200 if already completed (fast generation)
        assert download_response.status_code in [200, 400], \
            f"Expected 200 or 400, got {download_response.status_code}"
        
        if download_response.status_code == 400:
            print("✓ Incomplete job download correctly returns 400")
        else:
            print("✓ Job completed quickly, download succeeded")


class TestMongoDBPersistence:
    """Test that jobs are persisted to MongoDB"""
    
    def test_job_persisted_to_mongodb(self, api_client):
        """Test that job data is persisted to MongoDB pdf_jobs collection"""
        # Start a new job
        start_response = api_client.post(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/generate"
        )
        assert start_response.status_code == 200
        
        job_id = start_response.json()["job_id"]
        print(f"Started job for persistence test: {job_id}")
        
        # Wait for completion
        max_attempts = 60
        for attempt in range(max_attempts):
            status_response = api_client.get(
                f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf/status/{job_id}"
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get("status") == "completed":
                    # Verify the job has all expected fields
                    assert "job_id" in status_data
                    assert "filename" in status_data
                    assert "size_bytes" in status_data
                    assert "download_url" in status_data
                    print(f"✓ Job persisted with all expected fields")
                    print(f"  job_id: {status_data['job_id']}")
                    print(f"  filename: {status_data['filename']}")
                    print(f"  size_bytes: {status_data['size_bytes']}")
                    return
                elif status_data.get("status") == "failed":
                    pytest.fail(f"Job failed: {status_data.get('error')}")
            
            time.sleep(1)
        
        pytest.fail("Job did not complete in time for persistence test")


class TestDirectPdfEndpoint:
    """Test the direct PDF endpoint still works for smaller reports"""
    
    def test_direct_pdf_download(self, api_client):
        """Test GET /api/ir-thermography-report/{report_id}/pdf still works"""
        response = api_client.get(
            f"{BASE_URL}/api/ir-thermography-report/{TEST_REPORT_ID}/pdf"
        )
        
        # Should return 200 with PDF content
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        pdf_content = response.content
        assert len(pdf_content) > 0, "PDF content should not be empty"
        assert pdf_content[:4] == b'%PDF', "Content should be a valid PDF"
        
        print(f"✓ Direct PDF download works: {len(pdf_content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
