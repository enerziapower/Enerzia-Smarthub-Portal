"""
AMC Report PDF Generation
Enhanced version with Thermography-style Cover Page, Executive Summary, and Back Cover
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import base64
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

# Default Colors (will be overridden by template settings)
PRIMARY_BLUE = colors.HexColor('#1e3a5f')
ORANGE_ACCENT = colors.HexColor('#e65100')
LIGHT_GRAY = colors.HexColor('#f5f5f5')
BORDER_COLOR = colors.HexColor('#cccccc')
TEXT_DARK = colors.HexColor('#333333')


def get_db():
    from server import db
    return db


def get_amc_styles():
    """Get custom styles for AMC report - matching IR Thermography style"""
    styles = getSampleStyleSheet()
    
    # Section Header (blue background)
    styles.add(ParagraphStyle(
        name='AMCSectionHeader',
        fontSize=12,
        fontName='Helvetica-Bold',
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0
    ))
    
    # Subsection Header
    styles.add(ParagraphStyle(
        name='AMCSubHeader',
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_BLUE,
        spaceBefore=10,
        spaceAfter=5
    ))
    
    # Body Text - with proper word wrapping
    styles.add(ParagraphStyle(
        name='AMCBodyText',
        fontSize=10,
        fontName='Helvetica',
        textColor=TEXT_DARK,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceBefore=5,
        spaceAfter=5,
        wordWrap='CJK',  # Enable word wrapping for long text
    ))
    
    # Table Cell - with proper word wrapping for long text
    styles.add(ParagraphStyle(
        name='AMCTableCell',
        fontSize=9,
        fontName='Helvetica',
        leading=11,
        alignment=TA_LEFT,
        wordWrap='CJK',
        splitLongWords=True,
    ))
    
    return styles


def draw_cover_page(canvas_obj, doc, amc, project, org_settings):
    """Draw the cover page - matching IR Thermography design"""
    c = canvas_obj
    width, height = A4
    
    # Get template settings
    template_settings = get_template_settings()
    cover_settings = get_cover_page_settings()
    company_info = get_pdf_company_info()
    logo_path = get_pdf_logo_path()
    company_name = get_pdf_company_name()
    website = get_pdf_website()
    
    # Get AMC-specific design settings
    from routes.pdf_template_settings import get_report_design, draw_decorative_design
    report_design = get_report_design('amc', template_settings)
    design_id = report_design.get('design_id', 'design_1')
    design_color = report_design.get('design_color', '#F7931E')
    primary_orange = colors.HexColor(design_color)
    
    # Colors from settings
    dark_blue = colors.HexColor('#1e3a5f')
    text_dark = colors.HexColor('#1a1a1a')
    
    # =====================================================
    # BACKGROUND - White
    # =====================================================
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # =====================================================
    # DECORATIVE DESIGN (using selected design for AMC)
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
    title_text = 'Annual Maintenance'
    title_width = c.stringWidth(title_text, 'Helvetica-Bold', 38)
    c.drawString((width - title_width) / 2, height * 0.65, title_text)
    
    c.setFont('Helvetica-Bold', 38)
    title_text2 = 'Contract Report'
    title_width2 = c.stringWidth(title_text2, 'Helvetica-Bold', 38)
    c.drawString((width - title_width2) / 2, height * 0.58, title_text2)
    
    # Subtitle with orange accent line
    subtitle = 'Electrical Preventive Maintenance Service Report'
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
    
    contract = amc.get('contract_details', {})
    # Get customer info from AMC's customer_info first, then fall back to project
    customer_info = amc.get('customer_info', {}) or {}
    customer_name = customer_info.get('customer_name') or (project.get('customer_name', '') if project else '')
    location = customer_info.get('site_location') or (project.get('location', '') if project else '')
    amc_no = amc.get('amc_no', '')
    contract_period = f"{format_date_ddmmyyyy(contract.get('start_date', ''))} to {format_date_ddmmyyyy(contract.get('end_date', ''))}"
    
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
    
    # AMC NO
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'AMC NO:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, amc_no)
    
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


def draw_header_footer(canvas_obj, doc, amc, page_num):
    """Draw header and footer for all pages except cover - matching IR Thermography style"""
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
        # Only draw footer on cover page
        # ============ FOOTER ============
        footer_y = 25
        
        c.setStrokeColor(primary_orange)
        c.setLineWidth(2)
        c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        c.setFont('Helvetica-Bold', 7)
        c.setFillColor(colors.HexColor('#333333'))
        c.drawString(margin, footer_y + 5, 'Enerzia Power Solutions')
        
        c.setFont('Helvetica', 8)
        c.setFillColor(primary_orange)
        c.drawCentredString(width / 2, footer_y + 5, website)
        return
    
    # ============ HEADER (Page 2+) ============
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
    
    # Report title on left - aligned with logo
    # HEADER section (if enabled)
    if hf_settings.get('show_header', True):
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(dark_blue)
        c.drawString(margin, header_y - 5, 'ANNUAL MAINTENANCE CONTRACT REPORT')
        
        # Report number below title - changed from "AMC No:" to "REPORT No:"
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.HexColor('#666666'))
        amc_no = amc.get('amc_no', '')
        c.drawString(margin, header_y - 18, f"REPORT No: {amc_no}")
        
        # Header line - orange accent (if enabled)
        if hf_settings.get('show_header_line', True):
            c.setStrokeColor(primary_orange)
            c.setLineWidth(2)
            c.line(margin, header_y - 28, width - margin, header_y - 28)
    
    # ============ FOOTER ============
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


def create_risk_bar_chart(risk_data, width=400, height=180):
    """Create a bar chart showing risk distribution"""
    drawing = Drawing(width, height)
    
    chart = VerticalBarChart()
    chart.x = 60
    chart.y = 30
    chart.width = width - 100
    chart.height = height - 60
    
    # Data
    data = [[
        risk_data.get('critical', 0),
        risk_data.get('warning', 0),
        risk_data.get('check_monitor', 0),
        risk_data.get('normal', 0)
    ]]
    
    chart.data = data
    chart.categoryAxis.categoryNames = ['Critical', 'Warning', 'Check & Monitor', 'Normal']
    chart.categoryAxis.labels.fontName = 'Helvetica'
    chart.categoryAxis.labels.fontSize = 8
    chart.categoryAxis.labels.angle = 0
    
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.valueAxis.valueStep = 20
    chart.valueAxis.labels.fontName = 'Helvetica'
    chart.valueAxis.labels.fontSize = 8
    
    # Bar colors
    chart.bars[0].fillColor = colors.HexColor('#dc2626')  # Critical - Red
    chart.bars.symbol = None
    
    # Set individual bar colors
    for i, color in enumerate(['#dc2626', '#f59e0b', '#3b82f6', '#22c55e']):
        if i < len(data[0]):
            chart.bars[(0, i)].fillColor = colors.HexColor(color)
    
    drawing.add(chart)
    return drawing


def create_table_of_contents(amc, styles, ir_reports_count=0, test_reports_count=0, service_reports_count=0):
    """Create Table of Contents matching the required order"""
    elements = []
    
    # Section Header
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
    
    # TOC entries - Dynamic based on content
    toc_data = [
        ['S.No', 'SECTION', 'DESCRIPTION', 'PAGE NO.'],
        ['1', 'A', 'Document Details', '3'],
        ['2', 'B', 'Executive Summary', '4'],
        ['3', 'C', 'Scope & Objective of AMC', '5'],
        ['4', 'D', 'AMC Equipment List', '6'],
        ['5', 'E', 'Service Schedule & Visits', '7'],
        ['6', 'F', 'Spare & Consumables Used', '8'],
    ]
    
    section_num = 7
    current_section = 'G'
    page_num = 9
    
    # IR Thermography Reports (Section G - if any)
    if ir_reports_count > 0:
        toc_data.append([str(section_num), current_section, 'IR Thermography Reports', str(page_num)])
        section_num += 1
        current_section = chr(ord(current_section) + 1)
        page_num += 1
    
    # Equipment Test Reports
    toc_data.append([str(section_num), current_section, 'Equipment Test Reports', str(page_num)])
    section_num += 1
    current_section = chr(ord(current_section) + 1)
    page_num += 1
    
    # Service Reports (if any)
    if service_reports_count > 0:
        toc_data.append([str(section_num), current_section, 'Service Reports', str(page_num)])
        section_num += 1
        current_section = chr(ord(current_section) + 1)
        page_num += 1
    
    # Statutory Documents & Attachments (always last)
    toc_data.append([str(section_num), current_section, 'Statutory Documents & Attachments', str(page_num)])
    
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


def create_executive_summary(amc, project, styles, risk_data=None):
    """Create executive summary section - Now Section B"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - B: EXECUTIVE SUMMARY']],
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
    
    # Get data - Use customer_info from AMC first, then fall back to project
    customer_info = amc.get('customer_info', {}) or {}
    customer_name = customer_info.get('customer_name') or (project.get('customer_name', 'the client') if project else 'the client')
    location = customer_info.get('site_location') or (project.get('location', 'their facility') if project else 'their facility')
    contract = amc.get('contract_details', {})
    
    # Get service visit dates
    service_visits = amc.get('service_visits', [])
    visit_dates = [v.get('visit_date', '') for v in service_visits if v.get('visit_date')]
    visit_date_str = format_date_ddmmyyyy(visit_dates[0]) if visit_dates else 'as scheduled'
    
    # Introduction paragraph
    intro_text = f"""Electrical Preventive Maintenance has been carried out by <b>Enerzia Power Solutions</b> 
    on <b>{visit_date_str}</b> for <b>{customer_name}</b> at <b>{location}</b>. 
    A detailed report of the works done and the meter readings has been formulated hereafter in this report."""
    
    elements.append(Paragraph(intro_text, styles['AMCBodyText']))
    elements.append(Spacer(1, 15))
    
    # Risk Level Summary (if available from linked thermography reports)
    if risk_data:
        elements.append(Paragraph("<b>According to the thermography study conducted in the facility, the risk level is formulated as:</b>", styles['AMCSubHeader']))
        elements.append(Spacer(1, 10))
        
        # Risk Level Table
        total = sum(risk_data.values()) or 1
        risk_table_data = [
            ['Risk Level', 'Count', 'Percentage'],
            ['Critical', str(risk_data.get('critical', 0)), f"{(risk_data.get('critical', 0)/total*100):.0f}%"],
            ['Warning', str(risk_data.get('warning', 0)), f"{(risk_data.get('warning', 0)/total*100):.0f}%"],
            ['Check & Monitor', str(risk_data.get('check_monitor', 0)), f"{(risk_data.get('check_monitor', 0)/total*100):.0f}%"],
            ['Normal', str(risk_data.get('normal', 0)), f"{(risk_data.get('normal', 0)/total*100):.0f}%"],
        ]
        
        risk_colors_map = {
            'Critical': colors.HexColor('#dc2626'),
            'Warning': colors.HexColor('#f59e0b'),
            'Check & Monitor': colors.HexColor('#3b82f6'),
            'Normal': colors.HexColor('#22c55e'),
        }
        
        risk_table = Table(risk_table_data, colWidths=[150, 80, 100])
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]
        
        for i, (label, _, _) in enumerate(risk_table_data[1:], 1):
            color = risk_colors_map.get(label, colors.black)
            style_cmds.append(('BACKGROUND', (0, i), (0, i), color))
            style_cmds.append(('TEXTCOLOR', (0, i), (0, i), colors.white))
            style_cmds.append(('FONTNAME', (0, i), (0, i), 'Helvetica-Bold'))
        
        risk_table.setStyle(TableStyle(style_cmds))
        elements.append(risk_table)
        elements.append(Spacer(1, 20))
        
        # Bar Chart
        elements.append(Paragraph("<b>Graphical Representation of Risk Level</b>", styles['AMCSubHeader']))
        elements.append(Spacer(1, 10))
        
        # Convert to percentages for chart
        chart_data = {
            'critical': (risk_data.get('critical', 0)/total*100),
            'warning': (risk_data.get('warning', 0)/total*100),
            'check_monitor': (risk_data.get('check_monitor', 0)/total*100),
            'normal': (risk_data.get('normal', 0)/total*100)
        }
        bar_chart = create_risk_bar_chart(chart_data)
        
        chart_table = Table([[bar_chart]], colWidths=[515])
        chart_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(chart_table)
    else:
        # Default summary without risk data
        elements.append(Paragraph("<b>Summary of Work Performed:</b>", styles['AMCSubHeader']))
        elements.append(Spacer(1, 10))
        
        # Equipment serviced
        equipment_list = amc.get('equipment_list', [])
        eq_count = len(equipment_list)
        visits_count = len(service_visits)
        
        summary_data = [
            ['Total Equipment Under AMC', str(eq_count)],
            ['Service Visits Completed', str(visits_count)],
            ['AMC Status', amc.get('status', 'Active').title()],
        ]
        
        summary_table = Table(summary_data, colWidths=[250, 100])
        summary_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(summary_table)
    
    elements.append(PageBreak())
    return elements


