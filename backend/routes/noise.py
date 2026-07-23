from fastapi import APIRouter, Depends, UploadFile, File
from datetime import datetime
import shutil, os

from database import noise_collection, user_collection
from routes.auth import get_current_user
from models.noise_record import NoiseRecordCreate
from models.user import MicCalibrationCreate
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

    # 마이크 보정 기준값 반영: 보정을 했다면 (측정값 - 기준값)을 법적 기준과 비교하고,
    # 보정을 안 한 사용자는 raw 측정값을 그대로 사용한다.
    baseline_db = current_user.get("mic_baseline_db")
    calibrated_leq = round(noise.leq - baseline_db, 1) if baseline_db is not None else None
    calibrated_lmax = round(noise.lmax - baseline_db, 1) if baseline_db is not None else None

    eval_leq = calibrated_leq if calibrated_leq is not None else noise.leq
    eval_lmax = calibrated_lmax if calibrated_lmax is not None else noise.lmax

    leq_exceeded = eval_leq > leq_standard
    lmax_exceeded = (lmax_standard is not None) and (eval_lmax > lmax_standard)
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
        "device_baseline_db": baseline_db,
        "calibrated_leq": calibrated_leq,
        "calibrated_lmax": calibrated_lmax,
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

    baseline_db = current_user.get("mic_baseline_db")

    try:
        result = classify(temp_path, baseline_db=baseline_db)
    finally:
        os.remove(temp_path)

    return {"success": True, "data": result}


@router.get("/calibration")
async def get_calibration(current_user: dict = Depends(get_current_user)):
    baseline_db = current_user.get("mic_baseline_db")
    calibrated_at = current_user.get("mic_calibrated_at")

    return {
        "baseline_db": baseline_db,
        "calibrated_at": calibrated_at.isoformat() if calibrated_at else None,
        "status": "준비 완료" if baseline_db is not None else "보정 필요"
    }


@router.post("/calibration")
async def calibrate_microphone(
    payload: MicCalibrationCreate,
    current_user: dict = Depends(get_current_user)
):
    email = current_user.get("email")
    now = datetime.utcnow()

    await user_collection.update_one(
        {"email": email},
        {"$set": {
            "mic_baseline_db": payload.baseline_db,
            "mic_calibrated_at": now
        }}
    )

    return {
        "message": "마이크 보정 완료",
        "baseline_db": payload.baseline_db,
        "calibrated_at": now.isoformat(),
        "status": "준비 완료"
    }