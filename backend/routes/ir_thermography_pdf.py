"""
IR Thermography Report PDF Generation
Generates comprehensive thermography inspection reports with professional cover page design
Includes company logo in header, proper footer with www.enerzia.com on all pages
Contains: Cover Page, Document Details, Table of Contents, Executive Summary,
Fundamentals & Methodology, Risk Categorization Procedure, Inspection Summary, and Thermal Images
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.piecharts import Pie
from reportlab.pdfgen import canvas
from io import BytesIO
import base64
import os
import requests
from datetime import datetime

# Import date formatter from pdf_base
from routes.pdf_base import format_date_ddmmyyyy

# Import template settings functions for cover page designs
from routes.pdf_template_settings import (
    get_pdf_settings_sync, 
    get_logo_path as get_template_logo_path,
    get_primary_color,
    get_report_design,
    draw_decorative_design,
    get_company_info
)

router = APIRouter()

# Company Information Constants
COMPANY_NAME = "Enerzia Power Solutions"
COMPANY_ADDRESS = "No.9, Akshaya, Sundaresan Nagar, ELumalai Chettiar Road, Maduravoyal, Chennai, Tamil Nadu, Pincode- 600095"
COMPANY_WEBSITE = "www.enerzia.com"
COMPANY_CERTIFICATIONS = "(An ISO 9001:2015, ISO 45001:2018 certified company)"


def get_db():
    from server import db
    return db


def get_styles():
    """Get custom styles for the PDF"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='IRCoverTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#1e3a5f'),
        alignment=TA_CENTER,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='IRSectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e3a5f'),
        spaceBefore=15,
        spaceAfter=10,
        borderColor=colors.HexColor('#1e3a5f'),
        borderWidth=1,
        borderPadding=5
    ))
    
    styles.add(ParagraphStyle(
        name='IRSubHeader',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=colors.HexColor('#1e3a5f'),
        spaceBefore=10,
        spaceAfter=5,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='IRBodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceBefore=6,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='IRBulletText',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        alignment=TA_LEFT,
        leftIndent=20,
        bulletIndent=10
    ))
    
    styles.add(ParagraphStyle(
        name='IRTableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='IRTableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='IRSmallText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=TA_JUSTIFY
    ))
    
    return styles


def get_logo_path():
    """Get the path to the company logo"""
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_path = os.path.join(base_path, 'assets')
    
    # Try JPG first, then PNG
    jpg_path = os.path.join(assets_path, 'enerzia_logo.jpg')
    png_path = os.path.join(assets_path, 'enerzia_logo.png')
    
    if os.path.exists(jpg_path):
        return jpg_path
    elif os.path.exists(png_path):
        return png_path
    
    # Fallback to uploads folder
    uploads_path = '/app/backend/uploads/company_logo.png'
    if os.path.exists(uploads_path):
        return uploads_path
    
    return None


