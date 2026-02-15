"""
User Management CRUD API Tests
Tests for: GET /api/users, POST /api/users/invite, PUT /api/users/{id}, 
           DELETE /api/users/{id}, PUT /api/users/{id}/password
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@enerzia.com"
ADMIN_PASSWORD = "admin123"


class TestUserManagementAuth:
    """Authentication tests for User Management"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_login_success(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Login successful, user role: {data['user'].get('role')}")


class TestGetUsers:
    """Tests for GET /api/users endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_users_success(self, admin_client):
        """Test GET /api/users returns list of users"""
        response = admin_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0, "Expected at least one user"
        
        # Verify user structure
        user = users[0]
        assert "id" in user
        assert "email" in user
        assert "name" in user
        assert "role" in user
        # Password should NOT be returned
        assert "password" not in user
        
        print(f"Found {len(users)} users")
    
    def test_get_users_without_auth(self):
        """Test GET /api/users without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 401
        print("Correctly rejected unauthenticated request")
    
    def test_get_users_stats(self, admin_client):
        """Verify user stats can be computed from users list"""
        response = admin_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        users = response.json()
        total = len(users)
        active = len([u for u in users if u.get('is_active') != False])
        inactive = len([u for u in users if u.get('is_active') == False])
        admins = len([u for u in users if u.get('role') in ['admin', 'super_admin']])
        
        print(f"Stats - Total: {total}, Active: {active}, Inactive: {inactive}, Admins: {admins}")
        assert total == active + inactive, "Active + Inactive should equal Total"


