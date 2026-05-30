from openai import OpenAI
from prompts.legal import search_legal
from prompts.system import SYSTEM_PROMPT
from prompts.templates import TEMPLATES
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# =============================================
# 대화 이력 관리
# =============================================
conversation_history = []
MAX_HISTORY = 10  # 최근 10개만 유지 (토큰 초과 방지)

def get_template_response(user_input):
    return TEMPLATES.get(user_input, None)

print("=" * 50)
print("NoiseGuard 층간소음 상담 챗봇")
print("층간소음 관련 무엇이든 물어보세요!")
print("종료하려면 '종료'를 입력하세요.")
print("=" * 50)
print()

while True:
    user_input = input("나: ")

    if user_input == "종료":
        print("상담을 종료합니다. 불편함이 해결되길 바랍니다.")
        break

    if not user_input.strip():
        continue

    # 템플릿 버튼 확인
    template_response = get_template_response(user_input)
    if template_response:
        print(f"\n챗봇: {template_response}\n")
        conversation_history.append({"role": "user", "content": user_input})
        conversation_history.append({"role": "assistant", "content": template_response})
        continue

    # =============================================
    # FAISS 검색 → 관련 법령 찾기
    # legal.py의 search_legal 함수 사용
    # =============================================
    legal_context = search_legal(user_input)

    # 시스템 프롬프트에 관련 법령 추가
    enhanced_prompt = SYSTEM_PROMPT + f"""

[관련 법령 - 아래 내용을 참고하여 답변할 것]
{legal_context}

[언어 규칙]
모든 답변은 반드시 한국어로만 작성할 것. 다른 언어 문자 절대 포함 금지.
"""

    # 대화 이력에 사용자 메시지 추가
    conversation_history.append({"role": "user", "content": user_input})

    # 대화 이력 최근 MAX_HISTORY개만 유지
    if len(conversation_history) > MAX_HISTORY:
        conversation_history = conversation_history[-MAX_HISTORY:]

    # =============================================
    # GPT API 호출
    # =============================================
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": enhanced_prompt},
                *conversation_history
            ]
        )
        assistant_message = response.choices[0].message.content
    except Exception as e:
        assistant_message = "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요."
        print(f"API 오류: {e}")

    conversation_history.append({"role": "assistant", "content": assistant_message})

    print(f"\n챗봇: {assistant_message}\n")