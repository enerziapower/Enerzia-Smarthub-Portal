"""
Generic Equipment Test Report PDF Generation
Generates professional PDF reports for all equipment types.
Includes email functionality to send reports to customers.
"""
import io
import os
import base64
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import requests
import resend

import sys
sys.path.insert(0, '/app/backend')

from core.database import db
from core.security import require_auth
from core.config import settings
from routes.pdf_base import format_date_ddmmyyyy

router = APIRouter(prefix="/equipment-report", tags=["Equipment Reports"])


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
        # Use full URL for email
        base_url = "https://erp-zoho-sync.preview.emergentagent.com/api"
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
        from datetime import datetime
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
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                {greeting}
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                {intro}
            </p>
            
            {custom_msg_html}
            
            <!-- Report Details Card -->
            {details_html}
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-top: 24px;">
                {closing}
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                {signature}<br/>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: {footer_bg}; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">
                {footer}
            </p>
            {copyright_html}
        </div>
    </div>
    """
    
    return html_content


# Import shared PDF components from pdf_base
from routes.pdf_base import (
    PRIMARY_COLOR, LIGHT_GRAY, DARK_TEXT, GRAY_TEXT, BORDER_COLOR,
    COL_LABEL_WIDTH, COL_VALUE_WIDTH,
    create_base_styles, BaseNumberedCanvas, get_logo_image as base_get_logo_image
)

# Color constants for Relay Test Report sections
HEADER_LIGHT_GRAY = colors.HexColor('#e5e7eb')  # Light grey for all table headers
HEADER_DARK_TEXT = colors.HexColor('#374151')   # Dark grey text for headers

# Equipment type display names and prefixes
EQUIPMENT_INFO = {
    'transformer': {'name': 'Transformer', 'prefix': 'TRN', 'title': 'TRANSFORMER TEST REPORT'},
    'earth-pit': {'name': 'Earth Pit', 'prefix': 'EP', 'title': 'EARTH PIT TEST REPORT'},
    'earth_pit': {'name': 'Earth Pit', 'prefix': 'EP', 'title': 'EARTH PIT TEST REPORT'},
    'energy-meter': {'name': 'Energy Meter', 'prefix': 'EM', 'title': 'ENERGY METER TEST REPORT'},
    'energy_meter': {'name': 'Energy Meter', 'prefix': 'EM', 'title': 'ENERGY METER TEST REPORT'},
    'voltmeter': {'name': 'Voltmeter', 'prefix': 'VM', 'title': 'VOLTMETER TEST REPORT'},
    'ammeter': {'name': 'Ammeter', 'prefix': 'AM', 'title': 'AMMETER TEST REPORT'},
    'mccb': {'name': 'MCCB', 'prefix': 'MCCB', 'title': 'MCCB TEST REPORT'},
    'acb': {'name': 'ACB', 'prefix': 'ACB', 'title': 'ACB TEST REPORT'},
    'vcb': {'name': 'VCB', 'prefix': 'VCB', 'title': 'VCB TEST REPORT'},
    'dg': {'name': 'Diesel Generator', 'prefix': 'DG', 'title': 'DG TEST REPORT'},
    'lighting': {'name': 'Lighting', 'prefix': 'LUX', 'title': 'LIGHTING AUDIT REPORT'},
    'lightning-arrestor': {'name': 'Lightning Arrestor', 'prefix': 'LA', 'title': 'LIGHTNING ARRESTOR TEST REPORT'},
    'ups': {'name': 'UPS', 'prefix': 'UPS', 'title': 'UPS TEST REPORT'},
    'ir-thermography': {'name': 'IR Thermography', 'prefix': 'IR', 'title': 'IR THERMOGRAPHY REPORT'},
    'electrical-panel': {'name': 'Electrical Panel', 'prefix': 'PNL', 'title': 'ELECTRICAL PANEL TEST REPORT'},
    'panel': {'name': 'Electrical Panel', 'prefix': 'PNL', 'title': 'ELECTRICAL PANEL TEST REPORT'},
    'relay': {'name': 'Relay', 'prefix': 'RLY', 'title': 'RELAY CALIBRATION REPORT'},
    'apfc': {'name': 'APFC', 'prefix': 'APFC', 'title': 'APFC PANEL SERVICE REPORT'},
    'battery': {'name': 'Battery', 'prefix': 'BAT', 'title': 'BATTERY TEST REPORT'},
    'amc': {'name': 'AMC', 'prefix': 'AMC', 'title': 'AMC REPORT'},
    'audit': {'name': 'Audit', 'prefix': 'AUD', 'title': 'AUDIT REPORT'},
    'other': {'name': 'Other', 'prefix': 'OTH', 'title': 'TEST REPORT'}
}


def create_styles():
    """Create paragraph styles for the PDF - using base styles."""
    return create_base_styles()


class EquipmentNumberedCanvas(BaseNumberedCanvas):
    """Equipment Report canvas with dynamic title based on equipment type."""
    
    def __init__(self, *args, report_data=None, org_settings=None, equipment_type=None, **kwargs):
        # Get equipment title dynamically
        equipment_type = equipment_type or 'other'
        equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
        report_title = equipment_info['title']
        
        super().__init__(
            *args,
            report_data=report_data,
            org_settings=org_settings,
            report_title=report_title,
            report_no_field='report_no',
            report_date_field='report_date',
            **kwargs
        )
        self.equipment_type = equipment_type


def get_logo_image(logo_url, width=120):
    """Fetch and create logo image element."""
    try:
        # First try local file path
        local_path = '/app/backend/uploads/company_logo.png'
        if os.path.exists(local_path):
            img = Image(local_path, width=width, height=width*0.35)
            return img
        
        # Then try URL
        if logo_url and logo_url.startswith('http'):
            response = requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                img_data = io.BytesIO(response.content)
                return Image(img_data, width=width, height=width*0.35)
    except Exception as e:
        print(f"Error loading logo: {e}")
    return None


def create_header_section(report, org_settings, styles, width, equipment_type):
    """Create the header section with title and logo."""
    elements = []
    
    # Get equipment info
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
    report_title = equipment_info['title']
    
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
    
    # ROW 2: Report # and Date (restored to top)
    report_date = format_date_ddmmyyyy(report.get('report_date', '') or report.get('test_date', '') or report.get('visit_date', ''))
    report_info = [[f"Report #: {report.get('report_no', 'N/A')}", f"Report Date: {report_date or 'N/A'}"]]
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
    
    # ROW 3: Report Type checkboxes (matching frontend REPORT_TYPES)
    report_types_row1 = ['Periodical Maintenance', 'Breakdown Maintenance', 'Annual Shutdown Maintenance', 'Equipment Testing']
    report_types_row2 = ['Pre-Commissioning', 'Warranty', 'Calibration', 'Routine Inspection']
    
    current_type = report.get('report_type', 'Periodical Maintenance')
    
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


def create_customer_section(report, styles, width):
    """Create customer information section."""
    elements = []
    
    elements.append(Paragraph("CUSTOMER INFORMATION", styles['SectionHeader']))
    
    cell_style = ParagraphStyle(
        name='CellMultiLine',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    # Get customer_info from new structure or fallback to legacy fields
    customer_info = report.get('customer_info', {})
    
    # Get values with multi-line support - prefer new structure, fallback to legacy
    customer_name = (customer_info.get('company_name', '') or report.get('customer_name', '') or '').replace('\n', '<br/>')
    site_location = (customer_info.get('site_location', '') or report.get('site_location', '') or report.get('location', '') or '').replace('\n', '<br/>')
    project_name = (customer_info.get('project_name', '') or report.get('project_name', '') or '').replace('\n', '<br/>')
    contact_person = (customer_info.get('contact_person', '') or report.get('contact_person', '') or '').replace('\n', '<br/>')
    customer_email = customer_info.get('contact_email', '') or report.get('contact_email', '') or report.get('customer_email', '') or ''
    contact_phone = customer_info.get('contact_phone', '') or report.get('contact_phone', '') or ''
    po_ref = customer_info.get('po_ref', '') or report.get('po_ref', '') or ''
    po_dated = format_date_ddmmyyyy(customer_info.get('po_dated', '') or report.get('po_dated', '') or '')
    
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


def create_service_provider_section(report, org_settings, styles, width):
    """Create service provider details section."""
    elements = []
    
    elements.append(Paragraph("SERVICE PROVIDER DETAILS", styles['SectionHeader']))
    
    cell_style = ParagraphStyle(
        name='CellMultiLine',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    # Get service_provider from new structure or fallback to legacy fields
    service_provider = report.get('service_provider', {})
    
    company_name = service_provider.get('company_name', '') or report.get('service_company', '') or (org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions')
    
    company_address = service_provider.get('company_address', '') or report.get('service_address', '')
    if not company_address and org_settings:
        address_parts = []
        if org_settings.get('address_line1'):
            address_parts.append(org_settings.get('address_line1'))
        if org_settings.get('address_line2'):
            address_parts.append(org_settings.get('address_line2'))
        city_state = []
        if org_settings.get('city'):
            city_state.append(org_settings.get('city'))
        if org_settings.get('state'):
            city_state.append(org_settings.get('state'))
        if city_state:
            address_parts.append(', '.join(city_state))
        if org_settings.get('country'):
            address_parts.append(org_settings.get('country'))
        if org_settings.get('postal_code'):
            address_parts.append(f"PIN: {org_settings.get('postal_code')}")
        if address_parts:
            company_address = '<br/>'.join(address_parts)
    
    if company_address:
        company_address = company_address.replace('\n', '<br/>')
    
    engineer_name = service_provider.get('engineer_name', '') or report.get('engineer_name', '') or report.get('tested_by', '') or ''
    engineer_email = service_provider.get('engineer_email', '') or report.get('engineer_email', '') or ''
    engineer_mobile = service_provider.get('engineer_mobile', '') or report.get('engineer_mobile', '') or ''
    
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


def create_equipment_details_section(report, styles, width, equipment_type):
    """Create equipment details section based on equipment type."""
    elements = []
    
    # Skip generic equipment details for battery - it has its own dedicated section
    if equipment_type == 'battery':
        return elements
    
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
    elements.append(Paragraph(f"EQUIPMENT DETAILS - {equipment_info['name'].upper()}", styles['SectionHeader']))
    
    # ACB has completely different equipment details structure
    if equipment_type == 'acb':
        equipment_details = report.get('equipment_details', {})
        date_of_testing = format_date_ddmmyyyy(report.get('date_of_testing', '') or report.get('test_date', '') or '')
        date_of_energization = format_date_ddmmyyyy(report.get('date_of_energization', '') or '')
        
        # Get make and model - check both equipment_details and direct report fields
        make = equipment_details.get('make_type', '') or report.get('make', '') or report.get('make_type', '')
        # Only append model if we're using root-level make fields (not equipment_details.make_type)
        model = ''
        if not equipment_details.get('make_type'):
            model = report.get('model', '')
        make_model_str = f"{make} {model}".strip() if model else make
        
        # Get rating values - check both places
        rated_current = equipment_details.get('rated_current', '') or report.get('acb_rating', '') or report.get('rated_current', '')
        rated_voltage = equipment_details.get('rated_voltage', '') or report.get('voltage_rating', '') or report.get('rated_voltage', '')
        
        # ACB uses adjusted column widths for longer labels (22%, 28%, 22%, 28%)
        acb_col_label = 0.22
        acb_col_value = 0.28
        
        data = [
            ['Switchgear:', equipment_details.get('switchgear', '') or report.get('switchgear', ''), 
             'Feeder Ref/Device:', equipment_details.get('feeder_reference', '') or report.get('feeder_reference', '')],
            ['Make/Type:', make_model_str, 
             'Rated Current (A):', rated_current],
            ['Rated Voltage (V):', rated_voltage, 
             'Serial Number:', equipment_details.get('serial_number', '') or report.get('serial_no', '') or report.get('serial_number', '')],
            ['Control Voltage (V):', equipment_details.get('control_voltage', '') or report.get('control_voltage', ''), 
             'Spring Motor (V):', equipment_details.get('spring_charge_motor_voltage', '') or report.get('spring_charge_motor_voltage', '')],
            ['No. of Poles:', report.get('poles', ''), 
             'Date of Testing:', date_of_testing],
            ['Breaking Capacity:', equipment_details.get('rated_breaking_capacity', '') or report.get('rated_breaking_capacity', ''), 
             'Date of Energization:', date_of_energization],
        ]
        
        table = Table(data, colWidths=[width*acb_col_label, width*acb_col_value, width*acb_col_label, width*acb_col_value])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 8))
        
        return elements
    else:
        # Earth Pit has a different structure - only show relevant fields
        if equipment_type == 'earth-pit' or equipment_type == 'earth_pit':
            testing_details = report.get('earth_pit_testing_details', {})
            data = [
                ['Pit Type:', testing_details.get('pit_type', ''), 'Electrode Material:', testing_details.get('electrode_material', '')],
                ['Date of Testing:', format_date_ddmmyyyy(testing_details.get('date_of_testing', '')), 'Next Due On:', format_date_ddmmyyyy(testing_details.get('next_due_on', ''))],
            ]
        elif equipment_type == 'acb':
            # ACB has specific fields: make, model, acb_rating, voltage_rating, poles
            make = report.get('make', '')
            model = report.get('model', '')
            make_model = f"{make} {model}".strip() if make or model else ''
            rating = report.get('acb_rating', '')
            voltage = report.get('voltage_rating', '')
            rating_str = f"{rating}A / {voltage}V" if rating and voltage else rating or voltage or ''
            data = [
                ['Equipment Name:', report.get('equipment_name', 'ACB'), 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '')],
                ['Make:', make, 'Model:', model],
                ['Rated Current (A):', rating, 'Rated Voltage (V):', voltage],
                ['No. of Poles:', report.get('poles', ''), 'Serial No:', report.get('serial_no', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('test_date', '') or report.get('visit_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        elif equipment_type == 'mccb':
            # MCCB has similar fields to ACB
            make = report.get('make', '')
            model = report.get('model', '')
            data = [
                ['Equipment Name:', report.get('equipment_name', 'MCCB'), 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '')],
                ['Make:', make, 'Model:', model],
                ['Rated Current (A):', report.get('rated_current', ''), 'Breaking Capacity:', report.get('breaking_capacity', '')],
                ['No. of Poles:', report.get('poles', ''), 'Trip Setting:', report.get('trip_setting', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('test_date', '') or report.get('visit_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        else:
            # Common fields for other equipment types
            data = [
                ['Equipment Name:', report.get('equipment_name', ''), 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '')],
                ['Make / Model:', report.get('make', '') or report.get('model', ''), 'Serial No:', report.get('serial_no', '')],
                ['Rating:', report.get('rating', '') or report.get('rating_kva', ''), 'Year of Manufacture:', report.get('year_of_manufacture', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('test_date', '') or report.get('visit_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        
        # Add equipment-specific fields (excluding earth-pit since we handled it above)
        if equipment_type == 'energy-meter' or equipment_type == 'energy_meter':
            em_details = report.get('energy_meter_details', {})
            data = [
                ['Meter Name:', em_details.get('meter_name', ''), 'Meter Location:', em_details.get('meter_location', '')],
                ['Meter Accuracy:', em_details.get('meter_accuracy', ''), 'Panel/Feeder Name:', em_details.get('panel_feeder_name', '')],
                ['Make/Model No.:', em_details.get('make_model', ''), 'Serial No.:', em_details.get('serial_no', '')],
                ['CT Ratio:', em_details.get('ct_ratio', ''), 'PT Ratio:', em_details.get('pt_ratio', '')],
                ['System Frequency:', em_details.get('system_frequency', ''), 'System Voltage:', em_details.get('system_voltage', '')],
                ['Date of Calibration:', format_date_ddmmyyyy(em_details.get('date_of_calibration', '')), 'Next Due On:', format_date_ddmmyyyy(em_details.get('next_due_on', ''))],
            ]
        elif equipment_type == 'voltmeter':
            vm_details = report.get('voltmeter_details', {})
            data = [
                ['Meter Name:', vm_details.get('meter_name', ''), 'Meter Location:', vm_details.get('meter_location', '')],
                ['Meter Accuracy:', vm_details.get('meter_accuracy', ''), 'Panel/Feeder Name:', vm_details.get('panel_feeder_name', '')],
                ['Make/Model No.:', vm_details.get('make_model', ''), 'Serial No.:', vm_details.get('serial_no', '')],
                ['Measuring Range:', vm_details.get('measuring_range', ''), 'System Voltage:', vm_details.get('system_voltage', '')],
                ['Date of Calibration:', format_date_ddmmyyyy(vm_details.get('date_of_calibration', '')), 'Next Due On:', format_date_ddmmyyyy(vm_details.get('next_due_on', ''))],
            ]
        elif equipment_type == 'ammeter':
            am_details = report.get('ammeter_details', {})
            data = [
                ['Meter Name:', am_details.get('meter_name', ''), 'Meter Location:', am_details.get('meter_location', '')],
                ['Meter Accuracy:', am_details.get('meter_accuracy', ''), 'Panel/Feeder Name:', am_details.get('panel_feeder_name', '')],
                ['Make/Model No.:', am_details.get('make_model', ''), 'Serial No.:', am_details.get('serial_no', '')],
                ['Measuring Range:', am_details.get('measuring_range', ''), 'CT Ratio:', am_details.get('ct_ratio', '')],
                ['Date of Calibration:', format_date_ddmmyyyy(am_details.get('date_of_calibration', '')), 'Next Due On:', format_date_ddmmyyyy(am_details.get('next_due_on', ''))],
            ]
        elif equipment_type == 'vcb':
            eq_details = report.get('equipment_details', {})
            data = [
                ['Make:', eq_details.get('make', ''), 'Type / Model:', eq_details.get('type_model', '')],
                ['Serial No.:', eq_details.get('serial_no', ''), 'Feeder Name:', eq_details.get('feeder_name', '')],
                ['Rated Voltage (kV):', eq_details.get('rated_voltage', ''), 'Rated Current (A):', eq_details.get('rated_current', '')],
                ['Breaking Capacity (kA):', eq_details.get('breaking_capacity', ''), 'Frequency (Hz):', eq_details.get('frequency', '50')],
                ['No. of Poles:', eq_details.get('no_of_poles', ''), 'Date of Energization:', format_date_ddmmyyyy(eq_details.get('date_of_energization', ''))],
                ['Date of Testing:', format_date_ddmmyyyy(eq_details.get('date_of_testing', '')), 'Next Due Date:', format_date_ddmmyyyy(eq_details.get('next_due_date', ''))],
            ]
        elif equipment_type == 'dg':
            # DG has dedicated fields - create full equipment details section
            data = [
                ['Equipment Name:', report.get('equipment_name', ''), 'Equipment Location:', report.get('equipment_location', '') or report.get('site_location', '')],
                ['Capacity (KVA):', report.get('dg_capacity', '') or report.get('dg_rating', ''), 'Serial No.:', report.get('serial_no', '')],
                ['Engine Make:', report.get('engine_make', ''), 'Engine Model:', report.get('engine_model', '')],
                ['Alternator Make:', report.get('alternator_make', ''), 'Fuel Type:', report.get('fuel_type', 'Diesel')],
                ['Make:', report.get('make', ''), 'Model:', report.get('model', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('test_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        elif equipment_type == 'ups':
            data.extend([
                ['Capacity (KVA):', report.get('capacity_kva', ''), 'Battery Type:', report.get('battery_type', '')],
                ['No. of Batteries:', report.get('battery_count', ''), 'Backup Time (min):', report.get('backup_time', '')],
            ])
        elif equipment_type == 'lighting':
            data.extend([
                ['Area Type:', report.get('area_type', ''), 'Fixture Type:', report.get('fixture_type', '')],
                ['No. of Fixtures:', report.get('fixture_count', ''), 'Measured Lux:', report.get('measured_lux', '')],
            ])
        elif equipment_type == 'lightning-arrestor':
            # Lightning Arrestor uses equipment_details object for storage
            eq_details = report.get('equipment_details', {})
            data = [
                ['Equipment Name:', report.get('equipment_name', ''), 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '')],
                ['LA Type:', eq_details.get('la_type', ''), 'Make:', eq_details.get('make', '')],
                ['Rated Voltage (kV):', eq_details.get('rated_voltage', ''), 'Location:', eq_details.get('location', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('date_of_testing', '') or report.get('test_date', '')), 'Date of Energization:', format_date_ddmmyyyy(report.get('date_of_energization', ''))],
            ]
        elif equipment_type == 'relay':
            # Relay - skip Equipment Name/Location as not in UI
            eq_details = report.get('equipment_details', {})
            relay_details = report.get('relay_details', {})
            data = [
                ['Relay Make:', relay_details.get('make', '') or eq_details.get('make', ''), 'Relay Type:', relay_details.get('type', '') or eq_details.get('relay_type', '')],
                ['Serial No.:', relay_details.get('serial_no', '') or eq_details.get('serial_no', ''), 'CT Sec:', relay_details.get('ct_sec', '') or eq_details.get('ct_sec', '')],
                ['Control Voltage:', relay_details.get('control_voltage', '') or eq_details.get('control_voltage', ''), 'Associated Breaker:', eq_details.get('associated_breaker', '')],
                ['Date of Testing:', format_date_ddmmyyyy(eq_details.get('date_of_testing', '') or report.get('date_of_testing', '') or report.get('test_date', '')), 'Next Due Date:', format_date_ddmmyyyy(eq_details.get('next_due_date', '') or report.get('next_due_date', ''))],
            ]
        elif equipment_type == 'apfc':
            # APFC uses equipment_details object for storage
            eq_details = report.get('equipment_details', {})
            data = [
                ['Equipment Name:', report.get('equipment_name', ''), 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '')],
                ['Panel Name:', eq_details.get('panel_name', ''), 'Make:', eq_details.get('make', '')],
                ['Total KVAR:', eq_details.get('total_kvar', ''), 'No. of Stages:', eq_details.get('no_of_stages', '')],
                ['Controller Make:', eq_details.get('controller_make', ''), 'Controller Model:', eq_details.get('controller_model', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('date_of_testing', '') or report.get('test_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        elif equipment_type == 'battery':
            # Battery has its own dedicated section, use minimal details here
            battery_details = report.get('battery_details', {})
            data = [
                ['Equipment Name:', report.get('equipment_name', '') or 'Battery Bank', 'Equipment Location:', report.get('equipment_location', '') or report.get('location', '') or battery_details.get('location', '')],
                ['Device Name:', battery_details.get('device_name', ''), 'Battery Make:', battery_details.get('battery_make', '')],
                ['Date of Testing:', format_date_ddmmyyyy(report.get('date_of_testing', '') or report.get('test_date', '')), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
            ]
        elif equipment_type == 'electrical-panel':
            data.extend([
                ['Panel Type:', report.get('panel_type', ''), 'Voltage:', report.get('voltage', '')],
                ['No. of Feeders:', report.get('feeder_count', ''), 'Bus Bar Rating:', report.get('busbar_rating', '')],
            ])
        elif equipment_type == 'ir-thermography':
            data.extend([
                ['Camera Model:', report.get('camera_model', ''), 'Emissivity:', report.get('emissivity', '')],
                ['Ambient Temp (°C):', report.get('ambient_temperature', ''), 'Max Temp (°C):', report.get('max_temperature', '')],
            ])
    
    table = Table(data, colWidths=[width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH, width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_acb_checklist_section(report, styles, width):
    """Create Section 1: Detailed Check List for ACB."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('acb_section_toggles', {})
    if section_toggles.get('detailed_checklist') is False:
        return elements
    
    checklist = report.get('checklist', [])
    
    # Always show section header when enabled
    elements.append(Paragraph("SECTION 1: DETAILED CHECK LIST", styles['SectionHeader']))
    
    if not checklist or not isinstance(checklist, list) or len(checklist) == 0:
        elements.append(Paragraph("No checklist data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Create checklist table
    table_data = [['S/NO', 'DESCRIPTION', 'STATUS', 'REMARKS']]
    
    for item in checklist:
        if isinstance(item, dict):
            item_id = item.get('id', '')
            description = item.get('item', item.get('description', ''))
            status = item.get('status', '').upper() if item.get('status') else '-'
            remarks = item.get('remarks', '')
            
            # Convert status to YES/NO/N/A format
            if status == 'YES':
                status_display = 'YES'
            elif status == 'NO':
                status_display = 'NO'
            elif status == 'NA' or status == 'N/A':
                status_display = 'N/A'
            else:
                status_display = status if status else '-'
            
            table_data.append([str(item_id), description, status_display, remarks])
    
    # Create the table
    col_widths = [width*0.08, width*0.52, width*0.15, width*0.25]
    table = Table(table_data, colWidths=col_widths)
    
    table.setStyle(TableStyle([
        # Header row - light grey background to match other sections
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # S/NO centered
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),  # Status centered
        
        # Grid and padding
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_acb_insulation_resistance_section(report, styles, width):
    """Create Section 2: Insulation Resistance Test for ACB."""
    elements = []
    
    insulation_data = report.get('insulation_resistance', {})
    if not insulation_data or not isinstance(insulation_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 2: INSULATION RESISTANCE TEST", styles['SectionHeader']))
    
    # Voltage Applied and Ambient Temp row - aligned with other tables
    voltage_applied = insulation_data.get('voltage_applied', '1000V DC for 60 Sec')
    # Handle corrupted voltage_applied data (when it's an object instead of string)
    if isinstance(voltage_applied, dict):
        voltage_applied = '1000V DC for 60 Sec'  # Use default if corrupted
    
    ambient_temp = insulation_data.get('ambient_temp', '')
    # Handle corrupted ambient_temp data
    if isinstance(ambient_temp, dict):
        ambient_temp = ''
    
    info_data = [
        ['Voltage Applied:', voltage_applied, 'Ambient Temp (°C):', ambient_temp]
    ]
    info_table = Table(info_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8))
    
    # CB OPEN section - equal column widths
    cb_open = insulation_data.get('cb_open', {})
    cb_open_data = [
        ['CB OPEN', "R-R'", "Y-Y'", "B-B'", "N-N'"],
        ['Measured (MΩ)', cb_open.get("R-R'", ''), cb_open.get("Y-Y'", ''), cb_open.get("B-B'", ''), cb_open.get("N-N'", '')]
    ]
    col_width = width / 5
    cb_open_table = Table(cb_open_data, colWidths=[col_width, col_width, col_width, col_width, col_width])
    cb_open_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(cb_open_table)
    elements.append(Spacer(1, 8))
    
    # CB CLOSE - Phase to Earth section
    cb_close_pe = insulation_data.get('cb_close_phase_earth', {})
    cb_close_pe_data = [
        ['CB CLOSE (Phase to Earth)', 'R-E', 'Y-E', 'B-E', 'N-E'],
        ['Measured (MΩ)', cb_close_pe.get('R-E', ''), cb_close_pe.get('Y-E', ''), cb_close_pe.get('B-E', ''), cb_close_pe.get('N-E', '')]
    ]
    cb_close_pe_table = Table(cb_close_pe_data, colWidths=[col_width, col_width, col_width, col_width, col_width])
    cb_close_pe_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(cb_close_pe_table)
    elements.append(Spacer(1, 8))
    
    # CB CLOSE - Phase to Phase section - 4 columns
    cb_close_pp = insulation_data.get('cb_close_phase_phase', {})
    cb_close_pp_data = [
        ['CB CLOSE (Phase to Phase)', 'R-Y', 'Y-B', 'B-R'],
        ['Measured (MΩ)', cb_close_pp.get('R-Y', ''), cb_close_pp.get('Y-B', ''), cb_close_pp.get('B-R', '')]
    ]
    col_width_4 = width / 4
    cb_close_pp_table = Table(cb_close_pp_data, colWidths=[col_width_4, col_width_4, col_width_4, col_width_4])
    cb_close_pp_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(cb_close_pp_table)
    
    elements.append(Paragraph("* Acceptance Criteria: ≥1000 MΩ/Volt", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    
    return elements


def create_acb_coil_resistance_section(report, styles, width):
    """Create Section 3: Coil Resistance Measurement for ACB."""
    elements = []
    
    coil_data = report.get('coil_resistance', {})
    if not coil_data or not isinstance(coil_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 3: MEASUREMENT OF COIL RESISTANCE", styles['SectionHeader']))
    
    # Ambient Temp row
    ambient_temp = coil_data.get('ambient_temp', '')
    
    coil_table_data = [
        ['', 'CLOSE COIL', 'TRIP COIL'],
        ['RESISTANCE (Ω)', coil_data.get('close_coil', ''), coil_data.get('trip_coil', '')]
    ]
    
    if ambient_temp:
        coil_table_data.insert(0, ['Ambient Temp (°C):', ambient_temp, ''])
    
    coil_table = Table(coil_table_data, colWidths=[width*0.34, width*0.33, width*0.33])
    coil_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(coil_table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_acb_contact_resistance_section(report, styles, width):
    """Create Section 4: Contact Resistance Measurement for ACB."""
    elements = []
    
    contact_data = report.get('contact_resistance', {})
    if not contact_data or not isinstance(contact_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 4: MEASUREMENT OF CB CONTACT RESISTANCE", styles['SectionHeader']))
    
    # Injected Current row
    injected_current = contact_data.get('injected_current', '100 Amps DC')
    
    info_data = [['Injected Current:', injected_current]]
    info_table = Table(info_data, colWidths=[width*0.25, width*0.75])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6))
    
    # Phase measurements table
    contact_table_data = [
        ['PHASE', 'R', 'Y', 'B', 'N'],
        ['Measured Value (μΩ)', 
         contact_data.get('r_phase', ''), 
         contact_data.get('y_phase', ''), 
         contact_data.get('b_phase', ''), 
         contact_data.get('n_phase', '')]
    ]
    
    contact_table = Table(contact_table_data, colWidths=[width*0.28, width*0.18, width*0.18, width*0.18, width*0.18])
    contact_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(contact_table)
    
    elements.append(Paragraph("* Acceptance Criteria: Not available in manual. Approx <0.1Ω", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    
    return elements


def create_acb_micrologic_trip_section(report, styles, width):
    """Create Section 5: Micrologic Automatic Trip Test for ACB."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('acb_section_toggles', {})
    if section_toggles.get('micrologic_trip_test') is False:
        return elements
    
    micrologic_data = report.get('micrologic_trip_test', {})
    if not micrologic_data or not isinstance(micrologic_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 5: MICROLOGIC AUTOMATIC TRIP TEST REPORT", styles['SectionHeader']))
    
    # 1. Switchboard Details
    switchboard = micrologic_data.get('switchboard_details', {})
    if switchboard:
        elements.append(Paragraph("1. Switchboard Details", styles['TableHeader']))
        sw_data = [
            ['Report No:', switchboard.get('report_no', ''), 'Test Conducted On:', switchboard.get('test_conducted_on', '')],
            ['Location:', switchboard.get('location', ''), 'Panel Name:', switchboard.get('panel_name', '')],
            ['Feeder Name:', switchboard.get('feeder_name', ''), '', '']
        ]
        sw_table = Table(sw_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        sw_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(sw_table)
        elements.append(Spacer(1, 6))
    
    # 2. Breaker Details
    breaker = micrologic_data.get('breaker_details', {})
    if breaker:
        elements.append(Paragraph("2. Breaker Details", styles['TableHeader']))
        br_data = [
            ['Product Type:', breaker.get('product_type', ''), 'Manufacturer:', breaker.get('manufacturer', '')],
            ['Rated Current:', breaker.get('rated_current', ''), '', '']
        ]
        br_table = Table(br_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        br_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(br_table)
        elements.append(Spacer(1, 6))
    
    # 3. Trip Unit Details
    trip_unit = micrologic_data.get('trip_unit_details', {})
    if trip_unit:
        elements.append(Paragraph("3. Trip Unit Details", styles['TableHeader']))
        tu_data = [
            ['Release Model:', trip_unit.get('release_model', ''), 'Release Type:', trip_unit.get('release_type', '')],
            ['Serial No:', trip_unit.get('serial_no', ''), '', '']
        ]
        tu_table = Table(tu_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        tu_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(tu_table)
        elements.append(Spacer(1, 6))
    
    # 4. Basic Protection Settings
    protection = micrologic_data.get('protection_settings', {})
    if protection:
        elements.append(Paragraph("4. Basic Protection Settings", styles['TableHeader']))
        ps_data = [
            ['Long Time Pickup (Ir):', protection.get('long_time_pickup_ir', ''), 
             'Long Time Delay (Tr):', protection.get('long_time_delay_tr', '')],
            ['Short Time Pickup (Isd):', protection.get('short_time_pickup_isd', ''), 
             'Short Time Delay (Tsd):', protection.get('short_time_delay_tsd', '')],
            ['Instantaneous Pickup (Ii):', protection.get('instantaneous_pickup_ii', ''), 
             'Ground Fault Pickup (Ig):', protection.get('ground_fault_pickup_ig', '')],
            ['Ground Fault Delay (Tg):', protection.get('ground_fault_delay_tg', ''), '', '']
        ]
        ps_table = Table(ps_data, colWidths=[width*0.22, width*0.28, width*0.22, width*0.28])
        ps_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(ps_table)
        elements.append(Spacer(1, 6))
    
    # 5. Automatic Test Results
    test_results = micrologic_data.get('test_results', [])
    if test_results:
        elements.append(Paragraph("5. Automatic Test Results", styles['TableHeader']))
        tr_header = [['Protections', 'Injected Current', 'Expected Trip Time', '', 'Actual Trip Time', 'Result']]
        tr_sub_header = [['', '', 'Min', 'Max', '', '']]
        
        tr_data = tr_header + tr_sub_header
        for result in test_results:
            tr_data.append([
                result.get('protection', ''),
                result.get('injected_current', ''),
                result.get('expected_min_time', ''),
                result.get('expected_max_time', ''),
                result.get('actual_trip_time', ''),
                result.get('result', '')
            ])
        
        tr_table = Table(tr_data, colWidths=[width*0.18, width*0.17, width*0.14, width*0.14, width*0.17, width*0.20])
        tr_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('SPAN', (2, 0), (3, 0)),  # Merge Expected Trip Time header
        ]))
        elements.append(tr_table)
        elements.append(Spacer(1, 6))
    
    # Remarks
    remarks = micrologic_data.get('remarks', '')
    if remarks:
        elements.append(Paragraph("Remarks:", styles['TableHeader']))
        elements.append(Paragraph(remarks, styles['Normal_Small']))
    
    elements.append(Spacer(1, 10))
    return elements


def create_acb_carbon_test_section(report, styles, width):
    """Create Section 6: Carbon Test Report for ACB."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('acb_section_toggles', {})
    if section_toggles.get('carbon_test_report') is False:
        return elements
    
    carbon_data = report.get('carbon_test_report', {})
    
    # Always show section header when enabled (even if empty)
    elements.append(Paragraph("SECTION 6: CARBON TEST REPORT", styles['SectionHeader']))
    
    if not carbon_data or not isinstance(carbon_data, dict):
        elements.append(Paragraph("No carbon test data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    images = carbon_data.get('images', [])
    description = carbon_data.get('description', '')
    
    # Add images
    if images:
        for idx, img_data in enumerate(images):
            try:
                # Handle base64 image data
                if isinstance(img_data, dict) and 'data' in img_data:
                    img_base64 = img_data['data']
                    if img_base64.startswith('data:'):
                        # Remove data URI prefix
                        img_base64 = img_base64.split(',', 1)[1]
                    
                    img_bytes = base64.b64decode(img_base64)
                    img_buffer = io.BytesIO(img_bytes)
                    
                    # Create image element with reasonable size
                    img = Image(img_buffer, width=width*0.6, height=width*0.45)
                    elements.append(img)
                    elements.append(Spacer(1, 8))
            except Exception as e:
                print(f"Error adding carbon test image: {e}")
                continue
    
    # Add description
    if description:
        elements.append(Paragraph("Description:", styles['TableHeader']))
        elements.append(Paragraph(description, styles['Normal_Small']))
    
    elements.append(Spacer(1, 10))
    return elements


# ==================== MCCB PDF SECTIONS ====================

def create_mccb_checklist_section(report, styles, width):
    """Create Section 1: Detailed Check List for MCCB (same as ACB)."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('detailed_checklist') is False:
        return elements
    
    checklist = report.get('checklist', [])
    
    elements.append(Paragraph("SECTION 1: DETAILED CHECK LIST", styles['SectionHeader']))
    
    if not checklist or not isinstance(checklist, list) or len(checklist) == 0:
        elements.append(Paragraph("No checklist data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    table_data = [['S/NO', 'DESCRIPTION', 'STATUS', 'REMARKS']]
    
    for item in checklist:
        if isinstance(item, dict):
            item_id = item.get('id', '')
            description = item.get('item', item.get('description', ''))
            status = item.get('status', '').upper() if item.get('status') else '-'
            remarks = item.get('remarks', '')
            
            if status == 'YES':
                status_display = 'YES'
            elif status == 'NO':
                status_display = 'NO'
            elif status == 'NA' or status == 'N/A':
                status_display = 'N/A'
            else:
                status_display = status if status else '-'
            
            table_data.append([str(item_id), description, status_display, remarks])
    
    col_widths = [width*0.08, width*0.52, width*0.15, width*0.25]
    table = Table(table_data, colWidths=col_widths)
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_insulation_resistance_section(report, styles, width):
    """Create Section 2: Insulation Resistance Test for MCCB."""
    elements = []
    
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('insulation_resistance_test') is False:
        return elements
    
    elements.append(Paragraph("SECTION 2: INSULATION RESISTANCE TEST", styles['SectionHeader']))
    
    insulation_data = report.get('insulation_resistance', {})
    if not insulation_data or not isinstance(insulation_data, dict):
        elements.append(Paragraph("No insulation resistance data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    voltage = insulation_data.get('voltage_applied', '500V DC for 60 Sec')
    ambient = insulation_data.get('ambient_temp', '')
    
    info_data = [
        ['Voltage Applied:', str(voltage), 'Ambient Temp:', f"{ambient}°C" if ambient else '-']
    ]
    info_table = Table(info_data, colWidths=[width*0.2, width*0.3, width*0.2, width*0.3])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6))
    
    # CB Open table
    cb_open = insulation_data.get('cb_open', {})
    if cb_open:
        open_data = [
            ['CB OPEN', "R-R'", "Y-Y'", "B-B'", "N-N'"],
            ['Value (MΩ)', cb_open.get("R-R'", '-'), cb_open.get("Y-Y'", '-'), cb_open.get("B-B'", '-'), cb_open.get("N-N'", '-')]
        ]
        open_table = Table(open_data, colWidths=[width*0.2, width*0.2, width*0.2, width*0.2, width*0.2])
        open_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(open_table)
        elements.append(Spacer(1, 6))
    
    elements.append(Paragraph("* Acceptance Criteria: Should be minimum 1 MΩ", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_coil_resistance_section(report, styles, width):
    """Create Section 3: Coil Resistance Test for MCCB."""
    elements = []
    
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('coil_resistance_test') is False:
        return elements
    
    elements.append(Paragraph("SECTION 3: MEASUREMENT OF COIL RESISTANCE", styles['SectionHeader']))
    
    coil_data = report.get('coil_resistance', {})
    if not coil_data or not isinstance(coil_data, dict):
        elements.append(Paragraph("No coil resistance data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    ambient = coil_data.get('ambient_temp', '')
    close_coil = coil_data.get('close_coil', '-')
    trip_coil = coil_data.get('trip_coil', '-')
    
    data = [
        ['COIL', 'CLOSE', 'TRIP COIL'],
        ['RESISTANCE (Ω)', str(close_coil), str(trip_coil)]
    ]
    table = Table(data, colWidths=[width*0.34, width*0.33, width*0.33])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(table)
    
    if ambient:
        elements.append(Paragraph(f"Ambient Temperature: {ambient}°C", styles['Normal_Small']))
    elements.append(Paragraph("* Acceptance Criteria: As per manufacturer specifications", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_contact_resistance_section(report, styles, width):
    """Create Section 4: Contact Resistance Test for MCCB."""
    elements = []
    
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('contact_resistance_test') is False:
        return elements
    
    elements.append(Paragraph("SECTION 4: MEASUREMENT OF CB CONTACT RESISTANCE", styles['SectionHeader']))
    
    contact_data = report.get('contact_resistance', {})
    if not contact_data or not isinstance(contact_data, dict):
        elements.append(Paragraph("No contact resistance data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    injected = contact_data.get('injected_current', '100 Amps DC')
    elements.append(Paragraph(f"Injected Current: {injected}", styles['Normal_Small']))
    elements.append(Spacer(1, 4))
    
    data = [
        ['PHASE', 'R', 'Y', 'B', 'N'],
        ['Measured Value (μΩ)', 
         contact_data.get('r_phase', '-'), 
         contact_data.get('y_phase', '-'), 
         contact_data.get('b_phase', '-'), 
         contact_data.get('n_phase', '-')]
    ]
    table = Table(data, colWidths=[width*0.28, width*0.18, width*0.18, width*0.18, width*0.18])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(table)
    
    elements.append(Paragraph("* Acceptance Criteria: Not available in manual. Approx <0.1Ω", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_micrologic_trip_section(report, styles, width):
    """Create Section 5: Micrologic Automatic Trip Test for MCCB."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('micrologic_trip_test') is False:
        return elements
    
    micrologic_data = report.get('micrologic_trip_test', {})
    if not micrologic_data or not isinstance(micrologic_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 5: MICROLOGIC AUTOMATIC TRIP TEST", styles['SectionHeader']))
    
    # 1. Switchboard Details
    switchboard = micrologic_data.get('switchboard_details', {})
    if switchboard and isinstance(switchboard, dict):
        sw_data = [
            ['Report No.', switchboard.get('report_no', ''), 'Test Conducted On', switchboard.get('test_conducted_on', '')],
            ['Location', switchboard.get('location', ''), 'Panel Name', switchboard.get('panel_name', '')],
            ['Feeder Name', switchboard.get('feeder_name', ''), '', '']
        ]
        sw_table = Table(sw_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        sw_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(sw_table)
        elements.append(Spacer(1, 6))
    
    # 2. Breaker Details
    breaker = micrologic_data.get('breaker_details', {})
    if breaker and isinstance(breaker, dict):
        elements.append(Paragraph("Breaker Details:", styles['TableHeader']))
        br_data = [
            ['Product Type', breaker.get('product_type', ''), 'Manufacturer', breaker.get('manufacturer', '')],
            ['Rated Current', breaker.get('rated_current', ''), '', '']
        ]
        br_table = Table(br_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        br_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ]))
        elements.append(br_table)
        elements.append(Spacer(1, 6))
    
    # 3. Trip Unit Details
    trip_unit = micrologic_data.get('trip_unit_details', {})
    if trip_unit and isinstance(trip_unit, dict):
        elements.append(Paragraph("Trip Unit Details:", styles['TableHeader']))
        tu_data = [
            ['Release Model', trip_unit.get('release_model', ''), 'Release Type', trip_unit.get('release_type', '')],
            ['Serial No.', trip_unit.get('serial_no', ''), '', '']
        ]
        tu_table = Table(tu_data, colWidths=[width*0.18, width*0.32, width*0.18, width*0.32])
        tu_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ]))
        elements.append(tu_table)
        elements.append(Spacer(1, 6))
    
    # 4. Basic Protection Settings
    protection = micrologic_data.get('protection_settings', {})
    if protection and isinstance(protection, dict):
        elements.append(Paragraph("Basic Protection Settings:", styles['TableHeader']))
        ps_data = [
            ['Long Time Pickup (Ir)', protection.get('long_time_pickup_ir', ''), 'Long Time Delay (tr)', protection.get('long_time_delay_tr', '')],
            ['Short Time Pickup (Isd)', protection.get('short_time_pickup_isd', ''), 'Short Time Delay (tsd)', protection.get('short_time_delay_tsd', '')],
            ['Instantaneous Pickup (Ii)', protection.get('instantaneous_pickup_ii', ''), '', ''],
            ['Ground Fault Pickup (Ig)', protection.get('ground_fault_pickup_ig', ''), 'Ground Fault Delay (tg)', protection.get('ground_fault_delay_tg', '')]
        ]
        ps_table = Table(ps_data, colWidths=[width*0.22, width*0.28, width*0.22, width*0.28])
        ps_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ]))
        elements.append(ps_table)
        elements.append(Spacer(1, 6))
    
    # 5. Automatic Test Results
    test_results = micrologic_data.get('test_results', [])
    if test_results and isinstance(test_results, list) and len(test_results) > 0:
        elements.append(Paragraph("Automatic Test Results:", styles['TableHeader']))
        tr_data = [
            ['Protection', 'Injected Current', 'Expected Trip Time', '', 'Actual Trip Time', 'Result'],
            ['', '', 'Min', 'Max', '', '']
        ]
        for result in test_results:
            if isinstance(result, dict):
                tr_data.append([
                    result.get('protection', ''),
                    result.get('injected_current', ''),
                    result.get('expected_min_time', ''),
                    result.get('expected_max_time', ''),
                    result.get('actual_trip_time', ''),
                    result.get('result', '')
                ])
        
        tr_table = Table(tr_data, colWidths=[width*0.18, width*0.17, width*0.14, width*0.14, width*0.17, width*0.20])
        tr_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('SPAN', (2, 0), (3, 0)),  # Merge Expected Trip Time header
        ]))
        elements.append(tr_table)
        elements.append(Spacer(1, 6))
    
    # Remarks
    remarks = micrologic_data.get('remarks', '')
    if remarks:
        elements.append(Paragraph("Remarks:", styles['TableHeader']))
        elements.append(Paragraph(remarks, styles['Normal_Small']))
    
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_bulk_entries_section(report, styles, width):
    """Create MCCB Bulk Equipment Entries section - Summary table of multiple MCCBs tested."""
    elements = []
    
    bulk_entries = report.get('bulk_entries', [])
    
    if not bulk_entries or not isinstance(bulk_entries, list) or len(bulk_entries) == 0:
        return elements
    
    elements.append(Paragraph("MCCB EQUIPMENT SUMMARY", styles['SectionHeader']))
    
    # Create table header
    table_data = [['S.No', 'Feeder Name', 'Make', 'Poles', 'Rated Current', 'Status', 'Remarks']]
    
    for idx, entry in enumerate(bulk_entries):
        if isinstance(entry, dict):
            table_data.append([
                str(idx + 1),
                entry.get('feeder_name', ''),
                entry.get('make', ''),
                entry.get('poles', ''),
                entry.get('rated_current', ''),
                entry.get('status', ''),
                entry.get('remarks', '')
            ])
    
    col_widths = [width*0.06, width*0.22, width*0.14, width*0.10, width*0.14, width*0.14, width*0.20]
    table = Table(table_data, colWidths=col_widths)
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (3, 1), (5, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_mccb_carbon_test_section(report, styles, width):
    """Create Section 6: Carbon Test Report for MCCB."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('mccb_section_toggles', {})
    if section_toggles.get('carbon_test_report') is False:
        return elements
    
    carbon_data = report.get('carbon_test_report', {})
    
    # Always show section header when enabled (even if empty)
    elements.append(Paragraph("SECTION 6: CARBON TEST REPORT", styles['SectionHeader']))
    
    if not carbon_data or not isinstance(carbon_data, dict):
        elements.append(Paragraph("No carbon test data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    images = carbon_data.get('images', [])
    description = carbon_data.get('description', '')
    
    # Add images
    if images:
        for idx, img_data in enumerate(images):
            try:
                # Handle base64 image data
                if isinstance(img_data, dict) and 'data' in img_data:
                    img_base64 = img_data['data']
                    if img_base64.startswith('data:'):
                        # Remove data URI prefix
                        img_base64 = img_base64.split(',', 1)[1]
                    
                    img_bytes = base64.b64decode(img_base64)
                    img_buffer = io.BytesIO(img_bytes)
                    
                    # Create image element with reasonable size
                    img = Image(img_buffer, width=width*0.6, height=width*0.45)
                    elements.append(img)
                    elements.append(Spacer(1, 8))
            except Exception as e:
                print(f"Error adding carbon test image: {e}")
                continue
    
    # Add description
    if description:
        elements.append(Paragraph("Description:", styles['TableHeader']))
        elements.append(Paragraph(description, styles['Normal_Small']))
    
    elements.append(Spacer(1, 10))
    return elements


# ==================== DG (Diesel Generator) PDF SECTIONS ====================

def create_lightning_arrestor_checklist_section(report, styles, width):
    """Create Lightning Arrestor Checklist section."""
    elements = []
    
    checklist = report.get('checklist', [])
    if not checklist:
        return elements
    
    elements.append(Paragraph("INSPECTION CHECKLIST", styles['SectionHeader']))
    
    data = [['S.No', 'Check Item', 'Status', 'Remarks']]
    
    for idx, item in enumerate(checklist):
        if isinstance(item, dict):
            status = item.get('status', '').upper()
            if status == 'YES':
                status_display = 'YES'
            elif status == 'NO':
                status_display = 'NO'
            elif status == 'NA':
                status_display = 'N/A'
            else:
                status_display = status
            data.append([
                str(idx + 1),
                item.get('item', ''),
                status_display,
                item.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.52, width*0.15, width*0.25])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_lightning_arrestor_test_results_section(report, styles, width):
    """Create Lightning Arrestor Test Results section."""
    elements = []
    
    test_results = report.get('test_results', [])
    if not test_results:
        return elements
    
    elements.append(Paragraph("TEST RESULTS", styles['SectionHeader']))
    
    data = [['S.No', 'Parameter', 'Acceptance Criteria', 'Measured Value', 'Status']]
    
    for idx, result in enumerate(test_results):
        if isinstance(result, dict):
            value = result.get('value', '')
            acceptance = result.get('acceptance', '')
            # Determine status
            status = 'OK' if value else '-'
            data.append([
                str(idx + 1),
                result.get('parameter', ''),
                acceptance,
                value,
                status
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.30, width*0.25, width*0.20, width*0.17])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_relay_checklist_section(report, styles, width):
    """Create Relay Checklist section."""
    elements = []
    
    checklist = report.get('checklist', [])
    if not checklist:
        return elements
    
    elements.append(Paragraph("INSPECTION CHECKLIST", styles['SectionHeader']))
    
    data = [['S.No', 'Check Item', 'Status', 'Remarks']]
    
    for idx, item in enumerate(checklist):
        if isinstance(item, dict):
            status = item.get('status', '').upper()
            if status == 'YES':
                status_display = 'YES'
            elif status == 'NO':
                status_display = 'NO'
            elif status == 'NA':
                status_display = 'N/A'
            else:
                status_display = status
            data.append([
                str(idx + 1),
                item.get('item', ''),
                status_display,
                item.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.52, width*0.15, width*0.25])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_relay_settings_section(report, styles, width):
    """Create Relay Test sections with new format - TEST 1 & TEST 2."""
    elements = []
    
    # Create subsection style inline
    subsection_style = ParagraphStyle(
        'SubSectionHeader',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=5,
        spaceAfter=3
    )
    
    # Relay Details Section
    relay_details = report.get('relay_details', {})
    if relay_details and any(relay_details.values()):
        elements.append(Paragraph("RELAY DETAILS", styles['SectionHeader']))
        
        details_data = [[
            Paragraph("<b>Make:</b> " + str(relay_details.get('make', '-')), styles['Normal']),
            Paragraph("<b>Type:</b> " + str(relay_details.get('type', '-')), styles['Normal']),
            Paragraph("<b>S/No:</b> " + str(relay_details.get('serial_no', '-')), styles['Normal']),
            Paragraph("<b>CT Sec:</b> " + str(relay_details.get('ct_sec', '-')), styles['Normal']),
            Paragraph("<b>Control Voltage:</b> " + str(relay_details.get('control_voltage', '-')), styles['Normal']),
        ]]
        
        details_table = Table(details_data, colWidths=[width*0.2]*5)
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 15))
    
    # Check section toggles
    section_toggles = report.get('relay_section_toggles', {})
    
    # TEST 1: Protection Relay Test
    protection_test = report.get('protection_relay_test', {})
    if section_toggles.get('protection_relay_test', True) and protection_test:
        elements.append(Paragraph("TEST 1: PROTECTION RELAY", styles['SectionHeader']))
        elements.append(Spacer(1, 5))
        
        # Setting Details Table
        setting_details = protection_test.get('setting_details', [])
        if setting_details:
            elements.append(Paragraph("<b>Setting Details</b>", subsection_style))
            
            setting_data = [['FB Name', 'Setting Current', 'Setting TL', 'DMT', 'Remark']]
            for row in setting_details:
                if isinstance(row, dict):
                    setting_data.append([
                        row.get('fb_name', ''),
                        row.get('setting_current', '-'),
                        row.get('setting_tl', '-'),
                        row.get('dmt', '-'),
                        row.get('remark', '-')
                    ])
            
            # Use full width with equal distribution for 5 columns
            setting_table = Table(setting_data, colWidths=[width*0.20]*5)
            setting_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(setting_table)
            elements.append(Spacer(1, 10))
        
        # Pickup Test Table
        pickup_test = protection_test.get('pickup_test', [])
        if pickup_test:
            elements.append(Paragraph("<b>Pickup Test</b>", subsection_style))
            
            pickup_data = [['Phase', 'Setting\nCurrent', 'Setting\nTL', 'Pickup\nCurrent', 'Trip\nTime', 'Hi Set\nPickup Current', 'Hi Set\nTrip Time']]
            for row in pickup_test:
                if isinstance(row, dict):
                    pickup_data.append([
                        row.get('phase', ''),
                        row.get('setting_current', '-'),
                        row.get('setting_tl', '-'),
                        row.get('pickup_current', '-'),
                        row.get('trip_time', '-'),
                        row.get('hi_set_pickup_current', '-'),
                        row.get('hi_set_trip_time', '-')
                    ])
            
            # 7 columns - distribute evenly across full width
            col_w = width / 7
            pickup_table = Table(pickup_data, colWidths=[col_w]*7)
            pickup_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(pickup_table)
            elements.append(Spacer(1, 10))
        
        # Characteristic Check Table
        char_check = protection_test.get('characteristic_check', [])
        if char_check:
            elements.append(Paragraph("<b>Characteristic Check by Secondary Injection Test</b>", subsection_style))
            
            char_data = [['Phase', 'Plug\nSetting', 'TL', 'Graph Time\n@2x', 'Graph Time\n@5x', 'Actual Time\n@2x', 'Actual Time\n@5x']]
            for row in char_check:
                if isinstance(row, dict):
                    char_data.append([
                        row.get('phase', ''),
                        row.get('plug_setting', '-'),
                        row.get('tl', '-'),
                        row.get('graph_time_2x', '-'),
                        row.get('graph_time_5x', '-'),
                        row.get('actual_time_2x', '-'),
                        row.get('actual_time_5x', '-')
                    ])
            
            # 7 columns - distribute evenly across full width
            col_w = width / 7
            char_table = Table(char_data, colWidths=[col_w]*7)
            char_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(char_table)
            elements.append(Spacer(1, 10))
        
        # Remarks
        remarks = protection_test.get('remarks', '')
        if remarks:
            elements.append(Paragraph(f"<b>Remarks:</b> {remarks}", styles['Normal']))
            elements.append(Spacer(1, 15))
    
    # TEST 2: Feeder Protection Relay Test
    feeder_test = report.get('feeder_protection_test', {})
    if section_toggles.get('feeder_protection_test', False) and feeder_test:
        elements.append(Paragraph("TEST 2: FEEDER PROTECTION RELAY", styles['SectionHeader']))
        elements.append(Spacer(1, 5))
        
        # Feeder Relay Details
        feeder_details = feeder_test.get('relay_details', {})
        if feeder_details and any(feeder_details.values()):
            feeder_details_data = [[
                Paragraph("<b>Make:</b> " + str(feeder_details.get('make', '-')), styles['Normal']),
                Paragraph("<b>Type:</b> " + str(feeder_details.get('type', '-')), styles['Normal']),
                Paragraph("<b>S/No:</b> " + str(feeder_details.get('serial_no', '-')), styles['Normal']),
                Paragraph("<b>CT Sec:</b> " + str(feeder_details.get('ct_sec', '-')), styles['Normal']),
                Paragraph("<b>Control Voltage:</b> " + str(feeder_details.get('control_voltage', '-')), styles['Normal']),
            ]]
            
            feeder_details_table = Table(feeder_details_data, colWidths=[width*0.2]*5)
            feeder_details_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(feeder_details_table)
            elements.append(Spacer(1, 10))
        
        # Feeder Setting Details
        feeder_setting = feeder_test.get('setting_details', [])
        if feeder_setting:
            elements.append(Paragraph("<b>Setting Details</b>", subsection_style))
            
            feeder_setting_data = [['FB Name', 'Setting Current', 'Setting TL', 'DMT', 'Remark']]
            for row in feeder_setting:
                if isinstance(row, dict):
                    feeder_setting_data.append([
                        row.get('fb_name', ''),
                        row.get('setting_current', '-'),
                        row.get('setting_tl', '-'),
                        row.get('dmt', '-'),
                        row.get('remark', '-')
                    ])
            
            # Use full width with equal distribution for 5 columns
            feeder_setting_table = Table(feeder_setting_data, colWidths=[width*0.20]*5)
            feeder_setting_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(feeder_setting_table)
            elements.append(Spacer(1, 10))
        
        # Feeder Pickup Test
        feeder_pickup = feeder_test.get('pickup_test', [])
        if feeder_pickup:
            elements.append(Paragraph("<b>Pickup Test</b>", subsection_style))
            
            feeder_pickup_data = [['Phase', 'Setting Current', 'Setting TL', 'Pickup Current', 'Trip Time']]
            for row in feeder_pickup:
                if isinstance(row, dict):
                    feeder_pickup_data.append([
                        row.get('phase', ''),
                        row.get('setting_current', '-'),
                        row.get('setting_tl', '-'),
                        row.get('pickup_current', '-'),
                        row.get('trip_time', '-')
                    ])
            
            # Use full width with equal distribution for 5 columns
            feeder_pickup_table = Table(feeder_pickup_data, colWidths=[width*0.20]*5)
            feeder_pickup_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(feeder_pickup_table)
            elements.append(Spacer(1, 10))
        
        # Feeder Characteristic Check
        feeder_char = feeder_test.get('characteristic_check', [])
        if feeder_char:
            elements.append(Paragraph("<b>Characteristic Check by Secondary Injection Test</b>", subsection_style))
            
            feeder_char_data = [['Phase', 'Plug\nSetting', 'TL', 'Graph Time\n@2x', 'Graph Time\n@5x', 'Actual Time\n@2x', 'Actual Time\n@5x']]
            for row in feeder_char:
                if isinstance(row, dict):
                    feeder_char_data.append([
                        row.get('phase', ''),
                        row.get('plug_setting', '-'),
                        row.get('tl', '-'),
                        row.get('graph_time_2x', '-'),
                        row.get('graph_time_5x', '-'),
                        row.get('actual_time_2x', '-'),
                        row.get('actual_time_5x', '-')
                    ])
            
            # 7 columns - distribute evenly across full width
            col_w = width / 7
            feeder_char_table = Table(feeder_char_data, colWidths=[col_w]*7)
            feeder_char_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
                ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(feeder_char_table)
            elements.append(Spacer(1, 10))
        
        # Feeder Remarks
        feeder_remarks = feeder_test.get('remarks', '')
        if feeder_remarks:
            elements.append(Paragraph(f"<b>Remarks:</b> {feeder_remarks}", styles['Normal']))
            elements.append(Spacer(1, 15))
    
    # Fallback to old settings format if new format not present
    settings = report.get('settings', [])
    if settings and not protection_test and not feeder_test:
        elements.append(Paragraph("RELAY SETTINGS", styles['SectionHeader']))
        
        data = [['S.No', 'Parameter', 'Set Value', 'Measured Value', 'Status']]
        
        for idx, setting in enumerate(settings):
            if isinstance(setting, dict):
                set_val = setting.get('set_value', '')
                measured_val = setting.get('measured_value', '')
                status = 'OK' if measured_val else '-'
                data.append([
                    str(idx + 1),
                    setting.get('parameter', ''),
                    set_val,
                    measured_val,
                    status
                ])
        
        table = Table(data, colWidths=[width*0.08, width*0.35, width*0.20, width*0.20, width*0.17])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 10))
    
    return elements


def create_battery_details_section(report, styles, width):
    """Create Battery Equipment Details section."""
    elements = []
    
    battery_details = report.get('battery_details', {})
    if not battery_details or not any(battery_details.values()):
        return elements
    
    elements.append(Paragraph("EQUIPMENT DETAILS - BATTERY", styles['SectionHeader']))
    
    # Create details table
    data = [
        ['Location', battery_details.get('location', '-'), 'Device Name', battery_details.get('device_name', '-')],
        ['Battery Make', battery_details.get('battery_make', '-'), 'Battery Type', battery_details.get('battery_type', '-')],
        ['Battery AH', battery_details.get('battery_ah', '-'), 'No. of Batteries', battery_details.get('no_of_batteries', '-')],
        ['Batch Code', battery_details.get('batch_code', '-'), '', '']
    ]
    
    table = Table(data, colWidths=[width*0.20, width*0.30, width*0.20, width*0.30])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_battery_inspection_section(report, styles, width):
    """Create Battery Inspection Checklist section."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('battery_section_toggles', {})
    if not section_toggles.get('inspection_checklist', True):
        return elements
    
    checklist = report.get('battery_inspection_checklist', [])
    if not checklist:
        return elements
    
    elements.append(Paragraph("INSPECTION CHECKLIST", styles['SectionHeader']))
    
    data = [['S.No', 'Inspection Item', 'Yes', 'No', 'N/A', 'Remarks']]
    
    for idx, item in enumerate(checklist):
        if isinstance(item, dict):
            status = item.get('status', '').lower()
            yes_mark = '✓' if status == 'yes' else ''
            no_mark = '✓' if status == 'no' else ''
            na_mark = '✓' if status == 'na' else ''
            
            data.append([
                str(idx + 1),
                item.get('item', ''),
                yes_mark,
                no_mark,
                na_mark,
                item.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.42, width*0.10, width*0.10, width*0.10, width*0.20])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (4, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_battery_test_data_section(report, styles, width):
    """Create Battery Test Data section with resistance and voltage readings."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('battery_section_toggles', {})
    if not section_toggles.get('test_data', True):
        return elements
    
    test_data = report.get('battery_test_data', [])
    if not test_data:
        return elements
    
    elements.append(Paragraph("BATTERY TEST DATA", styles['SectionHeader']))
    
    data = [['S.No', 'Resistance (mΩ)', 'Voltage (VDC)', 'Status']]
    
    for row in test_data:
        if isinstance(row, dict):
            status = row.get('status', 'Normal')
            data.append([
                str(row.get('s_no', '')),
                row.get('resistance', '-'),
                row.get('voltage', '-'),
                status
            ])
    
    # Use full width with equal distribution
    table = Table(data, colWidths=[width*0.15, width*0.30, width*0.30, width*0.25])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), HEADER_DARK_TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    # Color code status cells
    for idx, row in enumerate(test_data):
        if isinstance(row, dict):
            status = row.get('status', 'Normal')
            row_idx = idx + 1  # +1 for header row
            if status == 'Normal':
                table.setStyle(TableStyle([('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#16a34a'))]))
            elif status == 'Warning':
                table.setStyle(TableStyle([('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#ca8a04'))]))
            elif status == 'Critical':
                table.setStyle(TableStyle([('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#dc2626'))]))
    
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_apfc_checklist_section(report, styles, width):
    """Create APFC Checklist section."""
    elements = []
    
    checklist = report.get('checklist', [])
    if not checklist:
        return elements
    
    elements.append(Paragraph("INSPECTION CHECKLIST", styles['SectionHeader']))
    
    data = [['S.No', 'Check Item', 'Status', 'Remarks']]
    
    for idx, item in enumerate(checklist):
        if isinstance(item, dict):
            status = item.get('status', '').upper()
            if status == 'YES':
                status_display = 'YES'
            elif status == 'NO':
                status_display = 'NO'
            elif status == 'NA':
                status_display = 'N/A'
            else:
                status_display = status
            data.append([
                str(idx + 1),
                item.get('item', ''),
                status_display,
                item.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.52, width*0.15, width*0.25])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_apfc_capacitor_banks_section(report, styles, width):
    """Create APFC Capacitor Banks section."""
    elements = []
    
    capacitor_banks = report.get('capacitor_banks', [])
    if not capacitor_banks:
        return elements
    
    elements.append(Paragraph("CAPACITOR BANKS STATUS", styles['SectionHeader']))
    
    data = [['Stage', 'KVAR Rating', 'Make', 'Status', 'Remarks']]
    
    for bank in capacitor_banks:
        if isinstance(bank, dict):
            status = bank.get('status', '').upper()
            if status == 'OK' or status == 'GOOD':
                status_display = 'OK'
            elif status == 'FAULTY':
                status_display = 'FAULTY'
            else:
                status_display = status
            data.append([
                bank.get('stage', ''),
                bank.get('kvar_rating', ''),
                bank.get('make', ''),
                status_display,
                bank.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.12, width*0.20, width*0.23, width*0.15, width*0.30])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_dg_checklist_section(report, styles, width):
    """Create DG Maintenance Checklist section."""
    elements = []
    
    checklist = report.get('checklist', [])
    if not checklist:
        return elements
    
    elements.append(Paragraph("MAINTENANCE / SERVICE CHECKLIST", styles['SectionHeader']))
    
    # Table header
    data = [['S.No', 'Check Item', 'Status', 'Remarks']]
    
    for idx, item in enumerate(checklist):
        if isinstance(item, dict):
            status = item.get('status', 'no').upper()
            status_display = 'YES' if status in ['yes', 'YES', 'ok', 'OK'] else 'NO'
            data.append([
                str(idx + 1),
                item.get('item', ''),
                status_display,
                item.get('remarks', '')
            ])
    
    table = Table(data, colWidths=[width*0.08, width*0.52, width*0.15, width*0.25])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_dg_load_test_section(report, styles, width):
    """Create DG Load Test Results section."""
    elements = []
    
    # Check if any load test values exist
    has_load_test = any([
        report.get('load_test_25'),
        report.get('load_test_50'),
        report.get('load_test_75'),
        report.get('load_test_100'),
    ])
    
    if not has_load_test:
        return elements
    
    elements.append(Paragraph("LOAD TEST RESULTS", styles['SectionHeader']))
    
    data = [
        ['Parameter', '25% Load', '50% Load', '75% Load', '100% Load'],
        ['KW Output', report.get('load_test_25', ''), report.get('load_test_50', ''), report.get('load_test_75', ''), report.get('load_test_100', '')],
    ]
    
    table = Table(data, colWidths=[width*0.30, width*0.175, width*0.175, width*0.175, width*0.175])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


def create_dg_operating_parameters_section(report, styles, width):
    """Create DG Operating Parameters section."""
    elements = []
    
    # Check if any operating parameters exist
    has_params = any([
        report.get('frequency'),
        report.get('voltage_output'),
        report.get('fuel_consumption'),
        report.get('exhaust_temp'),
    ])
    
    if not has_params:
        return elements
    
    elements.append(Paragraph("OPERATING PARAMETERS", styles['SectionHeader']))
    
    data = [
        ['Frequency (Hz):', report.get('frequency', ''), 'Voltage Output (V):', report.get('voltage_output', '')],
        ['Fuel Consumption (L/hr):', report.get('fuel_consumption', ''), 'Exhaust Temp (°C):', report.get('exhaust_temp', '')],
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
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 10))
    return elements


# ==================== VCB PDF SECTIONS ====================

def create_vcb_service_checks_section(report, styles, width):
    """Create Section 1: Service Checks for VCB."""
    elements = []
    
    service_checks = report.get('vcb_service_checks', {})
    section_toggles = report.get('section_toggles', {})
    
    # Skip if section is disabled
    if section_toggles.get('service_checks') is False:
        return elements
    
    if not service_checks or not isinstance(service_checks, dict):
        return elements
    
    elements.append(Paragraph("SECTION 1: SERVICE CHECKS", styles['SectionHeader']))
    
    # Service checks data rows
    data = [['Description', 'Observation Report']]
    
    # Spring Motor Resistance
    spring = service_checks.get('spring_motor_resistance', {})
    if isinstance(spring, dict):
        data.append(['Spring Charging Motor Resistance', f"{spring.get('voltage', '')} V.AC / {spring.get('resistance', '')} Ohm"])
    
    # Closing Coil
    closing = service_checks.get('closing_coil', {})
    if isinstance(closing, dict):
        data.append(['Closing Coil Voltage and Resistance', f"{closing.get('voltage', '')} V.DC / {closing.get('resistance', '')} Ohm"])
    
    # Tripping Coil
    tripping = service_checks.get('tripping_coil', {})
    if isinstance(tripping, dict):
        data.append(['Tripping Coil Voltage and Resistance', f"{tripping.get('voltage', '')} V.DC / {tripping.get('resistance', '')} Ohm"])
    
    # Counter Reading
    counter = service_checks.get('counter_reading', '')
    data.append(['Counter Reading/Anti pumping(K1)', str(counter)])
    
    # Visual Inspection
    data.append(['Visual Inspection for Damage', service_checks.get('visual_inspection', '')])
    
    # Replacement
    data.append(['Replacement', service_checks.get('replacement', '')])
    
    # Thorough Cleaning
    data.append(['Thorough Cleaning', service_checks.get('thorough_cleaning', '')])
    
    # Lubrication
    data.append(['Lubrication of Moving Parts/Coil', service_checks.get('lubrication', '')])
    
    table = Table(data, colWidths=[width*0.40, width*0.60])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_vcb_contact_resistance_section(report, styles, width):
    """Create Section 2: Contact Resistance Test for VCB."""
    elements = []
    
    contact_data = report.get('vcb_contact_resistance', {})
    section_toggles = report.get('section_toggles', {})
    
    if section_toggles.get('contact_resistance_test') is False:
        return elements
    
    if not contact_data or not isinstance(contact_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 2: CONTACT RESISTANCE TEST (In micro Ohms)", styles['SectionHeader']))
    
    data = [
        ['Phase', 'Resistance Measured', 'Current Injected (A.DC)'],
        ['R', contact_data.get('R', {}).get('resistance', ''), contact_data.get('R', {}).get('current', '')],
        ['Y', contact_data.get('Y', {}).get('resistance', ''), contact_data.get('Y', {}).get('current', '')],
        ['B', contact_data.get('B', {}).get('resistance', ''), contact_data.get('B', {}).get('current', '')],
    ]
    
    table = Table(data, colWidths=[width*0.25, width*0.375, width*0.375])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Paragraph("* Acceptance Criteria: As per manufacturer specifications", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    
    return elements


def create_vcb_insulation_resistance_section(report, styles, width):
    """Create Section 3: Insulation Resistance Test for VCB."""
    elements = []
    
    ir_data = report.get('vcb_insulation_resistance', {})
    section_toggles = report.get('section_toggles', {})
    
    if section_toggles.get('insulation_resistance_test') is False:
        return elements
    
    if not ir_data or not isinstance(ir_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 3: INSULATION RESISTANCE TEST", styles['SectionHeader']))
    
    # Header row
    data = [['Description', 'R', 'Y', 'B']]
    
    # Breaker in Closed Condition
    data.append([Paragraph('<b>Breaker in Closed Condition</b>', styles['Normal_Small']), '', '', ''])
    
    breaker_closed = ir_data.get('breaker_closed', {})
    ir_top_ground = breaker_closed.get('ir_top_ground', {})
    data.append([
        'IR Value between top to Ground',
        f"{ir_top_ground.get('R', '')} GΩ",
        f"{ir_top_ground.get('Y', '')} GΩ",
        f"{ir_top_ground.get('B', '')} GΩ"
    ])
    
    ir_phase_phase = breaker_closed.get('ir_phase_phase', {})
    data.append([
        'IR Value between Phase to Phase',
        f"{ir_phase_phase.get('R', '')} GΩ",
        f"{ir_phase_phase.get('Y', '')} GΩ",
        f"{ir_phase_phase.get('B', '')} GΩ"
    ])
    
    # Breaker in Open Condition
    data.append([Paragraph('<b>Breaker in Open Condition</b>', styles['Normal_Small']), '', '', ''])
    
    breaker_open = ir_data.get('breaker_open', {})
    ir_pole_pole = breaker_open.get('ir_pole_pole', {})
    data.append([
        'IR Value between Pole to Pole',
        f"{ir_pole_pole.get('R', '')} GΩ",
        f"{ir_pole_pole.get('Y', '')} GΩ",
        f"{ir_pole_pole.get('B', '')} GΩ"
    ])
    
    table = Table(data, colWidths=[width*0.40, width*0.20, width*0.20, width*0.20])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (-1, 1), colors.Color(0.95, 0.95, 0.95)),
        ('BACKGROUND', (0, 4), (-1, 4), colors.Color(0.95, 0.95, 0.95)),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Paragraph("* Acceptance Criteria: ≥1000 MΩ", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    
    return elements


def create_vcb_breaker_timings_section(report, styles, width):
    """Create Section 4: Breaker Timings Test for VCB."""
    elements = []
    
    timings_data = report.get('vcb_breaker_timings', {})
    section_toggles = report.get('section_toggles', {})
    
    if section_toggles.get('breaker_timings_test') is False:
        return elements
    
    if not timings_data or not isinstance(timings_data, dict):
        return elements
    
    elements.append(Paragraph("SECTION 4: BREAKER TIMINGS TEST (In milli Sec)", styles['SectionHeader']))
    
    data = [
        ['Phase', 'R', 'Y', 'B'],
        ['Closing Time', timings_data.get('closing_time', {}).get('R', ''), timings_data.get('closing_time', {}).get('Y', ''), timings_data.get('closing_time', {}).get('B', '')],
        ['Opening Time', timings_data.get('opening_time', {}).get('R', ''), timings_data.get('opening_time', {}).get('Y', ''), timings_data.get('opening_time', {}).get('B', '')],
        ['Close-Open', timings_data.get('close_open', {}).get('R', ''), timings_data.get('close_open', {}).get('Y', ''), timings_data.get('close_open', {}).get('B', '')],
    ]
    
    table = Table(data, colWidths=[width*0.40, width*0.20, width*0.20, width*0.20])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Paragraph("* Acceptance Criteria: As per manufacturer specifications", styles['Normal_Small']))
    elements.append(Spacer(1, 10))
    
    return elements


def create_vcb_operational_checks_section(report, styles, width):
    """Create Section 5: Operational Checks for VCB."""
    elements = []
    
    op_checks = report.get('vcb_operational_checks', {})
    section_toggles = report.get('section_toggles', {})
    
    if section_toggles.get('operational_checks') is False:
        return elements
    
    if not op_checks or not isinstance(op_checks, dict):
        return elements
    
    elements.append(Paragraph("SECTION 5: OPERATIONAL CHECKS", styles['SectionHeader']))
    
    data = [
        ['Description', 'Manual', 'Electrical'],
        ['Close', op_checks.get('close', {}).get('manual', 'OK'), op_checks.get('close', {}).get('electrical', 'OK')],
        ['Open', op_checks.get('open', {}).get('manual', 'OK'), op_checks.get('open', {}).get('electrical', 'OK')],
    ]
    
    table = Table(data, colWidths=[width*0.40, width*0.30, width*0.30])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    
    # ON/OFF Operation (moved from service checks)
    onoff = op_checks.get('onoff_operation', {})
    if isinstance(onoff, dict) and (onoff.get('count') or onoff.get('method')):
        onoff_data = [
            ['ON/OFF Operation', f"{onoff.get('count', '')} Operations Done - {onoff.get('method', '')}"]
        ]
        onoff_table = Table(onoff_data, colWidths=[width*0.30, width*0.70])
        onoff_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(Spacer(1, 5))
        elements.append(onoff_table)
    
    elements.append(Spacer(1, 10))
    
    return elements


def create_vcb_functional_checks_section(report, styles, width):
    """Create Section 6: Functional Checks for VCB."""
    elements = []
    
    func_checks = report.get('vcb_functional_checks', [])
    section_toggles = report.get('section_toggles', {})
    
    if section_toggles.get('functional_checks') is False:
        return elements
    
    if not func_checks or not isinstance(func_checks, list):
        return elements
    
    elements.append(Paragraph("SECTION 6: FUNCTIONAL CHECKS", styles['SectionHeader']))
    
    data = [['S.No', 'Description', 'Status']]
    for i, check in enumerate(func_checks, 1):
        data.append([
            str(i),
            check.get('item', ''),
            check.get('status', 'Checked and Found OK')
        ])
    
    table = Table(data, colWidths=[width*0.10, width*0.60, width*0.30])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


# ==================== PANEL PDF SECTIONS ====================

def create_panel_points_to_ensure_section(report, styles, width):
    """Create Section A: Checklist of LT Panels."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('panel_section_toggles', {})
    if section_toggles.get('checklist') is False:
        return elements
    
    points_to_ensure = report.get('points_to_ensure', [])
    if not points_to_ensure or not isinstance(points_to_ensure, list):
        return elements
    
    elements.append(Paragraph("A. CHECKLIST OF LT. PANELS (PCC's, MCC, LDB, PDB, ELDB, APFCR, DB's, etc.)", styles['SectionHeader']))
    
    # Create a style for table cell text that wraps properly
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        wordWrap='CJK'
    )
    
    # Build the table data with Paragraph elements for text wrapping
    data = [['S.No', 'Description', 'Confirmation', 'Remarks']]
    
    for item in points_to_ensure:
        if not isinstance(item, dict):
            continue
            
        # Build description with sub-items
        description = item.get('item', '')
        sub_items = item.get('sub_items', [])
        if sub_items and isinstance(sub_items, list):
            sub_text = '<br/>'.join([f"&nbsp;&nbsp;• {sub}" for sub in sub_items])
            description = f"{description}<br/>{sub_text}"
        
        # Confirmation status
        confirmed = item.get('confirmed', True)
        confirmation_text = 'Yes' if confirmed else 'No'
        
        # Use Paragraph for description to enable text wrapping
        desc_para = Paragraph(description, cell_style)
        remarks_para = Paragraph(item.get('remarks', '') or '', cell_style)
        
        data.append([
            str(item.get('id', '')),
            desc_para,
            confirmation_text,
            remarks_para
        ])
    
    # Create table with appropriate column widths
    table = Table(data, colWidths=[width*0.08, width*0.55, width*0.15, width*0.22])
    
    # Style the table
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica'),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (0, -1), 8),
        ('FONTSIZE', (2, 1), (2, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (1, 1), (1, -1), 4),
    ]
    
    # Add alternating row colors for better readability
    for i in range(1, len(data)):
        if i % 2 == 0:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.Color(0.97, 0.97, 0.97)))
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_panel_capacitor_health_section(report, styles, width):
    """Create Section B: Capacitor Health Report for Panel."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('panel_section_toggles', {})
    if section_toggles.get('capacitor_health') is False:
        return elements
    
    capacitor_rows = report.get('capacitor_health_rows', [])
    
    # Always show section header if enabled
    elements.append(Paragraph("B. CAPACITOR HEALTH REPORT", styles['SectionHeader']))
    
    if not capacitor_rows or not isinstance(capacitor_rows, list):
        elements.append(Paragraph("No capacitor health data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Filter out empty rows
    valid_rows = [row for row in capacitor_rows if isinstance(row, dict) and row.get('feeder')]
    
    if not valid_rows:
        elements.append(Paragraph("No capacitor health data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Build the table data with header
    data = [
        ['S/NO', 'FEEDER', 'CURRENT (A)', '', '', 'REMARKS'],
        ['', '', 'R', 'Y', 'B', '']
    ]
    
    for idx, row in enumerate(valid_rows, 1):
        data.append([
            str(idx),
            row.get('feeder', ''),
            row.get('current_r', ''),
            row.get('current_y', ''),
            row.get('current_b', ''),
            row.get('remarks', '')
        ])
    
    # Create table with appropriate column widths
    table = Table(data, colWidths=[width*0.08, width*0.28, width*0.12, width*0.12, width*0.12, width*0.28])
    
    # Style the table
    table_style = [
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (4, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        # Merge CURRENT (A) header
        ('SPAN', (2, 0), (4, 0)),
    ]
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


# ==================== EARTH PIT PDF SECTIONS ====================

def create_earth_pit_electrical_checks_section(report, styles, width):
    """Create Section A: Electrical Checks for Earth Pit."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('earth_pit_section_toggles', {})
    if section_toggles.get('electrical_checks') is False:
        return elements
    
    electrical_rows = report.get('electrical_checks_rows', [])
    
    elements.append(Paragraph("A. Test Performed: ELECTRICAL CHECKS", styles['SectionHeader']))
    
    if not electrical_rows or not isinstance(electrical_rows, list):
        elements.append(Paragraph("No electrical checks data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Filter out empty rows
    valid_rows = [row for row in electrical_rows if isinstance(row, dict) and row.get('earth_pit_no')]
    
    if not valid_rows:
        elements.append(Paragraph("No electrical checks data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Build the table data
    data = [['Earth Pit No', 'Pit Location', 'Test Method', 'Test Results Ohm\n(Individual)', 'Test Results Ohm\n(Combined)', 'Remarks']]
    
    for row in valid_rows:
        data.append([
            row.get('earth_pit_no', ''),
            row.get('pit_location', ''),
            row.get('test_method', ''),
            row.get('individual_result', ''),
            row.get('combined_result', ''),
            row.get('remarks', '')
        ])
    
    # Create table
    table = Table(data, colWidths=[width*0.12, width*0.20, width*0.15, width*0.17, width*0.17, width*0.19])
    
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (3, 1), (4, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 6))
    
    # Add Notes
    notes_text = "<b>NOTES:</b> The maximum permissible value for individual earth pit is 5 Ohms and the maximum permissible value for combined earth pit is 1 Ohm as per IS 3043:2018, IEEE Std 80-2013, and IEC 60364-5-54."
    notes_style = ParagraphStyle(
        'NotesStyle',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=colors.Color(0.4, 0.3, 0.1),
        backColor=colors.Color(1, 0.98, 0.9)
    )
    elements.append(Paragraph(notes_text, notes_style))
    elements.append(Spacer(1, 10))
    
    return elements


def create_earth_pit_continuity_checks_section(report, styles, width):
    """Create Section B: Continuity Checks for Earth Pit."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('earth_pit_section_toggles', {})
    if section_toggles.get('continuity_checks') is False:
        return elements
    
    continuity_rows = report.get('continuity_checks_rows', [])
    
    elements.append(Paragraph("B. Test Performed: CONTINUITY CHECKS", styles['SectionHeader']))
    
    if not continuity_rows or not isinstance(continuity_rows, list):
        elements.append(Paragraph("No continuity checks data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Filter out empty rows
    valid_rows = [row for row in continuity_rows if isinstance(row, dict) and (row.get('from_pit_no') or row.get('to_equipment'))]
    
    if not valid_rows:
        elements.append(Paragraph("No continuity checks data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Build the table data
    data = [['FROM: EARTH PIT NO', 'TO: EQUIPMENT', 'CONTINUITY CHECKED', 'REMARKS']]
    
    for row in valid_rows:
        data.append([
            row.get('from_pit_no', ''),
            row.get('to_equipment', ''),
            row.get('continuity_checked', ''),
            row.get('remarks', '')
        ])
    
    # Create table
    table = Table(data, colWidths=[width*0.20, width*0.35, width*0.20, width*0.25])
    
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


# ==================== ENERGY METER PDF SECTIONS ====================

def create_energy_meter_visual_inspection_section(report, styles, width):
    """Create TEST#1: Mechanical Check & Visual Inspection for Energy Meter."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('energy_meter_section_toggles', {})
    if section_toggles.get('visual_inspection') is False:
        return elements
    
    visual_items = report.get('energy_meter_visual_inspection', [])
    
    elements.append(Paragraph("TEST#1: MECHANICAL CHECK & VISUAL INSPECTION (TICK IF VERIFIED)", styles['SectionHeader']))
    
    if not visual_items or not isinstance(visual_items, list):
        elements.append(Paragraph("No visual inspection data available.", styles['Normal_Small']))
        elements.append(Spacer(1, 10))
        return elements
    
    # Build the table data
    data = [['S.NO', 'DESCRIPTION', 'CHECKED']]
    
    for item in visual_items:
        if isinstance(item, dict):
            checked = '✓' if item.get('checked') else ''
            data.append([
                str(item.get('id', '')),
                item.get('description', ''),
                checked
            ])
    
    # Create table
    table = Table(data, colWidths=[width*0.12, width*0.70, width*0.18])
    
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_energy_meter_master_standard_section(report, styles, width):
    """Create MASTER STANDARD DETAILS section for Energy Meter."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('energy_meter_section_toggles', {})
    if section_toggles.get('master_standard') is False:
        return elements
    
    master_std = report.get('energy_meter_master_standard', {})
    
    elements.append(Paragraph("MASTER STANDARD DETAILS", styles['SectionHeader']))
    
    # Build the table data
    data = [
        ['Nomenclature', 'Make/Model', 'SL.NO', 'Certificate No', 'Validity'],
        [
            master_std.get('nomenclature', ''),
            master_std.get('make_model', ''),
            master_std.get('sl_no', ''),
            master_std.get('certificate_no', ''),
            master_std.get('validity', '')
        ]
    ]
    
    # Create table
    table = Table(data, colWidths=[width*0.25, width*0.20, width*0.15, width*0.22, width*0.18])
    
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]
    
    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_energy_meter_test_results_section(report, styles, width):
    """Create TEST RESULTS section for Energy Meter."""
    elements = []
    
    # Check if section is enabled
    section_toggles = report.get('energy_meter_section_toggles', {})
    if section_toggles.get('test_results') is False:
        return elements
    
    params = report.get('energy_meter_parameters', {})
    test_summary = report.get('energy_meter_test_summary', {})
    energy_reading = report.get('energy_meter_energy_reading', {})
    
    # TEST RESULTS (V, I, PF & FREQ)
    elements.append(Paragraph("TEST RESULTS (V, I, PF & FREQ)", styles['SectionHeader']))
    
    # Parameters Table with updated labels - P.F and Frequency in header row
    params_data = [
        ['Parameters', 'Voltage (V)', '', '', 'Current (A)', '', '', 'P.F', 'Frequency'],
        ['', 'V (R-Y)', 'V (Y-B)', 'V (B-R)', 'R', 'Y', 'B', '', 'Hz'],
        ['DUC Reading', params.get('duc_vry', ''), params.get('duc_vyb', ''), params.get('duc_vbr', ''),
         params.get('duc_r', ''), params.get('duc_y', ''), params.get('duc_b', ''),
         params.get('duc_pf', ''), params.get('duc_freq', '')],
        ['STD Reading', params.get('std_vry', ''), params.get('std_vyb', ''), params.get('std_vbr', ''),
         params.get('std_r', ''), params.get('std_y', ''), params.get('std_b', ''),
         params.get('std_pf', ''), params.get('std_freq', '')]
    ]
    
    params_table = Table(params_data, colWidths=[width*0.14, width*0.10, width*0.10, width*0.10, width*0.10, width*0.10, width*0.10, width*0.10, width*0.16])
    
    params_style = [
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('SPAN', (1, 0), (3, 0)),  # Voltage header span
        ('SPAN', (4, 0), (6, 0)),  # Current header span
        ('SPAN', (7, 0), (7, 1)),  # P.F span
        ('SPAN', (8, 0), (8, 1)),  # Frequency span
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]
    
    params_table.setStyle(TableStyle(params_style))
    elements.append(params_table)
    elements.append(Spacer(1, 8))
    
    # TEST RESULTS (kWH) - Energy Reading Table without CTR/PTR
    elements.append(Paragraph("TEST RESULTS (kWH)", styles['SectionHeader']))
    
    energy_data = [
        ['', 'DUC Reading in MWh', 'Standard Reading in kWh', 'Error in %'],
        ['Final Reading', energy_reading.get('final_duc', ''), energy_reading.get('final_std', ''), energy_reading.get('error_percent', '')],
        ['Initial Reading', energy_reading.get('initial_duc', ''), energy_reading.get('initial_std', ''), ''],
        ['Difference', energy_reading.get('difference_duc', ''), energy_reading.get('difference_std', ''), ''],
        ['MF Factor', energy_reading.get('mf_duc', ''), energy_reading.get('mf_std', ''), ''],
        ['Total Unit', energy_reading.get('total_duc', ''), energy_reading.get('total_std', ''), '']
    ]
    
    energy_table = Table(energy_data, colWidths=[width*0.20, width*0.27, width*0.33, width*0.20])
    
    energy_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('SPAN', (3, 1), (3, 5)),  # Error span
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]
    
    energy_table.setStyle(TableStyle(energy_style))
    elements.append(energy_table)
    elements.append(Spacer(1, 8))
    
    # Notes - Single item as per user request
    notes_style = ParagraphStyle(
        'NotesStyle',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=colors.Color(0.4, 0.3, 0.1)
    )
    
    elements.append(Paragraph("<b>Notes:</b>", notes_style))
    elements.append(Paragraph("The Standards used are traceable to National Standards", notes_style))
    
    elements.append(Spacer(1, 10))
    
    return elements


# ==================== VOLTMETER SECTIONS ====================
def create_voltmeter_master_standard_section(report, styles, width):
    """Create MASTER STANDARD DETAILS section for Voltmeter."""
    elements = []
    
    section_toggles = report.get('voltmeter_section_toggles', {})
    if section_toggles.get('master_standard') is False:
        return elements
    
    master_standard = report.get('voltmeter_master_standard', {})
    
    elements.append(Paragraph("1. MASTER STANDARD DETAILS", styles['SectionHeader']))
    
    data = [
        ['Nomenclature', 'Make/Model', 'SL.NO', 'Certificate No', 'Validity'],
        [
            master_standard.get('nomenclature', ''),
            master_standard.get('make_model', ''),
            master_standard.get('sl_no', ''),
            master_standard.get('certificate_no', ''),
            master_standard.get('validity', '')
        ]
    ]
    
    table = Table(data, colWidths=[width*0.25, width*0.20, width*0.15, width*0.20, width*0.20])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_voltmeter_test_results_section(report, styles, width):
    """Create TEST RESULTS section for Voltmeter - MEASUREMENT TEST format."""
    elements = []
    
    section_toggles = report.get('voltmeter_section_toggles', {})
    if section_toggles.get('test_results') is False:
        return elements
    
    measurement_tests = report.get('voltmeter_measurement_tests', [])
    
    # If no new format data, try to use old format for backwards compatibility
    if not measurement_tests:
        params = report.get('voltmeter_parameters', {})
        readings = report.get('voltmeter_readings', {})
        if params or readings:
            # Convert old format to new format
            measurement_tests = [
                {'phase': 'R-PHASE', 'test_reading': params.get('duc_vry', ''), 'standard_reading': params.get('std_vry', ''), 'error_percent': '', 'error_limit': '±1.0'},
                {'phase': 'Y-PHASE', 'test_reading': params.get('duc_vyb', ''), 'standard_reading': params.get('std_vyb', ''), 'error_percent': '', 'error_limit': '±1.0'},
                {'phase': 'B-PHASE', 'test_reading': params.get('duc_vbr', ''), 'standard_reading': params.get('std_vbr', ''), 'error_percent': readings.get('error_percent', ''), 'error_limit': '±1.0'},
                {'phase': 'R&Y-PHASE', 'test_reading': '', 'standard_reading': '', 'error_percent': '', 'error_limit': '±1.0'},
                {'phase': 'Y&B-PHASE', 'test_reading': '', 'standard_reading': '', 'error_percent': '', 'error_limit': '±1.0'},
                {'phase': 'R&B-PHASE', 'test_reading': '', 'standard_reading': '', 'error_percent': '', 'error_limit': '±1.0'}
            ]
    
    elements.append(Paragraph("❖ MEASUREMENT TEST:", styles['SectionHeader']))
    
    # Create header row
    header = ['PHASE REFERENCE', 'TEST METER READING (V)', 'STANDARD METER READING (V)', 'ERROR %', 'ERROR LIMIT %']
    
    # Create data rows
    table_data = [header]
    for test in measurement_tests:
        row = [
            test.get('phase', ''),
            test.get('test_reading', ''),
            test.get('standard_reading', ''),
            test.get('error_percent', ''),
            test.get('error_limit', '±1.0')
        ]
        table_data.append(row)
    
    table = Table(table_data, colWidths=[width*0.20, width*0.22, width*0.26, width*0.16, width*0.16])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    # Notes
    notes_style = ParagraphStyle(
        'NotesStyle',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=colors.Color(0.3, 0.3, 0.5)
    )
    
    elements.append(Paragraph("<b>Notes:</b>", notes_style))
    elements.append(Paragraph("The Standards used are traceable to National Standards", notes_style))
    
    elements.append(Spacer(1, 10))
    
    return elements


# ==================== AMMETER SECTIONS ====================
def create_ammeter_master_standard_section(report, styles, width):
    """Create MASTER STANDARD DETAILS section for Ammeter."""
    elements = []
    
    section_toggles = report.get('ammeter_section_toggles', {})
    if section_toggles.get('master_standard') is False:
        return elements
    
    master_standard = report.get('ammeter_master_standard', {})
    
    elements.append(Paragraph("1. MASTER STANDARD DETAILS", styles['SectionHeader']))
    
    data = [
        ['Nomenclature', 'Make/Model', 'SL.NO', 'Certificate No', 'Validity'],
        [
            master_standard.get('nomenclature', ''),
            master_standard.get('make_model', ''),
            master_standard.get('sl_no', ''),
            master_standard.get('certificate_no', ''),
            master_standard.get('validity', '')
        ]
    ]
    
    table = Table(data, colWidths=[width*0.25, width*0.20, width*0.15, width*0.20, width*0.20])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 10))
    
    return elements


def create_ammeter_test_results_section(report, styles, width):
    """Create TEST RESULTS section for Ammeter."""
    elements = []
    
    section_toggles = report.get('ammeter_section_toggles', {})
    if section_toggles.get('test_results') is False:
        return elements
    
    params = report.get('ammeter_parameters', {})
    readings = report.get('ammeter_readings', {})
    
    elements.append(Paragraph("2. TEST RESULTS (Current)", styles['SectionHeader']))
    
    # Current Parameters Table
    params_data = [
        ['Parameters', 'R', 'Y', 'B'],
        ['DUC Reading', params.get('duc_r', ''), params.get('duc_y', ''), params.get('duc_b', '')],
        ['STD Reading', params.get('std_r', ''), params.get('std_y', ''), params.get('std_b', '')]
    ]
    
    params_table = Table(params_data, colWidths=[width*0.25, width*0.25, width*0.25, width*0.25])
    params_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(params_table)
    elements.append(Spacer(1, 8))
    
    # Current Reading Table
    elements.append(Paragraph("TEST RESULTS (Reading)", styles['SectionHeader']))
    
    reading_data = [
        ['', 'DUC Reading (A)', 'Standard Reading (A)', 'Error in %'],
        ['Final Reading', readings.get('final_duc', ''), readings.get('final_std', ''), readings.get('error_percent', '')],
        ['Initial Reading', readings.get('initial_duc', ''), readings.get('initial_std', ''), ''],
        ['Difference', readings.get('difference_duc', ''), readings.get('difference_std', ''), '']
    ]
    
    reading_table = Table(reading_data, colWidths=[width*0.25, width*0.25, width*0.30, width*0.20])
    reading_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('SPAN', (3, 1), (3, 3)),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(reading_table)
    elements.append(Spacer(1, 8))
    
    # Notes
    notes_style = ParagraphStyle(
        'NotesStyle',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=colors.Color(0, 0.4, 0.4)
    )
    
    elements.append(Paragraph("<b>Notes:</b>", notes_style))
    elements.append(Paragraph("The Standards used are traceable to National Standards", notes_style))
    
    elements.append(Spacer(1, 10))
    
    return elements


def create_test_results_section(report, styles, width, equipment_type):
    """Create test results section based on equipment type."""
    elements = []
    
    elements.append(Paragraph("TEST RESULTS", styles['SectionHeader']))
    
    # Generic test results table
    test_results = report.get('test_results', [])
    
    if test_results and isinstance(test_results, list):
        data = [['S.No', 'Parameter', 'Acceptance Criteria', 'Measured Value', 'Status']]
        for i, result in enumerate(test_results, 1):
            data.append([
                str(i),
                result.get('parameter', ''),
                result.get('acceptance', ''),
                result.get('measured', ''),
                result.get('status', 'OK')
            ])
        
        col_widths = [width*0.08, width*0.30, width*0.25, width*0.20, width*0.17]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (-1, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
    else:
        # Show remarks if no detailed results
        remarks = report.get('remarks', '') or report.get('observations', '') or 'No specific test results recorded.'
        elements.append(Paragraph(f"Remarks: {remarks}", styles['Normal_Small']))
    
    elements.append(Spacer(1, 8))
    
    return elements


def create_overall_result_section(report, styles, width):
    """Create overall result and recommendations section."""
    elements = []
    
    elements.append(Paragraph("OVERALL RESULT & RECOMMENDATIONS", styles['SectionHeader']))
    
    overall_result = report.get('overall_result', '') or report.get('overall_condition', 'SATISFACTORY')
    recommendations = report.get('recommendations', '') or ''
    remarks = report.get('remarks', '') or ''
    
    data = [
        ['Overall Result:', overall_result.upper()],
        ['Recommendations:', recommendations or 'No specific recommendations.'],
        ['Remarks:', remarks or 'Equipment tested and found satisfactory.']
    ]
    
    table = Table(data, colWidths=[width*0.25, width*0.75])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 15))
    
    return elements


def create_signature_section(report, styles, width):
    """Create signature section with Name, Designation, Date, Signature."""
    elements = []
    
    elements.append(Paragraph("SIGNATURES", styles['SectionHeader']))
    
    # Get service provider data
    service_provider = report.get('service_provider', {})
    engineer_name = report.get('engineer_signature_name', '') or service_provider.get('engineer_name', '') or report.get('tested_by', '')
    engineer_designation = report.get('engineer_designation', '') or 'Service Engineer'
    engineer_date = format_date_ddmmyyyy(report.get('engineer_signature_date', '') or report.get('date_of_testing', ''))
    
    # Get customer data
    customer_info = report.get('customer_info', {})
    customer_name = report.get('customer_signature_name', '') or report.get('witnessed_by', '') or customer_info.get('contact_person', '')
    customer_designation = report.get('customer_designation', '') or ''
    customer_date = format_date_ddmmyyyy(report.get('customer_signature_date', ''))
    
    data = [
        ['SERVICE PROVIDER', '', 'CUSTOMER', ''],
        ['Name:', engineer_name, 'Name:', customer_name],
        ['Designation:', engineer_designation, 'Designation:', customer_designation],
        ['Date:', engineer_date, 'Date:', customer_date],
        ['Signature:', '', 'Signature:', ''],
    ]
    
    table = Table(data, colWidths=[width*0.15, width*0.35, width*0.15, width*0.35])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
        ('FONTNAME', (3, 1), (3, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (0, -1), LIGHT_GRAY),
        ('BACKGROUND', (2, 1), (2, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(table)
    
    return elements


def generate_equipment_pdf_buffer(report: dict, org_settings: dict, equipment_type: str):
    """Generate PDF buffer for any equipment type."""
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 25
    content_width = page_width - (2 * margin)
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,  # Reduced from margin + 15 to bring header higher
        bottomMargin=margin + 20
    )
    
    styles = create_styles()
    elements = []
    
    # Build all sections
    elements.extend(create_header_section(report, org_settings, styles, content_width, equipment_type))
    elements.extend(create_customer_section(report, styles, content_width))
    elements.extend(create_service_provider_section(report, org_settings, styles, content_width))
    elements.extend(create_equipment_details_section(report, styles, content_width, equipment_type))
    
    # ACB-specific test sections (Section 1, 2, 3, 4, 5, 6)
    if equipment_type == 'acb':
        elements.extend(create_acb_checklist_section(report, styles, content_width))
        elements.extend(create_acb_insulation_resistance_section(report, styles, content_width))
        elements.extend(create_acb_coil_resistance_section(report, styles, content_width))
        elements.extend(create_acb_contact_resistance_section(report, styles, content_width))
        elements.extend(create_acb_micrologic_trip_section(report, styles, content_width))
        elements.extend(create_acb_carbon_test_section(report, styles, content_width))
    
    # MCCB-specific test sections (Section 1, 2, 3, 4, 5, 6) - same as ACB
    if equipment_type == 'mccb':
        elements.extend(create_mccb_bulk_entries_section(report, styles, content_width))
        elements.extend(create_mccb_checklist_section(report, styles, content_width))
        elements.extend(create_mccb_insulation_resistance_section(report, styles, content_width))
        elements.extend(create_mccb_coil_resistance_section(report, styles, content_width))
        elements.extend(create_mccb_contact_resistance_section(report, styles, content_width))
        elements.extend(create_mccb_micrologic_trip_section(report, styles, content_width))
        elements.extend(create_mccb_carbon_test_section(report, styles, content_width))
    
    # VCB-specific test sections (Section 1-6)
    if equipment_type == 'vcb':
        elements.extend(create_vcb_service_checks_section(report, styles, content_width))
        elements.extend(create_vcb_contact_resistance_section(report, styles, content_width))
        elements.extend(create_vcb_insulation_resistance_section(report, styles, content_width))
        elements.extend(create_vcb_breaker_timings_section(report, styles, content_width))
        elements.extend(create_vcb_operational_checks_section(report, styles, content_width))
        elements.extend(create_vcb_functional_checks_section(report, styles, content_width))
    
    # DG (Diesel Generator)-specific sections
    if equipment_type == 'dg':
        elements.extend(create_dg_checklist_section(report, styles, content_width))
        elements.extend(create_dg_load_test_section(report, styles, content_width))
        elements.extend(create_dg_operating_parameters_section(report, styles, content_width))
    
    # Lightning Arrestor-specific sections
    if equipment_type == 'lightning-arrestor' or equipment_type == 'lightning_arrestor':
        elements.extend(create_lightning_arrestor_checklist_section(report, styles, content_width))
        elements.extend(create_lightning_arrestor_test_results_section(report, styles, content_width))
    
    # Relay-specific sections
    if equipment_type == 'relay':
        elements.extend(create_relay_checklist_section(report, styles, content_width))
        elements.extend(create_relay_settings_section(report, styles, content_width))
    
    # APFC-specific sections
    if equipment_type == 'apfc':
        elements.extend(create_apfc_checklist_section(report, styles, content_width))
        elements.extend(create_apfc_capacitor_banks_section(report, styles, content_width))
    
    # Panel-specific sections
    if equipment_type == 'panel' or equipment_type == 'electrical-panel':
        elements.extend(create_panel_points_to_ensure_section(report, styles, content_width))
        elements.extend(create_panel_capacitor_health_section(report, styles, content_width))
    
    # Earth Pit-specific sections
    if equipment_type == 'earth_pit' or equipment_type == 'earth-pit':
        elements.extend(create_earth_pit_electrical_checks_section(report, styles, content_width))
        elements.extend(create_earth_pit_continuity_checks_section(report, styles, content_width))
    
    # Energy Meter-specific sections
    if equipment_type == 'energy_meter' or equipment_type == 'energy-meter':
        elements.extend(create_energy_meter_master_standard_section(report, styles, content_width))
        elements.extend(create_energy_meter_test_results_section(report, styles, content_width))
    
    # Voltmeter-specific sections
    if equipment_type == 'voltmeter':
        elements.extend(create_voltmeter_master_standard_section(report, styles, content_width))
        elements.extend(create_voltmeter_test_results_section(report, styles, content_width))
    
    # Ammeter-specific sections
    if equipment_type == 'ammeter':
        elements.extend(create_ammeter_master_standard_section(report, styles, content_width))
        elements.extend(create_ammeter_test_results_section(report, styles, content_width))
    
    # Battery-specific sections
    if equipment_type == 'battery':
        elements.extend(create_battery_details_section(report, styles, content_width))
        elements.extend(create_battery_inspection_section(report, styles, content_width))
        elements.extend(create_battery_test_data_section(report, styles, content_width))
    
    # Generic test results section (skip for meters and battery as they have their own)
    if equipment_type not in ['energy_meter', 'energy-meter', 'voltmeter', 'ammeter', 'battery']:
        elements.extend(create_test_results_section(report, styles, content_width, equipment_type))
    elements.extend(create_overall_result_section(report, styles, content_width))
    elements.extend(create_signature_section(report, styles, content_width))
    
    # Build PDF with custom canvas - using EquipmentNumberedCanvas
    doc.build(
        elements,
        canvasmaker=lambda *args, **kwargs: EquipmentNumberedCanvas(
            *args, 
            report_data=report, 
            org_settings=org_settings,
            equipment_type=equipment_type,
            **kwargs
        )
    )
    buffer.seek(0)
    
    return buffer


@router.get("/{equipment_type}/{report_id}/pdf")
async def download_equipment_pdf(
    equipment_type: str,
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Generate and download PDF for any equipment test report."""
    
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    
    # Generate PDF
    buffer = generate_equipment_pdf_buffer(report, org_settings, equipment_type)
    
    # Generate filename
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
    report_no = report.get('report_no', 'REPORT').replace('/', '_')
    filename = f"{equipment_info['name'].replace(' ', '_')}_Test_Report_{report_no}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


async def generate_test_report_pdf(equipment_type: str, report_id: str):
    """Internal function to generate test report PDF buffer (for AMC PDF attachment)"""
    try:
        report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
        if not report:
            return None
        
        # Get organization settings
        org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
        
        # Use dedicated transformer PDF generator for transformer reports
        if equipment_type == 'transformer':
            from routes.transformer_pdf import generate_pdf_buffer as generate_transformer_pdf_buffer
            buffer = generate_transformer_pdf_buffer(report, org_settings)
        else:
            # Use generic equipment PDF for other types
            buffer = generate_equipment_pdf_buffer(report, org_settings, equipment_type)
        
        return buffer
    except Exception as e:
        print(f"Error generating test report PDF: {e}")
        return None


async def generate_equipment_pdf(
    equipment_type: str,
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Generate PDF for any equipment test report."""
    
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    
    # Generate PDF
    buffer = generate_equipment_pdf_buffer(report, org_settings, equipment_type)
    
    # Generate filename
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
    report_no = report.get('report_no', 'REPORT').replace('/', '_')
    filename = f"{equipment_info['name'].replace(' ', '_')}_Test_Report_{report_no}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ==================== EMAIL FUNCTIONALITY ====================

class EmailRequest(BaseModel):
    """Request model for sending report via email."""
    to_email: str
    cc_emails: Optional[List[str]] = []
    custom_message: Optional[str] = ""


@router.post("/{equipment_type}/{report_id}/send-email")
async def send_equipment_report_email(
    equipment_type: str,
    report_id: str,
    email_request: EmailRequest,
    current_user: dict = Depends(require_auth)
):
    """Send equipment test report PDF via email to customer."""
    
    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email service not configured. Please contact administrator.")
    
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    company_name = org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions'
    
    # Generate PDF
    pdf_buffer = generate_equipment_pdf_buffer(report, org_settings, equipment_type)
    pdf_content = pdf_buffer.getvalue()
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    # Get equipment info
    equipment_info = EQUIPMENT_INFO.get(equipment_type, EQUIPMENT_INFO['other'])
    report_title = equipment_info['title']
    
    # Prepare email details
    report_no = report.get('report_no', 'N/A')
    customer_name = report.get('customer_name', 'Valued Customer')
    project_name = report.get('project_name', '')
    test_date = report.get('test_date', '') or report.get('visit_date', '')
    overall_result = (report.get('overall_result', '') or report.get('overall_condition', 'satisfactory')).upper()
    engineer_name = report.get('engineer_name', '') or report.get('tested_by', current_user.get('name', ''))
    
    # Get logo for email (if available)
    logo_html = ""
    if org_settings and org_settings.get('logo_url'):
        logo_html = f'<img src="{org_settings["logo_url"]}" alt="{company_name}" style="max-height: 50px; margin-bottom: 10px;" />'
    
    # Custom message
    custom_msg = ""
    if email_request.custom_message:
        custom_msg = f"""
        <div style="background: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #0369A1; font-weight: 600; margin: 0 0 8px 0;">Message from Engineer:</p>
            <p style="color: #334155; margin: 0;">{email_request.custom_message}</p>
        </div>
        """
    
    # Build email HTML
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%); padding: 30px; text-align: center;">
            {logo_html}
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{company_name}</h1>
            <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">{report_title}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                Dear <strong>{customer_name}</strong>,
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Please find attached the {equipment_info['name']} Test Report for your reference. Below are the key details:
            </p>
            
            <!-- Report Details Card -->
            <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px; width: 40%;">Report Number:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px; font-weight: 600;">{report_no}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Equipment Type:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px;">{equipment_info['name']}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Project/Site:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px;">{project_name or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Test Date:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px;">{test_date or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Overall Result:</td>
                        <td style="padding: 8px 0;">
                            <span style="background: {'#10B981' if overall_result == 'SATISFACTORY' else '#EF4444'}; 
                                        color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                {overall_result}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Engineer:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px;">{engineer_name}</td>
                    </tr>
                </table>
            </div>
            
            {custom_msg}
            
            <!-- Attachment Note -->
            <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #92400E; font-size: 14px; margin: 0;">
                    📎 <strong>Attachment:</strong> {equipment_info['name'].replace(' ', '_')}_Test_Report_{report_no.replace('/', '_')}.pdf
                </p>
            </div>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-top: 24px;">
                If you have any questions or need further clarification, please don't hesitate to reach out.
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Best regards,<br/>
                <strong>{engineer_name}</strong><br/>
                <span style="color: #64748B;">{company_name}</span>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">
                This is an automated email from {company_name}'s Report Management System.
            </p>
            <p style="color: #94A3B8; font-size: 11px; margin: 8px 0 0 0;">
                © {datetime.now().year} {company_name}. All rights reserved.
            </p>
        </div>
    </div>
    """
    
    try:
        resend.api_key = settings.RESEND_API_KEY
        
        email_params = {
            "from": settings.SENDER_EMAIL,
            "to": [email_request.to_email],
            "subject": f"{report_title} - {report_no} | {company_name}",
            "html": html_content,
            "attachments": [
                {
                    "filename": f"{equipment_info['name'].replace(' ', '_')}_Test_Report_{report_no.replace('/', '_')}.pdf",
                    "content": pdf_base64,
                    "content_type": "application/pdf"
                }
            ]
        }
        
        if email_request.cc_emails:
            email_params["cc"] = email_request.cc_emails
        
        await asyncio.to_thread(resend.Emails.send, email_params)
        
        # Log email
        email_log = {
            "report_id": report_id,
            "report_no": report_no,
            "equipment_type": equipment_type,
            "to_email": email_request.to_email,
            "cc_emails": email_request.cc_emails or [],
            "sent_by": current_user.get('email', ''),
            "sent_by_name": current_user.get('name', ''),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }
        await db.email_logs.insert_one(email_log)
        
        return {
            "message": "Email sent successfully",
            "to": email_request.to_email,
            "cc": email_request.cc_emails or [],
            "report_no": report_no
        }
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.get("/{equipment_type}/{report_id}/email-history")
async def get_equipment_email_history(
    equipment_type: str,
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get email history for a specific equipment report."""
    
    history = await db.email_logs.find(
        {"report_id": report_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(50)
    
    return history
