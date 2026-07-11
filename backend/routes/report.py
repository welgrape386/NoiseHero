from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId
import os
from database import noise_collection, report_collection

from routes.auth import get_current_user

router = APIRouter()

# 요청 모델
class Applicant(BaseModel):
    nickname: Optional[str] = ""
    apartment_name: Optional[str] = ""
    dong: Optional[str] = ""
    ho: Optional[str] = ""
    floor: Optional[str] = ""
    management_phone: Optional[str] = ""

class Target(BaseModel):
    location: Optional[str] = ""
    address: Optional[str] = ""


class NoiseRecord(BaseModel):
    record_id: Optional[str] = None  # 실제 저장된 측정 기록의 _id. 있으면 DB 원본값(보정 반영)으로 덮어씀
    measured_at: Optional[str] = ""
    time_zone: Optional[str] = ""
    noise_type: Optional[str] = ""
    primary_source: Optional[str] = ""
    secondary_source: Optional[str] = ""
    leq: Optional[float] = 0
    lmax: Optional[float] = 0
    leq_standard: Optional[float] = 0
    lmax_standard: Optional[float] = 0
    leq_exceeded: Optional[float] = 0
    lmax_exceeded: Optional[float] = 0

class Statistics(BaseModel):
    total_count: Optional[int] = 0
    exceeded_count: Optional[int] = 0
    exceed_rate: Optional[float] = 0
    avg_leq: Optional[float] = 0
    avg_lmax: Optional[float] = 0
    max_leq: Optional[float] = 0
    max_leq_at: Optional[str] = ""
    max_lmax: Optional[float] = 0
    max_lmax_at: Optional[str] = ""
    daytime_count: Optional[int] = 0
    nighttime_count: Optional[int] = 0

class Conclusion(BaseModel):
    site_inspection: Optional[str] = ""
    noise_measurement: Optional[str] = ""
    prevention: Optional[str] = ""

class ReportRequest(BaseModel):
    title: Optional[str] = "층간소음 피해 현장진단 신청서"
    created_at: Optional[str] = ""
    applicant: Optional[Applicant] = None
    target: Optional[Target] = None
    noise_records: Optional[List[NoiseRecord]] = []
    statistics: Optional[Statistics] = None
    damage_summary: Optional[str] = ""
    conclusion: Optional[Conclusion] = None
    disclaimer: Optional[str] = ""


def draw_text(pdf, font_name, size, x, y, text, page_height=800):
    pdf.setFont(font_name, size)
    pdf.drawString(x, y, text)
    return y

def wrap_text(pdf, font_name, size, x, y, text, max_width, line_height, canvas_obj):
    """긴 텍스트 자동 줄바꿈"""
    pdf.setFont(font_name, size)
    words = list(text)
    line = ""
    for char in text:
        test_line = line + char
        if pdf.stringWidth(test_line, font_name, size) > max_width:
            pdf.drawString(x, y, line)
            y -= line_height
            if y < 80:
                pdf.showPage()
                pdf.setFont(font_name, size)
                y = 800
            line = char
        else:
            line = test_line
    if line:
        pdf.drawString(x, y, line)
        y -= line_height
    return y


