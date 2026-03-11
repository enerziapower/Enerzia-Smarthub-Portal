"""
IR Thermography Memory-Optimized PDF Generation Tests
Tests for single PDF generation with larger images (230x170) and memory optimization
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIRThermographyMemoryOptimizedPDF:
    """Tests for memory-optimized single PDF generation with larger images"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@enerzia.com", "password": "123456"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        return self.token
    
    def get_auth_headers(self):
        """Get headers with auth token"""
        token = self.get_auth_token()
        return {**self.headers, "Authorization": f"Bearer {token}"}
    
    def test_01_get_ir_thermography_reports(self):
        """Test fetching IR Thermography reports"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200
        reports = response.json()
        assert isinstance(reports, list)
        assert len(reports) > 0, "No IR Thermography reports found"
        
        # Store reports for later tests
        self.reports = reports
        print(f"Found {len(reports)} IR Thermography reports")
        
        # Find specific test reports
        for report in reports:
            items_count = len(report.get('inspection_items', []))
            print(f"  - {report['report_no']}: {items_count} items")
    
    def test_02_small_report_pdf_generation(self):
        """Test PDF generation for small report (5 items) - PRE-TIR/2026/0002"""
        # Get reports
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        reports = response.json()
        
        # Find PRE-TIR/2026/0002
        target_report = None
        for report in reports:
            if report.get('report_no') == 'PRE-TIR/2026/0002':
                target_report = report
                break
        
        assert target_report is not None, "PRE-TIR/2026/0002 not found"
        report_id = target_report['id']
        items_count = len(target_report.get('inspection_items', []))
        print(f"Testing PDF generation for PRE-TIR/2026/0002 ({items_count} items)")
        
        # Start PDF generation
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Failed to start PDF generation: {response.text}"
        
        data = response.json()
        assert 'job_id' in data
        assert data['status'] == 'queued'
        assert data['total_items'] == items_count
        
        job_id = data['job_id']
        print(f"PDF generation started, job_id: {job_id}")
        
        # Poll for completion
        max_attempts = 60
        for i in range(max_attempts):
            time.sleep(2)
            status_response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/status/{job_id}",
                headers=self.get_auth_headers()
            )
            assert status_response.status_code == 200
            
            status_data = status_response.json()
            if status_data['status'] == 'completed':
                print(f"PDF generation completed in {(i+1)*2} seconds")
                print(f"  Filename: {status_data.get('filename')}")
                print(f"  Size: {status_data.get('size_bytes')} bytes ({status_data.get('size_bytes', 0) / 1024 / 1024:.2f} MB)")
                
                # Verify file size is larger due to 230x170 images
                # Expected ~2MB for 5 items with larger images
                assert status_data.get('size_bytes', 0) > 1000000, "PDF size too small - images may not be 230x170"
                return
            elif status_data['status'] == 'failed':
                pytest.fail(f"PDF generation failed: {status_data.get('error')}")
        
        pytest.fail("PDF generation timed out")
    
    def test_03_medium_report_pdf_generation(self):
        """Test PDF generation for medium report (71 items) - PRE-TIR/2026/0010"""
        # Get reports
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        reports = response.json()
        
        # Find PRE-TIR/2026/0010
        target_report = None
        for report in reports:
            if report.get('report_no') == 'PRE-TIR/2026/0010':
                target_report = report
                break
        
        assert target_report is not None, "PRE-TIR/2026/0010 not found"
        report_id = target_report['id']
        items_count = len(target_report.get('inspection_items', []))
        print(f"Testing PDF generation for PRE-TIR/2026/0010 ({items_count} items)")
        
        # Start PDF generation
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Failed to start PDF generation: {response.text}"
        
        data = response.json()
        assert 'job_id' in data
        job_id = data['job_id']
        print(f"PDF generation started, job_id: {job_id}")
        
        # Poll for completion - longer timeout for larger report
        max_attempts = 120
        for i in range(max_attempts):
            time.sleep(2)
            status_response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/status/{job_id}",
                headers=self.get_auth_headers()
            )
            assert status_response.status_code == 200
            
            status_data = status_response.json()
            if status_data['status'] == 'completed':
                print(f"PDF generation completed in {(i+1)*2} seconds")
                print(f"  Filename: {status_data.get('filename')}")
                print(f"  Size: {status_data.get('size_bytes')} bytes ({status_data.get('size_bytes', 0) / 1024 / 1024:.2f} MB)")
                
                # Verify single PDF (no part number in filename)
                filename = status_data.get('filename', '')
                assert 'Part' not in filename, f"Filename should not contain 'Part': {filename}"
                return
            elif status_data['status'] == 'failed':
                pytest.fail(f"PDF generation failed: {status_data.get('error')}")
        
        pytest.fail("PDF generation timed out")
    
    def test_04_pdf_download_works(self):
        """Test that generated PDF can be downloaded"""
        # Get reports
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        reports = response.json()
        
        # Find PRE-TIR/2026/0002
        target_report = None
        for report in reports:
            if report.get('report_no') == 'PRE-TIR/2026/0002':
                target_report = report
                break
        
        assert target_report is not None
        report_id = target_report['id']
        
        # Start PDF generation
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200
        job_id = response.json()['job_id']
        
        # Wait for completion
        for i in range(60):
            time.sleep(2)
            status_response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/status/{job_id}",
                headers=self.get_auth_headers()
            )
            status_data = status_response.json()
            if status_data['status'] == 'completed':
                break
        
        assert status_data['status'] == 'completed', "PDF generation did not complete"
        
        # Download the PDF
        download_response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/download/{job_id}",
            headers=self.get_auth_headers()
        )
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        
        # Verify it's a PDF
        content_type = download_response.headers.get('content-type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Verify file size
        content_length = len(download_response.content)
        print(f"Downloaded PDF size: {content_length} bytes ({content_length / 1024 / 1024:.2f} MB)")
        assert content_length > 500000, "Downloaded PDF too small"
    
    def test_05_no_phased_download_in_api_response(self):
        """Test that API response doesn't include phased download info"""
        # Get reports
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        reports = response.json()
        
        # Find PRE-TIR/2026/0010 (71 items)
        target_report = None
        for report in reports:
            if report.get('report_no') == 'PRE-TIR/2026/0010':
                target_report = report
                break
        
        assert target_report is not None
        report_id = target_report['id']
        
        # Start PDF generation WITHOUT part parameter
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify it's generating full report (part=0 means full report)
        assert data.get('part', 0) == 0, "Should generate full report by default"
        assert data.get('items_in_part') == data.get('total_items'), "Should include all items"
        
        print(f"API response confirms single PDF generation:")
        print(f"  Total items: {data.get('total_items')}")
        print(f"  Items in part: {data.get('items_in_part')}")
        print(f"  Part: {data.get('part')}")
    
    def test_06_lite_mode_for_large_reports(self):
        """Test lite_mode parameter for reports with >80 items"""
        # Get reports
        response = requests.get(
            f"{BASE_URL}/api/test-reports?equipment_type=ir-thermography",
            headers=self.get_auth_headers()
        )
        reports = response.json()
        
        # Find PRE-TIR/2026/0013 (167 items)
        target_report = None
        for report in reports:
            if report.get('report_no') == 'PRE-TIR/2026/0013':
                target_report = report
                break
        
        if target_report is None:
            pytest.skip("PRE-TIR/2026/0013 not found")
        
        report_id = target_report['id']
        items_count = len(target_report.get('inspection_items', []))
        print(f"Testing lite_mode for PRE-TIR/2026/0013 ({items_count} items)")
        
        # Start PDF generation with lite_mode
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate?lite_mode=true",
            headers=self.get_auth_headers()
        )
        assert response.status_code == 200, f"Failed to start PDF generation: {response.text}"
        
        data = response.json()
        assert 'job_id' in data
        print(f"Lite mode PDF generation started, job_id: {data['job_id']}")
    
    def test_07_garbage_collection_in_code(self):
        """Verify garbage collection is implemented in the PDF generation code"""
        import subprocess
        
        # Check if gc.collect() is called in the PDF generation code
        result = subprocess.run(
            ['grep', '-n', 'gc.collect', '/app/backend/routes/ir_thermography_pdf.py'],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0, "gc.collect() not found in ir_thermography_pdf.py"
        print(f"Found gc.collect() calls:")
        print(result.stdout)
    
    def test_08_image_dimensions_in_code(self):
        """Verify image dimensions are set to 230x170"""
        import subprocess
        
        # Check image dimensions in the code
        result = subprocess.run(
            ['grep', '-n', 'img_width = 230\|img_height = 170', '/app/backend/routes/ir_thermography_pdf.py'],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0, "Image dimensions 230x170 not found in code"
        print(f"Found image dimension settings:")
        print(result.stdout)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
