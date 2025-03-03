from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class AddressBase(BaseModel):
    name: str
    email: EmailStr
    status: Optional[str] = "active"  # Add this line


class AddressCreate(AddressBase):
    pass


class Address(AddressBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmailRequest(BaseModel):
    receiver_email: EmailStr
    subject: str
    body: str
    recipient_name: Optional[str] = ""
    files: Optional[List[dict]] = []


class EmailResponse(BaseModel):
    success: bool
    message: str
