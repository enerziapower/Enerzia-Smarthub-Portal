"""
Structured Error Handling Utilities
Provides consistent, user-friendly error messages across the API
"""
from fastapi import HTTPException
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class APIError(HTTPException):
    """Custom API Error with structured response"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        field: Optional[str] = None
    ):
        self.error_code = error_code
        self.field = field
        self.details = details or {}
        
        detail = {
            "error_code": error_code,
            "message": message,
            "field": field,
            "details": details
        }
        
        super().__init__(status_code=status_code, detail=detail)


# ==================== Authentication Errors ====================

class AuthenticationError:
    """Authentication-related error messages"""
    
    @staticmethod
    def invalid_credentials():
        return APIError(
            status_code=401,
            error_code="AUTH_INVALID_CREDENTIALS",
            message="Invalid email or password. Please check your credentials and try again."
        )
    
    @staticmethod
    def email_not_found(email: str):
        return APIError(
            status_code=401,
            error_code="AUTH_EMAIL_NOT_FOUND",
            message=f"No account found with email: {email}",
            field="email"
        )
    
    @staticmethod
    def invalid_password():
        return APIError(
            status_code=401,
            error_code="AUTH_INVALID_PASSWORD",
            message="Incorrect password. Please try again.",
            field="password"
        )
    
    @staticmethod
    def account_disabled():
        return APIError(
            status_code=403,
            error_code="AUTH_ACCOUNT_DISABLED",
            message="Your account has been disabled. Please contact your administrator."
        )
    
    @staticmethod
    def account_locked(minutes_remaining: int = 30):
        return APIError(
            status_code=403,
            error_code="AUTH_ACCOUNT_LOCKED",
            message=f"Account temporarily locked due to too many failed attempts. Try again in {minutes_remaining} minutes.",
            details={"minutes_remaining": minutes_remaining}
        )
    
    @staticmethod
    def token_expired():
        return APIError(
            status_code=401,
            error_code="AUTH_TOKEN_EXPIRED",
            message="Your session has expired. Please log in again."
        )
    
    @staticmethod
    def token_invalid():
        return APIError(
            status_code=401,
            error_code="AUTH_TOKEN_INVALID",
            message="Invalid authentication token. Please log in again."
        )
    
    @staticmethod
    def refresh_token_expired():
        return APIError(
            status_code=401,
            error_code="AUTH_REFRESH_TOKEN_EXPIRED",
            message="Your session has expired completely. Please log in again."
        )
    
    @staticmethod
    def permission_denied(required_role: str = None):
        message = "You don't have permission to perform this action."
        if required_role:
            message += f" Required role: {required_role}"
        return APIError(
            status_code=403,
            error_code="AUTH_PERMISSION_DENIED",
            message=message,
            details={"required_role": required_role} if required_role else None
        )


# ==================== Validation Errors ====================

class ValidationError:
    """Input validation error messages"""
    
    @staticmethod
    def required_field(field: str, display_name: str = None):
        name = display_name or field.replace("_", " ").title()
        return APIError(
            status_code=400,
            error_code="VALIDATION_REQUIRED",
            message=f"{name} is required.",
            field=field
        )
    
    @staticmethod
    def invalid_format(field: str, expected_format: str, display_name: str = None):
        name = display_name or field.replace("_", " ").title()
        return APIError(
            status_code=400,
            error_code="VALIDATION_INVALID_FORMAT",
            message=f"Invalid {name} format. Expected: {expected_format}",
            field=field,
            details={"expected_format": expected_format}
        )
    
    @staticmethod
    def invalid_email(email: str):
        return APIError(
            status_code=400,
            error_code="VALIDATION_INVALID_EMAIL",
            message=f"'{email}' is not a valid email address.",
            field="email"
        )
    
    @staticmethod
    def invalid_date(field: str, value: str):
        return APIError(
            status_code=400,
            error_code="VALIDATION_INVALID_DATE",
            message=f"Invalid date format for {field}: '{value}'. Use YYYY-MM-DD format.",
            field=field,
            details={"provided_value": value, "expected_format": "YYYY-MM-DD"}
        )
    
    @staticmethod
    def value_too_long(field: str, max_length: int, display_name: str = None):
        name = display_name or field.replace("_", " ").title()
        return APIError(
            status_code=400,
            error_code="VALIDATION_TOO_LONG",
            message=f"{name} exceeds maximum length of {max_length} characters.",
            field=field,
            details={"max_length": max_length}
        )
    
    @staticmethod
    def value_out_of_range(field: str, min_val: float = None, max_val: float = None):
        if min_val is not None and max_val is not None:
            message = f"{field} must be between {min_val} and {max_val}."
        elif min_val is not None:
            message = f"{field} must be at least {min_val}."
        else:
            message = f"{field} must not exceed {max_val}."
        
        return APIError(
            status_code=400,
            error_code="VALIDATION_OUT_OF_RANGE",
            message=message,
            field=field,
            details={"min": min_val, "max": max_val}
        )


# ==================== Resource Errors ====================

class ResourceError:
    """Resource-related error messages"""
    
    @staticmethod
    def not_found(resource_type: str, identifier: str = None):
        message = f"{resource_type} not found"
        if identifier:
            message += f": {identifier}"
        return APIError(
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            message=message,
            details={"resource_type": resource_type, "identifier": identifier}
        )
    
    @staticmethod
    def already_exists(resource_type: str, field: str, value: str):
        return APIError(
            status_code=409,
            error_code="RESOURCE_ALREADY_EXISTS",
            message=f"A {resource_type} with {field} '{value}' already exists.",
            field=field,
            details={"resource_type": resource_type, "conflicting_value": value}
        )
    
    @staticmethod
    def cannot_delete(resource_type: str, reason: str):
        return APIError(
            status_code=409,
            error_code="RESOURCE_CANNOT_DELETE",
            message=f"Cannot delete {resource_type}: {reason}",
            details={"resource_type": resource_type, "reason": reason}
        )
    
    @staticmethod
    def in_use(resource_type: str, used_by: str):
        return APIError(
            status_code=409,
            error_code="RESOURCE_IN_USE",
            message=f"Cannot modify {resource_type} because it is being used by {used_by}.",
            details={"resource_type": resource_type, "used_by": used_by}
        )


# ==================== Server/Processing Errors ====================

class ProcessingError:
    """Processing and server error messages"""
    
    @staticmethod
    def pdf_generation_failed(reason: str = None):
        message = "Failed to generate PDF"
        if reason:
            message += f": {reason}"
        return APIError(
            status_code=500,
            error_code="PDF_GENERATION_FAILED",
            message=message,
            details={"reason": reason}
        )
    
    @staticmethod
    def file_upload_failed(filename: str, reason: str = None):
        message = f"Failed to upload file '{filename}'"
        if reason:
            message += f": {reason}"
        return APIError(
            status_code=500,
            error_code="FILE_UPLOAD_FAILED",
            message=message,
            details={"filename": filename, "reason": reason}
        )
    
    @staticmethod
    def file_too_large(filename: str, max_size_mb: int):
        return APIError(
            status_code=413,
            error_code="FILE_TOO_LARGE",
            message=f"File '{filename}' exceeds the maximum size of {max_size_mb}MB.",
            details={"filename": filename, "max_size_mb": max_size_mb}
        )
    
    @staticmethod
    def invalid_file_type(filename: str, allowed_types: list):
        return APIError(
            status_code=400,
            error_code="INVALID_FILE_TYPE",
            message=f"File type not allowed for '{filename}'. Allowed types: {', '.join(allowed_types)}",
            details={"filename": filename, "allowed_types": allowed_types}
        )
    
    @staticmethod
    def database_error(operation: str = None):
        message = "A database error occurred"
        if operation:
            message += f" while {operation}"
        message += ". Please try again."
        return APIError(
            status_code=500,
            error_code="DATABASE_ERROR",
            message=message,
            details={"operation": operation}
        )
    
    @staticmethod
    def external_service_error(service_name: str, reason: str = None):
        message = f"Error communicating with {service_name}"
        if reason:
            message += f": {reason}"
        return APIError(
            status_code=502,
            error_code="EXTERNAL_SERVICE_ERROR",
            message=message,
            details={"service": service_name, "reason": reason}
        )
    
    @staticmethod
    def rate_limit_exceeded(retry_after_seconds: int = 60):
        return APIError(
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            message=f"Too many requests. Please wait {retry_after_seconds} seconds before trying again.",
            details={"retry_after_seconds": retry_after_seconds}
        )


# ==================== Helper Functions ====================

def log_error(error: APIError, user_id: str = None, context: Dict[str, Any] = None):
    """Log error with context for debugging"""
    log_data = {
        "error_code": error.error_code,
        "status_code": error.status_code,
        "user_id": user_id,
        "context": context
    }
    logger.error(f"API Error: {error.detail}", extra=log_data)
