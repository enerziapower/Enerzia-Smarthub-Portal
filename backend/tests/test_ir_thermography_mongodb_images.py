"""
Test IR Thermography MongoDB Image Storage Feature
Tests that images are saved to MongoDB and served correctly via the /api/ir-thermography/db-images/{image_id} endpoint
"""
import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test image data - 100x100 blue PNG
def create_test_image(color='blue', size=(100, 100)):
    """Create a test image and return as base64 data URL"""
    img = Image.new('RGB', size, color=color)
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"


class TestIRThermographyMongoDBImages:
    """Test MongoDB image storage for IR Thermography reports"""
    
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
    
    def test_create_report_with_images_saves_to_mongodb(self):
        """Test that creating a report with images saves them to MongoDB"""
        # Create test images
        original_image = create_test_image('blue')
        thermal_image = create_test_image('red')
        
        # Create report with images
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test MongoDB Client",
                "location": "Test Location",
                "date_of_ir_study": "2025-12-01"
            },
            "inspection_items": [
                {
                    "item_id": "test-item-1",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "original_image": original_image,
                    "thermal_image": thermal_image,
                    "max_temperature": 45.5,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert response.status_code == 200, f"Failed to create report: {response.text}"
        
        data = response.json()
        self.created_report_ids.append(data['id'])
        
        # Verify images are stored as MongoDB URLs (not base64)
        item = data['inspection_items'][0]
        assert item['original_image'].startswith('/api/ir-thermography/db-images/'), \
            f"Original image should be MongoDB URL, got: {item['original_image']}"
        assert item['thermal_image'].startswith('/api/ir-thermography/db-images/'), \
            f"Thermal image should be MongoDB URL, got: {item['thermal_image']}"
        
        print(f"✓ Report created with MongoDB image URLs")
        print(f"  Original: {item['original_image']}")
        print(f"  Thermal: {item['thermal_image']}")
    
    def test_serve_image_from_mongodb(self):
        """Test that images can be served from the /api/ir-thermography/db-images endpoint"""
        # Create a report with images first
        original_image = create_test_image('green')
        
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Image Serve Client",
                "location": "Test Location",
                "date_of_ir_study": "2025-12-01"
            },
            "inspection_items": [
                {
                    "item_id": "test-serve-item",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "original_image": original_image,
                    "max_temperature": 30.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert response.status_code == 200
        
        data = response.json()
        self.created_report_ids.append(data['id'])
        
        # Get the image URL
        image_url = data['inspection_items'][0]['original_image']
        
        # Fetch the image from the endpoint
        img_response = self.session.get(f"{BASE_URL}{image_url}")
        assert img_response.status_code == 200, f"Failed to fetch image: {img_response.status_code}"
        assert img_response.headers.get('content-type') == 'image/png', \
            f"Wrong content type: {img_response.headers.get('content-type')}"
        
        # Verify it's a valid image
        img = Image.open(BytesIO(img_response.content))
        assert img.format == 'PNG'
        assert img.size == (100, 100)
        
        print(f"✓ Image served successfully from MongoDB")
        print(f"  URL: {image_url}")
        print(f"  Size: {len(img_response.content)} bytes")
    
    def test_image_not_found_returns_404(self):
        """Test that requesting a non-existent image returns 404"""
        response = self.session.get(f"{BASE_URL}/api/ir-thermography/db-images/non-existent-image-id")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✓ Non-existent image returns 404")
    
    def test_update_report_with_new_images(self):
        """Test that updating a report with new images saves them to MongoDB"""
        # Create initial report without images
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Update Client",
                "location": "Test Location",
                "date_of_ir_study": "2025-12-01"
            },
            "inspection_items": [
                {
                    "item_id": "test-update-item",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "max_temperature": 35.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert response.status_code == 200
        
        data = response.json()
        report_id = data['id']
        self.created_report_ids.append(report_id)
        
        # Verify no images initially
        assert data['inspection_items'][0].get('original_image') is None
        
        # Update with images
        new_image = create_test_image('yellow')
        update_data = {
            "inspection_items": [
                {
                    "item_id": "test-update-item",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "original_image": new_image,
                    "max_temperature": 35.0,
                    "min_temperature": 25.0
                }
            ]
        }
        
        response = self.session.put(f"{BASE_URL}/api/ir-thermography/{report_id}", json=update_data)
        assert response.status_code == 200
        
        updated_data = response.json()
        item = updated_data['inspection_items'][0]
        
        # Verify image is now a MongoDB URL
        assert item['original_image'].startswith('/api/ir-thermography/db-images/'), \
            f"Updated image should be MongoDB URL, got: {item['original_image']}"
        
        # Verify image can be fetched
        img_response = self.session.get(f"{BASE_URL}{item['original_image']}")
        assert img_response.status_code == 200
        
        print(f"✓ Report updated with new MongoDB image")
    
    def test_pdf_generation_with_mongodb_images(self):
        """Test that PDF generation works with MongoDB-stored images"""
        # Create report with images
        original_image = create_test_image('purple')
        thermal_image = create_test_image('orange')
        
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test PDF Client",
                "location": "Test Location",
                "date_of_ir_study": "2025-12-01"
            },
            "inspection_items": [
                {
                    "item_id": "test-pdf-item",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "original_image": original_image,
                    "thermal_image": thermal_image,
                    "max_temperature": 50.0,
                    "min_temperature": 30.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert response.status_code == 200
        
        data = response.json()
        report_id = data['id']
        self.created_report_ids.append(report_id)
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/ir-thermography-report/{report_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.status_code}"
        assert pdf_response.headers.get('content-type') == 'application/pdf', \
            f"Wrong content type: {pdf_response.headers.get('content-type')}"
        
        # Verify PDF is valid (has content)
        assert len(pdf_response.content) > 10000, "PDF seems too small"
        
        print(f"✓ PDF generated successfully with MongoDB images")
        print(f"  PDF size: {len(pdf_response.content)} bytes")
    
    def test_existing_report_images_accessible(self):
        """Test that the existing test report's images are accessible"""
        report_id = "3e65a895-46ce-4a30-bcde-ed86fcce9e57"
        
        # Get the report
        response = self.session.get(f"{BASE_URL}/api/ir-thermography/{report_id}")
        if response.status_code == 404:
            pytest.skip("Test report not found - may have been deleted")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check images
        for item in data.get('inspection_items', []):
            if item.get('original_image'):
                img_url = item['original_image']
                img_response = self.session.get(f"{BASE_URL}{img_url}")
                assert img_response.status_code == 200, f"Failed to fetch original image: {img_url}"
                print(f"✓ Original image accessible: {img_url}")
            
            if item.get('thermal_image'):
                img_url = item['thermal_image']
                img_response = self.session.get(f"{BASE_URL}{img_url}")
                assert img_response.status_code == 200, f"Failed to fetch thermal image: {img_url}"
                print(f"✓ Thermal image accessible: {img_url}")
    
    def test_delete_report_cleans_up_images(self):
        """Test that deleting a report also deletes its images from MongoDB"""
        # Create report with images
        original_image = create_test_image('cyan')
        
        report_data = {
            "report_type": "pre-thermography",
            "document_details": {
                "client": "Test Delete Client",
                "location": "Test Location",
                "date_of_ir_study": "2025-12-01"
            },
            "inspection_items": [
                {
                    "item_id": "test-delete-item",
                    "location": "Test Room",
                    "panel": "Test Panel",
                    "feeder": "Test Feeder",
                    "original_image": original_image,
                    "max_temperature": 40.0,
                    "min_temperature": 25.0
                }
            ],
            "status": "draft"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ir-thermography", json=report_data)
        assert response.status_code == 200
        
        data = response.json()
        report_id = data['id']
        image_url = data['inspection_items'][0]['original_image']
        
        # Verify image exists
        img_response = self.session.get(f"{BASE_URL}{image_url}")
        assert img_response.status_code == 200
        
        # Delete report
        delete_response = self.session.delete(f"{BASE_URL}/api/ir-thermography/{report_id}")
        assert delete_response.status_code == 200
        
        # Verify image is deleted
        img_response = self.session.get(f"{BASE_URL}{image_url}")
        assert img_response.status_code == 404, "Image should be deleted with report"
        
        print(f"✓ Report deletion also cleans up MongoDB images")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
