"""
Service Report PDF Generator - Using Equipment Report Template Style
Complete implementation with ALL fields including Service Provider Details
Uses shared pdf_base module for common styles and canvas.
"""
import io
import os
import base64
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.platypus import Image as RLImage
from reportlab.pdfgen import canvas
import requests

# Import shared PDF components
from routes.pdf_base import (
    BORDER_COLOR, LIGHT_GRAY, DARK_TEXT, GRAY_TEXT, PRIMARY_COLOR,
    create_base_styles, BaseNumberedCanvas, get_logo_image as base_get_logo_image
)


def get_styles():
    """Create paragraph styles for the PDF - using base styles with measurement text addition."""
    styles = create_base_styles()
    
    # Add service-specific style
    styles.add(ParagraphStyle(
        name='MeasurementText',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        alignment=TA_LEFT
    ))
    
    return styles


class ServiceNumberedCanvas(BaseNumberedCanvas):
    """Service Report canvas with dynamic title based on service category."""
    
    def __init__(self, *args, report_data=None, org_settings=None, **kwargs):
        # Get service category for dynamic title
        service_category = (report_data or {}).get('service_category', 'General')
        report_title = f"SERVICE REPORT ({service_category.upper()})"
        
        super().__init__(
            *args,
            report_data=report_data,
            org_settings=org_settings,
            report_title=report_title,
            report_no_field='srn_no',
            report_date_field='service_date',
            **kwargs
        )


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


def process_signature(sig_data, width=80, height=50):
    """Process base64 signature data and return ReportLab Image."""
    if not sig_data:
        return None
    try:
        if sig_data.startswith('data:image'):
            if ',' in sig_data:
                base64_data = sig_data.split(',')[1]
            else:
                return None
        else:
            base64_data = sig_data
        
        # Fix padding
        missing_padding = len(base64_data) % 4
        if missing_padding:
            base64_data += '=' * (4 - missing_padding)
        
        img_data = base64.b64decode(base64_data)
        
        # Convert to RGB JPEG
        from PIL import Image as PILImage
        original_img = PILImage.open(io.BytesIO(img_data))
        
        if original_img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = PILImage.new('RGB', original_img.size, (255, 255, 255))
            if original_img.mode == 'P':
                original_img = original_img.convert('RGBA')
            rgb_img.paste(original_img, mask=original_img.split()[-1] if original_img.mode in ('RGBA', 'LA') else None)
            original_img = rgb_img
        elif original_img.mode != 'RGB':
            original_img = original_img.convert('RGB')
        
        jpeg_buffer = io.BytesIO()
        original_img.save(jpeg_buffer, format='JPEG', quality=85)
        jpeg_buffer.seek(0)
        
        return RLImage(jpeg_buffer, width=width, height=height)
    except Exception as e:
        print(f"Error processing signature: {e}")
        return None


def process_photo(photo_data, width=150, height=100):
    """Process base64 photo data and return ReportLab Image."""
    if not photo_data:
        return None
    try:
        if photo_data.startswith('data:image'):
            if ',' in photo_data:
                base64_data = photo_data.split(',')[1]
            else:
                return None
        else:
            base64_data = photo_data
        
        missing_padding = len(base64_data) % 4
        if missing_padding:
            base64_data += '=' * (4 - missing_padding)
        
        img_data = base64.b64decode(base64_data)
        
        from PIL import Image as PILImage
        original_img = PILImage.open(io.BytesIO(img_data))
        
        if original_img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = PILImage.new('RGB', original_img.size, (255, 255, 255))
            if original_img.mode == 'P':
                original_img = original_img.convert('RGBA')
            rgb_img.paste(original_img, mask=original_img.split()[-1] if original_img.mode in ('RGBA', 'LA') else None)
            original_img = rgb_img
        elif original_img.mode != 'RGB':
            original_img = original_img.convert('RGB')
        
        jpeg_buffer = io.BytesIO()
        original_img.save(jpeg_buffer, format='JPEG', quality=85)
        jpeg_buffer.seek(0)
        
        return RLImage(jpeg_buffer, width=width, height=height)
    except Exception as e:
        print(f"Error processing photo: {e}")
        return None


