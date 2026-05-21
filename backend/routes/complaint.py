import os
import json
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

load_dotenv()

router = APIRouter(prefix="/complaint", tags=["Complaint"])

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("OPENAI_API_KEY가 .env에 없습니다.")

client = OpenAI(api_key=api_key)


class ComplaintGenerateRequest(BaseModel):
    db: float
    time: str
    main_noise_source: str
    sub_noise_source: str | None = None
    damage: str


@router.post("/generate")
def generate_complaint(request: ComplaintGenerateRequest):
    try:
        prompt = f"""
너는 층간소음 민원서 작성 도우미다.

아래 정보를 바탕으로 민원서 초안을 작성해라.

측정 소음: {request.db}dB
측정 시간: {request.time}
주소음원: {request.main_noise_source}
부소음원: {request.sub_noise_source}
피해 내용: {request.damage}

반드시 아래 JSON 형식으로만 응답해라.
설명 문장이나 마크다운은 쓰지 마라.

{{
  "title": "층간소음 피해 민원서",
  "receiver": "관리사무소 또는 층간소음 이웃사이센터",
  "summary": "민원 요약",
  "noise_details": "소음 측정 정보",
  "damage_statement": "피해 진술",
  "request_action": "요청 사항",
  "disclaimer": "본 문서는 사용자가 입력한 정보와 AI 분석 결과를 바탕으로 생성된 참고용 초안이며, 법적 효력을 보장하지 않습니다."
}}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "너는 한국어 층간소음 민원서 작성 전문가다. 항상 JSON 형식으로만 답한다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        content = response.choices[0].message.content

        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="GPT 응답을 JSON으로 변환하지 못했습니다."
            )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))