"""
PDF Base Module - Shared styles, colors, and utilities for all PDF reports.
This module consolidates common PDF generation code to reduce duplication.
"""
import io
import os
import base64
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import requests

import sys
sys.path.insert(0, '/app/backend')

from core.database import db

# Import PDF template settings functions
from routes.pdf_template_settings import (
    get_pdf_settings_sync,
    get_logo_path,
    get_primary_color,
    get_secondary_color,
    get_company_info,
    get_report_design,
    draw_decorative_design,
    DESIGN_OPTIONS,
    REPORT_TYPES,
    REPORT_TYPE_LABELS
)


# ============ TEMPLATE SETTINGS CACHE ============
_cached_settings = None
_cache_time = None
CACHE_DURATION = 60  # Cache for 60 seconds


def get_template_settings():
    """
    Get PDF template settings with caching to avoid repeated DB calls.
    Cache expires after 60 seconds.
    """
    global _cached_settings, _cache_time
    
    current_time = datetime.now(timezone.utc)
    
    # Return cached settings if valid
    if _cached_settings and _cache_time:
        elapsed = (current_time - _cache_time).total_seconds()
        if elapsed < CACHE_DURATION:
            return _cached_settings
    
    # Fetch fresh settings
    _cached_settings = get_pdf_settings_sync()
    _cache_time = current_time
    return _cached_settings


def get_pdf_logo_path():
    """Get logo path from template settings"""
    settings = get_template_settings()
    return get_logo_path(settings)


def get_pdf_primary_color():
    """Get primary color (orange accent) from template settings"""
    settings = get_template_settings()
    return get_primary_color(settings)


def get_pdf_secondary_color():
    """Get secondary color (green headers) from template settings"""
    settings = get_template_settings()
    return get_secondary_color(settings)


def get_pdf_company_info():
    """Get company information from template settings"""
    settings = get_template_settings()
    return get_company_info(settings)


def get_pdf_company_name():
    """Get company name from template settings"""
    info = get_pdf_company_info()
    return info.get('company_name', 'Enerzia Power Solutions')


def get_pdf_website():
    """Get website from template settings"""
    info = get_pdf_company_info()
    return info.get('website', 'www.enerzia.com')


def is_cover_page_enabled():
    """Check if cover page is enabled in template settings"""
    settings = get_template_settings()
    return settings.get('cover_page', {}).get('enabled', True)


def is_back_cover_enabled():
    """Check if back cover is enabled in template settings"""
    settings = get_template_settings()
    return settings.get('back_cover', {}).get('enabled', True)


def get_cover_page_settings():
    """Get cover page specific settings"""
    settings = get_template_settings()
    return settings.get('cover_page', {})


def get_back_cover_settings():
    """Get back cover specific settings"""
    settings = get_template_settings()
    return settings.get('back_cover', {})


def get_header_footer_settings():
    """Get header/footer specific settings"""
    settings = get_template_settings()
    return settings.get('header_footer', {})


# ============ DATE FORMAT UTILITY ============
def format_date_ddmmyyyy(date_str):
    """
    Convert date string from various formats to DD-MM-YYYY format.
    Handles: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO format, etc.
    Returns original string if conversion fails.
    """
    if not date_str:
        return ''
    
    date_str = str(date_str).strip()
    
    # Already in DD-MM-YYYY format
    if len(date_str) == 10 and date_str[2] == '-' and date_str[5] == '-':
        try:
            # Verify it's valid DD-MM-YYYY
            day, month, year = date_str.split('-')
            if len(year) == 4 and int(day) <= 31 and int(month) <= 12:
                return date_str
        except (ValueError, TypeError, AttributeError):
            pass
    
    # Try various input formats
    formats_to_try = [
        '%Y-%m-%d',           # 2026-01-20
        '%Y-%m-%dT%H:%M:%S',  # ISO format with time
        '%Y-%m-%dT%H:%M:%S.%f',  # ISO with microseconds
        '%Y-%m-%dT%H:%M:%SZ', # ISO with Z
        '%d/%m/%Y',           # 20/01/2026
        '%d-%m-%Y',           # 20-01-2026
        '%m/%d/%Y',           # 01/20/2026
        '%Y/%m/%d',           # 2026/01/20
    ]
    
    for fmt in formats_to_try:
        try:
            parsed_date = datetime.strptime(date_str[:len(date_str.split('T')[0]) if 'T' in date_str else len(date_str)], fmt.split('T')[0])
            return parsed_date.strftime('%d-%m-%Y')
        except (ValueError, IndexError):
            continue
    
    # If all parsing fails, return original
    return date_str


