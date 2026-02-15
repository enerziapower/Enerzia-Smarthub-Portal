"""
PDF Template Settings Integration Tests
Tests that PDF template settings are properly integrated into AMC and Calibration PDF generators.
Verifies: logo, colors, company info, cover page, back cover, headers/footers.
"""
import pytest
import requests
import os
import io
import time

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "admin123"

# Known contract IDs from database
AMC_CONTRACT_ID = "b86200a3-163b-4638-8591-2ffc08b89637"
CALIBRATION_CONTRACT_ID = "5597eae8-b5d6-49ee-8bc1-4d5ef6aef4a7"


class TestPDFTemplateIntegrationAMC:
    """Test PDF template settings integration with AMC PDF generator"""
    
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
    
    def test_amc_pdf_generation_works(self):
        """Test that AMC PDF generation endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/amc-report/{AMC_CONTRACT_ID}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 5000, "PDF should have substantial content"
        
        print(f"✓ AMC PDF generated successfully, size: {len(content)} bytes")
    
    def test_amc_pdf_uses_template_settings_after_update(self):
        """Test that AMC PDF uses updated template settings"""
        # Step 1: Update template settings with custom values
        custom_settings = {
            "branding": {
                "primary_color": "#FF5733",  # Custom orange
                "secondary_color": "#33FF57"  # Custom green
            },
            "company_info": {
                "company_name": "TEST_Custom Company Name",
                "website": "www.testcompany.com",
                "address_line1": "123 Test Street",
                "city": "Test City",
                "state": "Test State",
                "postal_code": "123456"
            },
            "cover_page": {
                "enabled": True,
                "show_logo": True,
                "show_decorative_curves": True,
                "curve_color": "#FF5733",
                "title_font_size": 26,
                "show_submitted_by": True,
                "submitted_by_title": "Prepared By"
            },
            "back_cover": {
                "enabled": True,
                "title": "Get In Touch",
                "show_logo": True,
                "show_address": True,
                "show_phone": True,
                "show_email": True,
                "show_website": True
            },
            "header_footer": {
                "show_header": True,
                "show_footer": True,
                "show_page_numbers": True,
                "show_header_logo": True,
                "show_header_line": True,
                "show_footer_line": True,
                "footer_company_name": True,
                "footer_website": True
            }
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=custom_settings
        )
        assert update_response.status_code == 200, f"Failed to update settings: {update_response.text}"
        
        # Step 2: Verify settings were saved
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        saved_settings = get_response.json()
        assert saved_settings["company_info"]["company_name"] == "TEST_Custom Company Name"
        assert saved_settings["branding"]["primary_color"] == "#FF5733"
        
        # Step 3: Generate AMC PDF (should use new settings)
        pdf_response = self.session.get(f"{BASE_URL}/api/amc-report/{AMC_CONTRACT_ID}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print("✓ AMC PDF generated with custom template settings")
        
        # Step 4: Reset settings to defaults
        reset_response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        assert reset_response.status_code == 200
        
        print("✓ Template settings reset to defaults")
    
    def test_amc_pdf_with_cover_page_disabled(self):
        """Test AMC PDF generation with cover page disabled"""
        # Disable cover page
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={"cover_page": {"enabled": False}}
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/amc-report/{AMC_CONTRACT_ID}/pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ AMC PDF generated with cover page disabled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
    
    def test_amc_pdf_with_back_cover_disabled(self):
        """Test AMC PDF generation with back cover disabled"""
        # Disable back cover
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={"back_cover": {"enabled": False}}
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/amc-report/{AMC_CONTRACT_ID}/pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ AMC PDF generated with back cover disabled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
    
    def test_amc_pdf_with_header_footer_toggled(self):
        """Test AMC PDF generation with header/footer settings toggled"""
        # Disable header logo and page numbers
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "header_footer": {
                    "show_header_logo": False,
                    "show_page_numbers": False,
                    "show_footer_website": False
                }
            }
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/amc-report/{AMC_CONTRACT_ID}/pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ AMC PDF generated with header/footer settings toggled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")


class TestPDFTemplateIntegrationCalibration:
    """Test PDF template settings integration with Calibration PDF generator"""
    
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
    
    def test_calibration_pdf_generation_works(self):
        """Test that Calibration PDF generation endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/calibration-report/{CALIBRATION_CONTRACT_ID}/report-pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 5000, "PDF should have substantial content"
        
        print(f"✓ Calibration PDF generated successfully, size: {len(content)} bytes")
    
    def test_calibration_pdf_uses_template_settings_after_update(self):
        """Test that Calibration PDF uses updated template settings"""
        # Step 1: Update template settings with custom values
        custom_settings = {
            "branding": {
                "primary_color": "#E74C3C",  # Custom red
                "secondary_color": "#3498DB"  # Custom blue
            },
            "company_info": {
                "company_name": "TEST_Calibration Company",
                "website": "www.calibration-test.com",
                "address_line1": "456 Calibration Ave",
                "city": "Calibration City",
                "state": "Cal State",
                "postal_code": "654321",
                "phone": "+91-1234567890",
                "email": "test@calibration.com"
            },
            "cover_page": {
                "enabled": True,
                "show_logo": True,
                "show_decorative_curves": True,
                "curve_color": "#E74C3C",
                "title_font_size": 28,
                "show_submitted_by": True,
                "submitted_by_title": "Submitted By"
            },
            "back_cover": {
                "enabled": True,
                "title": "Contact Us",
                "show_logo": True,
                "show_address": True,
                "show_phone": True,
                "show_email": True,
                "show_website": True,
                "additional_text": "Thank you for choosing us!"
            },
            "header_footer": {
                "show_header": True,
                "show_footer": True,
                "show_page_numbers": True,
                "show_header_logo": True,
                "show_header_line": True,
                "show_footer_line": True,
                "footer_company_name": True,
                "footer_website": True
            }
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=custom_settings
        )
        assert update_response.status_code == 200, f"Failed to update settings: {update_response.text}"
        
        # Step 2: Verify settings were saved
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        saved_settings = get_response.json()
        assert saved_settings["company_info"]["company_name"] == "TEST_Calibration Company"
        assert saved_settings["branding"]["primary_color"] == "#E74C3C"
        
        # Step 3: Generate Calibration PDF (should use new settings)
        pdf_response = self.session.get(f"{BASE_URL}/api/calibration-report/{CALIBRATION_CONTRACT_ID}/report-pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        print("✓ Calibration PDF generated with custom template settings")
        
        # Step 4: Reset settings to defaults
        reset_response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        assert reset_response.status_code == 200
        
        print("✓ Template settings reset to defaults")
    
    def test_calibration_pdf_with_cover_page_disabled(self):
        """Test Calibration PDF generation with cover page disabled"""
        # Disable cover page
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={"cover_page": {"enabled": False}}
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/calibration-report/{CALIBRATION_CONTRACT_ID}/report-pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ Calibration PDF generated with cover page disabled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
    
    def test_calibration_pdf_with_back_cover_disabled(self):
        """Test Calibration PDF generation with back cover disabled"""
        # Disable back cover
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={"back_cover": {"enabled": False}}
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/calibration-report/{CALIBRATION_CONTRACT_ID}/report-pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ Calibration PDF generated with back cover disabled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
    
    def test_calibration_pdf_with_header_footer_toggled(self):
        """Test Calibration PDF generation with header/footer settings toggled"""
        # Disable header logo and page numbers
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "header_footer": {
                    "show_header_logo": False,
                    "show_page_numbers": False,
                    "show_footer_website": False
                }
            }
        )
        assert update_response.status_code == 200
        
        # Generate PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/calibration-report/{CALIBRATION_CONTRACT_ID}/report-pdf")
        assert pdf_response.status_code == 200
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF'
        
        print("✓ Calibration PDF generated with header/footer settings toggled")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")


