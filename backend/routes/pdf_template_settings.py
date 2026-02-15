"""
PDF Template Settings Routes
Admin-configurable settings for all PDF reports including branding, colors, 
company information, and per-report-type cover page designs.
"""
from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone
from pathlib import Path
import uuid
import os
import io
import math

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

router = APIRouter(prefix="/api/pdf-template", tags=["PDF Template Settings"])

# MongoDB connections
mongo_url = os.environ.get('MONGO_URL')
async_client = AsyncIOMotorClient(mongo_url)
async_db = async_client[os.environ.get('DB_NAME', 'enerzia')]
sync_client = MongoClient(mongo_url)
sync_db = sync_client[os.environ.get('DB_NAME', 'enerzia')]

# Uploads directory - must match the static files mount in server.py
UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Report types
REPORT_TYPES = [
    'amc',
    'calibration', 
    'wcc',
    'equipment_test',
    'ir_thermography',
    'service',
    'project_completion',
    'project_schedule'
]

# Reports that have cover pages (front and back)
REPORTS_WITH_COVER_PAGES = [
    'amc',
    'calibration',
    'ir_thermography',
    'project_completion',
    'project_schedule'
]

# Reports that only have header/footer (no cover pages)
REPORTS_HEADER_FOOTER_ONLY = [
    'wcc',
    'equipment_test',
    'service'
]

REPORT_TYPE_LABELS = {
    'amc': 'AMC Reports',
    'calibration': 'Calibration Reports',
    'wcc': 'Work Completion Certificate',
    'equipment_test': 'Equipment Test Reports',
    'ir_thermography': 'IR Thermography Reports',
    'service': 'Service Reports',
    'project_completion': 'Project Completion Reports',
    'project_schedule': 'Project Schedule Reports'
}

# ==================== DECORATIVE DESIGNS ====================
# 6 different decorative curve designs for cover pages

DESIGN_OPTIONS = {
    'design_1': {
        'name': 'Flowing Waves',
        'description': 'Elegant flowing curves at top-right and bottom-left corners'
    },
    'design_2': {
        'name': 'Geometric Arcs',
        'description': 'Bold geometric arc patterns'
    },
    'design_3': {
        'name': 'Diagonal Stripes',
        'description': 'Dynamic diagonal stripe accents'
    },
    'design_4': {
        'name': 'Corner Brackets',
        'description': 'Modern corner bracket frames'
    },
    'design_5': {
        'name': 'Circular Dots',
        'description': 'Minimalist circular dot pattern'
    },
    'design_6': {
        'name': 'Multi-Color Waves',
        'description': 'Elegant flowing waves in teal, blue, and green'
    }
}


# ==================== MODELS ====================

