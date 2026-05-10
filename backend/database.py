from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URI)
db = client["noise_app"]

user_collection = db["users"]
noise_collection = db["noise_records"]
report_collection = db["reports"]

print("DB 연결 시도 중...")