from fastapi import APIRouter, Depends, UploadFile, File
from datetime import datetime
import shutil, os

from database import noise_collection
from routes.auth import get_current_user
from models.noise_record import NoiseRecordCreate
from classifier import classify

router = APIRouter()

# 법적 기준 정의
LEGAL_STANDARDS = {
    "직접충격": {
        "주간": {"leq": 39, "lmax": 57},
        "야간": {"leq": 34, "lmax": 52}
    },
    "공기전달": {
        "주간": {"leq": 45, "lmax": None},
        "야간": {"leq": 40, "lmax": None}
    }
}


@router.post("/measure")
async def create_noise_record(
    noise: NoiseRecordCreate,
    current_user: dict = Depends(get_current_user)
):
    email = current_user.get("email")
    now = datetime.utcnow()

    if now.hour >= 22 or now.hour < 6:
        time_zone = "야간"
    else:
        time_zone = "주간"

    standard = LEGAL_STANDARDS.get(noise.noise_type, LEGAL_STANDARDS["직접충격"])
    leq_standard = standard[time_zone]["leq"]
    lmax_standard = standard[time_zone]["lmax"]

    leq_exceeded = noise.leq > leq_standard
    lmax_exceeded = (lmax_standard is not None) and (noise.lmax > lmax_standard)
    is_exceeded = leq_exceeded or lmax_exceeded

    record = {
        "email": email,
        "leq": noise.leq,
        "lmax": noise.lmax,
        "noise_type": noise.noise_type,
        "primary_source": noise.primary_source,
        "secondary_source": noise.secondary_source,
        "time_zone": time_zone,
        "leq_standard": leq_standard,
        "lmax_standard": lmax_standard,
        "is_exceeded": is_exceeded,
        "measured_at": now
    }

    result = await noise_collection.insert_one(record)

    record["_id"] = str(result.inserted_id)
    record["measured_at"] = record["measured_at"].isoformat()

    return {
        "message": "측정 데이터 저장 성공",
        "record": record
    }


@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    email = current_user.get("email")

    records = []
    cursor = noise_collection.find({"email": email}).sort("measured_at", -1)

    async for record in cursor:
        record["_id"] = str(record["_id"])

        if "measured_at" in record and record["measured_at"] is not None:
            record["measured_at"] = record["measured_at"].isoformat()

        records.append(record)

    return {
        "history": records
    }


@router.post("/classify")
async def classify_noise(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = classify(temp_path)
    finally:
        os.remove(temp_path)

    return {"success": True, "data": result}