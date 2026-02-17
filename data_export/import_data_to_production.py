#!/usr/bin/env python3
"""
Data Import Script for Smarthub Enerzia
Run this script to import data from preview environment to production

Usage:
  python3 import_data_to_production.py --url https://smarthub.enerzia.com --key YOUR_IMPORT_KEY

The import key default is: smarthub-enerzia-import-2026
You can change it in the production .env file as DATA_IMPORT_KEY
"""

import requests
import json
import os
import sys
import argparse
from pathlib import Path

# Collections to import in order (respecting dependencies)
COLLECTIONS_ORDER = [
    'settings',
    'categories',
    'users',
    'engineers',
    'clients',
    'vendors',
    'customers',
    'projects',
    'project_schedules',
    'project_requirements',
    'sales_enquiries',
    'sales_quotations',
    'sales_orders',
    'amcs',
    'calibration_contracts',
    'service_requests',
    'test_reports',
    'scheduled_inspections',
    'ir_thermography_reports',
    'work_completion_certificates',
    'pdf_template_settings',
    'department_team_members',
    'department_tasks'
]

def load_json_file(filepath):
    """Load JSON data from file"""
    with open(filepath, 'r') as f:
        return json.load(f)

def import_collection(base_url, collection_name, data, import_key, clear_existing=True):
    """Import a single collection to production"""
    url = f"{base_url}/api/data-import/collection/{collection_name}"
    params = {
        'key': import_key,
        'clear_existing': str(clear_existing).lower()
    }
    
    try:
        response = requests.post(url, json=data, params=params, timeout=120)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {'success': False, 'error': str(e)}

def main():
    parser = argparse.ArgumentParser(description='Import data to Smarthub Enerzia production')
    parser.add_argument('--url', required=True, help='Production URL (e.g., https://smarthub.enerzia.com)')
    parser.add_argument('--key', default='smarthub-enerzia-import-2026', help='Import authorization key')
    parser.add_argument('--data-dir', default='/app/data_export', help='Directory containing exported JSON files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without actually importing')
    
    args = parser.parse_args()
    
    base_url = args.url.rstrip('/')
    data_dir = Path(args.data_dir)
    
    print("=" * 60)
    print("  SMARTHUB ENERZIA - DATA IMPORT")
    print("=" * 60)
    print(f"\nTarget URL: {base_url}")
    print(f"Data Directory: {data_dir}")
    print(f"Dry Run: {args.dry_run}")
    print("\n" + "-" * 60)
    
    # Check connection first
    try:
        status_url = f"{base_url}/api/data-import/status"
        response = requests.get(status_url, timeout=10)
        print(f"✅ Connection to production successful")
        print(f"   Database: {response.json().get('database', 'unknown')}")
    except Exception as e:
        print(f"❌ Cannot connect to production: {e}")
        sys.exit(1)
    
    print("\n" + "-" * 60)
    print("Starting import...\n")
    
    results = {}
    
    for collection_name in COLLECTIONS_ORDER:
        filepath = data_dir / f"{collection_name}.json"
        
        if not filepath.exists():
            print(f"⚠️  {collection_name}: File not found, skipping")
            continue
        
        data = load_json_file(filepath)
        doc_count = len(data)
        
        if args.dry_run:
            print(f"🔍 {collection_name}: Would import {doc_count} documents")
            results[collection_name] = {'dry_run': True, 'count': doc_count}
        else:
            print(f"📥 {collection_name}: Importing {doc_count} documents...", end=' ')
            result = import_collection(base_url, collection_name, data, args.key)
            
            if result.get('success'):
                print(f"✅ Done ({result.get('inserted_count', 0)} inserted)")
            else:
                print(f"❌ Failed: {result.get('error', 'Unknown error')}")
            
            results[collection_name] = result
    
    print("\n" + "=" * 60)
    print("  IMPORT COMPLETE")
    print("=" * 60)
    
    # Summary
    success_count = sum(1 for r in results.values() if r.get('success'))
    total_count = len(results)
    
    print(f"\nResults: {success_count}/{total_count} collections imported successfully")
    
    if not args.dry_run:
        # Verify final status
        try:
            response = requests.get(f"{base_url}/api/data-import/status", timeout=10)
            status = response.json()
            print("\n📊 Final Database Status:")
            for col, count in sorted(status.get('collections', {}).items()):
                if count > 0:
                    print(f"   {col}: {count} documents")
        except Exception as e:
            print(f"\n⚠️  Could not verify final status: {e}")

if __name__ == '__main__':
    main()
