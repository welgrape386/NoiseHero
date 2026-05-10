from pydantic import BaseModel


class NoiseRecordCreate(BaseModel):
    leq: float
    lmax: float
    noise_type: str