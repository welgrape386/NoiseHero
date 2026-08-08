from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
from collections import Counter

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
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
    # neighbor_center: 이웃사이센터용 PDF
    # dispute_committee: 분쟁조정위원회용 PDF
    # management_office: 관리사무소용 PDF
    # official_required_forms: 공식 제출서류 PDF
    report_type: str = "neighbor_center"

    title: Optional[str] = None

    created_at: str
    applicant: Applicant
    target: Target
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


def make_blank_paragraph(text, style):
    safe_text = "" if text is None else str(text)
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


def get_noise_name(record: NoiseRecord):
    noise_name = record.noise_type or "-"

    if record.primary_source:
        noise_name = f"{record.noise_type} / {record.primary_source}"

    if record.secondary_source:
        noise_name += f", {record.secondary_source}"

    return noise_name


def get_first_noise_record(data: ReportRequest):
    if data.noise_records:
        return data.noise_records[0]
    return None


def get_applicant_unit(data: ReportRequest):
    return f"{data.applicant.dong}동 {data.applicant.ho}호"


def get_target_address(data: ReportRequest):
    return data.target.address or ""


def get_noise_period(records: List[NoiseRecord]):
    date_list = []

    for record in records:
        date_part, _ = split_datetime(record.measured_at)
        if date_part != "-":
            date_list.append(date_part)

    if not date_list:
        return ""

    start_date = min(date_list)
    end_date = max(date_list)

    if start_date == end_date:
        return start_date

    return f"{start_date} ~ {end_date}"


def get_main_noise_summary(records: List[NoiseRecord]):
    if not records:
        return ""

    noise_type_counter = Counter()
    source_counter = Counter()

    for record in records:
        if record.noise_type:
            noise_type_counter[record.noise_type] += 1
        if record.primary_source:
            source_counter[record.primary_source] += 1
        if record.secondary_source:
            source_counter[record.secondary_source] += 1

    main_noise_type = noise_type_counter.most_common(1)[0][0] if noise_type_counter else ""
    main_sources = ", ".join([item[0] for item in source_counter.most_common(3)]) if source_counter else ""

    if main_noise_type and main_sources:
        return f"{main_noise_type} / {main_sources}"

    if main_noise_type:
        return main_noise_type

    return main_sources


def summarize_noise_records(records: List[NoiseRecord]):
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
# PDF 종류별 설정
# ============================================================
def get_report_config(report_type: str):
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

    if report_type == "management_office":
        return {
            "title": "층간소음 방문상담 신청서",
            "receiver": "관리사무소",
            "filename": "management_office_visit_application.pdf",
            "request_lines": [
                "반복적으로 발생하는 층간소음으로 인한 생활 불편이 지속되고 있어, 관리사무소 차원의 사실 확인 및 중재를 요청합니다.",
                "필요 시 관리사무소 입회 하에 소음 측정과 상대 세대에 대한 안내·경고 조치를 요청합니다.",
                "저장된 소음 기록과 피해 내용을 바탕으로 공동주택관리규약에 따른 조치를 검토해주시기 바랍니다.",
            ],
        }

    if report_type == "official_required_forms":
        return {
            "title": "방문상담 및 소음측정 신청서 등",
            "receiver": "층간소음 이웃사이센터",
            "filename": "official_required_forms.pdf",
            "request_lines": [],
        }

    raise HTTPException(
        status_code=400,
        detail="지원하지 않는 PDF 유형입니다. report_type은 neighbor_center, dispute_committee, management_office, official_required_forms만 가능합니다."
    )