class IRThermographyCanvas(canvas.Canvas):
    """Custom canvas with logo header and footer on all pages except cover"""
    
    def __init__(self, *args, report_data=None, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []
        self.report_data = report_data or {}
        
    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()
        
    def save(self):
        """Add header/footer to each page"""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
        
    def draw_header_footer(self, page_count):
        """Draw header with logo and footer on all pages except page 1 (cover)"""
        page_width, page_height = A4
        margin = 30
        
        # Skip header on first page (cover page)
        if self._pageNumber > 1:
            # ============ HEADER ============
            header_y = page_height - 25
            
            # Draw logo on right side
            logo_path = get_logo_path()
            if logo_path and os.path.exists(logo_path):
                try:
                    self.drawImage(logo_path, page_width - margin - 100, header_y - 25, 
                                  width=100, height=35, preserveAspectRatio=True, mask='auto')
                except Exception as e:
                    print(f"Error drawing logo: {e}")
            
            # Report title on left
            self.setFont('Helvetica-Bold', 10)
            self.setFillColor(colors.HexColor('#1e3a5f'))
            report_type = self.report_data.get('report_type', 'pre-thermography')
            title = "PRE-THERMOGRAPHY REPORT" if report_type == 'pre-thermography' else "POST-THERMOGRAPHY REPORT"
            self.drawString(margin, header_y - 10, title)
            
            # Report number below title
            self.setFont('Helvetica', 9)
            self.setFillColor(colors.HexColor('#666666'))
            report_no = self.report_data.get('report_no', '')
            self.drawString(margin, header_y - 22, f"Report No: {report_no}")
            
            # Header line
            self.setStrokeColor(colors.HexColor('#F7931E'))
            self.setLineWidth(2)
            self.line(margin, header_y - 30, page_width - margin, header_y - 30)
        
        # ============ FOOTER (on ALL pages including cover) ============
        footer_y = 25
        
        # Footer line
        self.setStrokeColor(colors.HexColor('#F7931E'))
        self.setLineWidth(2)
        self.line(margin, footer_y + 15, page_width - margin, footer_y + 15)
        
        # Company name on left
        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#333333'))
        self.drawString(margin, footer_y + 5, COMPANY_NAME)
        
        # Website centered
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#F7931E'))
        self.drawCentredString(page_width / 2, footer_y + 5, COMPANY_WEBSITE)
        
        # Page number on right (except cover)
        if self._pageNumber > 1:
            self.setFont('Helvetica', 7)
            self.setFillColor(colors.HexColor('#666666'))
            self.drawRightString(page_width - margin, footer_y + 5, f"Page {self._pageNumber - 1} of {page_count - 1}")


def create_risk_pie_chart(risk_distribution: dict, width=400, height=180):
    """Create a pie chart showing risk distribution - centered and properly sized"""
    drawing = Drawing(width, height)
    
    # Normalize the risk distribution keys
    data = []
    labels = []
    chart_colors = []
    
    risk_colors_map = {
        'Critical': colors.HexColor('#dc2626'),
        'Warning': colors.HexColor('#f59e0b'),
        'Check & Monitor': colors.HexColor('#3b82f6'),
        'Normal': colors.HexColor('#22c55e')
    }
    
    # Map old keys to new display names
    key_mapping = {
        'critical': 'Critical',
        'warning': 'Warning', 
        'check_monitor': 'Check & Monitor',
        'normal': 'Normal'
    }
    
    for old_key, display_name in key_mapping.items():
        count = risk_distribution.get(old_key, 0)
        if count > 0:
            data.append(count)
            labels.append(f"{display_name}: {count}")
            chart_colors.append(risk_colors_map.get(display_name, colors.gray))
    
    if not data:
        # Show "All Normal" if no data
        data = [1]
        labels = ['Normal: 0']
        chart_colors = [colors.HexColor('#22c55e')]
    
    pie = Pie()
    pie.x = (width - 120) / 2  # Center the pie horizontally
    pie.y = 30
    pie.width = 120
    pie.height = 120
    pie.data = data
    pie.labels = labels
    pie.slices.strokeWidth = 1
    pie.slices.strokeColor = colors.white
    
    for i, color in enumerate(chart_colors):
        pie.slices[i].fillColor = color
        pie.slices[i].popout = 5
    
    pie.sideLabels = True
    pie.simpleLabels = False
    pie.slices.fontName = 'Helvetica-Bold'
    pie.slices.fontSize = 9
    pie.sideLabelsOffset = 0.2
    
    drawing.add(pie)
    return drawing


def draw_cover_page(canvas_obj, doc, report, org_settings):
    """Draw a professional cover page with company logo and images - uses PDF Template Settings"""
    c = canvas_obj
    width, height = A4
    
    # Get PDF template settings for design
    pdf_settings = get_pdf_settings_sync()
    report_design = get_report_design('ir_thermography', pdf_settings)
    design_id = report_design.get('design_id', 'design_1')
    design_color = report_design.get('design_color', '#F7931E')
    
    # Define colors using template settings
    primary_color = colors.HexColor(design_color)
    dark_blue = colors.HexColor('#1e3a5f')
    text_dark = colors.HexColor('#1a1a1a')
    
    # =====================================================
    # BACKGROUND - White
    # =====================================================
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # =====================================================
    # DECORATIVE DESIGN - Use template settings
    # =====================================================
    draw_decorative_design(c, width, height, design_id, design_color)
    
    # =====================================================
    # COMPANY LOGO - Top Left
    # =====================================================
    c.saveState()
    
    logo_path = get_template_logo_path(pdf_settings) or get_logo_path()
    if logo_path and os.path.exists(logo_path):
        try:
            c.drawImage(logo_path, 35, height - 90, width=180, height=60, 
                       preserveAspectRatio=True, mask='auto')
        except Exception as e:
            print(f"Error drawing cover logo: {e}")
            c.setFillColor(primary_color)
            c.setFont('Helvetica-Bold', 26)
            c.drawString(45, height - 55, 'enerzia')
    
    c.restoreState()
    
    # =====================================================
    # MAIN TITLE SECTION - Shifted above center
    # =====================================================
    c.saveState()
    
    # Center the title on the page - positioned above center
    c.setFillColor(dark_blue)
    c.setFont('Helvetica-Bold', 42)
    title_text = 'Thermography'
    title_width = c.stringWidth(title_text, 'Helvetica-Bold', 42)
    c.drawString((width - title_width) / 2, height * 0.65, title_text)
    
    c.setFont('Helvetica-Bold', 42)
    title_text2 = 'Report'
    title_width2 = c.stringWidth(title_text2, 'Helvetica-Bold', 42)
    c.drawString((width - title_width2) / 2, height * 0.58, title_text2)
    
    # Subtitle with orange accent line - centered
    report_type = report.get('report_type', 'pre-thermography')
    if report_type == 'pre-thermography':
        subtitle = 'Pre-Infrared Thermal Analysis & Recommendation Report'
    else:
        subtitle = 'Post-Infrared Thermal Analysis & Recommendation Report'
    
    subtitle_width = c.stringWidth(subtitle, 'Helvetica', 12)
    
    # Accent line above subtitle - centered (uses template color)
    c.setStrokeColor(primary_color)
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
    
    doc_details = report.get('document_details', {})
    client = doc_details.get('client', 'Client Name')
    location = doc_details.get('location', 'Location')
    report_no = report.get('report_no', '')
    date_of_study = format_date_ddmmyyyy(doc_details.get('date_of_ir_study', ''))
    
    # Info box - Centered below title, NO vertical line
    box_width = 340
    box_height = 110
    box_x = (width - box_width) / 2  # Center horizontally
    box_y = height * 0.36  # Moved up closer to title (was 0.28)
    
    # Light background box (no left border accent)
    c.setFillColor(colors.Color(30/255, 58/255, 95/255, 0.04))
    c.roundRect(box_x, box_y, box_width, box_height, 8, fill=1, stroke=0)
    
    # Define consistent margins for alignment
    label_x = box_x + 15          # All labels start here
    value_x = box_x + 95          # All values start here (aligned)
    max_value_width = box_width - 110  # Max width for values
    
    # Client info text - with text wrapping for long names
    c.setFillColor(text_dark)
    y_offset = box_y + box_height - 20
    
    # CLIENT
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'CLIENT:')
    c.setFont('Helvetica', 9)
    
    # Wrap client name if too long
    if c.stringWidth(client, 'Helvetica', 9) > max_value_width:
        words = client.split()
        line1 = ""
        line2 = ""
        for word in words:
            test_line = line1 + " " + word if line1 else word
            if c.stringWidth(test_line, 'Helvetica', 9) <= max_value_width:
                line1 = test_line
            else:
                line2 += " " + word if line2 else word
        c.drawString(value_x, y_offset, line1.strip())
        if line2:
            y_offset -= 12
            c.drawString(value_x, y_offset, line2.strip())
    else:
        c.drawString(value_x, y_offset, client)
    
    y_offset -= 18
    
    # LOCATION
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'LOCATION:')
    c.setFont('Helvetica', 8)
    
    if c.stringWidth(location, 'Helvetica', 8) > max_value_width:
        words = location.split()
        lines = []
        current_line = ""
        for word in words:
            test_line = current_line + " " + word if current_line else word
            if c.stringWidth(test_line, 'Helvetica', 8) <= max_value_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        
        for i, line in enumerate(lines[:3]):  # Max 3 lines
            c.drawString(value_x, y_offset - (i * 11), line.strip())
        y_offset -= (len(lines[:3]) - 1) * 11
    else:
        c.drawString(value_x, y_offset, location)
    
    y_offset -= 18
    
    # REPORT NO
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'REPORT NO:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, report_no)
    
    y_offset -= 16
    
    # DATE
    c.setFont('Helvetica-Bold', 9)
    c.drawString(label_x, y_offset, 'DATE:')
    c.setFont('Helvetica', 9)
    c.drawString(value_x, y_offset, date_of_study)
    
    c.restoreState()
    
    # =====================================================
    # SUBMITTED BY SECTION - Right Hand Side (Bottom Right)
    # =====================================================
    c.saveState()
    
    # Position on right side
    submit_x = width - 250
    submit_y = 130
    
    c.setFillColor(dark_blue)
    c.setFont('Helvetica', 9)
    c.drawString(submit_x, submit_y, 'Submitted By')
    
    # Company Name
    c.setFont('Helvetica-Bold', 13)
    c.drawString(submit_x, submit_y - 18, COMPANY_NAME)
    
    # Company Address
    c.setFillColor(colors.HexColor('#555555'))
    c.setFont('Helvetica', 7)
    
    # Split address into lines
    address_line1 = "No.9, Akshaya, Sundaresan Nagar,"
    address_line2 = "ELumalai Chettiar Road, Maduravoyal,"
    address_line3 = "Chennai, Tamil Nadu, Pincode- 600095"
    c.drawString(submit_x, submit_y - 32, address_line1)
    c.drawString(submit_x, submit_y - 42, address_line2)
    c.drawString(submit_x, submit_y - 52, address_line3)
    
    # ISO Certifications
    c.setFillColor(colors.HexColor('#666666'))
    c.setFont('Helvetica-Oblique', 6)
    c.drawString(submit_x, submit_y - 66, COMPANY_CERTIFICATIONS)
    
    c.restoreState()


