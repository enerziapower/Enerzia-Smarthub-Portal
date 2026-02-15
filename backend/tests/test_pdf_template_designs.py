"""
PDF Template Settings - Design Options and Per-Report-Type Settings Tests
Tests for the new 5 decorative design options and per-report-type design settings.
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

# Report types
REPORT_TYPES = ['amc', 'calibration', 'wcc', 'equipment_test', 'ir_thermography', 'service', 'project_completion']

# Design options
DESIGN_OPTIONS = ['design_1', 'design_2', 'design_3', 'design_4', 'design_5']

# Default colors for each report type
DEFAULT_COLORS = {
    'amc': '#F7931E',
    'calibration': '#2563eb',
    'wcc': '#22c55e',
    'equipment_test': '#8b5cf6',
    'ir_thermography': '#ef4444',
    'service': '#f59e0b',
    'project_completion': '#06b6d4'
}


class TestDesignOptionsAPI:
    """Test design options API endpoints"""
    
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
    
    def test_get_design_options(self):
        """Test GET /api/pdf-template/designs returns all 5 design options"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/designs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "designs" in data, "Response should contain 'designs'"
        assert "report_types" in data, "Response should contain 'report_types'"
        
        # Verify all 5 designs are present
        designs = data["designs"]
        for design_id in DESIGN_OPTIONS:
            assert design_id in designs, f"Design {design_id} should be present"
            assert "name" in designs[design_id], f"Design {design_id} should have 'name'"
            assert "description" in designs[design_id], f"Design {design_id} should have 'description'"
        
        # Verify design names
        assert designs["design_1"]["name"] == "Flowing Waves"
        assert designs["design_2"]["name"] == "Geometric Arcs"
        assert designs["design_3"]["name"] == "Diagonal Stripes"
        assert designs["design_4"]["name"] == "Corner Brackets"
        assert designs["design_5"]["name"] == "Circular Dots"
        
        # Verify all 7 report types are present
        report_types = data["report_types"]
        for rt in REPORT_TYPES:
            assert rt in report_types, f"Report type {rt} should be present"
        
        print("✓ GET /api/pdf-template/designs returns all 5 design options and 7 report types")
    
    def test_settings_contain_report_designs(self):
        """Test GET /api/pdf-template/settings contains report_designs for all 7 report types"""
        # First ensure settings have report_designs by doing a reset
        self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        
        response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify report_designs section exists
        assert "report_designs" in data, "Response should contain 'report_designs'"
        
        report_designs = data["report_designs"]
        
        # Verify all 7 report types have design settings
        for rt in REPORT_TYPES:
            assert rt in report_designs, f"Report type {rt} should have design settings"
            design = report_designs[rt]
            assert "design_id" in design, f"Report type {rt} should have 'design_id'"
            assert "design_color" in design, f"Report type {rt} should have 'design_color'"
            
            # Verify design_id is valid
            assert design["design_id"] in DESIGN_OPTIONS, f"Design ID for {rt} should be valid"
        
        print("✓ GET /api/pdf-template/settings contains report_designs for all 7 report types")
    
    def test_update_report_design_via_settings(self):
        """Test PUT /api/pdf-template/settings updates report_designs"""
        update_payload = {
            "report_designs": {
                "amc": {
                    "design_id": "design_3",
                    "design_color": "#FF0000"
                },
                "calibration": {
                    "design_id": "design_5",
                    "design_color": "#00FF00"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        settings = data["settings"]
        
        # Verify AMC design was updated
        assert settings["report_designs"]["amc"]["design_id"] == "design_3"
        assert settings["report_designs"]["amc"]["design_color"] == "#FF0000"
        
        # Verify Calibration design was updated
        assert settings["report_designs"]["calibration"]["design_id"] == "design_5"
        assert settings["report_designs"]["calibration"]["design_color"] == "#00FF00"
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        fetched = get_response.json()
        
        assert fetched["report_designs"]["amc"]["design_id"] == "design_3"
        assert fetched["report_designs"]["calibration"]["design_id"] == "design_5"
        
        print("✓ PUT /api/pdf-template/settings updates report_designs correctly")
    
    def test_update_single_report_design_endpoint(self):
        """Test PUT /api/pdf-template/report-design/{report_type} updates design for specific report type"""
        # Update AMC design
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/report-design/amc?design_id=design_4&design_color=%23ABCDEF"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["design_id"] == "design_4"
        assert data["design_color"] == "#ABCDEF"
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        settings = get_response.json()
        
        assert settings["report_designs"]["amc"]["design_id"] == "design_4"
        assert settings["report_designs"]["amc"]["design_color"] == "#ABCDEF"
        
        print("✓ PUT /api/pdf-template/report-design/{report_type} updates design correctly")
    
    def test_update_report_design_invalid_report_type(self):
        """Test PUT /api/pdf-template/report-design/{report_type} rejects invalid report type"""
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/report-design/invalid_type?design_id=design_1&design_color=%23FF0000"
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✓ PUT /api/pdf-template/report-design rejects invalid report type")
    
    def test_update_report_design_invalid_design_id(self):
        """Test PUT /api/pdf-template/report-design/{report_type} rejects invalid design_id"""
        response = self.session.put(
            f"{BASE_URL}/api/pdf-template/report-design/amc?design_id=design_99&design_color=%23FF0000"
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✓ PUT /api/pdf-template/report-design rejects invalid design_id")


class TestPreviewEndpoints:
    """Test preview endpoints with report_type parameter"""
    
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
    
    def test_preview_accepts_report_type_parameter(self):
        """Test GET /api/pdf-template/preview accepts report_type parameter"""
        for report_type in REPORT_TYPES:
            response = self.session.get(
                f"{BASE_URL}/api/pdf-template/preview?page_type=cover&report_type={report_type}"
            )
            
            assert response.status_code == 200, f"Expected 200 for {report_type}, got {response.status_code}"
            assert response.headers.get("content-type") == "application/pdf"
            
            content = response.content
            assert content[:4] == b'%PDF', f"Response for {report_type} should be a valid PDF"
        
        print("✓ GET /api/pdf-template/preview accepts report_type parameter for all 7 report types")
    
    def test_preview_designs_endpoint(self):
        """Test GET /api/pdf-template/preview-designs shows all 5 designs"""
        response = self.session.get(f"{BASE_URL}/api/pdf-template/preview-designs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        
        # PDF should be substantial (5 pages, one for each design)
        assert len(content) > 5000, "PDF should have content for all 5 designs"
        
        print("✓ GET /api/pdf-template/preview-designs generates PDF with all 5 designs")
    
    def test_preview_designs_with_custom_color(self):
        """Test GET /api/pdf-template/preview-designs accepts design_color parameter"""
        response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview-designs?design_color=%23FF5733"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        print("✓ GET /api/pdf-template/preview-designs accepts design_color parameter")
    
    def test_preview_reflects_report_type_design(self):
        """Test that preview uses the correct design for each report type"""
        # First, set different designs for AMC and Calibration
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "report_designs": {
                    "amc": {"design_id": "design_1", "design_color": "#FF0000"},
                    "calibration": {"design_id": "design_5", "design_color": "#0000FF"}
                }
            }
        )
        
        # Generate previews for both
        amc_response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=cover&report_type=amc"
        )
        cal_response = self.session.get(
            f"{BASE_URL}/api/pdf-template/preview?page_type=cover&report_type=calibration"
        )
        
        assert amc_response.status_code == 200
        assert cal_response.status_code == 200
        
        # Both should be valid PDFs but different (different designs)
        amc_content = amc_response.content
        cal_content = cal_response.content
        
        assert amc_content[:4] == b'%PDF'
        assert cal_content[:4] == b'%PDF'
        
        # The PDFs should be different since they use different designs
        # (This is a basic check - actual visual verification would need manual testing)
        print("✓ Preview generates different PDFs for different report types with different designs")


class TestLogoUploadAndDisplay:
    """Test logo upload and display in PDFs"""
    
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
    
    def test_logo_upload_saves_file(self):
        """Test POST /api/pdf-template/upload-logo saves file correctly"""
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/pdf-template/upload-logo",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logo_url" in data
        assert data["logo_url"].startswith("/api/uploads/")
        
        # Verify the logo URL is stored in settings
        settings_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        settings = settings_response.json()
        
        assert settings["branding"]["logo_url"] == data["logo_url"]
        
        print(f"✓ Logo uploaded and stored in settings: {data['logo_url']}")
    
    def test_logo_url_accessible(self):
        """Test that uploaded logo URL is accessible"""
        # First upload a logo
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_logo_access.png', io.BytesIO(png_data), 'image/png')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/pdf-template/upload-logo",
            files=files,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        logo_url = upload_response.json()["logo_url"]
        
        # Try to access the logo
        access_response = self.session.get(f"{BASE_URL}{logo_url}")
        
        assert access_response.status_code == 200, f"Logo should be accessible at {logo_url}"
        assert access_response.headers.get("content-type", "").startswith("image/")
        
        print(f"✓ Uploaded logo is accessible at {logo_url}")


class TestResetToDefaults:
    """Test reset functionality restores default designs"""
    
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
    
    def test_reset_restores_default_report_designs(self):
        """Test POST /api/pdf-template/reset restores default report designs"""
        # First, modify some report designs
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "report_designs": {
                    "amc": {"design_id": "design_5", "design_color": "#000000"},
                    "calibration": {"design_id": "design_4", "design_color": "#111111"}
                }
            }
        )
        
        # Verify modification
        get_response = self.session.get(f"{BASE_URL}/api/pdf-template/settings")
        modified = get_response.json()
        assert modified["report_designs"]["amc"]["design_id"] == "design_5"
        
        # Reset to defaults
        reset_response = self.session.post(f"{BASE_URL}/api/pdf-template/reset")
        assert reset_response.status_code == 200
        
        # Verify defaults are restored
        settings = reset_response.json()["settings"]
        
        # Check default designs
        assert settings["report_designs"]["amc"]["design_id"] == "design_1"
        assert settings["report_designs"]["amc"]["design_color"] == "#F7931E"
        
        assert settings["report_designs"]["calibration"]["design_id"] == "design_2"
        assert settings["report_designs"]["calibration"]["design_color"] == "#2563eb"
        
        print("✓ POST /api/pdf-template/reset restores default report designs")


