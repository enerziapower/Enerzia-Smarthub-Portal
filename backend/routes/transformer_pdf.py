"""
Transformer Test Report PDF Generation
Generates professional PDF reports matching the standard transformer test report format.
Includes email functionality to send reports to customers.
Uses shared pdf_base module for common styles and canvas.
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
import requests
import resend

import sys
sys.path.insert(0, '/app/backend')

from core.database import db
from core.security import require_auth
from core.config import settings
from routes.pdf_base import format_date_ddmmyyyy

# Import shared PDF components
from routes.pdf_base import (
    PRIMARY_COLOR, LIGHT_GRAY, DARK_TEXT, GRAY_TEXT, BORDER_COLOR,
    COL_LABEL_WIDTH, COL_VALUE_WIDTH,
    create_base_styles, BaseNumberedCanvas, get_logo_image
)

router = APIRouter(prefix="/transformer-report", tags=["Transformer Reports"])


def create_styles():
    """Create paragraph styles for the PDF - using base styles plus transformer-specific ones."""
    styles = create_base_styles()
    return styles


def create_header_section(report, org_settings, styles, width):
    """Create the header section with title on LEFT and logo on RIGHT."""
    elements = []
    
    # Get organization logo
    logo_url = org_settings.get('logo_url', '') if org_settings else ''
    
    # Create logo image - using larger size for visibility
    logo_img = get_logo_image(logo_url, width=120)
    
    # ROW 1: Title on LEFT, Logo on RIGHT
    # Use ReportTitle style for consistency with other PDFs
    title_cell = Paragraph('<b>TRANSFORMER TEST REPORT</b>', styles['ReportTitle'])
    
    # Create header table with logo on right
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
    report_info = [[f"Report #: {report.get('report_no', 'N/A')}", f"Report Date: {format_date_ddmmyyyy(report.get('report_date', '')) or 'N/A'}"]]
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
    
    # ROW 4: Report Type checkboxes - 4 per row with equal spacing
    # Updated to include Annual Shutdown Maintenance and other common types
    report_types_row1 = ['Periodical Maintenance', 'Annual Shutdown Maintenance', 'Breakdown', 'Testing & Commissioning']
    report_types_row2 = ['Calibration', 'Complaint', 'O&M', 'AMC']
    
    current_type = report.get('report_type', 'Periodical Maintenance')
    
    # Create cells for row 1 - equal width for each checkbox
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
    """Create customer information section with multi-line support, email, phone and P.O. Dated fields."""
    elements = []
    
    elements.append(Paragraph("CUSTOMER INFORMATION", styles['SectionHeader']))
    
    # Create paragraph style for multi-line cells
    cell_style = ParagraphStyle(
        name='CellMultiLine',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    # Get values with multi-line support - convert newlines to HTML breaks
    customer_name = (report.get('customer_name', '') or '').replace('\n', '<br/>')
    site_location = (report.get('site_location', '') or '').replace('\n', '<br/>')
    project_name = (report.get('project_name', '') or '').replace('\n', '<br/>')
    contact_person = (report.get('contact_person', '') or '').replace('\n', '<br/>')
    customer_email = report.get('contact_email', '') or report.get('customer_email', '') or ''
    contact_phone = report.get('contact_phone', '') or ''
    po_ref = report.get('po_ref', '') or ''
    po_dated = format_date_ddmmyyyy(report.get('po_dated', '') or '')
    
    # Create paragraphs for multi-line text support
    customer_name_p = Paragraph(customer_name, cell_style)
    site_location_p = Paragraph(site_location, cell_style)
    project_name_p = Paragraph(project_name, cell_style)
    contact_person_p = Paragraph(contact_person, cell_style)
    
    # Data with aligned columns (18%, 32%, 18%, 32%)
    # Row 1: Company Name | Site Location
    # Row 2: Project Name | P.O. Ref #
    # Row 3: Contact Person | P.O. Dated
    # Row 4: Email | Phone
    data = [
        ['Company Name:', customer_name_p, 'Site Location:', site_location_p],
        ['Project Name:', project_name_p, 'P.O. Ref #:', po_ref],
        ['Contact Person:', contact_person_p, 'P.O. Dated:', po_dated],
        ['Email:', customer_email, 'Phone:', contact_phone]
    ]
    
    # Use standard column widths for alignment
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
    """Create service provider details section with company address and engineer details."""
    elements = []
    
    elements.append(Paragraph("SERVICE PROVIDER DETAILS", styles['SectionHeader']))
    
    # Create paragraph style for multi-line cells
    cell_style = ParagraphStyle(
        name='CellMultiLine',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    # Get company details from org_settings
    company_name = report.get('service_company', '') or (org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions')
    
    # Build company address from report first, then org_settings
    company_address = report.get('service_address', '')
    if not company_address:
        address_parts = []
        if org_settings:
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
    
    # Convert newlines to HTML breaks for multi-line support
    if company_address:
        company_address = company_address.replace('\n', '<br/>')
    
    # Get engineer details
    engineer_name = report.get('engineer_name', '') or ''
    engineer_email = report.get('engineer_email', '') or ''
    engineer_mobile = report.get('engineer_mobile', '') or ''
    
    # Create paragraphs for multi-line support
    company_name_p = Paragraph(f"<b>{company_name}</b>", cell_style)
    company_address_p = Paragraph(company_address, cell_style)
    
    # Layout: Aligned columns with merged address cell
    # All engineer cells (Email, Mobile) have proper closed borders
    data = [
        ['Company Name:', company_name_p, 'Engineer Name:', engineer_name],
        ['Company Address:', company_address_p, 'Engineer Email:', engineer_email],
        ['', '', 'Mobile:', engineer_mobile]
    ]
    
    # Use standard column widths for alignment
    table = Table(data, colWidths=[width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH, width*COL_LABEL_WIDTH, width*COL_VALUE_WIDTH])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        # Outer box for the entire table
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        # Vertical lines between columns
        ('LINEAFTER', (0, 0), (0, -1), 0.5, BORDER_COLOR),  # After col 1 (Company labels)
        ('LINEAFTER', (1, 0), (1, -1), 0.5, BORDER_COLOR),  # After col 2 (Company values)
        ('LINEAFTER', (2, 0), (2, -1), 0.5, BORDER_COLOR),  # After col 3 (Engineer labels)
        # Horizontal lines between all rows
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_COLOR),  # Below row 1
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, BORDER_COLOR),  # Below row 2
        # Background colors for label columns
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_GRAY),  # Company Name label
        ('BACKGROUND', (0, 1), (0, 2), LIGHT_GRAY),  # Company Address label (spans 2 rows)
        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),  # Engineer labels (all rows)
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        # Span company address cells vertically (merge rows 2 and 3 for label and value)
        ('SPAN', (0, 1), (0, 2)),  # Company Address label spans rows 2-3
        ('SPAN', (1, 1), (1, 2)),  # Company Address value spans rows 2-3
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_equipment_details_section(report, styles, width):
    """Create main equipment details section with aligned columns - matching UI layout."""
    elements = []
    
    elements.append(Paragraph("MAIN EQUIPMENT DETAILS", styles['SectionHeader']))
    
    # Row 1: Equipment Name, Equipment Location, Rating (KVA)
    # Row 2: Transformer Type, Feeder Name, No. of Tapping, Voltage Ratio HV (V)
    # Row 3: Voltage Ratio LV (V), Make / Manufacturer, Current Ratio HV (A), Current Ratio LV (A)
    # Row 4: Serial No., Frequency (Hz), Date of Testing, Vector Group
    # Row 5: Date of Energization, Type of Cooling, Next Due Date, Year of Manufacture
    
    data = [
        ['Equipment Name:', report.get('equipment_name', ''), 'Equipment Location:', report.get('equipment_location', '')],
        ['Rating (KVA):', report.get('rating_kva', ''), 'Transformer Type:', report.get('transformer_type', '')],
        ['Feeder Name:', report.get('feeder_name', ''), 'No. of Tapping:', report.get('no_of_tapping', '')],
        ['Voltage Ratio HV (V):', report.get('voltage_ratio_hv', ''), 'Voltage Ratio LV (V):', report.get('voltage_ratio_lv', '')],
        ['Make / Manufacturer:', report.get('make', ''), 'Current Ratio HV (A):', report.get('current_ratio_hv', '')],
        ['Current Ratio LV (A):', report.get('current_ratio_lv', ''), 'Serial No.:', report.get('serial_no', '')],
        ['Frequency (Hz):', report.get('frequency', '50'), 'Date of Testing:', format_date_ddmmyyyy(report.get('test_date', ''))],
        ['Vector Group:', report.get('vector_group', ''), 'Date of Energization:', format_date_ddmmyyyy(report.get('energization_date', ''))],
        ['Type of Cooling:', report.get('cooling_type', ''), 'Next Due Date:', format_date_ddmmyyyy(report.get('next_due_date', ''))],
        ['Year of Manufacture:', report.get('year_of_manufacture', ''), '', ''],
    ]
    
    # Use standard column widths for alignment (same as customer and service provider sections)
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


def create_checklist_section(report, styles, width):
    """Create maintenance/testing checklist section."""
    elements = []
    
    elements.append(Paragraph("MAINTENANCE / TESTING CHECK LIST DETAILS", styles['SectionHeader']))
    
    checklist_items = [
        ('checklist_cleaned', "Equipment is cleaned and free from dust / dirt / foreign materials etc."),
        ('checklist_no_defects', "Equipment is free from all visible defects on physical inspection"),
        ('checklist_double_earthing', "Check main tank has been provided with double earthing"),
        ('checklist_bushings_clean', "Bushings are clean and free from physical damages"),
        ('checklist_bolts_tight', "All nuts and bolts are tightened correctly as per specified torque"),
        ('checklist_silica_gel_ok', "Check the colour of breather silica gel (Blue when dry)"),
        ('checklist_pressure_valve_ok', "Check that pressure relief valve is correctly mounted"),
    ]
    
    data = [['CHECK ITEM', 'YES', 'NO']]
    for key, label in checklist_items:
        value = report.get(key, False)
        # Use X for checkmark which renders reliably
        yes_mark = 'X' if value else ''
        no_mark = 'X' if not value else ''
        data.append([label, yes_mark, no_mark])
    
    # Add remarks row
    remarks = report.get('checklist_remarks', '')
    data.append([f"REMARKS: {remarks}", '', ''])
    
    table = Table(data, colWidths=[width*0.8, width*0.1, width*0.1])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('SPAN', (0, -1), (-1, -1)),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_test_instruments_section(report, styles, width):
    """Create test instruments used section."""
    elements = []
    
    elements.append(Paragraph("TEST INSTRUMENTS USED", styles['SectionHeader']))
    
    instruments = report.get('test_instruments', [])
    
    data = [['S.No.', 'Equipment Name', 'Make', 'Model #', 'Serial #']]
    for i, inst in enumerate(instruments, 1):
        data.append([
            str(i),
            inst.get('name', ''),
            inst.get('make', ''),
            inst.get('model', ''),
            inst.get('serial', '')
        ])
    
    if len(data) == 1:
        data.append(['1', '', '', '', ''])
    
    table = Table(data, colWidths=[width*0.08, width*0.32, width*0.2, width*0.2, width*0.2])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_oil_bdv_test_section(report, styles, width):
    """Create TEST 1: Transformer Oil BDV Test section."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('oilBdvTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (1) TRANSFORMER OIL BDV TEST", styles['SectionHeader']))
    
    data = [
        ['SAMPLE SPECIMEN COLLECTED AT:', report.get('oil_sample_location', 'Bottom')],
        ['VALUES OBSERVED', ''],
        ['BEFORE FILTERATION', ''],
        ['FLASH POINT VOLTAGE:', f"{report.get('oil_bdv_before_flash_point', '')} KV"],
        ['AFTER FILTERATION', ''],
        ['BDV AT 2.5MM GAP WITH 60SEC:', f"{report.get('oil_bdv_after_value', '')} KV"],
        ['FLASH POINT VOLTAGE:', f"{report.get('oil_bdv_after_flash_point', '')} KV"],
        ['REMARKS:', report.get('oil_bdv_remarks', '')],
    ]
    
    table = Table(data, colWidths=[width*0.5, width*0.5])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (0, 2), 'Helvetica-Bold'),
        ('FONTNAME', (0, 4), (0, 4), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('BACKGROUND', (0, 2), (-1, 2), LIGHT_GRAY),
        ('BACKGROUND', (0, 4), (-1, 4), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_ir_test_section(report, styles, width):
    """Create TEST 2: Insulation Resistance Test section."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('irTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (2) INSULATION RESISTANCE TEST", styles['SectionHeader']))
    elements.append(Paragraph(f"APPLIED VOLTAGE: {report.get('ir_applied_voltage', '5000')} V", styles['Normal_Small']))
    
    ir_tests = report.get('ir_tests', [
        {'circuit': 'Primary to Earth', 'voltage': '5000', 'measured': '', 'acceptance': '> 100 MΩ'},
        {'circuit': 'Primary to Secondary', 'voltage': '5000', 'measured': '', 'acceptance': '> 100 MΩ'},
        {'circuit': 'Secondary to Earth', 'voltage': '500', 'measured': '', 'acceptance': '> 10 MΩ'}
    ])
    
    data = [['Circuit Reference', 'IR / Megger Values (V)', 'Measured Values', 'Acceptance Value']]
    for test in ir_tests:
        data.append([
            test.get('circuit', ''),
            test.get('voltage', ''),
            test.get('measured', ''),
            test.get('acceptance', '')
        ])
    
    table = Table(data, colWidths=[width*0.3, width*0.23, width*0.23, width*0.24])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_magnetic_balance_test_section(report, styles, width):
    """Create TEST 3: Magnetic Balance Test section with full column structure."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('magneticBalanceTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (3) MAGNETIC BALANCE TEST", styles['SectionHeader']))
    elements.append(Paragraph(f"at {report.get('magnetic_balance_tap', 'Tap 5 (Normal Tap)')}", styles['Normal_Small']))
    
    mb_tests = report.get('magnetic_balance_tests', [
        {'circuit': 'R-Open', 'applied_1u1v': '', 'applied_1v1w': '', 'applied_1w1u': '', 'measured_2u2v': '', 'measured_2v2w': '', 'measured_2w2u': '', 'measured_2u2n': '', 'measured_2v2n': '', 'measured_2w2n': ''},
        {'circuit': 'Y-Open', 'applied_1u1v': '', 'applied_1v1w': '', 'applied_1w1u': '', 'measured_2u2v': '', 'measured_2v2w': '', 'measured_2w2u': '', 'measured_2u2n': '', 'measured_2v2n': '', 'measured_2w2n': ''},
        {'circuit': 'B-Open', 'applied_1u1v': '', 'applied_1v1w': '', 'applied_1w1u': '', 'measured_2u2v': '', 'measured_2v2w': '', 'measured_2w2u': '', 'measured_2u2n': '', 'measured_2v2n': '', 'measured_2w2n': ''}
    ])
    
    # Header rows
    data = [
        ['CIRCUIT\nREFERENCE', 'APPLIED PRIMARY VOLTAGE (V)', '', '', 'MEASURED SECONDARY VOLTAGE (V)', '', '', '', '', ''],
        ['', '1U-1V', '1V-1W', '1W-1U', '2U-2V', '2V-2W', '2W-2U', '2U-2N', '2V-2N', '2W-2N']
    ]
    
    for test in mb_tests:
        # Handle both old format (applied_voltage, measured_voltage) and new format
        if 'applied_1u1v' in test:
            data.append([
                test.get('circuit', ''),
                test.get('applied_1u1v', ''),
                test.get('applied_1v1w', ''),
                test.get('applied_1w1u', ''),
                test.get('measured_2u2v', ''),
                test.get('measured_2v2w', ''),
                test.get('measured_2w2u', ''),
                test.get('measured_2u2n', ''),
                test.get('measured_2v2n', ''),
                test.get('measured_2w2n', '')
            ])
        else:
            # Legacy format - spread the values
            data.append([
                test.get('circuit', ''),
                test.get('applied_voltage', ''), '', '',
                test.get('measured_voltage', ''), '', '', '', '', ''
            ])
    
    col_width = width / 10
    table = Table(data, colWidths=[col_width*1.2] + [col_width*0.98]*9)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        # Span for header row 1
        ('SPAN', (0, 0), (0, 1)),  # CIRCUIT REFERENCE
        ('SPAN', (1, 0), (3, 0)),  # APPLIED PRIMARY VOLTAGE
        ('SPAN', (4, 0), (9, 0)),  # MEASURED SECONDARY VOLTAGE
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_ratio_test_section(report, styles, width):
    """Create TEST 4: Transformer Ratio Test section."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('ratioTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (4) RATIO TEST", styles['SectionHeader']))
    
    ratio_tests = report.get('ratio_tests', [])
    if not ratio_tests:
        # Default single row if not provided
        ratio_tests = [{'tap_no': '1', 'applied_1u1v': '417.5', 'applied_1v1w': '417.5', 'applied_1w1u': '417.8'}]
    
    # Header rows
    data = [
        ['TAP\nNO', 'APPLIED PRIMARY VOLTAGE (V)', '', '', 'MEASURED SECONDARY VOLTAGE (V)', '', '', '', '', ''],
        ['', '1U-1V', '1V-1W', '1W-1U', '2U-2V', '2V-2W', '2W-2U', '2U-2N', '2V-2N', '2W-2N']
    ]
    
    for test in ratio_tests:
        data.append([
            test.get('tap_no', ''),
            test.get('applied_1u1v', ''),
            test.get('applied_1v1w', ''),
            test.get('applied_1w1u', ''),
            test.get('measured_2u2v', ''),
            test.get('measured_2v2w', ''),
            test.get('measured_2w2u', ''),
            test.get('measured_2u2n', ''),
            test.get('measured_2v2n', ''),
            test.get('measured_2w2n', '')
        ])
    
    col_width = width / 10
    table = Table(data, colWidths=[col_width*0.8] + [col_width*1.02]*9)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        # Span for header row 1
        ('SPAN', (0, 0), (0, 1)),  # TAP NO
        ('SPAN', (1, 0), (3, 0)),  # APPLIED PRIMARY VOLTAGE
        ('SPAN', (4, 0), (9, 0)),  # MEASURED SECONDARY VOLTAGE
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_magnetising_current_test_section(report, styles, width):
    """Create TEST 5: Three Phase Magnetising Current Test section."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('magnetisingCurrentTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (5) THREE PHASE MAGNETISING CURRENT TEST", styles['SectionHeader']))
    
    mag_tests = report.get('magnetising_current_tests', [])
    if not mag_tests:
        # Default single row if not provided
        mag_tests = [{'tap_position': '1', 'applied_1u1v': '417.5', 'applied_1v1w': '417.5', 'applied_1w1u': '417.8'}]
    
    # Header rows
    data = [
        ['TAP\nPOSITION', 'APPLIED VOLTAGE (V)', '', '', 'MEASURED CURRENT (mA)', '', ''],
        ['', '1U-1V', '1V-1W', '1W-1U', '1U', '1V', '1W']
    ]
    
    for test in mag_tests:
        data.append([
            test.get('tap_position', ''),
            test.get('applied_1u1v', ''),
            test.get('applied_1v1w', ''),
            test.get('applied_1w1u', ''),
            test.get('current_1u', ''),
            test.get('current_1v', ''),
            test.get('current_1w', '')
        ])
    
    col_width = width / 7
    table = Table(data, colWidths=[col_width*1.1] + [col_width]*6)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        # Span for header row 1
        ('SPAN', (0, 0), (0, 1)),  # TAP POSITION
        ('SPAN', (1, 0), (3, 0)),  # APPLIED VOLTAGE
        ('SPAN', (4, 0), (6, 0)),  # MEASURED CURRENT
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_vector_group_test_section(report, styles, width):
    """Create TEST 6: Vector Group Test section."""
    # Check if test is enabled
    enabled_tests = report.get('enabled_tests', {})
    if not enabled_tests.get('vectorGroupTest', True):
        return []
    
    elements = []
    
    elements.append(Paragraph("TEST # (6) VECTOR GROUP TEST", styles['SectionHeader']))
    
    vg_tests = report.get('vector_group_tests', [
        {'parameter': '1W2W < 1W2V', 'observed': ''},
        {'parameter': '1U1V = 1U2N + 1V2N', 'observed': ''},
        {'parameter': '1V2W = 1V2V', 'observed': ''}
    ])
    
    data = [['Test Parameters', 'Values Observed']]
    for test in vg_tests:
        data.append([test.get('parameter', ''), test.get('observed', '')])
    
    # Add remarks row - FIX: Getting vector_group_remarks correctly
    vg_remarks = report.get('vector_group_remarks', '')
    data.append([f"REMARKS: {vg_remarks}", ''])
    
    table = Table(data, colWidths=[width*0.5, width*0.5])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('SPAN', (0, -1), (-1, -1)),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 8))
    
    return elements