def create_cover_page(report, org_settings, styles):
    """Create the cover page - returns spacer, actual drawing done in onFirstPage"""
    elements = []
    elements.append(Spacer(1, 700))
    elements.append(PageBreak())
    return elements


def create_document_details_section(report, styles):
    """Create document identification and details section with W.O. Date"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['DOCUMENT IDENTIFICATION & DETAILS']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    doc_details = report.get('document_details', {})
    
    # Use Paragraph for word wrapping
    cell_style = ParagraphStyle(
        'TableCell',
        fontSize=8,
        leading=10,
        wordWrap='CJK'
    )
    label_style = ParagraphStyle(
        'TableLabel',
        fontSize=8,
        leading=10,
        fontName='Helvetica-Bold'
    )
    
    def wrap_text(text, style=cell_style):
        """Wrap text in Paragraph for proper cell wrapping"""
        return Paragraph(str(text) if text else '', style)
    
    def wrap_label(text):
        """Wrap label text"""
        return Paragraph(str(text), label_style)
    
    # Document details table with wrapped text - ADDED W.O. DATE
    details_data = [
        [wrap_label('REPORT NO:'), wrap_text(report.get('report_no', '')), wrap_label('REVISION NO:'), wrap_text(doc_details.get('revision_no', '0'))],
        [wrap_label('CLIENT:'), wrap_text(doc_details.get('client', '')), wrap_label('WORK ORDER NUMBER:'), wrap_text(doc_details.get('work_order_number', ''))],
        [wrap_label('LOCATION:'), wrap_text(doc_details.get('location', '')), wrap_label('WORK ORDER DATE:'), wrap_text(format_date_ddmmyyyy(doc_details.get('work_order_date', '')))],
        [wrap_label('WORK DONE:'), wrap_text(report.get('report_type', 'Pre-Thermography').replace('-', ' ').title()), wrap_label('DATE OF IR STUDY:'), wrap_text(format_date_ddmmyyyy(doc_details.get('date_of_ir_study', '')))],
        [wrap_label('THERMOGRAPHY INSPECTION BY:'), wrap_text(doc_details.get('thermography_inspection_by', '')), wrap_label('LOAD CONDITION:'), wrap_text(doc_details.get('load_condition', ''))],
        [wrap_label('REPORT PREPARED BY:'), wrap_text(doc_details.get('report_prepared_by', '')), wrap_label('REPORT REVIEWED BY:'), wrap_text(doc_details.get('report_reviewed_by', ''))],
        [wrap_label('COORDINATING PERSON:'), wrap_text(doc_details.get('coordinating_person', '')), wrap_label('DATE OF SUBMISSION:'), wrap_text(format_date_ddmmyyyy(doc_details.get('date_of_submission', '')))],
        [wrap_label('COMMENTS:'), wrap_text(doc_details.get('comments', '')), '', ''],
    ]
    
    details_table = Table(details_data, colWidths=[120, 140, 120, 135])
    details_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
        ('BACKGROUND', (2, 0), (2, -2), colors.HexColor('#f5f5f5')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('SPAN', (1, 7), (3, 7)),  # Comments span
    ]))
    elements.append(details_table)
    elements.append(PageBreak())
    
    return elements


def create_table_of_contents(report, styles):
    """Create Table of Contents / Page Contents section"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['CONTENTS']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Calculate Section E and F page numbers based on inspection items
    inspection_items = report.get('inspection_items', [])
    num_items = len(inspection_items)
    
    # Section E starts at page 9, each inspection item is 1 page
    section_e_start = 9
    # Section F starts after all inspection items
    section_f_start = section_e_start + num_items if num_items > 0 else section_e_start
    
    # TOC entries with dynamic page numbers
    toc_data = [
        ['S.No', 'SECTION', 'DESCRIPTION', 'PAGE NO.'],
        ['1', 'A', 'Executive Summary', '4'],
        ['2', 'B', 'Thermography Inspection Summary', '5'],
        ['3', 'C', 'Thermal Imaging Survey – Fundamentals & Methodology', '6'],
        ['4', 'D', 'Thermal Images – Risk Categorization Procedure', '8'],
        ['5', 'E', 'Thermal Images & Interpretations', str(section_e_start)],
        ['6', 'F', 'Statutory Documents & Attachments', str(section_f_start)],
    ]
    
    toc_table = Table(toc_data, colWidths=[50, 60, 320, 85])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
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


