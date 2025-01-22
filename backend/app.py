import urllib.parse
from pathlib import Path
import json
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
from logger_config import setup_logger

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config
from email_sender import EmailSender
from models import Address, db, EmailHistory

# Load environment variables
load_dotenv()

# Create logger for app
logger = setup_logger('app')

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class())
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')])

    # Create database tables
    with app.app_context():
        db.create_all()

    logger.info('Email Sender startup')
    return app

app = create_app()

# Ensure upload folder exists
UPLOAD_FOLDER = Path(app.config["UPLOAD_FOLDER"])
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Ensure data directory exists
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def secure_filename_with_hangul(filename):
    """Custom secure filename function that preserves Korean characters"""
    filename_encoded = urllib.parse.quote(filename)
    filename_safe = "".join(
        c for c in filename_encoded if c.isalnum() or c in ["%", "-", "_", "."]
    )
    return filename_safe


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "files" not in request.files:
        return jsonify({"error": "No file part"}), 400

    files = request.files.getlist("files")
    uploaded_files = []

    for file in files:
        if file.filename:
            try:
                filename = secure_filename_with_hangul(file.filename)
                filepath = UPLOAD_FOLDER / filename

                # Ensure unique filename
                counter = 0
                while filepath.exists():
                    counter += 1
                    name_parts = filename.rsplit(".", 1)
                    if len(name_parts) > 1:
                        filepath = (
                            UPLOAD_FOLDER / f"{name_parts[0]}_{counter}.{name_parts[1]}"
                        )
                    else:
                        filepath = UPLOAD_FOLDER / f"{filename}_{counter}"

                file.save(filepath)

                # For display purposes, decode the filename
                display_name = urllib.parse.unquote(filepath.name)
                uploaded_files.append({"path": str(filepath), "name": display_name})
            except Exception as e:
                return (
                    jsonify({"error": f"Error saving file {file.filename}: {str(e)}"}),
                    500,
                )

    return jsonify({"message": "Files uploaded successfully", "files": uploaded_files})


@app.route("/api/send-email", methods=["POST"])
def send_email():
    logger.info("Starting email send process...")
    try:
        data = request.json
        logger.debug(f"Received request data: {json.dumps(data, indent=2)}")
        
        # Log SMTP configuration (hide password)
        smtp_config = {
            "smtp_server": app.config["SMTP_SERVER"],
            "port": app.config["SMTP_PORT"],
            "sender_email": app.config["SENDER_EMAIL"],
            "password": "********"  # Hide actual password in logs
        }
        logger.debug(f"Using SMTP configuration: {json.dumps(smtp_config, indent=2)}")
        logger.debug(f"Actual sender email from config: {app.config['SENDER_EMAIL']}")
        
        # Validate required fields
        required_fields = ['receiver_email', 'subject', 'body']
        for field in required_fields:
            if not data.get(field):
                error_msg = f"Missing required field: {field}"
                logger.error(error_msg)
                return jsonify({"success": False, "message": error_msg}), 400

        # Log files to be sent
        files_to_send = [f["path"] for f in data.get("files", [])]
        logger.debug(f"Files to be attached: {json.dumps(files_to_send, indent=2)}")
        
        # Verify files exist
        for file_path in files_to_send:
            if not os.path.exists(file_path):
                error_msg = f"File not found: {file_path}"
                logger.error(error_msg)
                return jsonify({"success": False, "message": error_msg}), 400
            logger.debug(f"Verified file exists: {file_path}")

        # Create actual SMTP config with password
        smtp_config_with_password = {
            "smtp_server": app.config["SMTP_SERVER"],
            "port": app.config["SMTP_PORT"],
            "sender_email": app.config["SENDER_EMAIL"],
            "password": app.config["SMTP_PASSWORD"],
        }

        logger.debug("Creating EmailSender instance...")
        email_sender = EmailSender(smtp_config_with_password)
        
        logger.info(f"Attempting to send email to: {data['receiver_email']}")
        logger.debug(f"Email subject: {data['subject']}")
        logger.debug(f"Email body length: {len(data['body'])} characters")
        
        result = email_sender.send_email(
            receiver_email=data["receiver_email"],
            subject=data["subject"],
            body=data["body"],
            files=files_to_send,
        )
        
        logger.debug(f"Email send result: {json.dumps(result, indent=2)}")

        if not result['success']:
            logger.error(f"Email sending failed: {result['message']}")
            return jsonify(result), 500

        # Save to email history
        logger.debug("Saving to email history...")
        history = EmailHistory(
            recipient_name=data.get("recipient_name", ""),
            recipient_email=data["receiver_email"],
            subject=data["subject"],
            files=json.dumps([f["name"] for f in data.get("files", [])]),
            status='success' if result['success'] else 'error',
            message=result['message']
        )
        
        try:
            db.session.add(history)
            db.session.commit()
            logger.info("Email history saved successfully")
        except Exception as e:
            logger.error(f"Failed to save email history: {str(e)}", exc_info=True)

        # Clean up uploaded files after sending
        logger.debug("Starting cleanup of uploaded files...")
        for file_path in files_to_send:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Successfully deleted file: {file_path}")
                else:
                    logger.warning(f"File not found during cleanup: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete file {file_path}: {str(e)}", exc_info=True)

        logger.info("Email send process completed successfully")
        return jsonify(result)

    except Exception as e:
        error_msg = f"Unexpected error in send_email: {str(e)}"
        logger.error(error_msg, exc_info=True)
        logger.error(f"Full request data: {json.dumps(request.json, indent=2)}")
        return jsonify({"success": False, "message": error_msg}), 500


