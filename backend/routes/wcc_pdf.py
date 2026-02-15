"""
Work Completion Certificate PDF Generator - Using Equipment Report Template Style
Complete implementation with ALL fields from certificate data
Uses shared pdf_base module for common styles and canvas.
"""
import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
import requests

# Import shared PDF components
from routes.pdf_base import (
    BORDER_COLOR, LIGHT_GRAY, DARK_TEXT, GRAY_TEXT,
    create_base_styles, BaseNumberedCanvas, format_date_ddmmyyyy
)


def get_styles():
    """Create paragraph styles for the PDF - using base styles."""
    return create_base_styles()


def get_logo_image(org_settings, width=100):
    """Fetch and create logo image element."""
    try:
        local_paths = [
            '/app/backend/uploads/company_logo.png',
            '/app/backend/uploads/enerzia_logo_2025.png'
        ]
        for local_path in local_paths:
            if os.path.exists(local_path):
                img = Image(local_path, width=width, height=width*0.35)
                return img
        
        logo_url = org_settings.get('logo_url', '') if org_settings else ''
        if logo_url and logo_url.startswith('http'):
            response = requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                img_data = io.BytesIO(response.content)
                return Image(img_data, width=width, height=width*0.35)
    except Exception as e:
        print(f"Error loading logo: {e}")
    return None


def fmt_currency(amount):
    """Format amount as currency without Rs. prefix."""
    if amount is None:
        amount = 0
    try:
        return f"{float(amount):,.2f}"
    except (ValueError, TypeError):
        return f"{amount}"


