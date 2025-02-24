import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import Config
from database import engine, get_db
from dependencies import save_upload_files
from email_sender import EmailSender
from logger_config import setup_logger
from models import Address, Base, EmailHistory
from schemas import AddressCreate, EmailRequest

# Load environment variables
load_dotenv()

# Create logger
logger = setup_logger("app")

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Email Sender API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
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
                db.or_(
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


@app.get("/api/addresses")
async def get_addresses(db: Session = Depends(get_db)):
    addresses = db.query(Address).all()
    return [address.to_dict() for address in addresses]


@app.post("/api/addresses")
async def create_address(address: AddressCreate, db: Session = Depends(get_db)):
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

    for key, value in address.model_dump().items():
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


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=os.getenv("FLASK_ENV") == "development",
    )