async def resolve_noise_records(records: List[NoiseRecord], email: str):
    """record_id가 있는 항목은 클라이언트가 보낸 값을 무시하고 DB 원본(보정값 반영)으로 덮어쓴다."""
    object_ids = []
    for r in records:
        if r.record_id:
            try:
                object_ids.append(ObjectId(r.record_id))
            except InvalidId:
                pass

    db_docs_by_id = {}
    if object_ids:
        cursor = noise_collection.find({"_id": {"$in": object_ids}, "email": email})
        async for doc in cursor:
            db_docs_by_id[str(doc["_id"])] = doc

    resolved = []
    for r in records:
        doc = db_docs_by_id.get(r.record_id) if r.record_id else None
        if doc is None:
            resolved.append(r)
            continue

        leq_standard = doc.get("leq_standard") or 0
        lmax_standard = doc.get("lmax_standard") or 0
        eval_leq = doc.get("calibrated_leq")
        if eval_leq is None:
            eval_leq = doc.get("leq", 0)
        eval_lmax = doc.get("calibrated_lmax")
        if eval_lmax is None:
            eval_lmax = doc.get("lmax", 0)

        measured_at = doc.get("measured_at")
        measured_at_str = measured_at.isoformat() if hasattr(measured_at, "isoformat") else (measured_at or r.measured_at)

        resolved.append(NoiseRecord(
            record_id=r.record_id,
            measured_at=measured_at_str,
            time_zone=doc.get("time_zone", r.time_zone),
            noise_type=doc.get("noise_type", r.noise_type),
            primary_source=doc.get("primary_source", r.primary_source),
            secondary_source=doc.get("secondary_source", r.secondary_source),
            leq=eval_leq,
            lmax=eval_lmax,
            leq_standard=leq_standard,
            lmax_standard=lmax_standard,
            leq_exceeded=round(max(0, eval_leq - leq_standard), 1),
            lmax_exceeded=round(max(0, eval_lmax - lmax_standard), 1) if lmax_standard else 0,
        ))

    return resolved, bool(db_docs_by_id)


def recompute_statistics(records: List[NoiseRecord]):
    """DB에서 조회한 보정 반영 기록을 기준으로 통계를 서버에서 다시 계산한다."""
    total_count = len(records)
    if total_count == 0:
        return Statistics()

    leqs = [r.leq for r in records]
    lmaxs = [r.lmax for r in records]
    exceeded_count = sum(
        1 for r in records if (r.leq_exceeded or 0) > 0 or (r.lmax_exceeded or 0) > 0
    )
    daytime_count = sum(1 for r in records if r.time_zone == "주간")
    nighttime_count = sum(1 for r in records if r.time_zone == "야간")

    max_leq_idx = max(range(total_count), key=lambda i: leqs[i])
    max_lmax_idx = max(range(total_count), key=lambda i: lmaxs[i])

    return Statistics(
        total_count=total_count,
        exceeded_count=exceeded_count,
        exceed_rate=round(exceeded_count / total_count * 100, 1),
        avg_leq=round(sum(leqs) / total_count, 1),
        avg_lmax=round(sum(lmaxs) / total_count, 1),
        max_leq=leqs[max_leq_idx],
        max_leq_at=records[max_leq_idx].measured_at,
        max_lmax=lmaxs[max_lmax_idx],
        max_lmax_at=records[max_lmax_idx].measured_at,
        daytime_count=daytime_count,
        nighttime_count=nighttime_count,
    )