# ============================================================
# 기존 이웃사이센터 / 분쟁조정위원회 PDF 생성
# ============================================================
def create_general_report_pdf(data: ReportRequest, config: dict):
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

    elements.append(make_paragraph(config["title"], title_style))
    elements.append(make_paragraph(f"제출 대상: {config['receiver']}", normal_style))
    elements.append(make_paragraph(f"작성일: {data.created_at}", normal_style))
    elements.append(Spacer(1, 12))

    elements.append(make_paragraph("1. 신청인 정보", heading_style))

    applicant_table = Table([
        ["닉네임", data.applicant.nickname],
        ["아파트명", data.applicant.apartment_name],
        ["동/호수", get_applicant_unit(data)],
        ["층수", f"{data.applicant.floor}층"],
        ["관리사무소 연락처", data.applicant.management_phone or "-"],
    ], colWidths=[120, 350])

    applicant_table.setStyle(common_table_style)
    elements.append(applicant_table)

    elements.append(make_paragraph("2. 소음 발생 추정 위치", heading_style))

    target_location = data.target.location or "위치 불명"

    target_table = Table([
        ["소음 발생 추정 위치", target_location],
        ["상세 위치/주소", data.target.address or "-"],
    ], colWidths=[120, 350])

    target_table.setStyle(common_table_style)
    elements.append(target_table)

    elements.append(make_paragraph("3. 소음 측정 기록", heading_style))

    noise_table_data = [[
        "발생일자", "발생시간", "소음 종류", "지속시간(추정)", "Leq/Lmax"
    ]]

    for record in data.noise_records:
        date_part, time_part = split_datetime(record.measured_at)

        noise_table_data.append([
            date_part,
            time_part,
            get_noise_name(record),
            record.duration or "약 1분",
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

    elements.append(make_paragraph("4. 반복 소음 패턴 및 피해 요약", heading_style))

    auto_summary = summarize_noise_records(data.noise_records)

    if data.damage_summary:
        damage_text = f"{auto_summary}<br/><br/>사용자 피해 내용: {data.damage_summary}"
    else:
        damage_text = auto_summary

    elements.append(make_paragraph(damage_text, normal_style))

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

    elements.append(make_paragraph("6. 첨부 자료", heading_style))

    audio_count = sum(1 for record in data.noise_records if record.audio_file)

    if audio_count > 0:
        elements.append(make_paragraph(f"측정 당시 녹음본 {audio_count}건이 첨부 자료로 기록되어 있습니다.", normal_style))
    else:
        elements.append(make_paragraph("별도 녹음본 첨부 정보는 없습니다.", normal_style))

    elements.append(Spacer(1, 20))
    elements.append(make_paragraph(data.disclaimer, small_style))

    doc.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={config['filename']}"
        }
    )


# ============================================================
# 공식 제출서류 양식용 스타일
# ============================================================
def get_form_styles():
    styles = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "FormTitle",
            parent=styles["Title"],
            fontName=FONT_NAME,
            fontSize=14,
            leading=18,
            alignment=1,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "FormSubtitle",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=8,
            leading=11,
            alignment=1,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "FormSection",
            parent=styles["Heading2"],
            fontName=FONT_NAME,
            fontSize=10,
            leading=13,
            spaceBefore=5,
            spaceAfter=5,
        ),
        "normal": ParagraphStyle(
            "FormNormal",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=8.0,
            leading=11.2,
        ),
        "small": ParagraphStyle(
            "FormSmall",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=7.8,
            leading=10.5,
        ),
        "center": ParagraphStyle(
            "FormCenter",
            parent=styles["Normal"],
            fontName=FONT_NAME,
            fontSize=8.0,
            leading=11.2,
            alignment=1,
        ),
    }


def form_cell(text, styles, style_name="normal"):
    return make_blank_paragraph(text, styles[style_name])


def official_table(rows, col_widths, styles, header_rows=0, row_heights=None):
    converted_rows = []

    for row in rows:
        converted_row = []
        for cell in row:
            if isinstance(cell, Paragraph) or isinstance(cell, Table):
                converted_row.append(cell)
            else:
                converted_row.append(form_cell(cell, styles))
        converted_rows.append(converted_row)

    table = Table(
        converted_rows,
        colWidths=col_widths,
        rowHeights=row_heights,
    )

    style_commands = [
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]

    if header_rows > 0:
        style_commands.append(("BACKGROUND", (0, 0), (-1, header_rows - 1), colors.Color(0.82, 0.82, 0.82)))

    if len(col_widths) == 2:
        style_commands.append(("BACKGROUND", (0, 0), (0, -1), colors.Color(0.9, 0.9, 0.9)))

    table.setStyle(TableStyle(style_commands))
    return table


def signature_text(label):
    return f"{label}: ______________________________"


