"""
Weekly Meetings routes - Extracted from server.py
Handles weekly meeting CRUD operations and PDF generation
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import io
import os

from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    Frame, PageTemplate, BaseDocTemplate, Table, TableStyle, 
    Paragraph, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

router = APIRouter(prefix="/weekly-meetings", tags=["Weekly-Meetings"])

# MongoDB connection - import from environment
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia')]

# Security
security = HTTPBearer(auto_error=False)

# Department configuration
DEPARTMENTS = [
    {"code": "ACCOUNTS", "name": "Accounts", "head": "Kavitha"},
    {"code": "PURCHASE", "name": "Purchase", "head": "Nathiya"},
    {"code": "PROJECTS", "name": "Projects & Services", "head": "Giftson"},
    {"code": "SALES", "name": "Sales & Marketing", "head": "Haminullah"},
    {"code": "EXPORTS", "name": "Exports", "head": "Saleem Basha"},
    {"code": "FINANCE", "name": "Finance", "head": "Mr. Mani"},
    {"code": "HR", "name": "HR & Admin", "head": "Saleem Basha"},
    {"code": "OPERATIONS", "name": "Operations", "head": "Saleem Basha"},
]


# ==================== MODELS ====================

class WeeklyMeeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meeting_id: str  # e.g., PROJ-M9-W41
    department: str
    department_rep: str
    meeting_agenda: str = ""
    meeting_attendees: str = ""
    meeting_date: str  # DD-MM-YYYY
    meeting_chair: str = "Subramani"
    meeting_time: str = ""
    week_number: int = 1
    month: int = 1
    year: int = 2025
    meeting_notes: str = ""
    decisions: str = ""
    issues: str = ""
    weekly_highlights: str = ""
    action_items: List[dict] = []
    billing_target: float = 0
    billing_achieved: float = 0
    order_target: float = 0
    order_achieved: float = 0
    department_data: dict = {}
    status: str = "Draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class WeeklyMeetingCreate(BaseModel):
    department: str
    department_rep: str
    meeting_agenda: Optional[str] = ""
    meeting_attendees: Optional[str] = ""
    meeting_date: str
    meeting_chair: Optional[str] = "Subramani"
    meeting_time: Optional[str] = ""
    week_number: Optional[int] = 1
    month: Optional[int] = None
    year: Optional[int] = None
    meeting_notes: Optional[str] = ""
    decisions: Optional[str] = ""
    issues: Optional[str] = ""
    weekly_highlights: Optional[str] = ""
    action_items: List[dict] = []
    billing_target: Optional[float] = 0
    billing_achieved: Optional[float] = 0
    order_target: Optional[float] = 0
    order_achieved: Optional[float] = 0
    department_data: Optional[dict] = {}


class WeeklyMeetingUpdate(BaseModel):
    department_rep: Optional[str] = None
    meeting_agenda: Optional[str] = None
    meeting_attendees: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_chair: Optional[str] = None
    meeting_time: Optional[str] = None
    week_number: Optional[int] = None
    meeting_notes: Optional[str] = None
    decisions: Optional[str] = None
    issues: Optional[str] = None
    weekly_highlights: Optional[str] = None
    action_items: Optional[List[dict]] = None
    billing_target: Optional[float] = None
    billing_achieved: Optional[float] = None
    order_target: Optional[float] = None
    order_achieved: Optional[float] = None
    department_data: Optional[dict] = None
    status: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def get_user_departments(user: dict) -> List[str]:
    """Get list of all departments a user can access"""
    if user.get("role") == "super_admin":
        return [d["code"] for d in DEPARTMENTS]
    
    departments = []
    if user.get("department"):
        departments.append(user["department"])
    departments.extend(user.get("can_view_departments", []))
    return list(set(departments))


def can_access_department(user: dict, target_department: str) -> bool:
    """Check if user can access a specific department's data"""
    if user.get("role") == "super_admin":
        return True
    if user.get("department") == target_department:
        return True
    if target_department in user.get("can_view_departments", []):
        return True
    return False


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token - returns None if no valid token"""
    if not credentials:
        return None
    
    import jwt
    JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
    JWT_ALGORITHM = "HS256"
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.DecodeError):
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user


# ==================== ROUTES ====================

@router.get("")
async def get_weekly_meetings(
    department: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    week_number: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Apply department filter based on user access
    if current_user and current_user.get("role") != "super_admin":
        accessible_depts = get_user_departments(current_user)
        if accessible_depts:
            query["department"] = {"$in": accessible_depts}
    
    # Additional filters from query params
    if department:
        query["department"] = department
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if week_number:
        query["week_number"] = week_number
    
    meetings = await db.weekly_meetings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return meetings


@router.get("/summary/current")
async def get_weekly_meeting_summary():
    """Get summary data for current week's meeting dashboard"""
    now = datetime.now(timezone.utc)
    
    # Get current week's start (Monday)
    days_since_monday = now.weekday()
    week_start = now - timedelta(days=days_since_monday)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)
    
    # Get last week's dates
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start
    
    # Get live/ongoing projects
    live_projects = await db.projects.find(
        {"status": {"$in": ["Ongoing", "In Progress", "Need to Start"]}},
        {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "client": 1, "status": 1, 
         "completion_percentage": 1, "engineer_in_charge": 1, "category": 1}
    ).to_list(1000)
    
    # Get projects completed in last week
    last_week_completed = await db.projects.find(
        {"status": "Completed"},
        {"_id": 0, "id": 1, "pid_no": 1, "project_name": 1, "client": 1, "completion_date": 1, 
         "po_amount": 1, "invoiced_amount": 1, "category": 1}
    ).to_list(1000)
    
    last_week_completed = last_week_completed[:20]
    
    # Calculate billing summary
    all_projects = await db.projects.find({}, {"_id": 0, "po_amount": 1, "invoiced_amount": 1, "this_week_billing": 1, "category": 1}).to_list(1000)
    
    total_po_amount = sum(p.get("po_amount", 0) for p in all_projects)
    total_invoiced = sum(p.get("invoiced_amount", 0) for p in all_projects)
    this_week_billing = sum(p.get("this_week_billing", 0) for p in all_projects)
    
    # Get category breakdown for billing
    category_billing = {}
    for p in all_projects:
        cat = p.get("category", "Other")
        if cat not in category_billing:
            category_billing[cat] = {"po_amount": 0, "invoiced": 0}
        category_billing[cat]["po_amount"] += p.get("po_amount", 0)
        category_billing[cat]["invoiced"] += p.get("invoiced_amount", 0)
    
    # Get recent meetings
    recent_meetings = await db.weekly_meetings.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "live_projects": live_projects,
        "live_projects_count": len(live_projects),
        "last_week_completed": last_week_completed,
        "last_week_completed_count": len(last_week_completed),
        "billing_summary": {
            "total_po_amount": total_po_amount,
            "total_invoiced": total_invoiced,
            "total_balance": total_po_amount - total_invoiced,
            "this_week_billing": this_week_billing
        },
        "category_billing": category_billing,
        "recent_meetings": recent_meetings,
        "current_week": {
            "week_start": week_start.strftime("%d-%m-%Y"),
            "week_end": week_end.strftime("%d-%m-%Y"),
            "week_number": (now.day - 1) // 7 + 1,
            "month": now.month,
            "year": now.year
        }
    }


