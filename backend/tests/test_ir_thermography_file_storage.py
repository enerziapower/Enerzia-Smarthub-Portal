"""
Test IR Thermography File-Based Image Storage Fix
Tests the fix for MongoDB's 16MB document size limit by storing images as files
instead of base64 strings in the database.

Key features tested:
1. Create IR Thermography report with 80+ inspection items with large images
2. Images saved as files in /app/uploads/ir-thermography/{report_id}/
3. Images served correctly from /ir-thermography-images/{report_id}/{filename}
4. Edit existing report with many items
5. PDF generation with file-based images
"""

import pytest
import requests
import os
import base64
import uuid
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "123456"


class TestIRThermographyFileStorage:
    """Test IR Thermography file-based image storage"""
    
    auth_token = None
    created_report_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before tests"""
        if not TestIRThermographyFileStorage.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestIRThermographyFileStorage.auth_token = response.json().get("token")
            else:
                pytest.skip(f"Authentication failed: {response.status_code}")
    
    def get_headers(self):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {TestIRThermographyFileStorage.auth_token}",
            "Content-Type": "application/json"
        }
    
    def generate_large_base64_image(self, size_kb=100):
        """Generate a large base64 encoded image for testing"""
        # Create a simple JPEG-like binary data
        # This creates approximately size_kb KB of data
        data = b'\xFF\xD8\xFF\xE0' + os.urandom(size_kb * 1024 - 4)
        base64_data = base64.b64encode(data).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"
    
    def test_01_api_health_check(self):
        """Test that IR Thermography API is accessible"""
        response = requests.get(f"{BASE_URL}/api/ir-thermography", headers=self.get_headers())
        assert response.status_code == 200, f"API not accessible: {response.status_code}"
        print("✓ IR Thermography API is accessible")
    
    def test_02_get_existing_test_report(self):
        """Verify the existing test report with 80 items exists"""
        report_id = "4786b24c-2b20-4ae6-9f24-d82bf839f6ee"
        response = requests.get(f"{BASE_URL}/api/ir-thermography/{report_id}", headers=self.get_headers())
        
        if response.status_code == 200:
            report = response.json()
            items_count = len(report.get('inspection_items', []))
            print(f"✓ Existing test report found with {items_count} inspection items")
            assert items_count >= 80, f"Expected 80+ items, got {items_count}"
            
            # Verify images are stored as file URLs, not base64
            first_item = report['inspection_items'][0] if report['inspection_items'] else None
            if first_item:
                original_img = first_item.get('original_image', '')
                thermal_img = first_item.get('thermal_image', '')
                
                # Images should be URLs starting with /ir-thermography-images/
                assert original_img.startswith('/ir-thermography-images/'), f"Original image should be URL, got: {original_img[:50]}"
                assert thermal_img.startswith('/ir-thermography-images/'), f"Thermal image should be URL, got: {thermal_img[:50]}"
                print("✓ Images are stored as file URLs, not base64")
        else:
            print(f"Note: Existing test report not found (status: {response.status_code})")
    
    def test_03_verify_image_files_exist(self):
        """Verify image files exist on disk for the test report"""
        report_id = "4786b24c-2b20-4ae6-9f24-d82bf839f6ee"
        report_dir = f"/app/uploads/ir-thermography/{report_id}"
        
        if os.path.exists(report_dir):
            files = os.listdir(report_dir)
            print(f"✓ Found {len(files)} image files in {report_dir}")
            assert len(files) >= 160, f"Expected 160+ files (80 items × 2 images), got {len(files)}"
        else:
            print(f"Note: Report directory not found: {report_dir}")
    
    def test_04_serve_image_from_static_mount(self):
        """Test that images are served correctly from the static file mount"""
        report_id = "4786b24c-2b20-4ae6-9f24-d82bf839f6ee"
        
        # First get the report to find an image URL
        response = requests.get(f"{BASE_URL}/api/ir-thermography/{report_id}", headers=self.get_headers())
        
        if response.status_code == 200:
            report = response.json()
            if report.get('inspection_items'):
                first_item = report['inspection_items'][0]
                image_url = first_item.get('original_image', '')
                
                if image_url.startswith('/ir-thermography-images/'):
                    # Try to fetch the image
                    full_url = f"{BASE_URL}{image_url}"
                    img_response = requests.get(full_url)
                    
                    assert img_response.status_code == 200, f"Failed to fetch image: {img_response.status_code}"
                    assert len(img_response.content) > 0, "Image content is empty"
                    print(f"✓ Image served successfully from {image_url}")
                    print(f"  Image size: {len(img_response.content)} bytes")
    
    def test_05_create_report_with_80_items_large_images(self):
        """Test creating a new report with 80+ items and large images"""
        # Generate 80 inspection items with large images
        inspection_items = []
        for i in range(80):
            item = {
                "item_id": f"TEST_item_{i+1}",
                "location": f"Test Location {i+1}",
                "panel": f"Panel {i+1}",
                "feeder": f"Feeder {i+1}",
                "original_image": self.generate_large_base64_image(100),  # 100KB each
                "thermal_image": self.generate_large_base64_image(100),   # 100KB each
                "max_temperature": 45.0 + (i % 20),
                "min_temperature": 25.0 + (i % 10),
                "ambient_temperature": 30.0,
                "analyzed_by": "Test Engineer",
                "comments": f"Test comment for item {i+1}"
            }
            inspection_items.append(item)
        
        report_data = {
            "report_type": "pre-thermography",
            "project_id": None,
            "document_details": {
                "revision_no": "00",
                "client": "TEST_Large_Report_Client",
                "location": "Test Location for Large Report",
                "work_order_number": "TEST-WO-001",
                "work_order_date": "2025-01-15",
                "date_of_ir_study": "2025-01-15",
                "coordinating_person": "Test Coordinator",
                "thermography_inspection_by": "Test Inspector",
                "load_condition": "Full Load",
                "report_prepared_by": "Test Preparer",
                "report_reviewed_by": "Test Reviewer",
                "date_of_submission": "2025-01-16"
            },
            "inspection_items": inspection_items,
            "status": "draft"
        }
        
        print(f"Creating report with {len(inspection_items)} items...")
        print(f"Estimated payload size: ~{len(inspection_items) * 200}KB (before compression)")
        
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography",
            headers=self.get_headers(),
            json=report_data,
            timeout=120  # Allow longer timeout for large payload
        )
        
        assert response.status_code == 200, f"Failed to create report: {response.status_code} - {response.text[:500]}"
        
        created_report = response.json()
        TestIRThermographyFileStorage.created_report_id = created_report.get('id')
        
        print(f"✓ Report created successfully with ID: {TestIRThermographyFileStorage.created_report_id}")
        print(f"  Report No: {created_report.get('report_no')}")
        print(f"  Items count: {len(created_report.get('inspection_items', []))}")
        
        # Verify images are stored as URLs, not base64
        first_item = created_report['inspection_items'][0]
        assert first_item['original_image'].startswith('/ir-thermography-images/'), "Original image should be URL"
        assert first_item['thermal_image'].startswith('/ir-thermography-images/'), "Thermal image should be URL"
        print("✓ Images converted to file URLs successfully")
    
    def test_06_verify_new_report_images_on_disk(self):
        """Verify that images for the new report are saved on disk"""
        if not TestIRThermographyFileStorage.created_report_id:
            pytest.skip("No report created in previous test")
        
        report_dir = f"/app/uploads/ir-thermography/{TestIRThermographyFileStorage.created_report_id}"
        
        assert os.path.exists(report_dir), f"Report directory not created: {report_dir}"
        
        files = os.listdir(report_dir)
        print(f"✓ Found {len(files)} image files in {report_dir}")
        
        # Should have 160 files (80 items × 2 images)
        assert len(files) >= 160, f"Expected 160 files, got {len(files)}"
        
        # Check file sizes
        total_size = sum(os.path.getsize(os.path.join(report_dir, f)) for f in files)
        print(f"  Total disk size: {total_size / (1024*1024):.2f} MB")
    
    def test_07_update_report_with_additional_items(self):
        """Test updating the report with additional items"""
        if not TestIRThermographyFileStorage.created_report_id:
            pytest.skip("No report created in previous test")
        
        # Get current report
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography/{TestIRThermographyFileStorage.created_report_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        current_report = response.json()
        current_items = current_report.get('inspection_items', [])
        
        # Add 5 more items
        for i in range(5):
            new_item = {
                "item_id": f"TEST_new_item_{i+1}",
                "location": f"New Location {i+1}",
                "panel": f"New Panel {i+1}",
                "feeder": f"New Feeder {i+1}",
                "original_image": self.generate_large_base64_image(100),
                "thermal_image": self.generate_large_base64_image(100),
                "max_temperature": 50.0 + i,
                "min_temperature": 30.0 + i,
                "ambient_temperature": 32.0,
                "analyzed_by": "Test Engineer",
                "comments": f"New test comment {i+1}"
            }
            current_items.append(new_item)
        
        update_data = {
            "inspection_items": current_items,
            "status": "draft"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/ir-thermography/{TestIRThermographyFileStorage.created_report_id}",
            headers=self.get_headers(),
            json=update_data,
            timeout=120
        )
        
        assert response.status_code == 200, f"Failed to update report: {response.status_code}"
        
        updated_report = response.json()
        print(f"✓ Report updated successfully")
        print(f"  New items count: {len(updated_report.get('inspection_items', []))}")
        
        # Verify new items have file URLs
        last_item = updated_report['inspection_items'][-1]
        assert last_item['original_image'].startswith('/ir-thermography-images/'), "New item image should be URL"
    
    def test_08_generate_pdf_with_file_images(self):
        """Test PDF generation with file-based images"""
        if not TestIRThermographyFileStorage.created_report_id:
            pytest.skip("No report created in previous test")
        
        # PDF endpoint is at /api/ir-thermography-report/{report_id}/pdf
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography-report/{TestIRThermographyFileStorage.created_report_id}/pdf",
            headers=self.get_headers(),
            timeout=180  # PDF generation can take time
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf', "Response should be PDF"
        
        pdf_size = len(response.content)
        print(f"✓ PDF generated successfully")
        print(f"  PDF size: {pdf_size / (1024*1024):.2f} MB")
    
    def test_09_verify_risk_calculation(self):
        """Verify risk categories are calculated correctly"""
        if not TestIRThermographyFileStorage.created_report_id:
            pytest.skip("No report created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography/{TestIRThermographyFileStorage.created_report_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        
        report = response.json()
        items = report.get('inspection_items', [])
        
        # Check that delta_t and risk_category are calculated
        for item in items[:5]:  # Check first 5 items
            assert 'delta_t' in item, "delta_t should be calculated"
            assert 'risk_category' in item, "risk_category should be calculated"
            assert 'risk_color' in item, "risk_color should be set"
            
            # Verify delta_t calculation
            if item.get('max_temperature') and item.get('min_temperature'):
                expected_delta = item['max_temperature'] - item['min_temperature']
                assert abs(item['delta_t'] - expected_delta) < 0.1, "delta_t calculation incorrect"
        
        print("✓ Risk calculations verified")
        print(f"  Summary: {report.get('summary', {})}")
    
    def test_10_cleanup_test_report(self):
        """Clean up the test report"""
        if not TestIRThermographyFileStorage.created_report_id:
            pytest.skip("No report to clean up")
        
        response = requests.delete(
            f"{BASE_URL}/api/ir-thermography/{TestIRThermographyFileStorage.created_report_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed to delete report: {response.status_code}"
        
        # Verify files are cleaned up
        report_dir = f"/app/uploads/ir-thermography/{TestIRThermographyFileStorage.created_report_id}"
        assert not os.path.exists(report_dir), "Report directory should be deleted"
        
        print(f"✓ Test report and files cleaned up successfully")


class TestIRThermographyEdgeCases:
    """Test edge cases for IR Thermography file storage"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        if not TestIRThermographyEdgeCases.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestIRThermographyEdgeCases.auth_token = response.json().get("token")
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestIRThermographyEdgeCases.auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_11_create_report_without_images(self):
        """Test creating a report without images"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "TEST_No_Images_Client",
                "location": "Test Location"
            },
            "inspection_items": [
                {
                    "item_id": "TEST_no_img_1",
                    "location": "Location 1",
                    "panel": "Panel 1",
                    "feeder": "Feeder 1",
                    "max_temperature": 45.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography",
            headers=self.get_headers(),
            json=report_data
        )
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        report = response.json()
        report_id = report.get('id')
        
        print(f"✓ Report without images created: {report_id}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/ir-thermography/{report_id}", headers=self.get_headers())
    
    def test_12_handle_existing_url_images(self):
        """Test that existing URL images are preserved (not re-processed)"""
        # Create a report with URL images (simulating an already-processed report)
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "TEST_URL_Images_Client",
                "location": "Test Location"
            },
            "inspection_items": [
                {
                    "item_id": "TEST_url_img_1",
                    "location": "Location 1",
                    "panel": "Panel 1",
                    "feeder": "Feeder 1",
                    "original_image": "/ir-thermography-images/existing/image.jpg",  # Already a URL
                    "thermal_image": "/ir-thermography-images/existing/thermal.jpg",
                    "max_temperature": 45.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ir-thermography",
            headers=self.get_headers(),
            json=report_data
        )
        
        assert response.status_code == 200
        
        report = response.json()
        report_id = report.get('id')
        
        # Verify URL images are preserved
        first_item = report['inspection_items'][0]
        assert first_item['original_image'] == "/ir-thermography-images/existing/image.jpg", "URL should be preserved"
        
        print("✓ Existing URL images are preserved")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/ir-thermography/{report_id}", headers=self.get_headers())
    
    def test_13_get_report_summary(self):
        """Test getting report summary endpoint"""
        report_id = "4786b24c-2b20-4ae6-9f24-d82bf839f6ee"
        
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography/{report_id}/summary",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            summary = response.json()
            print(f"✓ Summary retrieved: {summary}")
            assert 'total_items' in summary or 'total_feeders' in summary
        else:
            print(f"Note: Summary endpoint returned {response.status_code}")
    
    def test_14_list_reports_pagination(self):
        """Test listing reports with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/ir-thermography?skip=0&limit=10",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'reports' in data
        assert 'total' in data
        
        print(f"✓ Reports list: {len(data['reports'])} of {data['total']} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