def create_executive_summary(report, styles):
    """Create executive summary section with pie chart below the risk level summary"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - A: EXECUTIVE SUMMARY']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # Get data
    doc_details = report.get('document_details', {})
    client = doc_details.get('client', 'the client')
    location = doc_details.get('location', 'their facility')
    date_of_study = format_date_ddmmyyyy(doc_details.get('date_of_ir_study', ''))
    summary = report.get('summary', {})
    
    # Handle different summary structures
    risk_dist = summary.get('risk_distribution', {})
    total_feeders = summary.get('total_feeders', summary.get('total_items', len(report.get('inspection_items', []))))
    total_images = summary.get('total_images', total_feeders)
    
    # Get risk counts - check both flat and nested structures
    critical_count = risk_dist.get('critical', summary.get('critical', 0))
    warning_count = risk_dist.get('warning', summary.get('warning', 0))
    check_monitor_count = risk_dist.get('check_monitor', summary.get('check_monitor', 0))
    normal_count = risk_dist.get('normal', summary.get('normal', 0))
    
    # Introduction paragraph
    intro_text = f"""<b>{client}</b> approached <b>Enerzia Power Solutions</b> to conduct a Thermography Inspection 
    at their facility located at <b>{location}</b>. The Infrared Thermal Imaging Survey was conducted on <b>{date_of_study}</b>. 
    The salient findings requiring management attention are presented in this report. The detected hotspots have been 
    highlighted after discussions with the technical staff at the site."""
    
    elements.append(Paragraph(intro_text, styles['IRBodyText']))
    elements.append(Spacer(1, 15))
    
    # Key data
    elements.append(Paragraph("<b>Survey Overview:</b>", styles['IRSubHeader']))
    
    key_data = [
        ['TOTAL FEEDERS/POINTS SCANNED', str(total_feeders)],
        ['TOTAL THERMAL IMAGES CAPTURED', str(total_images)],
    ]
    
    key_table = Table(key_data, colWidths=[280, 100])
    key_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
    ]))
    elements.append(key_table)
    elements.append(Spacer(1, 20))
    
    # Risk Level Summary Header
    elements.append(Paragraph("<b>Risk Level Summary:</b>", styles['IRSubHeader']))
    elements.append(Spacer(1, 10))
    
    # Risk Level Summary Table - Full width, centered
    stats_data = [
        ['RISK LEVEL', 'COUNT', 'DESCRIPTION'],
        ['CRITICAL', str(critical_count), 'Major discrepancy; immediate repair required'],
        ['WARNING', str(warning_count), 'Probable deficiency; repair as time permits'],
        ['CHECK & MONITOR', str(check_monitor_count), 'Possible deficiency; warrants investigation'],
        ['NORMAL', str(normal_count), 'No action required'],
    ]
    
    risk_colors = {
        'CRITICAL': colors.HexColor('#dc2626'),
        'WARNING': colors.HexColor('#f59e0b'),
        'CHECK & MONITOR': colors.HexColor('#3b82f6'),
        'NORMAL': colors.HexColor('#22c55e'),
    }
    
    stats_table = Table(stats_data, colWidths=[130, 60, 325])
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]
    
    for i, (label, _, _) in enumerate(stats_data[1:], 1):
        color = risk_colors.get(label, colors.black)
        style_cmds.append(('BACKGROUND', (0, i), (0, i), color))
        style_cmds.append(('TEXTCOLOR', (0, i), (0, i), colors.white))
    
    stats_table.setStyle(TableStyle(style_cmds))
    elements.append(stats_table)
    elements.append(Spacer(1, 20))
    
    # Pie Chart - Centered below the table
    elements.append(Paragraph("<b>Risk Distribution Chart:</b>", styles['IRSubHeader']))
    elements.append(Spacer(1, 10))
    
    # Create pie chart with better sizing - use the extracted counts
    risk_distribution = {
        'critical': critical_count,
        'warning': warning_count,
        'check_monitor': check_monitor_count,
        'normal': normal_count
    }
    pie_chart = create_risk_pie_chart(risk_distribution, width=400, height=180)
    
    # Center the pie chart
    chart_table = Table([[pie_chart]], colWidths=[515])
    chart_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(chart_table)
    
    elements.append(PageBreak())
    
    return elements


def create_inspection_summary_table(report, styles):
    """Create summary table of all inspection items - SECTION B"""
    elements = []
    
    report_type = report.get('report_type', 'pre-thermography')
    title = "SECTION - B: PRE-THERMOGRAPHY INSPECTION SUMMARY" if report_type == 'pre-thermography' else "SECTION - B: POST-THERMOGRAPHY INSPECTION SUMMARY"
    
    header_table = Table(
        [[title]],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # Cell style for wrapping
    cell_style = ParagraphStyle('SummaryCell', fontSize=8, leading=10, alignment=TA_CENTER)
    
    def wrap(text):
        return Paragraph(str(text) if text else '', cell_style)
    
    # Table headers
    summary_header = ['S.No', 'PANEL', 'FEEDER/LOCATION', 'MAX TEMP (°C)', 'MIN TEMP (°C)', 'DELTA-T (°C)', 'RISK CATEGORY']
    summary_data = [summary_header]
    
    inspection_items = report.get('inspection_items', [])
    # Reverse the items so oldest (Item #1) comes first in PDF
    inspection_items_for_pdf = list(reversed(inspection_items))
    
    for i, item in enumerate(inspection_items_for_pdf, 1):
        max_temp = item.get('max_temperature', '') or item.get('max_temp', '')
        min_temp = item.get('min_temperature', '') or item.get('min_temp', '')
        delta_t = ''
        if max_temp and min_temp:
            try:
                delta_t = float(max_temp) - float(min_temp)
                delta_t = f"{delta_t:.1f}"
            except (ValueError, TypeError):
                pass
        
        row = [
            str(i),
            wrap(item.get('panel', '')),
            wrap(item.get('feeder', '') or item.get('location', '')),
            str(max_temp) if max_temp else '',
            str(min_temp) if min_temp else '',
            delta_t,
            wrap(item.get('risk_category', ''))
        ]
        summary_data.append(row)
    
    summary_table = Table(summary_data, colWidths=[30, 95, 95, 65, 65, 65, 100])
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]
    
    risk_colors = {
        'Critical': colors.HexColor('#dc2626'),
        'Warning': colors.HexColor('#f59e0b'),
        'Check & Monitor': colors.HexColor('#3b82f6'),
        'Normal': colors.HexColor('#22c55e'),
    }
    
    for i, item in enumerate(inspection_items_for_pdf, 1):
        risk = item.get('risk_category', '')
        if risk in risk_colors:
            style_cmds.append(('BACKGROUND', (6, i), (6, i), risk_colors[risk]))
            style_cmds.append(('TEXTCOLOR', (6, i), (6, i), colors.white))
    
    summary_table.setStyle(TableStyle(style_cmds))
    elements.append(summary_table)
    elements.append(PageBreak())
    
    return elements


def create_fundamentals_methodology_section(report, styles):
    """Create SECTION C: THERMAL IMAGING SURVEY – FUNDAMENTALS & METHODOLOGY"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - C: THERMAL IMAGING SURVEY – FUNDAMENTALS & METHODOLOGY']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # C.1 General
    elements.append(Paragraph("<b>C.1 General</b>", styles['IRSubHeader']))
    
    doc_details = report.get('document_details', {})
    date_of_study = format_date_ddmmyyyy(doc_details.get('date_of_ir_study', ''))
    
    general_text = f"""A preparatory meeting was organized to explain the methodology and to establish the list of equipment 
    to be surveyed. The Infrared Thermal Imaging Survey was conducted on {date_of_study}. During the survey, 
    infrared thermal images were captured using state-of-the-art thermal imaging equipment to identify potential 
    hotspots and anomalies in the electrical systems."""
    elements.append(Paragraph(general_text, styles['IRBodyText']))
    elements.append(Spacer(1, 10))
    
    # C.2 T-Survey Approach & Methodology
    elements.append(Paragraph("<b>C.2 T-Survey Approach & Methodology</b>", styles['IRSubHeader']))
    
    approach_text = """Infrared T-Surveys involve capturing heat images using thermal cameras to identify hotspots 
    for timely remedial action to prevent breakdowns. The initial discussion involved collecting information on:"""
    elements.append(Paragraph(approach_text, styles['IRBodyText']))
    
    bullet_items = [
        "Critical Electrical equipment",
        "Critical Panels (feeding essential services)",
        "Heavy rated equipment (whose failure could cause production disruption)",
        "Equipment with history of failures or maintenance issues"
    ]
    
    for item in bullet_items:
        elements.append(Paragraph(f"• {item}", styles['IRBulletText']))
    elements.append(Spacer(1, 10))
    
    # C.3 Infrared Thermal Imaging - Principle
    elements.append(Paragraph("<b>C.3 Infrared Thermal Imaging - Principle</b>", styles['IRSubHeader']))
    
    principle_text = """All objects above absolute zero (0 Kelvin or -273°C) emit infrared radiation. This radiation 
    is measured in the infrared spectral band. Thermography is the technique of measuring this radiant energy 
    and converting it into visible images. Thermal imaging cameras typically respond to wavelengths of 3-5 micrometers 
    or 8-12 micrometers, allowing for accurate temperature measurements of electrical components and connections."""
    elements.append(Paragraph(principle_text, styles['IRBodyText']))
    elements.append(Spacer(1, 10))
    
    # C.4 Why Thermal Imaging?
    elements.append(Paragraph("<b>C.4 Why Thermal Imaging?</b>", styles['IRSubHeader']))
    
    why_text = """Thermal imaging captures heat images to display temperature distribution across surfaces and 
    components. This technology has been widely adopted for predictive maintenance by power utilities and 
    industrial facilities worldwide. Electrical failures are often preceded by a rise in temperature, and 
    understanding this principle allows for effective detection and correction before catastrophic failures occur. 
    Key benefits include:"""
    elements.append(Paragraph(why_text, styles['IRBodyText']))
    
    benefits = [
        "Early detection of potential failures before they occur",
        "Prevention of costly unplanned downtime",
        "Reduced risk of fire and safety hazards",
        "Extended equipment lifespan through proactive maintenance",
        "Non-contact, non-invasive testing method",
        "Ability to inspect equipment while in operation"
    ]
    
    for benefit in benefits:
        elements.append(Paragraph(f"• {benefit}", styles['IRBulletText']))
    elements.append(Spacer(1, 10))
    
    # C.5 Objective of T-Survey
    elements.append(Paragraph("<b>C.5 Objective of T-Survey</b>", styles['IRSubHeader']))
    
    objectives_text = """The primary objectives of this Thermal Imaging Survey are:"""
    elements.append(Paragraph(objectives_text, styles['IRBodyText']))
    
    objectives = [
        "To identify equipment or connections requiring thermal survey attention",
        "To perform infrared thermal imaging of operational equipment (electrical, mechanical) to identify hotspots",
        "To categorize identified anomalies based on severity for prioritized corrective action",
        "To provide recommendations for remedial measures to prevent failures"
    ]
    
    for obj in objectives:
        elements.append(Paragraph(f"• {obj}", styles['IRBulletText']))
    elements.append(Spacer(1, 10))
    
    # Disclaimer
    elements.append(Paragraph("<b>Disclaimer:</b>", styles['IRSubHeader']))
    disclaimer_text = """The recommendations in this report are based on industry best practices, national and 
    international standards (including NFPA 70B and NETA specifications), and engineering judgment. Enerzia Power 
    Solutions is not responsible for the outcomes of implementing these recommendations. The client is advised to 
    consult with qualified electrical professionals before undertaking any corrective actions."""
    elements.append(Paragraph(disclaimer_text, styles['IRSmallText']))
    elements.append(Spacer(1, 10))
    
    # C.6 Acknowledgment
    elements.append(Paragraph("<b>C.6 Acknowledgment</b>", styles['IRSubHeader']))
    client = doc_details.get('client', 'the client')
    ack_text = f"""We express our sincere thanks to <b>{client}</b> and their technical team for their 
    cooperation and support during the conduct of this Thermal Imaging Survey."""
    elements.append(Paragraph(ack_text, styles['IRBodyText']))
    
    elements.append(PageBreak())
    
    return elements