# ============================================================
# 공식 제출서류 1페이지
# [별지 제1호서식] 층간소음 방문상담 신청서
# ============================================================
def add_official_page_1_visit_application(elements, data: ReportRequest, styles: dict):
    apartment_name = data.applicant.apartment_name or ""

    management_name = ""
    if data.building and data.building.management_office:
        management_name = data.building.management_office

    management_phone = data.applicant.management_phone or ""

    applicant_address = get_applicant_unit(data)
    target_address = get_target_address(data)
    noise_type = get_main_noise_summary(data.noise_records)

    noise_period = get_noise_period(data.noise_records)
    if data.damage_summary:
        if noise_period:
            damage_text = f"{noise_period}<br/>{data.damage_summary}"
        else:
            damage_text = data.damage_summary
    else:
        damage_text = noise_period

    # PDF Paragraph에서 일반 공백은 줄어들 수 있어서 &nbsp; 사용
    date_text = (
        "년"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        "월"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        "일"
    )

    elements.append(form_cell("[별지 제1호서식]", styles, "small"))
    elements.append(Spacer(1, 4))

    table_data = [
        [form_cell("층간소음 방문상담 신청서", styles, "center"), "", "", "", "", "", ""],

        # 신청인
        [
            form_cell("신<br/>청<br/>인", styles, "center"),
            form_cell("①공동주택명", styles, "center"),
            form_cell(apartment_name, styles),
            "", "", "", ""
        ],
        [
            "",
            form_cell("②관리주체명", styles, "center"),
            form_cell(management_name, styles),
            form_cell("③대표자<br/>성명", styles, "center"),
            form_cell("", styles),
            form_cell("④직위", styles, "center"),
            form_cell("", styles)
        ],
        [
            "",
            form_cell("⑤연락처", styles, "center"),
            form_cell(management_phone, styles),
            form_cell("⑥전자우편(E-mail)", styles, "center"),
            form_cell("", styles),
            "", ""
        ],

        # 세대정보
        [
            form_cell("세<br/>대<br/>정<br/>보", styles, "center"),
            form_cell("⑦신청세대", styles, "center"),
            form_cell("성명", styles, "center"),
            form_cell("", styles),
            form_cell("연락처", styles, "center"),
            form_cell("", styles),
            ""
        ],
        [
            "",
            "",
            form_cell("주소", styles, "center"),
            form_cell(applicant_address, styles),
            "", "", ""
        ],
        [
            "",
            form_cell("⑧상대세대", styles, "center"),
            form_cell("성명", styles, "center"),
            form_cell("", styles),
            form_cell("연락처", styles, "center"),
            form_cell("", styles),
            ""
        ],
        [
            "",
            "",
            form_cell("주소", styles, "center"),
            form_cell(target_address, styles),
            "", "", ""
        ],

        # 민원현황
        [
            form_cell("민<br/>원<br/>현<br/>황", styles, "center"),
            form_cell("⑨소음유형", styles, "center"),
            form_cell(noise_type, styles),
            "", "", "", ""
        ],
        [
            "",
            form_cell("⑩피해기간 및 내용", styles, "center"),
            form_cell(damage_text, styles),
            "", "", "", ""
        ],

        # 신청 문구
        [
            form_cell(
                "「층간소음 피해사례 조사·상담 등의 절차 및 방법에 관한 규정」 제6조제4항에 따라 "
                "층간소음 방문상담을 신청합니다.",
                styles,
                "normal"
            ),
            "", "", "", "", "", ""
        ],

        # 날짜: 칸 나누지 않고 한 줄 전체 병합
        [
            form_cell(date_text, styles, "center"),
            "", "", "", "", "", ""
        ],

        # 서명란
        [
            form_cell("관리주체", styles, "center"),
            "", "", "", "",
            form_cell("(서명 또는 인)", styles, "center"),
            ""
        ],
        [
            form_cell("신청세대", styles, "center"),
            "", "", "", "",
            form_cell("(서명 또는 인)", styles, "center"),
            ""
        ],
        [
            form_cell("상대세대", styles, "center"),
            "", "", "", "",
            form_cell("(서명 또는 인)", styles, "center"),
            ""
        ],

        # 수신처
        [
            form_cell("층간소음 전문기관의 장 귀하", styles, "center"),
            "", "", "", "", "", ""
        ],

        # 구비서류
        [
            form_cell(
                "[구비서류]<br/>"
                "1. 층간소음 중재상담 보고서 1부.<br/>"
                "2. 사실자동 녹음자료 1부.",
                styles,
                "normal"
            ),
            "", "", "", "", "", ""
        ],

        # 비고
        [
            form_cell(
                "비고 : ‘층간소음 중재상담 보고서’는 붙임 서식을 사용할 수 있습니다.",
                styles,
                "normal"
            ),
            "", "", "", "", "", ""
        ],
    ]

    form_table = Table(
        table_data,
        colWidths=[54, 80, 56, 78, 56, 76, 75],
        rowHeights=[
            26,
            24, 24, 24,
            24, 24, 24, 24,
            30, 58,
            58,
            32,
            20, 20, 20,
            28,
            42,
            20,
        ],
    )

    form_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 8),

        # 제목
        ("SPAN", (0, 0), (-1, 0)),

        # 신청인 영역
        ("SPAN", (0, 1), (0, 3)),
        ("SPAN", (2, 1), (6, 1)),
        ("SPAN", (4, 3), (6, 3)),

        # 세대정보 영역
        ("SPAN", (0, 4), (0, 7)),
        ("SPAN", (1, 4), (1, 5)),
        ("SPAN", (1, 6), (1, 7)),
        ("SPAN", (5, 4), (6, 4)),
        ("SPAN", (3, 5), (6, 5)),
        ("SPAN", (5, 6), (6, 6)),
        ("SPAN", (3, 7), (6, 7)),

        # 민원현황 영역
        ("SPAN", (0, 8), (0, 9)),
        ("SPAN", (2, 8), (6, 8)),
        ("SPAN", (2, 9), (6, 9)),

        # 신청 문구
        ("SPAN", (0, 10), (6, 10)),

        # 날짜: 전체 한 칸으로 병합
        ("SPAN", (0, 11), (6, 11)),

        # 서명란
        ("SPAN", (1, 12), (4, 12)),
        ("SPAN", (5, 12), (6, 12)),

        ("SPAN", (1, 13), (4, 13)),
        ("SPAN", (5, 13), (6, 13)),

        ("SPAN", (1, 14), (4, 14)),
        ("SPAN", (5, 14), (6, 14)),

        # 수신처 / 구비서류 / 비고
        ("SPAN", (0, 15), (6, 15)),
        ("SPAN", (0, 16), (6, 16)),
        ("SPAN", (0, 17), (6, 17)),

        # 정렬
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (2, 1), (6, 1), "LEFT"),
        ("ALIGN", (2, 8), (6, 9), "LEFT"),
        ("ALIGN", (0, 10), (6, 10), "LEFT"),
        ("ALIGN", (0, 11), (6, 11), "CENTER"),
        ("ALIGN", (0, 15), (6, 15), "RIGHT"),
        ("ALIGN", (0, 16), (6, 17), "LEFT"),
    ]))

    elements.append(form_table)


