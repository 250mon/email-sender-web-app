import glob
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

import uvicorn
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from config import Config
from db import Address, Base, EmailHistory, engine, get_db
from dependencies import save_upload_files
from email_sender import EmailSender
from logger_config import setup_logger
from schemas import AddressCreate, EmailRequest

# Load environment variables
load_dotenv()

# Create logger
logger = setup_logger("main")

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email Sender API")

# CORS middleware
# Read and process the allowed origins
raw_origins = os.getenv("ALLOWED_ORIGIN_URLS", "")
# Split by comma and strip whitespace
origins = [origin.strip() for origin in raw_origins.split(",")]

# If "all" is in the list, allow all origins
if "all" in origins:
    origins = ["*"]
else:
    for origin in origins:
        result = urlparse(origin)
        if not all([result.scheme, result.netloc]):
            raise ValueError(f"Invalid URL in ALLOWED_ORIGIN_URLS: {origin}")
logger.info(f"Allowed origins: {origins}")

# Add a new CORS logging middleware
class CORSLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request headers related to CORS
        if request.url.path == "/api/addresses":
            logger.info("=== CORS Request Details ===")
            logger.info(f"Request path: {request.url.path}")
            logger.info(f"Request method: {request.method}")
            logger.info(f"Origin: {request.headers.get('origin', 'No origin header')}")
            logger.info(f"Access-Control-Request-Method: {request.headers.get('access-control-request-method', 'No ACRM header')}")
            logger.info(f"Access-Control-Request-Headers: {request.headers.get('access-control-request-headers', 'No ACRH header')}")
            logger.info("=== End CORS Request Details ===")

        response = await call_next(request)

        # Log response headers related to CORS
        if request.url.path == "/api/addresses":
            logger.info("=== CORS Response Details ===")
            logger.info(f"Access-Control-Allow-Origin: {response.headers.get('access-control-allow-origin', 'No ACAO header')}")
            logger.info(f"Access-Control-Allow-Methods: {response.headers.get('access-control-allow-methods', 'No ACAM header')}")
            logger.info(f"Access-Control-Allow-Headers: {response.headers.get('access-control-allow-headers', 'No ACAH header')}")
            logger.info("=== End CORS Response Details ===")

        return response

# Add the CORS logging middleware before the CORS middleware
app.add_middleware(CORSLoggingMiddleware)

# Update the existing CORS middleware configuration with more detailed logging
logger.info("Configuring CORS middleware with the following settings:")
logger.info(f"Allowed origins: {origins}")
logger.info("Allow credentials: True")
logger.info("Allow methods: ['*']")
logger.info("Allow headers: ['*']")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure paths
config = Config()
UPLOAD_FOLDER = Path(config.UPLOAD_FOLDER)
UPLOAD_FOLDER.mkdir(exist_ok=True)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload multiple files and return their paths"""
    file_paths = []
    try:
        for file in files:
            # Ensure filename is properly preserved with Unicode characters
            # Replace potentially problematic characters in filename
            safe_filename = "".join(
                c for c in file.filename if c.isalnum() or c in "._- "
            )

            # If filename became empty after cleaning, use a default name
            if not safe_filename:
                safe_filename = f"file_{uuid.uuid4().hex[:8]}"

            file_path = os.path.join(UPLOAD_FOLDER, safe_filename)

            # Avoid overwriting existing files with same name
            counter = 1
            original_file_path = file_path
            while os.path.exists(file_path):
                name, ext = os.path.splitext(original_file_path)
                file_path = f"{name}_{counter}{ext}"
                counter += 1

            # Save the file
            with open(file_path, "wb") as f:
                f.write(await file.read())

            file_paths.append({"name": safe_filename, "path": file_path})

        return {"files": file_paths}
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/send-email")
async def send_email(email_request: EmailRequest, db: Session = Depends(get_db)):
    logger.info("Starting email send process...")
    try:
        # Check if recipient is active
        recipient = (
            db.query(Address)
            .filter(Address.email == email_request.receiver_email)
            .first()
        )

        if recipient and recipient.status == "inactive":
            return {
                "success": False,
                "message": f"Email not sent: {email_request.receiver_email} is marked as inactive",
            }

        # Log request data (excluding sensitive info)
        logger.debug(f"Received email request for: {email_request.receiver_email}")

        # Validate files
        files_to_send = [f["path"] for f in email_request.files]
        for file_path in files_to_send:
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=400, detail=f"File not found: {file_path}"
                )

        # Configure email sender
        smtp_config = {
            "smtp_server": config.SMTP_SERVER,
            "port": config.SMTP_PORT,
            "sender_email": config.SENDER_EMAIL,
            "password": config.SMTP_PASSWORD,
        }

        email_sender = EmailSender(smtp_config)
        result = email_sender.send_email(
            receiver_email=email_request.receiver_email,
            subject=email_request.subject,
            body=email_request.body,
            files=files_to_send,
        )

        if not result["success"]:
            logger.error(f"Email sending failed: {result['message']}")
            raise HTTPException(status_code=500, detail=result["message"])

        # Save to email history
        history = EmailHistory(
            recipient_name=email_request.recipient_name,
            recipient_email=email_request.receiver_email,
            subject=email_request.subject,
            files=json.dumps([f["name"] for f in email_request.files]),
            status="success" if result["success"] else "error",
            message=result["message"],
        )

        db.add(history)
        db.commit()

        # Clean up uploaded files
        for file_path in files_to_send:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Deleted file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete file {file_path}: {str(e)}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error in send_email: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/api/email-history")
async def get_email_history(
    db: Session = Depends(get_db),
    recipient: Optional[str] = None,
    subject: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    try:
        logger.debug("Handling email history request")
        query = db.query(EmailHistory)

        if recipient:
            query = query.filter(
                or_(
                    EmailHistory.recipient_name.ilike(f"%{recipient}%"),
                    EmailHistory.recipient_email.ilike(f"%{recipient}%"),
                )
            )

        if subject:
            query = query.filter(EmailHistory.subject.ilike(f"%{subject}%"))

        if status:
            query = query.filter(EmailHistory.status == status)

        if date_from:
            query = query.filter(EmailHistory.created_at >= date_from)

        if date_to:
            query = query.filter(EmailHistory.created_at <= date_to)

        history = query.order_by(EmailHistory.created_at.desc()).all()
        return [h.to_dict() for h in history]

    except Exception as e:
        logger.error(f"Error retrieving email history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# In main.py, update the get_addresses function to filter by status
@app.get("/api/addresses")
async def get_addresses(db: Session = Depends(get_db), status: Optional[str] = None):
    query = db.query(Address)
    if status:
        query = query.filter(Address.status == status)
    addresses = query.all()
    return [address.to_dict() for address in addresses]


# In main.py, update the showConfirmation function in EmailSenderPage to filter inactive addresses
# This is referenced in your frontend code, so we need to modify the backend endpoint
@app.get("/api/active-addresses")
async def get_active_addresses(db: Session = Depends(get_db)):
    addresses = db.query(Address).filter(Address.status == "active").all()
    return [address.to_dict() for address in addresses]


@app.post("/api/addresses")
async def create_address(address: AddressCreate, db: Session = Depends(get_db)):
    # Ensure status is set to 'active' if not provided
    if not hasattr(address, "status"):
        address.status = "active"
    db_address = Address(**address.model_dump())
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address.to_dict()


@app.put("/api/addresses/{address_id}")
async def update_address(
    address_id: int, address: AddressCreate, db: Session = Depends(get_db)
):
    db_address = db.query(Address).filter(Address.id == address_id).first()
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Ensure status is included in the update
    update_data = address.model_dump()
    if "status" not in update_data:
        update_data["status"] = "active"

    for key, value in update_data.items():
        setattr(db_address, key, value)

    db.commit()
    return db_address.to_dict()


@app.delete("/api/addresses/{address_id}")
async def delete_address(address_id: int, db: Session = Depends(get_db)):
    db_address = db.query(Address).filter(Address.id == address_id).first()
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")

    db.delete(db_address)
    db.commit()
    return {"success": True}


# Example of setting a cookie
@app.post("/api/set-cookie")
async def set_cookie(response: Response):
    response.set_cookie(
        key="session_id",
        value="some_value",
        max_age=3600,  # 1 hour
        httponly=True,  # Prevents JavaScript access
        secure=True,  # Only sent over HTTPS
        samesite="lax",  # CSRF protection
    )
    return {"message": "Cookie set"}


# Example of reading a cookie
@app.get("/api/get-cookie")
async def get_cookie(session_id: Optional[str] = Cookie(None)):
    if not session_id:
        return {"message": "No cookie found"}
    return {"session_id": session_id}


@app.get("/api/files")
async def list_files():
    """List all files in the upload directory"""
    try:
        files = []
        for file_path in glob.glob(f"{UPLOAD_FOLDER}/*"):
            # Ensure the file name is properly decoded for display
            file_name = os.path.basename(file_path)
            file_info = {
                "name": file_name,
                "path": file_path,
                "size": os.path.getsize(file_path),
                "created": datetime.fromtimestamp(
                    os.path.getctime(file_path)
                ).isoformat(),
            }
            files.append(file_info)
        return {"files": files}
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files")
async def delete_files(file_paths: List[str] = None):
    """Delete specified files or all files if none specified"""
    try:
        if not file_paths:
            # Delete all files
            for file_path in glob.glob(f"{UPLOAD_FOLDER}/*"):
                os.remove(file_path)
                logger.debug(f"Deleted file: {file_path}")
            return {"message": "All files deleted successfully"}
        else:
            # Delete specified files
            for file_path in file_paths:
                if os.path.exists(file_path) and os.path.dirname(file_path) == str(
                    UPLOAD_FOLDER
                ):
                    os.remove(file_path)
                    logger.debug(f"Deleted file: {file_path}")
                else:
                    logger.warning(
                        f"File not found or outside upload directory: {file_path}"
                    )
            return {"message": f"{len(file_paths)} files deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port_str = os.getenv("BACKEND_PORT", "5000")
    if not port_str.isdigit():
        raise ValueError(f"Invalid port number: {port_str}")
    port = int(port_str)
    logger.info(f"port={port}")

    uvicorn.run(
        "main:app",
        reload=os.getenv("BACKEND_DEBUG", "false").lower()
        == "true",  # Use BACKEND_DEBUG to control reload
        port=port,
    )
