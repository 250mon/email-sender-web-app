from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from database import Base  # Import Base from database.py


class TimestampMixin(object):
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Address(TimestampMixin, Base):
    __tablename__ = "addresses"  # Specify table name

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class EmailHistory(TimestampMixin, Base):
    __tablename__ = "email_history"  # Specify table name

    id = Column(Integer, primary_key=True, index=True)
    recipient_name = Column(String(100), nullable=False)
    recipient_email = Column(String(120), nullable=False)
    subject = Column(String(200))
    files = Column(Text, nullable=False)
    status = Column(String(20), nullable=False)
    message = Column(Text)

    def to_dict(self):
        return {
            "id": str(self.id),
            "recipient_name": self.recipient_name,
            "recipient_email": self.recipient_email,
            "subject": self.subject,
            "files": self.files,
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
