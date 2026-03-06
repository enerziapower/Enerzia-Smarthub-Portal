"""
Test IR Thermography Image Validation Feature
Tests the new server-side image validation using PIL in save_base64_image function.
Validates that:
1. Valid images are accepted and saved correctly
2. Corrupted/invalid images are rejected with 400 status
3. PDF download works for reports with valid images
4. Direct file upload validates images before saving
"""
import pytest
import requests
import os
import base64
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test images - base64 encoded
# Valid 1x1 PNG image (red pixel)
VALID_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# Valid 1x1 JPEG image
VALID_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="

# Invalid base64 - just text "this is not a valid image file" encoded
INVALID_IMAGE_BASE64 = "dGhpcyBpcyBub3QgYSB2YWxpZCBpbWFnZSBmaWxl"

# Corrupted image - valid PNG header but corrupted data
CORRUPTED_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA"


class TestIRThermographyImageValidation:
    """Test suite for IR Thermography image validation feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_report_ids = []
        yield
        # Cleanup created reports
        for report_id in self.created_report_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/ir-thermography/{report_id}")
            except:
                pass
    
    def test_create_report_with_valid_png_image(self):
        """Test creating IR Thermography report with valid PNG image - should succeed"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Valid PNG",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel A",
                    "panel": "Main Panel",
                    "feeder": "Feeder 1",
                    "original_image": f"data:image/png;base64,{VALID_PNG_BASE64}",
                    "thermal_image": f"data:image/png;base64,{VALID_PNG_BASE64}",
                    "max_temperature": 45.5,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        
        # Should succeed with 200 status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain report ID"
        self.created_report_ids.append(data["id"])
        
        # Verify images were saved and URLs returned
        assert len(data.get("inspection_items", [])) > 0, "Should have inspection items"
        item = data["inspection_items"][0]
        
        # Images should be converted to file URLs (not base64)
        assert item.get("original_image", "").startswith("/api/ir-thermography-images/"), \
            f"Original image should be a file URL, got: {item.get('original_image', '')[:50]}"
        assert item.get("thermal_image", "").startswith("/api/ir-thermography-images/"), \
            f"Thermal image should be a file URL, got: {item.get('thermal_image', '')[:50]}"
        
        print(f"✓ Report created successfully with valid PNG images")
        print(f"  Report ID: {data['id']}")
        print(f"  Original image URL: {item.get('original_image')}")
        print(f"  Thermal image URL: {item.get('thermal_image')}")
    
    def test_create_report_with_valid_jpeg_image(self):
        """Test creating IR Thermography report with valid JPEG image - should succeed"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Valid JPEG",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel B",
                    "panel": "Secondary Panel",
                    "feeder": "Feeder 2",
                    "original_image": f"data:image/jpeg;base64,{VALID_JPEG_BASE64}",
                    "max_temperature": 50.0,
                    "min_temperature": 30.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        
        # Should succeed with 200 status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain report ID"
        self.created_report_ids.append(data["id"])
        
        print(f"✓ Report created successfully with valid JPEG image")
        print(f"  Report ID: {data['id']}")
    
    def test_create_report_with_invalid_image_rejected(self):
        """Test creating IR Thermography report with invalid/corrupted image - should fail with 400"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Invalid Image",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel C",
                    "panel": "Test Panel",
                    "feeder": "Feeder 3",
                    "original_image": f"data:image/png;base64,{INVALID_IMAGE_BASE64}",
                    "max_temperature": 40.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        
        # Should fail with 400 status
        assert response.status_code == 400, f"Expected 400 for invalid image, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "valid" in data["detail"].lower() or "image" in data["detail"].lower(), \
            f"Error message should mention invalid image: {data['detail']}"
        
        print(f"✓ Invalid image correctly rejected with 400 status")
        print(f"  Error message: {data['detail']}")
    
    def test_create_report_with_corrupted_image_rejected(self):
        """Test creating IR Thermography report with corrupted PNG - should fail with 400"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Corrupted Image",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel D",
                    "panel": "Test Panel",
                    "feeder": "Feeder 4",
                    "thermal_image": f"data:image/png;base64,{CORRUPTED_PNG_BASE64}",
                    "max_temperature": 35.0,
                    "min_temperature": 20.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        
        # Should fail with 400 status
        assert response.status_code == 400, f"Expected 400 for corrupted image, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        
        print(f"✓ Corrupted image correctly rejected with 400 status")
        print(f"  Error message: {data['detail']}")
    
    def test_create_report_without_images_succeeds(self):
        """Test creating IR Thermography report without images - should succeed"""
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - No Images",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel E",
                    "panel": "Test Panel",
                    "feeder": "Feeder 5",
                    "max_temperature": 42.0,
                    "min_temperature": 28.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        
        # Should succeed with 200 status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain report ID"
        self.created_report_ids.append(data["id"])
        
        print(f"✓ Report created successfully without images")
        print(f"  Report ID: {data['id']}")
    
    def test_pdf_download_for_report_with_valid_images(self):
        """Test PDF download for report with valid images - should return 200 with PDF"""
        # First create a report with valid images
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - PDF Test",
                "location": "Test Location",
                "revision_no": "00",
                "date_of_ir_study": datetime.now().strftime("%Y-%m-%d")
            },
            "inspection_items": [
                {
                    "item_id": f"test_item_{uuid.uuid4().hex[:8]}",
                    "location": "Panel F",
                    "panel": "Main Panel",
                    "feeder": "Feeder 6",
                    "original_image": f"data:image/png;base64,{VALID_PNG_BASE64}",
                    "thermal_image": f"data:image/png;base64,{VALID_PNG_BASE64}",
                    "max_temperature": 48.0,
                    "min_temperature": 26.0
                }
            ],
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert create_response.status_code == 200, f"Failed to create report: {create_response.text}"
        
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Now try to download PDF - NOTE: endpoint is /api/ir-thermography-report/{id}/pdf
        pdf_response = self.session.get(f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf")
        
        # Should succeed with 200 status
        assert pdf_response.status_code == 200, f"Expected 200 for PDF download, got {pdf_response.status_code}: {pdf_response.text}"
        
        # Verify it's a PDF
        content_type = pdf_response.headers.get("content-type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Verify PDF content starts with PDF header
        assert pdf_response.content[:4] == b'%PDF', "Response should be a valid PDF file"
        
        print(f"✓ PDF downloaded successfully for report with valid images")
        print(f"  Report ID: {report_id}")
        print(f"  PDF size: {len(pdf_response.content)} bytes")


class TestDirectFileUpload:
    """Test suite for direct file upload endpoint with image validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.created_report_ids = []
        yield
        # Cleanup created reports
        for report_id in self.created_report_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/ir-thermography/{report_id}")
            except:
                pass
    
    def _create_test_report(self):
        """Helper to create a test report for upload tests"""
        item_id = f"test_item_{uuid.uuid4().hex[:8]}"
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Upload Test",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": item_id,
                    "location": "Panel Upload",
                    "panel": "Test Panel",
                    "feeder": "Feeder Upload",
                    "max_temperature": 40.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ir-thermography",
            json=report_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            report_id = response.json()["id"]
            self.created_report_ids.append(report_id)
            return report_id, item_id
        return None, None
    
    def test_upload_valid_image_file(self):
        """Test uploading valid image file via direct upload endpoint - should succeed"""
        report_id, item_id = self._create_test_report()
        assert report_id is not None, "Failed to create test report"
        
        # Create a valid PNG image file
        image_data = base64.b64decode(VALID_PNG_BASE64)
        
        files = {
            'file': ('test_image.png', image_data, 'image/png')
        }
        data = {
            'item_id': item_id,
            'image_type': 'original'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ir-thermography/{report_id}/upload-image",
            files=files,
            data=data
        )
        
        # Should succeed with 200 status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result, "Response should contain success message"
        assert "image_url" in result, "Response should contain image URL"
        
        print(f"✓ Valid image file uploaded successfully")
        print(f"  Report ID: {report_id}")
        print(f"  Image URL: {result.get('image_url', '')[:50]}...")
    
    def test_upload_invalid_file_rejected(self):
        """Test uploading invalid file via direct upload endpoint - should fail with 400"""
        report_id, item_id = self._create_test_report()
        assert report_id is not None, "Failed to create test report"
        
        # Create an invalid file (just text)
        invalid_data = b"this is not a valid image file"
        
        files = {
            'file': ('fake_image.png', invalid_data, 'image/png')
        }
        data = {
            'item_id': item_id,
            'image_type': 'thermal'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ir-thermography/{report_id}/upload-image",
            files=files,
            data=data
        )
        
        # Should fail with 400 status
        assert response.status_code == 400, f"Expected 400 for invalid file, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "detail" in result, "Response should contain error detail"
        
        print(f"✓ Invalid file correctly rejected with 400 status")
        print(f"  Error message: {result['detail']}")
    
    def test_upload_to_nonexistent_report(self):
        """Test uploading to non-existent report - should fail with 404"""
        fake_report_id = str(uuid.uuid4())
        
        image_data = base64.b64decode(VALID_PNG_BASE64)
        
        files = {
            'file': ('test_image.png', image_data, 'image/png')
        }
        data = {
            'item_id': 'fake_item',
            'image_type': 'original'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/ir-thermography/{fake_report_id}/upload-image",
            files=files,
            data=data
        )
        
        # Should fail with 404 status
        assert response.status_code == 404, f"Expected 404 for non-existent report, got {response.status_code}: {response.text}"
        
        print(f"✓ Upload to non-existent report correctly rejected with 404 status")


