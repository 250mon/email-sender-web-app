import os
from pathlib import Path
from alembic.config import Config as AlembicConfig
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import Config  # Assuming config.py is in the same directory

config = Config()
engine = create_engine(config.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Add this function to configure Alembic dynamically
def setup_alembic():
    """Configure Alembic with the current database URI."""
    # Get the base directory where alembic.ini is located
    base_dir = Path(__file__).parent
    alembic_ini_path = base_dir / "alembic.ini"
    
    if not alembic_ini_path.exists():
        raise FileNotFoundError(f"Alembic configuration file not found at {alembic_ini_path}")
    
    # Create Alembic config object
    alembic_cfg = AlembicConfig(str(alembic_ini_path))
    
    # Set the sqlalchemy.url value dynamically
    alembic_cfg.set_main_option("sqlalchemy.url", config.SQLALCHEMY_DATABASE_URI)
    
    return alembic_cfg

# Keep the existing dependency function
# get_db function to be used as a FastAPI dependency
# Keep the existing dependency function
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
