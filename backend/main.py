from fastapi import FastAPI
from database import db
from routes.auth import router as auth_router
from routes.noise import router as noise_router
from routes.report import router as report_router

app = FastAPI()

app.include_router(auth_router, prefix="/auth")
app.include_router(noise_router, prefix="/noise")
app.include_router(report_router, prefix="/report")


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