# ============================================================
# 공식 제출서류 2페이지
# [붙 임] 층간소음 중재상담 보고서
# ============================================================
def add_official_page_2_mediation_report_blank(elements, data: ReportRequest, styles: dict):
    applicant_unit = get_applicant_unit(data)
    target_address = get_target_address(data)

    noise_type = get_main_noise_summary(data.noise_records)
    noise_period = get_noise_period(data.noise_records)
    damage_text = data.damage_summary or ""

    elements.append(form_cell("[붙 임]", styles, "small"))
    elements.append(Spacer(1, 4))

    table_data = [
        [form_cell("층간소음 중재상담 보고서", styles, "center"), "", "", "", "", "", "", ""],

        [form_cell("①기본정보", styles, "center"), form_cell("중재주체", styles, "center"), form_cell("[  ] 관리주체   [  ] 층간소음 관리위원회   [  ] 기타", styles), "", "", "", "", ""],
        ["", form_cell("중재상담자", styles, "center"), form_cell("", styles), "", form_cell("연 락 처", styles, "center"), form_cell("", styles), "", ""],
        ["", form_cell("중재요청일", styles, "center"), form_cell("", styles), "", form_cell("중재일자", styles, "center"), form_cell("", styles), "", ""],

        [form_cell("②세대정보", styles, "center"), form_cell("신청세대<br/>성명", styles, "center"), form_cell("", styles), "", form_cell("거주위치", styles, "center"), form_cell(applicant_unit, styles), "", ""],
        ["", form_cell("상대세대<br/>성명", styles, "center"), form_cell("", styles), "", form_cell("거주위치", styles, "center"), form_cell(target_address, styles), "", ""],

        [form_cell("③민원현황", styles, "center"), form_cell("소음유형", styles, "center"), form_cell(noise_type, styles), "", "", "", "", ""],
        ["", form_cell("피해기간", styles, "center"), form_cell(noise_period, styles), "", "", "", "", ""],
        ["", form_cell("피해내용", styles, "center"), form_cell(damage_text, styles), "", "", "", "", ""],
        ["", form_cell("요구사항", styles, "center"), form_cell("", styles), "", "", "", "", ""],

        [form_cell("④생활형태", styles, "center"), form_cell("신청세대", styles, "center"), form_cell("", styles), "", "", "", "", ""],
        ["", form_cell("상대세대", styles, "center"), form_cell("", styles), "", "", "", "", ""],

        [form_cell("⑤중재내용", styles, "center"), form_cell("", styles), "", "", "", "", "", ""],
    ]

    mediation_table = Table(
        table_data,
        colWidths=[65, 65, 55, 55, 55, 55, 55, 70],
        rowHeights=[28, 26, 26, 26, 28, 28, 28, 28, 42, 28, 30, 30, 250],
    )

    mediation_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 8),

        ("SPAN", (0, 0), (-1, 0)),

        ("SPAN", (0, 1), (0, 3)),
        ("SPAN", (2, 1), (7, 1)),
        ("SPAN", (2, 2), (3, 2)),
        ("SPAN", (5, 2), (7, 2)),
        ("SPAN", (2, 3), (3, 3)),
        ("SPAN", (5, 3), (7, 3)),

        ("SPAN", (0, 4), (0, 5)),
        ("SPAN", (2, 4), (3, 4)),
        ("SPAN", (5, 4), (7, 4)),
        ("SPAN", (2, 5), (3, 5)),
        ("SPAN", (5, 5), (7, 5)),

        ("SPAN", (0, 6), (0, 9)),
        ("SPAN", (2, 6), (7, 6)),
        ("SPAN", (2, 7), (7, 7)),
        ("SPAN", (2, 8), (7, 8)),
        ("SPAN", (2, 9), (7, 9)),

        ("SPAN", (0, 10), (0, 11)),
        ("SPAN", (2, 10), (7, 10)),
        ("SPAN", (2, 11), (7, 11)),

        ("SPAN", (1, 12), (7, 12)),

        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (2, 1), (7, 12), "LEFT"),
        ("VALIGN", (1, 12), (7, 12), "TOP"),
        ("VALIGN", (2, 8), (7, 9), "TOP"),
    ]))

    elements.append(mediation_table)