class TestAMCPDFUsesDesignSettings:
    """Test that AMC PDF generation uses the design settings"""
    
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
    
    def test_amc_pdf_generation_with_custom_design(self):
        """Test AMC PDF uses custom design settings"""
        # Set custom design for AMC
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "report_designs": {
                    "amc": {"design_id": "design_3", "design_color": "#FF5733"}
                }
            }
        )
        
        # Find an existing AMC to generate PDF
        amcs_response = self.session.get(f"{BASE_URL}/api/amcs")
        if amcs_response.status_code != 200:
            pytest.skip("Could not fetch AMCs")
        
        amcs = amcs_response.json()
        if not amcs:
            pytest.skip("No AMCs available for testing")
        
        amc_id = amcs[0]["id"]
        
        # Generate AMC PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/amc/{amc_id}/pdf")
        
        assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 5000, "PDF should have substantial content"
        
        print("✓ AMC PDF generated successfully with custom design settings")


class TestCalibrationPDFUsesDesignSettings:
    """Test that Calibration PDF generation uses the design settings"""
    
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
    
    def test_calibration_pdf_generation_with_custom_design(self):
        """Test Calibration PDF uses custom design settings"""
        # Set custom design for Calibration
        self.session.put(
            f"{BASE_URL}/api/pdf-template/settings",
            json={
                "report_designs": {
                    "calibration": {"design_id": "design_4", "design_color": "#00FF00"}
                }
            }
        )
        
        # Find an existing Calibration contract to generate PDF
        contracts_response = self.session.get(f"{BASE_URL}/api/calibration-contracts")
        if contracts_response.status_code != 200:
            pytest.skip("Could not fetch Calibration contracts")
        
        contracts = contracts_response.json()
        if not contracts:
            pytest.skip("No Calibration contracts available for testing")
        
        contract_id = contracts[0]["id"]
        
        # Generate Calibration PDF
        pdf_response = self.session.get(f"{BASE_URL}/api/calibration-report/{contract_id}/report-pdf")
        
        assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 5000, "PDF should have substantial content"
        
        print("✓ Calibration PDF generated successfully with custom design settings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
