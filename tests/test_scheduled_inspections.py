"""
Test Scheduled Inspections API
Tests for the periodic inspection scheduling feature with reminders
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@enerzia.com"
TEST_PASSWORD = "admin123"


class TestScheduledInspectionsAPI:
    """Test suite for Scheduled Inspections endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        yield
        
        # Cleanup - delete test inspections
        try:
            inspections = self.session.get(f"{BASE_URL}/api/scheduled-inspections").json()
            for insp in inspections:
                if insp.get("title", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/scheduled-inspections/{insp['id']}")
        except:
            pass
    
    def test_01_get_dashboard_stats(self):
        """Test dashboard endpoint returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections/dashboard")
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        # Verify dashboard structure
        assert "total_active" in data, "Missing total_active in dashboard"
        assert "overdue" in data, "Missing overdue in dashboard"
        assert "due_today" in data, "Missing due_today in dashboard"
        assert "due_this_week" in data, "Missing due_this_week in dashboard"
        assert "due_this_month" in data, "Missing due_this_month in dashboard"
        
        print(f"Dashboard stats: total_active={data['total_active']}, overdue={data['overdue']}, due_today={data['due_today']}")
    
    def test_02_get_all_inspections(self):
        """Test getting all scheduled inspections"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections")
        
        assert response.status_code == 200, f"Get all failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} scheduled inspections")
    
    def test_03_create_inspection_monthly(self):
        """Test creating a new monthly inspection"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        inspection_data = {
            "title": "TEST_Monthly Transformer Inspection",
            "inspection_type": "equipment",
            "equipment_type": "transformer",
            "location": "Chennai Plant - Building A",
            "frequency": "monthly",
            "start_date": today,
            "assigned_to": "Test Engineer",
            "reminder_days": 3,
            "notes": "Monthly transformer inspection test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json=inspection_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain inspection ID"
        assert data.get("message") == "Scheduled inspection created"
        
        # Store ID for later tests
        self.created_inspection_id = data["id"]
        print(f"Created inspection with ID: {data['id']}")
        
        return data["id"]
    
    def test_04_create_inspection_quarterly(self):
        """Test creating a quarterly AMC inspection"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        inspection_data = {
            "title": "TEST_Quarterly AMC Visit",
            "inspection_type": "amc",
            "location": "Mumbai Office",
            "frequency": "quarterly",
            "start_date": future_date,
            "customer_name": "Test Customer",
            "assigned_to": "AMC Engineer",
            "reminder_days": 5,
            "notes": "Quarterly AMC visit test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json=inspection_data)
        
        assert response.status_code == 200, f"Create quarterly failed: {response.text}"
        print(f"Created quarterly inspection: {response.json()}")
    
    def test_05_get_inspection_by_id(self):
        """Test getting a specific inspection by ID"""
        # First create an inspection
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json={
            "title": "TEST_Get By ID Test",
            "inspection_type": "audit",
            "location": "Test Location",
            "frequency": "yearly",
            "start_date": today
        })
        
        assert create_response.status_code == 200
        inspection_id = create_response.json()["id"]
        
        # Get by ID
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}")
        
        assert response.status_code == 200, f"Get by ID failed: {response.text}"
        
        data = response.json()
        assert data["id"] == inspection_id
        assert data["title"] == "TEST_Get By ID Test"
        assert data["inspection_type"] == "audit"
        assert data["frequency"] == "yearly"
        print(f"Retrieved inspection: {data['title']}")
    
    def test_06_update_inspection(self):
        """Test updating an inspection"""
        # First create an inspection
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json={
            "title": "TEST_Update Test",
            "inspection_type": "equipment",
            "location": "Original Location",
            "frequency": "monthly",
            "start_date": today
        })
        
        assert create_response.status_code == 200
        inspection_id = create_response.json()["id"]
        
        # Update the inspection
        update_data = {
            "title": "TEST_Updated Title",
            "location": "Updated Location",
            "assigned_to": "New Engineer"
        }
        
        response = self.session.put(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}", json=update_data)
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}")
        updated = get_response.json()
        
        assert updated["title"] == "TEST_Updated Title"
        assert updated["location"] == "Updated Location"
        assert updated["assigned_to"] == "New Engineer"
        print(f"Updated inspection successfully")
    
    def test_07_complete_inspection_monthly(self):
        """Test completing an inspection and verifying next due date calculation for monthly"""
        # Create a monthly inspection
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json={
            "title": "TEST_Complete Monthly Test",
            "inspection_type": "equipment",
            "location": "Test Site",
            "frequency": "monthly",
            "start_date": today
        })
        
        assert create_response.status_code == 200
        inspection_id = create_response.json()["id"]
        
        # Complete the inspection
        complete_data = {
            "completed_date": today
        }
        
        response = self.session.put(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}/complete", json=complete_data)
        
        assert response.status_code == 200, f"Complete failed: {response.text}"
        
        data = response.json()
        assert "next_due_date" in data, "Response should contain next_due_date"
        
        # Verify next due date is ~30 days from today
        expected_next = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        assert data["next_due_date"] == expected_next, f"Expected {expected_next}, got {data['next_due_date']}"
        
        print(f"Completed inspection. Next due: {data['next_due_date']}")
    
    def test_08_complete_inspection_quarterly(self):
        """Test completing an inspection and verifying next due date calculation for quarterly"""
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json={
            "title": "TEST_Complete Quarterly Test",
            "inspection_type": "amc",
            "location": "Test Site",
            "frequency": "quarterly",
            "start_date": today
        })
        
        assert create_response.status_code == 200
        inspection_id = create_response.json()["id"]
        
        # Complete the inspection
        response = self.session.put(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}/complete", json={
            "completed_date": today
        })
        
        assert response.status_code == 200, f"Complete quarterly failed: {response.text}"
        
        data = response.json()
        # Quarterly = 90 days
        expected_next = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        assert data["next_due_date"] == expected_next, f"Expected {expected_next}, got {data['next_due_date']}"
        
        print(f"Quarterly inspection completed. Next due: {data['next_due_date']}")
    
    def test_09_delete_inspection(self):
        """Test deleting an inspection"""
        # Create an inspection to delete
        today = datetime.now().strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/scheduled-inspections", json={
            "title": "TEST_Delete Test",
            "inspection_type": "other",
            "location": "Delete Location",
            "frequency": "weekly",
            "start_date": today
        })
        
        assert create_response.status_code == 200
        inspection_id = create_response.json()["id"]
        
        # Delete the inspection
        response = self.session.delete(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}")
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/scheduled-inspections/{inspection_id}")
        assert get_response.status_code == 404, "Inspection should be deleted"
        
        print(f"Deleted inspection successfully")
    
    def test_10_filter_by_status(self):
        """Test filtering inspections by status"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections", params={"status": "active"})
        
        assert response.status_code == 200, f"Filter by status failed: {response.text}"
        
        data = response.json()
        # All returned inspections should be active
        for insp in data:
            assert insp.get("status") == "active", f"Found non-active inspection: {insp.get('status')}"
        
        print(f"Found {len(data)} active inspections")
    
    def test_11_filter_by_type(self):
        """Test filtering inspections by type"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections", params={"inspection_type": "equipment"})
        
        assert response.status_code == 200, f"Filter by type failed: {response.text}"
        
        data = response.json()
        for insp in data:
            assert insp.get("inspection_type") == "equipment", f"Found non-equipment inspection: {insp.get('inspection_type')}"
        
        print(f"Found {len(data)} equipment inspections")
    
    def test_12_get_nonexistent_inspection(self):
        """Test getting a non-existent inspection returns 404"""
        response = self.session.get(f"{BASE_URL}/api/scheduled-inspections/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent inspection")
    
    def test_13_complete_nonexistent_inspection(self):
        """Test completing a non-existent inspection returns 404"""
        response = self.session.put(f"{BASE_URL}/api/scheduled-inspections/nonexistent-id-12345/complete", json={
            "completed_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for completing non-existent inspection")
    
    def test_14_delete_nonexistent_inspection(self):
        """Test deleting a non-existent inspection returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/scheduled-inspections/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for deleting non-existent inspection")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
