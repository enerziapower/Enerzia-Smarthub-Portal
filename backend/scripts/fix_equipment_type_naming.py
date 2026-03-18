"""
One-time data migration script to standardize equipment_type naming in test_reports collection.

Issues fixed:
- earth_pit → earth-pit (standard uses hyphen)
- energy_meter → energy-meter (standard uses hyphen)

Run this script once to fix existing data:
    cd /app/backend && python3 scripts/fix_equipment_type_naming.py
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

def main():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    # Define the standardization mappings (underscore → hyphen)
    # The standard naming convention uses hyphens (e.g., earth-pit, energy-meter)
    mappings = {
        'earth_pit': 'earth-pit',
        'energy_meter': 'energy-meter',
    }
    
    print("\n=== Current equipment_type distribution ===")
    pipeline = [
        {'$group': {'_id': '$equipment_type', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    for doc in db.test_reports.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']} documents")
    
    print("\n=== Applying fixes ===")
    total_updated = 0
    
    for old_value, new_value in mappings.items():
        # Count documents with the old value
        count = db.test_reports.count_documents({'equipment_type': old_value})
        
        if count > 0:
            print(f"  Updating '{old_value}' → '{new_value}' ({count} documents)...")
            
            # Update all documents with the old value
            result = db.test_reports.update_many(
                {'equipment_type': old_value},
                {'$set': {'equipment_type': new_value}}
            )
            
            print(f"    Modified: {result.modified_count} documents")
            total_updated += result.modified_count
        else:
            print(f"  No documents found with equipment_type='{old_value}'")
    
    print(f"\n=== Summary ===")
    print(f"Total documents updated: {total_updated}")
    
    print("\n=== Updated equipment_type distribution ===")
    for doc in db.test_reports.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']} documents")
    
    print("\nDone!")

if __name__ == '__main__':
    main()
