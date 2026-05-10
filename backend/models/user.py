from pydantic import BaseModel
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