def create_document_details_section(amc, project, styles):
    """Create document details section - Now Section A (first section)"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - A: DOCUMENT DETAILS']],
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
    
    contract = amc.get('contract_details', {})
    
    # Document Information
    doc_data = [
        ['DOCUMENT TITLE', 'Annual Maintenance Contract Service Report'],
        ['DOCUMENT NO', amc.get('amc_no', '')],
        ['REVISION', '00'],
        ['ISSUE DATE', datetime.now().strftime("%d-%m-%Y")],
        ['CONTRACT NO', contract.get('contract_no', amc.get('amc_no', ''))],
        ['CONTRACT START DATE', format_date_ddmmyyyy(contract.get('start_date', ''))],
        ['CONTRACT END DATE', format_date_ddmmyyyy(contract.get('end_date', ''))],
    ]
    
    doc_table = Table(doc_data, colWidths=[150, 365])
    doc_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(doc_table)
    elements.append(Spacer(1, 20))
    
    # Customer Information - Use customer_info from AMC if available, else from project
    elements.append(Paragraph("<b>Customer Information</b>", styles['AMCSubHeader']))
    elements.append(Spacer(1, 10))
    
    customer_info = amc.get('customer_info', {}) or {}
    
    # Fallback to project data if customer_info is empty
    customer_name = customer_info.get('customer_name') or (project.get('customer_name', '') if project else '')
    site_location = customer_info.get('site_location') or (project.get('location', '') if project else '')
    contact_person = customer_info.get('contact_person') or (project.get('contact_person', '') if project else '')
    contact_number = customer_info.get('contact_number') or (project.get('contact_phone', '') if project else '')
    email = customer_info.get('email') or (project.get('contact_email', '') if project else '')
    
    # Create paragraph style for wrapping text in cells
    cell_wrap_style = ParagraphStyle(
        'CellWrap',
        fontSize=10,
        fontName='Helvetica',
        leading=12,
        wordWrap='CJK',
        splitLongWords=True,
    )
    
    customer_data = [
        ['CUSTOMER NAME', Paragraph(customer_name, cell_wrap_style)],
        ['SITE LOCATION', Paragraph(site_location, cell_wrap_style)],
        ['CONTACT PERSON', Paragraph(contact_person, cell_wrap_style)],
        ['CONTACT NUMBER', Paragraph(contact_number, cell_wrap_style)],
        ['EMAIL', Paragraph(email, cell_wrap_style)],
    ]
    
    customer_table = Table(customer_data, colWidths=[150, 365])
    customer_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 20))
    
    # Service Provider Information
    elements.append(Paragraph("<b>Service Provider Information</b>", styles['AMCSubHeader']))
    elements.append(Spacer(1, 10))
    
    service_provider = amc.get('service_provider', {}) or {}
    
    # Default service provider info
    sp_name = service_provider.get('company_name') or 'Enerzia Power Solutions'
    sp_address = service_provider.get('address') or 'Chennai, Tamil Nadu, India'
    sp_contact = service_provider.get('contact_person') or ''
    sp_phone = service_provider.get('contact_number') or ''
    sp_email = service_provider.get('email') or 'info@enerzia.com'
    sp_gstin = service_provider.get('gstin') or ''
    
    provider_data = [
        ['COMPANY NAME', sp_name],
        ['ADDRESS', sp_address],
        ['CONTACT PERSON', sp_contact],
        ['CONTACT NUMBER', sp_phone],
        ['EMAIL', sp_email],
    ]
    
    provider_table = Table(provider_data, colWidths=[150, 365])
    provider_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(provider_table)
    
    elements.append(PageBreak())
    return elements


def create_scope_of_work_section(amc, styles):
    """Create scope and objective section - Section C"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - C: SCOPE & OBJECTIVE OF AMC']],
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
    
    contract = amc.get('contract_details', {})
    scope = contract.get('scope_of_work', '')
    
    # Create a wrapped paragraph style for scope text
    scope_style = ParagraphStyle(
        'ScopeText',
        fontSize=9,  # Reduced font size for long content
        fontName='Helvetica',
        textColor=TEXT_DARK,
        leading=14,  # Line height
        alignment=TA_JUSTIFY,
        spaceBefore=3,
        spaceAfter=3,
        wordWrap='CJK',
        splitLongWords=True,
        firstLineIndent=0,
    )
    
    if scope:
        # Replace newlines with <br/> for proper PDF rendering
        # Split long text into paragraphs for better page handling
        scope_text = scope.replace('\n\n', '<br/><br/>').replace('\n', '<br/>')
        
        # Use Paragraph directly (not wrapped in Table) to allow natural page breaks
        scope_para = Paragraph(scope_text, scope_style)
        elements.append(scope_para)
    else:
        # Default scope
        default_scope = """
        <b>Scope of the AMC includes:</b><br/><br/>
        • Preventive maintenance of all listed electrical equipment<br/>
        • Operation & maintenance of all electrical installations such as transformers, HT/LT panels including CT/PT, DG Sets, Pump-motors<br/>
        • To attend fault in main switches, DB, ACB, MCB, MCCB, panel board, etc.<br/>
        • Periodic inspection and testing as per schedule<br/>
        • Emergency breakdown support<br/>
        • To check all earth electrodes, continuity of earth, measurement of earth resistance<br/>
        • Replacement of minor consumables<br/>
        • Technical consultation and recommendations<br/>
        • Detailed test reports for all equipment<br/>
        • 24/7 helpline support for emergencies
        """
        elements.append(Paragraph(default_scope, scope_style))
    
    elements.append(Spacer(1, 15))
    
    # Special conditions if any
    special_conditions = contract.get('special_conditions', '')
    if special_conditions:
        elements.append(Paragraph("<b>Special Conditions:</b>", styles['AMCSubHeader']))
        special_text = special_conditions.replace('\n\n', '<br/><br/>').replace('\n', '<br/>')
        # Use Paragraph directly for proper page breaking
        special_para = Paragraph(special_text, scope_style)
        elements.append(special_para)
    
    elements.append(PageBreak())
    return elements


