from openai import OpenAI
from prompts.legal import search_legal
from datetime import date
import json

from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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
# [통계 요약 자동 계산] ← 추가된 부분
# =============================================

total_count = len(selected_records)
exceeded_count = sum(1 for r in selected_records if r['is_exceeded'])
exceed_rate = round(exceeded_count / total_count * 100, 1)

avg_leq = round(sum(r['leq'] for r in selected_records) / total_count, 1)
avg_lmax = round(sum(r['lmax'] for r in selected_records) / total_count, 1)

max_leq_record = max(selected_records, key=lambda r: r['leq'])
max_lmax_record = max(selected_records, key=lambda r: r['lmax'])

# 주간/야간 횟수
daytime_count = sum(1 for r in selected_records if r['time_zone'] == '주간')
nighttime_count = sum(1 for r in selected_records if r['time_zone'] == '야간')

# 작성일 (오늘 날짜 자동 생성)
created_at = str(date.today())

stats_text = f"""
- 총 측정 횟수: {total_count}회
- 기준 초과 횟수: {exceeded_count}회 (초과율 {exceed_rate}%)
- 평균 Leq: {avg_leq}dB / 평균 Lmax: {avg_lmax}dB
- 최대 Leq: {max_leq_record['leq']}dB ({max_leq_record['measured_at']})
- 최대 Lmax: {max_lmax_record['lmax']}dB ({max_lmax_record['measured_at']})
- 주간 발생: {daytime_count}회 / 야간 발생: {nighttime_count}회
"""

# =============================================
# FAISS로 민원서 관련 법령 검색
# =============================================
legal_context = search_legal("층간소음 법적 기준 직접충격 야간 민원서")

# =============================================
# [GPT 프롬프트 설정]
# =============================================
DISCLAIMER = "※ 본 문서는 참고용이며 법적 효력을 보장하지 않습니다. 정확한 판단은 전문 기관에 문의하세요."

system_prompt = f"""
당신은 층간소음 피해자를 위한 민원서 작성 전문가입니다.
이웃사이센터 제출용 층간소음 민원서를 JSON 형태로 작성합니다.

작성 규칙:
1. 반드시 아래 JSON 구조로만 응답할 것. 다른 텍스트 절대 포함 금지.
2. 모든 값은 사실 중심으로 작성, 감정적 표현 배제
3. 소음 이력이 여러 건인 경우 반복적·지속적 피해임을 강조
4. damage_summary는 반드시 100자 이내로 작성
5. conclusion의 각 항목은 2문장 이상 구체적으로 작성
6. statistics는 전달받은 수치를 그대로 사용할 것. 임의로 수정 금지.
7. noise_records의 leq_exceeded, lmax_exceeded는 반드시 소수점 1자리로 작성
8. statistics의 숫자 필드(total_count, exceeded_count, exceed_rate, avg_leq, avg_lmax, max_leq, max_lmax, daytime_count, nighttime_count)는 단위 없이 숫자형으로만 작성
9. created_at은 전달받은 작성일을 그대로 사용할 것
10. conclusion 작성 규칙:
    - site_inspection: 피해 세대 동·호수를 명시하고 방문 진단을 구체적으로 요청할 것
    - noise_measurement: 주/야간 측정 모두 요청하고 전문 장비 사용을 명시할 것
    - prevention: 상대세대에 대한 경고 조치 및 재발 방지 방안을 구체적으로 요청할 것
11. 모든 텍스트는 반드시 한국어로만 작성할 것. 다른 언어 문자 절대 포함 금지.

응답 JSON 구조:
{{
  "title": "층간소음 피해 현장진단 신청서",
  "created_at": "작성일 (YYYY-MM-DD 형식)",
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
  "statistics": {{
    "total_count": 0,
    "exceeded_count": 0,
    "exceed_rate": 0.0,
    "avg_leq": 0.0,
    "avg_lmax": 0.0,
    "max_leq": 0.0,
    "max_leq_at": "최대 Leq 발생 일시",
    "max_lmax": 0.0,
    "max_lmax_at": "최대 Lmax 발생 일시",
    "daytime_count": 0,
    "nighttime_count": 0
  }},
  "damage_summary": "피해기간: OO, 피해시간: OO (100자 이내)",
  "conclusion": {{
    "site_inspection": "현장진단 요청 내용 (2문장 이상, 구체적으로)",
    "noise_measurement": "소음 측정 요청 내용 (2문장 이상, 구체적으로)",
    "prevention": "재발 방지 조치 요청 내용 (2문장 이상, 구체적으로)"
  }},
  "disclaimer": "※ 본 문서는 참고용이며 법적 효력을 보장하지 않습니다. 정확한 판단은 전문 기관에 문의하세요."
}}

[참고 법령]
{legal_context}
"""

user_prompt = f"""
아래 정보를 바탕으로 이웃사이센터 제출용 층간소음 현장진단 신청서를 JSON으로 작성해주세요.

[문서 기본 정보]
- 작성일: {created_at}

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
- 건물 구조: {user_info['structure']}
- 층간소음위원회: {user_info['committee']}
- 관리사무소: {user_info['management_office']}

[소음 측정 이력 - 총 {total_count}건 / 피해기간: {period}]
{history_text}

[통계 요약 - 아래 수치를 statistics 필드에 그대로 사용할 것]
{stats_text}

피해내용은 반드시 아래 형식으로 작성 (100자 이내):
"피해기간: 약 {total_count}일 ({first_date}~{last_date}), 피해시간: {daynight_str} {time_range}"

conclusion 작성 시 통계 수치(초과율 {exceed_rate}%, 평균 Leq {avg_leq}dB 등)를 구체적으로 언급할 것.
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
    clean = result.replace("```json", "").replace("```", "").strip()
    report_json = json.loads(clean)
    print("===== 민원서 JSON (백엔드 전달용) =====")
    print(json.dumps(report_json, ensure_ascii=False, indent=2))
except Exception as e:
    print(f"JSON 파싱 실패: {e}")
    print("원본 출력:")
    print(result)