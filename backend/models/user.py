from pydantic import BaseModel, Field
from typing import Optional


class UserSignup(BaseModel):
    email: str
    password: str
    nickname: Optional[str] = None
    apartment_name: Optional[str] = None
    dong: Optional[str] = None
    ho: Optional[str] = None
    floor: Optional[int] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    apartment_name: Optional[str] = None
    dong: Optional[str] = None
    ho: Optional[str] = None
    floor: Optional[int] = None

    building_company: Optional[str] = None
    slab_thickness: Optional[str] = None
    structure: Optional[str] = None
    committee: Optional[str] = None
    management_office: Optional[str] = None
    management_phone: Optional[str] = None


class MicCalibrationCreate(BaseModel):
    # 3초간 측정한 주변 소음의 평균 dB 값 (기기별 기준점, 법적 기준값 아님)
    baseline_db: float = Field(..., ge=0, le=120)