def create_equipment_list_section(amc, styles):
    """Create AMC equipment list section - Section D"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - D: AMC EQUIPMENT LIST']],
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
    
    equipment_list = amc.get('equipment_list', [])
    
    if equipment_list:
        eq_data = [['S.No', 'EQUIPMENT TYPE', 'EQUIPMENT NAME', 'QTY', 'SERVICE FREQ.', 'LAST SERVICE', 'NEXT SERVICE']]
        
        for i, eq in enumerate(equipment_list):
            eq_data.append([
                str(i + 1),
                eq.get('equipment_type', '').upper(),
                eq.get('equipment_name', '').upper(),
                str(eq.get('quantity', 1)),
                eq.get('service_frequency', '').upper(),
                format_date_ddmmyyyy(eq.get('last_service_date', '-')),
                format_date_ddmmyyyy(eq.get('next_service_date', '-'))
            ])
        
        eq_table = Table(eq_data, colWidths=[35, 80, 120, 35, 80, 75, 75])
        eq_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(eq_table)
    else:
        elements.append(Paragraph("No equipment listed in this AMC.", styles['AMCBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_spare_consumables_section(amc, styles):
    """Create spare and consumables section - Section F"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - F: SPARE & CONSUMABLES USED']],
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
    
    # Get spare parts from service visits
    spare_parts = amc.get('spare_consumables', [])
    
    # Also check service visits for spare parts used
    service_visits = amc.get('service_visits', [])
    for visit in service_visits:
        visit_spares = visit.get('spare_parts_used', [])
        spare_parts.extend(visit_spares)
    
    if spare_parts:
        # Create paragraph style for wrapping text in cells
        cell_wrap_style = ParagraphStyle(
            'SpareWrap',
            fontSize=9,
            fontName='Helvetica',
            leading=11,
            wordWrap='CJK',
            splitLongWords=True,
        )
        cell_center_style = ParagraphStyle(
            'SpareCenter',
            fontSize=9,
            fontName='Helvetica',
            leading=11,
            alignment=TA_CENTER,
        )
        
        spare_data = [['S.No', 'ITEM DESCRIPTION', 'PART NO.', 'QTY', 'UNIT', 'REMARKS']]
        
        for i, spare in enumerate(spare_parts):
            spare_data.append([
                Paragraph(str(i + 1), cell_center_style),
                Paragraph(spare.get('description', spare.get('item_name', '')), cell_wrap_style),
                Paragraph(spare.get('part_no', '-'), cell_wrap_style),
                Paragraph(str(spare.get('quantity', 1)), cell_center_style),
                Paragraph(spare.get('unit', 'Nos'), cell_center_style),
                Paragraph(spare.get('remarks', '-'), cell_wrap_style)
            ])
        
        spare_table = Table(spare_data, colWidths=[35, 180, 80, 45, 50, 125])
        spare_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(spare_table)
    else:
        elements.append(Paragraph("No spare parts or consumables used during this service period.", styles['AMCBodyText']))
        elements.append(Spacer(1, 20))
        
        # Empty table for manual entry
        empty_data = [
            ['S.No', 'ITEM DESCRIPTION', 'PART NO.', 'QTY', 'UNIT', 'REMARKS'],
            ['1', '', '', '', '', ''],
            ['2', '', '', '', '', ''],
            ['3', '', '', '', '', ''],
            ['4', '', '', '', '', ''],
            ['5', '', '', '', '', ''],
        ]
        
        empty_table = Table(empty_data, colWidths=[35, 180, 80, 45, 50, 125])
        empty_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(empty_table)
    
    elements.append(PageBreak())
    return elements


