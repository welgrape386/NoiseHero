from openai import OpenAI
from prompts.legal import search_legal
import json

client = OpenAI(api_key="OPENAI_API_KEY")

# =============================================
# [백엔드 GET /auth/me 에서 가져오는 데이터]
# =============================================
user_info = {
    "email": "test@test.com",
    "nickname": "김나애",
    "apartment_name": "강남아파트",
    "dong": "101",
    "ho": "502",
    "floor": 5,
    "building_company": "현대건설",
    "slab_thickness": "210mm",
    "structure": "벽식",
    "committee": "없음",
    "management_office": "있음",
    "management_phone": "02-123-4567",
}

# =============================================
# [백엔드 GET /noise/history 에서 가져오는 데이터]
# =============================================
selected_records = [
    {
        "measured_at": "2026-05-05T22:30:00",
        "noise_type": "직접충격",
        "time_zone": "야간",
        "primary_source": "뛰거나 걷는소리",
        "secondary_source": "가구끄는소리",
        "leq": 52.3,
        "lmax": 68.1,
        "leq_standard": 34.0,
        "lmax_standard": 52.0,
        "is_exceeded": True,
    },
    {
        "measured_at": "2026-05-06T23:10:00",
        "noise_type": "직접충격",
        "time_zone": "야간",
        "primary_source": "뛰거나 걷는소리",
        "secondary_source": "없음",
        "leq": 55.1,
        "lmax": 70.3,
        "leq_standard": 34.0,
        "lmax_standard": 52.0,
        "is_exceeded": True,
    },
    {
        "measured_at": "2026-05-07T23:40:00",
        "noise_type": "직접충격",
        "time_zone": "야간",
        "primary_source": "뛰거나 걷는소리",
        "secondary_source": "가구끄는소리",
        "leq": 54.0,
        "lmax": 69.5,
        "leq_standard": 34.0,
        "lmax_standard": 52.0,
        "is_exceeded": True,
    },
]

# =============================================
# [Python 코드에서 자동 계산하는 값들]
# =============================================

# 피해 기간 자동 계산
first_date = selected_records[0]['measured_at'][:10]
last_date = selected_records[-1]['measured_at'][:10]
period = f"{first_date} ~ {last_date}"

# 피해 시간대 추출
time_list = [r['measured_at'][11:16] for r in selected_records]
time_range = f"{min(time_list)} ~ {max(time_list)}"

# 주야간 종류 추출
daynight_types = list(set([r['time_zone'] for r in selected_records]))
daynight_str = ", ".join(daynight_types)

# 이력 텍스트 변환
history_text = ""
for i, r in enumerate(selected_records, 1):
    history_text += f"""
{i}. 날짜/시간: {r['measured_at']} ({r['time_zone']})
   측정값: Leq {r['leq']}dB / Lmax {r['lmax']}dB
   법적기준: Leq {r['leq_standard']}dB / Lmax {r['lmax_standard']}dB
   초과여부: Leq {r['leq'] - r['leq_standard']:+.1f}dB / Lmax {r['lmax'] - r['lmax_standard']:+.1f}dB
   주소음원: {r['primary_source']} / 부소음원: {r['secondary_source']}
"""

# =============================================
# FAISS로 민원서 관련 법령 검색
# =============================================
legal_context = search_legal("층간소음 법적 기준 직접충격 야간 민원서")

# =============================================
# [GPT 프롬프트 설정]
# =============================================
DISCLAIMER = "※ 본 문서는 AI가 작성한 초안이며 최종 제출 책임은 신청인에게 있습니다."

system_prompt = f"""
당신은 층간소음 피해자를 위한 민원서 작성 전문가입니다.
이웃사이센터 제출용 층간소음 민원서를 JSON 형태로 작성합니다.

작성 규칙:
1. 반드시 아래 JSON 구조로만 응답할 것. 다른 텍스트 절대 포함 금지.
2. 모든 값은 사실 중심으로 작성, 감정적 표현 배제
3. 소음 이력이 여러 건인 경우 반복적·지속적 피해임을 강조
4. damage_summary는 반드시 100자 이내로 작성
5. conclusion의 각 항목은 2문장 이상 구체적으로 작성

응답 JSON 구조:
{{
  "title": "층간소음 피해 현장진단 신청서",
  "created_at": "마지막 측정일",
  "applicant": {{
    "nickname": "신청인 닉네임",
    "apartment_name": "아파트명",
    "dong": "동",
    "ho": "호수",
    "floor": "층수",
    "management_phone": "관리사무소 연락처"
  }},
  "target": {{
    "location": "상대세대 위치 (윗집/아랫집/옆집)",
    "address": "상대세대 주소"
  }},
  "building": {{
    "building_company": "건설사",
    "slab_thickness": "슬라브 두께",
    "structure": "건물 구조",
    "committee": "층간소음위원회 유무",
    "management_office": "관리사무소 유무"
  }},
  "noise_records": [
    {{
      "measured_at": "측정일시",
      "time_zone": "주간/야간",
      "noise_type": "직접충격/공기전달",
      "primary_source": "주소음원",
      "secondary_source": "부소음원",
      "leq": 0.0,
      "lmax": 0.0,
      "leq_standard": 0.0,
      "lmax_standard": 0.0,
      "leq_exceeded": 0.0,
      "lmax_exceeded": 0.0
    }}
  ],
  "damage_summary": "피해기간: OO, 피해시간: OO (100자 이내)",
  "conclusion": {{
    "site_inspection": "현장진단 요청 내용 (2문장 이상)",
    "noise_measurement": "소음 측정 요청 내용 (2문장 이상)",
    "prevention": "재발 방지 조치 요청 내용 (2문장 이상)"
  }},
  "disclaimer": "※ 본 문서는 AI가 작성한 초안이며 최종 제출 책임은 신청인에게 있습니다."
}}

[참고 법령]
{legal_context}
"""

user_prompt = f"""
아래 정보를 바탕으로 이웃사이센터 제출용 층간소음 현장진단 신청서를 JSON으로 작성해주세요.

[신청인 정보]
- 닉네임: {user_info['nickname']}
- 아파트명: {user_info['apartment_name']}
- 동: {user_info['dong']}
- 호수: {user_info['ho']}
- 층수: {user_info['floor']}
- 관리사무소 연락처: {user_info['management_phone']}

[상대세대 정보]
- 주거위치: 윗집
- 상세주소: 101동 602호

[건물 정보]
- 건설사: {user_info['building_company']}
- 슬라브 두께: {user_info['slab_thickness']}
- 구조: {user_info['structure']}
- 층간소음위원회: {user_info['committee']}
- 관리사무소: {user_info['management_office']}

[소음 측정 이력 - 총 {len(selected_records)}건 / 피해기간: {period}]
{history_text}

피해내용은 반드시 아래 형식으로 작성 (100자 이내):
"피해기간: 약 {len(selected_records)}일 ({first_date}~{last_date}), 피해시간: {daynight_str} {time_range}"
"""

# =============================================
# [GPT API 호출]
# =============================================
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
)

result = response.choices[0].message.content

# JSON 파싱
try:
    # 백틱 제거 후 파싱
    clean = result.replace("```json", "").replace("```", "").strip()
    report_json = json.loads(clean)
    print("===== 민원서 JSON (백엔드 전달용) =====")
    print(json.dumps(report_json, ensure_ascii=False, indent=2))
except Exception as e:
    print(f"JSON 파싱 실패: {e}")
    print("원본 출력:")
    print(result)