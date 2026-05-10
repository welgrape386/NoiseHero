from openai import OpenAI
from prompts.system import SYSTEM_PROMPT
from prompts.templates import TEMPLATES

client = OpenAI(api_key="YOUR_API_KEY")

# =============================================
# [대화 이력 관리]
# GPT는 이전 대화를 기억 못하므로 직접 관리
# =============================================
conversation_history = []

def get_template_response(user_input):
    # 템플릿 버튼 클릭 시 해당 응답 반환
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

    # 템플릿 버튼 클릭 여부 확인
    template_response = get_template_response(user_input)
    if template_response:
        print(f"\n챗봇: {template_response}\n")
        # 템플릿 응답도 대화 이력에 추가
        conversation_history.append({
            "role": "user",
            "content": user_input
        })
        conversation_history.append({
            "role": "assistant",
            "content": template_response
        })
        continue

    # 일반 질문은 GPT 호출
    conversation_history.append({
        "role": "user",
        "content": user_input
    })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            *conversation_history
        ]
    )

    assistant_message = response.choices[0].message.content

    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    print(f"\n챗봇: {assistant_message}\n")