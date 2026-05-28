<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os


router = APIRouter(prefix="/report", tags=["Report"])


# 한글 폰트 등록
def register_korean_font():
    font_path = "C:/Windows/Fonts/malgun.ttf"

    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("MalgunGothic", font_path))
        return "MalgunGothic"

    return "Helvetica"


FONT_NAME = register_korean_font()


class Applicant(BaseModel):
    nickname: str
    apartment_name: str
    dong: str
    ho: str
    floor: str
    management_phone: Optional[str] = None


class Target(BaseModel):
    location: str
    address: str


class Building(BaseModel):
    building_company: Optional[str] = None
    slab_thickness: Optional[str] = None
    structure: Optional[str] = None
    committee: Optional[str] = None
    management_office: Optional[str] = None


class NoiseRecord(BaseModel):
    measured_at: str
    time_zone: str
    noise_type: str
    primary_source: str
    secondary_source: Optional[str] = None
    leq: float
    lmax: float
    leq_standard: float
    lmax_standard: float
    leq_exceeded: float
    lmax_exceeded: float


class Conclusion(BaseModel):
    site_inspection: str
    noise_measurement: str
    prevention: str


class ReportRequest(BaseModel):
    title: str
    created_at: str
    applicant: Applicant
    target: Target
    building: Building
    noise_records: List[NoiseRecord]
    damage_summary: str
    conclusion: Conclusion
    disclaimer: str


def make_paragraph(text, style):
    return Paragraph(str(text).replace("\n", "<br/>"), style)


@router.post("/pdf")
def create_report_pdf(data: ReportRequest):
    try:
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "KoreanTitle",
            parent=styles["Title"],
            fontName=FONT_NAME,
            fontSize=18,
            leading=24,
            alignment=1,
            spaceAfter=20,
        )

        heading_style = ParagraphStyle(
            "KoreanHeading",
            parent=styles["Heading2"],
            fontName=FONT_NAME,
            fontSize=13,
            leading=18,
            spaceBefore=12,
            spaceAfter=8,
        )

        normal_style = ParagraphStyle(
            "KoreanNormal",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=10,
            leading=15,
        )

        small_style = ParagraphStyle(
            "KoreanSmall",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=8,
            leading=12,
            textColor=colors.grey,
        )

        elements = []

        # 제목
        elements.append(make_paragraph(data.title, title_style))
        elements.append(make_paragraph(f"작성일: {data.created_at}", normal_style))
        elements.append(Spacer(1, 12))

        # 신청인 정보
        elements.append(make_paragraph("1. 신청인 정보", heading_style))

        applicant_table = Table([
            ["닉네임", data.applicant.nickname],
            ["아파트명", data.applicant.apartment_name],
            ["동/호수", f"{data.applicant.dong}동 {data.applicant.ho}호"],
            ["층수", f"{data.applicant.floor}층"],
            ["관리사무소 연락처", data.applicant.management_phone or "-"],
        ], colWidths=[120, 350])

        applicant_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))

        elements.append(applicant_table)

        # 대상 세대
        elements.append(make_paragraph("2. 대상 세대", heading_style))

        target_table = Table([
            ["위치", data.target.location],
            ["주소", data.target.address],
        ], colWidths=[120, 350])

        target_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))

        elements.append(target_table)

        # 건물 정보
        elements.append(make_paragraph("3. 건물 정보", heading_style))

        building_table = Table([
            ["건설사", data.building.building_company or "-"],
            ["슬라브 두께", data.building.slab_thickness or "-"],
            ["구조", data.building.structure or "-"],
            ["층간소음위원회", data.building.committee or "-"],
            ["관리사무소", data.building.management_office or "-"],
        ], colWidths=[120, 350])

        building_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))

        elements.append(building_table)

        # 소음 측정 기록
        elements.append(make_paragraph("4. 소음 측정 기록", heading_style))

        noise_table_data = [[
            "측정일시", "시간대", "유형", "주소음원", "Leq", "Lmax", "초과값"
        ]]

        for record in data.noise_records:
            noise_table_data.append([
                record.measured_at,
                record.time_zone,
                record.noise_type,
                record.primary_source,
                f"{record.leq} dB",
                f"{record.lmax} dB",
                f"Leq +{record.leq_exceeded}, Lmax +{record.lmax_exceeded}",
            ])

        noise_table = Table(noise_table_data, colWidths=[95, 45, 60, 80, 55, 55, 110])

        noise_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        elements.append(noise_table)

        # 피해 요약
        elements.append(make_paragraph("5. 피해 요약", heading_style))
        elements.append(make_paragraph(data.damage_summary, normal_style))

        # 요청 사항
        elements.append(make_paragraph("6. 요청 사항", heading_style))
        elements.append(make_paragraph(f"① 현장 진단 요청: {data.conclusion.site_inspection}", normal_style))
        elements.append(Spacer(1, 6))
        elements.append(make_paragraph(f"② 소음 측정 요청: {data.conclusion.noise_measurement}", normal_style))
        elements.append(Spacer(1, 6))
        elements.append(make_paragraph(f"③ 재발 방지 요청: {data.conclusion.prevention}", normal_style))

        # 면책 문구
        elements.append(Spacer(1, 20))
        elements.append(make_paragraph(data.disclaimer, small_style))

        doc.build(elements)

        buffer.seek(0)

        filename = "noiseguard_report.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
=======
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
>>>>>>> origin/backend
