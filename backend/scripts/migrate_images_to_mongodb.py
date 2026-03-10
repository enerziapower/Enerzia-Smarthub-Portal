"""
Migration script to move IR Thermography images from file storage to MongoDB.
This ensures images persist across deployments in Kubernetes environments.

Usage:
    python scripts/migrate_images_to_mongodb.py
"""
import asyncio
import os
import base64
import sys

sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone


async def migrate_images():
    """Migrate images from file storage to MongoDB."""
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connected to MongoDB: {db_name}")
    print("-" * 50)
    
    # Find all IR Thermography reports with file-based image URLs
    query = {
        "report_category": "ir-thermography",
        "inspection_items": {"$exists": True}
    }
    
    reports = await db.test_reports.find(query).to_list(1000)
    print(f"Found {len(reports)} IR Thermography reports")
    
    migrated_count = 0
    failed_count = 0
    skipped_count = 0
    
    for report in reports:
        report_id = report.get('id')
        report_no = report.get('report_no', 'Unknown')
        inspection_items = report.get('inspection_items', [])
        
        print(f"\nProcessing: {report_no} ({report_id})")
        
        items_updated = False
        
        for item in inspection_items:
            item_id = item.get('item_id', str(hash(str(item)))[:10])
            
            for image_field in ['original_image', 'thermal_image']:
                image_url = item.get(image_field, '')
                
                if not image_url:
                    continue
                
                # Skip if already in MongoDB
                if '/api/ir-thermography/db-images/' in image_url:
                    continue
                
                # Skip if it's a base64 image - store in MongoDB too for consistency
                if image_url.startswith('data:image'):
                    # Store base64 directly in MongoDB
                    try:
                        header, data = image_url.split(',', 1)
                        image_data = base64.b64decode(data)
                        image_type = image_field.replace('_image', '')
                        image_id = f"{report_id}_{item_id}_{image_type}"
                        
                        # Check if already migrated
                        existing = await db.ir_thermography_images.find_one({"image_id": image_id})
                        if existing:
                            # Update URL reference
                            item[image_field] = f"/api/ir-thermography/db-images/{image_id}"
                            items_updated = True
                            skipped_count += 1
                            continue
                        
                        # Determine format from header
                        if 'png' in header:
                            content_type = 'image/png'
                            fmt = 'png'
                        elif 'gif' in header:
                            content_type = 'image/gif'
                            fmt = 'gif'
                        else:
                            content_type = 'image/jpeg'
                            fmt = 'jpeg'
                        
                        image_doc = {
                            "image_id": image_id,
                            "report_id": report_id,
                            "item_id": item_id,
                            "image_type": image_type,
                            "content_type": content_type,
                            "format": fmt,
                            "size_bytes": len(image_data),
                            "data": data,  # Store original base64
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                            "migrated_from": "base64_inline"
                        }
                        
                        await db.ir_thermography_images.update_one(
                            {"image_id": image_id},
                            {"$set": image_doc},
                            upsert=True
                        )
                        
                        # Update the URL reference in the item
                        item[image_field] = f"/api/ir-thermography/db-images/{image_id}"
                        items_updated = True
                        migrated_count += 1
                        print(f"  ✓ Migrated {image_field} (base64): {image_id}")
                        
                    except Exception as e:
                        print(f"  ✗ Failed to migrate base64 {image_field}: {e}")
                        failed_count += 1
                    continue
                
                # Handle file-based URLs
                if '/api/ir-thermography-images/' in image_url:
                    # Extract file path
                    parts = image_url.replace('/api/ir-thermography-images/', '').split('/')
                    if len(parts) >= 2:
                        file_report_id = parts[0]
                        filename = parts[1]
                        file_path = f"/app/uploads/ir-thermography/{file_report_id}/{filename}"
                        
                        image_type = image_field.replace('_image', '')
                        image_id = f"{report_id}_{item_id}_{image_type}"
                        
                        # Check if already migrated
                        existing = await db.ir_thermography_images.find_one({"image_id": image_id})
                        if existing:
                            # Update URL reference
                            item[image_field] = f"/api/ir-thermography/db-images/{image_id}"
                            items_updated = True
                            skipped_count += 1
                            continue
                        
                        if os.path.exists(file_path):
                            try:
                                with open(file_path, 'rb') as f:
                                    image_data = f.read()
                                
                                # Determine format from extension
                                ext = filename.split('.')[-1].lower()
                                content_types = {
                                    'png': 'image/png',
                                    'gif': 'image/gif',
                                    'jpeg': 'image/jpeg',
                                    'jpg': 'image/jpeg'
                                }
                                content_type = content_types.get(ext, 'image/jpeg')
                                
                                image_doc = {
                                    "image_id": image_id,
                                    "report_id": report_id,
                                    "item_id": item_id,
                                    "image_type": image_type,
                                    "content_type": content_type,
                                    "format": ext,
                                    "size_bytes": len(image_data),
                                    "data": base64.b64encode(image_data).decode('utf-8'),
                                    "created_at": datetime.now(timezone.utc).isoformat(),
                                    "updated_at": datetime.now(timezone.utc).isoformat(),
                                    "migrated_from": file_path
                                }
                                
                                await db.ir_thermography_images.update_one(
                                    {"image_id": image_id},
                                    {"$set": image_doc},
                                    upsert=True
                                )
                                
                                # Update the URL reference
                                item[image_field] = f"/api/ir-thermography/db-images/{image_id}"
                                items_updated = True
                                migrated_count += 1
                                print(f"  ✓ Migrated {image_field}: {filename} -> {image_id}")
                                
                            except Exception as e:
                                print(f"  ✗ Failed to migrate {file_path}: {e}")
                                failed_count += 1
                        else:
                            print(f"  ⚠ File not found: {file_path}")
                            # Mark as missing but don't fail
                            failed_count += 1
        
        # Update the report if any items were modified
        if items_updated:
            await db.test_reports.update_one(
                {"id": report_id},
                {"$set": {
                    "inspection_items": inspection_items,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            print(f"  → Updated report with new image URLs")
    
    print("\n" + "=" * 50)
    print(f"Migration Summary:")
    print(f"  Migrated: {migrated_count} images")
    print(f"  Skipped (already done): {skipped_count}")
    print(f"  Failed/Missing: {failed_count}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(migrate_images())
