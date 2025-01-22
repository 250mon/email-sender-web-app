import os
from pathlib import Path
from logger_config import setup_logger

# Create logger before class definition
logger = setup_logger('config')

class Config:
    # Base directory for all file paths
    BASE_DIR = Path(__file__).parent

    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-please-change')
    
    # Database
    def _get_database_uri(self):
        db_url = os.getenv('DATABASE_URL')
        if not db_url or not os.path.exists(db_url):
            logger.warning(f"Database URL not found or invalid: {db_url}. Using default SQLite database({self.BASE_DIR}/app.db).")
            return f'sqlite:///{self.BASE_DIR}/app.db'
        return db_url

    SQLALCHEMY_DATABASE_URI = property(_get_database_uri)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('FLASK_ENV') == 'development'

    # Email settings
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SENDER_EMAIL = os.getenv('SMTP_EMAIL')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')

    # File upload
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    def __init__(self):
        logger.debug("Initializing Config")
        # Ensure upload directory exists
        self.UPLOAD_FOLDER.mkdir(exist_ok=True) 