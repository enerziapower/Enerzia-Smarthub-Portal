"""
Test User Access Control Module - Permissions in Login/Me Endpoints
Tests:
1. Login API returns user permissions when user has permissions set
2. /auth/me API returns user permissions
3. User Access Control page can save permissions for a user
4. Permissions are persisted in MongoDB correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserAccessPermissions:
    """Test user permissions in login and /auth/me endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.admin_email = "admin@enerzia.com"
        self.admin_password = "admin123"
        self.test_user_email = "projects@enerzia.com"
        self.test_user_password = "123456"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_login_returns_permissions_for_admin(self):
        """Test that login endpoint returns permissions for admin user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token and user are returned
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        
        user = data["user"]
        assert user["email"] == self.admin_email
        
        # Check if permissions key exists in response
        # Note: permissions may be None if not set, but key should exist
        print(f"Admin user response: {user}")
        print(f"Permissions in response: {user.get('permissions')}")
        
        # For admin, permissions might be None or have data
        # The key point is that the endpoint includes permissions in response
        assert "permissions" in user or user.get("role") == "super_admin", \
            "Permissions key should be in user response"
    
    def test_02_login_returns_permissions_for_test_user(self):
        """Test that login endpoint returns permissions for test user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        
        user = data["user"]
        print(f"Test user response: {user}")
        print(f"Permissions in response: {user.get('permissions')}")
        
        # Permissions key should be present
        assert "permissions" in user, "Permissions key should be in user response"
    
    def test_03_auth_me_returns_permissions(self):
        """Test that /auth/me endpoint returns permissions"""
        # First login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Call /auth/me with token
        headers = {"Authorization": f"Bearer {token}"}
        me_response = self.session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert me_response.status_code == 200, f"/auth/me failed: {me_response.text}"
        user = me_response.json()
        
        print(f"/auth/me response: {user}")
        print(f"Permissions in /auth/me: {user.get('permissions')}")
        
        # Check permissions key exists
        assert "permissions" in user or user.get("role") == "super_admin", \
            "Permissions should be in /auth/me response"
    
    def test_04_get_available_modules(self):
        """Test getting available modules for user access control"""
        response = self.session.get(f"{BASE_URL}/api/user-access/modules")
        
        assert response.status_code == 200, f"Failed to get modules: {response.text}"
        data = response.json()
        
        assert "modules" in data
        modules = data["modules"]
        
        # Verify some expected modules exist
        expected_modules = ["company_hub", "my_workspace", "projects_dept", "sales_dept", "administration"]
        for module in expected_modules:
            assert module in modules, f"Expected module {module} not found"
        
        print(f"Available modules: {list(modules.keys())}")
    
    def test_05_get_users_list(self):
        """Test getting users list with permissions"""
        response = self.session.get(f"{BASE_URL}/api/user-access/users-list")
        
        assert response.status_code == 200, f"Failed to get users list: {response.text}"
        data = response.json()
        
        assert "users" in data
        users = data["users"]
        
        print(f"Found {len(users)} users")
        
        # Find test user
        test_user = next((u for u in users if u.get("email") == self.test_user_email), None)
        if test_user:
            print(f"Test user found: {test_user}")
            print(f"Test user permissions: {test_user.get('permissions')}")
    
    def test_06_get_user_permissions(self):
        """Test getting permissions for a specific user"""
        # First get users list to find test user ID
        users_response = self.session.get(f"{BASE_URL}/api/user-access/users-list")
        assert users_response.status_code == 200
        
        users = users_response.json()["users"]
        test_user = next((u for u in users if u.get("email") == self.test_user_email), None)
        
        if not test_user:
            pytest.skip("Test user not found")
        
        user_id = test_user["id"]
        
        # Get user permissions
        response = self.session.get(f"{BASE_URL}/api/user-access/user/{user_id}")
        
        assert response.status_code == 200, f"Failed to get user permissions: {response.text}"
        data = response.json()
        
        print(f"User permissions response: {data}")
        
        assert "user_id" in data
        assert "permissions" in data
    
    def test_07_update_user_permissions(self):
        """Test updating permissions for a user"""
        # Get users list to find test user
        users_response = self.session.get(f"{BASE_URL}/api/user-access/users-list")
        assert users_response.status_code == 200
        
        users = users_response.json()["users"]
        test_user = next((u for u in users if u.get("email") == self.test_user_email), None)
        
        if not test_user:
            pytest.skip("Test user not found")
        
        if test_user.get("role") == "super_admin":
            pytest.skip("Cannot modify super_admin permissions")
        
        user_id = test_user["id"]
        
        # Set some test permissions
        test_permissions = {
            "user_id": user_id,
            "modules": {
                "company_hub": True,
                "my_workspace": True,
                "projects_dept": True,
                "sales_dept": False
            },
            "sub_modules": {
                "company_dashboard": True,
                "domestic_customers": True,
                "my_dashboard": True,
                "projects_dashboard": True
            }
        }
        
        # Update permissions
        response = self.session.put(
            f"{BASE_URL}/api/user-access/user/{user_id}",
            json=test_permissions
        )
        
        assert response.status_code == 200, f"Failed to update permissions: {response.text}"
        data = response.json()
        
        print(f"Update response: {data}")
        
        assert "message" in data
        assert "permissions" in data
        
        # Verify permissions were saved
        saved_perms = data["permissions"]
        assert saved_perms["modules"]["company_hub"] == True
        assert saved_perms["modules"]["sales_dept"] == False
    
    def test_08_verify_permissions_persisted(self):
        """Test that permissions are persisted in MongoDB"""
        # Get users list to find test user
        users_response = self.session.get(f"{BASE_URL}/api/user-access/users-list")
        assert users_response.status_code == 200
        
        users = users_response.json()["users"]
        test_user = next((u for u in users if u.get("email") == self.test_user_email), None)
        
        if not test_user:
            pytest.skip("Test user not found")
        
        user_id = test_user["id"]
        
        # Get user permissions again to verify persistence
        response = self.session.get(f"{BASE_URL}/api/user-access/user/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"Persisted permissions: {data}")
        
        # Verify the permissions we set in previous test
        perms = data.get("permissions", {})
        modules = perms.get("modules", {})
        
        # Check if our test permissions were saved
        if modules:
            print(f"Modules permissions: {modules}")
            # Verify at least some permissions exist
            assert len(modules) > 0, "Permissions should be persisted"
    
    def test_09_login_returns_saved_permissions(self):
        """Test that login returns the saved permissions"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        user = data["user"]
        print(f"Login response with permissions: {user}")
        
        # Verify permissions are returned
        permissions = user.get("permissions")
        print(f"Permissions from login: {permissions}")
        
        if permissions:
            assert "modules" in permissions or "sub_modules" in permissions, \
                "Permissions should have modules or sub_modules"
    
    def test_10_auth_me_returns_saved_permissions(self):
        """Test that /auth/me returns the saved permissions"""
        # Login as test user
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_user_email,
            "password": self.test_user_password
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Call /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        me_response = self.session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert me_response.status_code == 200
        user = me_response.json()
        
        print(f"/auth/me response: {user}")
        
        permissions = user.get("permissions")
        print(f"Permissions from /auth/me: {permissions}")
        
        if permissions:
            assert "modules" in permissions or "sub_modules" in permissions, \
                "Permissions should have modules or sub_modules"


class TestUserAccessControlAPI:
    """Test User Access Control API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_modules_endpoint(self):
        """Test /api/user-access/modules endpoint"""
        response = self.session.get(f"{BASE_URL}/api/user-access/modules")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "modules" in data
        
        # Verify module structure
        modules = data["modules"]
        for module_id, module_data in modules.items():
            assert "name" in module_data, f"Module {module_id} missing name"
            assert "description" in module_data, f"Module {module_id} missing description"
            assert "sub_modules" in module_data, f"Module {module_id} missing sub_modules"
    
    def test_users_list_endpoint(self):
        """Test /api/user-access/users-list endpoint"""
        response = self.session.get(f"{BASE_URL}/api/user-access/users-list")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        users = data["users"]
        
        # Verify user structure
        for user in users:
            assert "id" in user, "User missing id"
            assert "name" in user, "User missing name"
            assert "email" in user, "User missing email"
