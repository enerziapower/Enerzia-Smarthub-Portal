"""
Database utilities - MongoDB indexes and optimization
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def create_indexes(db):
    """Create database indexes for improved query performance"""
    try:
        # Projects collection indexes
        await db.projects.create_index("id", unique=True)
        await db.projects.create_index("pid_no")
        await db.projects.create_index("status")
        await db.projects.create_index("category")
        await db.projects.create_index("department")
        await db.projects.create_index("created_at")
        await db.projects.create_index([("client", 1), ("status", 1)])
        
        # Users collection indexes
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("department")
        await db.users.create_index("role")
        
        # AMC collection indexes
        await db.amcs.create_index("id", unique=True)
        await db.amcs.create_index("project_id")
        await db.amcs.create_index("status")
        await db.amcs.create_index("created_at")
        await db.amcs.create_index([("contract_details.end_date", 1)])
        
        # Test reports collection indexes
        await db.test_reports.create_index("id", unique=True)
        await db.test_reports.create_index("equipment_type")
        await db.test_reports.create_index("report_no")
        await db.test_reports.create_index("customer_name")
        await db.test_reports.create_index("created_at")
        await db.test_reports.create_index([("equipment_type", 1), ("created_at", -1)])
        
        # Payment requests indexes
        await db.payment_requests.create_index("id", unique=True)
        await db.payment_requests.create_index("project_id")
        await db.payment_requests.create_index("status")
        await db.payment_requests.create_index("created_at")
        await db.payment_requests.create_index([("status", 1), ("created_at", -1)])
        
        # Work completion certificates indexes
        await db.work_completion_certificates.create_index("id", unique=True)
        await db.work_completion_certificates.create_index("project_id")
        await db.work_completion_certificates.create_index("document_no")
        
        # Project requirements indexes
        await db.project_requirements.create_index("id", unique=True)
        await db.project_requirements.create_index("project_id")
        await db.project_requirements.create_index("type")
        await db.project_requirements.create_index("status")
        await db.project_requirements.create_index([("project_id", 1), ("status", 1)])
        
        # Weekly meetings indexes
        await db.weekly_meetings.create_index("id", unique=True)
        await db.weekly_meetings.create_index("department")
        await db.weekly_meetings.create_index("meeting_date")
        await db.weekly_meetings.create_index([("department", 1), ("meeting_date", -1)])
        
        # Department team members indexes
        await db.department_team.create_index("id", unique=True)
        await db.department_team.create_index("department")
        await db.department_team.create_index("email")
        
        # Scheduled inspections indexes
        await db.scheduled_inspections.create_index("id", unique=True)
        await db.scheduled_inspections.create_index("equipment_id")
        await db.scheduled_inspections.create_index("status")
        await db.scheduled_inspections.create_index("next_due_date")
        await db.scheduled_inspections.create_index([("status", 1), ("next_due_date", 1)])
        
        # Password resets indexes (TTL index for auto-cleanup)
        await db.password_resets.create_index("email")
        await db.password_resets.create_index(
            "created_at", 
            expireAfterSeconds=3600  # Auto-delete after 1 hour
        )
        
        # Notifications indexes
        await db.notifications.create_index("id", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index([("user_id", 1), ("is_read", 1), ("created_at", -1)])
        
        # Customers indexes
        await db.customers.create_index("id", unique=True)
        await db.customers.create_index("name")
        await db.customers.create_index("email")
        
        # Vendors indexes
        await db.vendors.create_index("id", unique=True)
        await db.vendors.create_index("name")
        
        logger.info("Database indexes created successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")
        return False


async def get_collection_stats(db):
    """Get statistics for all collections"""
    collections = [
        "projects", "users", "amcs", "test_reports", 
        "payment_requests", "work_completion_certificates",
        "project_requirements", "weekly_meetings", 
        "department_team", "scheduled_inspections",
        "customers", "vendors", "notifications"
    ]
    
    stats = {}
    for collection_name in collections:
        try:
            count = await db[collection_name].count_documents({})
            stats[collection_name] = count
        except Exception:
            stats[collection_name] = 0
    
    return stats
