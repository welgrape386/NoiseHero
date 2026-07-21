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