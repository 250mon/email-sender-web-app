from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class AddressBase(BaseModel):
    name: str
    email: EmailStr

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
