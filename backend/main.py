from fastapi import FastAPI
from database import db
from routes.auth import router as auth_router
<<<<<<< HEAD
from routes.complaint import router as complaint_router
from routes.report import router as report_router
=======
from routes.noise import router as noise_router
from routes.report import router as report_router
from routes.agency import router as agency_router
from routes.chatbot import router as chatbot_router
>>>>>>> origin/backend

app = FastAPI()

app.include_router(auth_router, prefix="/auth")
<<<<<<< HEAD
app.include_router(complaint_router)
app.include_router(report_router)
=======
app.include_router(noise_router, prefix="/noise")
app.include_router(report_router, prefix="/report")
app.include_router(agency_router, prefix="/agency")
app.include_router(chatbot_router, prefix="/chatbot")

>>>>>>> origin/backend

@app.on_event("startup")
async def startup():
    try:
        await db.command("ping")
        print("DB 연결 성공!")
    except Exception as e:
        print("DB 연결 실패:", e)

<<<<<<< HEAD
=======

>>>>>>> origin/backend
@app.get("/")
async def read_root():
    return {"message": "NoiseGuard 서버 켜짐!"}