# ============================================================
# 공식 제출서류 3페이지
# [붙 임] 동의서
# ============================================================
def add_official_page_3_agreement_blank(elements, data: ReportRequest, styles: dict):
    elements.append(form_cell("[붙 임]", styles, "small"))
    elements.append(Spacer(1, 2))
    elements.append(form_cell("동 의 서", styles, "title"))

    agreement_style = ParagraphStyle(
        "AgreementText",
        parent=styles["normal"],
        fontName=FONT_NAME,
        fontSize=7.5,
        leading=10.8,
    )

    body_text = """
<b>Ⅰ. 개인정보 수집 및 이용</b><br/>
층간소음 전문기관(한국환경공단, 이하 전문기관)에서는「개인정보 보호법」제15조(개인정보의 수집·이용)에 따라 다음과 같이 개인정보를 수집·이용하고자 함.<br/>
1. 목적: 층간소음 서비스(전화·방문상담, 소음측정) 제공 및 만족도 조사 등<br/>
2. 항목: 성명, 연락처, 주소, 이메일(목적에 필요한 최소한의 정보)<br/>
3. 보유·이용기간: 전산시스템 보관자료(3년), 해당서비스가 폐지될 경우 파기<br/><br/>

<b>Ⅱ. 자료제공의 범위</b><br/>
1. 전문기관은「층간소음 피해사례 조사·상담 등의 절차 및 방법에 관한 규정」(환경부 고시, 제2020-176호) 제6조 및 제7조에 의거, 방문상담 결과서(해당세대에 한정), 층간소음 측정결과서(신청세대에 한정)만 제공이 가능함(서면자료 요청서 제출시, 전문기관에서는 제공이 가능).<br/>
&nbsp;&nbsp;※ 전문기관의 제공 자료는 중재 목적으로, 목적 외 용도로는 사용 및 제공이 불가함.<br/>
2. 전문기관은 각종 소송(법적인 사항 포함)과 관련한 자료를 취득·보관하고 있지 않아 요청 및 제공이 불가함.<br/>
3. 타인의 정보·자료 및 소음측정 음원파일 등은「공공기관의 정보공개에 관한 법률」제9조(비공개 대상 정보)제1항제6호 등에 해당되어 제공이 불가함.<br/><br/>

<b>Ⅲ. 기타사항</b><br/>
1. 관리주체는 전문기관의 업무절차를 모두 숙지한 후, 입주민 간 중재상담을 실시 및 입주민의 동의하에 해당 기록을 첨부하여 전문기관에 방문상담, 소음측정(단, 관리주체 등이 중재상담을 실시하였으나, 신청·상대세대가 모두 소음측정만을 희망하는 경우)을 대표로 신청해야 함.<br/>
2. 신청 및 상대세대(이하, 입주민)는 관리주체 및 층간소음 관리위원회 등(이하, 중재주체)이 실시한 중재상담을 받았으며, 전문기관이 실시하는 방문상담, 소음측정 신청에 동의함.<br/>
3. 중재주체와 입주민은 전문기관의 진행사항(일정 협의 등)에 적극 협조하며, 중재주체는 전문기관의 방문상담에 동행함(부재시 관련자 동행, 동행 거부시 상담 진행 불가).<br/>
4. 중재주체가 입주민 동의 없이 임의로 작성 및 제출한 신청서는 인정되지 않음.<br/><br/>

위 사항에 대하여 거부할 권리가 있으나, 동의를 거부할 경우 층간소음 서비스(전화·방문상담, 소음측정) 이용이 제한되거나, 불가합니다.<br/><br/>

<b>위 사항에 대하여 모두 동의합니다.</b>
"""

    body_table = Table(
        [[Paragraph(body_text, agreement_style)]],
        colWidths=[475],
        rowHeights=[455],
    )

    body_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))

    elements.append(body_table)
    elements.append(Spacer(1, 8))

    agree_rows = [
        [form_cell("관리주체", styles, "center"), form_cell("(서명 또는 인)", styles, "center"), form_cell("[  ] 동의", styles, "center"), form_cell("[  ] 동의하지 않음", styles, "center")],
        [form_cell("신청세대", styles, "center"), form_cell("(서명 또는 인)", styles, "center"), form_cell("[  ] 동의", styles, "center"), form_cell("[  ] 동의하지 않음", styles, "center")],
        [form_cell("상대세대", styles, "center"), form_cell("(서명 또는 인)", styles, "center"), form_cell("[  ] 동의", styles, "center"), form_cell("[  ] 동의하지 않음", styles, "center")],
    ]

    agree_table = Table(
        agree_rows,
        colWidths=[100, 150, 90, 135],
        rowHeights=[20, 20, 20],
    )

    agree_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
    ]))

    elements.append(agree_table)