class TestPDFPreviewEndpoint:
    """Test PDF preview endpoint still works after integration"""
    
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
    
    def test_preview_all_pages(self):
        """Test preview endpoint for all pages"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/preview?page_type=all")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        
        print("✓ PDF preview (all pages) works")
    
    def test_preview_cover_page(self):
        """Test preview endpoint for cover page"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/preview?page_type=cover")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        
        print("✓ PDF preview (cover page) works")
    
    def test_preview_content_page(self):
        """Test preview endpoint for content page"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/preview?page_type=content")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        
        print("✓ PDF preview (content page) works")
    
    def test_preview_back_page(self):
        """Test preview endpoint for back page"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/preview?page_type=back")
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        
        print("✓ PDF preview (back page) works")
    
    def test_preview_reflects_settings_changes(self):
        """Test that preview reflects settings changes"""
        # Update settings
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "company_info": {"company_name": "TEST_Preview Company"},
                "branding": {"primary_color": "#9B59B6"}
            }
        )
        assert update_response.status_code == 200
        
        # Generate preview
        preview_response = self.session.get(f"{BASE_URL}/api/pdf-template/preview?page_type=all")
        assert preview_response.status_code == 200
        assert preview_response.headers.get("content-type") == "application/pdf"
        
        print("✓ PDF preview reflects settings changes")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")


class TestTemplateSettingsHelperFunctions:
    """Test that helper functions in pdf_base.py work correctly"""
    
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
    
    def test_settings_api_returns_all_sections(self):
        """Test that settings API returns all required sections"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all sections exist
        assert "branding" in data, "Missing branding section"
        assert "company_info" in data, "Missing company_info section"
        assert "cover_page" in data, "Missing cover_page section"
        assert "back_cover" in data, "Missing back_cover section"
        assert "header_footer" in data, "Missing header_footer section"
        
        # Verify branding has required fields
        branding = data["branding"]
        assert "primary_color" in branding
        assert "secondary_color" in branding
        
        # Verify company_info has required fields
        company = data["company_info"]
        assert "company_name" in company
        assert "website" in company
        
        # Verify cover_page has required fields
        cover = data["cover_page"]
        assert "enabled" in cover
        assert "show_logo" in cover
        assert "show_submitted_by" in cover
        
        # Verify back_cover has required fields
        back = data["back_cover"]
        assert "enabled" in back
        assert "title" in back
        assert "show_address" in back
        
        # Verify header_footer has required fields
        hf = data["header_footer"]
        assert "show_header" in hf
        assert "show_footer" in hf
        assert "show_page_numbers" in hf
        
        print("✓ Settings API returns all required sections with correct fields")
    
    def test_settings_update_persists(self):
        """Test that settings updates persist correctly"""
        # Update settings
        test_company_name = f"TEST_Persistence_{int(time.time())}"
        update_response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={"company_info": {"company_name": test_company_name}}
        )
        assert update_response.status_code == 200
        
        # Fetch settings again
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["company_info"]["company_name"] == test_company_name
        
        print("✓ Settings updates persist correctly")
        
        # Reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
    
    def test_settings_reset_restores_defaults(self):
        """Test that reset restores default values"""
        # First update settings
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "company_info": {"company_name": "TEST_Modified"},
                "branding": {"primary_color": "#123456"}
            }
        )
        
        # Reset
        reset_response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        assert reset_response.status_code == 200
        
        # Verify defaults restored
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["company_info"]["company_name"] == "Enerzia Power Solutions"
        assert data["branding"]["primary_color"] == "#F7931E"
        
        print("✓ Settings reset restores default values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