def create_risk_categorization_section(styles):
    """Create SECTION D: THERMAL IMAGES – RISK CATEGORIZATION PROCEDURE"""
    elements = []
    
    # Section Header
    header_table = Table(
        [['SECTION - D: THERMAL IMAGES – RISK CATEGORIZATION PROCEDURE']],
        colWidths=[515]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # D.1 Why Categorize Thermal Images?
    elements.append(Paragraph("<b>D.1 Why Categorize Thermal Images?</b>", styles['IRSubHeader']))
    
    why_text = """Categorization of thermal images helps prioritize corrective actions based on the severity of 
    the problem identified. This systematic approach ensures that the most critical issues receive immediate 
    attention while less severe anomalies are scheduled for routine maintenance. The following factors are 
    used to determine risk levels:"""
    elements.append(Paragraph(why_text, styles['IRBodyText']))
    
    factors = [
        "Relative temperature difference (Delta T) between hot spot and reference",
        "Industrial experience and thermal imaging analytical expertise",
        "Equipment age and condition",
        "Environmental conditions during survey",
        "Load level at time of inspection",
        "Criticality of equipment (safety, reliability, production impact)",
        "Past equipment reliability data and maintenance history"
    ]
    
    for factor in factors:
        elements.append(Paragraph(f"• {factor}", styles['IRBulletText']))
    elements.append(Spacer(1, 15))
    
    # D.2 Risk Levels
    elements.append(Paragraph("<b>D.2 RISK LEVELS</b>", styles['IRSubHeader']))
    
    risk_intro = """Based on the Delta-T (temperature difference) measurements and the factors mentioned above, 
    identified anomalies are classified into the following risk categories:"""
    elements.append(Paragraph(risk_intro, styles['IRBodyText']))
    elements.append(Spacer(1, 10))
    
    # Risk Level Table - Use Paragraph for text wrapping
    from reportlab.platypus import Paragraph as P
    
    # Create wrapped text for table cells
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=0,  # Left align
    )
    
    center_cell_style = ParagraphStyle(
        'CenterCellStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=1,  # Center align
    )
    
    risk_data = [
        ['RISK LEVEL', 'DELTA-T (ΔT)', 'INTERPRETATION', 'PRIORITY ACTION'],
        [
            P('<b>CRITICAL</b>', center_cell_style),
            P('ΔT ≥ 15°C', center_cell_style),
            P('Major discrepancy; potential for fire, explosion or major failure', cell_style),
            P('Immediate repair required', cell_style)
        ],
        [
            P('<b>WARNING</b>', center_cell_style),
            P('ΔT ≥ 4°C and < 15°C', center_cell_style),
            P('Indicates probable deficiency; significant repair cost if ignored', cell_style),
            P('Repair at next available opportunity', cell_style)
        ],
        [
            P('<b>CHECK & MONITOR</b>', center_cell_style),
            P('ΔT > 1°C and < 4°C', center_cell_style),
            P('Possible deficiency; minor disruption potential', cell_style),
            P('Warrants investigation', cell_style)
        ],
        [
            P('<b>NORMAL</b>', center_cell_style),
            P('ΔT ≤ 1°C', center_cell_style),
            P('No deficiency detected; normal operating temperature', cell_style),
            P('No action required', cell_style)
        ],
    ]
    
    risk_table = Table(risk_data, colWidths=[85, 90, 190, 150])
    
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 1), (0, 1), colors.white),
        ('BACKGROUND', (0, 2), (0, 2), colors.HexColor('#f59e0b')),
        ('TEXTCOLOR', (0, 2), (0, 2), colors.white),
        ('BACKGROUND', (0, 3), (0, 3), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 3), (0, 3), colors.white),
        ('BACKGROUND', (0, 4), (0, 4), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0, 4), (0, 4), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 1), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]
    
    risk_table.setStyle(TableStyle(style_cmds))
    elements.append(risk_table)
    elements.append(Spacer(1, 15))
    
    # D.3 Notes
    elements.append(Paragraph("<b>D.3 NOTES</b>", styles['IRSubHeader']))
    
    note1 = """<b>Note 1:</b> "Critical equipment" refers to equipment whose failure can result in hazardous 
    conditions including over-pressure, explosions, toxic releases, fires, or significant production disruption."""
    elements.append(Paragraph(note1, styles['IRSmallText']))
    elements.append(Spacer(1, 5))
    
    note2 = """<b>Note 2:</b> Delta-T temperatures and corrective action recommendations are based on NFPA 70(B), 
    Section 21.17.5.6, and the International Electrical Testing Association (NETA) standards for infrared 
    inspection of electrical systems."""
    elements.append(Paragraph(note2, styles['IRSmallText']))
    elements.append(Spacer(1, 5))
    
    note3 = """<b>Note 3:</b> Temperature measurements are taken with the equipment operating under normal load 
    conditions. Variations in load levels may affect the Delta-T readings. It is recommended to conduct 
    inspections during peak operating periods for most accurate results."""
    elements.append(Paragraph(note3, styles['IRSmallText']))
    
    elements.append(PageBreak())
    
    return elements


