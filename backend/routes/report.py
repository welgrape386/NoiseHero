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