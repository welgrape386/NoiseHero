from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from routes.auth import get_current_user
from chatbot import get_template_response, search_legal, SYSTEM_PROMPT
from openai import OpenAI
import os

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Message]] = []

@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    user_input = request.message

    # 템플릿 확인
    template_response = get_template_response(user_input)
    if template_response:
        return {
            "success": True,
            "data": {
                "message": template_response,
                "is_template": True
            }
        }

    # FAISS 검색
    legal_context = search_legal(user_input)
    enhanced_prompt = SYSTEM_PROMPT + f"\n[관련 법령]\n{legal_context}"

    # 대화 이력 변환
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]
    history.append({"role": "user", "content": user_input})

    # GPT 호출
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": enhanced_prompt},
            *history
        ]
    )

    answer = response.choices[0].message.content

    return {
        "success": True,
        "data": {
            "message": answer,
            "is_template": False
        }
    }