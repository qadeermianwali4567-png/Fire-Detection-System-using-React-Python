from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import pandas as pd
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from backend.database import incidents_collection
from backend.schemas import (
    MonthlyReportResponse,
    AnnualReportResponse,
    HourlyReportResponse,
)
from backend.dependencies import get_current_admin

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ─── Routes ─────────────────────────────────────────────────

@router.get("/monthly", response_model=AnnualReportResponse)
async def get_monthly_report(
    year: int = Query(datetime.now(timezone(timedelta(hours=5))).year),
    current_admin: dict = Depends(get_current_admin),
):
    """Get monthly fire incident counts for a given year."""

    start = datetime(year, 1, 1)
    end   = datetime(year, 12, 31, 23, 59, 59)

    cursor = incidents_collection.find({
        "detected_at": {"$gte": start, "$lte": end}
    })

    monthly_counts = {i: 0 for i in range(1, 13)}
    total = 0

    async for doc in cursor:
        month = doc["detected_at"].month
        monthly_counts[month] += 1
        total += 1

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    monthly_data = [
        MonthlyReportResponse(
            month=month_names[i - 1],
            count=monthly_counts[i]
        )
        for i in range(1, 13)
    ]

    return AnnualReportResponse(
        year=year,
        monthly_data=monthly_data,
        total=total,
    )


@router.get("/annual")
async def get_annual_report(
    current_admin: dict = Depends(get_current_admin),
):
    """Get total fire incidents per year."""

    cursor = incidents_collection.find({})

    yearly_counts = {}
    async for doc in cursor:
        year = doc["detected_at"].year
        yearly_counts[year] = yearly_counts.get(year, 0) + 1

    result = [
        {"year": year, "count": count}
        for year, count in sorted(yearly_counts.items())
    ]

    return {"data": result, "success": True}


@router.get("/hourly", response_model=list[HourlyReportResponse])
async def get_hourly_report(
    current_admin: dict = Depends(get_current_admin),
):
    """Get incident counts by hour of day."""

    cursor = incidents_collection.find({})

    hourly_counts = {i: 0 for i in range(24)}

    async for doc in cursor:
        hour = doc["detected_at"].hour
        hourly_counts[hour] += 1

    return [
        HourlyReportResponse(hour=h, count=hourly_counts[h])
        for h in range(24)
    ]


@router.get("/summary")
async def get_summary(
    current_admin: dict = Depends(get_current_admin),
):
    """Get overall summary stats for dashboard."""

    total        = await incidents_collection.count_documents({})
    new          = await incidents_collection.count_documents({"status": "new"})
    acknowledged = await incidents_collection.count_documents({"status": "acknowledged"})
    resolved     = await incidents_collection.count_documents({"status": "resolved"})

    now   = datetime.now(timezone(timedelta(hours=5)))
    start = datetime(now.year, now.month, 1)
    this_month = await incidents_collection.count_documents({
        "detected_at": {"$gte": start}
    })

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_incidents = await incidents_collection.count_documents({
        "detected_at": {"$gte": today_start}
    })

    return {
        "total_incidents":        total,
        "new_incidents":          new,
        "acknowledged_incidents": acknowledged,
        "resolved_incidents":     resolved,
        "this_month":             this_month,
        "today_incidents":        today_incidents,
        "success":                True,
    }


@router.get("/export")
async def export_csv(
    current_admin: dict = Depends(get_current_admin),
):
    """Export all incidents as CSV data."""

    cursor = incidents_collection.find({})

    rows = []
    async for doc in cursor:
        rows.append({
            "ID":          str(doc["_id"]),
            "Camera":      doc["camera_name"],
            "Location":    doc["location"],
            "Confidence":  doc["confidence_score"],
            "Detected At": doc["detected_at"].strftime("%Y-%m-%d %H:%M:%S"),
            "Status":      doc.get("status", "new"),
            "Notes":       doc.get("notes", ""),
        })

    if not rows:
        return {"data": [], "message": "No incidents found.", "success": True}

    df       = pd.DataFrame(rows)
    csv_data = df.to_csv(index=False)

    return {"data": csv_data, "success": True}


