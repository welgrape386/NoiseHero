from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
from collections import Counter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os


router = APIRouter(prefix="/report", tags=["Report"])


# ============================================================
# 한글 폰트 등록
# ============================================================
def register_korean_font():
    font_path = "C:/Windows/Fonts/malgun.ttf"

    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont("MalgunGothic", font_path))
        return "MalgunGothic"

    return "Helvetica"


FONT_NAME = register_korean_font()


# ============================================================
# 요청 JSON 모델
# ============================================================
class Applicant(BaseModel):
    nickname: str
    apartment_name: str
    dong: str
    ho: str
    floor: str
    management_phone: Optional[str] = None


class Target(BaseModel):
    location: Optional[str] = None
    address: Optional[str] = None


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
    leq_standard: Optional[float] = None
    lmax_standard: Optional[float] = None
    leq_exceeded: Optional[float] = None
    lmax_exceeded: Optional[float] = None
    duration: Optional[str] = None
    audio_file: Optional[str] = None


class Conclusion(BaseModel):
    site_inspection: Optional[str] = None
    noise_measurement: Optional[str] = None
    prevention: Optional[str] = None


class ReportRequest(BaseModel):
    # neighbor_center: 이웃사이센터용
    # dispute_committee: 분쟁조정위원회용
    report_type: str = "neighbor_center"

    # 기존 프론트/AI 요청과의 호환을 위해 남겨둠
    title: Optional[str] = None

    created_at: str
    applicant: Applicant
    target: Target

    # 건물 정보는 PDF에서 출력하지 않지만,
    # 기존 프론트/AI 요청과의 호환을 위해 optional로 유지
    building: Optional[Building] = None

    noise_records: List[NoiseRecord]
    damage_summary: Optional[str] = None
    conclusion: Optional[Conclusion] = None
    disclaimer: Optional[str] = "※ 본 문서는 AI가 작성한 초안이며 최종 제출 책임은 신청인에게 있습니다."


# ============================================================
# 공통 유틸 함수
# ============================================================
def make_paragraph(text, style):
    safe_text = "-" if text is None else str(text)
    return Paragraph(safe_text.replace("\n", "<br/>"), style)


def format_db(value):
    if value is None:
        return "-"
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return "-"


def split_datetime(measured_at: str):
    if not measured_at:
        return "-", "-"

    text = str(measured_at)

    if "T" in text:
        date_part, time_part = text.split("T", 1)
    elif " " in text:
        date_part, time_part = text.split(" ", 1)
    else:
        return text, "-"

    return date_part, time_part[:5]


def get_report_config(report_type: str):
    """
    기관별 PDF 설정
    """
    if report_type == "neighbor_center":
        return {
            "title": "층간소음 피해 현장진단 신청서",
            "receiver": "층간소음 이웃사이센터",
            "filename": "neighbor_center_report.pdf",
            "request_lines": [
                "반복적으로 발생하는 층간소음으로 인한 생활 불편이 지속되고 있어, 층간소음 이웃사이센터의 상담 및 현장진단 절차 안내를 요청합니다.",
                "필요 시 소음 측정 및 당사자 간 갈등 완화를 위한 중재 지원을 요청합니다.",
                "저장된 소음 기록과 피해 내용을 바탕으로 현장 진단 또는 상담 절차 진행을 검토해주시기 바랍니다.",
            ],
        }

    if report_type == "dispute_committee":
        return {
            "title": "층간소음 분쟁조정 신청서",
            "receiver": "공동주택관리 분쟁조정위원회",
            "filename": "dispute_committee_report.pdf",
            "request_lines": [
                "반복적인 층간소음으로 인해 생활상 피해가 지속되고 있어, 제출된 소음 기록과 피해 내용을 바탕으로 분쟁 조정 절차 진행을 요청합니다.",
                "당사자 간 원만한 해결을 위한 조정 및 필요한 후속 조치를 검토해주시기 바랍니다.",
                "소음 발생 정황, 반복 시간대, 주요 소음원 및 사용자 피해 내용을 종합적으로 고려해주시기 바랍니다.",
            ],
        }

    raise HTTPException(
        status_code=400,
        detail="지원하지 않는 PDF 유형입니다. report_type은 neighbor_center 또는 dispute_committee만 가능합니다."
    )


def summarize_noise_records(records: List[NoiseRecord]):
    """
    선택된 소음 기록을 기반으로 반복성·야간 발생·주요 소음원을 자동 요약
    """
    if not records:
        return "선택된 소음 기록이 없습니다."

    total_count = len(records)
    night_count = sum(1 for r in records if r.time_zone == "야간")

    noise_type_counter = Counter()
    source_counter = Counter()
    hour_counter = Counter()
    date_list = []

    for record in records:
        if record.noise_type:
            noise_type_counter[record.noise_type] += 1

        if record.primary_source:
            source_counter[record.primary_source] += 1

        if record.secondary_source:
            source_counter[record.secondary_source] += 1

        date_part, time_part = split_datetime(record.measured_at)

        if date_part != "-":
            date_list.append(date_part)

        if time_part != "-" and ":" in time_part:
            hour = time_part.split(":")[0]
            hour_counter[f"{hour}시대"] += 1

    main_noise_type = noise_type_counter.most_common(1)[0][0] if noise_type_counter else "-"
    main_sources = ", ".join([item[0] for item in source_counter.most_common(3)]) if source_counter else "-"
    repeated_time = hour_counter.most_common(1)[0][0] if hour_counter else "-"

    if date_list:
        start_date = min(date_list)
        end_date = max(date_list)
        if start_date == end_date:
            period_text = start_date
        else:
            period_text = f"{start_date}부터 {end_date}까지"
    else:
        period_text = "-"

    return (
        f"선택된 소음 기록 기준으로 총 {total_count}회의 소음 기록이 확인되었습니다. "
        f"이 중 {night_count}회는 야간 시간대에 발생하였으며, "
        f"주요 소음 유형은 {main_noise_type}으로 기록되었습니다. "
        f"반복적으로 감지된 주요 소음원은 {main_sources}입니다. "
        f"주요 반복 발생 시간대는 {repeated_time}이며, 피해 기록 기간은 {period_text}입니다."
    )


