# 층간히어로 (NoiseHero) 🏠🔊

> 층간소음 기록부터 AI 민원서 생성, 신고기관별 PDF 제출서류 생성까지 지원하는 층간소음 대응 서비스

층간히어로는 반복적으로 발생하는 층간소음 문제를 사용자가 보다 체계적으로 기록하고, 필요한 신고·상담 절차에 활용할 수 있도록 돕는 서비스입니다.  
사용자는 소음 발생 기록을 저장하고, AI를 통해 민원서 초안을 생성하며, 이웃사이센터·분쟁조정위원회·공식 제출서류 양식에 맞는 PDF 문서를 생성할 수 있습니다.

단순히 소음을 기록하는 데서 끝나는 것이 아니라, 사용자가 실제 신고 및 상담 절차로 이어갈 수 있도록 **기록 → AI 민원서 생성 → PDF 제출서류 생성** 흐름을 구현했습니다.

---

## ✨ 주요 기능

- **회원가입·로그인**
  - 사용자 회원가입 및 로그인 기능
  - JWT 기반 인증 처리
  - 로그인 사용자 정보 조회 API 제공

- **층간소음 기록 관리**
  - 소음 발생 시간, 시간대, 소음 유형, 주요 소음원 기록
  - Leq, Lmax 등 측정값 기반 소음 기록 관리
  - 야간/주간 여부, 기준 초과 여부 등 신고에 필요한 정보 정리

- **AI 민원서 자동 생성**
  - 사용자의 소음 기록과 피해 내용을 기반으로 GPT가 민원서 초안 생성
  - 피해 요약, 현장진단 요청, 소음측정 요청, 재발 방지 요청 문구 자동 작성
  - OpenAI API는 환경변수 기반으로 관리

- **신고기관별 PDF 생성**
  - 사용자가 선택한 제출 목적에 따라 PDF 자동 생성
  - 이웃사이센터용 PDF
  - 관리사무소용(공식 제출서류) PDF

- **공식 제출서류 PDF**
  - 층간소음 방문상담 신청서
  - 층간소음 중재상담 보고서
  - 동의서
  - 층간소음 측정 신청서
  - 층간소음 발생일지

- **Swagger 기반 API 테스트**
  - FastAPI Swagger UI를 통해 API 요청/응답 테스트
  - PDF 생성 API 테스트 및 GitHub PR 반영

---

## 🛠 기술 스택

### 프론트엔드 (`/frontend`)

| 항목 | 사용 기술 |
|---|---|
| 프레임워크 | React Native / Expo |
| 언어 | JavaScript / TypeScript |
| API 통신 | Axios / Fetch |
| 화면 구성 | 신고서 생성, 소음 기록, PDF 생성 화면 |
| PDF 응답 처리 | Blob 다운로드 처리 |

> 프론트엔드 기술 스택은 실제 구현 내용에 맞게 수정될 수 있습니다.

### 백엔드 (`/backend`)

| 항목 | 사용 기술 |
|---|---|
| 프레임워크 | FastAPI |
| 언어 | Python |
| 인증 | JWT 기반 인증 |
| 데이터베이스 | MongoDB |
| AI 민원서 생성 | OpenAI GPT-4o-mini |
| PDF 생성 | ReportLab |
| 환경변수 관리 | python-dotenv |
| API 문서/테스트 | FastAPI Swagger UI |

---

## 📁 프로젝트 구조

```text
NoiseHero/
├── frontend/                     # 프론트엔드 앱
│   ├── src/                      # 화면 및 컴포넌트
│   ├── assets/                   # 이미지, 아이콘 등 정적 파일
│   └── package.json
│
└── backend/                      # FastAPI 백엔드 서버
    ├── main.py                   # FastAPI 앱 진입점 및 라우터 등록
    ├── database.py               # DB 연결 설정
    ├── chatbot.py                # 챗봇/AI 관련 로직
    ├── classifier.py             # 소음 분류 관련 로직
    │
    ├── models/                   # 데이터 모델
    │   ├── user.py               # 사용자 모델
    │   └── noise_record.py       # 소음 기록 모델
    │
    ├── prompts/                  # AI 프롬프트 및 법령 검색 자료
    │   ├── legal.py              # 법령 검색 관련 로직
    │   ├── system.py             # 시스템 프롬프트
    │   └── templates.py          # 프롬프트 템플릿
    │
    └── routes/                   # API 라우터
        ├── auth.py               # 회원가입, 로그인, JWT 인증
        ├── noise.py              # 소음 기록 관련 API
        ├── chatbot.py            # 챗봇 관련 API
        ├── complaint.py          # GPT 민원서 생성 API
        ├── agency.py             # 신고기관 안내 API
        └── report.py             # PDF 생성 API
  
