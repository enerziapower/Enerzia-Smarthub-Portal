"""
Project Schedule PDF Generation
Professional timeline report with cover page, Gantt chart visualization, and phases tracking
Similar styling to AMC and Calibration reports
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, NextPageTemplate,
    BaseDocTemplate, Frame, PageTemplate
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect, Line
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import os
import math

# Import from pdf_base including template settings helpers
from routes.pdf_base import (
    format_date_ddmmyyyy,
    get_template_settings,
    get_pdf_logo_path,
    get_pdf_primary_color,
    get_pdf_company_name,
    get_pdf_website,
    get_cover_page_settings,
    get_back_cover_settings,
    get_header_footer_settings,
    is_cover_page_enabled,
    is_back_cover_enabled,
    get_pdf_company_info
)

# Import decorative design functions from pdf_template_settings
from routes.pdf_template_settings import (
    draw_decorative_design,
    get_report_design,
    DESIGN_OPTIONS
)

router = APIRouter()

# Default Colors
PRIMARY_BLUE = colors.HexColor('#1e3a5f')
TEAL_ACCENT = colors.HexColor('#0d9488')  # Teal for project schedule
LIGHT_GRAY = colors.HexColor('#f5f5f5')
BORDER_COLOR = colors.HexColor('#cccccc')
TEXT_DARK = colors.HexColor('#333333')

# Gantt colors
PHASE_COLORS = [
    colors.HexColor('#3b82f6'),  # Blue
    colors.HexColor('#f59e0b'),  # Amber
    colors.HexColor('#22c55e'),  # Green
    colors.HexColor('#8b5cf6'),  # Purple
    colors.HexColor('#ec4899'),  # Pink
    colors.HexColor('#06b6d4'),  # Cyan
    colors.HexColor('#ef4444'),  # Red
    colors.HexColor('#14b8a6'),  # Teal
]

STATUS_COLORS = {
    'completed': colors.HexColor('#22c55e'),
    'in_progress': colors.HexColor('#3b82f6'),
    'pending': colors.HexColor('#f59e0b'),
    'draft': colors.HexColor('#94a3b8')
}

STATUS_BG_COLORS = {
    'completed': colors.HexColor('#dcfce7'),
    'in_progress': colors.HexColor('#dbeafe'),
    'pending': colors.HexColor('#fef3c7'),
    'draft': colors.HexColor('#f1f5f9')
}


def get_db():
    from server import db
    return db


def get_schedule_styles():
    """Get custom styles for Project Schedule report"""
    styles = getSampleStyleSheet()
    
    # Section Header
    styles.add(ParagraphStyle(
        name='ScheduleSectionHeader',
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0
    ))
    
    # Subsection Header
    styles.add(ParagraphStyle(
        name='ScheduleSubHeader',
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        spaceBefore=10,
        spaceAfter=5
    ))
    
    # Body Text
    styles.add(ParagraphStyle(
        name='ScheduleBodyText',
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceBefore=5,
        spaceAfter=5,
        wordWrap='CJK',
    ))
    
    # Table Cell - with proper word wrapping
    styles.add(ParagraphStyle(
        name='ScheduleTableCell',
        fontSize=9,
        fontName='Helvetica',
        leading=12,
        alignment=TA_LEFT,
        wordWrap='CJK',
        splitLongWords=True,
    ))
    
    # Table Cell Bold
    styles.add(ParagraphStyle(
        name='ScheduleTableCellBold',
        fontSize=9,
        fontName='Helvetica-Bold',
        leading=12,
        alignment=TA_LEFT,
        wordWrap='CJK',
        splitLongWords=True,
    ))
    
    # Table Cell Center
    styles.add(ParagraphStyle(
        name='ScheduleTableCellCenter',
        fontSize=9,
        fontName='Helvetica',
        leading=12,
        alignment=TA_CENTER,
        wordWrap='CJK',
        splitLongWords=True,
    ))
    
    # Phase name style
    styles.add(ParagraphStyle(
        name='PhaseName',
        fontSize=8,
        fontName='Helvetica-Bold',
        textColor=TEXT_DARK,
        leading=10,
        alignment=TA_LEFT,
        wordWrap='CJK',
    ))
    
    # Status style
    styles.add(ParagraphStyle(
        name='StatusCell',
        fontSize=9,
        fontName='Helvetica-Bold',
        leading=12,
        alignment=TA_CENTER,
    ))
    
    return styles


def draw_cover_page(canvas_obj, doc, schedule, project):
    """Draw the cover page for Project Schedule - professional design"""
    c = canvas_obj
    width, height = A4
    
    # Get template settings
    template_settings = get_template_settings()
    cover_settings = get_cover_page_settings()
    company_info = get_pdf_company_info()
    logo_path = get_pdf_logo_path()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    
    # Get the design settings from PDF template for project_schedule
    report_design = get_report_design('project_schedule')
    design_id = report_design.get('design_id', 'design_1')
    design_color = report_design.get('design_color', '#0d9488')  # Teal default
    
    # Use design color from settings
    primary_color = colors.HexColor(design_color)
    dark_blue = PRIMARY_BLUE
    text_dark = colors.HexColor('#1a1a1a')
    
    # =====================================================
    # BACKGROUND - White
    # =====================================================
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # =====================================================
    # DECORATIVE DESIGN - Use template design settings
    # =====================================================
    if cover_settings.get('show_decorative_design', True):
        draw_decorative_design(c, width, height, design_id, design_color)
    
    # =====================================================
    # COMPANY LOGO - Top Left
    # =====================================================
    if cover_settings.get('show_logo', True) and logo_path and os.path.exists(logo_path):
        try:
            c.drawImage(logo_path, 35, height - 90, width=180, height=60, 
                       preserveAspectRatio=True, mask='auto')
        except Exception as e:
            print(f"Error drawing cover logo: {e}")
    
    # =====================================================
    # MAIN TITLE SECTION
    # =====================================================
    c.saveState()
    
    c.setFillColor(dark_blue)
    c.setFont('Helvetica-Bold', 38)
    title_text = 'Project Schedule'
    title_width = c.stringWidth(title_text, 'Helvetica-Bold', 38)
    c.drawString((width - title_width) / 2, height * 0.65, title_text)
    
    c.setFont('Helvetica-Bold', 38)
    title_text2 = 'Timeline Report'
    title_width2 = c.stringWidth(title_text2, 'Helvetica-Bold', 38)
    c.drawString((width - title_width2) / 2, height * 0.58, title_text2)
    
    # Subtitle with accent line (uses design color from settings)
    subtitle = 'Comprehensive Project Execution Timeline'
    subtitle_width = c.stringWidth(subtitle, 'Helvetica', 12)
    
    c.setStrokeColor(primary_color)
    c.setLineWidth(3)
    c.line((width - subtitle_width) / 2 - 15, height * 0.535, 
           (width + subtitle_width) / 2 + 15, height * 0.535)
    
    c.setFillColor(dark_blue)
    c.setFont('Helvetica', 12)
    c.drawString((width - subtitle_width) / 2, height * 0.51, subtitle)
    
    c.restoreState()
    
    # =====================================================
    # PROJECT INFORMATION BOX - Centered below title
    # =====================================================
    c.saveState()
    
    schedule_name = schedule.get('schedule_name', '')
    start_date = format_date_ddmmyyyy(schedule.get('start_date', ''))
    end_date = format_date_ddmmyyyy(schedule.get('end_date', ''))
    status = schedule.get('status', 'draft')
    
    # Get project info
    pid_no = project.get('pid_no', '') if project else ''
    client = project.get('client', '') if project else ''
    location = project.get('location', '') if project else ''
    
    # Info box
    box_width = 360
    box_height = 170
    box_x = (width - box_width) / 2
    box_y = height * 0.26
    
    # Light background box
    c.setFillColor(colors.Color(30/255, 58/255, 95/255, 0.04))
    c.roundRect(box_x, box_y, box_width, box_height, 8, fill=1, stroke=0)
    
    # Define consistent margins
    label_x = box_x + 15
    value_x = box_x + 130
    
    c.setFillColor(text_dark)
    y_offset = box_y + box_height - 22
    
    # PROJECT
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'PROJECT:')
    c.setFont('Helvetica', 9)
    display_name = schedule_name[:40] + '...' if len(schedule_name) > 40 else schedule_name
    c.drawString(value_x, y_offset, display_name)
    
    y_offset -= 20
    
    # PID NO
    if pid_no:
        c.setFont('Helvetica-Bold', 9)
        c.drawString(label_x, y_offset, 'PID NO:')
        c.setFont('Helvetica', 9)
        c.drawString(value_x, y_offset, pid_no)
        y_offset -= 20
    
    # CLIENT
    if client:
        c.setFont('Helvetica-Bold', 9)
        c.drawString(label_x, y_offset, 'CLIENT:')
        c.setFont('Helvetica', 8)
        display_client = client[:35] + '...' if len(client) > 35 else client
        c.drawString(value_x, y_offset, display_client)
        y_offset -= 20
    
    # LOCATION
    if location:
        c.setFont('Helvetica-Bold', 9)
        c.drawString(label_x, y_offset, 'LOCATION:')
        c.setFont('Helvetica', 8)
        display_loc = location[:35] + '...' if len(location) > 35 else location
        c.drawString(value_x, y_offset, display_loc)
        y_offset -= 20
    
    # DURATION
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'DURATION:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, f"{start_date} to {end_date}")
    
    y_offset -= 24
    
    # STATUS - with colored badge
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(text_dark)
    c.drawString(label_x, y_offset, 'STATUS:')
    
    # Draw status badge
    status_text = status.upper().replace('_', ' ')
    status_color = STATUS_COLORS.get(status, STATUS_COLORS['draft'])
    status_bg = STATUS_BG_COLORS.get(status, STATUS_BG_COLORS['draft'])
    status_width = c.stringWidth(status_text, 'Helvetica-Bold', 9) + 16
    
    # Badge background
    c.setFillColor(status_bg)
    c.roundRect(value_x - 4, y_offset - 4, status_width, 16, 4, fill=1, stroke=0)
    
    # Badge text
    c.setFillColor(status_color)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(value_x + 4, y_offset, status_text)
    
    c.restoreState()
    
    # =====================================================
    # SUBMITTED BY SECTION - Bottom Right
    # =====================================================
    if cover_settings.get('show_submitted_by', True):
        c.saveState()
        
        submit_x = width - 250
        submit_y = 130
        
        c.setFillColor(dark_blue)
        c.setFont('Helvetica', 9)
        c.drawString(submit_x, submit_y, 'Prepared By')
        
        c.setFont('Helvetica-Bold', 13)
        c.drawString(submit_x, submit_y - 18, company_name)
        
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont('Helvetica', 7)
        
        address_line1 = company_info.get('address_line1', '')
        city = company_info.get('city', '')
        state = company_info.get('state', '')
        postal_code = company_info.get('postal_code', '')
        
        y_addr = submit_y - 32
        if address_line1:
            c.drawString(submit_x, y_addr, address_line1)
            y_addr -= 10
        if city or state:
            c.drawString(submit_x, y_addr, f"{city}, {state} - {postal_code}".strip(' -'))
            y_addr -= 14
        
        c.setFillColor(colors.HexColor('#666666'))
        c.setFont('Helvetica-Oblique', 6)
        c.drawString(submit_x, y_addr, '(An ISO 9001:2015, ISO 45001:2018 certified company)')
        
        c.restoreState()


def draw_header_footer(canvas_obj, doc, schedule, page_num, is_landscape=False):
    """Draw header and footer for all pages except cover"""
    c = canvas_obj
    if is_landscape:
        width, height = landscape(A4)
    else:
        width, height = A4
    margin = 40
    
    # Get template settings
    hf_settings = get_header_footer_settings()
    logo_path = get_pdf_logo_path()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    dark_blue = PRIMARY_BLUE
    
    # Get design color from template settings
    report_design = get_report_design('project_schedule')
    design_color = report_design.get('design_color', '#0d9488')
    primary_color = colors.HexColor(design_color)
    
    if page_num <= 1:
        # Cover page - only footer
        footer_y = 25
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        c.setFont('Helvetica-Bold', 7)
        c.setFillColor(colors.HexColor('#333333'))
        c.drawString(margin, footer_y + 5, company_name)
        
        c.setFont('Helvetica', 8)
        c.setFillColor(primary_color)
        c.drawCentredString(width / 2, footer_y + 5, website)
        return
    
    # ============ HEADER (Page 2+) ============
    header_y = height - 30
    
    # Draw logo on right side
    if hf_settings.get('show_header_logo', True) and logo_path and os.path.exists(logo_path):
        logo_width = 100
        logo_height = 35
        try:
            c.drawImage(logo_path, width - margin - logo_width, header_y - 20, 
                       width=logo_width, height=logo_height, preserveAspectRatio=True, mask='auto')
        except Exception as e:
            print(f"Error drawing logo: {e}")
    
    # Report title on left
    if hf_settings.get('show_header', True):
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(dark_blue)
        c.drawString(margin, header_y - 5, 'PROJECT SCHEDULE TIMELINE')
        
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.HexColor('#666666'))
        schedule_name = schedule.get('schedule_name', '')[:50]
        c.drawString(margin, header_y - 18, f"Project: {schedule_name}")
        
        # Header line - uses design color from settings
        if hf_settings.get('show_header_line', True):
            c.setStrokeColor(primary_color)
            c.setLineWidth(2)
            c.line(margin, header_y - 28, width - margin, header_y - 28)
    
    # ============ FOOTER ============
    if hf_settings.get('show_footer', True):
        footer_y = 25
        
        if hf_settings.get('show_footer_line', True):
            c.setStrokeColor(primary_color)
            c.setLineWidth(2)
            c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        if hf_settings.get('footer_company_name', True):
            c.setFont('Helvetica-Bold', 7)
            c.setFillColor(colors.HexColor('#333333'))
            c.drawString(margin, footer_y + 5, company_name)
        
        if hf_settings.get('footer_website', True):
            c.setFont('Helvetica', 8)
            c.setFillColor(primary_color)
            c.drawCentredString(width / 2, footer_y + 5, website)
        
        if hf_settings.get('show_page_numbers', True):
            c.setFont('Helvetica', 7)
            c.setFillColor(colors.HexColor('#666666'))
            c.drawRightString(width - margin, footer_y + 5, f'Page {page_num - 1}')


def draw_landscape_header_footer(canvas_obj, doc, schedule, page_num):
    """Draw header and footer for landscape pages (Gantt chart)"""
    draw_header_footer(canvas_obj, doc, schedule, page_num, is_landscape=True)


def parse_date(date_str):
    """Parse date string to datetime object"""
    if not date_str:
        return None
    
    date_str = str(date_str).strip()
    
    # Try DD/MM/YYYY format
    if '/' in date_str:
        try:
            parts = date_str.split('/')
            if len(parts) == 3:
                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                return datetime(year, month, day)
        except Exception:
            pass
    
    # Try DD-MM-YYYY format
    if '-' in date_str and len(date_str) == 10:
        try:
            parts = date_str.split('-')
            if len(parts) == 3:
                if len(parts[0]) == 4:  # YYYY-MM-DD
                    return datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                else:  # DD-MM-YYYY
                    return datetime(int(parts[2]), int(parts[1]), int(parts[0]))
        except Exception:
            pass
    
    # Try ISO format
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00').split('T')[0])
    except Exception:
        pass
    
    return None


def format_date_display(date_str):
    """Format any date string to DD-MM-YYYY format for display"""
    if not date_str:
        return ''
    
    # If already in DD-MM-YYYY format, return as is
    if isinstance(date_str, str) and len(date_str) == 10:
        parts = date_str.split('-')
        if len(parts) == 3 and len(parts[0]) == 2:
            return date_str  # Already DD-MM-YYYY
    
    # Parse and reformat
    parsed = parse_date(date_str)
    if parsed:
        return parsed.strftime('%d-%m-%Y')
    
    return str(date_str)


def create_status_paragraph(status, styles):
    """Create a styled status paragraph with background color indicator"""
    status_text = status.upper().replace('_', ' ')
    status_color = STATUS_COLORS.get(status, STATUS_COLORS['draft'])
    
    # Create colored status text
    hex_color = '#{:02x}{:02x}{:02x}'.format(
        int(status_color.red * 255),
        int(status_color.green * 255),
        int(status_color.blue * 255)
    )
    return Paragraph(f'<font color="{hex_color}"><b>{status_text}</b></font>', styles['ScheduleTableCellCenter'])


def generate_project_schedule_pdf(schedule_data, project_data=None):
    """Generate a comprehensive Project Schedule PDF report"""
    
    buffer = BytesIO()
    
    # Use portrait A4 for cover and info pages
    page_width, page_height = A4
    landscape_width, landscape_height = landscape(A4)
    
    styles = get_schedule_styles()
    
    # Create the PDF document with multiple page templates
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=60,
        bottomMargin=50
    )
    
    # Define frames for portrait and landscape
    portrait_frame = Frame(
        40, 50, page_width - 80, page_height - 110,
        id='portrait_frame'
    )
    
    landscape_frame = Frame(
        40, 50, landscape_width - 80, landscape_height - 110,
        id='landscape_frame'
    )
    
    page_num = [1]
    
    def on_page_portrait(canvas_obj, doc):
        draw_header_footer(canvas_obj, doc, schedule_data, page_num[0], is_landscape=False)
        page_num[0] += 1
    
    def on_first_page(canvas_obj, doc):
        draw_cover_page(canvas_obj, doc, schedule_data, project_data)
        draw_header_footer(canvas_obj, doc, schedule_data, 1, is_landscape=False)
    
    def on_page_landscape(canvas_obj, doc):
        draw_header_footer(canvas_obj, doc, schedule_data, page_num[0], is_landscape=True)
        page_num[0] += 1
    
    # Create page templates
    portrait_template = PageTemplate(
        id='Portrait',
        frames=[portrait_frame],
        onPage=on_page_portrait,
        pagesize=A4
    )
    
    first_page_template = PageTemplate(
        id='First',
        frames=[portrait_frame],
        onPage=on_first_page,
        pagesize=A4
    )
    
    landscape_template = PageTemplate(
        id='Landscape',
        frames=[landscape_frame],
        onPage=on_page_landscape,
        pagesize=landscape(A4)
    )
    
    doc.addPageTemplates([first_page_template, portrait_template, landscape_template])
    
    elements = []
    
    # =====================================================
    # PAGE 1: COVER PAGE (handled by on_first_page)
    # =====================================================
    elements.append(NextPageTemplate('Portrait'))
    elements.append(PageBreak())
    
    # =====================================================
    # PAGE 2: PROJECT INFORMATION
    # =====================================================
    # Section header
    section_header_data = [['PROJECT INFORMATION']]
    section_table = Table(section_header_data, colWidths=[page_width - 80])
    section_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(section_table)
    elements.append(Spacer(1, 12))
    
    # Project details table - ALL cells use Paragraph for proper wrapping
    schedule_name = schedule_data.get('schedule_name', '-')
    start_date = format_date_ddmmyyyy(schedule_data.get('start_date', ''))
    end_date = format_date_ddmmyyyy(schedule_data.get('end_date', ''))
    status = schedule_data.get('status', 'draft')
    notes = schedule_data.get('notes', '')
    
    pid_no = project_data.get('pid_no', '-') if project_data else '-'
    client = project_data.get('client', '-') if project_data else '-'
    location = project_data.get('location', '-') if project_data else '-'
    engineer = project_data.get('engineer_in_charge', '-') if project_data else '-'
    po_number = project_data.get('po_number', '-') if project_data else '-'
    
    # Two-column layout for project info
    col_width = (page_width - 80) / 2
    
    info_data = [
        [Paragraph('<b>Project Name:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(schedule_name, styles['ScheduleTableCell']),
         Paragraph('<b>PID No:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(pid_no, styles['ScheduleTableCell'])],
        [Paragraph('<b>Client:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(client, styles['ScheduleTableCell']),
         Paragraph('<b>Location:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(location, styles['ScheduleTableCell'])],
        [Paragraph('<b>Start Date:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(start_date, styles['ScheduleTableCell']),
         Paragraph('<b>End Date:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(end_date, styles['ScheduleTableCell'])],
        [Paragraph('<b>Engineer In-Charge:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(engineer, styles['ScheduleTableCell']),
         Paragraph('<b>PO Number:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(po_number, styles['ScheduleTableCell'])],
        [Paragraph('<b>Status:</b>', styles['ScheduleTableCellBold']), 
         create_status_paragraph(status, styles),
         '', ''],
    ]
    
    info_table = Table(info_data, colWidths=[80, col_width - 80, 80, col_width - 80])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f9fafb')),
        # Add status cell background
        ('BACKGROUND', (1, 4), (1, 4), STATUS_BG_COLORS.get(status, STATUS_BG_COLORS['draft'])),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # =====================================================
    # CUSTOMER INFORMATION SECTION
    # =====================================================
    customer_info = schedule_data.get('customer_info', {})
    
    # Get customer info from either customer_info object or project data
    customer_name = customer_info.get('name', '') or (project_data.get('client', '') if project_data else '')
    customer_company = customer_info.get('company', '') or customer_name
    customer_location = customer_info.get('location', '') or (project_data.get('location', '') if project_data else '')
    customer_contact = customer_info.get('contact_person', '')
    customer_phone = customer_info.get('phone', '')
    customer_email = customer_info.get('email', '')
    
    if customer_name or customer_company or customer_location:
        customer_header_data = [['CUSTOMER INFORMATION']]
        customer_header_table = Table(customer_header_data, colWidths=[page_width - 80])
        customer_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#6366f1')),  # Indigo
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(customer_header_table)
        elements.append(Spacer(1, 12))
        
        customer_data = [
            [Paragraph('<b>Customer Name:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_name or '-', styles['ScheduleTableCell']),
             Paragraph('<b>Company:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_company or '-', styles['ScheduleTableCell'])],
            [Paragraph('<b>Location:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_location or '-', styles['ScheduleTableCell']),
             Paragraph('<b>Contact Person:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_contact or '-', styles['ScheduleTableCell'])],
            [Paragraph('<b>Phone:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_phone or '-', styles['ScheduleTableCell']),
             Paragraph('<b>Email:</b>', styles['ScheduleTableCellBold']), 
             Paragraph(customer_email or '-', styles['ScheduleTableCell'])],
        ]
        
        customer_table = Table(customer_data, colWidths=[80, col_width - 80, 80, col_width - 80])
        customer_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eef2ff')),  # Light indigo
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#eef2ff')),
        ]))
        elements.append(customer_table)
        elements.append(Spacer(1, 20))
    
    # =====================================================
    # SERVICE PROVIDER SECTION
    # =====================================================
    provider_header_data = [['SERVICE PROVIDER']]
    provider_header_table = Table(provider_header_data, colWidths=[page_width - 80])
    provider_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), TEAL_ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(provider_header_table)
    elements.append(Spacer(1, 12))
    
    company_info_data = get_pdf_company_info()
    company_name = get_pdf_company_name()
    
    # Helper to safely get string values (handle None)
    def safe_str(val, default=''):
        return str(val) if val else default
    
    provider_data = [
        [Paragraph('<b>Company:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(safe_str(company_name), styles['ScheduleTableCell']),
         Paragraph('<b>Website:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(safe_str(company_info_data.get('website'), 'www.enerzia.com'), styles['ScheduleTableCell'])],
        [Paragraph('<b>Address:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(f"{safe_str(company_info_data.get('address_line1'))}, {safe_str(company_info_data.get('city'))}, {safe_str(company_info_data.get('state'))}".strip(', '), styles['ScheduleTableCell']),
         Paragraph('<b>Phone:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(safe_str(company_info_data.get('phone')), styles['ScheduleTableCell'])],
        [Paragraph('<b>GST No:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(safe_str(company_info_data.get('gst_number')), styles['ScheduleTableCell']),
         Paragraph('<b>Email:</b>', styles['ScheduleTableCellBold']), 
         Paragraph(safe_str(company_info_data.get('email')), styles['ScheduleTableCell'])],
    ]
    
    provider_table = Table(provider_data, colWidths=[80, col_width - 80, 80, col_width - 80])
    provider_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0fdfa')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f0fdfa')),
    ]))
    elements.append(provider_table)
    elements.append(Spacer(1, 20))
    
    # Notes section if available
    if notes:
        notes_header = [['PROJECT NOTES']]
        notes_header_table = Table(notes_header, colWidths=[page_width - 80])
        notes_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#475569')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(notes_header_table)
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(notes, styles['ScheduleBodyText']))
        elements.append(Spacer(1, 15))
    
    # =====================================================
    # SWITCH TO LANDSCAPE FOR PHASES, SUB-ITEMS, MILESTONES
    # =====================================================
    phases = schedule_data.get('phases', [])
    
    if phases:
        elements.append(NextPageTemplate('Landscape'))
        elements.append(PageBreak())
        
        # Use landscape width for all tables in this section
        land_col_width = (landscape_width - 80) / 2
        
        phases_header_data = [['PROJECT PHASES & TIMELINE']]
        phases_header_table = Table(phases_header_data, colWidths=[landscape_width - 80])
        phases_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(phases_header_table)
        elements.append(Spacer(1, 12))
        
        # Phases detail table - ALL cells use Paragraph for wrapping - LANDSCAPE widths
        phase_headers = [
            Paragraph('<b>S.No</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>Phase Name</b>', styles['ScheduleTableCellBold']),
            Paragraph('<b>Start Date</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>End Date</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>Progress</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>Status</b>', styles['ScheduleTableCellCenter'])
        ]
        phase_rows = [phase_headers]
        
        for idx, phase in enumerate(phases, 1):
            phase_name = phase.get('name', '')
            phase_start = format_date_ddmmyyyy(phase.get('start', ''))
            phase_end = format_date_ddmmyyyy(phase.get('end', ''))
            progress = phase.get('progress', 0)
            
            # Determine status based on progress
            if progress >= 100:
                phase_status = 'Completed'
                status_style = '<font color="#166534"><b>Completed</b></font>'
            elif progress > 0:
                phase_status = 'In Progress'
                status_style = '<font color="#1d4ed8"><b>In Progress</b></font>'
            else:
                phase_status = 'Pending'
                status_style = '<font color="#92400e"><b>Pending</b></font>'
            
            phase_rows.append([
                Paragraph(str(idx), styles['ScheduleTableCellCenter']),
                Paragraph(phase_name, styles['ScheduleTableCell']),
                Paragraph(phase_start, styles['ScheduleTableCellCenter']),
                Paragraph(phase_end, styles['ScheduleTableCellCenter']),
                Paragraph(f"{progress}%", styles['ScheduleTableCellCenter']),
                Paragraph(status_style, styles['ScheduleTableCellCenter'])
            ])
        
        # Landscape column widths - more space for phase name
        phase_col_widths = [40, 350, 90, 90, 70, 100]
        phase_table = Table(phase_rows, colWidths=phase_col_widths)
        
        phase_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), TEAL_ACCENT),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        
        # Add alternating row colors and status highlighting
        for row_idx, phase in enumerate(phases, 1):
            progress = phase.get('progress', 0)
            if progress >= 100:
                phase_styles.append(('BACKGROUND', (5, row_idx), (5, row_idx), colors.HexColor('#dcfce7')))
            elif progress > 0:
                phase_styles.append(('BACKGROUND', (5, row_idx), (5, row_idx), colors.HexColor('#dbeafe')))
            else:
                phase_styles.append(('BACKGROUND', (5, row_idx), (5, row_idx), colors.HexColor('#fef3c7')))
            
            if row_idx % 2 == 0:
                phase_styles.append(('BACKGROUND', (0, row_idx), (4, row_idx), colors.HexColor('#f9fafb')))
        
        phase_table.setStyle(TableStyle(phase_styles))
        elements.append(phase_table)
        elements.append(Spacer(1, 25))
        
        # =====================================================
        # PHASE SUB-ITEMS / DETAILS (LANDSCAPE)
        # =====================================================
        phases_with_subitems = [p for p in phases if p.get('subItems') and len(p.get('subItems', [])) > 0]
        
        if phases_with_subitems:
            subitems_header_data = [['PHASE BREAKDOWN & DETAILS']]
            subitems_header_table = Table(subitems_header_data, colWidths=[landscape_width - 80])
            subitems_header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0891b2')),  # Cyan
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(subitems_header_table)
            elements.append(Spacer(1, 12))
            
            for phase in phases_with_subitems:
                # Phase name sub-header with dates - FORMAT dates to DD-MM-YYYY
                phase_name = phase.get('name', 'Phase')
                phase_start = phase.get('start', '') or phase.get('start_date', '')
                phase_end = phase.get('end', '') or phase.get('end_date', '')
                formatted_phase_start = format_date_display(phase_start) if phase_start else ''
                formatted_phase_end = format_date_display(phase_end) if phase_end else ''
                phase_dates = f" ({formatted_phase_start} to {formatted_phase_end})" if formatted_phase_start and formatted_phase_end else ""
                phase_subheader = [[Paragraph(f"<b>{phase_name}</b>{phase_dates}", styles['ScheduleTableCell'])]]
                phase_subheader_table = Table(phase_subheader, colWidths=[landscape_width - 80])
                phase_subheader_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e0f2fe')),  # Light cyan
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ]))
                elements.append(phase_subheader_table)
                
                # Sub-items table - LANDSCAPE widths with dates
                sub_headers = [
                    Paragraph('<b>S.No</b>', styles['ScheduleTableCellCenter']),
                    Paragraph('<b>Description</b>', styles['ScheduleTableCellBold']),
                    Paragraph('<b>Qty</b>', styles['ScheduleTableCellCenter']),
                    Paragraph('<b>Unit</b>', styles['ScheduleTableCellCenter']),
                    Paragraph('<b>Start Date</b>', styles['ScheduleTableCellCenter']),
                    Paragraph('<b>End Date</b>', styles['ScheduleTableCellCenter'])
                ]
                sub_rows = [sub_headers]
                
                for idx, item in enumerate(phase.get('subItems', []), 1):
                    # Format sub-item dates to DD-MM-YYYY
                    sub_start = item.get('start_date', '') or item.get('start', '')
                    sub_end = item.get('end_date', '') or item.get('end', '')
                    formatted_sub_start = format_date_display(sub_start) if sub_start else '-'
                    formatted_sub_end = format_date_display(sub_end) if sub_end else '-'
                    
                    sub_rows.append([
                        Paragraph(str(idx), styles['ScheduleTableCellCenter']),
                        Paragraph(item.get('description', '-') or '-', styles['ScheduleTableCell']),
                        Paragraph(str(item.get('qty', '') or item.get('quantity', '-') or '-'), styles['ScheduleTableCellCenter']),
                        Paragraph(item.get('unit', '-') or '-', styles['ScheduleTableCellCenter']),
                        Paragraph(formatted_sub_start, styles['ScheduleTableCellCenter']),
                        Paragraph(formatted_sub_end, styles['ScheduleTableCellCenter'])
                    ])
                
                # Landscape sub-items column widths - adjusted for dates
                sub_col_widths = [35, 320, 60, 50, 130, 130]
                sub_table = Table(sub_rows, colWidths=sub_col_widths)
                sub_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0e7490')),  # Darker cyan
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                elements.append(sub_table)
                elements.append(Spacer(1, 10))
            
            elements.append(Spacer(1, 15))
        
        # =====================================================
        # GANTT CHART - DAY-WISE WITH PAGINATION
        # Start on a NEW PAGE after Phase Breakdown
        # =====================================================
        project_start = parse_date(schedule_data.get('start_date', ''))
        project_end = parse_date(schedule_data.get('end_date', ''))
        
        if project_start and project_end:
            total_days = (project_end - project_start).days + 1  # Include end date
            if total_days > 0:
                # Max days per page (landscape can fit about 25-30 day columns)
                max_days_per_page = 25
                num_pages = math.ceil(total_days / max_days_per_page)
                
                for page_idx in range(num_pages):
                    # Always start Gantt chart on a new page
                    elements.append(PageBreak())
                    
                    elements.append(Spacer(1, 20))
                    
                    # Calculate date range for this page
                    page_start_day = page_idx * max_days_per_page
                    page_end_day = min((page_idx + 1) * max_days_per_page, total_days)
                    num_days_this_page = page_end_day - page_start_day
                    
                    page_start_date = project_start + timedelta(days=page_start_day)
                    page_end_date = project_start + timedelta(days=page_end_day - 1)
                    
                    # Header with page info if multiple pages
                    if num_pages > 1:
                        header_text = f'TIMELINE VISUALIZATION (GANTT CHART) - Page {page_idx + 1}/{num_pages}'
                    else:
                        header_text = 'TIMELINE VISUALIZATION (GANTT CHART)'
                    
                    gantt_header_data = [[header_text]]
                    gantt_header_table = Table(gantt_header_data, colWidths=[landscape_width - 80])
                    gantt_header_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 11),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ]))
                    elements.append(gantt_header_table)
                    elements.append(Spacer(1, 15))
                    
                    # Build Gantt header row with daily date labels
                    gantt_headers = [Paragraph('<font color="white"><b>Phase / Sub-Item</b></font>', styles['ScheduleTableCellBold'])]
                    current_date = page_start_date
                    for d in range(num_days_this_page):
                        # Show date as DD/MM format
                        day_str = current_date.strftime('%d/%m')
                        gantt_headers.append(Paragraph(f'<font color="white"><b>{day_str}</b></font>', styles['ScheduleTableCellCenter']))
                        current_date += timedelta(days=1)
                    
                    gantt_data = [gantt_headers]
                    row_types = []  # Track if row is 'phase' or 'subitem'
                    
                    # Add phase rows with their sub-items
                    for idx, phase in enumerate(phases):
                        phase_name = phase.get('name', '')[:30]
                        phase_start_str = phase.get('start', '') or phase.get('start_date', '')
                        phase_end_str = phase.get('end', '') or phase.get('end_date', '')
                        progress = phase.get('progress', 0)
                        
                        # Phase name with progress
                        row = [Paragraph(f"<b>{phase_name}</b><br/><font size='7' color='#1e40af'>{progress}%</font>", styles['PhaseName'])]
                        
                        # Empty cells for days - color will be applied via TableStyle
                        for d in range(num_days_this_page):
                            row.append('')
                        
                        gantt_data.append(row)
                        row_types.append(('phase', idx))
                        
                        # Add sub-items for this phase
                        sub_items = phase.get('subItems', [])
                        for sub_idx, sub_item in enumerate(sub_items):
                            sub_desc = sub_item.get('description', f'Sub-item {sub_idx + 1}')[:35]
                            sub_qty = sub_item.get('qty', '') or sub_item.get('quantity', '')
                            sub_unit = sub_item.get('unit', '')
                            qty_str = f" ({sub_qty} {sub_unit})" if sub_qty else ""
                            
                            sub_row = [Paragraph(f"<font size='7'>{sub_desc}</font>{qty_str}", styles['ScheduleTableCell'])]
                            
                            for d in range(num_days_this_page):
                                sub_row.append('')
                            
                            gantt_data.append(sub_row)
                            row_types.append(('subitem', idx))
                    
                    # Calculate column widths for landscape - day columns
                    # Use fixed width based on max_days_per_page for consistency across all pages
                    phase_col_width = 180
                    available_width = landscape_width - 80 - phase_col_width
                    day_col_width = available_width / max_days_per_page  # Fixed width for all pages
                    gantt_col_widths = [phase_col_width] + [day_col_width] * num_days_this_page
                    
                    # Calculate row heights
                    row_heights = [28]  # Header
                    for rt in row_types:
                        if rt[0] == 'phase':
                            row_heights.append(36)
                        else:
                            row_heights.append(26)
                    
                    gantt_table = Table(gantt_data, colWidths=gantt_col_widths, rowHeights=row_heights)
                    
                    gantt_styles = [
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),  # Dark blue header
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 7),
                        ('FONTSIZE', (0, 1), (-1, -1), 7),
                        ('TOPPADDING', (0, 0), (-1, -1), 4),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                        ('LEFTPADDING', (0, 0), (-1, -1), 3),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]
                    
                    # Color the phase and sub-item bars based on date overlap
                    data_row_idx = 1  # Start after header
                    for row_info in row_types:
                        row_type, phase_idx = row_info
                        phase = phases[phase_idx]
                        color = PHASE_COLORS[phase_idx % len(PHASE_COLORS)]
                        
                        if row_type == 'phase':
                            gantt_styles.append(('BACKGROUND', (0, data_row_idx), (0, data_row_idx), colors.HexColor('#f1f5f9')))
                            phase_start_date = parse_date(phase.get('start', '')) or parse_date(phase.get('start_date', ''))
                            phase_end_date = parse_date(phase.get('end', '')) or parse_date(phase.get('end_date', ''))
                            
                            # If no dates, try to infer from sub-items
                            if not phase_start_date or not phase_end_date:
                                sub_items = phase.get('subItems', [])
                                for sub in sub_items:
                                    sub_s = parse_date(sub.get('start_date', '')) or parse_date(sub.get('start', ''))
                                    sub_e = parse_date(sub.get('end_date', '')) or parse_date(sub.get('end', ''))
                                    if sub_s and (not phase_start_date or sub_s < phase_start_date):
                                        phase_start_date = sub_s
                                    if sub_e and (not phase_end_date or sub_e > phase_end_date):
                                        phase_end_date = sub_e
                            
                            # Color cells for days that fall within phase dates
                            for col_idx in range(1, num_days_this_page + 1):
                                cell_date = page_start_date + timedelta(days=(col_idx - 1))
                                
                                if phase_start_date and phase_end_date:
                                    if phase_start_date <= cell_date <= phase_end_date:
                                        gantt_styles.append(('BACKGROUND', (col_idx, data_row_idx), (col_idx, data_row_idx), color))
                        else:
                            # Sub-item row
                            gantt_styles.append(('BACKGROUND', (0, data_row_idx), (0, data_row_idx), colors.HexColor('#f8fafc')))
                            
                            # Get sub-item from phase
                            sub_items = phase.get('subItems', [])
                            sub_count = sum(1 for r in row_types[:data_row_idx] if r[0] == 'subitem' and r[1] == phase_idx)
                            if sub_count > 0 and sub_count <= len(sub_items):
                                sub_item = sub_items[sub_count - 1]
                                sub_start = parse_date(sub_item.get('start_date', '')) or parse_date(sub_item.get('start', ''))
                                sub_end = parse_date(sub_item.get('end_date', '')) or parse_date(sub_item.get('end', ''))
                                
                                # Lighter color for sub-items
                                lighter_color = colors.HexColor(
                                    '#{:02x}{:02x}{:02x}'.format(
                                        min(255, int(color.red * 255 * 0.6 + 100)),
                                        min(255, int(color.green * 255 * 0.6 + 100)),
                                        min(255, int(color.blue * 255 * 0.6 + 100))
                                    )
                                )
                                
                                for col_idx in range(1, num_days_this_page + 1):
                                    cell_date = page_start_date + timedelta(days=(col_idx - 1))
                                    
                                    if sub_start and sub_end:
                                        if sub_start <= cell_date <= sub_end:
                                            gantt_styles.append(('BACKGROUND', (col_idx, data_row_idx), (col_idx, data_row_idx), lighter_color))
                        
                        data_row_idx += 1
                    
                    gantt_table.setStyle(TableStyle(gantt_styles))
                    elements.append(gantt_table)
                    elements.append(Spacer(1, 10))
                
                # Legend with color samples
                legend_text = "<b>Legend:</b> Darker colored blocks represent phase timelines. Lighter blocks represent sub-item/task timelines within each phase."
                elements.append(Paragraph(legend_text, styles['ScheduleBodyText']))
    
    # =====================================================
    # MILESTONES SECTION (LANDSCAPE)
    # =====================================================
    milestones = schedule_data.get('milestones', [])
    
    if milestones:
        elements.append(Spacer(1, 25))
        
        milestones_header_data = [['KEY MILESTONES']]
        milestones_header_table = Table(milestones_header_data, colWidths=[landscape_width - 80])
        milestones_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#7c3aed')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(milestones_header_table)
        elements.append(Spacer(1, 12))
        
        milestone_headers = [
            Paragraph('<b>S.No</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>Milestone</b>', styles['ScheduleTableCellBold']),
            Paragraph('<b>Target Date</b>', styles['ScheduleTableCellCenter']),
            Paragraph('<b>Status</b>', styles['ScheduleTableCellCenter'])
        ]
        milestone_rows = [milestone_headers]
        
        for idx, milestone in enumerate(milestones, 1):
            name = milestone.get('name', '')
            date = format_date_ddmmyyyy(milestone.get('date', ''))
            completed = milestone.get('completed', False)
            if completed:
                status_html = '<font color="#166534"><b>Completed ✓</b></font>'
            else:
                status_html = '<font color="#92400e"><b>Pending</b></font>'
            
            milestone_rows.append([
                Paragraph(str(idx), styles['ScheduleTableCellCenter']),
                Paragraph(name, styles['ScheduleTableCell']),
                Paragraph(date, styles['ScheduleTableCellCenter']),
                Paragraph(status_html, styles['ScheduleTableCellCenter'])
            ])
        
        # Landscape milestone column widths
        milestone_col_widths = [50, 450, 120, 120]
        milestone_table = Table(milestone_rows, colWidths=milestone_col_widths)
        
        milestone_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        
        # Status cell colors
        for row_idx, milestone in enumerate(milestones, 1):
            completed = milestone.get('completed', False)
            if completed:
                milestone_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#dcfce7')))
            else:
                milestone_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#fef3c7')))
        
        milestone_table.setStyle(TableStyle(milestone_styles))
        elements.append(milestone_table)
    
    # =====================================================
    # SUMMARY SECTION - SWITCH TO PORTRAIT MODE
    # =====================================================
    elements.append(NextPageTemplate('Portrait'))
    elements.append(PageBreak())
    
    summary_header_data = [['SCHEDULE SUMMARY']]
    summary_header_table = Table(summary_header_data, colWidths=[page_width - 80])
    summary_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_header_table)
    elements.append(Spacer(1, 12))
    
    # Calculate summary stats
    total_phases = len(phases)
    completed_phases = len([p for p in phases if p.get('progress', 0) >= 100])
    in_progress_phases = len([p for p in phases if 0 < p.get('progress', 0) < 100])
    pending_phases = len([p for p in phases if p.get('progress', 0) == 0])
    avg_progress = sum(p.get('progress', 0) for p in phases) / total_phases if total_phases > 0 else 0
    
    total_milestones = len(milestones)
    completed_milestones = len([m for m in milestones if m.get('completed', False)])
    
    # Create styled status for overall status
    overall_status_html = create_status_paragraph(status, styles)
    
    summary_data = [
        [Paragraph('<b>Total Phases</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(total_phases), styles['ScheduleTableCellCenter']), 
         Paragraph('<b>Completed Phases</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(completed_phases), styles['ScheduleTableCellCenter'])],
        [Paragraph('<b>In Progress</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(in_progress_phases), styles['ScheduleTableCellCenter']), 
         Paragraph('<b>Pending Phases</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(pending_phases), styles['ScheduleTableCellCenter'])],
        [Paragraph('<b>Average Progress</b>', styles['ScheduleTableCellBold']), 
         Paragraph(f"{avg_progress:.0f}%", styles['ScheduleTableCellCenter']), 
         Paragraph('<b>Overall Status</b>', styles['ScheduleTableCellBold']), 
         overall_status_html],
        [Paragraph('<b>Total Milestones</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(total_milestones), styles['ScheduleTableCellCenter']), 
         Paragraph('<b>Milestones Completed</b>', styles['ScheduleTableCellBold']), 
         Paragraph(str(completed_milestones), styles['ScheduleTableCellCenter'])],
    ]
    
    # Portrait summary table column widths
    summary_table = Table(summary_data, colWidths=[120, 100, 120, 100])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0fdfa')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f0fdfa')),
        # Status cell background
        ('BACKGROUND', (3, 2), (3, 2), STATUS_BG_COLORS.get(status, STATUS_BG_COLORS['draft'])),
    ]))
    elements.append(summary_table)
    
    # =====================================================
    # PROJECT ESCALATION MATRIX
    # =====================================================
    escalation_matrix = schedule_data.get('escalation_matrix', [])
    
    # Filter out empty entries
    valid_escalation = [e for e in escalation_matrix if e.get('name') or e.get('designation')]
    
    if valid_escalation:
        elements.append(Spacer(1, 25))
        
        escalation_header_data = [['PROJECT ESCALATION MATRIX']]
        escalation_header_table = Table(escalation_header_data, colWidths=[page_width - 80])
        escalation_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#dc2626')),  # Red for escalation
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(escalation_header_table)
        elements.append(Spacer(1, 12))
        
        # Build escalation table - two-column layout
        escalation_data = []
        
        level_colors = {
            1: colors.HexColor('#3b82f6'),   # Blue - Level 1
            2: colors.HexColor('#f59e0b'),   # Amber - Level 2
            3: colors.HexColor('#f97316'),   # Orange - Level 3
            4: colors.HexColor('#dc2626'),   # Red - Level 4
        }
        
        level_bg_colors = {
            1: colors.HexColor('#dbeafe'),
            2: colors.HexColor('#fef3c7'),
            3: colors.HexColor('#ffedd5'),
            4: colors.HexColor('#fee2e2'),
        }
        
        for entry in valid_escalation:
            level = entry.get('level', 1)
            name = entry.get('name', '-')
            designation = entry.get('designation', '-')
            email = entry.get('email', '-')
            mobile = entry.get('mobile', '-')
            
            # Get ordinal suffix
            ordinal = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th'}.get(level, f'{level}th')
            
            level_text = f"<b>{ordinal} ESCALATION LEVEL</b>"
            contact_info = f"<b>Name:</b> {name}<br/><b>Designation:</b> {designation}<br/><b>Email:</b> {email}<br/><b>Mobile:</b> {mobile}"
            
            escalation_data.append([
                Paragraph(level_text, styles['ScheduleTableCellBold']),
                Paragraph(contact_info, styles['ScheduleTableCell'])
            ])
        
        escalation_table = Table(escalation_data, colWidths=[140, page_width - 80 - 140])
        
        escalation_styles = [
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
        ]
        
        # Apply level-specific colors
        for idx, entry in enumerate(valid_escalation):
            level = entry.get('level', 1)
            bg_color = level_bg_colors.get(level, level_bg_colors[1])
            escalation_styles.append(('BACKGROUND', (0, idx), (0, idx), bg_color))
        
        escalation_table.setStyle(TableStyle(escalation_styles))
        elements.append(escalation_table)
    
    # =====================================================
    # FOOTER / SIGNATURE SECTION
    # =====================================================
    elements.append(Spacer(1, 40))
    
    generated_date = datetime.now().strftime('%d-%m-%Y %H:%M')
    elements.append(Paragraph(f"<i>Report generated on: {generated_date}</i>", styles['ScheduleBodyText']))
    
    # Build the PDF
    doc.build(elements)
    
    buffer.seek(0)
    return buffer


@router.post("/project-schedule/pdf")
async def generate_schedule_pdf_endpoint(schedule_data: dict):
    """Generate PDF for a project schedule from frontend data"""
    
    try:
        # Get project data if project_id is provided
        project_data = None
        project_id = schedule_data.get('project_id')
        
        if project_id:
            db = get_db()
            project_data = await db.projects.find_one({"id": project_id}, {"_id": 0})
        
        # Also check if project is embedded
        if not project_data and schedule_data.get('project'):
            project_data = schedule_data.get('project')
        
        # Generate the PDF
        pdf_buffer = generate_project_schedule_pdf(schedule_data, project_data)
        
        schedule_name = schedule_data.get('schedule_name', 'schedule')
        safe_name = "".join(c for c in schedule_name if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
        filename = f"Project_Schedule_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/project-schedule/{schedule_id}/pdf")
async def get_schedule_pdf_by_id(schedule_id: str):
    """Generate PDF for a stored project schedule by ID"""
    
    try:
        db = get_db()
        
        # Look for schedule in database (if stored)
        schedule_data = await db.project_schedules.find_one({"id": schedule_id}, {"_id": 0})
        
        if not schedule_data:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Get project data if linked
        project_data = None
        project_id = schedule_data.get('project_id')
        if project_id:
            project_data = await db.projects.find_one({"id": project_id}, {"_id": 0})
        
        # Generate the PDF
        pdf_buffer = generate_project_schedule_pdf(schedule_data, project_data)
        
        schedule_name = schedule_data.get('schedule_name', 'schedule')
        safe_name = "".join(c for c in schedule_name if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
        filename = f"Project_Schedule_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