# ============================================================
# 공식 제출서류 4페이지
# 층간소음 측정 신청서
# ============================================================
def add_official_page_4_noise_measurement_application(elements, data: ReportRequest, styles: dict):
    first_record = get_first_noise_record(data)

    if first_record:
        _, first_time = split_datetime(first_record.measured_at)
    else:
        first_time = ""

    applicant_unit = get_applicant_unit(data)
    noise_type = get_main_noise_summary(data.noise_records)

    noise_status = ""
    if data.noise_records:
        noise_status = f"{get_noise_period(data.noise_records)} / {noise_type}"

    # PDF Paragraph에서 일반 공백은 줄어들 수 있어서 &nbsp; 사용
    date_text = (
        "년"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        "월"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
        "일"
    )

    elements.append(form_cell("층간소음 측정 신청서", styles, "title"))

    table_data = [
        # 제목
        [
            form_cell("층간소음 측정 신청서", styles, "center"),
            "", "", "", "", ""
        ],

        # 신청인
        [
            form_cell("신<br/>청<br/>인", styles, "center"),
            form_cell("①성    명", styles, "center"),
            form_cell("", styles),
            form_cell("②연락처", styles, "center"),
            form_cell("", styles),
            ""
        ],
        [
            "",
            form_cell("③전자우편(E-mail)", styles, "center"),
            form_cell("", styles),
            form_cell("④(공동)주택명", styles, "center"),
            form_cell(data.applicant.apartment_name or "", styles),
            ""
        ],
        [
            "",
            form_cell("⑤주    소", styles, "center"),
            form_cell(applicant_unit, styles),
            "", "", ""
        ],

        # 방문상담
        [
            form_cell("방<br/>문<br/>상<br/>담", styles, "center"),
            form_cell("⑥방문상담일", styles, "center"),
            form_cell("", styles),
            "", "", ""
        ],
        [
            "",
            form_cell("⑦방문상담 후<br/>소음발생현황", styles, "center"),
            form_cell(noise_status, styles),
            "", "", ""
        ],

        # 민원현황
        [
            form_cell("민<br/>원<br/>현<br/>황", styles, "center"),
            form_cell("⑧주소음원 및 유형", styles, "center"),
            form_cell(noise_type, styles),
            "", "", ""
        ],
        [
            "",
            form_cell("⑨소음발생 시간대", styles, "center"),
            form_cell(first_time, styles),
            "", "", ""
        ],

        # 신청 문구
        [
            form_cell(
                "「층간소음 피해사례 조사·상담 등의 절차 및 방법에 관한 규정」제7조제1항에 따라 "
                "층간소음 측정을 신청합니다.",
                styles,
                "normal"
            ),
            "", "", "", "", ""
        ],

        # 날짜: 칸 나누지 않고 한 줄 전체 병합
        [
            form_cell(date_text, styles, "center"),
            "", "", "", "", ""
        ],

        # 신청인 서명란
        [
            form_cell("신청인", styles, "center"),
            "", "", "",
            form_cell("(서명 또는 인)", styles, "center"),
            ""
        ],

        # 수신처
        [
            form_cell("층간소음 전문기관의 장 귀하", styles, "center"),
            "", "", "", "", ""
        ],

        # 구비서류
        [
            form_cell("[구비서류]<br/>1. 층간소음 발생일지 1부.", styles, "normal"),
            "", "", "", "", ""
        ],

        # 비고
        [
            form_cell("비고 : ‘층간소음 발생일지’는 붙임 서식을 사용할 수 있습니다.", styles, "normal"),
            "", "", "", "", ""
        ],
    ]

    measure_table = Table(
        table_data,
        colWidths=[60, 80, 110, 95, 95, 35],
        rowHeights=[
            28,
            30,
            30,
            42,
            42,
            58,
            58,
            58,
            80,
            40,
            30,
            30,
            38,
            24,
        ],
    )

    measure_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 8),

        # 제목
        ("SPAN", (0, 0), (-1, 0)),

        # 신청인 영역
        ("SPAN", (0, 1), (0, 3)),
        ("SPAN", (4, 1), (5, 1)),
        ("SPAN", (4, 2), (5, 2)),
        ("SPAN", (2, 3), (5, 3)),

        # 방문상담 영역
        ("SPAN", (0, 4), (0, 5)),
        ("SPAN", (2, 4), (5, 4)),
        ("SPAN", (2, 5), (5, 5)),

        # 민원현황 영역
        ("SPAN", (0, 6), (0, 7)),
        ("SPAN", (2, 6), (5, 6)),
        ("SPAN", (2, 7), (5, 7)),

        # 신청 문구
        ("SPAN", (0, 8), (5, 8)),

        # 날짜: 전체 한 칸으로 병합
        ("SPAN", (0, 9), (5, 9)),

        # 신청인 서명란
        ("SPAN", (1, 10), (3, 10)),
        ("SPAN", (4, 10), (5, 10)),

        # 수신처 / 구비서류 / 비고
        ("SPAN", (0, 11), (5, 11)),
        ("SPAN", (0, 12), (5, 12)),
        ("SPAN", (0, 13), (5, 13)),

        # 정렬
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (2, 1), (5, 7), "LEFT"),
        ("ALIGN", (0, 8), (5, 8), "LEFT"),
        ("ALIGN", (0, 9), (5, 9), "CENTER"),
        ("ALIGN", (0, 11), (5, 11), "RIGHT"),
        ("ALIGN", (0, 12), (5, 13), "LEFT"),

        # 큰 입력칸은 위쪽 정렬
        ("VALIGN", (2, 5), (5, 7), "TOP"),
    ]))

    elements.append(measure_table)


