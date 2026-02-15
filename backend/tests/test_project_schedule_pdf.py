"""
Test Project Schedule PDF Generation
Tests the POST /api/project-schedule/pdf endpoint for comprehensive PDF generation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProjectSchedulePDF:
    """Test Project Schedule PDF generation endpoint"""
    
    def test_pdf_generation_basic(self):
        """Test basic PDF generation with minimal data"""
        payload = {
            "schedule_name": "Basic Test Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf'
        assert len(response.content) > 1000, "PDF should be larger than 1KB"
    
    def test_pdf_generation_with_phases(self):
        """Test PDF generation with phases data"""
        payload = {
            "schedule_name": "Test Project with Phases",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "phases": [
                {"name": "Planning & Design", "start": "01/01/2025", "end": "15/01/2025", "progress": 100},
                {"name": "Material Procurement", "start": "16/01/2025", "end": "31/01/2025", "progress": 75},
                {"name": "Installation", "start": "01/02/2025", "end": "28/02/2025", "progress": 30},
                {"name": "Testing & Commissioning", "start": "01/03/2025", "end": "31/03/2025", "progress": 0}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        # PDF with phases should be larger
        assert len(response.content) > 50000, "PDF with phases should be larger than 50KB"
    
    def test_pdf_generation_with_milestones(self):
        """Test PDF generation with milestones data"""
        payload = {
            "schedule_name": "Test Project with Milestones",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "phases": [
                {"name": "Phase 1", "start": "01/01/2025", "end": "31/01/2025", "progress": 50}
            ],
            "milestones": [
                {"name": "Design Approval", "date": "15/01/2025", "completed": True},
                {"name": "Materials Delivered", "date": "31/01/2025", "completed": False},
                {"name": "Installation Complete", "date": "28/02/2025", "completed": False}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
    
    def test_pdf_generation_with_project_info(self):
        """Test PDF generation with embedded project information"""
        payload = {
            "schedule_name": "Full Project Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "phases": [
                {"name": "Planning & Design", "start": "01/01/2025", "end": "15/01/2025", "progress": 100},
                {"name": "Material Procurement", "start": "16/01/2025", "end": "31/01/2025", "progress": 75}
            ],
            "milestones": [
                {"name": "Design Approval", "date": "15/01/2025", "completed": True}
            ],
            "project": {
                "pid_no": "PID-2025-001",
                "client": "Test Client Corporation",
                "location": "Mumbai, Maharashtra, India",
                "engineer_in_charge": "John Doe",
                "po_number": "PO-12345"
            },
            "notes": "This is a test project schedule with comprehensive data."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        
        # Check content-disposition header for filename
        content_disposition = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disposition, "Should have attachment disposition"
        assert 'Project_Schedule' in content_disposition, "Filename should contain Project_Schedule"
    
    def test_pdf_generation_all_statuses(self):
        """Test PDF generation with different status values"""
        statuses = ['draft', 'in_progress', 'completed']
        
        for status in statuses:
            payload = {
                "schedule_name": f"Test Schedule - {status}",
                "start_date": "01/01/2025",
                "end_date": "31/03/2025",
                "status": status,
                "phases": [
                    {"name": "Test Phase", "start": "01/01/2025", "end": "31/01/2025", "progress": 50}
                ],
                "milestones": []
            }
            
            response = requests.post(
                f"{BASE_URL}/api/project-schedule/pdf",
                json=payload
            )
            
            assert response.status_code == 200, f"Failed for status '{status}': {response.status_code}"
    
    def test_pdf_generation_date_formats(self):
        """Test PDF generation with different date formats"""
        # Test DD/MM/YYYY format
        payload = {
            "schedule_name": "Date Format Test",
            "start_date": "15/01/2025",
            "end_date": "15/04/2025",
            "status": "draft",
            "phases": [
                {"name": "Phase 1", "start": "15/01/2025", "end": "15/02/2025", "progress": 0}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"DD/MM/YYYY format failed: {response.status_code}"
    
    def test_pdf_generation_iso_date_format(self):
        """Test PDF generation with ISO date format"""
        payload = {
            "schedule_name": "ISO Date Format Test",
            "start_date": "2025-01-15",
            "end_date": "2025-04-15",
            "status": "draft",
            "phases": [
                {"name": "Phase 1", "start": "2025-01-15", "end": "2025-02-15", "progress": 0}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"ISO date format failed: {response.status_code}"
    
    def test_pdf_generation_many_phases(self):
        """Test PDF generation with many phases (stress test)"""
        phases = []
        for i in range(10):
            phases.append({
                "name": f"Phase {i+1} - Long Phase Name for Testing",
                "start": f"{str(i+1).zfill(2)}/01/2025",
                "end": f"{str(i+1).zfill(2)}/02/2025",
                "progress": (i * 10) % 100
            })
        
        payload = {
            "schedule_name": "Many Phases Test",
            "start_date": "01/01/2025",
            "end_date": "31/12/2025",
            "status": "in_progress",
            "phases": phases,
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Many phases test failed: {response.status_code}"
    
    def test_pdf_generation_empty_phases(self):
        """Test PDF generation with empty phases array"""
        payload = {
            "schedule_name": "Empty Phases Test",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Empty phases test failed: {response.status_code}"
    
    def test_pdf_generation_special_characters(self):
        """Test PDF generation with special characters in names"""
        payload = {
            "schedule_name": "Test & Project (Special) - 2025",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [
                {"name": "Phase 1 - Design & Planning", "start": "01/01/2025", "end": "31/01/2025", "progress": 50}
            ],
            "milestones": [
                {"name": "Milestone #1 (Important)", "date": "15/01/2025", "completed": True}
            ],
            "notes": "Notes with special chars: & < > \" ' @ # $ %"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Special characters test failed: {response.status_code}"
    
    def test_pdf_generation_long_names(self):
        """Test PDF generation with very long names"""
        long_name = "A" * 200  # 200 character name
        
        payload = {
            "schedule_name": long_name,
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [
                {"name": long_name, "start": "01/01/2025", "end": "31/01/2025", "progress": 50}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Long names test failed: {response.status_code}"


class TestProjectScheduleNewFeatures:
    """Test new features: customer_info and subItems"""
    
    def test_pdf_generation_with_customer_info(self):
        """Test PDF generation with customer information section"""
        payload = {
            "schedule_name": "Customer Info Test Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "customer_info": {
                "name": "Test Customer Name",
                "company": "Test Company Ltd",
                "location": "Mumbai, Maharashtra, India",
                "contact_person": "John Doe",
                "phone": "+91 9876543210",
                "email": "john@testcompany.com"
            },
            "phases": [
                {"name": "Planning & Design", "start": "01/01/2025", "end": "15/01/2025", "progress": 100}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Customer info test failed: {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        # PDF with customer info should be larger
        assert len(response.content) > 50000, "PDF with customer info should be larger than 50KB"
    
    def test_pdf_generation_with_sub_items(self):
        """Test PDF generation with phase sub-items"""
        payload = {
            "schedule_name": "Sub-Items Test Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "phases": [
                {
                    "name": "Material Procurement",
                    "start": "01/01/2025",
                    "end": "31/01/2025",
                    "progress": 50,
                    "subItems": [
                        {"description": "4C x 35mm Cable", "quantity": "500", "unit": "m", "location": "1st Floor - 200m", "remarks": "High priority"},
                        {"description": "Panel Board", "quantity": "10", "unit": "nos", "location": "Ground Floor", "remarks": ""},
                        {"description": "MCB 32A", "quantity": "50", "unit": "nos", "location": "All floors", "remarks": "Standard type"}
                    ]
                },
                {
                    "name": "Installation",
                    "start": "01/02/2025",
                    "end": "28/02/2025",
                    "progress": 0,
                    "subItems": [
                        {"description": "Cable laying", "quantity": "500", "unit": "m", "location": "Building A", "remarks": ""}
                    ]
                }
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Sub-items test failed: {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        # PDF with sub-items should be larger
        assert len(response.content) > 50000, "PDF with sub-items should be larger than 50KB"
    
    def test_pdf_generation_with_customer_info_and_sub_items(self):
        """Test PDF generation with both customer info and sub-items"""
        payload = {
            "schedule_name": "Full Features Test Schedule",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "in_progress",
            "customer_info": {
                "name": "ABC Corporation",
                "company": "ABC Corporation Pvt Ltd",
                "location": "Chennai, Tamil Nadu",
                "contact_person": "Jane Smith",
                "phone": "+91 9876543210",
                "email": "jane@abc.com"
            },
            "phases": [
                {
                    "name": "Planning & Design",
                    "start": "01/01/2025",
                    "end": "15/01/2025",
                    "progress": 100,
                    "subItems": []
                },
                {
                    "name": "Material Procurement",
                    "start": "16/01/2025",
                    "end": "31/01/2025",
                    "progress": 75,
                    "subItems": [
                        {"description": "HT Cable 11kV", "quantity": "200", "unit": "m", "location": "Substation", "remarks": "XLPE type"},
                        {"description": "Transformer 500kVA", "quantity": "1", "unit": "nos", "location": "Substation", "remarks": "Oil cooled"}
                    ]
                },
                {
                    "name": "Installation",
                    "start": "01/02/2025",
                    "end": "28/02/2025",
                    "progress": 30,
                    "subItems": [
                        {"description": "Cable termination", "quantity": "4", "unit": "nos", "location": "HT Panel", "remarks": ""}
                    ]
                }
            ],
            "milestones": [
                {"name": "Design Approval", "date": "15/01/2025", "completed": True},
                {"name": "Materials Delivered", "date": "31/01/2025", "completed": False}
            ],
            "project": {
                "pid_no": "PID-2025-TEST",
                "client": "ABC Corporation",
                "location": "Chennai",
                "engineer_in_charge": "Test Engineer",
                "po_number": "PO-TEST-001"
            },
            "notes": "This is a comprehensive test with all new features."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Full features test failed: {response.status_code}"
        assert response.headers.get('content-type') == 'application/pdf'
        # PDF with all features should be larger
        assert len(response.content) > 60000, "PDF with all features should be larger than 60KB"
    
    def test_pdf_generation_empty_sub_items(self):
        """Test PDF generation with empty subItems arrays"""
        payload = {
            "schedule_name": "Empty Sub-Items Test",
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [
                {"name": "Phase 1", "start": "01/01/2025", "end": "31/01/2025", "progress": 0, "subItems": []},
                {"name": "Phase 2", "start": "01/02/2025", "end": "28/02/2025", "progress": 0, "subItems": []}
            ],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Empty sub-items test failed: {response.status_code}"


class TestProjectSchedulePDFValidation:
    """Test validation and error handling for PDF generation"""
    
    def test_pdf_generation_missing_schedule_name(self):
        """Test PDF generation without schedule_name - should still work with default"""
        payload = {
            "start_date": "01/01/2025",
            "end_date": "31/03/2025",
            "status": "draft",
            "phases": [],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        # Should still generate PDF with default/empty name
        assert response.status_code == 200, f"Missing schedule_name should still work: {response.status_code}"
    
    def test_pdf_generation_missing_dates(self):
        """Test PDF generation without dates"""
        payload = {
            "schedule_name": "No Dates Test",
            "status": "draft",
            "phases": [],
            "milestones": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json=payload
        )
        
        # Should still generate PDF
        assert response.status_code == 200, f"Missing dates should still work: {response.status_code}"
    
    def test_pdf_generation_empty_body(self):
        """Test PDF generation with empty body"""
        response = requests.post(
            f"{BASE_URL}/api/project-schedule/pdf",
            json={}
        )
        
        # Should still generate PDF with defaults
        assert response.status_code == 200, f"Empty body should still work: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
