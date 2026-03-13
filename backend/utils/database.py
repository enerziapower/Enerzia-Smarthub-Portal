"""
Database utilities - MongoDB indexes and optimization
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def create_indexes(db):
    """Create database indexes for improved query performance"""
    try:
        # ==================== PROJECTS ====================
        await db.projects.create_index("id", unique=True)
        await db.projects.create_index("pid_no")
        await db.projects.create_index("status")
        await db.projects.create_index("category")
        await db.projects.create_index("department")
        await db.projects.create_index("created_at")
        await db.projects.create_index("customer_id")  # NEW: For customer lookup
        await db.projects.create_index([("client", 1), ("status", 1)])
        await db.projects.create_index([("status", 1), ("created_at", -1)])  # NEW: For filtered lists
        
        # ==================== USERS ====================
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("department")
        await db.users.create_index("role")
        await db.users.create_index("is_active")  # NEW: For active user queries
        
        # ==================== REFRESH TOKENS (NEW) ====================
        await db.refresh_tokens.create_index("token", unique=True)
        await db.refresh_tokens.create_index("user_id")
        await db.refresh_tokens.create_index(
            "expires_at",
            expireAfterSeconds=0  # TTL index - auto-delete when expires_at is reached
        )
        
        # ==================== AMC ====================
        await db.amcs.create_index("id", unique=True)
        await db.amcs.create_index("project_id")
        await db.amcs.create_index("status")
        await db.amcs.create_index("created_at")
        await db.amcs.create_index([("contract_details.end_date", 1)])
        await db.amcs.create_index([("status", 1), ("contract_details.end_date", 1)])  # NEW
        
        # ==================== TEST REPORTS ====================
        await db.test_reports.create_index("id", unique=True)
        await db.test_reports.create_index("equipment_type")
        await db.test_reports.create_index("report_type")  # NEW: For report type filtering
        await db.test_reports.create_index("report_no")
        await db.test_reports.create_index("customer_name")
        await db.test_reports.create_index("project_id")  # NEW: For project-based queries
        await db.test_reports.create_index("created_at")
        await db.test_reports.create_index([("equipment_type", 1), ("created_at", -1)])
        await db.test_reports.create_index([("report_type", 1), ("created_at", -1)])  # NEW
        
        # ==================== IR THERMOGRAPHY ====================
        await db.ir_thermography_images.create_index("report_id")  # NEW: For image lookup
        await db.ir_thermography_images.create_index("item_index")  # NEW
        
        # ==================== PDF JOBS (NEW) ====================
        await db.pdf_jobs.create_index("job_id", unique=True)
        await db.pdf_jobs.create_index("status")
        await db.pdf_jobs.create_index("created_at")
        await db.pdf_jobs.create_index(
            "created_at",
            expireAfterSeconds=86400  # Auto-delete after 24 hours
        )
        
        # ==================== PAYMENT REQUESTS ====================
        await db.payment_requests.create_index("id", unique=True)
        await db.payment_requests.create_index("project_id")
        await db.payment_requests.create_index("status")
        await db.payment_requests.create_index("created_at")
        await db.payment_requests.create_index([("status", 1), ("created_at", -1)])
        
        # ==================== WORK COMPLETION CERTIFICATES ====================
        await db.work_completion_certificates.create_index("id", unique=True)
        await db.work_completion_certificates.create_index("project_id")
        await db.work_completion_certificates.create_index("document_no")
        await db.work_completion_certificates.create_index("customer_name")  # NEW
        await db.work_completion_certificates.create_index("created_at")  # NEW
        
        # ==================== WEEKLY MEETINGS ====================
        await db.weekly_meetings.create_index("id", unique=True)
        await db.weekly_meetings.create_index("department")
        await db.weekly_meetings.create_index("meeting_date")
        await db.weekly_meetings.create_index([("department", 1), ("meeting_date", -1)])
        
        # ==================== DEPARTMENT TEAM ====================
        await db.department_team.create_index("id", unique=True)
        await db.department_team.create_index("department")
        await db.department_team.create_index("email")
        
        # ==================== SCHEDULED INSPECTIONS ====================
        await db.scheduled_inspections.create_index("id", unique=True)
        await db.scheduled_inspections.create_index("equipment_id")
        await db.scheduled_inspections.create_index("status")
        await db.scheduled_inspections.create_index("next_due_date")
        await db.scheduled_inspections.create_index([("status", 1), ("next_due_date", 1)])
        
        # ==================== PASSWORD RESETS ====================
        await db.password_resets.create_index("email")
        await db.password_resets.create_index(
            "created_at", 
            expireAfterSeconds=3600  # Auto-delete after 1 hour
        )
        
        # ==================== NOTIFICATIONS ====================
        await db.notifications.create_index("id", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("department")  # NEW
        await db.notifications.create_index("is_read")
        await db.notifications.create_index("created_at")  # NEW
        await db.notifications.create_index([("user_id", 1), ("is_read", 1), ("created_at", -1)])
        await db.notifications.create_index([("department", 1), ("is_read", 1), ("created_at", -1)])  # NEW
        
        # ==================== CLIENTS (Domestic/Export Customers) ====================
        await db.clients.create_index("id", unique=True)
        await db.clients.create_index("name")
        await db.clients.create_index("customer_type")  # NEW: domestic/export
        await db.clients.create_index("is_active")  # NEW
        await db.clients.create_index([("customer_type", 1), ("is_active", 1)])  # NEW
        
        # ==================== CUSTOMERS ====================
        await db.customers.create_index("id", unique=True)
        await db.customers.create_index("name")
        await db.customers.create_index("email")
        
        # ==================== VENDORS ====================
        await db.vendors.create_index("id", unique=True)
        await db.vendors.create_index("name")
        await db.vendors.create_index("is_active")  # NEW
        
        # ==================== QUOTATIONS ====================
        await db.quotations.create_index("id", unique=True)
        await db.quotations.create_index("quotation_no")  # NEW
        await db.quotations.create_index("status")  # NEW
        await db.quotations.create_index("created_at")  # NEW
        await db.quotations.create_index([("status", 1), ("created_at", -1)])  # NEW
        
        # ==================== ENQUIRIES ====================
        await db.enquiries.create_index("id", unique=True)
        await db.enquiries.create_index("enquiry_no")  # NEW
        await db.enquiries.create_index("status")  # NEW
        await db.enquiries.create_index("created_at")  # NEW
        
        # ==================== LEADS ====================
        await db.leads.create_index("id", unique=True)
        await db.leads.create_index("status")  # NEW
        await db.leads.create_index("assigned_to")  # NEW
        await db.leads.create_index("created_at")  # NEW
        
        logger.info("✓ Database indexes created successfully")
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
