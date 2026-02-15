"""
File Upload Routes
Handles file uploads for PO attachments, statutory documents, photos, etc.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pathlib import Path
import uuid
from datetime import datetime

router = APIRouter()

# Create uploads directory
UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload-po")
async def upload_po_attachment(file: UploadFile = File(...)):
    """Upload a PO attachment file"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 10MB limit. Current size: {len(contents) / (1024*1024):.2f}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename.replace(' ', '_')}"
    file_path = UPLOADS_DIR / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    return {
        "filename": safe_filename,
        "original_filename": file.filename,
        "path": f"/uploads/{safe_filename}"
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(default="general")
):
    """
    Generic file upload endpoint for various categories:
    - statutory_document: PDF files for AMC statutory documents
    - calibration_certificate: Calibration certificates
    - general: General file uploads
    """
    # Define allowed extensions per category
    category_extensions = {
        "statutory_document": {'.pdf'},
        "calibration_certificate": {'.pdf'},
        "general": ALLOWED_EXTENSIONS
    }
    
    allowed = category_extensions.get(category, ALLOWED_EXTENSIONS)
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed for {category}. Allowed types: {', '.join(allowed)}"
        )
    
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 10MB limit. Current size: {len(contents) / (1024*1024):.2f}MB"
        )
    
    # Create category subdirectory
    category_dir = UPLOADS_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}_{file.filename.replace(' ', '_')}"
    file_path = category_dir / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Return file URL
    file_url = f"/api/uploads/{category}/{safe_filename}"
    
    return {
        "success": True,
        "filename": safe_filename,
        "original_filename": file.filename,
        "file_url": file_url,
        "url": file_url,  # Alternative key for compatibility
        "category": category,
        "size": len(contents),
        "content_type": file.content_type
    }


@router.get("/uploads/{category}/{filename}")
async def get_uploaded_file_by_category(category: str, filename: str):
    """Serve uploaded files from category subdirectories"""
    file_path = UPLOADS_DIR / category / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(file_path, "rb"),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files from root uploads directory"""
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(filename).suffix.lower()
    content_types = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(file_path, "rb"),
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