@app.route("/api/email-history", methods=["GET"])
def get_email_history():
    try:
        logger.debug("Handling GET request for email history")
        # Optional query parameters for filtering
        recipient = request.args.get('recipient')
        subject = request.args.get('subject')
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        logger.debug(f"Query params - recipient: {recipient}, subject: {subject}, status: {status}, date_from: {date_from}, date_to: {date_to}")

        query = EmailHistory.query

        if recipient:
            logger.debug(f"Filtering by recipient: {recipient}")
            query = query.filter(
                db.or_(
                    EmailHistory.recipient_name.ilike(f'%{recipient}%'),
                    EmailHistory.recipient_email.ilike(f'%{recipient}%')
                )
            )
        
        if subject:
            logger.debug(f"Filtering by subject: {subject}")
            query = query.filter(EmailHistory.subject.ilike(f'%{subject}%'))
        
        if status:
            logger.debug(f"Filtering by status: {status}")
            query = query.filter(EmailHistory.status == status)

        if date_from:
            logger.debug(f"Filtering by date_from: {date_from}")
            date_from = datetime.fromisoformat(date_from)
            query = query.filter(EmailHistory.created_at >= date_from)

        if date_to:
            logger.debug(f"Filtering by date_to: {date_to}")
            date_to = datetime.fromisoformat(date_to)
            query = query.filter(EmailHistory.created_at <= date_to)

        # Order by most recent first
        history = query.order_by(EmailHistory.created_at.desc()).all()
        logger.debug(f"Found {len(history)} email history records")
        return jsonify([h.to_dict() for h in history])

    except Exception as e:
        logger.error(f"Error retrieving email history: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route("/api/addresses", methods=["GET", "POST", "PUT", "DELETE"])
def manage_addresses():
    try:
        logger.debug(f"Handling {request.method} request for addresses")
        
        if request.method == "GET":
            addresses = Address.query.all()
            logger.debug(f"Retrieved {len(addresses)} addresses")
            return jsonify([address.to_dict() for address in addresses])

        elif request.method == "POST":
            data = request.json
            logger.debug(f"Creating new address with data: {json.dumps(data)}")
            new_address = Address(
                name=data["name"],
                email=data["email"],
            )
            db.session.add(new_address)
            db.session.commit()
            logger.debug(f"Successfully created address: {new_address.id}")
            return jsonify(new_address.to_dict())

        elif request.method == "PUT":
            data = request.json
            logger.debug(f"Updating address with data: {json.dumps(data)}")
            address = Address.query.get(int(data["id"]))
            if not address:
                logger.warning(f"Address not found with id: {data['id']}")
                return jsonify({"error": "Address not found"}), 404

            address.name = data["name"]
            address.email = data["email"]
            db.session.commit()
            logger.debug(f"Successfully updated address: {address.id}")
            return jsonify(address.to_dict())

        elif request.method == "DELETE":
            address_id = request.args.get("id")
            logger.debug(f"Deleting address with id: {address_id}")
            address = Address.query.get(int(address_id))
            if not address:
                logger.warning(f"Address not found with id: {address_id}")
                return jsonify({"error": "Address not found"}), 404

            db.session.delete(address)
            db.session.commit()
            logger.debug(f"Successfully deleted address: {address_id}")
            return jsonify({"success": True})

    except Exception as e:
        logger.error(f"Error managing addresses: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Set Flask environment
    flask_env = os.getenv('FLASK_ENV', 'development')
    debug_mode = flask_env == 'development'
    
    # Configure logging level based on environment
    log_level = logging.DEBUG if debug_mode else logging.INFO
    logger.setLevel(log_level)
    
    app.run(
        debug=debug_mode,
        use_reloader=debug_mode
    )

