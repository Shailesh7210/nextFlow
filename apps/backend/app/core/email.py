import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("nexflow.email")

def send_email(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Sends an email using standard SMTP. Returns True on success, False if unconfigured or failed.
    """
    if not settings.SMTP_HOST:
        logger.warning(f"[SMTP Disabled] SMTP_HOST not configured. Email to {to_email} skipped.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        if html_content:
            msg.attach(MIMEText(html_content, "html"))

        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_invite_email(
    to_email: str, 
    workspace_name: str, 
    inviter_name: str, 
    role: str, 
    temp_password: str | None = None
) -> bool:
    """
    Formats and sends a team workspace invitation email.
    """
    subject = f"You've been invited to join '{workspace_name}' on NexFlow"
    
    if temp_password:
        credentials_block_text = f"Your temporary password to log in is: {temp_password}\n(Please change your password in Profile Settings after logging in)."
        credentials_block_html = f"""
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">Your Account Login Credentials:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a;"><strong>Email:</strong> {to_email}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #0f172a;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{temp_password}</code></p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;"><em>Note: You can update your password anytime under Profile Settings after logging in.</em></p>
        </div>
        """
    else:
        credentials_block_text = "You can log into your existing NexFlow account to access this workspace."
        credentials_block_html = f"""
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 14px; color: #334155;">Log in using your existing NexFlow account email (<strong>{to_email}</strong>) to start collaborating.</p>
        </div>
        """

    text_content = f"""
Hello,

{inviter_name} has invited you to collaborate in the '{workspace_name}' workspace on NexFlow with the role of '{role.capitalize()}'.

{credentials_block_text}

Role: {role.capitalize()}

Happy automating!
- The NexFlow Team
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }}
            .badge {{ display: inline-block; padding: 4px 10px; background: #eff6ff; color: #2563eb; border-radius: 6px; font-weight: 600; font-size: 13px; }}
            .footer {{ margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">⚡ NexFlow Workspace Invitation</div>
            <p style="font-size: 15px; color: #334155; line-height: 1.5;">
                Hello,<br><br>
                <strong>{inviter_name}</strong> has invited you to collaborate in the workspace <strong style="color: #2563eb;">{workspace_name}</strong> on NexFlow.
            </p>
            <p>Assigned Role: <span class="badge">{role.capitalize()}</span></p>
            
            {credentials_block_html}

            <p style="font-size: 14px; color: #475569; margin-top: 24px;">
                Happy automating!<br>
                <strong>The NexFlow Team</strong>
            </p>
            <div class="footer">
                NexFlow Visual Automation Engine &copy; 2026
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(to_email, subject, html_content, text_content)
