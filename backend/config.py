import os
from pathlib import Path

from dotenv import load_dotenv

from logger_config import setup_logger

# Load environment variables
load_dotenv()

# Create logger before class definition
logger = setup_logger("config")


class Config:
    # Base directory for all file paths
    BASE_DIR = Path(__file__).parent
    DB_DIR = BASE_DIR / "db"

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-please-change")

    # Database
    def _get_database_uri(self):
        db_file_name = os.getenv("DATABASE_FILE_NAME", "email.db")
        # The database will be in the /app/db directory in the container
        db_path = self.DB_DIR / db_file_name
        if not db_path.exists():
            logger.warning(f"Database file {db_path} does not exist. Creating it.")
            db_path.touch()
        # Log the database path
        logger.info(f"Using database at: {db_path}")
        # Return the SQLite connection string
        return f"sqlite:///{db_path}"

    # Email settings
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SENDER_EMAIL = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

    if not SENDER_EMAIL:
        logger.error("SMTP_EMAIL is not set in environment variables.")
    if not SMTP_PASSWORD:
        logger.error("SMTP_PASSWORD is not set in environment variables.")
    if not SMTP_SERVER:
        logger.warning("SMTP_SERVER is not set, using default smtp.gmail.com.")

    # File upload
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    def __init__(self):
        logger.debug("Initializing Config")
        # Set database URI during initialization
        self.SQLALCHEMY_DATABASE_URI = self._get_database_uri()
        # Ensure upload directory exists
        self.UPLOAD_FOLDER.mkdir(exist_ok=True)
