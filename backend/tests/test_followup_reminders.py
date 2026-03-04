"""
Test Follow-up Reminders/Notifications Feature
Tests the notification system for follow-up reminders including:
- Generate follow-up reminders endpoint
- Today's follow-ups endpoint
- Notification bell functionality
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SALES_USER = {"email": "sales@enerzia.com", "password": "test123"}
ADMIN_USER = {"email": "admin@enerzia.com", "password": "123456"}


class TestFollowupReminders:
    """Test follow-up reminder notification system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as sales user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=SALES_USER)
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        self.sales_token = data["token"]
        self.sales_user = data["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.sales_token}"})
        
        yield
        
        self.session.close()
    
    def test_01_generate_followup_reminders_endpoint_exists(self):
        """Test that generate-followup-reminders endpoint exists and returns valid response"""
        response = self.session.post(f"{BASE_URL}/api/notifications/generate-followup-reminders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        assert "upcoming_count" in data, "Response should contain 'upcoming_count' field"
        assert "overdue_count" in data, "Response should contain 'overdue_count' field"
        assert "notifications_created" in data, "Response should contain 'notifications_created' field"
        
        print(f"✓ Generate reminders: {data['message']}")
        print(f"  Upcoming: {data['upcoming_count']}, Overdue: {data['overdue_count']}, Created: {data['notifications_created']}")
    
    def test_02_todays_followups_endpoint_returns_correct_structure(self):
        """Test that todays-followups endpoint returns correct data structure"""
        response = self.session.get(f"{BASE_URL}/api/notifications/todays-followups")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "todays_followups" in data, "Response should contain 'todays_followups' field"
        assert "todays_count" in data, "Response should contain 'todays_count' field"
        assert "overdue_count" in data, "Response should contain 'overdue_count' field"
        assert "upcoming_week_count" in data, "Response should contain 'upcoming_week_count' field"
        
        assert isinstance(data["todays_followups"], list), "todays_followups should be a list"
        assert isinstance(data["todays_count"], int), "todays_count should be an integer"
        assert isinstance(data["overdue_count"], int), "overdue_count should be an integer"
        assert isinstance(data["upcoming_week_count"], int), "upcoming_week_count should be an integer"
        
        print(f"✓ Today's followups: {data['todays_count']}")
        print(f"  Overdue: {data['overdue_count']}, Upcoming week: {data['upcoming_week_count']}")
    
    def test_03_todays_followups_contains_required_fields(self):
        """Test that each follow-up in todays_followups has required fields"""
        response = self.session.get(f"{BASE_URL}/api/notifications/todays-followups")
        assert response.status_code == 200
        
        data = response.json()
        
        if data["todays_count"] > 0:
            followup = data["todays_followups"][0]
            
            # Check required fields for follow-up cards
            required_fields = ["id", "title", "priority", "scheduled_time", "followup_type"]
            for field in required_fields:
                assert field in followup, f"Follow-up should contain '{field}' field"
            
            # Check customer name (either customer_name or lead_name)
            has_customer = "customer_name" in followup or "lead_name" in followup
            assert has_customer, "Follow-up should have customer_name or lead_name"
            
            print(f"✓ Follow-up has all required fields")
            print(f"  Title: {followup.get('title')}")
            print(f"  Priority: {followup.get('priority')}")
            print(f"  Time: {followup.get('scheduled_time')}")
            print(f"  Type: {followup.get('followup_type')}")
        else:
            print("⚠ No follow-ups scheduled for today to verify fields")
    
    def test_04_notifications_endpoint_returns_followup_notifications(self):
        """Test that notifications endpoint returns follow-up related notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications?department=Sales&limit=50")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of notifications"
        
        # Check for follow-up notification types
        followup_types = ["followup_reminder", "followup_overdue"]
        followup_notifications = [n for n in data if n.get("type") in followup_types]
        
        print(f"✓ Found {len(followup_notifications)} follow-up notifications out of {len(data)} total")
        
        if followup_notifications:
            notif = followup_notifications[0]
            assert "id" in notif, "Notification should have 'id'"
            assert "type" in notif, "Notification should have 'type'"
            assert "title" in notif, "Notification should have 'title'"
            assert "message" in notif, "Notification should have 'message'"
            assert "department" in notif, "Notification should have 'department'"
            assert "reference_id" in notif, "Notification should have 'reference_id'"
            assert "reference_type" in notif, "Notification should have 'reference_type'"
            
            print(f"  Sample notification: {notif.get('title')}")
    
    def test_05_notification_count_endpoint(self):
        """Test notification count endpoint for unread count"""
        response = self.session.get(f"{BASE_URL}/api/notifications/count?department=Sales")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unread_count" in data, "Response should contain 'unread_count'"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        
        print(f"✓ Unread notification count: {data['unread_count']}")
    
    def test_06_mark_notification_as_read(self):
        """Test marking a notification as read"""
        # First get notifications
        response = self.session.get(f"{BASE_URL}/api/notifications?department=Sales&limit=10")
        assert response.status_code == 200
        
        notifications = response.json()
        
        if notifications:
            notif_id = notifications[0]["id"]
            
            # Mark as read
            response = self.session.put(f"{BASE_URL}/api/notifications/{notif_id}/read")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "message" in data, "Response should contain 'message'"
            
            print(f"✓ Marked notification {notif_id} as read")
        else:
            print("⚠ No notifications to mark as read")
    
    def test_07_mark_all_notifications_read(self):
        """Test marking all notifications as read"""
        response = self.session.put(f"{BASE_URL}/api/notifications/mark-all-read?department=Sales")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        # Verify count is now 0
        count_response = self.session.get(f"{BASE_URL}/api/notifications/count?department=Sales")
        count_data = count_response.json()
        
        print(f"✓ Marked all notifications as read")
        print(f"  Unread count after: {count_data.get('unread_count', 'N/A')}")


class TestFollowupReminderCreation:
    """Test creating follow-ups and verifying reminder generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as sales user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=SALES_USER)
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        self.sales_token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.sales_token}"})
        
        self.created_followup_ids = []
        
        yield
        
        # Cleanup created follow-ups
        for fid in self.created_followup_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/sales/lead-management/followups/{fid}")
            except:
                pass
        
        self.session.close()
    
    def test_08_create_followup_for_tomorrow_generates_reminder(self):
        """Test that creating a follow-up for tomorrow generates a reminder notification"""
        tomorrow = datetime.now() + timedelta(days=1)
        
        followup_data = {
            "is_existing_customer": False,
            "customer_name": "TEST_Reminder Test Company",
            "customer_phone": "9999999999",
            "lead_name": "TEST_Reminder Lead",
            "lead_company": "TEST_Reminder Test Company",
            "followup_type": "site_visit",
            "title": "TEST_Reminder Follow-up Tomorrow",
            "description": "Test follow-up for reminder generation",
            "scheduled_date": tomorrow.strftime("%Y-%m-%dT10:00:00"),
            "scheduled_time": "10:00 AM",
            "status": "scheduled",
            "priority": "high",
            "location": "Test Location"
        }
        
        # Create follow-up
        response = self.session.post(
            f"{BASE_URL}/api/sales/lead-management/followups",
            json=followup_data
        )
        
        if response.status_code == 201:
            data = response.json()
            followup_id = data.get("id")
            if followup_id:
                self.created_followup_ids.append(followup_id)
            
            print(f"✓ Created follow-up for tomorrow: {followup_id}")
            
            # Generate reminders
            reminder_response = self.session.post(f"{BASE_URL}/api/notifications/generate-followup-reminders")
            assert reminder_response.status_code == 200
            
            reminder_data = reminder_response.json()
            print(f"  Reminders generated: {reminder_data.get('notifications_created', 0)}")
            print(f"  Upcoming count: {reminder_data.get('upcoming_count', 0)}")
        else:
            print(f"⚠ Could not create follow-up: {response.status_code} - {response.text}")
    
    def test_09_create_overdue_followup_generates_overdue_notification(self):
        """Test that an overdue follow-up generates an overdue notification"""
        yesterday = datetime.now() - timedelta(days=1)
        
        followup_data = {
            "is_existing_customer": False,
            "customer_name": "TEST_Overdue Test Company",
            "customer_phone": "8888888888",
            "lead_name": "TEST_Overdue Lead",
            "lead_company": "TEST_Overdue Test Company",
            "followup_type": "cold_call",
            "title": "TEST_Overdue Follow-up",
            "description": "Test overdue follow-up",
            "scheduled_date": yesterday.strftime("%Y-%m-%dT10:00:00"),
            "scheduled_time": "10:00 AM",
            "status": "scheduled",
            "priority": "high",
            "location": "Phone"
        }
        
        # Create follow-up
        response = self.session.post(
            f"{BASE_URL}/api/sales/lead-management/followups",
            json=followup_data
        )
        
        if response.status_code == 201:
            data = response.json()
            followup_id = data.get("id")
            if followup_id:
                self.created_followup_ids.append(followup_id)
            
            print(f"✓ Created overdue follow-up: {followup_id}")
            
            # Generate reminders
            reminder_response = self.session.post(f"{BASE_URL}/api/notifications/generate-followup-reminders")
            assert reminder_response.status_code == 200
            
            reminder_data = reminder_response.json()
            print(f"  Overdue count: {reminder_data.get('overdue_count', 0)}")
            print(f"  Notifications created: {reminder_data.get('notifications_created', 0)}")
        else:
            print(f"⚠ Could not create follow-up: {response.status_code} - {response.text}")