def create_oltc_section(report, styles, width):
    """Create OLTC Equipment Details and Tests section."""
    elements = []
    
    if not report.get('has_oltc', False):
        return elements
    
    # OLTC Equipment Details
    elements.append(Paragraph("OLTC EQUIPMENT DETAILS", styles['SectionHeader']))
    
    data = [
        ['Equipment Name:', report.get('oltc_equipment_name', ''), 'Location:', report.get('oltc_location', '')],
        ['Rating:', f"{report.get('oltc_rating', '')} KVA", 'Total Taps:', report.get('oltc_total_taps', '')],
        ['Normal Tap:', report.get('oltc_normal_tap', ''), 'Make:', report.get('oltc_make', '')],
        ['Serial No.:', report.get('oltc_serial_no', ''), '', ''],
    ]
    
    table = Table(data, colWidths=[width*0.2, width*0.3, width*0.2, width*0.3])
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
    elements.append(Spacer(1, 6))
    
    # Check if OLTC Oil BDV test is enabled
    enabled_tests = report.get('enabled_tests', {})
    
    if enabled_tests.get('oltcOilBdvTest', True):
        # OLTC Oil BDV Test
        elements.append(Paragraph("TEST # (7) OLTC OIL BDV TEST", styles['SectionHeader']))
        
        bdv_data = [
            ['Test Parameter', 'Value'],
            ['Before Filtration - Flash Point:', f"{report.get('oltc_bdv_before', '')} KV"],
            ['After Filtration - BDV at 2.5mm:', f"{report.get('oltc_bdv_after', '')} KV"],
            ['After Filtration - Flash Point:', f"{report.get('oltc_bdv_flash_point', '')} KV"],
            ['Remarks:', report.get('oltc_bdv_remarks', '')],
        ]
        
        bdv_table = Table(bdv_data, colWidths=[width*0.5, width*0.5])
        bdv_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        elements.append(bdv_table)
        elements.append(Spacer(1, 6))
    
    if enabled_tests.get('oltcOperationalChecklist', True):
        # OLTC Operational Checklist
        elements.append(Paragraph("TEST # (8) OPERATIONAL CHECK LIST : OLTC / OTHER OPERATIONAL CHECKS", styles['SectionHeader']))
        
        oltc_checks = [
            ('oltc_visual_inspection', 'Visual Inspection of Equipment'),
            ('oltc_local_operation', 'Local Operation (Electrical)'),
            ('oltc_remote_operation', 'Remote Operation (Electrical)'),
            ('oltc_tap_position_indicator', 'Tap Position Indicator'),
            ('oltc_limit_switch', 'Limit Switch'),
            ('oltc_cooling_equipment', 'Checking of Cooling Equipments'),
            ('oltc_pump_fan_rotation', 'Rotation Direction of Pumps / Fans'),
            ('oltc_spares_oil_topup', 'Spares / Oil Top Up Done'),
        ]
        
        check_data = [['CHECK ITEM', 'YES', 'NO']]
        for key, label in oltc_checks:
            value = report.get(key, False)
            check_data.append([label, '✓' if value else '', '✓' if not value else ''])
        
        check_data.append([f"RECORD DEFICIENCIES: {report.get('oltc_deficiencies', '')}", '', ''])
        
        check_table = Table(check_data, colWidths=[width*0.8, width*0.1, width*0.1])
        check_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('SPAN', (0, -1), (-1, -1)),
        ]))
        
        elements.append(check_table)
        elements.append(Spacer(1, 8))
    
    return elements


