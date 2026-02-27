"""
Lead Management Module - Backend API Tests
Tests for follow-ups CRUD, stats, calendar, comments, complete, reschedule, cancel
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_LEAD_"


class TestLeadManagementStats:
    """Test follow-up statistics endpoint"""
    
    def test_get_stats_empty(self):
        """Test stats endpoint returns correct structure even when empty"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_status" in data
        assert "today" in data
        assert "this_week" in data
        assert "overdue" in data
        assert "by_type" in data
        assert "total" in data
        
        # Verify by_status structure
        assert "scheduled" in data["by_status"]
        assert "pending" in data["by_status"]
        assert "completed" in data["by_status"]
        assert "cancelled" in data["by_status"]
        
        # Verify by_type structure
        assert "cold_call" in data["by_type"]
        assert "site_visit" in data["by_type"]
        assert "call_back" in data["by_type"]
        assert "visit_later" in data["by_type"]
        assert "general" in data["by_type"]
        
        print(f"Stats response: {data}")


class TestLeadManagementCRUD:
    """Test follow-up CRUD operations"""
    
    created_followup_ids = []
    
    def test_create_followup_new_lead(self):
        """Test creating a follow-up with new lead (not linked to customer)"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        
        payload = {
            "lead_name": f"{TEST_PREFIX}John Doe",
            "lead_company": f"{TEST_PREFIX}Test Company",
            "lead_email": "testlead@example.com",
            "lead_phone": "+91 9876543210",
            "lead_address": "123 Test Street, Test City",
            "followup_type": "cold_call",
            "title": f"{TEST_PREFIX}Initial Cold Call",
            "description": "First contact with potential customer",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "priority": "high",
            "location": "Phone call",
            "contact_person": "John Doe",
            "contact_phone": "+91 9876543210",
            "notes": "Interested in solar panels"
        }
        
        response = requests.post(f"{BASE_URL}/api/lead-management/followups", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["message"] == "Follow-up created successfully"
        
        self.__class__.created_followup_ids.append(data["id"])
        print(f"Created follow-up: {data['id']}")
    
    def test_create_followup_site_visit(self):
        """Test creating a site visit follow-up"""
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")
        
        payload = {
            "lead_name": f"{TEST_PREFIX}Jane Smith",
            "lead_company": f"{TEST_PREFIX}Smith Industries",
            "lead_email": "jane@smithind.com",
            "lead_phone": "+91 8765432109",
            "followup_type": "site_visit",
            "title": f"{TEST_PREFIX}Site Survey Visit",
            "description": "Visit to assess installation requirements",
            "scheduled_date": next_week,
            "scheduled_time": "14:00",
            "priority": "medium",
            "location": "456 Industrial Area, City",
            "notes": "Bring measurement tools"
        }
        
        response = requests.post(f"{BASE_URL}/api/lead-management/followups", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        self.__class__.created_followup_ids.append(data["id"])
        print(f"Created site visit follow-up: {data['id']}")
    
    def test_create_followup_validation_error(self):
        """Test validation - must have customer_id or lead_name"""
        payload = {
            "followup_type": "cold_call",
            "title": "Test without customer",
            "scheduled_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/lead-management/followups", json=payload)
        assert response.status_code == 400
        assert "customer_id or lead_name" in response.json().get("detail", "").lower()
    
    def test_get_followups_list(self):
        """Test getting list of follow-ups"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups")
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "pages" in data
        
        # Should have at least the follow-ups we created
        assert data["total"] >= 2
        print(f"Total follow-ups: {data['total']}")
    
    def test_get_followups_with_filters(self):
        """Test filtering follow-ups by status and type"""
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/lead-management/followups?status=scheduled")
        assert response.status_code == 200
        data = response.json()
        for f in data["followups"]:
            assert f["status"] == "scheduled"
        
        # Filter by type
        response = requests.get(f"{BASE_URL}/api/lead-management/followups?followup_type=cold_call")
        assert response.status_code == 200
        data = response.json()
        for f in data["followups"]:
            assert f["followup_type"] == "cold_call"
        
        # Filter by priority
        response = requests.get(f"{BASE_URL}/api/lead-management/followups?priority=high")
        assert response.status_code == 200
        
        print("Filters working correctly")
    
    def test_get_followup_by_id(self):
        """Test getting a single follow-up by ID"""
        if not self.__class__.created_followup_ids:
            pytest.skip("No follow-ups created")
        
        followup_id = self.__class__.created_followup_ids[0]
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == followup_id
        assert "title" in data
        assert "followup_type" in data
        assert "status" in data
        assert "scheduled_date" in data
        
        print(f"Retrieved follow-up: {data['title']}")
    
    def test_get_followup_not_found(self):
        """Test 404 for non-existent follow-up"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/non-existent-id")
        assert response.status_code == 404
    
    def test_update_followup(self):
        """Test updating a follow-up"""
        if not self.__class__.created_followup_ids:
            pytest.skip("No follow-ups created")
        
        followup_id = self.__class__.created_followup_ids[0]
        
        update_payload = {
            "title": f"{TEST_PREFIX}Updated Cold Call Title",
            "description": "Updated description",
            "priority": "low",
            "notes": "Updated notes - customer showed interest"
        }
        
        response = requests.put(f"{BASE_URL}/api/lead-management/followups/{followup_id}", json=update_payload)
        assert response.status_code == 200
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["title"] == update_payload["title"]
        assert data["priority"] == "low"
        
        print(f"Updated follow-up: {followup_id}")


class TestLeadManagementActions:
    """Test follow-up actions: complete, reschedule, cancel, comments"""
    
    test_followup_id = None
    
    @pytest.fixture(autouse=True)
    def setup_test_followup(self):
        """Create a test follow-up for action tests"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        
        payload = {
            "lead_name": f"{TEST_PREFIX}Action Test Lead",
            "lead_company": f"{TEST_PREFIX}Action Test Company",
            "followup_type": "call_back",
            "title": f"{TEST_PREFIX}Action Test Follow-up",
            "scheduled_date": tomorrow,
            "priority": "medium"
        }
        
        response = requests.post(f"{BASE_URL}/api/lead-management/followups", json=payload)
        if response.status_code == 200:
            self.__class__.test_followup_id = response.json()["id"]
        
        yield
        
        # Cleanup
        if self.__class__.test_followup_id:
            requests.delete(f"{BASE_URL}/api/lead-management/followups/{self.__class__.test_followup_id}")
    
    def test_add_comment(self):
        """Test adding a comment to a follow-up"""
        if not self.__class__.test_followup_id:
            pytest.skip("No test follow-up created")
        
        comment_payload = {
            "comment": "Test comment - customer requested callback",
            "created_by": "test-user-id",
            "created_by_name": "Test User"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/lead-management/followups/{self.__class__.test_followup_id}/comments",
            json=comment_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Comment added successfully"
        assert "comment_id" in data
        
        # Verify comment was added
        get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{self.__class__.test_followup_id}")
        followup = get_response.json()
        assert len(followup["comments"]) > 0
        assert followup["comments"][-1]["comment"] == comment_payload["comment"]
        
        print(f"Added comment to follow-up: {self.__class__.test_followup_id}")
    
    def test_reschedule_followup(self):
        """Test rescheduling a follow-up"""
        if not self.__class__.test_followup_id:
            pytest.skip("No test follow-up created")
        
        new_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%dT00:00:00Z")
        
        response = requests.post(
            f"{BASE_URL}/api/lead-management/followups/{self.__class__.test_followup_id}/reschedule",
            params={
                "new_date": new_date,
                "new_time": "15:00",
                "reason": "Customer requested later date"
            }
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Follow-up rescheduled successfully"
        
        # Verify status changed to rescheduled
        get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{self.__class__.test_followup_id}")
        followup = get_response.json()
        assert followup["status"] == "rescheduled"
        
        print(f"Rescheduled follow-up: {self.__class__.test_followup_id}")
    
    def test_complete_followup(self):
        """Test marking a follow-up as complete"""
        # Create a new follow-up for this test
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/lead-management/followups", json={
            "lead_name": f"{TEST_PREFIX}Complete Test Lead",
            "followup_type": "general",
            "title": f"{TEST_PREFIX}Complete Test",
            "scheduled_date": tomorrow
        })
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test follow-up")
        
        followup_id = create_response.json()["id"]
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/lead-management/followups/{followup_id}/complete",
                params={
                    "outcome": "Customer agreed to proceed with quotation",
                    "next_action": "Send quotation within 2 days"
                }
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Follow-up marked as completed"
            
            # Verify status changed to completed
            get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
            followup = get_response.json()
            assert followup["status"] == "completed"
            assert followup["outcome"] == "Customer agreed to proceed with quotation"
            assert followup["completed_at"] is not None
            
            print(f"Completed follow-up: {followup_id}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
    
    def test_cancel_followup(self):
        """Test cancelling a follow-up via update"""
        # Create a new follow-up for this test
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/lead-management/followups", json={
            "lead_name": f"{TEST_PREFIX}Cancel Test Lead",
            "followup_type": "visit_later",
            "title": f"{TEST_PREFIX}Cancel Test",
            "scheduled_date": tomorrow
        })
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test follow-up")
        
        followup_id = create_response.json()["id"]
        
        try:
            response = requests.put(
                f"{BASE_URL}/api/lead-management/followups/{followup_id}",
                json={"status": "cancelled"}
            )
            assert response.status_code == 200
            
            # Verify status changed to cancelled
            get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
            followup = get_response.json()
            assert followup["status"] == "cancelled"
            
            print(f"Cancelled follow-up: {followup_id}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/lead-management/followups/{followup_id}")