class TestUpdateReportWithImages:
    """Test suite for updating reports with image validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_report_ids = []
        yield
        # Cleanup created reports
        for report_id in self.created_report_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/ir-thermography/{report_id}")
            except:
                pass
    
    def test_update_report_with_valid_image(self):
        """Test updating report with valid image - should succeed"""
        # First create a report without images
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Update Test",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": "update_test_item",
                    "location": "Panel Update",
                    "panel": "Test Panel",
                    "feeder": "Feeder Update",
                    "max_temperature": 45.0,
                    "min_temperature": 30.0
                }
            ],
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert create_response.status_code == 200, f"Failed to create report: {create_response.text}"
        
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Now update with valid image
        update_data = {
            "inspection_items": [
                {
                    "item_id": "update_test_item",
                    "location": "Panel Update",
                    "panel": "Test Panel",
                    "feeder": "Feeder Update",
                    "original_image": f"data:image/png;base64,{VALID_PNG_BASE64}",
                    "max_temperature": 45.0,
                    "min_temperature": 30.0
                }
            ]
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/ir-thermography/{report_id}", json=update_data)
        
        # Should succeed with 200 status
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        item = data["inspection_items"][0]
        assert item.get("original_image", "").startswith("/api/ir-thermography-images/"), \
            f"Image should be saved as file URL: {item.get('original_image', '')[:50]}"
        
        print(f"✓ Report updated successfully with valid image")
        print(f"  Report ID: {report_id}")
    
    def test_update_report_with_invalid_image_rejected(self):
        """Test updating report with invalid image - should fail with 400"""
        # First create a report without images
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Client - Update Invalid Test",
                "location": "Test Location",
                "revision_no": "00"
            },
            "inspection_items": [
                {
                    "item_id": "update_invalid_test_item",
                    "location": "Panel Update Invalid",
                    "panel": "Test Panel",
                    "feeder": "Feeder Update Invalid",
                    "max_temperature": 45.0,
                    "min_temperature": 30.0
                }
            ],
            "status": "draft"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert create_response.status_code == 200, f"Failed to create report: {create_response.text}"
        
        report_id = create_response.json()["id"]
        self.created_report_ids.append(report_id)
        
        # Now try to update with invalid image
        update_data = {
            "inspection_items": [
                {
                    "item_id": "update_invalid_test_item",
                    "location": "Panel Update Invalid",
                    "panel": "Test Panel",
                    "feeder": "Feeder Update Invalid",
                    "thermal_image": f"data:image/png;base64,{INVALID_IMAGE_BASE64}",
                    "max_temperature": 45.0,
                    "min_temperature": 30.0
                }
            ]
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/ir-thermography/{report_id}", json=update_data)
        
        # Should fail with 400 status
        assert update_response.status_code == 400, f"Expected 400 for invalid image, got {update_response.status_code}: {update_response.text}"
        
        print(f"✓ Update with invalid image correctly rejected with 400 status")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