# ============================================================
# PDF 생성 API
# ============================================================
@router.post("/pdf")
def create_report_pdf(data: ReportRequest):
    try:
        config = get_report_config(data.report_type)

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

        common_table_style = TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ])

        elements = []

        # ====================================================
        # 제목 및 제출 대상
        # ====================================================
        elements.append(make_paragraph(config["title"], title_style))
        elements.append(make_paragraph(f"제출 대상: {config['receiver']}", normal_style))
        elements.append(make_paragraph(f"작성일: {data.created_at}", normal_style))
        elements.append(Spacer(1, 12))

        # ====================================================
        # 1. 신청인 정보
        # ====================================================
        elements.append(make_paragraph("1. 신청인 정보", heading_style))

        applicant_table = Table([
            ["닉네임", data.applicant.nickname],
            ["아파트명", data.applicant.apartment_name],
            ["동/호수", f"{data.applicant.dong}동 {data.applicant.ho}호"],
            ["층수", f"{data.applicant.floor}층"],
            ["관리사무소 연락처", data.applicant.management_phone or "-"],
        ], colWidths=[120, 350])

        applicant_table.setStyle(common_table_style)
        elements.append(applicant_table)

        # ====================================================
        # 2. 소음 발생 추정 위치
        # ====================================================
        elements.append(make_paragraph("2. 소음 발생 추정 위치", heading_style))

        target_location = data.target.location or "위치 불명"

        target_table = Table([
            ["소음 발생 추정 위치", target_location],
            ["상세 위치/주소", data.target.address or "-"],
        ], colWidths=[120, 350])

        target_table.setStyle(common_table_style)
        elements.append(target_table)

        # ====================================================
        # 3. 소음 측정 기록
        # ====================================================
        elements.append(make_paragraph("3. 소음 측정 기록", heading_style))

        noise_table_data = [[
            "발생일자", "발생시간", "소음 종류", "지속시간(추정)", "Leq/Lmax"
        ]]

        for record in data.noise_records:
            date_part, time_part = split_datetime(record.measured_at)

            noise_name = record.noise_type or "-"

            if record.primary_source:
                noise_name = f"{record.noise_type} / {record.primary_source}"

            if record.secondary_source:
                noise_name += f", {record.secondary_source}"

            duration_text = record.duration or "약 1분"

            noise_table_data.append([
                date_part,
                time_part,
                noise_name,
                duration_text,
                f"{format_db(record.leq)} / {format_db(record.lmax)} dB",
            ])

        noise_table = Table(
            noise_table_data,
            colWidths=[80, 55, 180, 75, 80]
        )

        noise_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        elements.append(noise_table)

        # ====================================================
        # 4. 반복 소음 패턴 및 피해 요약
        # ====================================================
        elements.append(make_paragraph("4. 반복 소음 패턴 및 피해 요약", heading_style))

        auto_summary = summarize_noise_records(data.noise_records)

        if data.damage_summary:
            damage_text = f"{auto_summary}<br/><br/>사용자 피해 내용: {data.damage_summary}"
        else:
            damage_text = auto_summary

        elements.append(make_paragraph(damage_text, normal_style))

        # ====================================================
        # 5. 요청 사항
        # ====================================================
        elements.append(make_paragraph("5. 요청 사항", heading_style))

        for idx, line in enumerate(config["request_lines"], start=1):
            elements.append(make_paragraph(f"{idx}. {line}", normal_style))
            elements.append(Spacer(1, 6))

        if data.conclusion:
            elements.append(Spacer(1, 4))
            elements.append(make_paragraph("추가 요청 내용", heading_style))

            if data.conclusion.site_inspection:
                elements.append(make_paragraph(f"① 현장 진단 요청: {data.conclusion.site_inspection}", normal_style))
                elements.append(Spacer(1, 6))

            if data.conclusion.noise_measurement:
                elements.append(make_paragraph(f"② 소음 측정 요청: {data.conclusion.noise_measurement}", normal_style))
                elements.append(Spacer(1, 6))

            if data.conclusion.prevention:
                elements.append(make_paragraph(f"③ 재발 방지 요청: {data.conclusion.prevention}", normal_style))
                elements.append(Spacer(1, 6))

        # ====================================================
        # 6. 첨부 자료
        # ====================================================
        elements.append(make_paragraph("6. 첨부 자료", heading_style))

        audio_count = sum(1 for record in data.noise_records if record.audio_file)

        if audio_count > 0:
            elements.append(make_paragraph(f"측정 당시 녹음본 {audio_count}건이 첨부 자료로 기록되어 있습니다.", normal_style))
        else:
            elements.append(make_paragraph("별도 녹음본 첨부 정보는 없습니다.", normal_style))

        # ====================================================
        # 면책 문구
        # ====================================================
        elements.append(Spacer(1, 20))
        elements.append(make_paragraph(data.disclaimer, small_style))

        doc.build(elements)

        buffer.seek(0)

        filename = config["filename"]

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))