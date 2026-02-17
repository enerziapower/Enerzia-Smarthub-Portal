"""
Data Import API for migrating data from preview to production
This is a one-time use endpoint for importing exported data
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Dict, Any
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/data-import", tags=["Data Import"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Secret key for import authorization (change this in production!)
IMPORT_SECRET_KEY = os.environ.get("DATA_IMPORT_KEY", "smarthub-enerzia-import-2026")

async def verify_import_key(key: str):
    """Verify the import authorization key"""
    if key != IMPORT_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid import authorization key")
    return True

@router.post("/collection/{collection_name}")
async def import_collection(
    collection_name: str,
    data: List[Dict[Any, Any]],
    key: str,
    clear_existing: bool = False
):
    """
    Import data into a specific collection
    
    Args:
        collection_name: Name of the MongoDB collection
        data: List of documents to import
        key: Authorization key for import
        clear_existing: If True, delete all existing documents before import
    """
    await verify_import_key(key)
    
    try:
        collection = db[collection_name]
        
        # Optionally clear existing data
        if clear_existing:
            delete_result = await collection.delete_many({})
            deleted_count = delete_result.deleted_count
        else:
            deleted_count = 0
        
        # Insert new data
        if data:
            # Remove _id fields to let MongoDB generate new ones
            for doc in data:
                if '_id' in doc:
                    del doc['_id']
            
            result = await collection.insert_many(data)
            inserted_count = len(result.inserted_ids)
        else:
            inserted_count = 0
        
        return {
            "success": True,
            "collection": collection_name,
            "deleted_count": deleted_count,
            "inserted_count": inserted_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/bulk")
async def import_bulk(
    data: Dict[str, List[Dict[Any, Any]]],
    key: str,
    clear_existing: bool = False
):
    """
    Import data into multiple collections at once
    
    Args:
        data: Dictionary with collection names as keys and list of documents as values
        key: Authorization key for import
        clear_existing: If True, delete all existing documents before import
    """
    await verify_import_key(key)
    
    results = {}
    
    for collection_name, documents in data.items():
        try:
            collection = db[collection_name]
            
            # Optionally clear existing data
            if clear_existing:
                delete_result = await collection.delete_many({})
                deleted_count = delete_result.deleted_count
            else:
                deleted_count = 0
            
            # Insert new data
            if documents:
                # Remove _id fields to let MongoDB generate new ones
                for doc in documents:
                    if '_id' in doc:
                        del doc['_id']
                
                result = await collection.insert_many(documents)
                inserted_count = len(result.inserted_ids)
            else:
                inserted_count = 0
            
            results[collection_name] = {
                "success": True,
                "deleted_count": deleted_count,
                "inserted_count": inserted_count
            }
            
        except Exception as e:
            results[collection_name] = {
                "success": False,
                "error": str(e)
            }
    
    return {
        "success": True,
        "results": results
    }

@router.get("/status")
async def get_import_status():
    """Get the current database status and collection counts"""
    try:
        collections = await db.list_collection_names()
        status = {}
        
        for collection_name in collections:
            collection = db[collection_name]
            count = await collection.count_documents({})
            status[collection_name] = count
        
        return {
            "database": DB_NAME,
            "collections": status,
            "total_collections": len(collections)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")
