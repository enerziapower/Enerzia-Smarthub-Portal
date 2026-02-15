"""
Calibration Report PDF Generation
Generates calibration certificates and combined service reports
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from datetime import datetime
import os

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

router = APIRouter()

# Color scheme (defaults, will be overridden by template settings where applicable)
PRIMARY_BLUE = colors.HexColor('#1e3a5f')
SECONDARY_BLUE = colors.HexColor('#2563eb')
ACCENT_ORANGE = colors.HexColor('#f97316')
LIGHT_GRAY = colors.HexColor('#f8fafc')
BORDER_COLOR = colors.HexColor('#e2e8f0')
SUCCESS_GREEN = colors.HexColor('#22c55e')
ERROR_RED = colors.HexColor('#ef4444')

# Meter type labels
METER_TYPES = {
    'energy_meter': 'Energy Meter',
    'voltmeter': 'Voltmeter',
    'ammeter': 'Ammeter',
    'ct': 'Current Transformer',
    'pt': 'Potential Transformer',
    'pf_meter': 'Power Factor Meter',
    'frequency_meter': 'Frequency Meter',
    'multifunction_meter': 'Multi-function Meter',
    'wattmeter': 'Wattmeter',
    'var_meter': 'VAR Meter',
    'kwh_meter': 'kWh Meter',
    'other': 'Other'
}


def get_db():
    from server import db
    return db


def format_date_ddmmyyyy(date_str):
    """Convert date string to DD-MM-YYYY format"""
    if not date_str:
        return ""
    try:
        if "-" in str(date_str):
            parts = str(date_str).split("-")
            if len(parts) == 3:
                if len(parts[0]) == 4:  # YYYY-MM-DD
                    return f"{parts[2]}-{parts[1]}-{parts[0]}"
                else:  # Already DD-MM-YYYY
                    return date_str
        return date_str
    except Exception:
        return date_str


def get_styles():
    """Get custom styles for the PDF"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CertTitle',
        fontSize=18,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        alignment=TA_CENTER,
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='CertSubTitle',
        fontSize=12,
        fontName='Helvetica',
        textColor=colors.gray,
        alignment=TA_CENTER,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        spaceBefore=15,
        spaceAfter=8,
        leftIndent=0
    ))
    
    styles.add(ParagraphStyle(
        name='CalBodyText',
        fontSize=9,
        fontName='Helvetica',
        textColor=colors.black,
        alignment=TA_LEFT,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='CalSmallText',
        fontSize=8,
        fontName='Helvetica',
        textColor=colors.gray,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='PassStatus',
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=SUCCESS_GREEN,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='FailStatus',
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=ERROR_RED,
        alignment=TA_CENTER
    ))
    
    return styles


def create_certificate_header(contract, styles, certificate_no=""):
    """Create certificate header with logo and title"""
    elements = []
    
    # Logo
    logo_path = "/app/frontend/public/logo.png"
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=60, height=40)
            elements.append(logo)
        except Exception:
            pass
    
    elements.append(Spacer(1, 10))
    
    # Title
    elements.append(Paragraph("CALIBRATION CERTIFICATE", styles['CertTitle']))
    
    service_provider = contract.get('service_provider', {})
    company_name = service_provider.get('company_name', 'Enerzia Power Solutions')
    nabl_cert = service_provider.get('nabl_cert_no', '')
    
    subtitle = f"Issued by {company_name}"
    if nabl_cert:
        subtitle += f" | NABL Cert: {nabl_cert}"
    elements.append(Paragraph(subtitle, styles['CertSubTitle']))
    
    # Certificate number box
    cert_data = [
        ['CERTIFICATE NO:', certificate_no, 'DATE:', datetime.now().strftime("%d-%m-%Y")]
    ]
    cert_table = Table(cert_data, colWidths=[90, 150, 60, 100])
    cert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cert_table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_customer_section(contract, styles):
    """Create customer information section"""
    elements = []
    
    elements.append(Paragraph("CUSTOMER DETAILS", styles['SectionHeader']))
    
    customer = contract.get('customer_info', {})
    
    data = [
        ['Customer Name:', customer.get('customer_name', ''), 'Site Location:', customer.get('site_location', '')],
        ['Contact Person:', customer.get('contact_person', ''), 'Contact No:', customer.get('contact_number', '')],
        ['Email:', customer.get('email', ''), '', ''],
    ]
    
    table = Table(data, colWidths=[90, 160, 80, 155])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_meter_details_section(meter, styles):
    """Create meter/equipment details section"""
    elements = []
    
    meter_type_label = METER_TYPES.get(meter.get('meter_type', ''), meter.get('meter_type', ''))
    elements.append(Paragraph(f"EQUIPMENT UNDER TEST - {meter_type_label.upper()}", styles['SectionHeader']))
    
    data = [
        ['Meter Type:', meter_type_label, 'Make:', meter.get('make', '')],
        ['Model:', meter.get('model', ''), 'Serial No:', meter.get('serial_no', '')],
        ['Range:', meter.get('range', ''), 'Accuracy Class:', meter.get('accuracy_class', '')],
        ['Location:', meter.get('location', ''), 'Tag No:', meter.get('tag_no', '')],
    ]
    
    table = Table(data, colWidths=[80, 165, 80, 160])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_calibration_results_section(test_result, styles):
    """Create calibration test results section"""
    elements = []
    
    elements.append(Paragraph("CALIBRATION TEST RESULTS", styles['SectionHeader']))
    
    # Calibration info
    info_data = [
        ['Calibration Date:', format_date_ddmmyyyy(test_result.get('calibration_date', '')), 
         'Next Due Date:', format_date_ddmmyyyy(test_result.get('next_due_date', ''))],
        ['Calibrated By:', test_result.get('calibrated_by', ''), 
         'Verified By:', test_result.get('verified_by', '')],
    ]
    
    info_table = Table(info_data, colWidths=[100, 145, 100, 140])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10))
    
    # Test readings table
    readings = test_result.get('readings', [])
    if readings:
        header = ['Test Point', 'Standard Value', 'Before Cal.', 'After Cal.', 'Error Before', 'Error After', 'Tolerance', 'Status']
        data = [header]
        
        for reading in readings:
            status = reading.get('status', '').upper()
            data.append([
                reading.get('test_point', ''),
                reading.get('standard_value', ''),
                reading.get('measured_value_before', ''),
                reading.get('measured_value_after', ''),
                reading.get('error_before', ''),
                reading.get('error_after', ''),
                reading.get('tolerance', ''),
                status
            ])
        
        col_widths = [70, 70, 60, 60, 55, 55, 55, 50]
        table = Table(data, colWidths=col_widths)
        
        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]
        
        # Color code status cells
        for i, reading in enumerate(readings):
            row_idx = i + 1
            status = reading.get('status', '').lower()
            if status == 'pass':
                style_commands.append(('BACKGROUND', (7, row_idx), (7, row_idx), colors.HexColor('#dcfce7')))
                style_commands.append(('TEXTCOLOR', (7, row_idx), (7, row_idx), SUCCESS_GREEN))
            elif status == 'fail':
                style_commands.append(('BACKGROUND', (7, row_idx), (7, row_idx), colors.HexColor('#fee2e2')))
                style_commands.append(('TEXTCOLOR', (7, row_idx), (7, row_idx), ERROR_RED))
        
        table.setStyle(TableStyle(style_commands))
        elements.append(table)
    else:
        elements.append(Paragraph("No test readings recorded.", styles['CalBodyText']))
    
    elements.append(Spacer(1, 15))
    
    # Overall status and remarks
    overall_status = test_result.get('overall_status', '').upper()
    status_color = SUCCESS_GREEN if overall_status == 'PASS' else ERROR_RED if overall_status == 'FAIL' else colors.orange
    
    status_data = [
        ['OVERALL CALIBRATION STATUS:', overall_status]
    ]
    status_table = Table(status_data, colWidths=[200, 285])
    status_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_GRAY),
        ('TEXTCOLOR', (1, 0), (1, 0), status_color),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 10))
    
    # Remarks
    remarks = test_result.get('remarks', '')
    if remarks:
        elements.append(Paragraph(f"<b>Remarks:</b> {remarks}", styles['CalBodyText']))
        elements.append(Spacer(1, 10))
    
    return elements