def get_category_measurements(service_category):
    """Return appropriate test measurement fields based on service category."""
    electrical_fields = [
        ('line_voltage_ry', 'Line Voltage R-Y'),
        ('line_voltage_yb', 'Line Voltage Y-B'),
        ('line_voltage_br', 'Line Voltage B-R'),
        ('phase_voltage_rn', 'Phase Voltage R-N'),
        ('phase_voltage_yn', 'Phase Voltage Y-N'),
        ('phase_voltage_bn', 'Phase Voltage B-N'),
        ('phase_current_r', 'Phase Current R'),
        ('phase_current_y', 'Phase Current Y'),
        ('phase_current_b', 'Phase Current B'),
        ('neutral_current', 'Neutral Current'),
        ('neutral_earth_voltage', 'N-E Voltage'),
        ('insulation_phase_phase', 'Ins. Phase-Phase'),
        ('insulation_phase_earth', 'Ins. Phase-Earth'),
        ('insulation_phase_neutral', 'Ins. Phase-Neutral'),
        ('insulation_neutral_earth', 'Ins. Neutral-Earth'),
        ('applied_voltage', 'Applied Voltage'),
    ]
    
    hvac_fields = [
        ('supply_air_temp', 'Supply Air Temp'),
        ('return_air_temp', 'Return Air Temp'),
        ('ambient_temp', 'Ambient Temp'),
        ('discharge_pressure', 'Discharge Pressure'),
        ('suction_pressure', 'Suction Pressure'),
        ('humidity_level', 'Humidity Level'),
        ('compressor_current', 'Compressor Current'),
        ('fan_motor_current', 'Fan Motor Current'),
        ('airflow_rate', 'Airflow Rate'),
        ('system_voltage', 'System Voltage'),
        ('system_current', 'System Current'),
        ('time_switched_on', 'Time Switched ON'),
    ]
    
    category_lower = (service_category or '').lower()
    
    if 'electrical' in category_lower or 'power' in category_lower:
        return electrical_fields
    elif 'hvac' in category_lower or 'air condition' in category_lower or 'ac' in category_lower:
        return hvac_fields
    elif 'fire' in category_lower:
        return [('fire_alarm_status', 'Fire Alarm Status'), ('sprinkler_status', 'Sprinkler Status'), ('extinguisher_check', 'Extinguisher Check')]
    elif 'cctv' in category_lower:
        return [('camera_status', 'Camera Status'), ('dvr_status', 'DVR Status'), ('storage_status', 'Storage Status')]
    elif 'generator' in category_lower or 'dg' in category_lower:
        return [('dg_voltage', 'DG Voltage'), ('dg_frequency', 'DG Frequency'), ('fuel_level', 'Fuel Level'), ('battery_voltage', 'Battery Voltage')]
    else:
        # Return both for general/other categories
        return electrical_fields + hvac_fields


