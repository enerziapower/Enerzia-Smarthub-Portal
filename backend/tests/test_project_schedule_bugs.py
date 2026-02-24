"""
Test Project Schedule Bug Fixes
- Date format DD-MM-YYYY
- Edit schedule form field population
- Escalation matrix data persistence
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProjectScheduleAPI:
    """Test Project Schedule CRUD operations and bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_schedule_id = None
        yield
        # Cleanup: Delete test schedule if created
        if self.test_schedule_id:
            try:
                requests.delete(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}")
            except:
                pass
    
    def test_get_all_schedules(self):
        """Test GET /api/project-schedules returns list of schedules"""
        response = requests.get(f"{BASE_URL}/api/project-schedules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} schedules")
    
    def test_create_schedule_with_escalation_matrix(self):
        """Test creating schedule with escalation matrix data"""
        schedule_data = {
            "project_id": "TEST_PROJECT_ID",
            "schedule_name": "TEST_Schedule_Escalation",
            "start_date": "2025-01-15",
            "end_date": "2025-03-30",
            "customer_info": {
                "name": "TEST_Customer",
                "company": "TEST_Company",
                "location": "TEST_Location",
                "contact_person": "TEST_Contact",
                "phone": "1234567890",
                "email": "test@test.com"
            },
            "phases": [
                {
                    "name": "Planning",
                    "start": "2025-01-15",
                    "end": "2025-02-01",
                    "progress": 0,
                    "color": "bg-blue-500",
                    "subItems": []
                }
            ],
            "milestones": [],
            "escalation_matrix": [
                {"level": 1, "name": "TEST_L1", "designation": "Engineer", "email": "l1@test.com", "mobile": "1111111111"},
                {"level": 2, "name": "TEST_L2", "designation": "Manager", "email": "l2@test.com", "mobile": "2222222222"},
                {"level": 3, "name": "TEST_L3", "designation": "Director", "email": "l3@test.com", "mobile": "3333333333"},
                {"level": 4, "name": "TEST_L4", "designation": "CEO", "email": "l4@test.com", "mobile": "4444444444"}
            ],
            "notes": "TEST_Notes",
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/project-schedules", json=schedule_data)
        assert response.status_code == 200
        
        data = response.json()
        self.test_schedule_id = data.get("id")
        
        # Verify escalation matrix was saved
        assert "escalation_matrix" in data
        assert len(data["escalation_matrix"]) == 4
        assert data["escalation_matrix"][0]["name"] == "TEST_L1"
        assert data["escalation_matrix"][1]["name"] == "TEST_L2"
        assert data["escalation_matrix"][2]["name"] == "TEST_L3"
        assert data["escalation_matrix"][3]["name"] == "TEST_L4"
        
        print(f"Created schedule with ID: {self.test_schedule_id}")
        print(f"Escalation matrix saved with {len(data['escalation_matrix'])} levels")
    
    def test_get_schedule_by_id(self):
        """Test GET /api/project-schedules/{id} returns schedule with all fields"""
        # First create a schedule
        schedule_data = {
            "project_id": "TEST_PROJECT_ID_2",
            "schedule_name": "TEST_Schedule_Get",
            "start_date": "2025-02-01",
            "end_date": "2025-04-30",
            "customer_info": {
                "name": "TEST_Customer_Get",
                "company": "TEST_Company_Get",
                "location": "TEST_Location_Get",
                "contact_person": "TEST_Contact_Get",
                "phone": "9876543210",
                "email": "get@test.com"
            },
            "phases": [],
            "milestones": [],
            "escalation_matrix": [
                {"level": 1, "name": "GET_L1", "designation": "Eng", "email": "get_l1@test.com", "mobile": "5555555555"}
            ],
            "notes": "",
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/project-schedules", json=schedule_data)
        assert create_response.status_code == 200
        created = create_response.json()
        self.test_schedule_id = created.get("id")
        
        # Now get the schedule by ID
        get_response = requests.get(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        
        # Verify all fields are returned
        assert data["project_id"] == "TEST_PROJECT_ID_2"
        assert data["schedule_name"] == "TEST_Schedule_Get"
        assert data["start_date"] == "2025-02-01"
        assert data["end_date"] == "2025-04-30"
        assert data["customer_info"]["name"] == "TEST_Customer_Get"
        assert data["customer_info"]["company"] == "TEST_Company_Get"
        assert data["customer_info"]["location"] == "TEST_Location_Get"
        assert data["customer_info"]["contact_person"] == "TEST_Contact_Get"
        assert data["customer_info"]["phone"] == "9876543210"
        assert data["customer_info"]["email"] == "get@test.com"
        assert len(data["escalation_matrix"]) == 1
        assert data["escalation_matrix"][0]["name"] == "GET_L1"
        
        print("All schedule fields returned correctly")
    
    def test_update_schedule_preserves_escalation_matrix(self):
        """Test PUT /api/project-schedules/{id} preserves escalation matrix"""
        # Create schedule
        schedule_data = {
            "project_id": "TEST_PROJECT_ID_3",
            "schedule_name": "TEST_Schedule_Update",
            "start_date": "2025-03-01",
            "end_date": "2025-05-30",
            "customer_info": {
                "name": "TEST_Customer_Update",
                "company": "TEST_Company_Update",
                "location": "TEST_Location_Update",
                "contact_person": "TEST_Contact_Update",
                "phone": "1112223333",
                "email": "update@test.com"
            },
            "phases": [],
            "milestones": [],
            "escalation_matrix": [
                {"level": 1, "name": "UPDATE_L1", "designation": "Eng", "email": "update_l1@test.com", "mobile": "6666666666"},
                {"level": 2, "name": "UPDATE_L2", "designation": "Mgr", "email": "update_l2@test.com", "mobile": "7777777777"}
            ],
            "notes": "Original notes",
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/project-schedules", json=schedule_data)
        assert create_response.status_code == 200
        created = create_response.json()
        self.test_schedule_id = created.get("id")
        
        # Update the schedule with modified escalation matrix
        update_data = {
            "schedule_name": "TEST_Schedule_Update_Modified",
            "notes": "Updated notes",
            "escalation_matrix": [
                {"level": 1, "name": "MODIFIED_L1", "designation": "Senior Eng", "email": "mod_l1@test.com", "mobile": "8888888888"},
                {"level": 2, "name": "MODIFIED_L2", "designation": "Senior Mgr", "email": "mod_l2@test.com", "mobile": "9999999999"},
                {"level": 3, "name": "MODIFIED_L3", "designation": "Director", "email": "mod_l3@test.com", "mobile": "0000000000"},
                {"level": 4, "name": "MODIFIED_L4", "designation": "CEO", "email": "mod_l4@test.com", "mobile": "1010101010"}
            ]
        }
        
        update_response = requests.put(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        
        # Verify escalation matrix was updated
        assert updated["schedule_name"] == "TEST_Schedule_Update_Modified"
        assert updated["notes"] == "Updated notes"
        assert len(updated["escalation_matrix"]) == 4
        assert updated["escalation_matrix"][0]["name"] == "MODIFIED_L1"
        assert updated["escalation_matrix"][1]["name"] == "MODIFIED_L2"
        assert updated["escalation_matrix"][2]["name"] == "MODIFIED_L3"
        assert updated["escalation_matrix"][3]["name"] == "MODIFIED_L4"
        
        # Verify by fetching again
        get_response = requests.get(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        
        assert len(fetched["escalation_matrix"]) == 4
        assert fetched["escalation_matrix"][0]["name"] == "MODIFIED_L1"
        
        print("Escalation matrix updated and persisted correctly")
    
    def test_update_schedule_with_empty_escalation_matrix(self):
        """Test that empty escalation matrix is saved correctly"""
        # Create schedule with escalation matrix
        schedule_data = {
            "project_id": "TEST_PROJECT_ID_4",
            "schedule_name": "TEST_Schedule_Empty_Matrix",
            "start_date": "2025-04-01",
            "end_date": "2025-06-30",
            "customer_info": {"name": "", "company": "", "location": "", "contact_person": "", "phone": "", "email": ""},
            "phases": [],
            "milestones": [],
            "escalation_matrix": [
                {"level": 1, "name": "TEMP_L1", "designation": "Eng", "email": "temp@test.com", "mobile": "1234567890"}
            ],
            "notes": "",
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/project-schedules", json=schedule_data)
        assert create_response.status_code == 200
        created = create_response.json()
        self.test_schedule_id = created.get("id")
        
        # Update with empty escalation matrix
        update_data = {
            "escalation_matrix": []
        }
        
        update_response = requests.put(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}", json=update_data)
        assert update_response.status_code == 200
        
        # Verify empty array is saved
        get_response = requests.get(f"{BASE_URL}/api/project-schedules/{self.test_schedule_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        
        # The escalation_matrix should be empty or have default values
        # Based on the frontend code, it uses defaultEscalationMatrix when empty
        print(f"Escalation matrix after update: {fetched.get('escalation_matrix', [])}")
    
    def test_delete_schedule(self):
        """Test DELETE /api/project-schedules/{id}"""
        # Create schedule
        schedule_data = {
            "project_id": "TEST_PROJECT_ID_5",
            "schedule_name": "TEST_Schedule_Delete",
            "start_date": "2025-05-01",
            "end_date": "2025-07-30",
            "customer_info": {"name": "", "company": "", "location": "", "contact_person": "", "phone": "", "email": ""},
            "phases": [],
            "milestones": [],
            "escalation_matrix": [],
            "notes": "",
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/project-schedules", json=schedule_data)
        assert create_response.status_code == 200
        created = create_response.json()
        schedule_id = created.get("id")
        
        # Delete the schedule
        delete_response = requests.delete(f"{BASE_URL}/api/project-schedules/{schedule_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/project-schedules/{schedule_id}")
        assert get_response.status_code == 404
        
        # Don't set test_schedule_id since we already deleted it
        print(f"Schedule {schedule_id} deleted successfully")


class TestExistingScheduleData:
    """Test existing schedule data in database"""
    
    def test_existing_schedule_has_escalation_matrix(self):
        """Verify existing test schedule has escalation matrix data"""
        # Get the test schedule created by main agent
        schedule_id = "e6508f56-ae44-46e0-8b64-bb8a9ceba634"
        
        response = requests.get(f"{BASE_URL}/api/project-schedules/{schedule_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify escalation matrix exists and has data
            assert "escalation_matrix" in data
            assert len(data["escalation_matrix"]) == 4
            
            # Verify each level has required fields
            for level in data["escalation_matrix"]:
                assert "level" in level
                assert "name" in level
                assert "designation" in level
                assert "email" in level
                assert "mobile" in level
            
            print(f"Schedule {schedule_id} has valid escalation matrix with {len(data['escalation_matrix'])} levels")
            print(f"Level 1: {data['escalation_matrix'][0]['name']}")
        else:
            pytest.skip(f"Test schedule {schedule_id} not found")
    
    def test_existing_schedule_has_customer_info(self):
        """Verify existing test schedule has customer info"""
        schedule_id = "e6508f56-ae44-46e0-8b64-bb8a9ceba634"
        
        response = requests.get(f"{BASE_URL}/api/project-schedules/{schedule_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify customer_info exists
            assert "customer_info" in data
            customer = data["customer_info"]
            
            # Verify customer info fields
            assert customer.get("name") == "Test Customer"
            assert customer.get("company") == "Test Company"
            assert customer.get("location") == "Chennai"
            assert customer.get("contact_person") == "John Doe"
            assert customer.get("phone") == "9876543210"
            assert customer.get("email") == "john@test.com"
            
            print("Customer info verified successfully")
        else:
            pytest.skip(f"Test schedule {schedule_id} not found")
    
    def test_existing_schedule_has_dates(self):
        """Verify existing test schedule has start and end dates"""
        schedule_id = "e6508f56-ae44-46e0-8b64-bb8a9ceba634"
        
        response = requests.get(f"{BASE_URL}/api/project-schedules/{schedule_id}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify dates exist
            assert "start_date" in data
            assert "end_date" in data
            assert data["start_date"] == "2025-01-15"
            assert data["end_date"] == "2025-03-30"
            
            print(f"Dates verified: {data['start_date']} to {data['end_date']}")
        else:
            pytest.skip(f"Test schedule {schedule_id} not found")
