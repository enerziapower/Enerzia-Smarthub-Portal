from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
import logging

logger = logging.getLogger(__name__)

# MongoDB connection with timeout and error handling
try:
    client = AsyncIOMotorClient(
        settings.MONGO_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    db = client[settings.DB_NAME]
    logger.info(f"MongoDB client initialized for database: {settings.DB_NAME}")
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    raise