# ============================================================
# 공식 제출서류 5페이지
# 층간소음 발생일지
# ============================================================
def add_official_page_5_confirmation(elements, data: ReportRequest, styles: dict):
    applicant_address = get_applicant_unit(data)

    title_style = ParagraphStyle(
        "OccurrenceTitle",
        parent=styles["center"],
        fontName=FONT_NAME,
        fontSize=12,
        leading=16,
        alignment=1,
    )

    cell_style = ParagraphStyle(
        "OccurrenceCell",
        parent=styles["normal"],
        fontName=FONT_NAME,
        fontSize=7.8,
        leading=10.5,
    )

    center_style = ParagraphStyle(
        "OccurrenceCenter",
        parent=styles["center"],
        fontName=FONT_NAME,
        fontSize=7.8,
        leading=10.5,
        alignment=1,
    )

    note_style = ParagraphStyle(
        "OccurrenceNote",
        parent=styles["normal"],
        fontName=FONT_NAME,
        fontSize=8.0,
        leading=11.5,
    )

    def occ_cell(text, style=cell_style):
        return make_blank_paragraph(text, style)

    header_rows = [
        [occ_cell("층간소음 발생일지", title_style), "", "", "", ""],
        [
            occ_cell("①성  명", center_style),
            occ_cell(""),
            occ_cell("(서명 또는 인)", center_style),
            occ_cell("②연락처", center_style),
            occ_cell(""),
        ],
        [
            occ_cell("③주  소", center_style),
            occ_cell(applicant_address),
            "",
            "",
            "",
        ],
    ]

    header_table = Table(
        header_rows,
        colWidths=[70, 130, 95, 90, 90],
        rowHeights=[34, 32, 36],
    )

    header_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("FONTSIZE", (0, 0), (-1, -1), 8),

        ("SPAN", (0, 0), (4, 0)),
        ("SPAN", (1, 2), (4, 2)),

        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (1, 2), (4, 2), "LEFT"),
    ]))

    elements.append(header_table)

    diary_rows = [
        [
            occ_cell("발생일시", center_style),
            occ_cell("소음유형", center_style),
            occ_cell("지속시간 또는 횟수", center_style),
        ]
    ]

    for record in data.noise_records[:12]:
        date_part, time_part = split_datetime(record.measured_at)
        datetime_text = f"{date_part} {time_part}".strip()

        diary_rows.append([
            occ_cell(datetime_text, center_style),
            occ_cell(get_noise_name(record), cell_style),
            occ_cell(record.duration or "", center_style),
        ])

    while len(diary_rows) < 13:
        diary_rows.append([
            occ_cell("", center_style),
            occ_cell("", cell_style),
            occ_cell("", center_style),
        ])

    diary_table = Table(
        diary_rows,
        colWidths=[165, 160, 155],
        rowHeights=[34] + [29] * 12,
    )

    diary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))

    diary_box = Table(
        [[diary_table]],
        colWidths=[480],
        rowHeights=[395],
    )

    diary_box.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))

    elements.append(diary_box)

    note_text = (
        "비고<br/>"
        "1. 본 일지는 층간소음 측정 신청세대의 구성원 중 1인이 대표로 작성합니다.<br/>"
        "2. 본 일지는 층간소음의 유형과 시간대를 파악하기 위한 용도로 사용합니다.<br/>"
        "3. 본 일지는 소음측정 결과 분석시 참고자료로 활용될 수 있습니다."
    )

    note_table = Table(
        [[occ_cell(note_text, note_style)]],
        colWidths=[480],
        rowHeights=[58],
    )

    note_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))

    elements.append(note_table)