def create_service_visits_section(amc, styles):
    """Create service visits section - Section E"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - E: SERVICE SCHEDULE & VISITS']],
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
    
    service_visits = amc.get('service_visits', [])
    
    if service_visits:
        # Create paragraph style for wrapping text in cells
        cell_wrap_style = ParagraphStyle(
            'CellWrapSmall',
            fontSize=8,
            fontName='Helvetica',
            leading=10,
            wordWrap='CJK',
            splitLongWords=True,
        )
        cell_center_style = ParagraphStyle(
            'CellCenterSmall',
            fontSize=8,
            fontName='Helvetica',
            leading=10,
            alignment=TA_CENTER,
        )
        
        sv_data = [['S.No', 'VISIT DATE', 'VISIT TYPE', 'STATUS', 'TECHNICIAN', 'EQUIPMENT', 'REMARKS']]
        
        for i, visit in enumerate(service_visits):
            equipment_serviced = ', '.join(visit.get('equipment_serviced', [])) or '-'
            remarks = visit.get('remarks', '-') or '-'
            
            sv_data.append([
                Paragraph(str(i + 1), cell_center_style),
                Paragraph(format_date_ddmmyyyy(visit.get('visit_date', '')), cell_center_style),
                Paragraph(visit.get('visit_type', '').title(), cell_wrap_style),
                Paragraph(visit.get('status', '').title(), cell_wrap_style),
                Paragraph(visit.get('technician_name', '-'), cell_wrap_style),
                Paragraph(equipment_serviced, cell_wrap_style),
                Paragraph(remarks, cell_wrap_style)
            ])
        
        sv_table = Table(sv_data, colWidths=[30, 65, 60, 55, 70, 105, 110])
        sv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(sv_table)
    else:
        elements.append(Paragraph("No service visits recorded yet.", styles['AMCBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_test_reports_section(amc, test_reports, styles, has_ir_reports=False):
    """Create equipment test reports section"""
    elements = []
    
    # Section letter depends on whether IR reports exist (IR is G, Equipment is H)
    section_letter = 'H' if has_ir_reports else 'G'
    
    # Section Header
    header_table = Table(
        [[f'SECTION - {section_letter}: EQUIPMENT TEST REPORTS']],
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
    
    if test_reports:
        elements.append(Paragraph("The following test reports are linked to this AMC service visits:", styles['AMCBodyText']))
        elements.append(Spacer(1, 10))
        
        report_data = [['S.No', 'REPORT NO', 'REPORT DATE', 'EQUIPMENT TYPE', 'TEST DATE', 'RESULT']]
        
        for i, report in enumerate(test_reports):
            report_data.append([
                str(i + 1),
                report.get('report_no', ''),
                format_date_ddmmyyyy(report.get('report_date', '')),
                report.get('equipment_type', '').upper(),
                format_date_ddmmyyyy(report.get('test_date', report.get('date_of_testing', ''))),
                (report.get('overall_result', '') or report.get('overall_condition', '-')).upper()
            ])
        
        report_table = Table(report_data, colWidths=[35, 95, 80, 95, 80, 110])
        report_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_DARK),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
        ]))
        elements.append(report_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("<i>Note: Detailed test reports are attached as separate documents in the annexure.</i>", 
            ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')))
    else:
        elements.append(Paragraph("No equipment test reports linked to this AMC.", styles['AMCBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_ir_thermography_section(amc, ir_reports, styles):
    """Create IR Thermography reports section - Now Section G (before Equipment Test Reports)"""
    elements = []
    
    # Section Header - G for IR Thermography
    header_table = Table(
        [['SECTION - G: IR THERMOGRAPHY REPORTS']],
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
    
    if ir_reports:
        elements.append(Paragraph("The following IR Thermography reports are linked to this AMC:", styles['AMCBodyText']))
        elements.append(Spacer(1, 10))
        
        ir_data = [['S.No', 'REPORT NO', 'REPORT TYPE', 'DATE OF STUDY', 'RISK SUMMARY']]
        
        for i, report in enumerate(ir_reports):
            doc_details = report.get('document_details', {})
            summary = report.get('summary', {})
            risk_dist = summary.get('risk_distribution', {})
            
            risk_summary = f"C:{risk_dist.get('critical', 0)} W:{risk_dist.get('warning', 0)} CM:{risk_dist.get('check_monitor', 0)} N:{risk_dist.get('normal', 0)}"
            
            ir_data.append([
                str(i + 1),
                report.get('report_no', ''),
                report.get('report_type', '').replace('-', ' ').title(),
                format_date_ddmmyyyy(doc_details.get('date_of_ir_study', '')),
                risk_summary
            ])
        
        ir_table = Table(ir_data, colWidths=[35, 120, 100, 100, 160])
        ir_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(ir_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("<i>C=Critical, W=Warning, CM=Check & Monitor, N=Normal</i>", 
            ParagraphStyle('Note', fontSize=8, textColor=colors.gray, fontName='Helvetica-Oblique')))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("<i>Note: Detailed IR Thermography reports are attached as separate documents in the annexure.</i>", 
            ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')))
    else:
        elements.append(Paragraph("No IR thermography reports linked to this AMC.", styles['AMCBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_service_reports_section(amc, service_reports, styles):
    """Create Service Reports section - Section I (Electrical, HVAC, Fire Protection, etc.)"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - I: SERVICE REPORTS']],
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
    
    if service_reports:
        elements.append(Paragraph("The following service reports are linked to this AMC contract:", styles['AMCBodyText']))
        elements.append(Spacer(1, 10))
        
        # Cell style for wrapping text
        cell_style = ParagraphStyle(
            'TableCellWrap',
            fontSize=9,
            fontName='Helvetica',
            leading=11,
            wordWrap='CJK'
        )
        cell_style_center = ParagraphStyle(
            'TableCellCenter',
            fontSize=9,
            fontName='Helvetica',
            leading=11,
            alignment=TA_CENTER
        )
        
        # Updated headers for service_requests collection
        report_data = [['S.No', 'SRN NO', 'CATEGORY', 'CUSTOMER/SITE', 'SERVICE DATE', 'STATUS']]
        
        for i, report in enumerate(service_reports):
            # Get customer name or site location - no truncation, will wrap
            site_info = report.get('customer_name', '') or report.get('site_location', '') or '-'
            
            # Get service date
            service_date = report.get('service_date', '') or report.get('completion_date', '') or report.get('reported_date', '')
            
            report_data.append([
                Paragraph(str(i + 1), cell_style_center),
                Paragraph(report.get('srn_no', ''), cell_style),
                Paragraph(report.get('service_category', ''), cell_style),
                Paragraph(site_info, cell_style),  # Will wrap properly now
                Paragraph(format_date_ddmmyyyy(service_date), cell_style_center),
                Paragraph(report.get('status', '').title(), cell_style_center)
            ])
        
        report_table = Table(report_data, colWidths=[35, 80, 95, 145, 75, 70])
        report_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_DARK),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
        ]))
        elements.append(report_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("<i>Note: Detailed service reports are attached in the annexure section.</i>", 
            ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')))
    else:
        elements.append(Paragraph("No service reports linked to this AMC.", styles['AMCBodyText']))
    
    elements.append(PageBreak())
    return elements


def create_statutory_documents_section(amc, styles, has_ir_reports=False):
    """Create Statutory Documents & Attachments section - lists documents like Sections G and H"""
    elements = []
    
    # Section letter depends on whether IR reports exist
    section_letter = 'I' if has_ir_reports else 'H'
    
    # Section Header
    header_table = Table(
        [[f'SECTION - {section_letter}: STATUTORY DOCUMENTS & ATTACHMENTS']],
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
    
    # Description text
    elements.append(Paragraph(
        "The following statutory documents, calibration certificates and attachments are linked to this AMC:",
        styles['AMCBodyText']
    ))
    elements.append(Spacer(1, 10))
    
    # Get annexure/attached documents from AMC
    annexure_docs = amc.get('annexure', []) or []
    statutory_docs = amc.get('statutory_documents', []) or []
    all_docs = annexure_docs + statutory_docs
    
    if all_docs:
        # Create table listing the documents
        doc_data = [['S.No', 'DOCUMENT TYPE', 'DOCUMENT NAME', 'REFERENCE NO.']]
        
        # Map document types to readable names
        doc_type_labels = {
            'calibration_certificate': 'Calibration Certificate',
            'test_certificate': 'Test Certificate',
            'compliance_certificate': 'Compliance Certificate',
            'safety_certificate': 'Safety Certificate',
            'warranty_document': 'Warranty Document',
            'manufacturer_datasheet': 'Manufacturer Datasheet',
            'installation_certificate': 'Installation Certificate',
            'other': 'Other Document'
        }
        
        for i, doc in enumerate(all_docs):
            doc_type = doc.get('type', doc.get('document_type', 'other'))
            doc_type_label = doc_type_labels.get(doc_type, doc_type.replace('_', ' ').title())
            
            doc_data.append([
                str(i + 1),
                doc_type_label,
                doc.get('name', doc.get('document_name', '-')),
                doc.get('reference', doc.get('reference_no', '-'))
            ])
        
        doc_table = Table(doc_data, colWidths=[35, 150, 200, 130])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(doc_table)
        elements.append(Spacer(1, 15))
        elements.append(Paragraph(
            "<i>Note: Detailed statutory documents and calibration certificates are attached at the end of this report.</i>",
            ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')
        ))
    else:
        # No documents attached
        elements.append(Spacer(1, 50))
        no_doc_style = ParagraphStyle(
            'NoDocuments',
            fontSize=11,
            fontName='Helvetica-Oblique',
            textColor=colors.gray,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("No statutory documents or attachments linked to this AMC.", no_doc_style))
        elements.append(Spacer(1, 30))
        elements.append(Paragraph(
            "To attach documents, edit this AMC and upload calibration certificates,",
            no_doc_style
        ))
        elements.append(Paragraph(
            "statutory documents, or other relevant attachments.",
            no_doc_style
        ))
    
    elements.append(PageBreak())
    return elements


def create_back_cover(styles):
    """Create back cover page with contact information"""
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


async def generate_amc_report_pdf(amc_id: str):
    """Generate complete AMC report PDF with enhanced formatting and attached reports"""
    from PyPDF2 import PdfReader, PdfWriter
    
    db = get_db()
    
    # Get AMC data
    amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0})
    if not amc:
        raise HTTPException(status_code=404, detail="AMC not found")
    
    # Get project data
    project = await db.projects.find_one({"id": amc.get("project_id")}, {"_id": 0})
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    if org_settings:
        org_settings = org_settings.get("settings", {})
    
    # Get linked test reports
    report_ids = []
    ir_report_ids = []
    service_report_ids = []
    for visit in amc.get("service_visits", []):
        report_ids.extend(visit.get("test_report_ids", []))
        ir_report_ids.extend(visit.get("ir_thermography_report_ids", []))
        service_report_ids.extend(visit.get("service_report_ids", []))
    
    # Build equipment type order from equipment_list for sorting
    equipment_order = {}
    for idx, eq in enumerate(amc.get("equipment_list", [])):
        eq_type = eq.get("equipment_type", "").lower()
        if eq_type and eq_type not in equipment_order:
            equipment_order[eq_type] = idx
    
    def sort_reports_by_equipment(reports):
        """Sort reports by equipment_list order, then by report_no"""
        def sort_key(report):
            eq_type = report.get("equipment_type", "").lower()
            order = equipment_order.get(eq_type, 999)
            report_no = report.get("report_no", "")
            return (order, report_no)
        return sorted(reports, key=sort_key)
    
    test_reports = []
    if report_ids:
        test_reports = await db.test_reports.find(
            {"id": {"$in": list(set(report_ids))}},
            {"_id": 0}
        ).to_list(100)
        test_reports = sort_reports_by_equipment(test_reports)
    
    # Fallback: If no linked reports found but project exists, try to get reports by project_id
    if not test_reports and project:
        project_id = project.get('id')
        if project_id:
            test_reports = await db.test_reports.find(
                {"project_id": project_id, "equipment_type": {"$ne": "ir-thermography"}},
                {"_id": 0}
            ).to_list(50)
            test_reports = sort_reports_by_equipment(test_reports)
    
    ir_reports = []
    if ir_report_ids:
        # First try test_reports collection (where IR thermography reports may be stored)
        ir_reports = await db.test_reports.find(
            {"id": {"$in": list(set(ir_report_ids))}},
            {"_id": 0}
        ).to_list(100)
        
        # If not found, try ir_thermography_reports collection
        if not ir_reports:
            ir_reports = await db.ir_thermography_reports.find(
                {"id": {"$in": list(set(ir_report_ids))}},
                {"_id": 0}
            ).to_list(100)
    
    # Fallback: If no IR reports found but project exists, get IR reports by project_id
    if not ir_reports and project:
        project_id = project.get('id')
        if project_id:
            # Try test_reports with ir-thermography type
            ir_reports = await db.test_reports.find(
                {"project_id": project_id, "equipment_type": "ir-thermography"},
                {"_id": 0}
            ).to_list(50)
            
            # Also try dedicated ir_thermography_reports collection
            if not ir_reports:
                ir_reports = await db.ir_thermography_reports.find(
                    {"project_id": project_id},
                    {"_id": 0}
                ).to_list(50)
    
    # Get service reports from service_requests collection (Electrical, HVAC, Fire Protection, etc.)
    service_reports = []
    if service_report_ids:
        service_reports = await db.service_requests.find(
            {"id": {"$in": list(set(service_report_ids))}},
            {"_id": 0}
        ).to_list(100)
    
    # Calculate risk data from IR reports
    risk_data = None
    if ir_reports:
        risk_data = {'critical': 0, 'warning': 0, 'check_monitor': 0, 'normal': 0}
        for report in ir_reports:
            summary = report.get('summary', {})
            risk_dist = summary.get('risk_distribution', {})
            risk_data['critical'] += risk_dist.get('critical', 0)
            risk_data['warning'] += risk_dist.get('warning', 0)
            risk_data['check_monitor'] += risk_dist.get('check_monitor', 0)
            risk_data['normal'] += risk_dist.get('normal', 0)
    
    # Create PDF
    buffer = BytesIO()
    
    styles = get_amc_styles()
    elements = []
    
    # Page counter for header/footer
    page_num = [1]
    
    def on_page(canvas_obj, doc):
        if page_num[0] == 1:
            draw_cover_page(canvas_obj, doc, amc, project, org_settings)
        else:
            draw_header_footer(canvas_obj, doc, amc, page_num[0])
        page_num[0] += 1
    
    def on_page_later(canvas_obj, doc):
        draw_header_footer(canvas_obj, doc, amc, page_num[0])
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
    # Cover page is drawn by on_page callback, just add a page break
    elements.append(Spacer(1, 500))
    elements.append(PageBreak())
    
    # Table of Contents - pass report counts for proper section lettering
    elements.extend(create_table_of_contents(amc, styles, len(ir_reports), len(test_reports), len(service_reports)))
    
    # Section A: Document Details (FIRST)
    elements.extend(create_document_details_section(amc, project, styles))
    
    # Section B: Executive Summary
    elements.extend(create_executive_summary(amc, project, styles, risk_data))
    
    # Section C: Scope & Objective of AMC
    elements.extend(create_scope_of_work_section(amc, styles))
    
    # Section D: AMC Equipment List
    elements.extend(create_equipment_list_section(amc, styles))
    
    # Section E: Service Schedule & Visits
    elements.extend(create_service_visits_section(amc, styles))
    
    # Section F: Spare & Consumables Used
    elements.extend(create_spare_consumables_section(amc, styles))
    
    # Section G: IR Thermography Reports (if any)
    has_ir_reports = len(ir_reports) > 0
    if has_ir_reports:
        elements.extend(create_ir_thermography_section(amc, ir_reports, styles))
    
    # Section H: Equipment Test Reports (or Section G if no IR reports)
    elements.extend(create_test_reports_section(amc, test_reports, styles, has_ir_reports))
    
    # Section I: Service Reports (if any)
    has_service_reports = len(service_reports) > 0
    if has_service_reports:
        elements.extend(create_service_reports_section(amc, service_reports, styles))
    
    # NOTE: Statutory Documents section moved to appear after Equipment Test Reports Annexure
    # This will be added during PDF merging phase
    
    # NOTE: Back cover will be added at the very end after all annexures (in the PDF merging section)
    
    # Build PDF
    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page_later)
    buffer.seek(0)
    
    # =====================================================
    # ATTACH ACTUAL REPORTS AND BACK COVER
    # Order: IR Thermography PDFs -> Equipment Test Reports -> Back Cover
    # =====================================================
    try:
        writer = PdfWriter()
        
        # Add main AMC report pages
        main_reader = PdfReader(buffer)
        for page in main_reader.pages:
            writer.add_page(page)
        
        # Define reusable styles for separator pages
        sep_header = ParagraphStyle(
            'SeparatorHeader',
            fontSize=20,
            fontName='Helvetica-Bold',
            textColor=PRIMARY_BLUE,
            alignment=TA_CENTER,
            spaceAfter=20
        )
        sep_title = ParagraphStyle(
            'SeparatorTitle',
            fontSize=16,
            fontName='Helvetica-Bold',
            textColor=PRIMARY_BLUE,
            alignment=TA_CENTER,
            spaceAfter=30
        )
        sep_subtitle = ParagraphStyle(
            'SeparatorSubtitle',
            fontSize=11,
            fontName='Helvetica',
            textColor=TEXT_DARK,
            alignment=TA_CENTER
        )
        
        annexure_num = 1
        
        # FIRST: Attach IR Thermography Report PDFs (Annexure I if exists)
        if ir_reports:
            # Create separator page for IR reports
            separator_buffer_ir = BytesIO()
            separator_doc_ir = SimpleDocTemplate(
                separator_buffer_ir,
                pagesize=A4,
                rightMargin=40,
                leftMargin=40,
                topMargin=70,
                bottomMargin=50
            )
            sep_elements_ir = []
            sep_elements_ir.append(Spacer(1, 250))
            sep_elements_ir.append(Paragraph(f"ANNEXURE - {annexure_num}", sep_header))
            sep_elements_ir.append(Paragraph("IR Thermography Reports", sep_title))
            sep_elements_ir.append(Paragraph(f"The following {len(ir_reports)} IR Thermography report(s) are attached.", sep_subtitle))
            
            separator_doc_ir.build(sep_elements_ir)
            separator_buffer_ir.seek(0)
            sep_reader_ir = PdfReader(separator_buffer_ir)
            for page in sep_reader_ir.pages:
                writer.add_page(page)
            
            # Generate and attach each IR thermography report PDF
            from routes.ir_thermography_pdf import generate_ir_thermography_pdf_internal
            for report in ir_reports:
                try:
                    report_id = report.get('id', '')
                    if report_id:
                        # Exclude Section F and Back Cover to avoid duplicates in AMC report
                        ir_pdf = await generate_ir_thermography_pdf_internal(report_id, exclude_closing_pages=True)
                        if ir_pdf:
                            ir_pdf.seek(0)
                            ir_reader = PdfReader(ir_pdf)
                            for page in ir_reader.pages:
                                writer.add_page(page)
                except Exception as e:
                    print(f"Error attaching IR report {report.get('id')}: {e}")
            
            annexure_num += 1
        
        # SECOND: Attach Equipment Test Report PDFs (Annexure II if IR exists, else Annexure I)
        if test_reports:
            # Create separator page for test reports
            separator_buffer = BytesIO()
            separator_doc = SimpleDocTemplate(
                separator_buffer,
                pagesize=A4,
                rightMargin=40,
                leftMargin=40,
                topMargin=70,
                bottomMargin=50
            )
            sep_elements = []
            sep_elements.append(Spacer(1, 250))
            sep_elements.append(Paragraph(f"ANNEXURE - {annexure_num}", sep_header))
            sep_elements.append(Paragraph("Equipment Test Reports", sep_title))
            sep_elements.append(Paragraph(f"The following {len(test_reports)} test report(s) are attached.", sep_subtitle))
            
            separator_doc.build(sep_elements)
            separator_buffer.seek(0)
            sep_reader = PdfReader(separator_buffer)
            for page in sep_reader.pages:
                writer.add_page(page)
            
            # Generate and attach each test report PDF
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
            
            annexure_num += 1
        
        # THIRD: Attach Service Report PDFs (Annexure for Service Reports - Electrical, HVAC, etc.)
        if service_reports:
            # Create separator page for service reports
            separator_buffer_sr = BytesIO()
            separator_doc_sr = SimpleDocTemplate(
                separator_buffer_sr,
                pagesize=A4,
                rightMargin=40,
                leftMargin=40,
                topMargin=70,
                bottomMargin=50
            )
            sep_elements_sr = []
            sep_elements_sr.append(Spacer(1, 250))
            sep_elements_sr.append(Paragraph(f"ANNEXURE - {annexure_num}", sep_header))
            sep_elements_sr.append(Paragraph("Service Reports", sep_title))
            sep_elements_sr.append(Paragraph(f"The following {len(service_reports)} service report(s) are attached.", sep_subtitle))
            sep_elements_sr.append(Spacer(1, 20))
            sep_elements_sr.append(Paragraph("(Electrical, HVAC, Fire Protection, and other service categories)", sep_subtitle))
            
            separator_doc_sr.build(sep_elements_sr)
            separator_buffer_sr.seek(0)
            sep_reader_sr = PdfReader(separator_buffer_sr)
            for page in sep_reader_sr.pages:
                writer.add_page(page)
            
            # Generate and attach each service report PDF
            from routes.service_pdf import generate_service_report_pdf_internal
            for report in service_reports:
                try:
                    report_id = report.get('id', '')
                    if report_id:
                        service_pdf = await generate_service_report_pdf_internal(report_id)
                        if service_pdf:
                            service_pdf.seek(0)
                            service_reader = PdfReader(service_pdf)
                            for page in service_reader.pages:
                                writer.add_page(page)
                except Exception as e:
                    print(f"Error attaching service report {report.get('id')}: {e}")
            
            annexure_num += 1
        
        # FOURTH: Add Statutory Documents Section (the listing page) AFTER service reports
        # This section lists all statutory documents before the actual PDFs are attached
        statutory_docs = amc.get('statutory_documents', []) or []
        annexure_docs = amc.get('annexure', []) or []
        all_docs = annexure_docs + statutory_docs
        docs_with_files = [doc for doc in statutory_docs if doc.get('file_url')]
        
        if all_docs or docs_with_files:
            # Create the statutory documents section page
            stat_section_buffer = BytesIO()
            stat_section_doc = SimpleDocTemplate(
                stat_section_buffer,
                pagesize=A4,
                rightMargin=40,
                leftMargin=40,
                topMargin=70,
                bottomMargin=50
            )
            
            stat_section_elements = []
            
            # Section letter depends on whether IR reports exist
            section_letter = 'I' if has_ir_reports else 'H'
            
            # Section Header
            stat_header = Table(
                [[f'SECTION - {section_letter}: STATUTORY DOCUMENTS & ATTACHMENTS']],
                colWidths=[515]
            )
            stat_header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_BLUE),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
            ]))
            stat_section_elements.append(stat_header)
            stat_section_elements.append(Spacer(1, 15))
            
            # Description
            stat_section_elements.append(Paragraph(
                "The following statutory documents, calibration certificates and attachments are linked to this AMC:",
                styles['AMCBodyText']
            ))
            stat_section_elements.append(Spacer(1, 10))
            
            if all_docs:
                # Create table listing the documents
                doc_data = [['S.No', 'DOCUMENT TYPE', 'DOCUMENT NAME', 'REFERENCE NO.']]
                
                doc_type_labels = {
                    'calibration_certificate': 'Calibration Certificate',
                    'test_certificate': 'Test Certificate',
                    'compliance_certificate': 'Compliance Certificate',
                    'safety_certificate': 'Safety Certificate',
                    'warranty_document': 'Warranty Document',
                    'manufacturer_datasheet': 'Manufacturer Datasheet',
                    'installation_certificate': 'Installation Certificate',
                    'other': 'Other Document'
                }
                
                for i, doc in enumerate(all_docs):
                    doc_type = doc.get('type', doc.get('document_type', 'other'))
                    doc_type_label = doc_type_labels.get(doc_type, doc_type.replace('_', ' ').title())
                    
                    doc_data.append([
                        str(i + 1),
                        doc_type_label,
                        doc.get('name', doc.get('document_name', '-')),
                        doc.get('reference', doc.get('reference_no', '-'))
                    ])
                
                doc_table = Table(doc_data, colWidths=[35, 150, 200, 130])
                doc_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                ]))
                stat_section_elements.append(doc_table)
            else:
                stat_section_elements.append(Paragraph("No statutory documents attached.", styles['AMCBodyText']))
            
            stat_section_elements.append(Spacer(1, 15))
            
            if docs_with_files:
                stat_section_elements.append(Paragraph(
                    f"<i>Note: {len(docs_with_files)} document(s) with uploaded files are attached in the following pages.</i>",
                    ParagraphStyle('Note', fontSize=9, textColor=colors.gray, fontName='Helvetica-Oblique')
                ))
            
            stat_section_doc.build(stat_section_elements)
            stat_section_buffer.seek(0)
            stat_section_reader = PdfReader(stat_section_buffer)
            for page in stat_section_reader.pages:
                writer.add_page(page)
        
        # FOURTH: Attach actual Statutory Document PDFs (uploaded PDFs)
        if docs_with_files:
            # Create separator page for statutory documents annexure
            separator_buffer_stat = BytesIO()
            separator_doc_stat = SimpleDocTemplate(
                separator_buffer_stat,
                pagesize=A4,
                rightMargin=40,
                leftMargin=40,
                topMargin=70,
                bottomMargin=50
            )
            sep_elements_stat = []
            sep_elements_stat.append(Spacer(1, 250))
            sep_elements_stat.append(Paragraph(f"ANNEXURE - {annexure_num}", sep_header))
            sep_elements_stat.append(Paragraph("Statutory Documents & Certificates", sep_title))
            sep_elements_stat.append(Paragraph(f"The following {len(docs_with_files)} statutory document(s) are attached.", sep_subtitle))
            
            separator_doc_stat.build(sep_elements_stat)
            separator_buffer_stat.seek(0)
            sep_reader_stat = PdfReader(separator_buffer_stat)
            for page in sep_reader_stat.pages:
                writer.add_page(page)
            
            # Attach each uploaded statutory document PDF
            UPLOADS_DIR = "/app/uploads"
            for doc in docs_with_files:
                try:
                    file_url = doc.get('file_url', '')
                    if file_url:
                        # Extract file path from URL (e.g., /api/uploads/statutory_document/filename.pdf)
                        # Handle both formats: /api/uploads/category/file or /uploads/file
                        if file_url.startswith('/api/uploads/'):
                            file_path = os.path.join(UPLOADS_DIR, file_url.replace('/api/uploads/', ''))
                        elif file_url.startswith('/uploads/'):
                            file_path = os.path.join(UPLOADS_DIR, file_url.replace('/uploads/', ''))
                        else:
                            file_path = os.path.join(UPLOADS_DIR, file_url)
                        
                        if os.path.exists(file_path) and file_path.lower().endswith('.pdf'):
                            stat_pdf = PdfReader(file_path)
                            for page in stat_pdf.pages:
                                writer.add_page(page)
                            print(f"Attached statutory document: {doc.get('document_name', file_url)}")
                        else:
                            print(f"Statutory document not found or not PDF: {file_path}")
                except Exception as e:
                    print(f"Error attaching statutory document {doc.get('document_name', '')}: {e}")
        
        # LAST: Add Back Cover page (NO header/footer - like thermography report)
        back_cover_buffer = BytesIO()
        back_cover_doc = SimpleDocTemplate(
            back_cover_buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=50,
            bottomMargin=50
        )
        back_cover_elements = create_back_cover(styles)
        back_cover_doc.build(back_cover_elements)
        back_cover_buffer.seek(0)
        back_cover_reader = PdfReader(back_cover_buffer)
        for page in back_cover_reader.pages:
            writer.add_page(page)
        
        # Write combined PDF
        output_buffer = BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        return output_buffer
    except Exception as e:
        print(f"Error combining PDFs: {e}")
        buffer.seek(0)
        return buffer


@router.get("/{amc_id}/pdf")
async def download_amc_report(amc_id: str):
    """Download AMC report as PDF"""
    try:
        pdf_buffer = await generate_amc_report_pdf(amc_id)
        
        db = get_db()
        amc = await db.amcs.find_one({"id": amc_id}, {"_id": 0, "amc_no": 1})
        filename = f"AMC_Report_{amc.get('amc_no', amc_id).replace('/', '_')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
