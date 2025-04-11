import logging
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logger(name):
    # Get or create logger
    logger = logging.getLogger(name)

    # Return existing logger if it's already configured
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    # Prevent propagation to avoid duplicate logs
    logger.propagate = False

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Create formatters
    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s [in %(pathname)s:%(lineno)d]"
    )
    console_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # File handler
    file_handler = RotatingFileHandler(
        "logs/emailsender.log", maxBytes=10240, backupCount=10
    )
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(logging.DEBUG)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(logging.DEBUG)

    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger

