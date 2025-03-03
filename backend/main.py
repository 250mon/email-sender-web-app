import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session

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
allowed_origins = os.getenv("ALLOWED_ORIGIN_URLS", "http://localhost:3000").split(",")
# Check the integrity of the URLs
for origin in allowed_origins:
    if origin.strip().lower() == "all":
        allowed_origins = ["*"]
        break
    result = urlparse(origin)
    if not all([result.scheme, result.netloc]):
        raise ValueError(f"Invalid URL in ALLOWED_ORIGIN_URLS: {origin}")
logger.info(f"Allowed origins: {allowed_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    logger.info("Handling file upload request")
    try:
        uploaded_files = await save_upload_files(files, UPLOAD_FOLDER)
        return {"message": "Files uploaded successfully", "files": uploaded_files}
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/send-email")
async def send_email(email_request: EmailRequest, db: Session = Depends(get_db)):
    logger.info("Starting email send process...")
    try:
        # Check if recipient is active
        recipient = db.query(Address).filter(
            Address.email == email_request.receiver_email
        ).first()
        
        if recipient and recipient.status == "inactive":
            return {
                "success": False,
                "message": f"Email not sent: {email_request.receiver_email} is marked as inactive"
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
    if not hasattr(address, 'status'):
        address.status = 'active'
    db_address = Address(**address.model_dump())
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address.to_dict()


@app.put("/api/addresses/{address_id}")
async def update_address(address_id: int, address: AddressCreate, db: Session = Depends(get_db)):
    db_address = db.query(Address).filter(Address.id == address_id).first()
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Ensure status is included in the update
    update_data = address.model_dump()
    if 'status' not in update_data:
        update_data['status'] = 'active'

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
        secure=True,   # Only sent over HTTPS
        samesite="lax" # CSRF protection
    )
    return {"message": "Cookie set"}

# Example of reading a cookie
@app.get("/api/get-cookie")
async def get_cookie(session_id: Optional[str] = Cookie(None)):
    if not session_id:
        return {"message": "No cookie found"}
    return {"session_id": session_id}


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