class PDFBrandingSettings(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#F7931E"
    secondary_color: str = "#2d7a4e"
    header_text_color: str = "#333333"
    footer_text_color: str = "#666666"


class PDFCompanyInfo(BaseModel):
    company_name: str = "Enerzia Power Solutions"
    tagline: Optional[str] = "Powering Excellence"
    address_line1: Optional[str] = "No.9, Akshaya, Sundaresan Nagar"
    address_line2: Optional[str] = "ELumalai Chettiar Road, Maduravoyal"
    city: Optional[str] = "Chennai"
    state: Optional[str] = "Tamil Nadu"
    country: str = "India"
    postal_code: Optional[str] = "600095"
    phone: Optional[str] = "+91 44 45487875"
    alt_phone: Optional[str] = "+91 9789894644"
    email: Optional[str] = "info@enerzia.com"
    website: str = "www.enerzia.com"
    gst_number: Optional[str] = None


class PDFCoverPageSettings(BaseModel):
    show_logo: bool = True
    show_decorative_design: bool = True
    show_submitted_by: bool = True
    submitted_by_title: str = "Submitted By"
    show_footer_line: bool = True
    title_font_size: int = 24
    subtitle_font_size: int = 14


class PDFBackCoverSettings(BaseModel):
    enabled: bool = True
    title: str = "Contact Us"
    show_logo: bool = True
    show_address: bool = True
    show_phone: bool = True
    show_email: bool = True
    show_website: bool = True
    additional_text: Optional[str] = None


class PDFHeaderFooterSettings(BaseModel):
    show_header: bool = True
    show_footer: bool = True
    show_page_numbers: bool = True
    show_header_logo: bool = True
    show_header_line: bool = True
    show_footer_line: bool = True
    footer_company_name: bool = True
    footer_website: bool = True


class ReportTypeDesign(BaseModel):
    design_id: str = "design_1"
    design_color: str = "#F7931E"


class PDFTemplateSettings(BaseModel):
    id: str = "pdf_template_settings"
    branding: PDFBrandingSettings = PDFBrandingSettings()
    company_info: PDFCompanyInfo = PDFCompanyInfo()
    cover_page: PDFCoverPageSettings = PDFCoverPageSettings()
    back_cover: PDFBackCoverSettings = PDFBackCoverSettings()
    header_footer: PDFHeaderFooterSettings = PDFHeaderFooterSettings()
    # Only reports with cover pages have design settings
    report_designs: Dict[str, ReportTypeDesign] = {
        'amc': ReportTypeDesign(design_id='design_1', design_color='#F7931E'),
        'calibration': ReportTypeDesign(design_id='design_2', design_color='#2563eb'),
        'ir_thermography': ReportTypeDesign(design_id='design_3', design_color='#ef4444'),
        'project_completion': ReportTypeDesign(design_id='design_4', design_color='#06b6d4'),
        'project_schedule': ReportTypeDesign(design_id='design_1', design_color='#0d9488'),
    }
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class PDFTemplateUpdate(BaseModel):
    branding: Optional[PDFBrandingSettings] = None
    company_info: Optional[PDFCompanyInfo] = None
    cover_page: Optional[PDFCoverPageSettings] = None
    back_cover: Optional[PDFBackCoverSettings] = None
    header_footer: Optional[PDFHeaderFooterSettings] = None
    report_designs: Optional[Dict[str, ReportTypeDesign]] = None


# ==================== HELPER FUNCTIONS ====================

def get_default_settings() -> dict:
    return PDFTemplateSettings().dict()


async def get_pdf_settings() -> dict:
    settings = await async_db.pdf_template_settings.find_one({"id": "pdf_template_settings"})
    if settings:
        settings.pop('_id', None)
        return settings
    return get_default_settings()


def get_pdf_settings_sync() -> dict:
    settings = sync_db.pdf_template_settings.find_one({"id": "pdf_template_settings"})
    if settings:
        settings.pop('_id', None)
        return settings
    return get_default_settings()


def get_logo_path(settings: dict = None) -> Optional[str]:
    """Get the actual file path for the logo"""
    if settings is None:
        settings = get_pdf_settings_sync()
    
    logo_url = settings.get('branding', {}).get('logo_url')
    
    if logo_url:
        # Convert API URL to file path - must match UPLOADS_DIR
        if logo_url.startswith('/api/uploads/'):
            logo_path = logo_url.replace('/api/uploads/', '/app/uploads/')
        else:
            logo_path = f"/app/uploads/{logo_url.split('/')[-1]}"
        
        if os.path.exists(logo_path):
            return logo_path
    
    # Fallback to default logo
    default_logo = "/app/backend/assets/enerzia_logo.jpg"
    if os.path.exists(default_logo):
        return default_logo
    
    return None


def get_primary_color(settings: dict = None) -> colors.Color:
    if settings is None:
        settings = get_pdf_settings_sync()
    color_hex = settings.get('branding', {}).get('primary_color', '#F7931E')
    return colors.HexColor(color_hex)


def get_secondary_color(settings: dict = None) -> colors.Color:
    if settings is None:
        settings = get_pdf_settings_sync()
    color_hex = settings.get('branding', {}).get('secondary_color', '#2d7a4e')
    return colors.HexColor(color_hex)


def get_company_info(settings: dict = None) -> dict:
    if settings is None:
        settings = get_pdf_settings_sync()
    defaults = PDFCompanyInfo().dict()
    return {**defaults, **settings.get('company_info', {})}


def get_report_design(report_type: str, settings: dict = None) -> dict:
    """Get the design settings for a specific report type"""
    if settings is None:
        settings = get_pdf_settings_sync()
    
    report_designs = settings.get('report_designs', {})
    design = report_designs.get(report_type, {})
    
    return {
        'design_id': design.get('design_id', 'design_1'),
        'design_color': design.get('design_color', '#F7931E')
    }


# ==================== DECORATIVE DESIGN DRAWING FUNCTIONS ====================

def draw_design_1(c, width, height, color_hex):
    """Design 1: Flowing Waves - Elegant flowing curves"""
    color = colors.HexColor(color_hex)
    r, g, b = color.red, color.green, color.blue
    
    # Top-right flowing waves
    c.saveState()
    for i, alpha in enumerate([0.10, 0.18, 0.30]):
        c.setFillColor(colors.Color(r, g, b, alpha))
        path = c.beginPath()
        path.moveTo(width * (0.55 + i*0.06), height)
        path.curveTo(width * (0.80 - i*0.03), height * (0.92 - i*0.02),
                    width - (i * 20), height * (0.78 - i*0.02),
                    width - (i * 20), height * (0.65 + i*0.03))
        path.lineTo(width, height * (0.65 + i*0.03))
        path.lineTo(width, height)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    
    # Bottom-left flowing waves
    for i, alpha in enumerate([0.10, 0.18, 0.30]):
        c.setFillColor(colors.Color(r, g, b, alpha))
        bottom_path = c.beginPath()
        bottom_path.moveTo(0, height * (0.25 - i*0.03))
        bottom_path.curveTo(width * 0.08, height * (0.18 - i*0.02),
                           width * 0.20, height * (0.08 - i*0.01),
                           width * (0.35 + i*0.05), 0)
        bottom_path.lineTo(0, 0)
        bottom_path.close()
        c.drawPath(bottom_path, fill=1, stroke=0)
    c.restoreState()


def draw_design_2(c, width, height, color_hex):
    """Design 2: Geometric Arcs - Bold arc patterns"""
    color = colors.HexColor(color_hex)
    r, g, b = color.red, color.green, color.blue
    
    c.saveState()
    # Top-right quarter circles
    for i, (radius, alpha) in enumerate([(180, 0.30), (140, 0.20), (100, 0.12)]):
        c.setFillColor(colors.Color(r, g, b, alpha))
        c.circle(width, height, radius, fill=1, stroke=0)
    
    # Bottom-left quarter circles
    for i, (radius, alpha) in enumerate([(180, 0.30), (140, 0.20), (100, 0.12)]):
        c.setFillColor(colors.Color(r, g, b, alpha))
        c.circle(0, 0, radius, fill=1, stroke=0)
    c.restoreState()


def draw_design_3(c, width, height, color_hex):
    """Design 3: Diagonal Stripes - Dynamic stripe accents"""
    color = colors.HexColor(color_hex)
    r, g, b = color.red, color.green, color.blue
    
    c.saveState()
    # Top-right diagonal stripes
    stripe_width = 25
    for i in range(5):
        alpha = 0.30 - (i * 0.05)
        c.setFillColor(colors.Color(r, g, b, alpha))
        path = c.beginPath()
        offset = i * stripe_width * 1.5
        path.moveTo(width - 200 + offset, height)
        path.lineTo(width, height)
        path.lineTo(width, height - 200 + offset)
        path.lineTo(width - 200 + offset + stripe_width, height)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    
    # Bottom-left diagonal stripes
    for i in range(5):
        alpha = 0.30 - (i * 0.05)
        c.setFillColor(colors.Color(r, g, b, alpha))
        path = c.beginPath()
        offset = i * stripe_width * 1.5
        path.moveTo(0, 200 - offset)
        path.lineTo(0, 0)
        path.lineTo(200 - offset, 0)
        path.lineTo(0, 200 - offset - stripe_width)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    c.restoreState()


def draw_design_4(c, width, height, color_hex):
    """Design 4: Corner Brackets - Modern corner frames"""
    color = colors.HexColor(color_hex)
    r, g, b = color.red, color.green, color.blue
    
    c.saveState()
    bracket_size = 120
    bracket_thickness = 8
    
    # Top-right bracket
    for i, alpha in enumerate([0.30, 0.20, 0.12]):
        offset = i * 15
        c.setFillColor(colors.Color(r, g, b, alpha))
        # Horizontal part
        c.rect(width - bracket_size - offset, height - bracket_thickness - offset, 
               bracket_size, bracket_thickness, fill=1, stroke=0)
        # Vertical part
        c.rect(width - bracket_thickness - offset, height - bracket_size - offset,
               bracket_thickness, bracket_size, fill=1, stroke=0)
    
    # Bottom-left bracket
    for i, alpha in enumerate([0.30, 0.20, 0.12]):
        offset = i * 15
        c.setFillColor(colors.Color(r, g, b, alpha))
        # Horizontal part
        c.rect(offset, offset, bracket_size, bracket_thickness, fill=1, stroke=0)
        # Vertical part
        c.rect(offset, offset, bracket_thickness, bracket_size, fill=1, stroke=0)
    c.restoreState()


def draw_design_5(c, width, height, color_hex):
    """Design 5: Circular Dots - Minimalist dot pattern"""
    color = colors.HexColor(color_hex)
    r, g, b = color.red, color.green, color.blue
    
    c.saveState()
    # Top-right dot cluster
    dots_tr = [
        (width - 40, height - 40, 25, 0.30),
        (width - 90, height - 30, 18, 0.25),
        (width - 50, height - 90, 15, 0.20),
        (width - 120, height - 70, 12, 0.15),
        (width - 80, height - 120, 10, 0.12),
        (width - 140, height - 40, 8, 0.10),
    ]
    for x, y, radius, alpha in dots_tr:
        c.setFillColor(colors.Color(r, g, b, alpha))
        c.circle(x, y, radius, fill=1, stroke=0)
    
    # Bottom-left dot cluster
    dots_bl = [
        (40, 40, 25, 0.30),
        (90, 30, 18, 0.25),
        (50, 90, 15, 0.20),
        (120, 70, 12, 0.15),
        (80, 120, 10, 0.12),
        (140, 40, 8, 0.10),
    ]
    for x, y, radius, alpha in dots_bl:
        c.setFillColor(colors.Color(r, g, b, alpha))
        c.circle(x, y, radius, fill=1, stroke=0)
    c.restoreState()


def draw_design_6(c, width, height, color_hex):
    """Design 6: Multi-Color Waves - Elegant flowing waves in teal, blue, and green
    
    This design uses multiple colors (teal, deep blue, mint green) for a richer,
    more vibrant look compared to design_1 which uses a single color with opacity variations.
    """
    c.saveState()
    
    # Define the multi-color palette - teal, deep blue, mint green
    wave_colors = [
        (0.0, 0.51, 0.59),   # Teal/Cyan (#008396)
        (0.16, 0.32, 0.55),  # Deep Blue (#29528C)
        (0.4, 0.73, 0.6),    # Mint Green (#66BA99)
    ]
    
    # Top-right flowing waves with different colors
    for i, (r, g, b) in enumerate(wave_colors):
        alpha = 0.35 - (i * 0.08)  # Varying opacity
        c.setFillColor(colors.Color(r, g, b, alpha))
        path = c.beginPath()
        # Each wave has slightly different curve parameters
        offset_x = i * 0.05
        offset_y = i * 0.02
        path.moveTo(width * (0.50 + offset_x), height)
        path.curveTo(width * (0.75 - offset_x), height * (0.90 - offset_y),
                    width - (i * 25), height * (0.75 - offset_y),
                    width - (i * 25), height * (0.60 + i*0.04))
        path.lineTo(width, height * (0.60 + i*0.04))
        path.lineTo(width, height)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    
    # Add another set of overlapping waves for depth
    for i, (r, g, b) in enumerate(reversed(wave_colors)):
        alpha = 0.20 - (i * 0.05)
        c.setFillColor(colors.Color(r, g, b, alpha))
        path = c.beginPath()
        path.moveTo(width * (0.65 + i*0.04), height)
        path.curveTo(width * (0.85 - i*0.02), height * (0.88 - i*0.03),
                    width - (i * 15), height * (0.72 - i*0.02),
                    width - (i * 15), height * (0.55 + i*0.05))
        path.lineTo(width, height * (0.55 + i*0.05))
        path.lineTo(width, height)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    
    # Bottom-left flowing waves with different colors
    for i, (r, g, b) in enumerate(wave_colors):
        alpha = 0.35 - (i * 0.08)
        c.setFillColor(colors.Color(r, g, b, alpha))
        bottom_path = c.beginPath()
        offset_x = i * 0.04
        offset_y = i * 0.03
        bottom_path.moveTo(0, height * (0.30 - offset_y))
        bottom_path.curveTo(width * 0.10, height * (0.22 - offset_y),
                           width * 0.25, height * (0.10 - offset_y/2),
                           width * (0.40 + offset_x), 0)
        bottom_path.lineTo(0, 0)
        bottom_path.close()
        c.drawPath(bottom_path, fill=1, stroke=0)
    
    # Add overlapping waves at bottom for depth
    for i, (r, g, b) in enumerate(reversed(wave_colors)):
        alpha = 0.20 - (i * 0.05)
        c.setFillColor(colors.Color(r, g, b, alpha))
        bottom_path = c.beginPath()
        bottom_path.moveTo(0, height * (0.22 - i*0.03))
        bottom_path.curveTo(width * 0.08, height * (0.16 - i*0.02),
                           width * 0.18, height * (0.07 - i*0.01),
                           width * (0.32 + i*0.04), 0)
        bottom_path.lineTo(0, 0)
        bottom_path.close()
        c.drawPath(bottom_path, fill=1, stroke=0)
    
    c.restoreState()


DESIGN_FUNCTIONS = {
    'design_1': draw_design_1,
    'design_2': draw_design_2,
    'design_3': draw_design_3,
    'design_4': draw_design_4,
    'design_5': draw_design_5,
    'design_6': draw_design_6,
}


def draw_decorative_design(c, width, height, design_id, color_hex):
    """Draw the selected decorative design"""
    draw_func = DESIGN_FUNCTIONS.get(design_id, draw_design_1)
    draw_func(c, width, height, color_hex)


# ==================== API ROUTES ====================

@router.get("/settings")
async def get_template_settings():
    settings = await get_pdf_settings()
    return settings


@router.get("/designs")
async def get_design_options():
    """Get available decorative design options and report type categories"""
    return {
        "designs": DESIGN_OPTIONS,
        "report_types": REPORT_TYPE_LABELS,
        "reports_with_cover_pages": REPORTS_WITH_COVER_PAGES,
        "reports_header_footer_only": REPORTS_HEADER_FOOTER_ONLY
    }


@router.put("/settings")
async def update_template_settings(update: PDFTemplateUpdate):
    current = await get_pdf_settings()
    
    if update.branding:
        current['branding'] = {**current.get('branding', {}), **update.branding.dict(exclude_none=True)}
    if update.company_info:
        current['company_info'] = {**current.get('company_info', {}), **update.company_info.dict(exclude_none=True)}
    if update.cover_page:
        current['cover_page'] = {**current.get('cover_page', {}), **update.cover_page.dict(exclude_none=True)}
    if update.back_cover:
        current['back_cover'] = {**current.get('back_cover', {}), **update.back_cover.dict(exclude_none=True)}
    if update.header_footer:
        current['header_footer'] = {**current.get('header_footer', {}), **update.header_footer.dict(exclude_none=True)}
    if update.report_designs:
        existing_designs = current.get('report_designs', {})
        for report_type, design in update.report_designs.items():
            if isinstance(design, dict):
                existing_designs[report_type] = design
            else:
                existing_designs[report_type] = design.dict()
        current['report_designs'] = existing_designs
    
    current['updated_at'] = datetime.now(timezone.utc).isoformat()
    current['id'] = "pdf_template_settings"
    
    await async_db.pdf_template_settings.update_one(
        {"id": "pdf_template_settings"},
        {"$set": current},
        upsert=True
    )
    
    return {"message": "Settings updated successfully", "settings": current}


@router.put("/report-design/{report_type}")
async def update_report_design(report_type: str, design_id: str, design_color: str = "#F7931E"):
    """Update design for a specific report type"""
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Must be one of: {REPORT_TYPES}")
    
    if design_id not in DESIGN_OPTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid design. Must be one of: {list(DESIGN_OPTIONS.keys())}")
    
    await async_db.pdf_template_settings.update_one(
        {"id": "pdf_template_settings"},
        {"$set": {
            f"report_designs.{report_type}": {
                "design_id": design_id,
                "design_color": design_color
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": f"Design updated for {report_type}", "design_id": design_id, "design_color": design_color}


@router.post("/upload-logo")
async def upload_pdf_logo(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"pdf_logo_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    logo_url = f"/api/uploads/{filename}"
    
    await async_db.pdf_template_settings.update_one(
        {"id": "pdf_template_settings"},
        {"$set": {
            "branding.logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url, "filename": filename}


@router.get("/preview")
async def generate_preview_pdf(page_type: str = "all", report_type: str = "amc", t: str = None):
    """Generate a preview PDF showing how templates will look for a specific report type"""
    settings = await get_pdf_settings()
    
    buffer = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buffer, pagesize=A4)
    
    report_design = settings.get('report_designs', {}).get(report_type, {})
    design_id = report_design.get('design_id', 'design_1')
    design_color = report_design.get('design_color', '#F7931E')
    
    if page_type in ['cover', 'all']:
        draw_cover_page_preview(c, width, height, settings, report_type, design_id, design_color)
        c.showPage()
    
    if page_type in ['content', 'all']:
        draw_content_page_preview(c, width, height, settings, report_type)
        c.showPage()
    
    if page_type in ['back', 'all']:
        back_settings = settings.get('back_cover', {})
        if back_settings.get('enabled', True):
            draw_back_cover_preview(c, width, height, settings)
            c.showPage()
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=preview_{report_type}.pdf"}
    )


@router.get("/preview-designs")
async def preview_all_designs(design_color: str = "#F7931E"):
    """Generate a PDF showing all 5 design options"""
    buffer = io.BytesIO()
    width, height = A4
    c = canvas.Canvas(buffer, pagesize=A4)
    
    for design_id, design_info in DESIGN_OPTIONS.items():
        # White background
        c.setFillColor(colors.white)
        c.rect(0, 0, width, height, fill=1, stroke=0)
        
        # Draw the decorative design
        draw_decorative_design(c, width, height, design_id, design_color)
        
        # Add design name label
        c.setFillColor(colors.HexColor('#333333'))
        c.setFont('Helvetica-Bold', 24)
        c.drawCentredString(width/2, height/2 + 50, design_info['name'])
        
        c.setFont('Helvetica', 14)
        c.setFillColor(colors.HexColor('#666666'))
        c.drawCentredString(width/2, height/2 + 20, design_info['description'])
        
        c.setFont('Helvetica', 12)
        c.drawCentredString(width/2, height/2 - 20, f"Design ID: {design_id}")
        
        c.showPage()
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=design_options.pdf"}
    )


def draw_cover_page_preview(c, width, height, settings, report_type, design_id, design_color):
    """Draw cover page preview with selected design"""
    company_info = settings.get('company_info', {})
    cover_settings = settings.get('cover_page', {})
    
    company_name = company_info.get('company_name', 'Enerzia Power Solutions')
    website = company_info.get('website', 'www.enerzia.com')
    
    # White background
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    
    # Draw decorative design (if enabled)
    if cover_settings.get('show_decorative_design', True):
        draw_decorative_design(c, width, height, design_id, design_color)
    
    # Logo (if enabled)
    if cover_settings.get('show_logo', True):
        logo_path = get_logo_path(settings)
        if logo_path and os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, 35, height - 90, width=180, height=60, 
                           preserveAspectRatio=True, mask='auto')
            except Exception as e:
                print(f"Error drawing logo: {e}")
    
    # Title area
    margin = 40
    center_y = height / 2 + 50
    box_width = 400
    box_height = 180
    box_x = (width - box_width) / 2
    box_y = center_y - box_height / 2
    
    c.setStrokeColor(colors.HexColor(design_color))
    c.setLineWidth(2)
    c.rect(box_x, box_y, box_width, box_height)
    
    # Report title
    report_label = REPORT_TYPE_LABELS.get(report_type, 'REPORT')
    c.setFont('Helvetica-Bold', cover_settings.get('title_font_size', 24))
    c.setFillColor(colors.HexColor('#1e3a5f'))
    c.drawCentredString(width / 2, center_y + 40, report_label.upper())
    
    c.setFont('Helvetica', cover_settings.get('subtitle_font_size', 14))
    c.setFillColor(colors.HexColor(design_color))
    c.drawCentredString(width / 2, center_y + 15, "Preview Template")
    
    c.setFont('Helvetica', 11)
    c.setFillColor(colors.black)
    c.drawCentredString(width / 2, center_y - 20, "Contract No: SAMPLE-001")
    c.drawCentredString(width / 2, center_y - 40, "Customer: Sample Customer Pvt. Ltd.")
    c.drawCentredString(width / 2, center_y - 60, f"Date: {datetime.now().strftime('%d-%m-%Y')}")
    
    # Submitted By section (if enabled)
    if cover_settings.get('show_submitted_by', True):
        submit_x = width - 250
        submit_y = 130
        
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.HexColor('#1e3a5f'))
        c.drawString(submit_x, submit_y, cover_settings.get('submitted_by_title', 'Submitted By'))
        
        c.setFont('Helvetica-Bold', 13)
        c.drawString(submit_x, submit_y - 18, company_name)
        
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont('Helvetica', 7)
        y = submit_y - 32
        if company_info.get('address_line1'):
            c.drawString(submit_x, y, company_info.get('address_line1'))
            y -= 10
        if company_info.get('address_line2'):
            c.drawString(submit_x, y, company_info.get('address_line2'))
            y -= 10
        if company_info.get('city') or company_info.get('state'):
            city_state = f"{company_info.get('city', '')}, {company_info.get('state', '')}"
            if company_info.get('postal_code'):
                city_state += f", Pincode- {company_info.get('postal_code')}"
            c.drawString(submit_x, y, city_state.strip(', '))
    
    # Footer line (if enabled)
    if cover_settings.get('show_footer_line', True):
        footer_y = 40
        c.setStrokeColor(colors.HexColor(design_color))
        c.setLineWidth(2)
        c.line(margin, footer_y, width - margin, footer_y)
        
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.black)
        c.drawString(margin, footer_y - 15, company_name)
        
        c.setFillColor(colors.HexColor(design_color))
        c.drawRightString(width - margin, footer_y - 15, website)


def draw_content_page_preview(c, width, height, settings, report_type):
    """Draw content page preview"""
    company_info = settings.get('company_info', {})
    hf_settings = settings.get('header_footer', {})
    branding = settings.get('branding', {})
    
    company_name = company_info.get('company_name', 'Enerzia Power Solutions')
    website = company_info.get('website', 'www.enerzia.com')
    primary_color = colors.HexColor(branding.get('primary_color', '#F7931E'))
    
    margin = 40
    
    # Header
    if hf_settings.get('show_header', True):
        header_y = height - 30
        
        if hf_settings.get('show_header_logo', True):
            logo_path = get_logo_path(settings)
            if logo_path and os.path.exists(logo_path):
                try:
                    c.drawImage(logo_path, width - margin - 100, header_y - 20, 
                               width=100, height=35, preserveAspectRatio=True, mask='auto')
                except (IOError, OSError):
                    pass
        
        report_label = REPORT_TYPE_LABELS.get(report_type, 'REPORT')
        c.setFont('Helvetica-Bold', 12)
        c.setFillColor(colors.HexColor('#1e3a5f'))
        c.drawString(margin, header_y, report_label.upper())
        
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.HexColor('#666666'))
        c.drawString(margin, header_y - 15, "Report No: SAMPLE-001")
        
        if hf_settings.get('show_header_line', True):
            c.setStrokeColor(primary_color)
            c.setLineWidth(1)
            c.line(margin, header_y - 30, width - margin, header_y - 30)
    
    # Sample content
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(colors.black)
    c.drawString(margin, height - 120, "SAMPLE CONTENT PAGE")
    
    c.setFont('Helvetica', 11)
    c.drawString(margin, height - 150, "This is a preview of how content pages will look.")
    
    # Footer
    if hf_settings.get('show_footer', True):
        footer_y = 25
        
        if hf_settings.get('show_footer_line', True):
            c.setStrokeColor(primary_color)
            c.setLineWidth(1)
            c.line(margin, footer_y + 15, width - margin, footer_y + 15)
        
        if hf_settings.get('footer_company_name', True):
            c.setFont('Helvetica', 9)
            c.setFillColor(colors.black)
            c.drawString(margin, footer_y, company_name)
        
        if hf_settings.get('footer_website', True):
            c.setFillColor(primary_color)
            c.drawCentredString(width / 2, footer_y, website)
        
        if hf_settings.get('show_page_numbers', True):
            c.setFillColor(colors.HexColor('#666666'))
            c.drawRightString(width - margin, footer_y, "Page 2")


def draw_back_cover_preview(c, width, height, settings):
    """Draw back cover preview"""
    company_info = settings.get('company_info', {})
    back_settings = settings.get('back_cover', {})
    branding = settings.get('branding', {})
    
    company_name = company_info.get('company_name', 'Enerzia Power Solutions')
    website = company_info.get('website', 'www.enerzia.com')
    primary_color = colors.HexColor(branding.get('primary_color', '#F7931E'))
    
    # Title
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(primary_color)
    c.drawCentredString(width / 2, height - 100, back_settings.get('title', 'Contact Us'))
    
    # Decorative line
    c.setStrokeColor(primary_color)
    c.setLineWidth(2)
    c.line(width / 2 - 100, height - 115, width / 2 + 100, height - 115)
    
    # Logo
    if back_settings.get('show_logo', True):
        logo_path = get_logo_path(settings)
        if logo_path and os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, width / 2 - 100, height - 200, width=200, height=70, 
                           preserveAspectRatio=True, mask='auto')
            except (IOError, OSError):
                pass
    
    # Company info
    info_y = height - 280
    c.setFont('Helvetica-Bold', 16)
    c.setFillColor(colors.HexColor('#1e3a5f'))
    c.drawCentredString(width / 2, info_y, company_name)
    info_y -= 30
    
    if back_settings.get('show_address', True):
        c.setFont('Helvetica', 11)
        c.setFillColor(colors.black)
        if company_info.get('address_line1'):
            c.drawCentredString(width / 2, info_y, company_info.get('address_line1'))
            info_y -= 18
        if company_info.get('address_line2'):
            c.drawCentredString(width / 2, info_y, company_info.get('address_line2'))
            info_y -= 18
        if company_info.get('city') or company_info.get('state'):
            city_state = f"{company_info.get('city', '')}, {company_info.get('state', '')} {company_info.get('postal_code', '')}"
            c.drawCentredString(width / 2, info_y, city_state.strip())
            info_y -= 30
    
    if back_settings.get('show_phone', True) and company_info.get('phone'):
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(width / 2, info_y, f"Phone: {company_info.get('phone')}")
        info_y -= 25
    
    if back_settings.get('show_email', True) and company_info.get('email'):
        c.setFont('Helvetica', 11)
        c.drawCentredString(width / 2, info_y, f"Email: {company_info.get('email')}")
        info_y -= 25
    
    if back_settings.get('show_website', True):
        c.setFillColor(primary_color)
        c.setFont('Helvetica-Bold', 12)
        c.drawCentredString(width / 2, info_y, website)


@router.post("/reset")
async def reset_to_defaults():
    defaults = get_default_settings()
    defaults['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await async_db.pdf_template_settings.update_one(
        {"id": "pdf_template_settings"},
        {"$set": defaults},
        upsert=True
    )
    
    return {"message": "Settings reset to defaults", "settings": defaults}
