"""
Travel Log Module - Submit to HR Workflow Tests
Tests the complete travel log workflow:
1. Create trip (in_progress status)
2. Complete trip (draft status)
3. Submit to HR (pending status)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
REGULAR_USER = {"email": "giftson@enerzia.com", "password": "test123"}
HR_USER = {"email": "anitha@enerzia.com", "password": "test123"}
ADMIN_USER = {"email": "admin@enerzia.com", "password": "123456"}


class TestTravelLogSubmitToHR:
    """Test Travel Log Submit to HR workflow"""
    
    # Class-level storage for trip IDs across tests
    created_trip_ids = []
    session = None
    shared_trip_id = None
    shared_user_id = None
    shared_draft_trip_id = None
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_class(self, request):
        """Setup test fixtures at class level"""
        TestTravelLogSubmitToHR.session = requests.Session()
        TestTravelLogSubmitToHR.session.headers.update({"Content-Type": "application/json"})
        TestTravelLogSubmitToHR.created_trip_ids = []
        yield
        # Cleanup: Delete test trips after all tests in class
        for trip_id in TestTravelLogSubmitToHR.created_trip_ids:
            try:
                TestTravelLogSubmitToHR.session.delete(f"{BASE_URL}/api/travel-log/trip/{trip_id}")
            except:
                pass
    
    def login(self, email, password):
        """Login and get user info"""
        response = TestTravelLogSubmitToHR.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_01_api_health_check(self):
        """Test that travel-log API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/travel-log/rates")
        assert response.status_code == 200, f"Travel log rates endpoint failed: {response.text}"
        data = response.json()
        assert "two_wheeler_rate" in data
        assert "four_wheeler_rate" in data
        print(f"✓ Travel log API accessible - Rates: 2W={data['two_wheeler_rate']}, 4W={data['four_wheeler_rate']}")
    
    def test_02_create_trip_in_progress(self):
        """Test creating a trip with in_progress status"""
        # Login as regular user
        login_data = self.login(REGULAR_USER["email"], REGULAR_USER["password"])
        assert login_data is not None, "Login failed for regular user"
        user = login_data.get("user", {})
        user_id = user.get("id")
        assert user_id, "User ID not found in login response"
        
        # Create trip with in_progress status
        form_data = {
            "user_id": user_id,
            "user_name": user.get("name", "Test User"),
            "department": user.get("department", ""),
            "from_location": "TEST_Office",
            "to_location": "In Progress",
            "vehicle_type": "two_wheeler",
            "start_km": "45000",
            "end_km": "0",
            "purpose": "Site Visit",
            "status": "in_progress",
            "notes": ""
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/travel-log/trip",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Create trip failed: {response.text}"
        data = response.json()
        assert "trip" in data
        trip = data["trip"]
        assert trip["status"] == "in_progress"
        assert trip["from_location"] == "TEST_Office"
        assert float(trip["start_km"]) == 45000
        
        self.created_trip_ids.append(trip["id"])
        print(f"✓ Created in_progress trip: {trip['id']}")
        
        # Store for next test
        pytest.trip_id = trip["id"]
        pytest.user_id = user_id
    
    def test_03_complete_trip_as_draft(self):
        """Test completing a trip with draft status"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip_id from previous test")
        
        # Complete the trip
        form_data = {
            "to_location": "TEST_Client Site",
            "end_km": "45035",
            "notes": "Test trip completion",
            "status": "draft"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/travel-log/trip/{trip_id}/complete",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Complete trip failed: {response.text}"
        data = response.json()
        assert "trip" in data
        trip = data["trip"]
        assert trip["status"] == "draft", f"Expected draft status, got {trip['status']}"
        assert trip["to_location"] == "TEST_Client Site"
        assert float(trip["end_km"]) == 45035
        assert float(trip["distance"]) == 35  # 45035 - 45000
        
        print(f"✓ Completed trip as draft: distance={trip['distance']}km, allowance={trip['allowance']}")
        
        # Store for next test
        pytest.draft_trip_id = trip_id
    
    def test_04_submit_to_hr_success(self):
        """Test submitting draft trips to HR"""
        trip_id = getattr(pytest, 'draft_trip_id', None)
        if not trip_id:
            pytest.skip("No draft_trip_id from previous test")
        
        # Submit to HR
        response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": [trip_id]}
        )
        
        assert response.status_code == 200, f"Submit to HR failed: {response.text}"
        data = response.json()
        assert data["submitted_count"] == 1
        assert "submitted to HR" in data["message"].lower()
        
        print(f"✓ Submitted trip to HR: {data['message']}")
        
        # Verify status changed to pending
        user_id = getattr(pytest, 'user_id', None)
        if user_id:
            trips_response = self.session.get(f"{BASE_URL}/api/travel-log/my-trips/{user_id}")
            if trips_response.status_code == 200:
                trips_data = trips_response.json()
                submitted_trip = next((t for t in trips_data.get("trips", []) if t["id"] == trip_id), None)
                if submitted_trip:
                    assert submitted_trip["status"] == "pending", f"Expected pending status, got {submitted_trip['status']}"
                    print(f"✓ Verified trip status changed to 'pending'")
    
    def test_05_submit_to_hr_empty_list(self):
        """Test that empty trip_ids list is rejected"""
        response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": []}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty list, got {response.status_code}"
        data = response.json()
        assert "no trip" in data.get("detail", "").lower() or "provided" in data.get("detail", "").lower()
        print(f"✓ Empty trip_ids correctly rejected: {data.get('detail')}")
    
    def test_06_submit_to_hr_non_draft_trip(self):
        """Test that non-draft trips are rejected"""
        # Login as regular user
        login_data = self.login(REGULAR_USER["email"], REGULAR_USER["password"])
        assert login_data is not None, "Login failed"
        user = login_data.get("user", {})
        user_id = user.get("id")
        
        # Create a trip with pending status (not draft)
        form_data = {
            "user_id": user_id,
            "user_name": user.get("name", "Test User"),
            "department": user.get("department", ""),
            "from_location": "TEST_Office2",
            "to_location": "TEST_Site2",
            "vehicle_type": "four_wheeler",
            "start_km": "50000",
            "end_km": "50050",
            "purpose": "Client Meeting",
            "status": "pending",  # Already pending, not draft
            "notes": ""
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/travel-log/trip",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Create trip failed: {response.text}"
        trip = response.json()["trip"]
        self.created_trip_ids.append(trip["id"])
        
        # Try to submit non-draft trip to HR
        submit_response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": [trip["id"]]}
        )
        
        # Should fail because trip is not in draft status
        assert submit_response.status_code == 400, f"Expected 400 for non-draft trip, got {submit_response.status_code}"
        data = submit_response.json()
        assert "not in draft" in data.get("detail", "").lower() or "draft" in data.get("detail", "").lower()
        print(f"✓ Non-draft trip correctly rejected: {data.get('detail')}")
    
    def test_07_submit_to_hr_invalid_trip_id(self):
        """Test that invalid trip IDs are handled"""
        response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": ["000000000000000000000000"]}  # Valid ObjectId format but doesn't exist
        )
        
        # Should return 400 with error about trip not found
        assert response.status_code == 400, f"Expected 400 for invalid trip, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print(f"✓ Invalid trip ID correctly rejected: {data.get('detail')}")
    
    def test_08_full_workflow_create_complete_submit(self):
        """Test complete workflow: create -> complete -> submit"""
        # Login
        login_data = self.login(REGULAR_USER["email"], REGULAR_USER["password"])
        assert login_data is not None, "Login failed"
        user = login_data.get("user", {})
        user_id = user.get("id")
        
        # Step 1: Create in_progress trip
        create_data = {
            "user_id": user_id,
            "user_name": user.get("name", "Test User"),
            "department": user.get("department", ""),
            "from_location": "TEST_Workflow_Start",
            "to_location": "In Progress",
            "vehicle_type": "two_wheeler",
            "start_km": "60000",
            "end_km": "0",
            "purpose": "Project Execution",
            "status": "in_progress",
            "notes": ""
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/travel-log/trip",
            data=create_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert create_response.status_code == 200
        trip = create_response.json()["trip"]
        trip_id = trip["id"]
        self.created_trip_ids.append(trip_id)
        assert trip["status"] == "in_progress"
        print(f"  Step 1: Created in_progress trip {trip_id}")
        
        # Step 2: Complete trip as draft
        complete_data = {
            "to_location": "TEST_Workflow_End",
            "end_km": "60025",
            "notes": "Workflow test",
            "status": "draft"
        }
        
        complete_response = self.session.put(
            f"{BASE_URL}/api/travel-log/trip/{trip_id}/complete",
            data=complete_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert complete_response.status_code == 200
        completed_trip = complete_response.json()["trip"]
        assert completed_trip["status"] == "draft"
        assert float(completed_trip["distance"]) == 25
        print(f"  Step 2: Completed trip as draft, distance={completed_trip['distance']}km")
        
        # Step 3: Submit to HR
        submit_response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": [trip_id]}
        )
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert submit_data["submitted_count"] == 1
        print(f"  Step 3: Submitted to HR - {submit_data['message']}")
        
        # Verify final status
        trips_response = self.session.get(f"{BASE_URL}/api/travel-log/my-trips/{user_id}")
        assert trips_response.status_code == 200
        trips = trips_response.json().get("trips", [])
        final_trip = next((t for t in trips if t["id"] == trip_id), None)
        assert final_trip is not None
        assert final_trip["status"] == "pending"
        print(f"  ✓ Full workflow complete: in_progress -> draft -> pending")
    
    def test_09_batch_submit_multiple_trips(self):
        """Test submitting multiple draft trips at once"""
        # Login
        login_data = self.login(REGULAR_USER["email"], REGULAR_USER["password"])
        assert login_data is not None, "Login failed"
        user = login_data.get("user", {})
        user_id = user.get("id")
        
        trip_ids = []
        
        # Create 3 draft trips
        for i in range(3):
            # Create in_progress
            create_data = {
                "user_id": user_id,
                "user_name": user.get("name", "Test User"),
                "department": user.get("department", ""),
                "from_location": f"TEST_Batch_Start_{i}",
                "to_location": "In Progress",
                "vehicle_type": "two_wheeler",
                "start_km": str(70000 + i * 100),
                "end_km": "0",
                "purpose": "Site Visit",
                "status": "in_progress",
                "notes": ""
            }
            
            create_response = self.session.post(
                f"{BASE_URL}/api/travel-log/trip",
                data=create_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            assert create_response.status_code == 200
            trip_id = create_response.json()["trip"]["id"]
            self.created_trip_ids.append(trip_id)
            
            # Complete as draft
            complete_data = {
                "to_location": f"TEST_Batch_End_{i}",
                "end_km": str(70000 + i * 100 + 20),
                "notes": f"Batch test {i}",
                "status": "draft"
            }
            
            complete_response = self.session.put(
                f"{BASE_URL}/api/travel-log/trip/{trip_id}/complete",
                data=complete_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            assert complete_response.status_code == 200
            trip_ids.append(trip_id)
        
        print(f"  Created {len(trip_ids)} draft trips")
        
        # Submit all at once
        submit_response = self.session.post(
            f"{BASE_URL}/api/travel-log/submit-to-hr",
            json={"trip_ids": trip_ids}
        )
        
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert submit_data["submitted_count"] == 3
        print(f"  ✓ Batch submitted {submit_data['submitted_count']} trips to HR")
    
    def test_10_get_my_trips_with_status_filter(self):
        """Test fetching trips with status filter"""
        # Login
        login_data = self.login(REGULAR_USER["email"], REGULAR_USER["password"])
        assert login_data is not None, "Login failed"
        user = login_data.get("user", {})
        user_id = user.get("id")
        
        # Get all trips
        response = self.session.get(f"{BASE_URL}/api/travel-log/my-trips/{user_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "trips" in data
        assert "summary" in data
        
        summary = data["summary"]
        print(f"  Trip summary: total={summary.get('total_trips', 0)}, pending={summary.get('pending', 0)}, approved={summary.get('approved', 0)}, in_progress={summary.get('in_progress', 0)}")
        
        # Get only in_progress trips
        in_progress_response = self.session.get(f"{BASE_URL}/api/travel-log/my-trips/{user_id}?status=in_progress")
        assert in_progress_response.status_code == 200
        in_progress_data = in_progress_response.json()
        
        # All returned trips should be in_progress
        for trip in in_progress_data.get("trips", []):
            assert trip["status"] == "in_progress", f"Expected in_progress, got {trip['status']}"
        
        print(f"  ✓ Status filter working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