# ============ SHARED COLORS (defaults, use get_pdf_*_color() for dynamic) ============
PRIMARY_COLOR = colors.HexColor('#2d7a4e')  # Default green for headers
ORANGE_ACCENT = colors.HexColor('#F7931E')  # Default orange accent
LIGHT_GRAY = colors.HexColor('#f5f5f5')  # Light gray for headers
DARK_TEXT = colors.HexColor('#333333')
GRAY_TEXT = colors.HexColor('#666666')
BORDER_COLOR = colors.black

# ============ STANDARD COLUMN WIDTHS ============
COL_LABEL_WIDTH = 0.18
COL_VALUE_WIDTH = 0.32


def create_base_styles():
    """Create standard paragraph styles for all PDF reports."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_LEFT,  # Left-aligned for header tables (title left, logo right)
        spaceAfter=6,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=10,
        alignment=TA_LEFT,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_LEFT,
        spaceBefore=6,
        spaceAfter=3,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='Normal_Small',
        parent=styles['Normal'],
        fontSize=8,
        leading=10
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='FooterStyle',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor('#444444')
    ))
    
    styles.add(ParagraphStyle(
        name='CellMultiLine',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    ))
    
    # Additional styles used by various PDF files
    styles.add(ParagraphStyle(
        name='LabelText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='CustomBodyText',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        alignment=TA_LEFT
    ))
    
    return styles


class BaseNumberedCanvas(canvas.Canvas):
    """Base canvas class with page numbers and standard headers/footers.
    
    Can be subclassed or used directly with parameters:
    - report_data: dict with report_no, report_date, etc.
    - org_settings: dict with company name, phone, email, address
    - report_title: Title shown in header (e.g., "TRANSFORMER TEST REPORT")
    - report_no_field: Field name for report number (default: 'report_no')
    - report_date_field: Field name for report date (default: 'report_date')
    - show_two_line_footer: Show address line in footer (default: True)
    """
    
    def __init__(self, *args, report_data=None, org_settings=None, report_title="TEST REPORT",
                 report_no_field='report_no', report_date_field='report_date',
                 show_two_line_footer=True, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []
        self.report_data = report_data or {}
        self.org_settings = org_settings or {}
        self.report_title = report_title
        self.report_no_field = report_no_field
        self.report_date_field = report_date_field
        self.show_two_line_footer = show_two_line_footer
        
    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()
        
    def save(self):
        """Add page info to each page."""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
        
    def draw_header_footer(self, page_count):
        """Draw standard header and footer on each page."""
        page_width, page_height = A4
        margin = 30
        
        # Get report data using configurable field names
        report_no = self.report_data.get(self.report_no_field, 'N/A')
        report_date = format_date_ddmmyyyy(self.report_data.get(self.report_date_field, 'N/A'))
        
        # Get organization settings
        company_name = self.org_settings.get('name', 'Enerzia Power Solutions') if self.org_settings else 'Enerzia Power Solutions'
        company_phone = self.org_settings.get('phone', '+91 44 45487875') if self.org_settings else '+91 44 45487875'
        company_email = self.org_settings.get('email', 'support@enerzia.com') if self.org_settings else 'support@enerzia.com'
        
        # Build address
        company_address = 'Chennai, Tamil Nadu, India'
        if self.org_settings:
            addr_parts = []
            if self.org_settings.get('city'):
                addr_parts.append(self.org_settings.get('city'))
            if self.org_settings.get('state'):
                addr_parts.append(self.org_settings.get('state'))
            if self.org_settings.get('country'):
                addr_parts.append(self.org_settings.get('country'))
            if addr_parts:
                company_address = ', '.join(addr_parts)
        
        # ============ HEADER (on pages 2+ only) ============
        if self._pageNumber > 1:
            self.setFont('Helvetica-Bold', 9)
            self.setFillColor(colors.HexColor('#333333'))
            
            # Header line
            header_y = page_height - 18
            self.setStrokeColor(colors.HexColor('#cccccc'))
            self.setLineWidth(0.5)
            self.line(margin, header_y - 5, page_width - margin, header_y - 5)
            
            # Report # on left
            self.drawString(margin, header_y, f"Report #: {report_no}")
            
            # Report Title in center
            self.setFont('Helvetica-Bold', 10)
            self.drawCentredString(page_width / 2, header_y, self.report_title)
            
            # Date on right
            self.setFont('Helvetica-Bold', 9)
            self.drawRightString(page_width - margin, header_y, f"Date: {report_date}")
        
        # ============ FOOTER (on all pages) ============
        footer_y = 25
        
        # Footer line
        self.setStrokeColor(colors.HexColor('#cccccc'))
        self.setLineWidth(0.5)
        self.line(margin, footer_y + 18, page_width - margin, footer_y + 18)
        
        if self.show_two_line_footer:
            # Two-line footer with address
            # Left side: Company name and address (two lines)
            self.setFont('Helvetica-Bold', 7)
            self.setFillColor(DARK_TEXT)
            self.drawString(margin, footer_y + 8, company_name)
            
            self.setFont('Helvetica', 6)
            self.setFillColor(GRAY_TEXT)
            self.drawString(margin, footer_y, company_address)
            
            # Center: Page number
            self.setFont('Helvetica', 7)
            self.setFillColor(DARK_TEXT)
            self.drawCentredString(page_width / 2, footer_y + 4, f"Page {self._pageNumber} of {page_count}")
            
            # Right side: Contact and Email (two lines)
            self.setFont('Helvetica-Bold', 7)
            self.setFillColor(DARK_TEXT)
            contact_label = "Contact: "
            contact_label_width = self.stringWidth(contact_label, 'Helvetica-Bold', 7)
            contact_value_width = self.stringWidth(company_phone, 'Helvetica', 7)
            total_contact_width = contact_label_width + contact_value_width
            
            contact_start_x = page_width - margin - total_contact_width
            self.drawString(contact_start_x, footer_y + 8, contact_label)
            self.setFont('Helvetica', 7)
            self.setFillColor(GRAY_TEXT)
            self.drawString(contact_start_x + contact_label_width, footer_y + 8, company_phone)
            
            # Email line
            self.setFont('Helvetica-Bold', 7)
            self.setFillColor(DARK_TEXT)
            email_label = "Email: "
            email_label_width = self.stringWidth(email_label, 'Helvetica-Bold', 7)
            email_value_width = self.stringWidth(company_email, 'Helvetica', 7)
            total_email_width = email_label_width + email_value_width
            
            email_start_x = page_width - margin - total_email_width
            self.drawString(email_start_x, footer_y, email_label)
            self.setFont('Helvetica', 7)
            self.setFillColor(GRAY_TEXT)
            self.drawString(email_start_x + email_label_width, footer_y, company_email)
        else:
            # Single-line footer (simpler version)
            self.setFont('Helvetica-Bold', 7)
            self.setFillColor(colors.HexColor('#333333'))
            self.drawString(margin, footer_y + 8, company_name)
            
            self.setFont('Helvetica', 7)
            self.setFillColor(colors.HexColor('#666666'))
            self.drawCentredString(page_width / 2, footer_y + 8, f"Page {self._pageNumber} of {page_count}")
            
            self.setFont('Helvetica-Bold', 7)
            contact_label = "Contact: "
            contact_label_width = self.stringWidth(contact_label, 'Helvetica-Bold', 7)
            contact_value_width = self.stringWidth(company_phone, 'Helvetica', 7)
            total_contact_width = contact_label_width + contact_value_width
            
            contact_start_x = page_width - margin - total_contact_width
            self.drawString(contact_start_x, footer_y + 8, contact_label)
            
            self.setFont('Helvetica', 7)
            self.drawString(contact_start_x + contact_label_width, footer_y + 8, company_phone)


def get_logo_image(logo_url, width=80):
    """Fetch and return logo image for PDF.
    
    Tries in order:
    1. Local file paths (company_logo.png, enerzia_logo_2025.png)
    2. URL starting with /api/uploads/
    3. Full HTTP URL
    """
    from reportlab.platypus import Image
    
    # First try common local file paths
    local_paths = [
        '/app/backend/uploads/company_logo.png',
        '/app/backend/uploads/enerzia_logo_2025.png'
    ]
    
    for local_path in local_paths:
        if os.path.exists(local_path):
            try:
                img = Image(local_path, width=width, height=width*0.35)
                return img
            except Exception as e:
                print(f"Error loading local logo {local_path}: {e}")
    
    # Then try URL-based loading
    if logo_url:
        try:
            if logo_url.startswith('/api/uploads/'):
                full_url = f"https://order-flow-system-5.preview.emergentagent.com{logo_url}"
                response = requests.get(full_url, timeout=5)
                if response.status_code == 200:
                    img_data = io.BytesIO(response.content)
                    return Image(img_data, width=width, height=width*0.35)
            elif logo_url.startswith('http'):
                response = requests.get(logo_url, timeout=5)
                if response.status_code == 200:
                    img_data = io.BytesIO(response.content)
                    return Image(img_data, width=width, height=width*0.35)
        except Exception as e:
            print(f"Error loading logo from URL {logo_url}: {e}")
    
    return None


async def get_email_html_template(
    customer_name: str,
    report_type: str,
    details_html: str,
    custom_message: str = "",
    company_name: str = "Enerzia Power Solutions"
) -> str:
    """Generate email HTML using customizable template settings."""
    
    # Get email template settings
    email_template = await db.settings.find_one({"id": "email_template_settings"}, {"_id": 0})
    if not email_template:
        email_template = {}
    
    # Get organization settings for logo
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
    
    # Template values with defaults
    header_bg = email_template.get('header_bg_color', '#0F172A')
    header_gradient = email_template.get('header_gradient_end', '#1E3A5F')
    accent_color = email_template.get('accent_color', '#10B981')
    footer_bg = email_template.get('footer_bg_color', '#F1F5F9')
    
    greeting = email_template.get('greeting_text', 'Dear {customer_name},').replace('{customer_name}', customer_name)
    intro = email_template.get('intro_text', 'Please find attached the {report_type} for your reference. Below are the key details:').replace('{report_type}', report_type)
    closing = email_template.get('closing_text', 'If you have any questions or need further clarification, please don\'t hesitate to reach out.')
    signature = email_template.get('signature_text', 'Best regards,')
    footer = email_template.get('footer_text', 'This is an automated email from {company_name}\'s Report Management System.').replace('{company_name}', company_name)
    show_copyright = email_template.get('show_copyright', True)
    
    # Logo HTML
    logo_html = ""
    logo_url = email_template.get('company_logo_url') or (org_settings.get('logo_url') if org_settings else None)
    if logo_url:
        base_url = "https://order-flow-system-5.preview.emergentagent.com/api"
        if logo_url.startswith('/'):
            logo_html = f'<img src="{base_url}{logo_url}" alt="{company_name}" style="max-height: 60px; margin-bottom: 16px;" />'
    
    # Custom message section
    custom_msg_html = ""
    if custom_message:
        custom_msg_html = f"""
        <div style="background: #F0F9FF; border-left: 4px solid {accent_color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #0369A1; font-weight: 600; margin: 0 0 8px 0;">Message from Engineer:</p>
            <p style="color: #334155; margin: 0;">{custom_message}</p>
        </div>
        """
    
    # Copyright section
    copyright_html = ""
    if show_copyright:
        copyright_html = f'<p style="color: #94A3B8; font-size: 11px; margin: 8px 0 0 0;">© {datetime.now().year} {company_name}. All rights reserved.</p>'
    
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, {header_bg} 0%, {header_gradient} 100%); padding: 30px; text-align: center;">
            {logo_html}
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{company_name}</h1>
            <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">{report_type}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">{greeting}</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">{intro}</p>
            {custom_msg_html}
            {details_html}
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-top: 24px;">{closing}</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">{signature}<br/></p>
        </div>
        
        <!-- Footer -->
        <div style="background: {footer_bg}; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">{footer}</p>
            {copyright_html}
        </div>
    </div>
    """
    
    return html_content


