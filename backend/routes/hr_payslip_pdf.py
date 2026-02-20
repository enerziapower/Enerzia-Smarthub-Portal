"""
HR Payslip PDF Generation Service
Generates professional payslip PDFs for employees
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
import os

router = APIRouter(prefix="/api/hr", tags=["HR Payslip PDF"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Colors
HEADER_BG = colors.HexColor('#1e3a5f')  # Dark blue
ACCENT_COLOR = colors.HexColor('#3b82f6')  # Blue
GREEN_COLOR = colors.HexColor('#22c55e')
RED_COLOR = colors.HexColor('#ef4444')


def get_month_name(month: int) -> str:
    """Get month name from number"""
    months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December']
    return months[month] if 1 <= month <= 12 else str(month)


def format_currency(amount) -> str:
    """Format amount as Indian currency"""
    if amount is None:
        return "₹ 0.00"
    return f"₹ {amount:,.2f}"


def generate_payslip_pdf(payroll_record: dict, employee: dict = None, org_settings: dict = None) -> BytesIO:
    """Generate a professional payslip PDF"""
    buffer = BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=HEADER_BG,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.white,
        backColor=HEADER_BG,
        spaceBefore=15,
        spaceAfter=5
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black
    )
    
    elements = []
    
    # Company Header
    company_name = org_settings.get('name', 'Smarthub Enerzia') if org_settings else 'Smarthub Enerzia'
    company_address = org_settings.get('address', '') if org_settings else ''
    
    elements.append(Paragraph(company_name, title_style))
    if company_address:
        elements.append(Paragraph(company_address, subtitle_style))
    
    # Payslip Title
    month_name = get_month_name(payroll_record.get('month', 0))
    year = payroll_record.get('year', datetime.now().year)
    elements.append(Paragraph(f"PAYSLIP FOR {month_name.upper()} {year}", ParagraphStyle(
        'PayslipTitle',
        fontSize=14,
        textColor=ACCENT_COLOR,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=20
    )))
    
    # Employee Information Section
    elements.append(Paragraph("EMPLOYEE INFORMATION", section_header_style))
    
    emp_info = [
        ['Employee Name:', payroll_record.get('emp_name', 'N/A'), 'Employee ID:', payroll_record.get('emp_id', 'N/A')],
        ['Department:', payroll_record.get('department', 'N/A'), 'Designation:', payroll_record.get('designation', 'N/A')],
        ['Bank Account:', payroll_record.get('bank_account', 'N/A'), 'IFSC Code:', payroll_record.get('bank_ifsc', 'N/A')],
    ]
    
    # Add employee details if available
    if employee:
        emp_info.append(['PAN:', employee.get('statutory', {}).get('pan_number', 'N/A'), 
                        'UAN:', employee.get('statutory', {}).get('uan_number', 'N/A')])
    
    emp_table = Table(emp_info, colWidths=[80, 150, 80, 150])
    emp_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
        ('FONT', (2, 0), (2, -1), 'Helvetica-Bold', 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 10))
    
    # Attendance Summary
    elements.append(Paragraph("ATTENDANCE SUMMARY", section_header_style))
    
    attendance_data = [
        ['Days in Month', 'Working Days', 'Days Present', 'LOP Days'],
        [
            str(payroll_record.get('days_in_month', 30)),
            str(payroll_record.get('working_days', 26)),
            str(payroll_record.get('present_days', 0)),
            str(payroll_record.get('lop_days', 0))
        ]
    ]
    
    attendance_table = Table(attendance_data, colWidths=[115, 115, 115, 115])
    attendance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 9),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(attendance_table)
    elements.append(Spacer(1, 15))
    
    # Earnings and Deductions Side by Side
    earnings = payroll_record.get('earnings', {})
    deductions = payroll_record.get('deductions', {})
    
    # Earnings Column
    earnings_rows = [['EARNINGS', 'Amount (₹)']]
    earnings_items = [
        ('Basic Salary', earnings.get('basic', 0)),
        ('HRA', earnings.get('hra', 0)),
        ('DA', earnings.get('da', 0)),
        ('Conveyance', earnings.get('conveyance', 0)),
        ('Medical Allowance', earnings.get('medical', 0)),
        ('Special Allowance', earnings.get('special_allowance', 0)),
        ('Other Allowance', earnings.get('other_allowance', 0)),
    ]
    
    for name, amount in earnings_items:
        if amount and amount > 0:
            earnings_rows.append([name, format_currency(amount)])
    
    gross = payroll_record.get('gross_salary', 0)
    earnings_rows.append(['Gross Salary', format_currency(gross)])
    
    # Deductions Column
    deductions_rows = [['DEDUCTIONS', 'Amount (₹)']]
    deductions_items = [
        ('EPF (Employee 12%)', deductions.get('epf', 0)),
        ('ESIC (0.75%)', deductions.get('esic', 0) if deductions.get('esic_applicable') else 0),
        ('Professional Tax', deductions.get('professional_tax', 0)),
        ('LOP Deduction', deductions.get('lop_deduction', 0)),
        ('Advance EMI', deductions.get('advance_emi', 0)),
        ('Other Deductions', deductions.get('other_deductions', 0)),
    ]
    
    for name, amount in deductions_items:
        if amount and amount > 0:
            deductions_rows.append([name, format_currency(amount)])
    
    total_deductions = payroll_record.get('total_deductions', 0)
    deductions_rows.append(['Total Deductions', format_currency(total_deductions)])
    
    # Make both columns same height
    max_rows = max(len(earnings_rows), len(deductions_rows))
    while len(earnings_rows) < max_rows:
        earnings_rows.insert(-1, ['', ''])
    while len(deductions_rows) < max_rows:
        deductions_rows.insert(-1, ['', ''])
    
    # Create earnings table
    earnings_table = Table(earnings_rows, colWidths=[140, 90])
    earnings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#dcfce7')),
        ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold', 9),
    ]))
    
    # Create deductions table
    deductions_table = Table(deductions_rows, colWidths=[140, 90])
    deductions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fee2e2')),
        ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold', 9),
    ]))
    
    # Combine into side-by-side layout
    combined_table = Table([[earnings_table, deductions_table]], colWidths=[235, 235])
    combined_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(combined_table)
    elements.append(Spacer(1, 20))
    
    # Net Salary Box
    net_salary = payroll_record.get('net_salary', 0)
    
    net_data = [
        ['NET SALARY PAYABLE', format_currency(net_salary)]
    ]
    
    net_table = Table(net_data, colWidths=[300, 160])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ACCENT_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONT', (0, 0), (-1, -1), 'Helvetica-Bold', 14),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 15))
    
    # Employer Contributions (Info Section)
    employer_contrib = payroll_record.get('employer_contributions', {})
    ctc = payroll_record.get('ctc', 0)
    
    elements.append(Paragraph("EMPLOYER CONTRIBUTIONS (Not deducted from salary)", ParagraphStyle(
        'InfoHeader',
        fontSize=9,
        textColor=colors.grey,
        spaceBefore=10,
        spaceAfter=5
    )))
    
    contrib_data = [
        ['EPF (12%)', format_currency(employer_contrib.get('epf', 0)),
         'ESIC (3.25%)', format_currency(employer_contrib.get('esic', 0)),
         'CTC', format_currency(ctc)]
    ]
    
    contrib_table = Table(contrib_data, colWidths=[70, 80, 80, 80, 50, 100])
    contrib_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 8),
        ('FONT', (2, 0), (2, -1), 'Helvetica-Bold', 8),
        ('FONT', (4, 0), (4, -1), 'Helvetica-Bold', 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(contrib_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    elements.append(Paragraph(
        "This is a computer-generated document. No signature is required.",
        ParagraphStyle('Footer', fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    ))
    
    generated_date = datetime.now().strftime('%d-%m-%Y %H:%M')
    elements.append(Paragraph(
        f"Generated on: {generated_date}",
        ParagraphStyle('FooterDate', fontSize=8, textColor=colors.grey, alignment=TA_CENTER, spaceBefore=5)
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/payslip/{record_id}/pdf")
async def download_payslip_pdf(record_id: str):
    """Download payslip PDF for a specific payroll record"""
    # Get payroll record
    payroll_record = await db.hr_payroll.find_one({"id": record_id}, {"_id": 0})
    if not payroll_record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    # Get employee details
    emp_id = payroll_record.get('emp_id')
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    
    # Get org settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    
    # Generate PDF
    pdf_buffer = generate_payslip_pdf(payroll_record, employee, org_settings)
    
    # Create filename
    month_name = get_month_name(payroll_record.get('month', 0))
    year = payroll_record.get('year', datetime.now().year)
    emp_name = payroll_record.get('emp_name', 'Employee').replace(' ', '_')
    filename = f"Payslip_{emp_name}_{month_name}_{year}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf"
        }
    )


@router.get("/payslip/{emp_id}/{month}/{year}/pdf")
async def download_payslip_by_employee(emp_id: str, month: int, year: int):
    """Download payslip PDF for an employee by month/year"""
    # Get payroll record
    payroll_record = await db.hr_payroll.find_one(
        {"emp_id": emp_id, "month": month, "year": year},
        {"_id": 0}
    )
    if not payroll_record:
        raise HTTPException(status_code=404, detail="Payroll record not found for this employee/period")
    
    # Get employee details
    employee = await db.hr_employees.find_one(
        {"$or": [{"emp_id": emp_id}, {"id": emp_id}]},
        {"_id": 0}
    )
    
    # Get org settings
    org_settings = await db.settings.find_one({"type": "organization"}, {"_id": 0})
    
    # Generate PDF
    pdf_buffer = generate_payslip_pdf(payroll_record, employee, org_settings)
    
    # Create filename
    month_name = get_month_name(month)
    emp_name = payroll_record.get('emp_name', 'Employee').replace(' ', '_')
    filename = f"Payslip_{emp_name}_{month_name}_{year}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf"
        }
    )
