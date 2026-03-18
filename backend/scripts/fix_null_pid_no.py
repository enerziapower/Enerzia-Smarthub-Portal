"""
Data cleanup script to fix null or empty pid_no values in projects collection.

This script:
1. Finds projects with null or empty pid_no
2. Generates new PID numbers for them based on category and sequence

Run this script to check and fix:
    cd /app/backend && python3 scripts/fix_null_pid_no.py
"""

import os
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

def get_next_pid_no(db, category='PSS'):
    """Generate next PID number based on category"""
    # Get current fiscal year (April to March)
    now = datetime.now()
    fiscal_year_start = now.year if now.month >= 4 else now.year - 1
    fiscal_year_end = fiscal_year_start + 1
    year_suffix = f"{str(fiscal_year_start)[-2:]}-{str(fiscal_year_end)[-2:]}"
    
    # Category prefixes
    category_prefix = {
        'PSS': 'PID',
        'AS': 'AID', 
        'OSS': 'OID',
        'CS': 'CID'
    }.get(category, 'PID')
    
    # Find the highest existing number for this category and year
    pattern = f"^{category_prefix}-{year_suffix}-"
    existing = list(db.projects.find(
        {'pid_no': {'$regex': pattern}},
        {'pid_no': 1}
    ).sort('pid_no', -1).limit(1))
    
    if existing:
        last_pid = existing[0]['pid_no']
        try:
            last_num = int(last_pid.split('-')[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"{category_prefix}-{year_suffix}-{next_num:04d}"

def main():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    # Find projects with null or empty pid_no
    query = {'$or': [{'pid_no': None}, {'pid_no': ''}, {'pid_no': {'$exists': False}}]}
    
    print("\n=== Checking for projects with null/empty pid_no ===")
    
    projects_to_fix = list(db.projects.find(query))
    
    if not projects_to_fix:
        print("✅ No projects found with null or empty pid_no. Database is clean!")
        return
    
    print(f"Found {len(projects_to_fix)} projects with missing pid_no")
    
    print("\n=== Projects to fix ===")
    for p in projects_to_fix:
        print(f"  ID: {p.get('_id')}")
        print(f"    Name: {p.get('project_name', 'N/A')[:50]}")
        print(f"    Category: {p.get('category', 'PSS')}")
        print(f"    Current pid_no: {p.get('pid_no')}")
        print()
    
    # Ask for confirmation
    response = input("Do you want to fix these? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("Aborted.")
        return
    
    print("\n=== Applying fixes ===")
    fixed_count = 0
    
    for project in projects_to_fix:
        category = project.get('category', 'PSS')
        new_pid = get_next_pid_no(db, category)
        
        result = db.projects.update_one(
            {'_id': project['_id']},
            {'$set': {'pid_no': new_pid}}
        )
        
        if result.modified_count > 0:
            print(f"  Fixed: {project.get('project_name', 'N/A')[:40]} → {new_pid}")
            fixed_count += 1
    
    print(f"\n=== Summary ===")
    print(f"Total projects fixed: {fixed_count}")
    print("\nDone!")

if __name__ == '__main__':
    main()
