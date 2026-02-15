"""
Test Calibration PDF Report Generation
Verifies that the Calibration PDF matches the AMC PDF structure
"""
import pytest
import requests
import os
from io import BytesIO

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREDENTIALS = {
    "email": "admin@enerzia.com",
    "password": "admin123"
}

# Test IDs
TEST_CALIBRATION_ID = "test-cal-001"
TEST_AMC_ID = "test-amc-001"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TEST_CREDENTIALS
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCalibrationPDFEndpoint:
    """Test Calibration PDF Report endpoint"""
    
    def test_calibration_pdf_endpoint_exists(self, api_client):
        """Test that the calibration PDF endpoint returns 200"""
        response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        print(f"PASS: Calibration PDF endpoint returns 200 with PDF content")
    
    def test_amc_pdf_endpoint_exists(self, api_client):
        """Test that the AMC PDF endpoint returns 200 (reference)"""
        response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf', "Expected PDF content type"
        print(f"PASS: AMC PDF endpoint returns 200 with PDF content")
    
    def test_calibration_pdf_not_found(self, api_client):
        """Test that non-existent calibration returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/calibration-report/non-existent-id/report-pdf"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Non-existent calibration returns 404")


class TestCalibrationPDFStructure:
    """Test Calibration PDF structure matches AMC PDF"""
    
    @pytest.fixture(scope="class")
    def calibration_pdf_content(self, api_client):
        """Download calibration PDF"""
        response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        return response.content
    
    @pytest.fixture(scope="class")
    def amc_pdf_content(self, api_client):
        """Download AMC PDF"""
        response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        return response.content
    
    def test_pdf_has_multiple_pages(self, calibration_pdf_content):
        """Test that calibration PDF has multiple pages"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        page_count = len(reader.pages)
        assert page_count >= 5, f"Expected at least 5 pages, got {page_count}"
        print(f"PASS: Calibration PDF has {page_count} pages")
    
    def test_cover_page_has_title(self, calibration_pdf_content):
        """Test that cover page has 'Calibration Service Contract Report' title"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        cover_text = reader.pages[0].extract_text()
        
        assert "Calibration Service" in cover_text, "Cover page should have 'Calibration Service'"
        assert "Contract Report" in cover_text, "Cover page should have 'Contract Report'"
        print(f"PASS: Cover page has correct title")
    
    def test_cover_page_has_customer_info(self, calibration_pdf_content):
        """Test that cover page has customer info box"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        cover_text = reader.pages[0].extract_text()
        
        assert "CUSTOMER:" in cover_text, "Cover page should have CUSTOMER label"
        assert "LOCATION:" in cover_text, "Cover page should have LOCATION label"
        assert "CONTRACT" in cover_text, "Cover page should have CONTRACT info"
        print(f"PASS: Cover page has customer info box")
    
    def test_cover_page_has_submitted_by(self, calibration_pdf_content):
        """Test that cover page has 'Submitted By' section"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        cover_text = reader.pages[0].extract_text()
        
        assert "Submitted By" in cover_text, "Cover page should have 'Submitted By'"
        assert "Enerzia Power Solutions" in cover_text, "Cover page should have company name"
        print(f"PASS: Cover page has 'Submitted By' section")
    
    def test_toc_says_contents_not_table_of_contents(self, calibration_pdf_content):
        """Test that TOC header says 'CONTENTS' not 'TABLE OF CONTENTS'"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        toc_text = reader.pages[1].extract_text()
        
        # Should have CONTENTS
        assert "CONTENTS" in toc_text, "TOC should have 'CONTENTS' header"
        # Should NOT have TABLE OF CONTENTS
        assert "TABLE OF CONTENTS" not in toc_text, "TOC should NOT say 'TABLE OF CONTENTS'"
        print(f"PASS: TOC says 'CONTENTS' not 'TABLE OF CONTENTS'")
    
    def test_pages_2_plus_have_header(self, calibration_pdf_content):
        """Test that pages 2+ have header with report title"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        
        # Check page 2 (TOC) and page 3
        for page_num in [1, 2]:  # 0-indexed
            page_text = reader.pages[page_num].extract_text()
            assert "CALIBRATION SERVICE CONTRACT REPORT" in page_text, f"Page {page_num+1} should have header"
            assert "REPORT No:" in page_text, f"Page {page_num+1} should have report number"
        print(f"PASS: Pages 2+ have proper header")
    
    def test_pages_2_plus_have_footer(self, calibration_pdf_content):
        """Test that pages 2+ have footer with company name and website"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        
        # Check page 2 (TOC) and page 3
        for page_num in [1, 2]:  # 0-indexed
            page_text = reader.pages[page_num].extract_text()
            assert "Enerzia Power Solutions" in page_text, f"Page {page_num+1} should have company in footer"
            assert "www.enerzia.com" in page_text, f"Page {page_num+1} should have website in footer"
        print(f"PASS: Pages 2+ have proper footer")
    
    def test_back_cover_no_header_footer(self, calibration_pdf_content):
        """Test that back cover does NOT have header/footer"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        
        last_page_text = reader.pages[-1].extract_text()
        
        # Back cover should have contact info
        assert "Contact Us" in last_page_text, "Back cover should have 'Contact Us'"
        
        # Back cover should NOT have the report header
        assert "CALIBRATION SERVICE CONTRACT REPORT" not in last_page_text, "Back cover should NOT have report header"
        assert "REPORT No:" not in last_page_text, "Back cover should NOT have report number"
        assert "Page" not in last_page_text or "Page" in "Pincode", "Back cover should NOT have page number"
        print(f"PASS: Back cover does NOT have header/footer")
    
    def test_back_cover_has_contact_info(self, calibration_pdf_content):
        """Test that back cover has proper contact information"""
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(calibration_pdf_content))
        
        last_page_text = reader.pages[-1].extract_text()
        
        assert "Contact Us" in last_page_text, "Back cover should have 'Contact Us'"
        assert "Enerzia Power Solutions" in last_page_text, "Back cover should have company name"
        assert "Chennai" in last_page_text, "Back cover should have address"
        assert "www.enerzia.com" in last_page_text, "Back cover should have website"
        print(f"PASS: Back cover has proper contact information")


class TestCalibrationPDFMatchesAMC:
    """Compare Calibration PDF structure with AMC PDF"""
    
    def test_both_pdfs_have_similar_structure(self, api_client):
        """Test that both PDFs have similar page structure"""
        from PyPDF2 import PdfReader
        
        # Get both PDFs
        cal_response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        amc_response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        
        cal_reader = PdfReader(BytesIO(cal_response.content))
        amc_reader = PdfReader(BytesIO(amc_response.content))
        
        # Both should have multiple pages
        assert len(cal_reader.pages) >= 5, "Calibration PDF should have at least 5 pages"
        assert len(amc_reader.pages) >= 5, "AMC PDF should have at least 5 pages"
        
        print(f"PASS: Both PDFs have similar page count (Cal: {len(cal_reader.pages)}, AMC: {len(amc_reader.pages)})")
    
    def test_both_cover_pages_have_decorative_elements(self, api_client):
        """Test that both cover pages have similar structure"""
        from PyPDF2 import PdfReader
        
        # Get both PDFs
        cal_response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        amc_response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        
        cal_reader = PdfReader(BytesIO(cal_response.content))
        amc_reader = PdfReader(BytesIO(amc_response.content))
        
        cal_cover = cal_reader.pages[0].extract_text()
        amc_cover = amc_reader.pages[0].extract_text()
        
        # Both should have Submitted By section
        assert "Submitted By" in cal_cover, "Calibration cover should have 'Submitted By'"
        assert "Submitted By" in amc_cover, "AMC cover should have 'Submitted By'"
        
        # Both should have customer info
        assert "CUSTOMER:" in cal_cover, "Calibration cover should have CUSTOMER"
        assert "CUSTOMER:" in amc_cover, "AMC cover should have CUSTOMER"
        
        # Both should have location
        assert "LOCATION:" in cal_cover, "Calibration cover should have LOCATION"
        assert "LOCATION:" in amc_cover, "AMC cover should have LOCATION"
        
        print(f"PASS: Both cover pages have similar structure")
    
    def test_both_tocs_say_contents(self, api_client):
        """Test that both TOCs say 'CONTENTS'"""
        from PyPDF2 import PdfReader
        
        # Get both PDFs
        cal_response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        amc_response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        
        cal_reader = PdfReader(BytesIO(cal_response.content))
        amc_reader = PdfReader(BytesIO(amc_response.content))
        
        cal_toc = cal_reader.pages[1].extract_text()
        amc_toc = amc_reader.pages[1].extract_text()
        
        # Both should have CONTENTS
        assert "CONTENTS" in cal_toc, "Calibration TOC should have 'CONTENTS'"
        assert "CONTENTS" in amc_toc, "AMC TOC should have 'CONTENTS'"
        
        # Neither should have TABLE OF CONTENTS
        assert "TABLE OF CONTENTS" not in cal_toc, "Calibration TOC should NOT say 'TABLE OF CONTENTS'"
        assert "TABLE OF CONTENTS" not in amc_toc, "AMC TOC should NOT say 'TABLE OF CONTENTS'"
        
        print(f"PASS: Both TOCs say 'CONTENTS'")
    
    def test_both_back_covers_match(self, api_client):
        """Test that both back covers have similar structure"""
        from PyPDF2 import PdfReader
        
        # Get both PDFs
        cal_response = api_client.get(
            f"{BASE_URL}/api/calibration-report/{TEST_CALIBRATION_ID}/report-pdf"
        )
        amc_response = api_client.get(
            f"{BASE_URL}/api/amc-report/{TEST_AMC_ID}/pdf"
        )
        
        cal_reader = PdfReader(BytesIO(cal_response.content))
        amc_reader = PdfReader(BytesIO(amc_response.content))
        
        cal_back = cal_reader.pages[-1].extract_text()
        amc_back = amc_reader.pages[-1].extract_text()
        
        # Both should have Contact Us
        assert "Contact Us" in cal_back, "Calibration back cover should have 'Contact Us'"
        assert "Contact Us" in amc_back, "AMC back cover should have 'Contact Us'"
        
        # Both should have company info
        assert "Enerzia Power Solutions" in cal_back, "Calibration back cover should have company"
        assert "Enerzia Power Solutions" in amc_back, "AMC back cover should have company"
        
        # Both should have website
        assert "www.enerzia.com" in cal_back, "Calibration back cover should have website"
        assert "www.enerzia.com" in amc_back, "AMC back cover should have website"
        
        print(f"PASS: Both back covers have similar structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
