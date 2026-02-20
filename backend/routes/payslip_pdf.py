"""
Payslip PDF Generation for HR Payroll System
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch, mm
from io import BytesIO
from datetime import datetime
import os

def generate_payslip_pdf(payroll_record: dict, employee: dict, company_info: dict = None) -> BytesIO:
    """
    Generate a professional payslip PDF
    
    Args:
        payroll_record: The payroll record with earnings and deductions
        employee: Employee details
        company_info: Optional company details
    
    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    # Default company info
    if not company_info:
        company_info = {
            "name": "Enerzia Power Solutions Pvt. Ltd.",
            "address": "No. 5, 2nd Floor, Kaveri Complex, Alwarpet, Chennai - 600018",
            "phone": "+91-44-4857 4857",
            "email": "info@enerzia.com",
            "website": "www.enerzia.com"
        }
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a5f'),
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.white,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#334155')
    )
    
    bold_style = ParagraphStyle(
        'Bold',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    # Get month name
    months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December']
    month_name = months[payroll_record.get('month', 1)]
    year = payroll_record.get('year', 2026)
    
    # Header
    elements.append(Paragraph(company_info['name'], title_style))
    elements.append(Paragraph(company_info['address'], subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Payslip Title
    payslip_title = f"<b>PAYSLIP FOR {month_name.upper()} {year}</b>"
    elements.append(Paragraph(payslip_title, ParagraphStyle(
        'PayslipTitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#1e40af'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        spaceAfter=20
    )))
    
    # Employee Details Section
    emp_header = [['EMPLOYEE DETAILS', '', '', '']]
    emp_header_table = Table(emp_header, colWidths=[500])
    emp_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(emp_header_table)
    
    # Employee Info Table
    emp_data = [
        [Paragraph('<b>Employee Name:</b>', bold_style), Paragraph(payroll_record.get('emp_name', '-'), normal_style),
         Paragraph('<b>Employee ID:</b>', bold_style), Paragraph(payroll_record.get('emp_id', '-'), normal_style)],
        [Paragraph('<b>Department:</b>', bold_style), Paragraph(payroll_record.get('department', '-'), normal_style),
         Paragraph('<b>Designation:</b>', bold_style), Paragraph(payroll_record.get('designation', '-'), normal_style)],
        [Paragraph('<b>Bank Account:</b>', bold_style), Paragraph(payroll_record.get('bank_account', '-'), normal_style),
         Paragraph('<b>IFSC Code:</b>', bold_style), Paragraph(payroll_record.get('bank_ifsc', '-'), normal_style)],
        [Paragraph('<b>PAN Number:</b>', bold_style), Paragraph(employee.get('statutory', {}).get('pan_number', '-'), normal_style),
         Paragraph('<b>UAN Number:</b>', bold_style), Paragraph(employee.get('statutory', {}).get('uan_number', '-'), normal_style)],
    ]
    
    emp_table = Table(emp_data, colWidths=[90, 160, 90, 160])
    emp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 15))
    
    # Attendance Summary
    att_header = [['ATTENDANCE SUMMARY', '', '', '']]
    att_header_table = Table(att_header, colWidths=[500])
    att_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0891b2')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(att_header_table)
    
    att_data = [
        [Paragraph('<b>Days in Month:</b>', bold_style), Paragraph(str(payroll_record.get('days_in_month', 30)), normal_style),
         Paragraph('<b>Working Days:</b>', bold_style), Paragraph(str(payroll_record.get('working_days', 26)), normal_style)],
        [Paragraph('<b>Days Present:</b>', bold_style), Paragraph(str(payroll_record.get('present_days', 26)), normal_style),
         Paragraph('<b>LOP Days:</b>', bold_style), Paragraph(str(payroll_record.get('lop_days', 0)), normal_style)],
    ]
    
    att_table = Table(att_data, colWidths=[90, 160, 90, 160])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdfa')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#99f6e4')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(att_table)
    elements.append(Spacer(1, 15))
    
    # Earnings and Deductions - Side by Side
    earnings = payroll_record.get('earnings', {})
    deductions = payroll_record.get('deductions', {})
    
    # Earnings Column
    earnings_data = [
        [Paragraph('<b>EARNINGS</b>', ParagraphStyle('H', fontSize=10, textColor=colors.white, fontName='Helvetica-Bold')), '']
    ]
    
    earnings_items = [
        ('Basic Salary', earnings.get('basic', 0)),
        ('House Rent Allowance', earnings.get('hra', 0)),
        ('Dearness Allowance', earnings.get('da', 0)),
        ('Conveyance Allowance', earnings.get('conveyance', 0)),
        ('Medical Allowance', earnings.get('medical', 0)),
        ('Special Allowance', earnings.get('special_allowance', 0)),
        ('Other Allowance', earnings.get('other_allowance', 0)),
    ]
    
    for label, amount in earnings_items:
        if amount > 0:
            earnings_data.append([
                Paragraph(label, normal_style),
                Paragraph(f"₹ {amount:,.2f}", ParagraphStyle('Amount', fontSize=9, alignment=TA_RIGHT))
            ])
    
    earnings_data.append([
        Paragraph('<b>GROSS EARNINGS</b>', bold_style),
        Paragraph(f"<b>₹ {payroll_record.get('gross_salary', 0):,.2f}</b>", ParagraphStyle('Total', fontSize=9, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
    ])
    
    # Deductions Column
    deductions_data = [
        [Paragraph('<b>DEDUCTIONS</b>', ParagraphStyle('H', fontSize=10, textColor=colors.white, fontName='Helvetica-Bold')), '']
    ]
    
    deductions_items = [
        ('Provident Fund (EPF)', deductions.get('epf', 0)),
        ('Employee State Insurance', deductions.get('esic', 0) if deductions.get('esic_applicable', False) else 0),
        ('Professional Tax', deductions.get('professional_tax', 0)),
        ('LOP Deduction', deductions.get('lop_deduction', 0)),
        ('Advance EMI', deductions.get('advance_emi', 0)),
        ('Other Deductions', deductions.get('other_deductions', 0)),
    ]
    
    for label, amount in deductions_items:
        if amount > 0:
            deductions_data.append([
                Paragraph(label, normal_style),
                Paragraph(f"₹ {amount:,.2f}", ParagraphStyle('Amount', fontSize=9, alignment=TA_RIGHT))
            ])
    
    deductions_data.append([
        Paragraph('<b>TOTAL DEDUCTIONS</b>', bold_style),
        Paragraph(f"<b>₹ {payroll_record.get('total_deductions', 0):,.2f}</b>", ParagraphStyle('Total', fontSize=9, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
    ])
    
    # Make both tables same height by padding
    max_rows = max(len(earnings_data), len(deductions_data))
    while len(earnings_data) < max_rows:
        earnings_data.insert(-1, [Paragraph('', normal_style), Paragraph('', normal_style)])
    while len(deductions_data) < max_rows:
        deductions_data.insert(-1, [Paragraph('', normal_style), Paragraph('', normal_style)])
    
    # Create earnings table
    earnings_table = Table(earnings_data, colWidths=[150, 90])
    earnings_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16a34a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#f0fdf4')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#dcfce7')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#86efac')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]
    earnings_table.setStyle(TableStyle(earnings_styles))
    
    # Create deductions table
    deductions_table = Table(deductions_data, colWidths=[150, 90])
    deductions_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#fef2f2')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fecaca')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fca5a5')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]
    deductions_table.setStyle(TableStyle(deductions_styles))
    
    # Combine earnings and deductions side by side
    combined_table = Table([[earnings_table, deductions_table]], colWidths=[250, 250])
    combined_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(combined_table)
    elements.append(Spacer(1, 20))
    
    # Net Salary Box
    net_salary = payroll_record.get('net_salary', 0)
    net_data = [[
        Paragraph('<b>NET SALARY PAYABLE</b>', ParagraphStyle('NetLabel', fontSize=12, textColor=colors.white, fontName='Helvetica-Bold')),
        Paragraph(f"<b>₹ {net_salary:,.2f}</b>", ParagraphStyle('NetAmount', fontSize=14, textColor=colors.white, fontName='Helvetica-Bold', alignment=TA_RIGHT))
    ]]
    
    net_table = Table(net_data, colWidths=[300, 200])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e40af')),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 15))
    
    # Employer Contributions (Info Box)
    employer = payroll_record.get('employer_contributions', {})
    employer_data = [[
        Paragraph('<b>Employer Contributions (Not deducted from salary)</b>', ParagraphStyle('EmpLabel', fontSize=9, textColor=colors.HexColor('#92400e'), fontName='Helvetica-Bold')),
        Paragraph(f"EPF: ₹{employer.get('epf', 0):,.2f} | ESIC: ₹{employer.get('esic', 0):,.2f} | Total CTC: ₹{payroll_record.get('ctc', 0):,.2f}", 
                  ParagraphStyle('EmpAmount', fontSize=9, textColor=colors.HexColor('#92400e'), alignment=TA_RIGHT))
    ]]
    
    employer_table = Table(employer_data, colWidths=[280, 220])
    employer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(employer_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_text = f"""
    <b>Note:</b> This is a computer-generated payslip and does not require a signature.<br/>
    For any queries, please contact HR department at hr@enerzia.com<br/><br/>
    <i>Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}</i>
    """
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', fontSize=8, textColor=colors.HexColor('#64748b'), alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
