from pydantic import BaseModel
from typing import List, Optional


class NoiseRecordCreate(BaseModel):
    leq: float
    lmax: float
    noise_type: str
    primary_source: Optional[str] = None   # 주소음원 (예: 발소리, 가구끌기)
    secondary_source: Optional[List[str]] = None  # 부소음원 (0개~여러 개, 예: TV소리, 음악)