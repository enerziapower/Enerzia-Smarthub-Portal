"""
Database utilities - MongoDB indexes and optimization
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

logger = logging.getLogger(__name__)


async def safe_create_index(collection, keys, **kwargs):
    """
    Safely create an index, handling conflicts with existing indexes.
    If an index with the same name exists but different options, drop and recreate.
    """
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code == 85:  # IndexOptionsConflict
            # Drop the existing index and recreate with new options
            index_name = kwargs.get('name') or f"{keys}_1" if isinstance(keys, str) else None
            if index_name:
                try:
                    await collection.drop_index(index_name)
                    await collection.create_index(keys, **kwargs)
                    logger.info(f"Recreated index {index_name} with updated options")
                except Exception as drop_err:
                    logger.warning(f"Could not recreate index {index_name}: {drop_err}")
            else:
                logger.warning(f"Index conflict but no name to drop: {e}")
        else:
            raise


async def create_indexes(db):
    """Create database indexes for improved query performance"""
    try:
        # ==================== PROJECTS ====================
        await safe_create_index(db.projects, "id", unique=True)
        await safe_create_index(db.projects, "pid_no")
        await safe_create_index(db.projects, "status")
        await safe_create_index(db.projects, "category")
        await safe_create_index(db.projects, "department")
        await safe_create_index(db.projects, "created_at")
        await safe_create_index(db.projects, "customer_id")  # For customer lookup
        await safe_create_index(db.projects, [("client", 1), ("status", 1)])
        await safe_create_index(db.projects, [("status", 1), ("created_at", -1)])  # For filtered lists
        
        # ==================== USERS ====================
        await safe_create_index(db.users, "id", unique=True)
        await safe_create_index(db.users, "email", unique=True)
        await safe_create_index(db.users, "department")
        await safe_create_index(db.users, "role")
        await safe_create_index(db.users, "is_active")  # For active user queries
        
        # ==================== REFRESH TOKENS ====================
        await safe_create_index(db.refresh_tokens, "token", unique=True)
        await safe_create_index(db.refresh_tokens, "user_id")
        await safe_create_index(
            db.refresh_tokens,
            "expires_at",
            name="expires_at_ttl",  # Unique name to avoid conflicts
            expireAfterSeconds=0  # TTL index - auto-delete when expires_at is reached
        )
        
        # ==================== AMC ====================
        await safe_create_index(db.amcs, "id", unique=True)
        await safe_create_index(db.amcs, "project_id")
        await safe_create_index(db.amcs, "status")
        await safe_create_index(db.amcs, "created_at")
        await safe_create_index(db.amcs, [("contract_details.end_date", 1)])
        await safe_create_index(db.amcs, [("status", 1), ("contract_details.end_date", 1)])
        
        # ==================== TEST REPORTS ====================
        await safe_create_index(db.test_reports, "id", unique=True)
        await safe_create_index(db.test_reports, "equipment_type")
        await safe_create_index(db.test_reports, "report_type")  # For report type filtering
        await safe_create_index(db.test_reports, "report_no")
        await safe_create_index(db.test_reports, "customer_name")
        await safe_create_index(db.test_reports, "project_id")  # For project-based queries
        await safe_create_index(db.test_reports, "created_at")
        await safe_create_index(db.test_reports, [("equipment_type", 1), ("created_at", -1)])
        await safe_create_index(db.test_reports, [("report_type", 1), ("created_at", -1)])
        
        # ==================== IR THERMOGRAPHY ====================
        await safe_create_index(db.ir_thermography_images, "report_id")  # For image lookup
        await safe_create_index(db.ir_thermography_images, "item_index")
        
        # ==================== PDF JOBS ====================
        await safe_create_index(db.pdf_jobs, "job_id", unique=True)
        await safe_create_index(db.pdf_jobs, "status")
        # TTL index with unique name to avoid conflict with regular created_at index
        await safe_create_index(
            db.pdf_jobs, 
            "created_at",
            name="created_at_ttl",  # Unique name for TTL index
            expireAfterSeconds=86400  # Auto-delete after 24 hours
        )
        
        # ==================== PAYMENT REQUESTS ====================
        await safe_create_index(db.payment_requests, "id", unique=True)
        await safe_create_index(db.payment_requests, "project_id")
        await safe_create_index(db.payment_requests, "status")
        await safe_create_index(db.payment_requests, "created_at")
        await safe_create_index(db.payment_requests, [("status", 1), ("created_at", -1)])
        
        # ==================== WORK COMPLETION CERTIFICATES ====================
        await safe_create_index(db.work_completion_certificates, "id", unique=True)
        await safe_create_index(db.work_completion_certificates, "project_id")
        await safe_create_index(db.work_completion_certificates, "document_no")
        await safe_create_index(db.work_completion_certificates, "customer_name")
        await safe_create_index(db.work_completion_certificates, "created_at")
        
        # ==================== WEEKLY MEETINGS ====================
        await safe_create_index(db.weekly_meetings, "id", unique=True)
        await safe_create_index(db.weekly_meetings, "department")
        await safe_create_index(db.weekly_meetings, "meeting_date")
        await safe_create_index(db.weekly_meetings, [("department", 1), ("meeting_date", -1)])
        
        # ==================== DEPARTMENT TEAM ====================
        await safe_create_index(db.department_team, "id", unique=True)
        await safe_create_index(db.department_team, "department")
        await safe_create_index(db.department_team, "email")
        
        # ==================== SCHEDULED INSPECTIONS ====================
        await safe_create_index(db.scheduled_inspections, "id", unique=True)
        await safe_create_index(db.scheduled_inspections, "equipment_id")
        await safe_create_index(db.scheduled_inspections, "status")
        await safe_create_index(db.scheduled_inspections, "next_due_date")
        await safe_create_index(db.scheduled_inspections, [("status", 1), ("next_due_date", 1)])
        
        # ==================== PASSWORD RESETS ====================
        await safe_create_index(db.password_resets, "email")
        await safe_create_index(
            db.password_resets, 
            "created_at",
            name="created_at_ttl",  # Unique name for TTL index
            expireAfterSeconds=3600  # Auto-delete after 1 hour
        )
        
        # ==================== NOTIFICATIONS ====================
        await safe_create_index(db.notifications, "id", unique=True)
        await safe_create_index(db.notifications, "user_id")
        await safe_create_index(db.notifications, "department")
        await safe_create_index(db.notifications, "is_read")
        await safe_create_index(db.notifications, "created_at")
        await safe_create_index(db.notifications, [("user_id", 1), ("is_read", 1), ("created_at", -1)])
        await safe_create_index(db.notifications, [("department", 1), ("is_read", 1), ("created_at", -1)])
        
        # ==================== CLIENTS (Domestic/Export Customers) ====================
        await safe_create_index(db.clients, "id", unique=True)
        await safe_create_index(db.clients, "name")
        await safe_create_index(db.clients, "customer_type")  # domestic/export
        await safe_create_index(db.clients, "is_active")
        await safe_create_index(db.clients, [("customer_type", 1), ("is_active", 1)])
        
        # ==================== CUSTOMERS ====================
        await safe_create_index(db.customers, "id", unique=True)
        await safe_create_index(db.customers, "name")
        await safe_create_index(db.customers, "email")
        
        # ==================== VENDORS ====================
        await safe_create_index(db.vendors, "id", unique=True)
        await safe_create_index(db.vendors, "name")
        await safe_create_index(db.vendors, "is_active")
        
        # ==================== QUOTATIONS ====================
        await safe_create_index(db.quotations, "id", unique=True)
        await safe_create_index(db.quotations, "quotation_no")
        await safe_create_index(db.quotations, "status")
        await safe_create_index(db.quotations, "created_at")
        await safe_create_index(db.quotations, [("status", 1), ("created_at", -1)])
        
        # ==================== ENQUIRIES ====================
        await safe_create_index(db.enquiries, "id", unique=True)
        await safe_create_index(db.enquiries, "enquiry_no")
        await safe_create_index(db.enquiries, "status")
        await safe_create_index(db.enquiries, "created_at")
        
        # ==================== LEADS ====================
        await safe_create_index(db.leads, "id", unique=True)
        await safe_create_index(db.leads, "status")
        await safe_create_index(db.leads, "assigned_to")
        await safe_create_index(db.leads, "created_at")
        
        logger.info("✓ Database indexes initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ Error creating database indexes: {e}")
        return False


async def get_collection_stats(db):
    """Get statistics for all collections"""
    collections = [
        "projects", "users", "amcs", "test_reports", 
        "payment_requests", "work_completion_certificates",
        "weekly_meetings", "department_team", "scheduled_inspections",
        "customers", "vendors", "notifications", "clients",
        "quotations", "enquiries", "leads", "refresh_tokens", "pdf_jobs"
    ]
    
    stats = {}
    for collection_name in collections:
        try:
            count = await db[collection_name].count_documents({})
            stats[collection_name] = count
        except Exception:
            stats[collection_name] = 0
    
    return stats