@router.post("/pdf")
async def create_noise_report_pdf(
    request: ReportRequest,
    current_user: dict = Depends(get_current_user)
):
    email = current_user.get("email")

    request.noise_records, has_db_records = await resolve_noise_records(
        request.noise_records or [], email
    )
    if has_db_records:
        request.statistics = recompute_statistics(request.noise_records)

    if not os.path.exists("reports"):
        os.makedirs("reports")

    filename = f"reports/noise_report_{email.replace('@', '_')}.pdf"

    pdf = canvas.Canvas(filename)
    pdf.setTitle(request.title or "NoiseGuard 소음 민원서")

    font_path = os.path.join(os.path.dirname(__file__), "..", "fonts", "NANUMGOTHIC.TTF")
    pdfmetrics.registerFont(TTFont("NanumGothic", font_path))

    y = 800
    left = 50
    line_h = 22

    # 제목
    pdf.setFont("NanumGothic", 16)
    pdf.drawString(left, y, request.title or "층간소음 피해 현장진단 신청서")
    y -= 10
    pdf.line(left, y, 550, y)
    y -= 30

    # 신청자 정보
    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 신청자 정보")
    y -= line_h

    pdf.setFont("NanumGothic", 10)
    if request.applicant:
        a = request.applicant
        pdf.drawString(left, y, f"이름(닉네임): {a.nickname}   아파트: {a.apartment_name}")
        y -= line_h
        pdf.drawString(left, y, f"동/호수: {a.dong}동 {a.ho}호   층: {a.floor}층   관리사무소: {a.management_phone}")
        y -= line_h
    y -= 10

    # 소음 발생 위치
    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 소음 발생 위치")
    y -= line_h

    pdf.setFont("NanumGothic", 10)
    if request.target:
        pdf.drawString(left, y, f"위치: {request.target.location}   주소: {request.target.address}")
        y -= line_h
    y -= 10


    # 소음 측정 기록
    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 소음 측정 기록")
    y -= line_h

    pdf.setFont("NanumGothic", 9)
    if request.noise_records:
        for idx, record in enumerate(request.noise_records, start=1):
            if y < 100:
                pdf.showPage()
                pdf.setFont("NanumGothic", 9)
                y = 800
            pdf.drawString(left, y, f"{idx}. {record.measured_at} / {record.time_zone} / {record.noise_type}")
            y -= 18
            pdf.drawString(left + 20, y, f"주소음원: {record.primary_source}   부소음원: {record.secondary_source}")
            y -= 18
            pdf.drawString(left + 20, y,
                f"Leq: {record.leq}dB (기준 {record.leq_standard}dB, 초과 {record.leq_exceeded}dB) / "
                f"Lmax: {record.lmax}dB (기준 {record.lmax_standard}dB, 초과 {record.lmax_exceeded}dB)"
            )
            y -= 22
    y -= 10

    # 통계
    if y < 150:
        pdf.showPage()
        y = 800

    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 통계 요약")
    y -= line_h

    pdf.setFont("NanumGothic", 10)
    if request.statistics:
        s = request.statistics
        pdf.drawString(left, y, f"총 측정 횟수: {s.total_count}회   기준 초과: {s.exceeded_count}회   초과율: {s.exceed_rate}%")
        y -= line_h
        pdf.drawString(left, y, f"평균 Leq: {s.avg_leq}dB   평균 Lmax: {s.avg_lmax}dB")
        y -= line_h
        pdf.drawString(left, y, f"최대 Leq: {s.max_leq}dB ({s.max_leq_at})   최대 Lmax: {s.max_lmax}dB ({s.max_lmax_at})")
        y -= line_h
        pdf.drawString(left, y, f"주간: {s.daytime_count}회   야간: {s.nighttime_count}회")
        y -= line_h
    y -= 10

    # 피해 요약
    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 피해 요약")
    y -= line_h

    pdf.setFont("NanumGothic", 10)
    if request.damage_summary:
        y = wrap_text(pdf, "NanumGothic", 10, left, y, request.damage_summary, 500, 18, pdf)
    y -= 10

    # 요청 사항
    if y < 200:
        pdf.showPage()
        y = 800

    pdf.setFont("NanumGothic", 12)
    pdf.drawString(left, y, "■ 요청 사항")
    y -= line_h

    pdf.setFont("NanumGothic", 10)
    if request.conclusion:
        c = request.conclusion
        pdf.drawString(left, y, "1. 현장 진단")
        y -= 18
        y = wrap_text(pdf, "NanumGothic", 10, left + 10, y, c.site_inspection, 490, 18, pdf)
        y -= 5
        pdf.drawString(left, y, "2. 소음 측정")
        y -= 18
        y = wrap_text(pdf, "NanumGothic", 10, left + 10, y, c.noise_measurement, 490, 18, pdf)
        y -= 5
        pdf.drawString(left, y, "3. 재발 방지")
        y -= 18
        y = wrap_text(pdf, "NanumGothic", 10, left + 10, y, c.prevention, 490, 18, pdf)
    y -= 15

    # 면책 조항
    pdf.line(left, y, 550, y)
    y -= 15
    pdf.setFont("NanumGothic", 8)
    if request.disclaimer:
        pdf.drawString(left, y, request.disclaimer)

    pdf.save()

    # DB 저장
    await report_collection.insert_one({
        "email": email,
        "title": request.title,
        "created_at": datetime.now().isoformat(),
        "target_location": request.target.location if request.target else None,
        "target_address": request.target.address if request.target else None,
        "noise_records": [r.dict() for r in request.noise_records],
        "statistics": request.statistics.dict() if request.statistics else None,
        "damage_summary": request.damage_summary,
        "filename": filename
    })

    return FileResponse(
        path=filename,
        filename="noise_report.pdf",
        media_type="application/pdf"
    )