def create_signature_section(styles):
    """Create signature section"""
    elements = []
    
    elements.append(Spacer(1, 30))
    
    sig_data = [
        ['', '', ''],
        ['_____________________', '_____________________', '_____________________'],
        ['Calibrated By', 'Verified By', 'Authorized Signatory'],
        ['Date:', 'Date:', 'Date:'],
    ]
    
    sig_table = Table(sig_data, colWidths=[160, 160, 160])
    sig_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(sig_table)
    
    return elements


def create_footer_note(styles):
    """Create footer note"""
    elements = []
    
    elements.append(Spacer(1, 20))
    
    note_text = """
    <i>This certificate is issued based on the calibration performed at the customer's site. 
    The calibration results are valid at the time of testing. 
    Re-calibration is recommended before the next due date shown above.</i>
    """
    elements.append(Paragraph(note_text, styles['CalSmallText']))
    
    return elements


@router.get("/{contract_id}/certificate/{visit_id}/{meter_id}")
async def generate_meter_certificate(contract_id: str, visit_id: str, meter_id: str):
    """Generate calibration certificate for a specific meter"""
    db = get_db()
    
    contract = await db.calibration_contracts.find_one(
        {"id": contract_id}, {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Find the visit
    visit = None
    for v in contract.get('calibration_visits', []):
        if v.get('id') == visit_id:
            visit = v
            break
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Find the test result for the meter
    test_result = None
    for tr in visit.get('test_results', []):
        if tr.get('meter_id') == meter_id:
            test_result = tr
            break
    
    if not test_result:
        raise HTTPException(status_code=404, detail="Test result not found for this meter")
    
    # Find meter details
    meter = None
    for m in contract.get('meter_list', []):
        if m.get('id') == meter_id:
            meter = m
            break
    
    if not meter:
        meter = test_result.get('meter_details', {})
    
    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    styles = get_styles()
    elements = []
    
    certificate_no = test_result.get('certificate_no', f"{contract.get('contract_no', '')}/{meter_id[:8].upper()}")
    
    # Build certificate
    elements.extend(create_certificate_header(contract, styles, certificate_no))
    elements.extend(create_customer_section(contract, styles))
    elements.extend(create_meter_details_section(meter, styles))
    elements.extend(create_calibration_results_section(test_result, styles))
    elements.extend(create_signature_section(styles))
    elements.extend(create_footer_note(styles))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Calibration_Certificate_{certificate_no.replace('/', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{contract_id}/pdf")
async def generate_calibration_report_pdf(contract_id: str):
    """Generate combined calibration service report PDF - Redirects to comprehensive report"""
    # Use the comprehensive AMC-style report instead
    return await generate_calibration_contract_report(contract_id)



# =====================================================
# COMPREHENSIVE CALIBRATION CONTRACT REPORT
# (Exact clone of AMC Report structure)
# =====================================================

# Additional color constants matching AMC PDF
TEXT_DARK = colors.HexColor('#1a1a1a')
ORANGE_ACCENT = colors.HexColor('#F7931E')


def draw_calibration_cover_page(c, width, height, contract, project, org_settings):
    """Draw professional cover page - EXACT clone of AMC cover page"""
    dark_blue = colors.HexColor('#1e3a5f')
    text_dark = colors.HexColor('#1a1a1a')
    
    # Get template settings
    cover_settings = get_cover_page_settings()
    company_info = get_pdf_company_info()
    logo_path = get_pdf_logo_path()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    
    # Get Calibration-specific design settings
    from routes.pdf_template_settings import get_report_design, draw_decorative_design, get_pdf_settings_sync
    template_settings = get_pdf_settings_sync()
    report_design = get_report_design('calibration', template_settings)
    design_id = report_design.get('design_id', 'design_2')
    design_color = report_design.get('design_color', '#2563eb')
    primary_orange = colors.HexColor(design_color)
    
    # =====================================================
    # BACKGROUND - White (MUST be first like AMC)
    # =====================================================
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # =====================================================
    # DECORATIVE DESIGN (using selected design for Calibration)
    # =====================================================
    if cover_settings.get('show_decorative_design', True):
        draw_decorative_design(c, width, height, design_id, design_color)
    
    # =====================================================
    # COMPANY LOGO - Top Left (if enabled)
    # =====================================================
    if cover_settings.get('show_logo', True) and logo_path:
        c.saveState()
        
        if os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, 35, height - 90, width=180, height=60, 
                           preserveAspectRatio=True, mask='auto')
            except Exception as e:
                print(f"Error drawing cover logo: {e}")
        
        c.restoreState()
    
    # =====================================================
    # MAIN TITLE SECTION - Above center
    # =====================================================
    c.saveState()
    
    c.setFillColor(dark_blue)
    c.setFont('Helvetica-Bold', 38)
    title_text = 'Calibration Service'
    title_width = c.stringWidth(title_text, 'Helvetica-Bold', 38)
    c.drawString((width - title_width) / 2, height * 0.65, title_text)
    
    c.setFont('Helvetica-Bold', 38)
    title_text2 = 'Report'
    title_width2 = c.stringWidth(title_text2, 'Helvetica-Bold', 38)
    c.drawString((width - title_width2) / 2, height * 0.58, title_text2)
    
    # Subtitle with orange accent line
    subtitle = 'Meter Calibration & Verification Service Report'
    subtitle_width = c.stringWidth(subtitle, 'Helvetica', 12)
    
    # Orange accent line above subtitle
    c.setStrokeColor(primary_orange)
    c.setLineWidth(3)
    c.line((width - subtitle_width) / 2 - 15, height * 0.535, 
           (width + subtitle_width) / 2 + 15, height * 0.535)
    
    c.setFillColor(dark_blue)
    c.setFont('Helvetica', 12)
    c.drawString((width - subtitle_width) / 2, height * 0.51, subtitle)
    
    c.restoreState()
    
    # =====================================================
    # CLIENT INFORMATION BOX - Centered below title
    # =====================================================
    c.saveState()
    
    contract_details = contract.get('contract_details', {})
    customer = contract.get('customer_info', {})
    customer_name = customer.get('customer_name', '') or (project.get('customer_name', '') if project else '')
    location = customer.get('site_location', '') or (project.get('location', '') if project else '')
    contract_no = contract_details.get('contract_no', '')
    contract_period = f"{format_date_ddmmyyyy(contract_details.get('start_date', ''))} to {format_date_ddmmyyyy(contract_details.get('end_date', ''))}"
    
    # Info box - Centered below title
    box_width = 340
    box_height = 120
    box_x = (width - box_width) / 2
    box_y = height * 0.32
    
    # Light background box
    c.setFillColor(colors.Color(30/255, 58/255, 95/255, 0.04))
    c.roundRect(box_x, box_y, box_width, box_height, 8, fill=1, stroke=0)
    
    # Define consistent margins
    label_x = box_x + 15
    value_x = box_x + 120
    max_value_width = box_width - 135
    
    c.setFillColor(text_dark)
    y_offset = box_y + box_height - 22
    
    # CUSTOMER
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'CUSTOMER:')
    c.setFont('Helvetica', 9)
    if len(customer_name) > 35:
        customer_name = customer_name[:35] + '...'
    c.drawString(value_x, y_offset, customer_name)
    
    y_offset -= 20
    
    # LOCATION
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'LOCATION:')
    c.setFont('Helvetica', 8)
    if len(location) > 38:
        location = location[:38] + '...'
    c.drawString(value_x, y_offset, location)
    
    y_offset -= 20
    
    # CONTRACT NO
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'CONTRACT NO:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, contract_no)
    
    y_offset -= 20
    
    # CONTRACT PERIOD
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'CONTRACT PERIOD:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, contract_period)
    
    c.restoreState()
    
    # =====================================================
    # SUBMITTED BY SECTION - Right Hand Side (Bottom Right)
    # =====================================================
    if cover_settings.get('show_submitted_by', True):
        c.saveState()
        
        submit_x = width - 250
        submit_y = 130
        
        c.setFillColor(dark_blue)
        c.setFont('Helvetica', 9)
        submitted_by_title = cover_settings.get('submitted_by_title', 'Submitted By')
        c.drawString(submit_x, submit_y, submitted_by_title)
        
        # Company Name from settings
        c.setFont('Helvetica-Bold', 13)
        c.drawString(submit_x, submit_y - 18, company_name)
        
        # Company Address from settings
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont('Helvetica', 7)
        address_line1 = company_info.get('address_line1', '')
        address_line2 = company_info.get('address_line2', '')
        city = company_info.get('city', '')
        state = company_info.get('state', '')
        postal_code = company_info.get('postal_code', '')
        
        y_addr = submit_y - 32
        if address_line1:
            c.drawString(submit_x, y_addr, address_line1)
            y_addr -= 10
        if address_line2:
            c.drawString(submit_x, y_addr, address_line2)
            y_addr -= 10
        if city or state or postal_code:
            city_state_zip = f"{city}, {state}, Pincode- {postal_code}" if postal_code else f"{city}, {state}"
            c.drawString(submit_x, y_addr, city_state_zip.strip(', '))
            y_addr -= 14
        
        # ISO Certifications
        c.setFillColor(colors.HexColor('#666666'))
        c.setFont('Helvetica-Oblique', 6)
        c.drawString(submit_x, y_addr, '(An ISO 9001:2015, ISO 45001:2018 certified company)')
        
        c.restoreState()


def draw_calibration_header_footer(canvas_obj, doc, contract, page_num):
    """Draw header and footer for all pages - EXACT match to AMC style"""
    c = canvas_obj
    width, height = A4
    margin = 40
    
    # Get template settings
    hf_settings = get_header_footer_settings()
    primary_orange = get_pdf_primary_color()
    logo_path = get_pdf_logo_path()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    
    dark_blue = colors.HexColor('#1e3a5f')
    
    if page_num <= 1:
        # Only draw footer on cover page - EXACT match to AMC
        # ============ FOOTER ============
        footer_y = 25
        
        c.setStrokeColor(primary_orange)
        c.setLineWidth(2)
        c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        c.setFont('Helvetica-Bold', 7)
        c.setFillColor(colors.HexColor('#333333'))
        c.drawString(margin, footer_y + 5, company_name)
        
        c.setFont('Helvetica', 8)
        c.setFillColor(primary_orange)
        c.drawCentredString(width / 2, footer_y + 5, website)
        return
    
    # ============ HEADER (Page 2+) - EXACT match to AMC ============
    header_y = height - 30
    
    # Draw logo on right side - properly aligned (if enabled)
    if hf_settings.get('show_header_logo', True) and logo_path:
        logo_width = 100
        logo_height = 35
        if os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, width - margin - logo_width, header_y - 20, 
                           width=logo_width, height=logo_height, preserveAspectRatio=True, mask='auto')
            except Exception as e:
                print(f"Error drawing logo: {e}")
    
    # Report title on left - aligned with logo (like AMC)
    # HEADER section (if enabled)
    if hf_settings.get('show_header', True):
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(dark_blue)
        c.drawString(margin, header_y - 5, 'CALIBRATION SERVICE REPORT')
        
        # Report number below title
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.HexColor('#666666'))
        contract_no = contract.get('contract_no', '') or contract.get('contract_details', {}).get('contract_no', '')
        c.drawString(margin, header_y - 18, f"REPORT No: {contract_no}")
        
        # Header line - orange accent (if enabled)
        if hf_settings.get('show_header_line', True):
            c.setStrokeColor(primary_orange)
            c.setLineWidth(2)
            c.line(margin, header_y - 28, width - margin, header_y - 28)
    
    # ============ FOOTER - EXACT match to AMC ============
    if hf_settings.get('show_footer', True):
        footer_y = 25
        
        # Footer line (if enabled)
        if hf_settings.get('show_footer_line', True):
            c.setStrokeColor(primary_orange)
            c.setLineWidth(2)
            c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        # Company name in footer (if enabled)
        if hf_settings.get('footer_company_name', True):
            c.setFont('Helvetica-Bold', 7)
            c.setFillColor(colors.HexColor('#333333'))
            c.drawString(margin, footer_y + 5, company_name)
        
        # Website in footer (if enabled)
        if hf_settings.get('footer_website', True):
            c.setFont('Helvetica', 8)
            c.setFillColor(primary_orange)
            c.drawCentredString(width / 2, footer_y + 5, website)
        
        # Page number (if enabled)
        if hf_settings.get('show_page_numbers', True):
            c.setFont('Helvetica', 7)
            c.setFillColor(colors.HexColor('#666666'))
            c.drawRightString(width - margin, footer_y + 5, f'Page {page_num - 1}')