def generate_wcc_pdf_buffer(certificate: dict, org_settings: dict):
    """Generate PDF buffer for work completion certificate with ALL fields."""
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 30  # Same margin as Service Report
    content_width = page_width - (2 * margin)
    col_width = content_width / 4
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin + 25  # More space for footer
    )
    
    styles = get_styles()
    elements = []
    
    # ============ HEADER SECTION ============
    # Title on left, Logo on right
    title_cell = Paragraph("<b>WORK COMPLETION CERTIFICATE</b>", styles['ReportTitle'])
    logo_img = get_logo_image(org_settings)
    
    if logo_img:
        header_data = [[title_cell, logo_img]]
    else:
        org_name = org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions'
        header_data = [[title_cell, Paragraph(f"<b>{org_name}</b>", styles['CustomBodyText'])]]
    
    header_table = Table(header_data, colWidths=[content_width*0.6, content_width*0.4])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6))
    
    # Document # and Date row
    wcc_no = certificate.get('document_no', '') or certificate.get('wcc_no', 'N/A')
    info_data = [[f"Doc No: {wcc_no}", f"Certificate Date: {format_date_ddmmyyyy(certificate.get('certificate_date', '-'))}"]]
    info_table = Table(info_data, colWidths=[content_width*0.5, content_width*0.5])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6))
    
    # ============ PROJECT INFORMATION ============
    proj_header = Table([[Paragraph("<b>PROJECT INFORMATION</b>", styles['SectionHeader'])]], colWidths=[content_width])
    proj_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(proj_header)
    
    # Build multi-line customer address
    cust_addr = certificate.get('customer_address', '-')
    if cust_addr and cust_addr != '-':
        # If address contains commas, split into multiple lines
        if ',' in str(cust_addr):
            addr_parts = [p.strip() for p in str(cust_addr).split(',')]
            cust_addr_display = '<br/>'.join(addr_parts)
        else:
            cust_addr_display = str(cust_addr)
    else:
        cust_addr_display = '-'
    
    proj_data = [
        [Paragraph("<b>Project Name:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('project_name', '-')), styles['SmallText']),
         Paragraph("<b>PID No:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('pid_no', '-')), styles['SmallText'])],
        [Paragraph("<b>Customer Name:</b>", styles['LabelText']), 
         Paragraph(f"M/s. {certificate.get('customer_name', '-')}", styles['SmallText']),
         Paragraph("<b>Customer Rep:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('customer_representative', '-')), styles['SmallText'])],
        [Paragraph("<b>Site Location:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('site_location', '-')), styles['SmallText']),
         Paragraph("<b>Customer Address:</b>", styles['LabelText']), 
         Paragraph(cust_addr_display, styles['SmallText'])],
    ]
    
    proj_table = Table(proj_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    proj_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
    ]))
    elements.append(proj_table)
    elements.append(Spacer(1, 6))
    
    # ============ ORDER DETAILS ============
    order_header = Table([[Paragraph("<b>ORDER DETAILS</b>", styles['SectionHeader'])]], colWidths=[content_width])
    order_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(order_header)
    
    order_data = [
        [Paragraph("<b>Order No:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('order_no', '-')), styles['SmallText']),
         Paragraph("<b>Order Dated:</b>", styles['LabelText']), 
         Paragraph(format_date_ddmmyyyy(str(certificate.get('order_dated', '-'))), styles['SmallText'])],
        [Paragraph("<b>Order Amount:</b>", styles['LabelText']), 
         Paragraph(fmt_currency(certificate.get('order_amount', 0)), styles['SmallText']),
         Paragraph("<b>Billed Amount:</b>", styles['LabelText']), 
         Paragraph(fmt_currency(certificate.get('billed_amount', 0)), styles['SmallText'])],
        [Paragraph("<b>Work Started On:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('work_started_on', '-')), styles['SmallText']),
         Paragraph("<b>Completed On:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('completed_on', '-')), styles['SmallText'])],
    ]
    
    order_table = Table(order_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    order_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
    ]))
    elements.append(order_table)
    elements.append(Spacer(1, 6))
    
    # ============ VENDOR / SERVICE PROVIDER DETAILS ============
    vendor_header = Table([[Paragraph("<b>VENDOR / SERVICE PROVIDER DETAILS</b>", styles['SectionHeader'])]], colWidths=[content_width])
    vendor_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(vendor_header)
    
    # Get vendor details - use org_settings if vendor is Enerzia Power Solutions
    vendor_name = certificate.get('vendor_name', '-')
    
    # Build company address from org_settings if vendor is Enerzia
    if vendor_name and 'enerzia' in vendor_name.lower():
        # Use organization settings for Enerzia's address
        vendor_addr_lines = []
        if org_settings.get('address_line1'):
            vendor_addr_lines.append(org_settings.get('address_line1'))
        if org_settings.get('address_line2'):
            vendor_addr_lines.append(org_settings.get('address_line2'))
        city_state_parts = []
        if org_settings.get('city'):
            city_state_parts.append(org_settings.get('city'))
        if org_settings.get('state'):
            city_state_parts.append(org_settings.get('state'))
        if org_settings.get('postal_code'):
            city_state_parts.append(org_settings.get('postal_code'))
        if city_state_parts:
            vendor_addr_lines.append(', '.join(city_state_parts))
        if org_settings.get('country'):
            vendor_addr_lines.append(org_settings.get('country'))
        
        vendor_addr_display = '<br/>'.join(vendor_addr_lines) if vendor_addr_lines else '-'
        
        # Get email and phone from org_settings for Enerzia
        executor_email = certificate.get('executor_email') or org_settings.get('email', '-')
        executor_phone = certificate.get('executor_phone') or org_settings.get('phone', '-')
    else:
        # Use certificate vendor address for external vendors
        vendor_addr = certificate.get('vendor_address', '-')
        if vendor_addr and vendor_addr != '-':
            if ',' in str(vendor_addr):
                addr_parts = [p.strip() for p in str(vendor_addr).split(',')]
                vendor_addr_display = '<br/>'.join(addr_parts)
            else:
                vendor_addr_display = str(vendor_addr)
        else:
            vendor_addr_display = '-'
        
        executor_email = certificate.get('executor_email', '-')
        executor_phone = certificate.get('executor_phone', '-')
    
    vendor_data = [
        [Paragraph("<b>Company Name:</b>", styles['LabelText']), 
         Paragraph(str(vendor_name), styles['SmallText']),
         Paragraph("<b>Company Address:</b>", styles['LabelText']), 
         Paragraph(vendor_addr_display, styles['SmallText'])],
        [Paragraph("<b>Executed By:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('executed_by', '-')), styles['SmallText']),
         Paragraph("<b>Supervised By:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('supervised_by', '-')), styles['SmallText'])],
        [Paragraph("<b>Email ID:</b>", styles['LabelText']), 
         Paragraph(str(executor_email), styles['SmallText']),
         Paragraph("<b>Phone No:</b>", styles['LabelText']), 
         Paragraph(str(executor_phone), styles['SmallText'])],
    ]
    
    vendor_table = Table(vendor_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    vendor_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
    ]))
    elements.append(vendor_table)
    elements.append(Spacer(1, 6))
    
    # ============ WORK SUMMARY ============
    work_header = Table([[Paragraph("<b>WORK SUMMARY</b>", styles['SectionHeader'])]], colWidths=[content_width])
    work_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(work_header)
    
    # Work items table - adjusted column widths for better description display
    work_items = certificate.get('work_items', [])
    
    # Adjusted column widths: wider description, narrower other columns
    work_col_widths = [content_width*0.05, content_width*0.40, content_width*0.07, content_width*0.09, content_width*0.09, content_width*0.10, content_width*0.10, content_width*0.10]
    
    work_data = [
        [Paragraph("<b>S.No</b>", styles['SmallText']), 
         Paragraph("<b>Description</b>", styles['SmallText']), 
         Paragraph("<b>Unit</b>", styles['SmallText']), 
         Paragraph("<b>Order Qty</b>", styles['SmallText']), 
         Paragraph("<b>Billed Qty</b>", styles['SmallText']), 
         Paragraph("<b>Unit Rate</b>", styles['SmallText']), 
         Paragraph("<b>Amount</b>", styles['SmallText']), 
         Paragraph("<b>Status</b>", styles['SmallText'])]
    ]
    
    total_amount = 0
    for idx, item in enumerate(work_items, 1):
        billed_qty = float(item.get('billed_quantity', 0) or 0)
        unit_rate = float(item.get('unit_rate', 0) or 0)
        amount = float(item.get('total_amount', 0) or billed_qty * unit_rate)
        total_amount += amount
        
        # Use Paragraph for description to allow multi-line/paragraph format
        description_text = str(item.get('description', '-'))
        
        work_data.append([
            Paragraph(str(idx), styles['SmallText']),
            Paragraph(description_text, styles['SmallText']),  # Full description, multi-line supported
            Paragraph(str(item.get('unit', '-')), styles['SmallText']),
            Paragraph(str(item.get('order_quantity', '-')), styles['SmallText']),
            Paragraph(str(int(billed_qty) if billed_qty == int(billed_qty) else billed_qty), styles['SmallText']),
            Paragraph(fmt_currency(unit_rate), styles['SmallText']),
            Paragraph(fmt_currency(amount), styles['SmallText']),
            Paragraph(str(item.get('status', '-')), styles['SmallText'])
        ])
    
    # Total Amount row (changed from Sub Total)
    work_data.append(['', '', '', '', '', '', '', ''])  # Spacer row
    work_data.append(['', '', '', '', '', 
                      Paragraph("<b>Total Amount:</b>", styles['LabelText']), 
                      Paragraph(f"<b>{fmt_currency(total_amount)}</b>", styles['SmallText']), 
                      ''])
    
    work_table = Table(work_data, colWidths=work_col_widths)
    work_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -3), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -3), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (4, -1), 'CENTER'),
        ('ALIGN', (5, 1), (6, -1), 'RIGHT'),
        ('ALIGN', (7, 1), (7, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(work_table)
    elements.append(Spacer(1, 6))
    
    # ============ COMPLIANCE CHECKLIST ============
    comp_header = Table([[Paragraph("<b>COMPLIANCE CHECKLIST</b>", styles['SectionHeader'])]], colWidths=[content_width])
    comp_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(comp_header)
    
    comp_data = [
        [Paragraph("<b>Quality Compliance:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('quality_compliance', '-')), styles['SmallText']),
         Paragraph("<b>As-Built Drawings:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('as_built_drawings', '-')), styles['SmallText'])],
        [Paragraph("<b>Statutory Compliance:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('statutory_compliance', '-')), styles['SmallText']),
         Paragraph("<b>Site Measurements:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('site_measurements', '-')), styles['SmallText'])],
        [Paragraph("<b>Snag Points:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('snag_points', '-')), styles['SmallText']),
         Paragraph("<b>Status:</b>", styles['LabelText']), 
         Paragraph(str(certificate.get('status', '-')), styles['SmallText'])],
    ]
    
    comp_table = Table(comp_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    comp_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
    ]))
    elements.append(comp_table)
    elements.append(Spacer(1, 6))
    
    # ============ ANNEXURES ============
    annexures = certificate.get('annexures', [])
    if annexures:
        annex_header = Table([[Paragraph("<b>ANNEXURES / ATTACHMENTS</b>", styles['SectionHeader'])]], colWidths=[content_width])
        annex_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(annex_header)
        
        annex_data = [['S.No', 'Type', 'Number', 'Dated', 'File']]
        for idx, annex in enumerate(annexures, 1):
            annex_data.append([
                str(idx),
                str(annex.get('type', '-')).replace('_', ' ').title(),
                str(annex.get('number', '-')),
                format_date_ddmmyyyy(str(annex.get('dated', '-'))),
                'Attached' if annex.get('attachment_url') else '-'
            ])
        
        annex_table = Table(annex_data, colWidths=[content_width*0.08, content_width*0.25, content_width*0.25, content_width*0.22, content_width*0.20])
        annex_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(annex_table)
        elements.append(Spacer(1, 6))
    
    # ============ FEEDBACK ============
    feedback_header = Table([[Paragraph("<b>FEEDBACK / COMMENTS</b>", styles['SectionHeader'])]], colWidths=[content_width])
    feedback_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(feedback_header)
    
    feedback_content = [[Paragraph(str(certificate.get('feedback_comments', '-') or '-'), styles['SmallText'])]]
    feedback_table = Table(feedback_content, colWidths=[content_width])
    feedback_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(feedback_table)
    elements.append(Spacer(1, 6))
    
    # ============ SIGNATURES ============
    sig_header = Table([[Paragraph("<b>SIGNATURES & CERTIFICATION</b>", styles['SectionHeader'])]], colWidths=[content_width])
    sig_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_header)
    
    sig_data = [
        ['Prepared By', '', 'Approved By', ''],
        ['', '', '', ''],
        [f"Name: {certificate.get('executed_by', '-')}", '', f"Name: {certificate.get('supervised_by', '-')}", ''],
        [f"Date: {format_date_ddmmyyyy(certificate.get('completed_on', '-'))}", '', f"Date: {format_date_ddmmyyyy(certificate.get('certificate_date', '-'))}", ''],
    ]
    
    sig_table = Table(sig_data, colWidths=[col_width*1.5, col_width*0.5, col_width*1.5, col_width*0.5], rowHeights=[18, 60, 18, 18])
    sig_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
        ('SPAN', (0, 1), (1, 1)),
        ('SPAN', (2, 1), (3, 1)),
        ('SPAN', (0, 2), (1, 2)),
        ('SPAN', (2, 2), (3, 2)),
        ('SPAN', (0, 3), (1, 3)),
        ('SPAN', (2, 3), (3, 3)),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_table)
    
    # Build with custom canvas - using shared BaseNumberedCanvas
    doc.build(
        elements,
        canvasmaker=lambda *args, **kwargs: BaseNumberedCanvas(
            *args,
            report_data=certificate,
            org_settings=org_settings,
            report_title="WORK COMPLETION CERTIFICATE",
            report_no_field='document_no',
            report_date_field='certificate_date',
            **kwargs
        )
    )
    buffer.seek(0)
    
    return buffer
