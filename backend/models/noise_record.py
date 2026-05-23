from pydantic import BaseModel
from typing import Optional


class NoiseRecordCreate(BaseModel):
    leq: float
    lmax: float
    noise_type: str
    primary_source: Optional[str] = None   # 주소음원 (예: 발소리, 가구끌기)
    secondary_source: Optional[str] = None  # 부소음원 (예: TV소리, 음악)