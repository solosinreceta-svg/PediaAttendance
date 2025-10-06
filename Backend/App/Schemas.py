from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Login(BaseModel):
    phone: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str

class AttendanceCheckin(BaseModel):
    latitude: float
    longitude: float
    photo_base64: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: str
    user_id: str
    latitude: float
    longitude: float
    photo_url: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
