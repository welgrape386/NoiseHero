from openai import OpenAI
from prompts.legal import search_legal
from prompts.system import SYSTEM_PROMPT
from prompts.templates import TEMPLATES

client = OpenAI(api_key="OPENAI_API_KEY")

# =============================================
# 대화 이력 관리
# =============================================
conversation_history = []

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
"""

    # 대화 이력에 사용자 메시지 추가
    conversation_history.append({"role": "user", "content": user_input})

    # GPT API 호출
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": enhanced_prompt},
            *conversation_history
        ]
    )

    assistant_message = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": assistant_message})

    print(f"\n챗봇: {assistant_message}\n")