@router.get("/departments/list")
async def get_departments_list():
    """Return departments for dropdown"""
    return [{"code": d["code"], "name": d["name"], "rep": d["head"]} for d in DEPARTMENTS]


@router.get("/{meeting_id}")
async def get_weekly_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    meeting = await db.weekly_meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check department access
    if current_user and current_user.get("role") != "super_admin":
        meeting_dept = meeting.get("department")
        if meeting_dept and not can_access_department(current_user, meeting_dept):
            raise HTTPException(status_code=403, detail="Access denied to this meeting")
    
    return meeting


@router.post("")
async def create_weekly_meeting(meeting_data: WeeklyMeetingCreate):
    # Parse date to get month and year if not provided
    meeting_dict = meeting_data.model_dump()
    
    if meeting_dict.get("meeting_date"):
        try:
            date_parts = meeting_dict["meeting_date"].split("-")
            if len(date_parts) == 3:
                day, month, year = date_parts
                meeting_dict["month"] = meeting_dict.get("month") or int(month)
                meeting_dict["year"] = meeting_dict.get("year") or int(year)
        except (ValueError, TypeError, IndexError):
            pass
    
    # Generate meeting ID
    dept_code = meeting_dict["department"][:4].upper()
    month = meeting_dict.get("month", datetime.now().month)
    week = meeting_dict.get("week_number", 1)
    meeting_dict["meeting_id"] = f"{dept_code}-M{month}-W{week}"
    
    meeting_dict["id"] = str(uuid.uuid4())
    meeting_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    meeting_dict["status"] = "Draft"
    
    await db.weekly_meetings.insert_one(meeting_dict.copy())
    
    return meeting_dict


