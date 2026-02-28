"""
Backend Route Protection Tests (P0 Security Fix)
Tests that permission middleware blocks unauthorized access to protected endpoints.

Test scenarios:
1. Admin user (super_admin) can access all protected endpoints
2. CEO user (with revoked permissions) gets 403 on protected endpoints
3. Error messages include required permissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@enerzia.com",
    "password": "admin123"
}

CEO_CREDENTIALS = {
    "email": "ceo@enerzia.com",
    "password": "123456"
}


class TestRouteProtection:
    """Test backend route protection with permission middleware"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin user token (super_admin - should have full access)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, f"No token in admin login response: {data}"
        print(f"Admin login successful, role: {data.get('user', {}).get('role', 'unknown')}")
        return token
    
    @pytest.fixture(scope="class")
    def ceo_token(self):
        """Get CEO user token (permissions revoked - should be denied)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CEO_CREDENTIALS
        )
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, f"No token in CEO login response: {data}"
        print(f"CEO login successful, role: {data.get('user', {}).get('role', 'unknown')}")
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def ceo_headers(self, ceo_token):
        """Headers with CEO token"""
        return {
            "Authorization": f"Bearer {ceo_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== LEAD MANAGEMENT TESTS ====================
    
    def test_lead_management_admin_access(self, admin_headers):
        """Admin should have access to Lead Management endpoints"""
        # Test GET /api/lead-management/followups
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to lead management: {response.text}"
        print(f"✓ Admin can access GET /api/lead-management/followups")
    
    def test_lead_management_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Lead Management"""
        # Test GET /api/lead-management/followups
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        
        # Verify error message includes required permissions
        data = response.json()
        detail = data.get("detail", "")
        assert "Access denied" in detail or "permission" in detail.lower(), f"Error should mention access denied or permission: {detail}"
        print(f"✓ CEO denied access to lead management with message: {detail}")
    
    def test_lead_management_stats_admin_access(self, admin_headers):
        """Admin should have access to Lead Management stats"""
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups/stats",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to lead management stats: {response.text}"
        print(f"✓ Admin can access GET /api/lead-management/followups/stats")
    
    def test_lead_management_stats_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Lead Management stats"""
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups/stats",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        print(f"✓ CEO denied access to lead management stats")
    
    def test_lead_management_team_members_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to team members"""
        response = requests.get(
            f"{BASE_URL}/api/lead-management/team-members",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        print(f"✓ CEO denied access to lead management team members")
    
    # ==================== USER ACCESS CONTROL TESTS ====================
    
    def test_user_access_modules_admin_access(self, admin_headers):
        """Admin should have access to User Access Control modules"""
        response = requests.get(
            f"{BASE_URL}/api/user-access/modules",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to user access modules: {response.text}"
        print(f"✓ Admin can access GET /api/user-access/modules")
    
    def test_user_access_modules_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to User Access Control"""
        response = requests.get(
            f"{BASE_URL}/api/user-access/modules",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        
        # Verify error message includes required permissions
        data = response.json()
        detail = data.get("detail", "")
        assert "Access denied" in detail or "permission" in detail.lower(), f"Error should mention access denied or permission: {detail}"
        print(f"✓ CEO denied access to user access modules with message: {detail}")
    
    def test_user_access_users_list_admin_access(self, admin_headers):
        """Admin should have access to users list"""
        response = requests.get(
            f"{BASE_URL}/api/user-access/users-list",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to users list: {response.text}"
        print(f"✓ Admin can access GET /api/user-access/users-list")
    
    def test_user_access_users_list_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to users list"""
        response = requests.get(
            f"{BASE_URL}/api/user-access/users-list",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        print(f"✓ CEO denied access to users list")
    
    # ==================== SALES ENQUIRIES TESTS ====================
    
    def test_sales_enquiries_admin_access(self, admin_headers):
        """Admin should have access to Sales Enquiries"""
        response = requests.get(
            f"{BASE_URL}/api/sales/enquiries",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to sales enquiries: {response.text}"
        print(f"✓ Admin can access GET /api/sales/enquiries")
    
    def test_sales_enquiries_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Sales Enquiries"""
        response = requests.get(
            f"{BASE_URL}/api/sales/enquiries",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        
        # Verify error message includes required permissions
        data = response.json()
        detail = data.get("detail", "")
        assert "Access denied" in detail or "permission" in detail.lower(), f"Error should mention access denied or permission: {detail}"
        print(f"✓ CEO denied access to sales enquiries with message: {detail}")
    
    def test_sales_enquiries_stats_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Sales Enquiries stats"""
        response = requests.get(
            f"{BASE_URL}/api/sales/enquiries/stats",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        print(f"✓ CEO denied access to sales enquiries stats")
    
    # ==================== SALES QUOTATIONS TESTS ====================
    
    def test_sales_quotations_admin_access(self, admin_headers):
        """Admin should have access to Sales Quotations"""
        response = requests.get(
            f"{BASE_URL}/api/sales/quotations",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Admin denied access to sales quotations: {response.text}"
        print(f"✓ Admin can access GET /api/sales/quotations")
    
    def test_sales_quotations_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Sales Quotations"""
        response = requests.get(
            f"{BASE_URL}/api/sales/quotations",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        
        # Verify error message includes required permissions
        data = response.json()
        detail = data.get("detail", "")
        assert "Access denied" in detail or "permission" in detail.lower(), f"Error should mention access denied or permission: {detail}"
        print(f"✓ CEO denied access to sales quotations with message: {detail}")
    
    def test_sales_quotations_stats_ceo_denied(self, ceo_headers):
        """CEO with revoked permissions should be denied access to Sales Quotations stats"""
        response = requests.get(
            f"{BASE_URL}/api/sales/quotations/stats",
            headers=ceo_headers
        )
        assert response.status_code == 403, f"CEO should get 403, got {response.status_code}: {response.text}"
        print(f"✓ CEO denied access to sales quotations stats")
    
    # ==================== ERROR MESSAGE FORMAT TESTS ====================
    
    def test_error_message_includes_required_permission(self, ceo_headers):
        """Error messages should include the required permission"""
        # Test lead management
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups",
            headers=ceo_headers
        )
        assert response.status_code == 403
        data = response.json()
        detail = data.get("detail", "")
        # Should mention sales_dept or lead_management
        assert "sales_dept" in detail or "lead_management" in detail, f"Error should mention required permission: {detail}"
        print(f"✓ Lead management error includes required permission: {detail}")
        
        # Test user access
        response = requests.get(
            f"{BASE_URL}/api/user-access/modules",
            headers=ceo_headers
        )
        assert response.status_code == 403
        data = response.json()
        detail = data.get("detail", "")
        # Should mention user_access_control or administration
        assert "user_access_control" in detail or "administration" in detail, f"Error should mention required permission: {detail}"
        print(f"✓ User access error includes required permission: {detail}")
    
    # ==================== UNAUTHENTICATED ACCESS TESTS ====================
    
    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests should get 401"""
        # Test without any token
        response = requests.get(f"{BASE_URL}/api/lead-management/followups")
        assert response.status_code == 401, f"Unauthenticated should get 401, got {response.status_code}"
        print(f"✓ Unauthenticated access returns 401")
    
    def test_invalid_token_denied(self):
        """Invalid token should get 401"""
        headers = {
            "Authorization": "Bearer invalid_token_12345",
            "Content-Type": "application/json"
        }
        response = requests.get(
            f"{BASE_URL}/api/lead-management/followups",
            headers=headers
        )
        assert response.status_code == 401, f"Invalid token should get 401, got {response.status_code}"
        print(f"✓ Invalid token returns 401")


class TestCEOPermissionsVerification:
    """Verify CEO user's permissions are actually revoked in the database"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin user token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_verify_ceo_permissions_revoked(self, admin_token):
        """Verify CEO user has permissions revoked via User Access API"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # First get the users list to find CEO user ID
        response = requests.get(
            f"{BASE_URL}/api/user-access/users-list",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        users = data.get("users", [])
        
        # Find CEO user
        ceo_user = None
        for user in users:
            if user.get("email") == "ceo@enerzia.com":
                ceo_user = user
                break
        
        assert ceo_user is not None, "CEO user not found in users list"
        print(f"Found CEO user: {ceo_user.get('name')}, role: {ceo_user.get('role')}")
        
        # Check permissions
        permissions = ceo_user.get("permissions", {})
        modules = permissions.get("modules", {})
        
        # Verify sales_dept and user_access_control are not enabled
        sales_dept_enabled = modules.get("sales_dept", False)
        user_access_enabled = modules.get("user_access_control", False)
        administration_enabled = modules.get("administration", False)
        
        print(f"CEO permissions - sales_dept: {sales_dept_enabled}, user_access_control: {user_access_enabled}, administration: {administration_enabled}")
        
        # At least one of these should be False for the test to be valid
        assert not (sales_dept_enabled and user_access_enabled and administration_enabled), \
            "CEO should have at least some permissions revoked for this test"
        print(f"✓ Verified CEO has permissions revoked")


class TestAdminRoleBypass:
    """Test that admin and super_admin roles bypass permission checks"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin user token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_role_verification(self, admin_token):
        """Verify admin user has super_admin or admin role"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Get current user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get admin user info: {response.text}"
        data = response.json()
        
        role = data.get("role")
        assert role in ["super_admin", "admin"], f"Admin user should have admin or super_admin role, got: {role}"
        print(f"✓ Admin user has role: {role}")
    
    def test_admin_can_access_all_protected_endpoints(self, admin_token):
        """Admin should be able to access all protected endpoints regardless of specific permissions"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # List of protected endpoints to test
        protected_endpoints = [
            "/api/lead-management/followups",
            "/api/lead-management/followups/stats",
            "/api/user-access/modules",
            "/api/user-access/users-list",
            "/api/sales/enquiries",
            "/api/sales/quotations",
        ]
        
        for endpoint in protected_endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 200, f"Admin denied access to {endpoint}: {response.text}"
            print(f"✓ Admin can access {endpoint}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