def create_individual_inspection_pages(report, styles):
    """Create detailed pages for each inspection item - SECTION E"""
    elements = []
    
    inspection_items = report.get('inspection_items', [])
    
    # Reverse the items so oldest (Item #1) comes first in PDF
    # Frontend stores newest first, PDF should show oldest first
    inspection_items_for_pdf = list(reversed(inspection_items))
    
    if inspection_items_for_pdf:
        # Section Header (only once at the beginning)
        header_table = Table(
            [['SECTION - E: THERMAL IMAGES & INTERPRETATIONS']],
            colWidths=[515]
        )
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 15))
    
    for i, item in enumerate(inspection_items_for_pdf, 1):
        # Item header - truncate long panel/feeder names
        panel_name = item.get('panel', '')
        feeder_name = item.get('feeder', '')
        
        # Truncate if combined text is too long
        header_text = f"INSPECTION ITEM {i}: {panel_name} - {feeder_name}"
        max_header_len = 65  # Max characters for header
        if len(header_text) > max_header_len:
            # Truncate panel and feeder names proportionally
            available = max_header_len - len(f"INSPECTION ITEM {i}:  - ")
            half = available // 2
            if len(panel_name) > half:
                panel_name = panel_name[:half-2] + "..."
            if len(feeder_name) > half:
                feeder_name = feeder_name[:half-2] + "..."
            header_text = f"INSPECTION ITEM {i}: {panel_name} - {feeder_name}"
        
        item_header = Table(
            [[header_text]],
            colWidths=[515]
        )
        item_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1e3a5f')),
        ]))
        elements.append(item_header)
        elements.append(Spacer(1, 10))
        
        # =====================================================
        # CUSTOMER INFO TABLE - Above PHOTO & IDENTIFICATION
        # =====================================================
        doc_details = report.get('document_details', {})
        customer_name = doc_details.get('client', '')
        date_of_study = format_date_ddmmyyyy(doc_details.get('date_of_ir_study', ''))
        
        customer_info_data = [
            ['CUSTOMER NAME', customer_name],
            ['DATE OF STUDY', date_of_study],
        ]
        
        # Same column widths as thermal analysis table [150, 365]
        customer_info_table = Table(customer_info_data, colWidths=[150, 365])
        customer_info_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),  # Light grey like thermal analysis
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(customer_info_table)
        elements.append(Spacer(1, 10))
        
        # Images section
        elements.append(Paragraph("<b>PHOTO & IDENTIFICATION</b>", styles['IRSubHeader']))
        
        orig_img = item.get('original_image')
        thermal_img = item.get('thermal_image')
        
        img_cells = []
        
        # Original image
        if orig_img and orig_img.startswith('data:image'):
            try:
                img_data = orig_img.split(',')[1]
                img_bytes = base64.b64decode(img_data)
                img_io = BytesIO(img_bytes)
                img = Image(img_io, width=230, height=170)
                img_cells.append([Paragraph("<b>Original Image</b>", styles['IRTableCell']), img])
            except Exception:
                img_cells.append([Paragraph("<b>Original Image</b>", styles['IRTableCell']), "Image not available"])
        else:
            img_cells.append([Paragraph("<b>Original Image</b>", styles['IRTableCell']), "No image"])
        
        # Thermal image
        if thermal_img and thermal_img.startswith('data:image'):
            try:
                img_data = thermal_img.split(',')[1]
                img_bytes = base64.b64decode(img_data)
                img_io = BytesIO(img_bytes)
                img = Image(img_io, width=230, height=170)
                img_cells.append([Paragraph("<b>Thermal Image</b>", styles['IRTableCell']), img])
            except Exception:
                img_cells.append([Paragraph("<b>Thermal Image</b>", styles['IRTableCell']), "Image not available"])
        else:
            img_cells.append([Paragraph("<b>Thermal Image</b>", styles['IRTableCell']), "No image"])
        
        if len(img_cells) == 2:
            img_table = Table([[img_cells[0][1], img_cells[1][1]]], colWidths=[255, 255])
            img_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(img_table)
        
        elements.append(Spacer(1, 10))
        
        # Analysis section
        elements.append(Paragraph("<b>THERMAL ANALYSIS</b>", styles['IRSubHeader']))
        
        max_temp = item.get('max_temperature', '') or item.get('max_temp', '')
        min_temp = item.get('min_temperature', '') or item.get('min_temp', '')
        delta_t = ''
        if max_temp and min_temp:
            try:
                delta_t = float(max_temp) - float(min_temp)
                delta_t = f"{delta_t:.1f}°C"
            except (ValueError, TypeError):
                pass
        
        risk_category = item.get('risk_category', '')
        
        # Use Paragraph for cell wrapping
        cell_style = ParagraphStyle('AnalysisCell', fontSize=9, leading=11, wordWrap='CJK')
        
        def wrap_cell(text):
            return Paragraph(str(text) if text else '', cell_style)
        
        analysis_data = [
            ['LOCATION', wrap_cell(item.get('location', '') or item.get('panel', ''))],
            ['PANEL', wrap_cell(item.get('panel', ''))],
            ['FEEDER', wrap_cell(item.get('feeder', ''))],
            ['MAX TEMPERATURE', f"{max_temp}°C" if max_temp else ''],
            ['MIN TEMPERATURE', f"{min_temp}°C" if min_temp else ''],
            ['DELTA-T (ΔT)', delta_t],
            ['RISK CATEGORY', risk_category],
        ]
        
        risk_colors = {
            'Critical': colors.HexColor('#dc2626'),
            'Warning': colors.HexColor('#f59e0b'),
            'Check & Monitor': colors.HexColor('#3b82f6'),
            'Normal': colors.HexColor('#22c55e'),
        }
        
        analysis_table = Table(analysis_data, colWidths=[150, 365])
        style_cmds = [
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]
        
        # Highlight risk category row
        if risk_category in risk_colors:
            style_cmds.append(('BACKGROUND', (1, 6), (1, 6), risk_colors[risk_category]))
            style_cmds.append(('TEXTCOLOR', (1, 6), (1, 6), colors.white))
            style_cmds.append(('FONTNAME', (1, 6), (1, 6), 'Helvetica-Bold'))
        
        analysis_table.setStyle(TableStyle(style_cmds))
        elements.append(analysis_table)
        elements.append(Spacer(1, 10))
        
        # Observation and Recommendation
        observation = item.get('observation', '')
        recommendation = item.get('recommendation', '')
        
        if observation:
            elements.append(Paragraph("<b>OBSERVATION:</b>", styles['IRSubHeader']))
            elements.append(Paragraph(observation, styles['IRBodyText']))
        
        if recommendation:
            elements.append(Paragraph("<b>RECOMMENDATION:</b>", styles['IRSubHeader']))
            elements.append(Paragraph(recommendation, styles['IRBodyText']))
        
        elements.append(Spacer(1, 15))
        
        # =====================================================
        # ANALYSIS FOOTER TABLE - Below Thermal Analysis
        # =====================================================
        thermographer = doc_details.get('thermography_inspection_by', '')
        item_comments = item.get('comments', '') or ''  # Get comments from inspection item
        
        analysis_footer_data = [
            ['ANALYSED BY', thermographer],
            ['COMMENTS', item_comments],
            ['SIGNATURE', ''],
        ]
        
        # Same column widths as thermal analysis table [150, 365]
        analysis_footer_table = Table(analysis_footer_data, colWidths=[150, 365])
        analysis_footer_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),  # Light grey like thermal analysis
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(analysis_footer_table)
        
        elements.append(PageBreak())
    
    return elements


