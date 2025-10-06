from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from geopy.distance import geodesic
import os

from . import models

SECRET_KEY = os.getenv("SECRET_KEY", "pedia-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

GEOFENCE_CENTER = (22.930758, -82.689342)
GEOFENCE_RADIUS_M = 200

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def validate_geofence(lat: float, lng: float) -> bool:
    user_location = (lat, lng)
    distance = geodesic(GEOFENCE_CENTER, user_location).meters
    return distance <= GEOFENCE_RADIUS_M

def create_initial_data(db: Session):
    student = db.query(models.User).filter(models.User.phone == "50861331").first()
    if not student:
        student = models.User(
            phone="50861331",
            password_hash=get_password_hash("50861331"),
            user_type="student",
            full_name="Rey Rojas"
        )
        db.add(student)
    
    admin = db.query(models.User).filter(models.User.email == "asistentepediatrico2025@gmail.com").first()
    if not admin:
        admin = models.User(
            email="asistentepediatrico2025@gmail.com",
            password_hash=get_password_hash("QWE123"),
            user_type="admin",
            full_name="Administrador"
        )
        db.add(admin)
    
    db.commit()