def create_results_section(report, styles, width):
    """Create results and signatures section."""
    elements = []
    
    elements.append(Paragraph("RESULTS", styles['SectionHeader']))
    
    overall_result = report.get('overall_result', 'satisfactory')
    result_display = {
        'satisfactory': 'SATISFACTORY',
        'unsatisfactory': 'UNSATISFACTORY',
        'requires_attention': 'REQUIRES ATTENTION'
    }.get(overall_result, overall_result.upper())
    
    data = [
        ['Overall Result:', result_display],
        ['Test Result & Remarks:', report.get('final_remarks', '')],
    ]
    
    table = Table(data, colWidths=[width*0.25, width*0.75])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 12))
    
    # Signatures - Updated with company names and more space for manual signature
    service_company = report.get('service_company', 'Enerzia Power Solutions')
    customer_company = report.get('customer_name', 'Customer')
    
    sig_data = [
        ['SERVICE PROVIDER', '', 'CUSTOMER', ''],
        [service_company, '', customer_company, ''],
        ['Name:', report.get('engineer_signature_name', ''), 'Name:', report.get('customer_signature_name', '')],
        ['Date:', format_date_ddmmyyyy(report.get('engineer_signature_date', '')), 'Date:', format_date_ddmmyyyy(report.get('customer_signature_date', ''))],
        ['Signature:', '', 'Signature:', ''],
        ['', '', '', ''],  # Extra row for signature space
        ['', '', '', ''],  # Extra row for signature space
    ]
    
    sig_table = Table(sig_data, colWidths=[width*0.15, width*0.35, width*0.15, width*0.35], rowHeights=[20, 20, 20, 20, 30, 25, 25])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, 1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
        ('SPAN', (0, 1), (1, 1)),
        ('SPAN', (2, 1), (3, 1)),
        ('SPAN', (0, 4), (1, 6)),  # Merge signature cells for service provider
        ('SPAN', (2, 4), (3, 6)),  # Merge signature cells for customer
    ]))
    
    elements.append(sig_table)
    
    return elements


