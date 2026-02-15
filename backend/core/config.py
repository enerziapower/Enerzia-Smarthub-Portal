import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    # MongoDB
    MONGO_URL: str = os.environ.get('MONGO_URL', '')
    DB_NAME: str = os.environ.get('DB_NAME', 'dept_connect')
    
    # JWT
    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Resend (Email)
    RESEND_API_KEY: str = os.environ.get('RESEND_API_KEY', '')
    SENDER_EMAIL: str = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
    
    # File Uploads
    UPLOADS_DIR: Path = Path("/app/uploads")
    ALLOWED_EXTENSIONS: set = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'}
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

settings = Settings()

# Ensure uploads directory exists
settings.UPLOADS_DIR.mkdir(exist_ok=True)