# ============================================================
# 관리사무소용 PDF 생성
# [별지 제1호서식] 층간소음 방문상담 신청서 1장만 생성
# ============================================================
def create_management_office_pdf(data: ReportRequest, config: dict):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=35,
        bottomMargin=35,
    )

    styles = get_form_styles()
    elements = []

    add_official_page_1_visit_application(elements, data, styles)

    doc.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={config['filename']}"
        }
    )


# ============================================================
# HWP 기반 공식 제출서류 PDF 생성
# ============================================================
def create_official_required_forms_pdf(data: ReportRequest, config: dict):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=35,
        bottomMargin=35,
    )

    styles = get_form_styles()
    elements = []

    add_official_page_1_visit_application(elements, data, styles)
    elements.append(PageBreak())

    add_official_page_2_mediation_report_blank(elements, data, styles)
    elements.append(PageBreak())

    add_official_page_3_agreement_blank(elements, data, styles)
    elements.append(PageBreak())

    add_official_page_4_noise_measurement_application(elements, data, styles)
    elements.append(PageBreak())

    add_official_page_5_confirmation(elements, data, styles)

    doc.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={config['filename']}"
        }
    )


# ============================================================
# PDF 생성 API
# ============================================================
@router.post("/pdf")
def create_report_pdf(data: ReportRequest):
    try:
        config = get_report_config(data.report_type)

        if data.report_type == "official_required_forms":
            return create_official_required_forms_pdf(data, config)

        if data.report_type == "management_office":
            return create_management_office_pdf(data, config)

        return create_general_report_pdf(data, config)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))