class TestLeadManagementCalendar:
    """Test calendar view endpoint"""
    
    def test_get_calendar_data(self):
        """Test getting calendar data for current month"""
        now = datetime.now()
        
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups/calendar",
            params={"year": now.year, "month": now.month}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "calendar" in data
        
        # Calendar should be a dict with date keys
        assert isinstance(data["calendar"], dict)
        
        print(f"Calendar data for {now.year}-{now.month}: {len(data['followups'])} follow-ups")
    
    def test_get_calendar_next_month(self):
        """Test getting calendar data for next month"""
        now = datetime.now()
        next_month = now.month + 1 if now.month < 12 else 1
        next_year = now.year if now.month < 12 else now.year + 1
        
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups/calendar",
            params={"year": next_year, "month": next_month}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "calendar" in data


class TestLeadManagementSpecialEndpoints:
    """Test today, upcoming, overdue endpoints"""
    
    def test_get_today_followups(self):
        """Test getting today's follow-ups"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/today")
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "count" in data
        assert isinstance(data["followups"], list)
        
        print(f"Today's follow-ups: {data['count']}")
    
    def test_get_upcoming_followups(self):
        """Test getting upcoming follow-ups"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/upcoming?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "count" in data
        
        print(f"Upcoming follow-ups (7 days): {data['count']}")
    
    def test_get_overdue_followups(self):
        """Test getting overdue follow-ups"""
        response = requests.get(f"{BASE_URL}/api/lead-management/followups/overdue")
        assert response.status_code == 200
        
        data = response.json()
        assert "followups" in data
        assert "count" in data
        
        print(f"Overdue follow-ups: {data['count']}")


