from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db
from routes.auth import router as auth_router
from routes.noise import router as noise_router
from routes.report import router as report_router
from routes.agency import router as agency_router
from routes.chatbot import router as chatbot_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://noise-on.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(noise_router, prefix="/noise")
app.include_router(report_router, prefix="/report")
app.include_router(agency_router, prefix="/agency")
app.include_router(chatbot_router, prefix="/chatbot")


@app.on_event("startup")
async def startup():
    try:
        await db.command("ping")
        print("DB 연결 성공!")
    except Exception as e:
        print("DB 연결 실패:", e)


@app.get("/")
async def read_root():
    return {"message": "NoiseGuard 서버 켜짐!"}