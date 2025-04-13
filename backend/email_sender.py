import os
import smtplib
import ssl
import urllib.parse
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List

from logger_config import setup_logger

logger = setup_logger("email_sender")


class EmailSender:
    def __init__(self, config):
        self.smtp_server = config["smtp_server"]
        self.port = config["port"]
        self.sender_email = config["sender_email"]
        self.password = config["password"]
        logger.debug(
            f"EmailSender initialized with server: {self.smtp_server}, port: {self.port}, sender: {self.sender_email}"
        )

    def create_message(
        self, receiver_email: str, subject: str, body: str
    ) -> MIMEMultipart:
        message = MIMEMultipart()
        message["From"] = self.sender_email
        message["To"] = receiver_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))
        return message

    def attach_files(self, message: MIMEMultipart, files: List[str]) -> None:
        for file_path in files:
            with open(file_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
                encoders.encode_base64(part)

                # Get original filename and decode if it's URL encoded
                filename = os.path.basename(file_path)
                if "%" in filename:
                    filename = urllib.parse.unquote(filename)

                # RFC 2231 encoding for filename
                filename_encoded = filename.encode("utf-8")
                filename_str = filename_encoded.decode("latin-1")

                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=("utf-8", "", filename),  # This is the key change
                )
                message.attach(part)

    def send_email(
        self, receiver_email: str, subject: str, body: str, files: List[str]
    ) -> Dict:
        try:
            logger.debug(f"Creating email message for {receiver_email}")
            message = self.create_message(receiver_email, subject, body)
            if files:
                logger.debug(f"Attaching {len(files)} files")
                self.attach_files(message, files)

            logger.debug("Connecting to SMTP server")
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.port, timeout=10) as server:
                server.ehlo()
                logger.debug("Starting TLS")
                server.starttls(context=context)
                server.ehlo()
                logger.debug("Logging into SMTP server")
                server.login(self.sender_email, self.password)

                # === START SMTP CONVERSATION ===
                logger.debug("Starting SMTP conversation")
                # MAIL FROM first
                code, response = server.mail(self.sender_email)
                if code != 250:
                    error_msg = f"MAIL FROM command failed ({code}): {response.decode(errors='ignore')}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                # Then RCPT TO
                logger.debug(f"Verifying recipient {receiver_email}")
                code, response = server.rcpt(receiver_email)
                if code != 250 and code != 251:
                    error_msg = f"Recipient verification failed ({code}): {response.decode(errors='ignore')}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}

                # === ACTUALLY SEND ===
                logger.debug("Sending email")
                try:
                    server.send_message(message)
                    return {
                        "success": True,
                        "message": f"Email sent successfully to {receiver_email}",
                    }
                except smtplib.SMTPRecipientsRefused as e:
                    error_msg = f"Recipient {receiver_email} was refused by the server: {e.recipients}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}
                except smtplib.SMTPException as e:
                    error_msg = f"SMTP error while sending to {receiver_email}: {str(e)}"
                    logger.error(error_msg)
                    return {"success": False, "message": error_msg}
        except Exception as e:
            error_msg = f"Failed to send email to {receiver_email}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"success": False, "message": error_msg}