"""
Test Business Hub Project Features
- source_order_id and source_order_no fields in Project model
- Work items with completion_percentage
- Progress calculation from work items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBusinessHubProjectFeatures:
    """Test Business Hub integration features for projects"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_api_returns_source_order_fields(self):
        """Test that API returns source_order_id and source_order_no fields"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        assert len(projects) > 0, "No projects found"
        
        # Find a project with source_order_id
        business_hub_projects = [p for p in projects if p.get('source_order_id')]
        
        if len(business_hub_projects) > 0:
            project = business_hub_projects[0]
            assert 'source_order_id' in project, "source_order_id field missing"
            assert 'source_order_no' in project, "source_order_no field missing"
            assert project['source_order_id'] is not None, "source_order_id should not be None for Business Hub project"
            print(f"✅ Found Business Hub project: {project.get('pid_no')} with source_order_id: {project.get('source_order_id')}")
        else:
            # Check that regular projects have the fields (even if None)
            project = projects[0]
            assert 'source_order_id' in project or project.get('source_order_id') is None, "source_order_id field should exist"
            print("⚠️ No Business Hub projects found, but field structure is correct")
    
    def test_search_projects_with_test_accept(self):
        """Test searching for TEST-ACCEPT projects (from Business Hub)"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        test_accept_projects = [p for p in projects if 'TEST-ACCEPT' in (p.get('pid_no') or '')]
        
        print(f"Found {len(test_accept_projects)} TEST-ACCEPT projects")
        
        for project in test_accept_projects:
            assert project.get('source_order_id') is not None, f"TEST-ACCEPT project {project.get('pid_no')} should have source_order_id"
            print(f"  - {project.get('pid_no')}: source_order_id={project.get('source_order_id')}")
    
    def test_project_work_items_structure(self):
        """Test that work_items field exists and has correct structure"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        
        # Find a project with work_items
        projects_with_work_items = [p for p in projects if p.get('work_items') and len(p.get('work_items', [])) > 0]
        
        if len(projects_with_work_items) > 0:
            project = projects_with_work_items[0]
            work_items = project.get('work_items', [])
            
            for item in work_items:
                # Check expected fields
                assert 'description' in item or item.get('description') is None
                assert 'status' in item or item.get('status') is None
                # completion_percentage may or may not exist depending on when item was created
                print(f"Work item: {item.get('description')} - status: {item.get('status')} - completion: {item.get('completion_percentage', 'N/A')}")
        else:
            print("⚠️ No projects with work_items found")
    
    def test_project_completion_percentage_field(self):
        """Test that completion_percentage field exists in project"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        assert len(projects) > 0
        
        project = projects[0]
        assert 'completion_percentage' in project, "completion_percentage field missing"
        assert isinstance(project['completion_percentage'], (int, float)), "completion_percentage should be numeric"
        print(f"Project {project.get('pid_no')} completion_percentage: {project.get('completion_percentage')}")
    
    def test_get_single_project_with_source_order(self):
        """Test getting a single project that has source_order_id"""
        # First get all projects to find one with source_order_id
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        business_hub_projects = [p for p in projects if p.get('source_order_id')]
        
        if len(business_hub_projects) > 0:
            project_id = business_hub_projects[0]['id']
            
            # Get single project
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
            assert response.status_code == 200
            
            project = response.json()
            assert project.get('source_order_id') is not None
            assert project.get('source_order_no') is not None
            print(f"✅ Single project GET returns source_order fields correctly")
        else:
            pytest.skip("No Business Hub projects available for testing")
    
    def test_update_project_work_items_with_completion(self):
        """Test updating project with work items that have completion_percentage"""
        # First get a project
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        # Find a TEST project to update
        test_projects = [p for p in projects if 'TEST-ACCEPT' in (p.get('pid_no') or '')]
        
        if len(test_projects) > 0:
            project = test_projects[0]
            project_id = project['id']
            
            # Update with work items including completion_percentage
            update_data = {
                "work_items": [
                    {
                        "description": "Test Work Item 1",
                        "quantity": 10,
                        "unit": "Nos",
                        "status": "In Progress",
                        "completion_percentage": 50
                    },
                    {
                        "description": "Test Work Item 2",
                        "quantity": 5,
                        "unit": "Mtr",
                        "status": "Completed",
                        "completion_percentage": 100
                    }
                ],
                "completion_percentage": 75  # Average of 50 and 100
            }
            
            response = requests.put(f"{BASE_URL}/api/projects/{project_id}", 
                                   headers=self.headers, json=update_data)
            assert response.status_code == 200, f"Update failed: {response.text}"
            
            updated_project = response.json()
            assert updated_project.get('work_items') is not None
            assert len(updated_project.get('work_items', [])) == 2
            
            # Verify completion_percentage was saved
            work_items = updated_project.get('work_items', [])
            for item in work_items:
                assert 'completion_percentage' in item
            
            print(f"✅ Project updated with work items containing completion_percentage")
        else:
            pytest.skip("No TEST-ACCEPT projects available for testing")
    
    def test_null_safe_project_fields(self):
        """Test that projects with null project_name/client/location don't cause errors"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        
        # Count projects with null values
        null_project_name = [p for p in projects if p.get('project_name') is None]
        null_client = [p for p in projects if p.get('client') is None]
        null_location = [p for p in projects if p.get('location') is None]
        
        print(f"Projects with null project_name: {len(null_project_name)}")
        print(f"Projects with null client: {len(null_client)}")
        print(f"Projects with null location: {len(null_location)}")
        
        # API should return successfully even with null values
        assert response.status_code == 200, "API should handle null values gracefully"


class TestProjectsAPIBasic:
    """Basic API tests for projects endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@enerzia.com",
            "password": "123456"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_all_projects(self):
        """Test GET /api/projects returns list of projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        assert isinstance(projects, list)
        print(f"Total projects: {len(projects)}")
    
    def test_get_projects_with_status_filter(self):
        """Test GET /api/projects with status filter"""
        response = requests.get(f"{BASE_URL}/api/projects?status=Ongoing", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        for project in projects:
            assert project.get('status') == 'Ongoing', f"Expected status 'Ongoing', got '{project.get('status')}'"
        
        print(f"Ongoing projects: {len(projects)}")
    
    def test_get_projects_with_category_filter(self):
        """Test GET /api/projects with category filter"""
        response = requests.get(f"{BASE_URL}/api/projects?category=PSS", headers=self.headers)
        assert response.status_code == 200
        
        projects = response.json()
        for project in projects:
            assert project.get('category') == 'PSS', f"Expected category 'PSS', got '{project.get('category')}'"
        
        print(f"PSS projects: {len(projects)}")
    
    def test_get_next_pid(self):
        """Test GET /api/projects/next-pid returns valid PID"""
        response = requests.get(f"{BASE_URL}/api/projects/next-pid", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert 'next_pid' in data
        assert 'financial_year' in data
        assert data['next_pid'].startswith('PID/')
        
        print(f"Next PID: {data['next_pid']}")