def generate_service_pdf_buffer(request: dict, org_settings: dict):
    """Generate PDF buffer for service report with ALL fields."""
    buffer = io.BytesIO()
    page_width, page_height = A4
    margin = 30  # Increased margin for better alignment
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
    
    # Get service category for dynamic title
    service_category = request.get('service_category', 'General')
    
    # ============ HEADER SECTION ============
    # Dynamic Title on left, Logo on right
    report_title = f"SERVICE REPORT ({service_category.upper()})"
    title_cell = Paragraph(f"<b>{report_title}</b>", styles['ReportTitle'])
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
    
    # SRN # and Date row
    service_date = request.get('service_date', '') or request.get('reported_date', '-')
    info_data = [[f"SRN #: {request.get('srn_no', 'N/A')}", f"Reported Date: {request.get('reported_date', '-')}"]]
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
    
    # ============ REQUEST TYPE ============
    request_types = ['Maintenance', 'Breakdown', 'Repair', 'Service Call', 'Complaint', 'Warranty', 'AMC', 'Other']
    current_type = request.get('request_type', '')
    
    type_header = Table([[Paragraph("<b>REQUEST TYPE</b>", styles['SectionHeader'])]], colWidths=[content_width])
    type_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(type_header)
    
    row1_cells = [f"[{'X' if t == current_type else '  '}] {t}" for t in request_types[:4]]
    row2_cells = [f"[{'X' if t == current_type else '  '}] {t}" for t in request_types[4:]]
    type_data = [row1_cells, row2_cells]
    
    type_table = Table(type_data, colWidths=[col_width, col_width, col_width, col_width])
    type_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(type_table)
    elements.append(Spacer(1, 6))
    
    # ============ CUSTOMER INFORMATION ============
    cust_header = Table([[Paragraph("<b>CUSTOMER INFORMATION</b>", styles['SectionHeader'])]], colWidths=[content_width])
    cust_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cust_header)
    
    cust_data = [
        [Paragraph("<b>Customer Name:</b>", styles['LabelText']), 
         Paragraph(str(request.get('customer_name', '-')), styles['SmallText']),
         Paragraph("<b>Site Location:</b>", styles['LabelText']), 
         Paragraph(str(request.get('site_location', '-')), styles['SmallText'])],
        [Paragraph("<b>Contact Person:</b>", styles['LabelText']), 
         Paragraph(str(request.get('contact_person', '-')), styles['SmallText']),
         Paragraph("<b>Contact Phone:</b>", styles['LabelText']), 
         Paragraph(str(request.get('contact_phone', '-')), styles['SmallText'])],
        [Paragraph("<b>Contact Email:</b>", styles['LabelText']), 
         Paragraph(str(request.get('contact_email', '-')), styles['SmallText']),
         Paragraph("<b>P.O. Ref:</b>", styles['LabelText']), 
         Paragraph(str(request.get('po_ref', '-')), styles['SmallText'])],
        [Paragraph("<b>Call Raised By:</b>", styles['LabelText']), 
         Paragraph(str(request.get('call_raised_by', '-')), styles['SmallText']),
         Paragraph("<b>Call Date/Time:</b>", styles['LabelText']), 
         Paragraph(str(request.get('call_raised_datetime', '-')), styles['SmallText'])],
    ]
    
    cust_table = Table(cust_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    cust_table.setStyle(TableStyle([
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
    elements.append(cust_table)
    elements.append(Spacer(1, 6))
    
    # ============ SERVICE PROVIDER DETAILS ============
    org_name = org_settings.get('name', 'Enerzia Power Solutions') if org_settings else 'Enerzia Power Solutions'
    
    # Build multi-line company address
    org_address_lines = []
    if org_settings:
        if org_settings.get('address_line1'):
            org_address_lines.append(org_settings.get('address_line1'))
        if org_settings.get('address_line2'):
            org_address_lines.append(org_settings.get('address_line2'))
        city_state_parts = []
        if org_settings.get('city'):
            city_state_parts.append(org_settings.get('city'))
        if org_settings.get('state'):
            city_state_parts.append(org_settings.get('state'))
        if org_settings.get('pincode') or org_settings.get('postal_code'):
            city_state_parts.append(org_settings.get('pincode') or org_settings.get('postal_code'))
        if city_state_parts:
            org_address_lines.append(', '.join(city_state_parts))
        if org_settings.get('country'):
            org_address_lines.append(org_settings.get('country'))
    
    # Use default address lines if org_settings is sparse
    if not org_address_lines or len(org_address_lines) < 2:
        org_address_lines = [
            'No. 5, First Floor, Nehru Nagar',
            'Adyar, Chennai - 600020',
            'Tamil Nadu, India'
        ]
    
    # Join with HTML line breaks for multi-line display
    org_address = '<br/>'.join(org_address_lines)
    
    sp_header = Table([[Paragraph("<b>SERVICE PROVIDER DETAILS</b>", styles['SectionHeader'])]], colWidths=[content_width])
    sp_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sp_header)
    
    sp_data = [
        [Paragraph("<b>Company Name:</b>", styles['LabelText']), 
         Paragraph(str(org_name), styles['SmallText']),
         Paragraph("<b>Company Address:</b>", styles['LabelText']), 
         Paragraph(org_address, styles['SmallText'])],
        [Paragraph("<b>Call Attended By:</b>", styles['LabelText']), 
         Paragraph(str(request.get('assigned_to', '-')), styles['SmallText']),
         Paragraph("<b>Service Category:</b>", styles['LabelText']), 
         Paragraph(str(service_category), styles['SmallText'])],
        [Paragraph("<b>Engineer/Tech Email:</b>", styles['LabelText']), 
         Paragraph(str(request.get('technician_email', '-')), styles['SmallText']),
         Paragraph("<b>Service Date:</b>", styles['LabelText']), 
         Paragraph(str(service_date), styles['SmallText'])],
        [Paragraph("<b>Engineer/Tech Mobile:</b>", styles['LabelText']), 
         Paragraph(str(request.get('technician_phone', '-')), styles['SmallText']),
         Paragraph("<b>Completion Date:</b>", styles['LabelText']), 
         Paragraph(str(request.get('completion_date', '-')), styles['SmallText'])],
    ]
    
    sp_table = Table(sp_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
    sp_table.setStyle(TableStyle([
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
    elements.append(sp_table)
    elements.append(Spacer(1, 6))
    
    # ============ NATURE OF PROBLEM / SERVICE ============
    nature_header = Table([[Paragraph("<b>NATURE OF PROBLEM / SERVICE</b>", styles['SectionHeader'])]], colWidths=[content_width])
    nature_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(nature_header)
    
    nature_data = [
        [Paragraph("<b>Brief Description:</b>", styles['LabelText']), 
         Paragraph(str(request.get('subject', '-')), styles['SmallText'])],
        [Paragraph("<b>Detailed Description:</b>", styles['LabelText']), 
         Paragraph(str(request.get('description', '-')), styles['SmallText'])],
    ]
    
    nature_table = Table(nature_data, colWidths=[content_width*0.20, content_width*0.80])
    nature_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
    ]))
    elements.append(nature_table)
    elements.append(Spacer(1, 6))
    
    # ============ EQUIPMENT DETAILS ============
    equipment_list = request.get('equipment_list', [])
    if equipment_list:
        equip_header = Table([[Paragraph("<b>EQUIPMENT DETAILS</b>", styles['SectionHeader'])]], colWidths=[content_width])
        equip_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(equip_header)
        
        for idx, equip in enumerate(equipment_list):
            equip_data = [
                [Paragraph(f"<b>Equipment {idx+1}:</b>", styles['LabelText']), 
                 Paragraph(str(equip.get('equipment_name', '-')), styles['SmallText']),
                 Paragraph("<b>Location:</b>", styles['LabelText']), 
                 Paragraph(str(equip.get('equipment_location', '-')), styles['SmallText'])],
                [Paragraph("<b>Make/Model:</b>", styles['LabelText']), 
                 Paragraph(str(equip.get('make_model', '-')), styles['SmallText']),
                 Paragraph("<b>Serial No:</b>", styles['LabelText']), 
                 Paragraph(str(equip.get('equipment_serial', '-')), styles['SmallText'])],
            ]
            
            equip_table = Table(equip_data, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
            equip_table.setStyle(TableStyle([
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
            elements.append(equip_table)
            
            # Test measurements for this equipment - category-specific
            test_meas = equip.get('test_measurements', {})
            if test_meas:
                # Get category-specific fields
                category_fields = get_category_measurements(service_category)
                
                meas_rows = []
                row = []
                for field_key, field_label in category_fields:
                    value = test_meas.get(field_key, '')
                    if value:  # Only include fields with values
                        # Use simple strings for single-line display
                        row.append(f"{field_label}:")
                        row.append(str(value))
                        if len(row) >= 4:  # 2 field-value pairs per row
                            meas_rows.append(row)
                            row = []
                
                if row:  # Add remaining items
                    while len(row) < 4:
                        row.extend(['', ''])
                    meas_rows.append(row)
                
                if meas_rows:
                    meas_header = Table([[Paragraph(f"<b>Test Measurements (Equipment {idx+1})</b>", styles['SmallText'])]], colWidths=[content_width])
                    meas_header.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
                        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ]))
                    elements.append(meas_header)
                    
                    # Use same column widths as Equipment Details section for alignment
                    meas_table = Table(meas_rows, colWidths=[col_width*0.65, col_width*1.35, col_width*0.65, col_width*1.35])
                    meas_table.setStyle(TableStyle([
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # First column bold
                        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),  # Third column bold
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                        ('TOPPADDING', (0, 0), (-1, -1), 4),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
                        ('BACKGROUND', (2, 0), (2, -1), LIGHT_GRAY),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    elements.append(meas_table)
        
        elements.append(Spacer(1, 6))
    
    # ============ TEST INSTRUMENTS ============
    test_instruments = request.get('test_instruments', [])
    if test_instruments:
        inst_header = Table([[Paragraph("<b>TEST INSTRUMENTS USED</b>", styles['SectionHeader'])]], colWidths=[content_width])
        inst_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(inst_header)
        
        inst_data = [['S.No', 'Instrument Name', 'Make', 'Model', 'Serial No']]
        for idx, inst in enumerate(test_instruments, 1):
            inst_data.append([
                str(idx),
                str(inst.get('name', '-')),
                str(inst.get('make', '-')),
                str(inst.get('model', '-')),
                str(inst.get('serial', '-'))
            ])
        
        inst_table = Table(inst_data, colWidths=[content_width*0.08, content_width*0.32, content_width*0.2, content_width*0.2, content_width*0.2])
        inst_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ]))
        elements.append(inst_table)
        elements.append(Spacer(1, 6))
    
    # ============ SPARES USED ============
    if request.get('spares_used') and request.get('spares_list'):
        spares_header = Table([[Paragraph("<b>SPARES / MATERIALS USED</b>", styles['SectionHeader'])]], colWidths=[content_width])
        spares_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(spares_header)
        
        spares_data = [['S.No', 'Description', 'Make', 'Model', 'Qty']]
        for idx, spare in enumerate(request.get('spares_list', []), 1):
            spares_data.append([
                str(idx),
                str(spare.get('name', '-')),
                str(spare.get('make', '-')),
                str(spare.get('model', '-')),
                str(spare.get('qty', '-'))
            ])
        
        spares_table = Table(spares_data, colWidths=[content_width*0.08, content_width*0.42, content_width*0.18, content_width*0.18, content_width*0.14])
        spares_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (-1, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(spares_table)
        elements.append(Spacer(1, 6))
    
    # ============ SERVICE DESCRIPTION / SOLUTIONS ============
    service_header = Table([[Paragraph("<b>DESCRIPTION OF SERVICE / SOLUTIONS UNDERTAKEN</b>", styles['SectionHeader'])]], colWidths=[content_width])
    service_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(service_header)
    
    service_data = [
        [Paragraph("<b>Root Cause / Work Performed:</b>", styles['LabelText']), 
         Paragraph(str(request.get('work_performed', '-')), styles['SmallText'])],
        [Paragraph("<b>Observations:</b>", styles['LabelText']), 
         Paragraph(str(request.get('observations', '-')), styles['SmallText'])],
        [Paragraph("<b>Recommendations:</b>", styles['LabelText']), 
         Paragraph(str(request.get('recommendations', '-')), styles['SmallText'])],
    ]
    
    service_table = Table(service_data, colWidths=[content_width*0.22, content_width*0.78])
    service_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GRAY),
    ]))
    elements.append(service_table)
    elements.append(Spacer(1, 6))
    
    # ============ BEFORE/AFTER PHOTOS ============
    before_photos = request.get('before_photos', [])
    after_photos = request.get('after_photos', [])
    
    if before_photos or after_photos:
        photos_header = Table([[Paragraph("<b>BEFORE & AFTER PHOTOS</b>", styles['SectionHeader'])]], colWidths=[content_width])
        photos_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(photos_header)
        
        photo_data = [['Before', 'After']]
        max_photos = max(len(before_photos), len(after_photos))
        
        for i in range(max_photos):
            before_img = process_photo(before_photos[i] if i < len(before_photos) else None, 160, 100)
            after_img = process_photo(after_photos[i] if i < len(after_photos) else None, 160, 100)
            photo_data.append([before_img or '', after_img or ''])
        
        photo_table = Table(photo_data, colWidths=[content_width*0.5, content_width*0.5])
        photo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(photo_table)
        elements.append(Spacer(1, 6))
    
    # ============ CLIENT FEEDBACK ============
    feedback_header = Table([[Paragraph("<b>CLIENT FEEDBACK / SUGGESTIONS</b>", styles['SectionHeader'])]], colWidths=[content_width])
    feedback_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(feedback_header)
    
    feedback_content = [[Paragraph(str(request.get('customer_feedback', '-') or '-'), styles['SmallText'])]]
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
    sig_header = Table([[Paragraph("<b>SIGNATURES</b>", styles['SectionHeader'])]], colWidths=[content_width])
    sig_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_header)
    
    tech_sig = process_signature(request.get('technician_signature'), 80, 50)
    cust_sig = process_signature(request.get('customer_signature'), 80, 50)
    
    sig_data = [
        ['Technician Signature', '', 'Customer Signature', ''],
        [tech_sig or '', '', cust_sig or '', ''],
        [f"Name: {request.get('assigned_to', '-')}", '', f"Name: {request.get('contact_person', '-')}", ''],
        [f"Date: {request.get('completion_date', '-')}", '', f"Date: {request.get('completion_date', '-')}", ''],
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
        ('ALIGN', (0, 1), (-1, 1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_table)
    
    # Build with custom canvas - using ServiceNumberedCanvas for dynamic title
    doc.build(
        elements,
        canvasmaker=lambda *args, **kwargs: ServiceNumberedCanvas(
            *args,
            report_data=request,
            org_settings=org_settings,
            **kwargs
        )
    )
    buffer.seek(0)
    
    return buffer


# Async wrapper for generating service report PDF internally (for AMC PDF attachment)
async def generate_service_report_pdf_internal(request_id: str):
    """Generate service report PDF buffer for internal use (attachment to AMC reports)"""
    import os
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'enerzia')]
    
    try:
        request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
        if not request:
            return None
        
        # Get organization settings
        org_settings = await db.settings.find_one({"id": "org_settings"}, {"_id": 0})
        
        # Generate PDF buffer
        buffer = generate_service_pdf_buffer(request, org_settings or {})
        return buffer
    except Exception as e:
        print(f"Error generating service report PDF {request_id}: {e}")
        return None