@router.get("/{report_id}/pdf")
async def generate_transformer_pdf(
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Generate Transformer Test Report PDF with headers and footers on all pages."""
    
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    
    # Create PDF
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 25
    content_width = page_width - (2 * margin)
    
    # Create document with more top/bottom margin for header/footer
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,  # Reduced to bring header higher on page 1
        bottomMargin=margin + 20  # Extra space for footer
    )
    
    styles = create_styles()
    elements = []
    
    # Build all sections
    elements.extend(create_header_section(report, org_settings, styles, content_width))
    elements.extend(create_customer_section(report, styles, content_width))
    elements.extend(create_service_provider_section(report, org_settings, styles, content_width))
    elements.extend(create_equipment_details_section(report, styles, content_width))
    elements.extend(create_checklist_section(report, styles, content_width))
    elements.extend(create_test_instruments_section(report, styles, content_width))
    elements.extend(create_oil_bdv_test_section(report, styles, content_width))
    elements.extend(create_ir_test_section(report, styles, content_width))
    elements.extend(create_magnetic_balance_test_section(report, styles, content_width))
    elements.extend(create_ratio_test_section(report, styles, content_width))
    elements.extend(create_magnetising_current_test_section(report, styles, content_width))
    elements.extend(create_vector_group_test_section(report, styles, content_width))
    elements.extend(create_oltc_section(report, styles, content_width))
    elements.extend(create_results_section(report, styles, content_width))
    
    # Build PDF with custom canvas for headers/footers
    doc.build(
        elements,
        canvasmaker=lambda *args, **kwargs: BaseNumberedCanvas(
            *args, 
            report_data=report, 
            org_settings=org_settings,
            report_title="TRANSFORMER TEST REPORT",
            **kwargs
        )
    )
    buffer.seek(0)
    
    # Generate filename
    report_no = report.get('report_no', 'TRN_REPORT').replace('/', '_')
    filename = f"Transformer_Test_Report_{report_no}.pdf"
    
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


def generate_pdf_buffer(report: dict, org_settings: dict):
    """Generate PDF and return buffer for email attachment."""
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 25
    content_width = page_width - (2 * margin)
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,  # Reduced to bring header higher on page 1
        bottomMargin=margin + 20  # Extra space for footer
    )
    
    styles = create_styles()
    elements = []
    
    # Build all sections
    elements.extend(create_header_section(report, org_settings, styles, content_width))
    elements.extend(create_customer_section(report, styles, content_width))
    elements.extend(create_service_provider_section(report, org_settings, styles, content_width))
    elements.extend(create_equipment_details_section(report, styles, content_width))
    elements.extend(create_checklist_section(report, styles, content_width))
    elements.extend(create_test_instruments_section(report, styles, content_width))
    elements.extend(create_oil_bdv_test_section(report, styles, content_width))
    elements.extend(create_ir_test_section(report, styles, content_width))
    elements.extend(create_magnetic_balance_test_section(report, styles, content_width))
    elements.extend(create_ratio_test_section(report, styles, content_width))
    elements.extend(create_magnetising_current_test_section(report, styles, content_width))
    elements.extend(create_vector_group_test_section(report, styles, content_width))
    elements.extend(create_oltc_section(report, styles, content_width))
    elements.extend(create_results_section(report, styles, content_width))
    
    # Build PDF with custom canvas for headers/footers
    doc.build(
        elements,
        canvasmaker=lambda *args, **kwargs: BaseNumberedCanvas(
            *args, 
            report_data=report, 
            org_settings=org_settings,
            report_title="TRANSFORMER TEST REPORT",
            **kwargs
        )
    )
    buffer.seek(0)
    
    return buffer


@router.post("/{report_id}/send-email")
async def send_report_email(
    report_id: str,
    email_request: EmailRequest,
    current_user: dict = Depends(require_auth)
):
    """Send Transformer Test Report PDF via email to customer."""
    
    # Validate Resend API key
    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email service not configured. Please contact administrator.")
    
    # Get the report
    report = await db.test_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    company_name = org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions'
    
    # Generate PDF
    pdf_buffer = generate_pdf_buffer(report, org_settings)
    pdf_content = pdf_buffer.getvalue()
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    # Prepare email details
    report_no = report.get('report_no', 'N/A')
    customer_name = report.get('customer_name', 'Valued Customer')
    project_name = report.get('project_name', '')
    test_date = format_date_ddmmyyyy(report.get('test_date', ''))
    overall_result = report.get('overall_result', 'satisfactory').upper()
    engineer_name = report.get('engineer_name', current_user.get('name', ''))
    
    # Build recipient list
    to_emails = [email_request.to_email]
    
    # Build CC list (engineer and managers)
    cc_list = []
    if email_request.cc_emails:
        cc_list.extend(email_request.cc_emails)
    
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
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{company_name}</h1>
            <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">Transformer Test Report</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                Dear <strong>{customer_name}</strong>,
            </p>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Please find attached the Transformer Test Report for your reference. Below are the key details:
            </p>
            
            <!-- Report Details Card -->
            <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748B; font-size: 14px; width: 40%;">Report Number:</td>
                        <td style="padding: 8px 0; color: #1E293B; font-size: 14px; font-weight: 600;">{report_no}</td>
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
                    📎 <strong>Attachment:</strong> Transformer_Test_Report_{report_no.replace('/', '_')}.pdf
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
        # Configure Resend
        resend.api_key = settings.RESEND_API_KEY
        
        # Prepare email params
        email_params = {
            "from": settings.SENDER_EMAIL,
            "to": to_emails,
            "subject": f"Transformer Test Report - {report_no} | {company_name}",
            "html": html_content,
            "attachments": [
                {
                    "filename": f"Transformer_Test_Report_{report_no.replace('/', '_')}.pdf",
                    "content": pdf_base64,
                    "content_type": "application/pdf"
                }
            ]
        }
        
        # Add CC if provided
        if cc_list:
            email_params["cc"] = cc_list
        
        # Send email
        await asyncio.to_thread(resend.Emails.send, email_params)
        
        # Log the email sent in the database
        email_log = {
            "report_id": report_id,
            "report_no": report_no,
            "to_email": email_request.to_email,
            "cc_emails": cc_list,
            "sent_by": current_user.get('email', ''),
            "sent_by_name": current_user.get('name', ''),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }
        await db.email_logs.insert_one(email_log)
        
        return {
            "message": "Email sent successfully",
            "to": email_request.to_email,
            "cc": cc_list,
            "report_no": report_no
        }
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.get("/{report_id}/email-history")
async def get_email_history(
    report_id: str,
    current_user: dict = Depends(require_auth)
):
    """Get email history for a specific report."""
    
    history = await db.email_logs.find(
        {"report_id": report_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(50)
    
    return history