def create_calibration_toc(contract, styles, test_reports_count=0):
    """Create Table of Contents - EXACT match to AMC TOC"""
    elements = []
    
    # Section Header - Match AMC exactly with "CONTENTS"
    header_table = Table(
        [['CONTENTS']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # TOC entries - matching AMC structure
    toc_data = [
        ['S.No', 'SECTION', 'DESCRIPTION', 'PAGE NO.'],
        ['1', 'A', 'Executive Summary', '3'],
        ['2', 'B', 'Contract Details', '4'],
        ['3', 'C', 'Customer Information', '5'],
        ['4', 'D', 'Service Provider Details', '6'],
        ['5', 'E', 'Scope of Calibration Services', '7'],
        ['6', 'F', 'Meter/Equipment List', '8'],
        ['7', 'G', 'Calibration Schedule & Visits', '9'],
    ]
    
    section_num = 8
    page_num = 10
    
    if test_reports_count > 0:
        toc_data.append([str(section_num), 'H', f'Equipment Test Reports ({test_reports_count})', str(page_num)])
        section_num += 1
        page_num += 1
    
    toc_data.append([str(section_num), chr(ord('A') + section_num - 1), 'Documents & Attachments', str(page_num)])
    
    # Match AMC column widths exactly
    toc_table = Table(toc_data, colWidths=[50, 60, 320, 85])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (1, -1), 'CENTER'),
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(toc_table)
    elements.append(PageBreak())
    
    return elements


def create_calibration_executive_summary(contract, project, styles):
    """Create Executive Summary - EXACT match to AMC Section A"""
    elements = []
    
    header = Table([['SECTION - A: EXECUTIVE SUMMARY']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    contract_details = contract.get('contract_details', {})
    customer = contract.get('customer_info', {})
    meters = contract.get('meter_list', [])
    visits = contract.get('calibration_visits', [])
    
    completed_visits = len([v for v in visits if v.get('status') == 'completed'])
    pending_visits = len(visits) - completed_visits
    
    summary_data = [
        ['Parameter', 'Details'],
        ['Customer Name', customer.get('customer_name', '-')],
        ['Site Location', customer.get('site_location', '-')],
        ['Contract Number', contract_details.get('contract_no', '-')],
        ['Contract Period', f"{format_date_ddmmyyyy(contract_details.get('start_date', ''))} to {format_date_ddmmyyyy(contract_details.get('end_date', ''))}"],
        ['Calibration Frequency', contract_details.get('calibration_frequency', '-').replace('_', ' ').title()],
        ['Total Meters Covered', str(len(meters))],
        ['Total Visits Scheduled', str(len(visits))],
        ['Visits Completed', str(completed_visits)],
        ['Visits Pending', str(pending_visits)],
        ['Contract Status', contract.get('status', 'active').upper()],
    ]
    
    summary_table = Table(summary_data, colWidths=[180, 335])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 1), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(PageBreak())
    
    return elements


def create_calibration_contract_details(contract, styles):
    """Create Contract Details Section - EXACT match to AMC"""
    elements = []
    
    header = Table([['SECTION - B: CONTRACT DETAILS']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    contract_details = contract.get('contract_details', {})
    
    details_data = [
        ['Contract Number', contract_details.get('contract_no', '-')],
        ['Start Date', format_date_ddmmyyyy(contract_details.get('start_date', ''))],
        ['End Date', format_date_ddmmyyyy(contract_details.get('end_date', ''))],
        ['Calibration Frequency', contract_details.get('calibration_frequency', '-').replace('_', ' ').title()],
        ['Contract Value', contract_details.get('contract_value', '-')],
        ['Payment Terms', contract_details.get('payment_terms', '-')],
    ]
    
    details_table = Table(details_data, colWidths=[180, 335])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(details_table)
    elements.append(PageBreak())
    
    return elements


def create_calibration_customer_info(contract, styles):
    """Create Customer Information Section"""
    elements = []
    
    header = Table([['SECTION - C: CUSTOMER INFORMATION']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    customer = contract.get('customer_info', {})
    
    customer_data = [
        ['Customer Name', customer.get('customer_name', '-')],
        ['Site Location', customer.get('site_location', '-')],
        ['Contact Person', customer.get('contact_person', '-')],
        ['Contact Number', customer.get('contact_number', '-')],
        ['Email', customer.get('email', '-')],
    ]
    
    customer_table = Table(customer_data, colWidths=[180, 335])
    customer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(customer_table)
    elements.append(PageBreak())
    
    return elements


def create_calibration_service_provider(contract, styles):
    """Create Service Provider Details Section"""
    elements = []
    
    header = Table([['SECTION - D: SERVICE PROVIDER DETAILS']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    provider = contract.get('service_provider', {})
    
    provider_data = [
        ['Company Name', provider.get('company_name', 'Enerzia Power Solutions')],
        ['Address', provider.get('address', '-')],
        ['Contact Person', provider.get('contact_person', '-')],
        ['Contact Number', provider.get('contact_number', '-')],
        ['Email', provider.get('email', '-')],
        ['NABL Certificate No', provider.get('nabl_cert_no', '-')],
    ]
    
    provider_table = Table(provider_data, colWidths=[180, 335])
    provider_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(provider_table)
    elements.append(PageBreak())
    
    return elements


def create_calibration_scope_section(contract, styles):
    """Create Scope of Calibration Services Section"""
    elements = []
    
    header = Table([['SECTION - E: SCOPE OF CALIBRATION SERVICES']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    contract_details = contract.get('contract_details', {})
    scope_text = contract_details.get('scope_of_work', '')
    
    scope_style = ParagraphStyle(
        'ScopeText',
        fontSize=10,
        fontName='Helvetica',
        leading=14,
        alignment=TA_JUSTIFY,
        spaceBefore=5,
        spaceAfter=10
    )
    
    if scope_text:
        elements.append(Paragraph("<b>Scope of Work:</b>", styles['SectionHeader']))
        elements.append(Spacer(1, 5))
        elements.append(Paragraph(scope_text, scope_style))
        elements.append(Spacer(1, 15))
    
    # Standard scope items
    elements.append(Paragraph("<b>Standard Calibration Services Include:</b>", styles['SectionHeader']))
    elements.append(Spacer(1, 8))
    
    scope_items = [
        "Calibration of all listed meters as per NABL/ISO 17025 standards",
        "Verification of meter accuracy against traceable reference standards",
        "Before and after calibration readings documentation",
        "Issue of calibration certificates with uncertainty values",
        "Recommendations for meter replacement if beyond acceptable tolerance",
        "Traceability to national/international measurement standards",
        "On-site calibration services where applicable",
        "Regular calibration schedule adherence as per contract"
    ]
    
    for item in scope_items:
        elements.append(Paragraph(f"• {item}", ParagraphStyle('ScopeItem', fontSize=10, leftIndent=20, leading=14)))
    
    elements.append(PageBreak())
    return elements


def create_calibration_meter_list(contract, styles):
    """Create Meter/Equipment List Section"""
    elements = []
    
    header = Table([['SECTION - F: METER/EQUIPMENT LIST']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    meters = contract.get('meter_list', [])
    
    if meters:
        elements.append(Paragraph("The following meters/equipment are covered under this calibration contract:", styles['CalBodyText']))
        elements.append(Spacer(1, 10))
        
        meter_header = ['S.No', 'Meter Type', 'Make', 'Model', 'Serial No', 'Range', 'Location']
        meter_data = [meter_header]
        
        for i, meter in enumerate(meters):
            meter_type = METER_TYPES.get(meter.get('meter_type', ''), meter.get('meter_type', ''))
            meter_data.append([
                str(i + 1),
                meter_type,
                meter.get('make', '-'),
                meter.get('model', '-'),
                meter.get('serial_no', '-'),
                meter.get('range', '-'),
                (meter.get('location', '-') or '-')[:15]
            ])
        
        meter_table = Table(meter_data, colWidths=[35, 85, 65, 65, 80, 70, 115])
        meter_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        elements.append(meter_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph(f"<b>Total Meters/Equipment: {len(meters)}</b>", styles['CalBodyText']))
    else:
        elements.append(Paragraph("No meters registered in this contract.", styles['CalBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_calibration_visits_section(contract, styles):
    """Create Calibration Schedule & Visits Section"""
    elements = []
    
    header = Table([['SECTION - G: CALIBRATION SCHEDULE & VISITS']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    visits = contract.get('calibration_visits', [])
    
    if visits:
        elements.append(Paragraph("The following calibration visits have been scheduled/completed:", styles['CalBodyText']))
        elements.append(Spacer(1, 10))
        
        visit_header = ['S.No', 'Visit Date', 'Type', 'Technician', 'Status', 'Reports Linked']
        visit_data = [visit_header]
        
        for i, visit in enumerate(visits):
            status = visit.get('status', 'scheduled')
            test_report_count = len(visit.get('test_report_ids', []))
            visit_data.append([
                str(i + 1),
                format_date_ddmmyyyy(visit.get('visit_date', '')),
                visit.get('visit_type', '-').replace('_', ' ').title(),
                visit.get('technician', '-'),
                status.upper(),
                str(test_report_count)
            ])
        
        visit_table = Table(visit_data, colWidths=[40, 85, 85, 120, 85, 100])
        visit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (4, 0), (5, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        elements.append(visit_table)
        
        # Summary
        completed = len([v for v in visits if v.get('status') == 'completed'])
        pending = len(visits) - completed
        elements.append(Spacer(1, 15))
        elements.append(Paragraph(f"<b>Summary:</b> Total Visits: {len(visits)} | Completed: {completed} | Pending: {pending}", styles['CalBodyText']))
    else:
        elements.append(Paragraph("No calibration visits scheduled yet.", styles['CalBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_calibration_test_reports_section(contract, test_reports, styles):
    """Create Equipment Test Reports Section - EXACT match to AMC"""
    elements = []
    
    header = Table([['SECTION - H: EQUIPMENT TEST REPORTS']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    if test_reports:
        elements.append(Paragraph("The following equipment test reports are linked to this calibration contract:", styles['CalBodyText']))
        elements.append(Spacer(1, 10))
        
        report_header = ['S.No', 'Report No', 'Equipment Type', 'Test Date', 'Status']
        report_data = [report_header]
        
        for i, report in enumerate(test_reports):
            equip_type = report.get('equipment_type', '').replace('_', ' ').replace('-', ' ').title()
            report_data.append([
                str(i + 1),
                report.get('report_no', '-'),
                equip_type,
                format_date_ddmmyyyy(report.get('test_date', '')),
                report.get('status', '-').title()
            ])
        
        report_table = Table(report_data, colWidths=[40, 120, 150, 100, 105])
        report_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        elements.append(report_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("<i>Note: Detailed equipment test reports are attached in the annexure section.</i>", 
            ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')))
    else:
        elements.append(Paragraph("No equipment test reports linked to this contract.", styles['CalBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_calibration_documents_section(contract, styles, has_test_reports=False):
    """Create Documents & Attachments Section - Shows actual user-entered documents"""
    elements = []
    
    section_letter = 'I' if has_test_reports else 'H'
    
    header = Table([[f'SECTION - {section_letter}: DOCUMENTS & ATTACHMENTS']], colWidths=[515])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 15))
    
    # Get actual statutory documents from contract
    statutory_docs = contract.get('statutory_documents', [])
    
    if statutory_docs:
        elements.append(Paragraph("<b>Statutory Documents & Attachments:</b>", styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        # Document type labels
        doc_type_labels = {
            'calibration_certificate': 'Calibration Certificate',
            'nabl_certificate': 'NABL Certificate',
            'test_certificate': 'Test Certificate',
            'compliance_certificate': 'Compliance Certificate',
            'safety_certificate': 'Safety Certificate',
            'warranty_document': 'Warranty Document',
            'manufacturer_datasheet': 'Manufacturer Datasheet',
            'iso_certificate': 'ISO Certificate',
            'other': 'Other Document'
        }
        
        # Table header
        doc_table_data = [['S.No', 'Document Name', 'Reference No.', 'Valid From', 'Valid Until', 'Status']]
        
        for i, doc in enumerate(statutory_docs):
            doc_type = doc_type_labels.get(doc.get('document_type', ''), doc.get('document_type', 'Document'))
            doc_name = doc.get('document_name', '') or doc_type
            ref_no = doc.get('reference_no', '-')
            issue_date = format_date_ddmmyyyy(doc.get('issue_date', '')) if doc.get('issue_date') else '-'
            expiry_date = format_date_ddmmyyyy(doc.get('expiry_date', '')) if doc.get('expiry_date') else '-'
            has_file = 'Attached' if doc.get('file_url') else 'Pending'
            
            doc_table_data.append([str(i + 1), doc_name, ref_no, issue_date, expiry_date, has_file])
        
        doc_table = Table(doc_table_data, colWidths=[40, 180, 100, 70, 70, 55])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (3, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        elements.append(doc_table)
        elements.append(Spacer(1, 15))
        
        # Add note about annexure
        attached_count = sum(1 for doc in statutory_docs if doc.get('file_url'))
        if attached_count > 0:
            elements.append(Paragraph(
                f"<i>Note: {attached_count} document(s) are attached in Annexure - 2</i>",
                styles['CalSmallText']
            ))
    else:
        elements.append(Paragraph("<b>Statutory Documents:</b>", styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("No statutory documents have been attached to this contract.", styles['CalBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_calibration_back_cover(styles):
    """Create back cover - EXACT clone of AMC back cover (Contact Us page)"""
    elements = []
    
    # Check if back cover is enabled
    if not is_back_cover_enabled():
        return elements
    
    # Get template settings
    back_settings = get_back_cover_settings()
    company_info = get_pdf_company_info()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    logo_path = get_pdf_logo_path()
    primary_orange = get_pdf_primary_color()
    
    elements.append(Spacer(1, 180))
    
    # Company Logo (if enabled)
    if back_settings.get('show_logo', True) and logo_path:
        try:
            if os.path.exists(logo_path):
                logo = Image(logo_path, width=200, height=80)
                logo_table = Table([[logo]], colWidths=[515])
                logo_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                elements.append(logo_table)
                elements.append(Spacer(1, 40))
        except Exception as e:
            pass
    
    # Contact Us Header
    back_title = back_settings.get('title', 'Contact Us')
    contact_header = ParagraphStyle(
        'ContactHeader',
        fontSize=18,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    elements.append(Paragraph(back_title, contact_header))
    elements.append(Spacer(1, 15))
    
    # Company Name
    company_style = ParagraphStyle(
        'CompanyName',
        fontSize=16,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    elements.append(Paragraph(company_name, company_style))
    
    # Address (if enabled)
    if back_settings.get('show_address', True):
        address_style = ParagraphStyle(
            'Address',
            fontSize=11,
            fontName='Helvetica',
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            spaceAfter=5,
            leading=16
        )
        address_parts = []
        if company_info.get('address_line1'):
            address_parts.append(company_info.get('address_line1'))
        if company_info.get('address_line2'):
            address_parts.append(company_info.get('address_line2'))
        city_state = []
        if company_info.get('city'):
            city_state.append(company_info.get('city'))
        if company_info.get('state'):
            city_state.append(company_info.get('state'))
        if company_info.get('postal_code'):
            city_state.append(f"Pincode- {company_info.get('postal_code')}")
        if city_state:
            address_parts.append(', '.join(city_state))
        
        if address_parts:
            elements.append(Paragraph("<br/>".join(address_parts), address_style))
            elements.append(Spacer(1, 25))
    
    # Contact Details
    contact_style = ParagraphStyle(
        'ContactDetails',
        fontSize=12,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
        spaceAfter=8
    )
    
    # Phone (if enabled)
    if back_settings.get('show_phone', True) and company_info.get('phone'):
        elements.append(Paragraph(f"<b>Tel:</b> {company_info.get('phone')}", contact_style))
    if company_info.get('alt_phone'):
        elements.append(Paragraph(f"<b>Mobile:</b> {company_info.get('alt_phone')}", contact_style))
    
    # Email (if enabled)
    if back_settings.get('show_email', True) and company_info.get('email'):
        elements.append(Paragraph(f"<b>E-mail:</b> {company_info.get('email')}", contact_style))
    
    elements.append(Spacer(1, 40))
    
    # Website (if enabled)
    if back_settings.get('show_website', True):
        website_style = ParagraphStyle(
            'Website',
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=primary_orange,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(website, website_style))
    
    # Additional text (if provided)
    if back_settings.get('additional_text'):
        additional_style = ParagraphStyle(
            'Additional',
            fontSize=10,
            fontName='Helvetica-Oblique',
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            spaceBefore=20
        )
        elements.append(Paragraph(back_settings.get('additional_text'), additional_style))
    
    return elements
    
    return elements


@router.get("/{contract_id}/report-pdf")
async def generate_calibration_contract_report(contract_id: str):
    """Generate comprehensive Calibration Contract Report - EXACT AMC clone"""
    db = get_db()
    
    # Fetch contract
    contract = await db.calibration_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Calibration contract not found")
    
    # Fetch project if linked
    project = None
    if contract.get('project_id'):
        project = await db.projects.find_one({"id": contract['project_id']}, {"_id": 0})
    
    # Get organization settings
    org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0}) or {}
    
    # Collect all linked test report IDs from visits
    test_report_ids = []
    for visit in contract.get('calibration_visits', []):
        test_report_ids.extend(visit.get('test_report_ids', []))
    
    # Fetch test reports
    test_reports = []
    if test_report_ids:
        test_reports = await db.test_reports.find(
            {"id": {"$in": list(set(test_report_ids))}},
            {"_id": 0}
        ).to_list(100)
    
    from reportlab.pdfgen import canvas as canvas_module
    
    # =====================================================
    # GENERATE PDF LIKE AMC - Single doc.build with callbacks
    # =====================================================
    buffer = BytesIO()
    
    styles = get_styles()
    elements = []
    
    # Page counter for header/footer (matching AMC approach)
    page_num = [1]
    width, height = A4
    
    def on_page(canvas_obj, doc):
        if page_num[0] == 1:
            # Draw cover page (like AMC)
            draw_calibration_cover_page(canvas_obj, width, height, contract, project, org_settings)
            # Draw cover page footer
            margin = 40
            primary_orange = colors.HexColor('#F7931E')
            footer_y = 25
            canvas_obj.setStrokeColor(primary_orange)
            canvas_obj.setLineWidth(2)
            canvas_obj.line(margin, footer_y + 15, width - margin, footer_y + 15)
            canvas_obj.setFont('Helvetica-Bold', 7)
            canvas_obj.setFillColor(colors.HexColor('#333333'))
            canvas_obj.drawString(margin, footer_y + 5, 'Enerzia Power Solutions')
            canvas_obj.setFont('Helvetica', 8)
            canvas_obj.setFillColor(primary_orange)
            canvas_obj.drawCentredString(width / 2, footer_y + 5, 'www.enerzia.com')
        else:
            draw_calibration_header_footer(canvas_obj, doc, contract, page_num[0])
        page_num[0] += 1
    
    def on_page_later(canvas_obj, doc):
        draw_calibration_header_footer(canvas_obj, doc, contract, page_num[0])
        page_num[0] += 1
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=70,
        bottomMargin=50
    )
    
    # Build elements
    # Cover page is drawn by on_page callback, just add a page break (like AMC)
    elements.append(Spacer(1, 500))
    elements.append(PageBreak())
    
    # Table of Contents
    elements.extend(create_calibration_toc(contract, styles, len(test_reports)))
    
    # Section A: Executive Summary
    elements.extend(create_calibration_executive_summary(contract, project, styles))
    
    # Section B: Contract Details
    elements.extend(create_calibration_contract_details(contract, styles))
    
    # Section C: Customer Information
    elements.extend(create_calibration_customer_info(contract, styles))
    
    # Section D: Service Provider Details
    elements.extend(create_calibration_service_provider(contract, styles))
    
    # Section E: Scope of Calibration Services
    elements.extend(create_calibration_scope_section(contract, styles))
    
    # Section F: Meter/Equipment List
    elements.extend(create_calibration_meter_list(contract, styles))
    
    # Section G: Calibration Schedule & Visits
    elements.extend(create_calibration_visits_section(contract, styles))
    
    # Section H: Equipment Test Reports (if any)
    if test_reports:
        elements.extend(create_calibration_test_reports_section(contract, test_reports, styles))
    
    # Section I (or H): Documents & Attachments
    elements.extend(create_calibration_documents_section(contract, styles, len(test_reports) > 0))
    
    # Build main PDF content (back cover will be added after all annexures)
    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page_later)
    buffer.seek(0)
    
    # =====================================================
    # PREPARE FINAL PDF WITH ANNEXURES AND BACK COVER
    # Order: Main Content -> Annexure 1 (Test Reports) -> Annexure 2 (Statutory Docs) -> Back Cover
    # =====================================================
    writer = PdfWriter()
    
    # Add main report pages first
    main_reader = PdfReader(buffer)
    for page in main_reader.pages:
        writer.add_page(page)
    
    # =====================================================
    # ANNEXURE - 1: Equipment Test Reports (if any)
    # =====================================================
    if test_reports:
        try:
            # Create separator page for annexure 1
            sep_buffer = BytesIO()
            sep_doc = SimpleDocTemplate(sep_buffer, pagesize=A4, topMargin=40, bottomMargin=40)
            sep_elements = []
            sep_elements.append(Spacer(1, 250))
            
            sep_header = ParagraphStyle('AnnexHeader', fontSize=24, fontName='Helvetica-Bold', textColor=PRIMARY_BLUE, alignment=TA_CENTER)
            sep_title = ParagraphStyle('AnnexTitle', fontSize=18, fontName='Helvetica', textColor=PRIMARY_BLUE, alignment=TA_CENTER)
            sep_subtitle = ParagraphStyle('AnnexSub', fontSize=12, textColor=colors.gray, alignment=TA_CENTER)
            
            sep_elements.append(Paragraph("ANNEXURE - 1", sep_header))
            sep_elements.append(Spacer(1, 20))
            sep_elements.append(Paragraph("Equipment Test Reports", sep_title))
            sep_elements.append(Spacer(1, 20))
            sep_elements.append(Paragraph(f"The following {len(test_reports)} equipment test report(s) are attached.", sep_subtitle))
            
            sep_doc.build(sep_elements)
            sep_buffer.seek(0)
            
            sep_reader = PdfReader(sep_buffer)
            for page in sep_reader.pages:
                writer.add_page(page)
            
            # Attach each test report PDF
            from routes.equipment_pdf import generate_test_report_pdf
            for report in test_reports:
                try:
                    equipment_type = report.get('equipment_type', '')
                    report_id = report.get('id', '')
                    if equipment_type and report_id:
                        report_pdf = await generate_test_report_pdf(equipment_type, report_id)
                        if report_pdf:
                            report_pdf.seek(0)
                            report_reader = PdfReader(report_pdf)
                            for page in report_reader.pages:
                                writer.add_page(page)
                except Exception as e:
                    print(f"Error attaching test report {report.get('id')}: {e}")
        except Exception as e:
            print(f"Error creating Annexure-1: {e}")
    
    # =====================================================
    # ANNEXURE - 2: Statutory Documents (if any with file attachments)
    # =====================================================
    # Get statutory documents from contract that have file attachments
    statutory_docs = contract.get('statutory_documents', [])
    docs_with_files = [doc for doc in statutory_docs if doc.get('file_url')]
    
    print(f"=== ANNEXURE-2 DEBUG: Found {len(docs_with_files)} docs with files out of {len(statutory_docs)} total ===")
    
    if docs_with_files:
        try:
            # Create separator page for annexure 2
            annex2_buffer = BytesIO()
            annex2_doc = SimpleDocTemplate(annex2_buffer, pagesize=A4, topMargin=40, bottomMargin=40)
            annex2_elements = []
            annex2_elements.append(Spacer(1, 250))
            
            annex2_header = ParagraphStyle('Annex2Header', fontSize=24, fontName='Helvetica-Bold', textColor=PRIMARY_BLUE, alignment=TA_CENTER)
            annex2_title = ParagraphStyle('Annex2Title', fontSize=18, fontName='Helvetica', textColor=PRIMARY_BLUE, alignment=TA_CENTER)
            annex2_subtitle = ParagraphStyle('Annex2Sub', fontSize=12, textColor=colors.gray, alignment=TA_CENTER)
            
            annex2_elements.append(Paragraph("ANNEXURE - 2", annex2_header))
            annex2_elements.append(Spacer(1, 20))
            annex2_elements.append(Paragraph("Statutory Documents", annex2_title))
            annex2_elements.append(Spacer(1, 20))
            annex2_elements.append(Paragraph(f"The following {len(docs_with_files)} statutory document(s) are attached.", annex2_subtitle))
            
            annex2_doc.build(annex2_elements)
            annex2_buffer.seek(0)
            
            annex2_reader = PdfReader(annex2_buffer)
            for page in annex2_reader.pages:
                writer.add_page(page)
            
            print(f"=== Added Annexure-2 separator page ===")
            
            # Attach actual statutory document PDFs
            for doc in docs_with_files:
                try:
                    file_url = doc.get('file_url', '')
                    doc_name = doc.get('document_name', 'Unknown')
                    
                    print(f"=== Processing doc: {doc_name}, file_url: {file_url} ===")
                    
                    if file_url:
                        local_path = None
                        
                        # Handle different URL formats
                        if file_url.startswith('/api/uploads/'):
                            # Format: /api/uploads/category/filename.pdf
                            local_path = f"/app/uploads/{file_url.replace('/api/uploads/', '')}"
                        elif file_url.startswith('/uploads/'):
                            # Format: /uploads/filename.pdf
                            local_path = f"/app{file_url}"
                        elif file_url.startswith('/'):
                            # Other relative paths
                            local_path = f"/app{file_url}"
                        
                        print(f"=== Local path resolved: {local_path} ===")
                        
                        if local_path and os.path.exists(local_path):
                            print(f"=== File EXISTS, attaching: {local_path} ===")
                            with open(local_path, 'rb') as f:
                                doc_reader = PdfReader(f)
                                page_count = len(doc_reader.pages)
                                for page in doc_reader.pages:
                                    writer.add_page(page)
                                print(f"✅ Attached statutory doc: {doc_name} ({page_count} pages)")
                        elif file_url.startswith('http'):
                            # Remote URL - download and attach
                            print(f"=== Downloading from URL: {file_url} ===")
                            import httpx
                            async with httpx.AsyncClient() as client:
                                response = await client.get(file_url, timeout=30.0)
                                if response.status_code == 200:
                                    doc_buffer = BytesIO(response.content)
                                    doc_reader = PdfReader(doc_buffer)
                                    for page in doc_reader.pages:
                                        writer.add_page(page)
                                    print(f"✅ Attached statutory doc from URL: {doc_name}")
                                else:
                                    print(f"❌ Failed to download: {doc_name} (HTTP {response.status_code})")
                        else:
                            print(f"❌ File NOT FOUND: {local_path or file_url}")
                except Exception as e:
                    print(f"❌ Error attaching statutory doc {doc.get('document_name', '')}: {str(e)}")
                    import traceback
                    traceback.print_exc()
        except Exception as e:
            print(f"Error creating Annexure-2: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # =====================================================
    # ADD BACK COVER (Contact Us) - ALWAYS LAST PAGE
    # =====================================================
    try:
        back_cover_buffer = BytesIO()
        back_cover_doc = SimpleDocTemplate(
            back_cover_buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=50,
            bottomMargin=50
        )
        back_cover_elements = create_calibration_back_cover(styles)
        back_cover_doc.build(back_cover_elements)
        back_cover_buffer.seek(0)
        back_cover_reader = PdfReader(back_cover_buffer)
        for page in back_cover_reader.pages:
            writer.add_page(page)
    except Exception as e:
        print(f"Error adding back cover: {e}")
    
    # Write final merged PDF
    final_buffer = BytesIO()
    writer.write(final_buffer)
    final_buffer.seek(0)
    
    contract_no = contract.get('contract_no', '') or contract.get('contract_details', {}).get('contract_no', contract_id[:8])
    filename = f"Calibration_Service_Report_{contract_no}.pdf"
    
    return StreamingResponse(
        final_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
