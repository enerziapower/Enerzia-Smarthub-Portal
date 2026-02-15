"""
PDF Template Settings API Tests
Tests for admin-configurable PDF templates including branding, company info,
cover page, back cover, and header/footer settings.
"""
import pytest
import requests
import os
import io

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "admin123"


class TestPDFTemplateSettingsAPI:
    """Test PDF Template Settings API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_settings_returns_defaults(self):
        """Test GET /api/pdf-template/settings returns default settings"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "branding" in data, "Response should contain 'branding'"
        assert "company_info" in data, "Response should contain 'company_info'"
        assert "cover_page" in data, "Response should contain 'cover_page'"
        assert "back_cover" in data, "Response should contain 'back_cover'"
        assert "header_footer" in data, "Response should contain 'header_footer'"
        
        # Verify branding defaults
        branding = data["branding"]
        assert "primary_color" in branding
        assert "secondary_color" in branding
        
        # Verify company_info defaults
        company = data["company_info"]
        assert "company_name" in company
        assert "website" in company
        
        # Verify cover_page defaults
        cover = data["cover_page"]
        assert "enabled" in cover
        assert "show_logo" in cover
        
        # Verify back_cover defaults
        back = data["back_cover"]
        assert "enabled" in back
        assert "title" in back
        
        # Verify header_footer defaults
        hf = data["header_footer"]
        assert "show_header" in hf
        assert "show_footer" in hf
        
        print("✓ GET /api/pdf-template/settings returns valid default settings")
    
    def test_update_branding_settings(self):
        """Test PUT /api/pdf-template/settings updates branding"""
        update_payload = {
            "branding": {
                "primary_color": "#FF5733",
                "secondary_color": "#33FF57"
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "settings" in data
        
        # Verify the update was applied
        settings = data["settings"]
        assert settings["branding"]["primary_color"] == "#FF5733"
        assert settings["branding"]["secondary_color"] == "#33FF57"
        
        # Verify persistence by fetching again
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["branding"]["primary_color"] == "#FF5733"
        
        print("✓ PUT /api/pdf-template/settings updates branding correctly")
    
    def test_update_company_info(self):
        """Test PUT /api/pdf-template/settings updates company info"""
        update_payload = {
            "company_info": {
                "company_name": "Test Company Ltd",
                "tagline": "Testing Excellence",
                "phone": "+91-9876543210",
                "email": "test@testcompany.com",
                "website": "www.testcompany.com"
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data["settings"]
        
        assert settings["company_info"]["company_name"] == "Test Company Ltd"
        assert settings["company_info"]["tagline"] == "Testing Excellence"
        assert settings["company_info"]["phone"] == "+91-9876543210"
        
        print("✓ PUT /api/pdf-template/settings updates company info correctly")
    
    def test_update_cover_page_settings(self):
        """Test PUT /api/pdf-template/settings updates cover page settings"""
        update_payload = {
            "cover_page": {
                "enabled": True,
                "show_logo": True,
                "show_decorative_curves": False,
                "curve_color": "#0000FF",
                "title_font_size": 28,
                "subtitle_font_size": 16
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data["settings"]
        
        assert settings["cover_page"]["show_decorative_curves"] == False
        assert settings["cover_page"]["curve_color"] == "#0000FF"
        assert settings["cover_page"]["title_font_size"] == 28
        
        print("✓ PUT /api/pdf-template/settings updates cover page settings correctly")
    
    def test_update_back_cover_settings(self):
        """Test PUT /api/pdf-template/settings updates back cover settings"""
        update_payload = {
            "back_cover": {
                "enabled": True,
                "title": "Get In Touch",
                "show_logo": True,
                "show_address": True,
                "show_phone": True,
                "additional_text": "We look forward to serving you!"
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data["settings"]
        
        assert settings["back_cover"]["title"] == "Get In Touch"
        assert settings["back_cover"]["additional_text"] == "We look forward to serving you!"
        
        print("✓ PUT /api/pdf-template/settings updates back cover settings correctly")
    
    def test_update_header_footer_settings(self):
        """Test PUT /api/pdf-template/settings updates header/footer settings"""
        update_payload = {
            "header_footer": {
                "show_header": True,
                "show_footer": True,
                "show_page_numbers": True,
                "show_header_logo": False,
                "show_header_line": True,
                "show_footer_line": True,
                "footer_company_name": True,
                "footer_website": True
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data["settings"]
        
        assert settings["header_footer"]["show_header_logo"] == False
        assert settings["header_footer"]["show_page_numbers"] == True
        
        print("✓ PUT /api/pdf-template/settings updates header/footer settings correctly")
    
    def test_preview_pdf_all_pages(self):
        """Test GET /api/pdf-template/preview generates PDF for all pages"""
        response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=all"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content starts with PDF header
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 1000, "PDF should have substantial content"
        
        print("✓ GET /api/pdf-template/preview?page_type=all generates valid PDF")
    
    def test_preview_pdf_cover_page(self):
        """Test GET /api/pdf-template/preview generates PDF for cover page only"""
        response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=cover"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print("✓ GET /api/pdf-template/preview?page_type=cover generates valid PDF")
    
    def test_preview_pdf_content_page(self):
        """Test GET /api/pdf-template/preview generates PDF for content page only"""
        response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=content"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print("✓ GET /api/pdf-template/preview?page_type=content generates valid PDF")
    
    def test_preview_pdf_back_page(self):
        """Test GET /api/pdf-template/preview generates PDF for back page only"""
        response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=back"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print("✓ GET /api/pdf-template/preview?page_type=back generates valid PDF")
    
    def test_reset_to_defaults(self):
        """Test POST /api/pdf-template/reset resets settings to defaults"""
        # First, update some settings
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "branding": {"primary_color": "#123456"},
                "company_info": {"company_name": "Modified Company"}
            }
        )
        
        # Now reset to defaults
        response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "settings" in data
        
        # Verify defaults are restored
        settings = data["settings"]
        assert settings["branding"]["primary_color"] == "#F7931E", "Primary color should be reset to default"
        assert settings["company_info"]["company_name"] == "Enerzia Power Solutions", "Company name should be reset to default"
        
        print("✓ POST /api/pdf-template/reset resets settings to defaults correctly")
    
    def test_upload_logo(self):
        """Test POST /api/pdf-template/upload-logo uploads logo successfully"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/pdf-template/upload-logo",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "logo_url" in data
        assert data["logo_url"].startswith("/api/uploads/")
        
        print(f"✓ POST /api/pdf-template/upload-logo uploads logo successfully: {data['logo_url']}")
    
    def test_upload_logo_invalid_file_type(self):
        """Test POST /api/pdf-template/upload-logo rejects non-image files"""
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an image'), 'text/plain')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/pdf-template/upload-logo",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✓ POST /api/pdf-template/upload-logo correctly rejects non-image files")


class TestPDFTemplateSettingsIntegration:
    """Integration tests for PDF Template Settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_full_workflow_update_and_preview(self):
        """Test complete workflow: update settings then generate preview"""
        # Step 1: Update all settings
        update_payload = {
            "branding": {
                "primary_color": "#E74C3C",
                "secondary_color": "#3498DB"
            },
            "company_info": {
                "company_name": "Integration Test Company",
                "tagline": "Testing Made Easy",
                "phone": "+91-1234567890"
            },
            "cover_page": {
                "enabled": True,
                "title_font_size": 26
            },
            "back_cover": {
                "enabled": True,
                "title": "Contact Integration Test"
            },
            "header_footer": {
                "show_page_numbers": True
            }
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Step 2: Generate preview with updated settings
        preview_response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=all"
        )
        assert preview_response.status_code == 200
        assert preview_response.headers.get("content-type") == "application/pdf"
        
        # Step 3: Verify settings persisted
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        
        settings = get_response.json()
        assert settings["branding"]["primary_color"] == "#E74C3C"
        assert settings["company_info"]["company_name"] == "Integration Test Company"
        
        # Step 4: Reset to defaults
        reset_response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        assert reset_response.status_code == 200
        
        print("✓ Full workflow (update → preview → verify → reset) completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