def create_standard_header_section(report, org_settings, styles, width, report_title):
    """Create standard header section with title, logo, report #, date, and report type checkboxes."""
    elements = []
    
    # Title on left, Logo on right
    title_cell = Paragraph(f"<b>{report_title}</b>", styles['ReportTitle'])
    
    # Try to get logo
    logo_url = org_settings.get('logo_url', '') if org_settings else ''
    logo_img = get_logo_image(logo_url)
    
    if logo_img:
        header_data = [[title_cell, logo_img]]
    else:
        header_data = [[title_cell, '']]
    
    header_table = Table(header_data, colWidths=[width*0.55, width*0.45])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6))
    
    # ROW 2: Report # and Date
    report_date = format_date_ddmmyyyy(report.get('report_date', '') or report.get('test_date', '') or report.get('visit_date', ''))
    report_info = [[f"Report #: {report.get('report_no', 'N/A')}", f"Report Date: {report_date}"]]
    info_table = Table(report_info, colWidths=[width*0.5, width*0.5])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6))
    
    # ROW 3: Report Type checkboxes
    report_types_row1 = ['Periodical Maintenance', 'Breakdown', 'Testing & Commissioning', 'Calibration']
    report_types_row2 = ['Complaint', 'O&M', 'AMC', 'Other']
    
    current_type = report.get('report_type', 'Testing & Commissioning')
    
    row1_cells = [f"[{'✓' if t == current_type else '  '}] {t}" for t in report_types_row1]
    row2_cells = [f"[{'✓' if t == current_type else '  '}] {t}" for t in report_types_row2]
    
    type_data = [
        ['Report Type:', '', '', ''],
        row1_cells,
        row2_cells
    ]
    
    col_width = width / 4
    type_table = Table(type_data, colWidths=[col_width, col_width, col_width, col_width])
    type_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('SPAN', (0, 0), (3, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 1), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(type_table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_standard_customer_section(report, styles, width):
    """Create standard customer information section."""
    elements = []
    
    elements.append(Paragraph("CUSTOMER INFORMATION", styles['SectionHeader']))
    
    cell_style = styles['CellMultiLine']
    
    # Get values with multi-line support
    customer_name = (report.get('customer_name', '') or '').replace('\n', '<br/>')
    site_location = (report.get('site_location', '') or report.get('location', '') or '').replace('\n', '<br/>')
    project_name = (report.get('project_name', '') or '').replace('\n', '<br/>')
    contact_person = (report.get('contact_person', '') or '').replace('\n', '<br/>')
    customer_email = report.get('contact_email', '') or report.get('customer_email', '') or ''
    contact_phone = report.get('contact_phone', '') or ''
    po_ref = report.get('po_ref', '') or ''
    po_dated = format_date_ddmmyyyy(report.get('po_dated', '') or '')
    
    customer_name_p = Paragraph(customer_name, cell_style)
    site_location_p = Paragraph(site_location, cell_style)
    project_name_p = Paragraph(project_name, cell_style)
    contact_person_p = Paragraph(contact_person, cell_style)
    
    data = [
        ['Company Name:', customer_name_p, 'Site Location:', site_location_p],
        ['Project Name:', project_name_p, 'P.O. Ref #:', po_ref],
        ['Contact Person:', contact_person_p, 'P.O. Dated:', po_dated],
        ['Email:', customer_email, 'Phone:', contact_phone]
    ]
    
    table = Table(data, colWidths=[width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH, width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_standard_service_provider_section(report, org_settings, styles, width):
    """Create standard service provider information section."""
    elements = []
    
    elements.append(Paragraph("SERVICE PROVIDER", styles['SectionHeader']))
    
    cell_style = styles['CellMultiLine']
    
    # Get organization data
    company_name = org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions'
    
    # Build address
    address_parts = []
    if org_settings:
        if org_settings.get('address'):
            address_parts.append(org_settings.get('address'))
        if org_settings.get('city'):
            address_parts.append(org_settings.get('city'))
        if org_settings.get('state'):
            address_parts.append(org_settings.get('state'))
        if org_settings.get('zip_code'):
            address_parts.append(org_settings.get('zip_code'))
        if org_settings.get('country'):
            address_parts.append(org_settings.get('country'))
    
    company_address = ', '.join(address_parts) if address_parts else 'Chennai, Tamil Nadu, India'
    
    engineer_name = report.get('engineer_name', '') or report.get('tested_by', '') or ''
    engineer_email = report.get('engineer_email', '') or ''
    engineer_mobile = report.get('engineer_mobile', '') or ''
    
    company_name_p = Paragraph(f"<b>{company_name}</b>", cell_style)
    company_address_p = Paragraph(company_address, cell_style)
    
    data = [
        ['Company Name:', company_name_p, 'Engineer Name:', engineer_name],
        ['Company Address:', company_address_p, 'Engineer Email:', engineer_email],
        ['', '', 'Mobile:', engineer_mobile]
    ]
    
    table = Table(data, colWidths=[width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH, width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LINEAFTER', (0, 0), (0, -1), 0.5, BORDER_COLOR),
        ('LINEAFTER', (1, 0), (1, -1), 0.5, BORDER_COLOR),
        ('LINEAFTER', (2, 0), (2, -1), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_COLOR),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, 2), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('SPAN', (0, 1), (0, 2)),
        ('SPAN', (1, 1), (1, 2)),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_standard_signature_section(report, styles, width):
    """Create standard 2-column signature section."""
    elements = []
    
    elements.append(Paragraph("SIGNATURES", styles['SectionHeader']))
    
    test_date = format_date_ddmmyyyy(report.get('test_date', '') or report.get('visit_date', ''))
    
    data = [
        ['SERVICE PROVIDER', '', 'CUSTOMER', ''],
        ['Name:', report.get('engineer_name', '') or report.get('tested_by', ''), 'Name:', report.get('witnessed_by', '')],
        ['Signature:', '', 'Signature:', ''],
        ['Date:', test_date, 'Date:', ''],
    ]
    
    table = Table(data, colWidths=[width*0.15, width*0.35, width*0.15, width*0.35])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(table)
    
    return elements