@router.put("/{meeting_id}")
async def update_weekly_meeting(meeting_id: str, update_data: WeeklyMeetingUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.weekly_meetings.update_one(
        {"id": meeting_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    updated = await db.weekly_meetings.find_one({"id": meeting_id}, {"_id": 0})
    return updated


@router.delete("/{meeting_id}")
async def delete_weekly_meeting(meeting_id: str):
    result = await db.weekly_meetings.delete_one({"id": meeting_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}


@router.get("/{meeting_id}/pdf")
async def generate_weekly_meeting_pdf(meeting_id: str):
    """Generate Weekly Meeting Minutes PDF"""
    meeting = await db.weekly_meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    org_name = org_settings.get("name", "Enerzia Power Solutions") if org_settings else "Enerzia Power Solutions"
    
    # Get logo
    logo_path = None
    default_logo_path = "/app/backend/uploads/enerzia_logo_2025.png"
    if org_settings and org_settings.get("logo_url"):
        logo_filename = org_settings.get("logo_url", "").split("/")[-1]
        potential_path = f"/app/backend/uploads/{logo_filename}"
        if os.path.exists(potential_path):
            logo_path = potential_path
    if not logo_path and os.path.exists(default_logo_path):
        logo_path = default_logo_path
    
    # Create PDF
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 30
    
    # Colors
    PRIMARY_GREEN = colors.HexColor('#2d7a4e')
    DARK_TEXT = colors.HexColor('#1a1a1a')
    GRAY_TEXT = colors.HexColor('#666666')
    LIGHT_GRAY = colors.HexColor('#f1f4f6')
    BORDER_COLOR = colors.HexColor('#ced5db')
    
    class MeetingPDF(BaseDocTemplate):
        def __init__(self, filename, **kwargs):
            BaseDocTemplate.__init__(self, filename, **kwargs)
            self.allowSplitting = 1
            
        def afterPage(self):
            canvas = self.canv
            
            # Header with logo
            if logo_path and os.path.exists(logo_path):
                try:
                    canvas.drawImage(logo_path, margin, page_height - 60, width=100, height=35, preserveAspectRatio=True, mask='auto')
                except (IOError, OSError):
                    pass
            
            # Header line
            canvas.setStrokeColor(PRIMARY_GREEN)
            canvas.setLineWidth(1.5)
            canvas.line(margin, page_height - 65, page_width - margin, page_height - 65)
            
            # Footer
            canvas.setStrokeColor(PRIMARY_GREEN)
            canvas.setLineWidth(1)
            canvas.line(margin, 40, page_width - margin, 40)
            
            # Footer text
            canvas.setFillColor(PRIMARY_GREEN)
            canvas.setFont("Helvetica-Bold", 8)
            canvas.drawString(margin, 28, org_name)
            
            canvas.setFillColor(GRAY_TEXT)
            canvas.setFont("Helvetica", 8)
            canvas.drawCentredString(page_width / 2, 28, f"Page {canvas.getPageNumber()}")
            
            canvas.setFillColor(PRIMARY_GREEN)
            canvas.setFont("Helvetica-Oblique", 8)
            canvas.drawRightString(page_width - margin, 28, "Think Smarter Go Greener")
    
    doc = MeetingPDF(
        buffer,
        pagesize=A4,
        rightMargin=margin,
        leftMargin=margin,
        topMargin=80,
        bottomMargin=55
    )
    
    frame = Frame(margin, 55, page_width - 2*margin, page_height - 135, id='main_frame')
    template = PageTemplate(id='main', frames=[frame])
    doc.addPageTemplates([template])
    
    styles = getSampleStyleSheet()
    story = []
    
    content_width = page_width - 2*margin
    
    # Title
    title_style = ParagraphStyle(
        'MeetingTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=15,
        textColor=DARK_TEXT,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("WEEKLY MEETING MINUTES", title_style))
    
    # Meeting Info
    meeting_info = [
        [Paragraph("<b>MEETING ID:</b>", styles['Normal']), meeting.get('meeting_id', ''),
         Paragraph("<b>DATE:</b>", styles['Normal']), meeting.get('meeting_date', '')],
        [Paragraph("<b>DEPARTMENT:</b>", styles['Normal']), meeting.get('department', ''),
         Paragraph("<b>WEEK:</b>", styles['Normal']), f"Week {meeting.get('week_number', '')}"],
        [Paragraph("<b>REPRESENTATIVE:</b>", styles['Normal']), meeting.get('department_rep', ''),
         Paragraph("<b>CHAIR:</b>", styles['Normal']), meeting.get('meeting_chair', '')],
        [Paragraph("<b>ATTENDEES:</b>", styles['Normal']), meeting.get('meeting_attendees', ''), "", ""],
    ]
    
    info_table = Table(meeting_info, colWidths=[100, 155, 80, 175])
    info_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), DARK_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))
    
    # Targets & Achievements (if applicable)
    if meeting.get('billing_target', 0) > 0 or meeting.get('order_target', 0) > 0:
        targets_header = Table([["TARGETS & ACHIEVEMENTS"]], colWidths=[content_width])
        targets_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(targets_header)
        
        targets_data = [
            ["Metric", "Target", "Achieved", "Variance"],
            ["Billing", f"Rs. {meeting.get('billing_target', 0):,.0f}", f"Rs. {meeting.get('billing_achieved', 0):,.0f}", 
             f"Rs. {meeting.get('billing_achieved', 0) - meeting.get('billing_target', 0):,.0f}"],
            ["Orders", f"Rs. {meeting.get('order_target', 0):,.0f}", f"Rs. {meeting.get('order_achieved', 0):,.0f}",
             f"Rs. {meeting.get('order_achieved', 0) - meeting.get('order_target', 0):,.0f}"],
        ]
        targets_table = Table(targets_data, colWidths=[130, 130, 130, 130])
        targets_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(targets_table)
        story.append(Spacer(1, 15))
    
    # Sections helper
    def add_section(title, content):
        if content:
            header = Table([[title]], colWidths=[content_width])
            header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_GREEN),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(header)
            
            content_para = Paragraph(content.replace('\n', '<br/>'), ParagraphStyle(
                'Content', parent=styles['Normal'], fontSize=9, leading=13, textColor=DARK_TEXT))
            content_box = Table([[content_para]], colWidths=[content_width - 2])
            content_box.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(content_box)
            story.append(Spacer(1, 10))
    
    # Add sections
    add_section("MEETING AGENDA", meeting.get('meeting_agenda', ''))
    add_section("WEEKLY HIGHLIGHTS", meeting.get('weekly_highlights', ''))
    add_section("DECISIONS", meeting.get('decisions', ''))
    add_section("ISSUES / CONCERNS", meeting.get('issues', ''))
    add_section("MEETING NOTES", meeting.get('meeting_notes', ''))
    
    # Action Items
    action_items = meeting.get('action_items', [])
    if action_items:
        action_header = Table([["ACTION ITEMS"]], colWidths=[content_width])
        action_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(action_header)
        
        action_data = [["#", "Action", "Assigned To", "Due Date", "Status"]]
        for i, item in enumerate(action_items, 1):
            action_data.append([
                str(i),
                item.get('action', '')[:50],
                item.get('assigned_to', ''),
                item.get('due_date', ''),
                item.get('status', 'Pending')
            ])
        
        action_table = Table(action_data, colWidths=[25, 240, 100, 80, 65])
        action_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(action_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    filename = f"Meeting_{meeting.get('meeting_id', 'unknown').replace('/', '-')}_{meeting.get('meeting_date', '').replace('-', '')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