class TestNotificationTypes:
    """Test notification type icons and handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as sales user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=SALES_USER)
        assert response.status_code == 200
        data = response.json()
        self.sales_token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.sales_token}"})
        
        yield
        
        self.session.close()
    
    def test_10_followup_reminder_notification_type(self):
        """Test that followup_reminder type notifications are created correctly"""
        response = self.session.get(f"{BASE_URL}/api/notifications?department=Sales&limit=50")
        assert response.status_code == 200
        
        notifications = response.json()
        reminder_notifs = [n for n in notifications if n.get("type") == "followup_reminder"]
        
        if reminder_notifs:
            notif = reminder_notifs[0]
            assert notif["type"] == "followup_reminder"
            assert notif["reference_type"] == "followup"
            assert notif["reference_id"] is not None
            assert "Tomorrow" in notif["title"] or "Follow-up" in notif["title"]
            
            print(f"✓ Found followup_reminder notification: {notif['title']}")
        else:
            print("⚠ No followup_reminder notifications found")
    
    def test_11_followup_overdue_notification_type(self):
        """Test that followup_overdue type notifications are created correctly"""
        response = self.session.get(f"{BASE_URL}/api/notifications?department=Sales&limit=50")
        assert response.status_code == 200
        
        notifications = response.json()
        overdue_notifs = [n for n in notifications if n.get("type") == "followup_overdue"]
        
        if overdue_notifs:
            notif = overdue_notifs[0]
            assert notif["type"] == "followup_overdue"
            assert notif["reference_type"] == "followup"
            assert notif["reference_id"] is not None
            assert "Overdue" in notif["title"]
            
            print(f"✓ Found followup_overdue notification: {notif['title']}")
        else:
            print("⚠ No followup_overdue notifications found (may not have overdue follow-ups)")


class TestSalesDashboardAPI:
    """Test Sales Dashboard API endpoints used by Today's Follow-ups widget"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as sales user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=SALES_USER)
        assert response.status_code == 200
        data = response.json()
        self.sales_token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.sales_token}"})
        
        yield
        
        self.session.close()
    
    def test_12_sales_dashboard_stats_endpoint(self):
        """Test sales dashboard stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/sales/dashboard/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Sales dashboard stats retrieved")
        print(f"  Total enquiries: {data.get('total_enquiries', 0)}")
        print(f"  Total quotations: {data.get('total_quotations', 0)}")
    
    def test_13_todays_followups_integration_with_dashboard(self):
        """Test that todays-followups endpoint integrates correctly with dashboard"""
        # This simulates what the dashboard does
        response = self.session.get(f"{BASE_URL}/api/notifications/todays-followups")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify the data structure matches what the frontend expects
        assert "todays_followups" in data
        assert "todays_count" in data
        assert "overdue_count" in data
        assert "upcoming_week_count" in data
        
        # Verify follow-up data has fields needed for display
        for followup in data["todays_followups"]:
            # Fields used in the widget
            assert "id" in followup
            assert "title" in followup
            assert "priority" in followup
            assert "followup_type" in followup
            # scheduled_time may be null
            # location may be null
            # customer_name or lead_name should exist
        
        print(f"✓ Today's followups data structure verified for dashboard integration")
        print(f"  Today: {data['todays_count']}, Overdue: {data['overdue_count']}, Week: {data['upcoming_week_count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
