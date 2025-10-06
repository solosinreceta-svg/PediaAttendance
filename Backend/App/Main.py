from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import cloudinary
import cloudinary.uploader
import os

from . import models, schemas, auth, database
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PediaAttendance", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/auth/login")
async def login(login_data: schemas.Login, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.phone == login_data.phone) | 
        (models.User.email == login_data.phone)
    ).first()
    
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = auth.create_access_token(data={"sub": user.phone})
    return {"access_token": access_token, "token_type": "bearer", "user_type": user.user_type}

@app.post("/attendance/checkin")
async def checkin_attendance(checkin: schemas.AttendanceCheckin, db: Session = Depends(get_db), token: str = Depends(security)):
    try:
        payload = auth.verify_token(token.credentials)
        user_phone = payload.get("sub")
        
        user = db.query(models.User).filter(models.User.phone == user_phone).first()
        if not user or user.user_type != "student":
            raise HTTPException(status_code=403, detail="No autorizado")
        
        if not auth.validate_geofence(checkin.latitude, checkin.longitude):
            raise HTTPException(status_code=400, detail="Fuera del área permitida")
        
        photo_url = ""
        if checkin.photo_base64:
            try:
                upload_result = cloudinary.uploader.upload(f"data:image/jpeg;base64,{checkin.photo_base64}", folder="pedia_attendance")
                photo_url = upload_result["secure_url"]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error al subir foto")
        
        attendance = models.Attendance(
            user_id=user.id,
            latitude=checkin.latitude,
            longitude=checkin.longitude,
            photo_url=photo_url,
            status="present"
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        return {"message": "Asistencia registrada", "id": attendance.id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno")

@app.get("/admin/list")
async def list_attendance(db: Session = Depends(get_db), token: str = Depends(security)):
    payload = auth.verify_token(token.credentials)
    user_phone = payload.get("sub")
    
    user = db.query(models.User).filter(models.User.phone == user_phone).first()
    if not user or user.user_type != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    attendances = db.query(models.Attendance).order_by(models.Attendance.created_at.desc()).all()
    return attendances

@app.get("/admin/export")
async def export_attendance_pdf(db: Session = Depends(get_db), token: str = Depends(security)):
    payload = auth.verify_token(token.credentials)
    user_phone = payload.get("sub")
    
    user = db.query(models.User).filter(models.User.phone == user_phone).first()
    if not user or user.user_type != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    attendances = db.query(models.Attendance).all()
    return {"pdf_url": "https://example.com/report.pdf", "count": len(attendances)}

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        auth.create_initial_data(db)
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "PediaAttendance API"}
