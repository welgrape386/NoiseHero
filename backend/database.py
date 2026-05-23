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

<<<<<<< HEAD
print("DB 연결 시도 중...")
=======
print("DB 연결 시도 중...")

agency_collection = db["agencies"]
>>>>>>> origin/backend