@router.get("/export-pdf")
async def export_pdf(
    current_admin: dict = Depends(get_current_admin),
):
    """Export all incidents as PDF report."""

    PST = timezone(timedelta(hours=5))
    now = datetime.now(PST)

    # Fetch all incidents
    cursor    = incidents_collection.find({}).sort("detected_at", -1)
    incidents = []
    async for doc in cursor:
        incidents.append(doc)

    # Create PDF in memory
    buffer = io.BytesIO()
    doc    = SimpleDocTemplate(
        buffer,
        pagesize    = A4,
        rightMargin = 30, leftMargin  = 30,
        topMargin   = 30, bottomMargin = 30
    )

    styles   = getSampleStyleSheet()
    elements = []

    # ── Title ──
    title_style = ParagraphStyle(
        'CustomTitle',
        parent     = styles['Title'],
        fontSize   = 20,
        textColor  = colors.HexColor('#e53e3e'),
        alignment  = TA_CENTER,
        spaceAfter = 6,
    )
    sub_style = ParagraphStyle(
        'Sub',
        parent     = styles['Normal'],
        fontSize   = 10,
        textColor  = colors.HexColor('#888888'),
        alignment  = TA_CENTER,
        spaceAfter = 4,
    )

    elements.append(Paragraph("Fire Detection System", title_style))
    elements.append(Paragraph("Incident Report", title_style))
    elements.append(Paragraph(
        f"Generated: {now.strftime('%d/%m/%Y %I:%M %p PKT')}",
        sub_style
    ))
    elements.append(Spacer(1, 0.2 * inch))

    # ── Summary Stats ──
    total    = len(incidents)
    new      = sum(1 for i in incidents if i.get("status") == "new")
    resolved = sum(1 for i in incidents if i.get("status") == "resolved")
    ack      = sum(1 for i in incidents if i.get("status") == "acknowledged")

    summary_data = [
        ["Total Incidents", "New",      "Acknowledged", "Resolved"],
        [str(total),        str(new),   str(ack),       str(resolved)],
    ]

    summary_table = Table(summary_data, colWidths=[130, 120, 130, 120])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e53e3e')),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#1a1a1a')),
        ('TEXTCOLOR',  (0,1), (-1,1), colors.white),
        ('FONTSIZE',   (0,0), (-1,-1), 11),
        ('FONTNAME',   (0,0), (-1,0),  'Helvetica-Bold'),
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('ROWHEIGHT',  (0,0), (-1,-1), 28),
        ('GRID',       (0,0), (-1,-1), 0.5, colors.HexColor('#333333')),
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 0.3 * inch))

    # ── Incidents Table ──
    heading_style = ParagraphStyle(
        'Heading',
        parent     = styles['Normal'],
        fontSize   = 13,
        textColor  = colors.HexColor('#333333'),
        fontName   = 'Helvetica-Bold',
        spaceAfter = 8,
    )
    elements.append(Paragraph("Incident Details", heading_style))

    if incidents:
        headers    = ["#", "Camera", "Location", "Position", "Confidence", "Date & Time", "Status"]
        table_data = [headers]

        for idx, inc in enumerate(incidents, 1):
            detected = inc["detected_at"]
            if hasattr(detected, 'astimezone'):
                detected = detected.astimezone(PST)
            detected_str = detected.strftime("%d/%m/%Y %I:%M %p")

            conf   = f"{inc.get('confidence_score', 0) * 100:.1f}%"
            pos    = inc.get("fire_position", "—")
            status = inc.get("status", "new").capitalize()

            table_data.append([
                str(idx),
                inc.get("camera_name", "—"),
                inc.get("location",    "—"),
                pos,
                conf,
                detected_str,
                status,
            ])

        col_widths = [25, 90, 90, 75, 70, 110, 75]
        inc_table  = Table(table_data, colWidths=col_widths, repeatRows=1)

        inc_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e53e3e')),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,0), 9),
            ('ALIGN',      (0,0), (-1,0), 'CENTER'),
            ('ROWHEIGHT',  (0,0), (0,0),  22),

            # Body
            ('FONTSIZE',   (0,1), (-1,-1), 8),
            ('TEXTCOLOR',  (0,1), (-1,-1), colors.HexColor('#222222')),
            ('ALIGN',      (0,1), (0,-1),  'CENTER'),
            ('ALIGN',      (4,1), (4,-1),  'CENTER'),
            ('ALIGN',      (6,1), (6,-1),  'CENTER'),
            ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
            ('ROWHEIGHT',  (0,1), (-1,-1), 18),

            # Alternating rows
            *[('BACKGROUND', (0,i), (-1,i),
               colors.HexColor('#f9f9f9') if i % 2 == 1 else colors.HexColor('#ffffff'))
              for i in range(1, len(table_data))],

            ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#dddddd')),
        ]))

        elements.append(inc_table)
    else:
        elements.append(Paragraph("No incidents found.", sub_style))

    # ── Footer ──
    elements.append(Spacer(1, 0.3 * inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent    = styles['Normal'],
        fontSize  = 8,
        textColor = colors.HexColor('#aaaaaa'),
        alignment = TA_CENTER,
    )
    elements.append(Paragraph(
        f"Fire Detection System — Automated Report — {now.strftime('%Y')}",
        footer_style
    ))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    filename = f"fire_report_{now.strftime('%Y%m%d_%H%M')}.pdf"

    return StreamingResponse(
        buffer,
        media_type = "application/pdf",
        headers    = {"Content-Disposition": f"attachment; filename={filename}"}
    )