def append_calibration_certificate(buffer, report, exclude_closing_pages=False):
    """Append calibration certificate PDF if present with Section F title page and back cover
    
    Args:
        buffer: The PDF buffer to append to
        report: The report data dictionary
        exclude_closing_pages: If True, excludes Section F and Back Cover (for AMC embedding)
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        
        calibration_cert = report.get('calibration_certificate')
        
        # Create PDF writer and add pages
        writer = PdfWriter()
        
        # Add main report pages
        buffer.seek(0)
        main_reader = PdfReader(buffer)
        for page in main_reader.pages:
            writer.add_page(page)
        
        # Skip Section F and Back Cover when embedding in AMC report
        if not exclude_closing_pages:
            # Only add Section F if calibration certificate exists
            if calibration_cert and calibration_cert.startswith('data:'):
                # Decode base64 certificate
                cert_data = calibration_cert.split(',')[1]
                cert_bytes = base64.b64decode(cert_data)
                
                # Create Section F title page
                section_f_buffer = BytesIO()
                section_f_doc = SimpleDocTemplate(
                    section_f_buffer,
                    pagesize=A4,
                    rightMargin=30,
                    leftMargin=30,
                    topMargin=70,
                    bottomMargin=50
                )
                
                # Create Section F title page content
                section_f_elements = []
                
                # Add vertical spacer to center content
                section_f_elements.append(Spacer(1, 250))
                
                # Section F Header
                header_style = ParagraphStyle(
                    'SectionFHeader',
                    fontSize=16,
                    fontName='Helvetica-Bold',
                    textColor=colors.HexColor('#1e3a5f'),
                    alignment=1,  # Center
                    spaceAfter=20
                )
                
                section_f_elements.append(Paragraph("SECTION - F", header_style))
                
                # Title
                title_style = ParagraphStyle(
                    'SectionFTitle',
                fontSize=24,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1e3a5f'),
                alignment=1,  # Center
                spaceAfter=30
            )
            
            section_f_elements.append(Paragraph("Statutory Documents", title_style))
            section_f_elements.append(Paragraph("and Attachments", title_style))
            
            # Subtitle
            subtitle_style = ParagraphStyle(
                'SectionFSubtitle',
                fontSize=12,
                fontName='Helvetica',
                textColor=colors.HexColor('#666666'),
                alignment=1,  # Center
                spaceBefore=30
            )
            
            section_f_elements.append(Spacer(1, 20))
            section_f_elements.append(Paragraph("The following pages contain calibration certificates", subtitle_style))
            section_f_elements.append(Paragraph("and other statutory documents.", subtitle_style))
            
            # Build Section F page
            section_f_doc.build(section_f_elements)
            
            # Add Section F title page
            section_f_buffer.seek(0)
            section_f_reader = PdfReader(section_f_buffer)
            for page in section_f_reader.pages:
                writer.add_page(page)
            
            # Add certificate pages
            cert_reader = PdfReader(BytesIO(cert_bytes))
            for page in cert_reader.pages:
                writer.add_page(page)
        
        # =====================================================
            # CREATE BACK COVER PAGE (only when not embedding in AMC)
            # =====================================================
            back_cover_buffer = BytesIO()
            back_cover_doc = SimpleDocTemplate(
                back_cover_buffer,
                pagesize=A4,
                rightMargin=30,
                leftMargin=30,
                topMargin=50,
                bottomMargin=50
            )
            
            back_cover_elements = []
            width, height = A4
            
            # Add spacer to position content
            back_cover_elements.append(Spacer(1, 180))
            
            # Company Logo - centered
            logo_path = "/app/backend/assets/enerzia_logo.jpg"
            try:
                if os.path.exists(logo_path):
                    logo = Image(logo_path, width=200, height=80)
                    logo_table = Table([[logo]], colWidths=[515])
                    logo_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    back_cover_elements.append(logo_table)
                    back_cover_elements.append(Spacer(1, 40))
            except Exception as e:
                print(f"Error adding logo to back cover: {e}")
            
            # Contact Us Header
            contact_header_style = ParagraphStyle(
                'ContactHeader',
                fontSize=18,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1e3a5f'),
                alignment=1,  # Center
                spaceAfter=20
            )
            back_cover_elements.append(Paragraph("Contact Us", contact_header_style))
            back_cover_elements.append(Spacer(1, 15))
            
            # Company Name
            company_style = ParagraphStyle(
                'CompanyName',
                fontSize=16,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1e3a5f'),
                alignment=1,  # Center
                spaceAfter=10
            )
            back_cover_elements.append(Paragraph("Enerzia Power Solutions", company_style))
            
            # Company Address
            address_style = ParagraphStyle(
                'Address',
                fontSize=11,
                fontName='Helvetica',
                textColor=colors.HexColor('#333333'),
                alignment=1,  # Center
                spaceAfter=5,
                leading=16
            )
            back_cover_elements.append(Paragraph(
                "No.9, Akshaya, Sundaresan Nagar,<br/>ELumalai Chettiar Road, Maduravoyal,<br/>Chennai, Tamil Nadu, Pincode- 600095",
                address_style
            ))
            back_cover_elements.append(Spacer(1, 25))
            
            # Contact Details Style
            contact_style = ParagraphStyle(
                'ContactDetails',
                fontSize=12,
                fontName='Helvetica',
                textColor=colors.HexColor('#333333'),
                alignment=1,  # Center
                spaceAfter=8
            )
            
            # Tel
            back_cover_elements.append(Paragraph(
                "<b>Tel:</b> +91 44 45487875",
                contact_style
            ))
            
            # Mobile
            back_cover_elements.append(Paragraph(
                "<b>Mobile:</b> +91 9789894644",
                contact_style
            ))
            
            # Email
            back_cover_elements.append(Paragraph(
                "<b>E-mail:</b> info@enerzia.com",
                contact_style
            ))
            
            back_cover_elements.append(Spacer(1, 40))
            
            # Website
            website_style = ParagraphStyle(
                'Website',
                fontSize=14,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#e65100'),
                alignment=1,  # Center
            )
            back_cover_elements.append(Paragraph("www.enerzia.com", website_style))
            
            # Build back cover
            back_cover_doc.build(back_cover_elements)
            
            # Add back cover page
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
        print(f"Error appending calibration certificate: {e}")
        return buffer


async def generate_ir_thermography_pdf_internal(report_id: str, exclude_closing_pages: bool = False):
    """Internal function to generate IR Thermography PDF buffer (for AMC PDF attachment)
    
    Args:
        report_id: The ID of the IR Thermography report
        exclude_closing_pages: If True, excludes Section F (Statutory Documents) and Back Cover.
                               Use this when embedding in AMC reports to avoid duplicate sections.
    """
    try:
        db = get_db()
        
        # First try test_reports collection
        report = await db.test_reports.find_one({"id": report_id})
        
        # If not found, try ir_thermography_reports collection
        if not report:
            report = await db.ir_thermography_reports.find_one({"id": report_id})
        
        if not report:
            print(f"IR Thermography report not found: {report_id}")
            return None
        
        # Get organization settings
        org_settings = await db.settings.find_one({"type": "organization"}) or {}
        
        # Create buffer
        buffer = BytesIO()
        
        # Get styles
        styles = get_styles()
        
        # Calculate summary if not present
        if 'summary' not in report or not report['summary']:
            inspection_items = report.get('inspection_items', [])
            summary = {
                'total_items': len(inspection_items),
                'critical': 0,
                'warning': 0,
                'check_monitor': 0,
                'normal': 0
            }
            
            for item in inspection_items:
                risk = item.get('risk_category', '').lower().replace(' & ', '_').replace(' ', '_')
                if 'critical' in risk:
                    summary['critical'] += 1
                elif 'warning' in risk:
                    summary['warning'] += 1
                elif 'check' in risk or 'monitor' in risk:
                    summary['check_monitor'] += 1
                else:
                    summary['normal'] += 1
            
            report['summary'] = summary
        
        # Create custom canvas class
        def make_canvas(*args, **kwargs):
            return IRThermographyCanvas(*args, report_data=report, **kwargs)
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=70,
            bottomMargin=50
        )
        
        # Build elements
        elements = []
        
        # 1. Cover page
        elements.extend(create_cover_page(report, org_settings, styles))
        
        # 2. Document details
        elements.extend(create_document_details_section(report, styles))
        
        # 3. Table of Contents
        elements.extend(create_table_of_contents(report, styles))
        
        # 4. Executive Summary
        elements.extend(create_executive_summary(report, styles))
        
        # 5. Inspection Summary Table
        elements.extend(create_inspection_summary_table(report, styles))
        
        # 6. Fundamentals & Methodology
        elements.extend(create_fundamentals_methodology_section(report, styles))
        
        # 7. Risk Categorization
        elements.extend(create_risk_categorization_section(styles))
        
        # 8. Individual Inspection Pages
        elements.extend(create_individual_inspection_pages(report, styles))
        
        # Build PDF
        doc.build(elements, canvasmaker=make_canvas)
        
        # Append calibration certificate if present (skip when embedding in AMC)
        if not exclude_closing_pages:
            buffer = append_calibration_certificate(buffer, report)
        buffer.seek(0)
        
        return buffer
    except Exception as e:
        print(f"Error generating IR Thermography PDF: {e}")
        return None


@router.get("/{report_id}/pdf")
async def generate_ir_thermography_pdf(report_id: str):
    """Generate PDF for IR Thermography report"""
    db = get_db()
    
    # First try test_reports collection
    report = await db.test_reports.find_one({"id": report_id})
    
    # If not found, try ir_thermography_reports collection
    if not report:
        report = await db.ir_thermography_reports.find_one({"id": report_id})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get organization settings
    org_settings = await db.settings.find_one({"type": "organization"}) or {}
    
    # Create buffer
    buffer = BytesIO()
    
    # Get styles
    styles = get_styles()
    
    # Calculate summary if not present
    if 'summary' not in report or not report['summary']:
        inspection_items = report.get('inspection_items', [])
        summary = {
            'total_items': len(inspection_items),
            'critical': 0,
            'warning': 0,
            'check_monitor': 0,
            'normal': 0
        }
        
        for item in inspection_items:
            risk = item.get('risk_category', '').lower().replace(' & ', '_').replace(' ', '_')
            if 'critical' in risk:
                summary['critical'] += 1
            elif 'warning' in risk:
                summary['warning'] += 1
            elif 'check' in risk or 'monitor' in risk:
                summary['check_monitor'] += 1
            else:
                summary['normal'] += 1
        
        report['summary'] = summary
    
    # Create custom canvas class
    def make_canvas(*args, **kwargs):
        return IRThermographyCanvas(*args, report_data=report, **kwargs)
    
    # Create document with increased top margin
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=70,  # Increased for header
        bottomMargin=50
    )
    
    # Build elements
    elements = []
    
    # 1. Cover page
    elements.extend(create_cover_page(report, org_settings, styles))
    
    # 2. Document details (Page 2)
    elements.extend(create_document_details_section(report, styles))
    
    # 3. Table of Contents (Page 3)
    elements.extend(create_table_of_contents(report, styles))
    
    # 4. Executive Summary (Section A - Page 4)
    elements.extend(create_executive_summary(report, styles))
    
    # 5. Inspection Summary Table (Section B - Page 5)
    elements.extend(create_inspection_summary_table(report, styles))
    
    # 6. Fundamentals & Methodology (Section C - Page 6-7)
    elements.extend(create_fundamentals_methodology_section(report, styles))
    
    # 7. Risk Categorization Procedure (Section D - Page 8-9)
    elements.extend(create_risk_categorization_section(styles))
    
    # 8. Individual inspection pages (Section E - Page 10+)
    elements.extend(create_individual_inspection_pages(report, styles))
    
    # Build PDF with cover page handler
    doc.build(
        elements,
        onFirstPage=lambda canvas, doc: draw_cover_page(canvas, doc, report, org_settings),
        canvasmaker=make_canvas
    )
    
    # Append calibration certificate if present
    buffer = append_calibration_certificate(buffer, report)
    
    buffer.seek(0)
    
    # Generate filename
    report_no = report.get('report_no', 'IR_Report')
    filename = f"{report_no.replace('/', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