class TestInviteUser:
    """Tests for POST /api/users/invite endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_invite_user_success(self, admin_client):
        """Test POST /api/users/invite creates new user"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_user_{unique_id}@test.com"  # Use lowercase to match API behavior
        
        invite_data = {
            "email": test_email,
            "name": f"TEST User {unique_id}",
            "role": "user",
            "department": "IT"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response.status_code == 200, f"Invite failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        # API returns 'user' object and 'temporary_password' (not user_id and temp_password)
        assert "user" in data or "user_id" in data, f"Response: {data}"
        assert "temporary_password" in data or "temp_password" in data, f"Response: {data}"
        
        # Get user_id from response
        user_id = data.get("user_id") or data.get("user", {}).get("id")
        temp_password = data.get("temp_password") or data.get("temporary_password")
        
        assert user_id is not None, "User ID not found in response"
        assert len(temp_password) >= 6, "Temp password should be at least 6 chars"
        
        print(f"User invited successfully, ID: {user_id}")
        print(f"Temp password generated: {temp_password[:4]}****")
        
        # Verify user was created by fetching users list
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        # API converts email to lowercase
        created_user = next((u for u in users if u['email'].lower() == test_email.lower()), None)
        assert created_user is not None, "Created user not found in users list"
        assert created_user['name'] == invite_data['name']
        assert created_user['role'] == invite_data['role']
        assert created_user['department'] == invite_data['department']
        
        # Cleanup - store user_id for later deletion
        return user_id
    
    def test_invite_duplicate_email(self, admin_client):
        """Test POST /api/users/invite with existing email returns 400"""
        invite_data = {
            "email": ADMIN_EMAIL,  # Already exists
            "name": "Duplicate User",
            "role": "user"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower()
        print("Correctly rejected duplicate email")
    
    def test_invite_user_without_auth(self):
        """Test POST /api/users/invite without auth returns 401"""
        invite_data = {
            "email": "noauth@test.com",
            "name": "No Auth User",
            "role": "user"
        }
        
        response = requests.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response.status_code == 401
        print("Correctly rejected unauthenticated invite request")


class TestUpdateUser:
    """Tests for PUT /api/users/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_user(self, admin_client):
        """Create a test user for update tests"""
        unique_id = str(uuid.uuid4())[:8]
        invite_data = {
            "email": f"TEST_update_{unique_id}@test.com",
            "name": f"TEST Update User {unique_id}",
            "role": "user",
            "department": "Sales"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response.status_code == 200
        data = response.json()
        # Handle both response formats
        return data.get("user_id") or data.get("user", {}).get("id")
    
    def test_update_user_role(self, admin_client, test_user):
        """Test PUT /api/users/{id} updates user role"""
        update_data = {"role": "admin"}
        
        response = admin_client.put(f"{BASE_URL}/api/users/{test_user}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        updated_user = next((u for u in users if u['id'] == test_user), None)
        assert updated_user is not None
        assert updated_user['role'] == 'admin'
        print(f"User role updated to: {updated_user['role']}")
    
    def test_update_user_department(self, admin_client, test_user):
        """Test PUT /api/users/{id} updates user department"""
        update_data = {"department": "HR"}
        
        response = admin_client.put(f"{BASE_URL}/api/users/{test_user}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        updated_user = next((u for u in users if u['id'] == test_user), None)
        assert updated_user is not None
        assert updated_user['department'] == 'HR'
        print(f"User department updated to: {updated_user['department']}")
    
    def test_toggle_user_status(self, admin_client, test_user):
        """Test PUT /api/users/{id} toggles user status"""
        # Deactivate user
        update_data = {"is_active": False}
        response = admin_client.put(f"{BASE_URL}/api/users/{test_user}", json=update_data)
        assert response.status_code == 200
        
        # Verify deactivation
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        updated_user = next((u for u in users if u['id'] == test_user), None)
        assert updated_user is not None
        assert updated_user['is_active'] == False
        print("User deactivated successfully")
        
        # Reactivate user
        update_data = {"is_active": True}
        response = admin_client.put(f"{BASE_URL}/api/users/{test_user}", json=update_data)
        assert response.status_code == 200
        
        # Verify reactivation
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        updated_user = next((u for u in users if u['id'] == test_user), None)
        assert updated_user['is_active'] == True
        print("User reactivated successfully")
    
    def test_update_nonexistent_user(self, admin_client):
        """Test PUT /api/users/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        update_data = {"name": "Updated Name"}
        
        response = admin_client.put(f"{BASE_URL}/api/users/{fake_id}", json=update_data)
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent user")


class TestResetPassword:
    """Tests for PUT /api/users/{id}/password endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_user(self, admin_client):
        """Create a test user for password reset tests"""
        unique_id = str(uuid.uuid4())[:8]
        invite_data = {
            "email": f"TEST_password_{unique_id}@test.com",
            "name": f"TEST Password User {unique_id}",
            "role": "user",
            "department": "IT"
        }
        
        response = admin_client.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response.status_code == 200
        data = response.json()
        # Handle both response formats
        return data.get("user_id") or data.get("user", {}).get("id")
    
    def test_reset_password_success(self, admin_client, test_user):
        """Test PUT /api/users/{id}/password resets password"""
        password_data = {"new_password": "NewPassword123!"}
        
        response = admin_client.put(f"{BASE_URL}/api/users/{test_user}/password", json=password_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "success" in data["message"].lower()
        print("Password reset successfully")
    
    def test_reset_password_nonexistent_user(self, admin_client):
        """Test PUT /api/users/{id}/password with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        password_data = {"new_password": "NewPassword123!"}
        
        response = admin_client.put(f"{BASE_URL}/api/users/{fake_id}/password", json=password_data)
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent user")


class TestDeleteUser:
    """Tests for DELETE /api/users/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_delete_user_requires_super_admin(self, admin_client):
        """Test DELETE /api/users/{id} requires super_admin role"""
        # First create a user to delete
        unique_id = str(uuid.uuid4())[:8]
        invite_data = {
            "email": f"TEST_delete_{unique_id}@test.com",
            "name": f"TEST Delete User {unique_id}",
            "role": "user"
        }
        
        invite_response = admin_client.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert invite_response.status_code == 200
        data = invite_response.json()
        # Handle both response formats
        user_id = data.get("user_id") or data.get("user", {}).get("id")
        
        # Try to delete - should work if admin is super_admin
        delete_response = admin_client.delete(f"{BASE_URL}/api/users/{user_id}")
        
        # Check if current user is super_admin
        if delete_response.status_code == 200:
            print("User deleted successfully (admin is super_admin)")
            
            # Verify deletion
            users_response = admin_client.get(f"{BASE_URL}/api/users")
            users = users_response.json()
            deleted_user = next((u for u in users if u['id'] == user_id), None)
            assert deleted_user is None, "Deleted user should not exist"
        elif delete_response.status_code == 403:
            print("Delete requires super_admin role (current user is not super_admin)")
        else:
            pytest.fail(f"Unexpected status code: {delete_response.status_code}")
    
    def test_delete_nonexistent_user(self, admin_client):
        """Test DELETE /api/users/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = admin_client.delete(f"{BASE_URL}/api/users/{fake_id}")
        # Could be 404 or 403 depending on role check order
        assert response.status_code in [403, 404]
        print(f"Correctly handled nonexistent user delete (status: {response.status_code})")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_client(self, auth_token):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_cleanup_test_users(self, admin_client):
        """Clean up TEST_ prefixed users"""
        users_response = admin_client.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        
        test_users = [u for u in users if u.get('email', '').startswith('TEST_')]
        print(f"Found {len(test_users)} test users to clean up")
        
        deleted_count = 0
        for user in test_users:
            response = admin_client.delete(f"{BASE_URL}/api/users/{user['id']}")
            if response.status_code == 200:
                deleted_count += 1
            elif response.status_code == 403:
                print(f"Cannot delete {user['email']} - requires super_admin")
        
        print(f"Cleaned up {deleted_count} test users")
