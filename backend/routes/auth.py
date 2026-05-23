import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
from dotenv import load_dotenv

from models.user import UserSignup, UserLogin, UserUpdate
from database import user_collection

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "test-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        token = credentials.credentials

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise HTTPException(
                status_code=401,
                detail="토큰 정보가 유효하지 않습니다."
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="토큰 검증에 실패했습니다."
        )

    user = await user_collection.find_one({"email": email})

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="사용자를 찾을 수 없습니다."
        )

    return user


@router.post("/signup")
async def signup(user: UserSignup):
    existing_user = await user_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="이미 사용 중인 이메일입니다."
        )

    hashed_password = hash_password(user.password)

    new_user = {
        "email": user.email,
        "hashed_password": hashed_password,
        "nickname": user.nickname,
        "apartment_name": user.apartment_name,
        "dong": user.dong,
        "ho": user.ho,
        "floor": user.floor,
        "created_at": datetime.now(timezone.utc)
    }

    await user_collection.insert_one(new_user)

    return {
        "message": "회원가입 성공",
        "email": user.email
    }


@router.post("/login")
async def login(user: UserLogin):
    db_user = await user_collection.find_one({"email": user.email})

    if db_user is None:
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )

    hashed_password = db_user.get("hashed_password")

    if not hashed_password:
        raise HTTPException(
            status_code=500,
            detail="저장된 비밀번호 정보가 올바르지 않습니다."
        )

    if not verify_password(user.password, hashed_password):
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )

    access_token = create_access_token(
        data={"sub": db_user["email"]}
    )

    return {
        "message": "로그인 성공",
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "토큰 검증 성공",
        "email": current_user.get("email"),
        "nickname": current_user.get("nickname"),
        "apartment_name": current_user.get("apartment_name"),
        "dong": current_user.get("dong"),
        "ho": current_user.get("ho"),
        "floor": current_user.get("floor"),
        "building_company": current_user.get("building_company"),
        "slab_thickness": current_user.get("slab_thickness"),
        "structure": current_user.get("structure"),
        "committee": current_user.get("committee"),
        "management_office": current_user.get("management_office"),
        "management_phone": current_user.get("management_phone")
    }

@router.patch("/me")
async def update_me(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    email = current_user.get("email")

    update_dict = update_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(
            status_code=400,
            detail="수정할 정보가 없습니다."
        )

    await user_collection.update_one(
        {"email": email},
        {"$set": update_dict}
    )

    return {
        "message": "정보 수정 성공",
        "updated_fields": update_dict
    }