class TestLeadManagementTeam:
    """Test team members endpoint"""
    
    def test_get_team_members(self):
        """Test getting sales team members for assignment"""
        response = requests.get(f"{BASE_URL}/api/lead-management/team-members")
        assert response.status_code == 200
        
        data = response.json()
        assert "team" in data
        assert isinstance(data["team"], list)
        
        # Each team member should have id, name, email
        if len(data["team"]) > 0:
            member = data["team"][0]
            assert "id" in member
            assert "name" in member
            
        print(f"Team members: {len(data['team'])}")


class TestLeadManagementDelete:
    """Test delete functionality"""
    
    def test_delete_followup(self):
        """Test deleting a follow-up"""
        # Create a follow-up to delete
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/lead-management/followups", json={
            "lead_name": f"{TEST_PREFIX}Delete Test Lead",
            "followup_type": "general",
            "title": f"{TEST_PREFIX}Delete Test",
            "scheduled_date": tomorrow
        })
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test follow-up")
        
        followup_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Follow-up deleted successfully"
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/lead-management/followups/{followup_id}")
        assert get_response.status_code == 404
        
        print(f"Deleted follow-up: {followup_id}")
    
    def test_delete_nonexistent_followup(self):
        """Test deleting a non-existent follow-up returns 404"""
        response = requests.delete(f"{BASE_URL}/api/lead-management/followups/non-existent-id")
        assert response.status_code == 404


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self):
        """Clean up all test follow-ups created during testing"""
        # Get all follow-ups
        response = requests.get(f"{BASE_URL}/api/lead-management/followups?limit=100")
        if response.status_code != 200:
            return
        
        followups = response.json().get("followups", [])
        deleted_count = 0
        
        for f in followups:
            # Delete follow-ups with TEST_PREFIX in title or lead_name
            if (f.get("title", "").startswith(TEST_PREFIX) or 
                f.get("lead_name", "").startswith(TEST_PREFIX) or
                f.get("lead_company", "").startswith(TEST_PREFIX)):
                delete_response = requests.delete(f"{BASE_URL}/api/lead-management/followups/{f['id']}")
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test follow-ups")
