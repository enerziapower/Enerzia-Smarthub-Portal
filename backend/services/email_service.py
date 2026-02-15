"""
Email Service - Zoho SMTP Integration for Workhub Enerzia
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Zoho SMTP Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.zoho.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Workhub Enerzia")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: Optional[str] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[dict]] = None
) -> dict:
    """
    Send email using Zoho SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body content
        plain_content: Plain text fallback (optional)
        cc: List of CC email addresses
        bcc: List of BCC email addresses
        attachments: List of dicts with 'filename' and 'content' keys
    
    Returns:
        dict with 'success' and 'message' keys
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP credentials not configured")
        return {"success": False, "message": "Email service not configured"}
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL or SMTP_USER}>"
        msg['To'] = to_email
        
        if cc:
            msg['Cc'] = ', '.join(cc)
        
        # Add plain text part
        if plain_content:
            part1 = MIMEText(plain_content, 'plain')
            msg.attach(part1)
        
        # Add HTML part
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
        # Add attachments
        if attachments:
            for attachment in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment['content'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f"attachment; filename={attachment['filename']}"
                )
                msg.attach(part)
        
        # Build recipient list
        recipients = [to_email]
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)
        
        # Connect and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, recipients, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return {"success": True, "message": "Email sent successfully"}
    
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {e}")
        return {"success": False, "message": "Email authentication failed. Please check SMTP credentials or use App Password."}
    
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        return {"success": False, "message": f"Failed to send email: {str(e)}"}
    
    except Exception as e:
        logger.error(f"Email error: {e}")
        return {"success": False, "message": f"Email error: {str(e)}"}


def send_password_reset_email(to_email: str, user_name: str, reset_token: str, reset_url: str) -> dict:
    """Send password reset email"""
    
    subject = "Reset Your Password - Workhub Enerzia"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Workhub Enerzia</h1>
                <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Password Reset Request</p>
            </div>
            
            <!-- Content -->
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">
                    Hello <strong>{user_name}</strong>,
                </p>
                
                <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                    We received a request to reset your password for your Workhub Enerzia account. 
                    Click the button below to create a new password:
                </p>
                
                <!-- Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 10px 0 25px 0;">
                    {reset_url}
                </p>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                        ⏰ This link will expire in <strong>24 hours</strong> for security reasons.
                    </p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
                        If you didn't request this password reset, you can safely ignore this email. 
                        Your password will remain unchanged.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    © 2026 Workhub Enerzia. All rights reserved.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                    This is an automated message, please do not reply.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    plain_content = f"""
    Hello {user_name},
    
    We received a request to reset your password for your Workhub Enerzia account.
    
    Click the link below to reset your password:
    {reset_url}
    
    This link will expire in 24 hours for security reasons.
    
    If you didn't request this password reset, you can safely ignore this email.
    
    © 2026 Workhub Enerzia
    """
    
    return send_email(to_email, subject, html_content, plain_content)


def send_travel_approval_email(to_email: str, user_name: str, trip_details: dict, status: str, reason: str = "") -> dict:
    """Send travel log approval/rejection notification"""
    
    status_color = "#10b981" if status == "approved" else "#ef4444"
    status_text = "Approved ✓" if status == "approved" else "Rejected ✗"
    
    subject = f"Travel Log {status.capitalize()} - Workhub Enerzia"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #1e293b; padding: 25px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Workhub Enerzia</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 16px 16px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <span style="display: inline-block; background: {status_color}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600;">
                        {status_text}
                    </span>
                </div>
                
                <p style="color: #334155; font-size: 16px;">Hello <strong>{user_name}</strong>,</p>
                
                <p style="color: #64748b; font-size: 15px;">
                    Your travel log has been <strong style="color: {status_color};">{status}</strong>.
                </p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">{trip_details.get('date', 'N/A')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Route:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">{trip_details.get('from_location', '')} → {trip_details.get('to_location', '')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Distance:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">{trip_details.get('distance', 0)} km</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Allowance:</td>
                            <td style="padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 600;">₹{trip_details.get('allowance', 0)}</td>
                        </tr>
                    </table>
                </div>
                
                {f'<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;"><strong style="color: #991b1b;">Reason:</strong><p style="color: #7f1d1d; margin: 5px 0 0 0;">{reason}</p></div>' if reason and status == 'rejected' else ''}
                
                <p style="color: #94a3b8; font-size: 13px; margin-top: 25px;">
                    This is an automated notification from Workhub Enerzia ERP.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_leave_status_email(to_email: str, user_name: str, leave_type: str, dates: str, status: str, reason: str = "") -> dict:
    """Send leave request status notification"""
    
    status_color = "#10b981" if status == "approved" else "#ef4444"
    status_text = "Approved" if status == "approved" else "Rejected"
    
    subject = f"Leave Request {status_text} - Workhub Enerzia"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #1e293b; padding: 25px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Workhub Enerzia</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 16px 16px;">
                <p style="color: #334155; font-size: 16px;">Hello <strong>{user_name}</strong>,</p>
                
                <p style="color: #64748b; font-size: 15px;">
                    Your leave request has been <strong style="color: {status_color};">{status}</strong>.
                </p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b;"><strong>Leave Type:</strong> {leave_type}</p>
                    <p style="margin: 10px 0 0 0; color: #64748b;"><strong>Dates:</strong> {dates}</p>
                </div>
                
                {f'<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px;"><strong style="color: #991b1b;">Reason:</strong><p style="color: #7f1d1d; margin: 5px 0 0 0;">{reason}</p></div>' if reason else ''}
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


# Test function
def test_smtp_connection() -> dict:
    """Test SMTP connection"""
    if not SMTP_USER or not SMTP_PASSWORD:
        return {"success": False, "message": "SMTP credentials not configured"}
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
        return {"success": True, "message": "SMTP connection successful"}
    except smtplib.SMTPAuthenticationError:
        return {"success": False, "message": "Authentication failed. Please use App Password from Zoho."}
    except Exception as e:
        return {"success": False, "message": str(e)}
