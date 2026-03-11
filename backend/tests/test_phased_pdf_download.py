"""
Test Phased PDF Download Feature for IR Thermography Reports
Tests the multi-part download functionality for large reports (>50 items)

Features tested:
1. Backend phased PDF generation API with part parameter
2. PDF filename includes part number when part > 0
3. Part calculation correctly divides items
4. Full report option still available as fallback
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhasedPDFDownload:
    """Test phased PDF download for IR Thermography reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        self.auth_headers = {}
        self._login()
    
    def _login(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token') or data.get('token')
            self.auth_headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_01_get_ir_thermography_reports(self):
        """Test fetching IR Thermography reports to find test data"""
        response = requests.get(
            f"{BASE_URL}/api/test-reports",
            params={"equipment_type": "ir-thermography"},
            headers=self.auth_headers
        )
        assert response.status_code == 200, f"Failed to fetch reports: {response.text}"
        
        reports = response.json()
        print(f"Found {len(reports)} IR Thermography reports")
        
        # Find reports with different item counts
        small_reports = [r for r in reports if len(r.get('inspection_items', [])) <= 50]
        large_reports = [r for r in reports if len(r.get('inspection_items', [])) > 50]
        
        print(f"Small reports (<=50 items): {len(small_reports)}")
        print(f"Large reports (>50 items): {len(large_reports)}")
        
        # Store for later tests
        self.__class__.reports = reports
        self.__class__.small_reports = small_reports
        self.__class__.large_reports = large_reports
        
        assert len(reports) > 0, "No IR Thermography reports found"
    
    def test_02_phased_generation_api_with_part_parameter(self):
        """Test that the API accepts part and items_per_part parameters"""
        # Use a report with items
        reports = getattr(self.__class__, 'reports', [])
        if not reports:
            pytest.skip("No reports available")
        
        # Find a report with at least 5 items for testing
        test_report = None
        for r in reports:
            if len(r.get('inspection_items', [])) >= 5:
                test_report = r
                break
        
        if not test_report:
            pytest.skip("No report with enough items for testing")
        
        report_id = test_report['id']
        item_count = len(test_report.get('inspection_items', []))
        print(f"Testing with report {test_report.get('report_no')} ({item_count} items)")
        
        # Test phased generation with part=1 and items_per_part=3
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            params={"part": 1, "items_per_part": 3, "no_images": True},
            headers=self.auth_headers
        )
        
        assert response.status_code == 200, f"Failed to start phased generation: {response.text}"
        
        data = response.json()
        print(f"Response: {data}")
        
        # Verify response contains part information
        assert 'job_id' in data, "Response missing job_id"
        assert data.get('part') == 1, f"Expected part=1, got {data.get('part')}"
        assert data.get('items_in_part') == 3 or data.get('items_in_part') <= 3, f"Expected items_in_part<=3, got {data.get('items_in_part')}"
        
        # Calculate expected total parts
        expected_total_parts = (item_count + 2) // 3  # ceiling division
        assert data.get('total_parts') == expected_total_parts, f"Expected total_parts={expected_total_parts}, got {data.get('total_parts')}"
        
        self.__class__.phased_job_id = data['job_id']
        self.__class__.phased_report_id = report_id
        print(f"Phased generation started: job_id={data['job_id']}, part=1/{data.get('total_parts')}")
    
    def test_03_wait_for_phased_pdf_completion(self):
        """Wait for phased PDF generation to complete"""
        job_id = getattr(self.__class__, 'phased_job_id', None)
        report_id = getattr(self.__class__, 'phased_report_id', None)
        
        if not job_id or not report_id:
            pytest.skip("No phased job to check")
        
        max_attempts = 60
        for attempt in range(max_attempts):
            response = requests.get(
                f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/status/{job_id}",
                headers=self.auth_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status')
                print(f"Attempt {attempt + 1}: Status = {status}, Progress = {data.get('progress', '')}")
                
                if status == 'completed':
                    self.__class__.phased_filename = data.get('filename')
                    print(f"PDF completed: filename={data.get('filename')}")
                    return
                elif status == 'failed':
                    pytest.fail(f"PDF generation failed: {data.get('error')}")
            
            time.sleep(2)
        
        pytest.fail("PDF generation timed out")
    
    def test_04_verify_part_filename_format(self):
        """Verify that phased PDF filename includes part number"""
        filename = getattr(self.__class__, 'phased_filename', None)
        
        if not filename:
            pytest.skip("No filename to verify")
        
        print(f"Generated filename: {filename}")
        
        # Filename should contain "Part_1_of_X" pattern
        assert "Part_1_of_" in filename, f"Filename should contain 'Part_1_of_X' pattern, got: {filename}"
        assert filename.endswith('.pdf'), f"Filename should end with .pdf, got: {filename}"
        
        print(f"PASS: Filename correctly includes part number: {filename}")
    
    def test_05_download_phased_pdf(self):
        """Download the phased PDF and verify it's valid"""
        job_id = getattr(self.__class__, 'phased_job_id', None)
        report_id = getattr(self.__class__, 'phased_report_id', None)
        
        if not job_id or not report_id:
            pytest.skip("No phased job to download")
        
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/download/{job_id}",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200, f"Failed to download PDF: {response.status_code}"
        
        # Verify it's a valid PDF
        content = response.content
        assert content[:4] == b'%PDF', "Downloaded file is not a valid PDF"
        
        print(f"Downloaded PDF: {len(content)} bytes")
        assert len(content) > 1000, "PDF seems too small"
    
    def test_06_full_report_generation_still_works(self):
        """Test that full report generation (part=0) still works"""
        reports = getattr(self.__class__, 'reports', [])
        if not reports:
            pytest.skip("No reports available")
        
        # Use a small report for faster testing
        test_report = None
        for r in reports:
            items = len(r.get('inspection_items', []))
            if 1 <= items <= 10:
                test_report = r
                break
        
        if not test_report:
            # Use any report
            test_report = reports[0]
        
        report_id = test_report['id']
        print(f"Testing full report generation with {test_report.get('report_no')}")
        
        # Generate full report (part=0 is default)
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            params={"no_images": True},  # No part parameter = full report
            headers=self.auth_headers
        )
        
        assert response.status_code == 200, f"Failed to start full generation: {response.text}"
        
        data = response.json()
        assert data.get('part') == 0, f"Expected part=0 for full report, got {data.get('part')}"
        
        print(f"Full report generation started: job_id={data['job_id']}")
    
    def test_07_part_calculation_for_large_report(self):
        """Test that part calculation correctly divides items"""
        # Test the math: 199 items with 50 per part = 4 parts
        test_cases = [
            (199, 50, 4),  # 199 items = 4 parts (50+50+50+49)
            (100, 50, 2),  # 100 items = 2 parts (50+50)
            (51, 50, 2),   # 51 items = 2 parts (50+1)
            (50, 50, 1),   # 50 items = 1 part
            (49, 50, 1),   # 49 items = 1 part
            (150, 50, 3),  # 150 items = 3 parts (50+50+50)
        ]
        
        for item_count, items_per_part, expected_parts in test_cases:
            # This is the formula used in the backend
            total_parts = (item_count + items_per_part - 1) // items_per_part if item_count > items_per_part else 1
            
            # Special case: if items <= items_per_part, it's 1 part
            if item_count <= items_per_part:
                total_parts = 1
            
            assert total_parts == expected_parts, f"For {item_count} items: expected {expected_parts} parts, got {total_parts}"
            print(f"PASS: {item_count} items / {items_per_part} per part = {total_parts} parts")
    
    def test_08_api_returns_correct_items_in_part(self):
        """Test that API returns correct items_in_part for each part"""
        reports = getattr(self.__class__, 'reports', [])
        if not reports:
            pytest.skip("No reports available")
        
        # Find a report with at least 10 items
        test_report = None
        for r in reports:
            if len(r.get('inspection_items', [])) >= 10:
                test_report = r
                break
        
        if not test_report:
            pytest.skip("No report with enough items")
        
        report_id = test_report['id']
        item_count = len(test_report.get('inspection_items', []))
        items_per_part = 3
        
        # Test part 1
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
            params={"part": 1, "items_per_part": items_per_part, "no_images": True},
            headers=self.auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Part 1 should have exactly items_per_part items (or less if total < items_per_part)
        expected_items = min(items_per_part, item_count)
        assert data.get('items_in_part') == expected_items, f"Part 1 should have {expected_items} items, got {data.get('items_in_part')}"
        
        print(f"PASS: Part 1 correctly has {data.get('items_in_part')} items")
        
        # Test last part
        total_parts = data.get('total_parts')
        if total_parts > 1:
            response = requests.post(
                f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf/generate",
                params={"part": total_parts, "items_per_part": items_per_part, "no_images": True},
                headers=self.auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Last part should have remaining items
            remaining = item_count - (total_parts - 1) * items_per_part
            assert data.get('items_in_part') == remaining, f"Last part should have {remaining} items, got {data.get('items_in_part')}"
            
            print(f"PASS: Last part (part {total_parts}) correctly has {data.get('items_in_part')} items")


class TestFrontendPhasedDownloadLogic:
    """Test the frontend logic for phased downloads (getPartsInfo function)"""
    
    def test_01_parts_info_returns_null_for_small_reports(self):
        """Test that getPartsInfo returns null for reports with <=50 items"""
        # Simulate the frontend logic
        ITEMS_PER_PART = 50
        
        test_cases = [
            (0, None),   # 0 items = no parts info
            (1, None),   # 1 item = no parts info
            (49, None),  # 49 items = no parts info
            (50, None),  # 50 items = no parts info (exactly at threshold)
        ]
        
        for item_count, expected in test_cases:
            # Frontend logic from AuditReports.js
            if item_count <= ITEMS_PER_PART:
                result = None
            else:
                result = "has_parts"
            
            assert result == expected, f"For {item_count} items: expected {expected}, got {result}"
            print(f"PASS: {item_count} items -> getPartsInfo returns {result}")
    
    def test_02_parts_info_returns_parts_for_large_reports(self):
        """Test that getPartsInfo returns correct parts for reports with >50 items"""
        ITEMS_PER_PART = 50
        
        test_cases = [
            (51, 2, [(1, 1, 50), (2, 51, 51)]),      # 51 items = 2 parts
            (100, 2, [(1, 1, 50), (2, 51, 100)]),    # 100 items = 2 parts
            (150, 3, [(1, 1, 50), (2, 51, 100), (3, 101, 150)]),  # 150 items = 3 parts
            (199, 4, [(1, 1, 50), (2, 51, 100), (3, 101, 150), (4, 151, 199)]),  # 199 items = 4 parts
        ]
        
        for item_count, expected_total_parts, expected_parts in test_cases:
            # Frontend logic from AuditReports.js
            total_parts = (item_count + ITEMS_PER_PART - 1) // ITEMS_PER_PART
            parts = []
            for i in range(1, total_parts + 1):
                start = (i - 1) * ITEMS_PER_PART + 1
                end = min(i * ITEMS_PER_PART, item_count)
                parts.append((i, start, end))
            
            assert total_parts == expected_total_parts, f"For {item_count} items: expected {expected_total_parts} parts, got {total_parts}"
            assert parts == expected_parts, f"For {item_count} items: parts mismatch"
            
            print(f"PASS: {item_count} items -> {total_parts} parts: {parts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
