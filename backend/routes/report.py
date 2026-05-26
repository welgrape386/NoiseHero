from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import os

from database import noise_collection
from routes.auth import get_current_user

router = APIRouter()


@router.get("/pdf")
async def create_noise_report_pdf(
    current_user: dict = Depends(get_current_user)
):
    email = current_user.get("email")

    records = []
    cursor = noise_collection.find({"email": email}).sort("measured_at", -1)

    async for record in cursor:
        records.append(record)

    if not os.path.exists("reports"):
        os.makedirs("reports")

    filename = f"reports/noise_report_{email.replace('@', '_')}.pdf"

    pdf = canvas.Canvas(filename)
    pdf.setTitle("NoiseGuard 소음 민원서")

    # 한글 폰트
    font_path = os.path.join(os.path.dirname(__file__), "..", "fonts", "NANUMGOTHIC.TTF")
    pdfmetrics.registerFont(TTFont("NanumGothic", font_path))
    pdf.setFont("NanumGothic", 14)

    y = 800

    pdf.drawString(50, y, "NoiseGuard 소음 민원서 초안")
    y -= 40

    pdf.setFont("NanumGothic", 10)
    pdf.drawString(50, y, f"작성자 이메일: {email}")
    y -= 25
    pdf.drawString(50, y, f"생성일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    y -= 40

    pdf.setFont("NanumGothic", 12)
    pdf.drawString(50, y, "1. 소음 기록 요약")
    y -= 30

    pdf.setFont("NanumGothic", 10)

    if not records:
        pdf.drawString(50, y, "저장된 소음 기록이 없습니다.")
        y -= 25
    else:
        for idx, record in enumerate(records[:10], start=1):
            measured_at = record.get("measured_at", "")
            if hasattr(measured_at, "strftime"):
                measured_at = measured_at.strftime("%Y-%m-%d %H:%M:%S")

            line = (
                f"{idx}. {measured_at} / "
                f"{record.get('noise_type')} / "
                f"Leq {record.get('leq')}dB / "
                f"Lmax {record.get('lmax')}dB / "
                f"기준초과: {record.get('is_exceeded')}"
            )

            pdf.drawString(50, y, line)
            y -= 22

            if y < 80:
                pdf.showPage()
                pdf.setFont("NanumGothic", 10)
                y = 800

    y -= 25

    pdf.setFont("NanumGothic", 12)
    pdf.drawString(50, y, "2. 민원 내용 초안")
    y -= 30

    pdf.setFont("NanumGothic", 10)

    complaint_lines = [
        "위 소음 기록은 사용자가 NoiseGuard 서비스를 통해 측정한 자료입니다.",
        "반복적으로 발생한 소음으로 인해 생활에 불편을 겪고 있으며,",
        "관련 기준 초과 여부 확인 및 적절한 조치를 요청드립니다.",
        "본 문서는 참고용 초안이며, 실제 민원 제출 전 내용 확인이 필요합니다."
    ]

    for line in complaint_lines:
        pdf.drawString(50, y, line)
        y -= 22

    pdf.save()

    return FileResponse(
        path=filename,
        filename="noise_report.pdf",
        media_type="application/pdf"
    )