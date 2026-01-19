"""Email service for trial digests and notifications."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import resend

from config import settings


class EmailService:
    """Email service using Resend API."""

    def __init__(self, api_key: str = None):
        """Initialize email service.

        Args:
            api_key: Resend API key (uses settings if not provided)
        """
        self.api_key = api_key or settings.resend_api_key
        resend.api_key = self.api_key
        self.from_email = settings.from_email

    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email.

        Args:
            to: Recipient email
            subject: Email subject
            html: HTML content
            text: Plain text content (optional)

        Returns:
            Send result from Resend
        """
        params = {
            "from": self.from_email,
            "to": [to],
            "subject": subject,
            "html": html
        }

        if text:
            params["text"] = text

        try:
            result = resend.Emails.send(params)
            return {"success": True, "id": result.get("id")}
        except Exception as e:
            print(f"Email send error: {e}")
            return {"success": False, "error": str(e)}

    def render_digest_template(
        self,
        trials: List[Dict[str, Any]],
        language: str,
        user_name: str = ""
    ) -> str:
        """Render weekly digest email template.

        Args:
            trials: List of trials to include
            language: User's preferred language
            user_name: User's name

        Returns:
            HTML email content
        """
        # Get translations for the language
        strings = self._get_email_strings(language)

        # Build trial list HTML
        trial_items = []
        for trial in trials:
            title = trial.get("title_translated") or trial.get("title_original", "")
            summary = trial.get("summary_translated") or trial.get("summary_original", "")
            status = trial.get("status", "")
            phase = trial.get("phase", "")
            nct_id = trial.get("nct_id", "")

            # Truncate summary
            if len(summary) > 300:
                summary = summary[:297] + "..."

            trial_html = f"""
            <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">
                    <a href="{settings.app_url}/trial/{nct_id}" style="color: #2563eb; text-decoration: none;">
                        {title}
                    </a>
                </h3>
                <div style="margin-bottom: 8px;">
                    <span style="display: inline-block; padding: 2px 8px; background: #dbeafe; color: #1d4ed8; border-radius: 4px; font-size: 12px; margin-right: 8px;">
                        {status}
                    </span>
                    <span style="display: inline-block; padding: 2px 8px; background: #f3e8ff; color: #7c3aed; border-radius: 4px; font-size: 12px;">
                        {phase}
                    </span>
                </div>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                    {summary}
                </p>
            </div>
            """
            trial_items.append(trial_html)

        trials_html = "\n".join(trial_items)

        # Full email template
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1f2937; margin: 0;">🔬 Trial Navigator</h1>
                <p style="color: #6b7280; margin: 8px 0 0 0;">{strings['weekly_digest']}</p>
            </div>

            <!-- Greeting -->
            <p style="margin-bottom: 24px;">
                {strings['greeting'].format(name=user_name or strings['user'])}
            </p>

            <p style="margin-bottom: 24px;">
                {strings['intro'].format(count=len(trials))}
            </p>

            <!-- Trials -->
            <div style="margin-bottom: 32px;">
                {trials_html}
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="{settings.app_url}/search" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    {strings['view_all']}
                </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center; font-size: 12px; color: #9ca3af;">
                <p>{strings['footer']}</p>
                <p>
                    <a href="{settings.app_url}/settings" style="color: #6b7280;">
                        {strings['unsubscribe']}
                    </a>
                </p>
            </div>

        </body>
        </html>
        """

        return html

    def _get_email_strings(self, language: str) -> Dict[str, str]:
        """Get email strings for a language.

        Args:
            language: Language code

        Returns:
            Dictionary of translated strings
        """
        strings = {
            "en": {
                "weekly_digest": "Weekly Clinical Trials Digest",
                "greeting": "Hello {name}!",
                "user": "there",
                "intro": "Here are {count} new clinical trials that match your interests:",
                "view_all": "View All Trials",
                "footer": "You're receiving this because you subscribed to Trial Navigator updates.",
                "unsubscribe": "Manage email preferences"
            },
            "ka": {
                "weekly_digest": "კვირის კლინიკური კვლევები",
                "greeting": "გამარჯობა {name}!",
                "user": "",
                "intro": "აქ არის {count} ახალი კლინიკური კვლევა, რომელიც შეესაბამება თქვენს ინტერესებს:",
                "view_all": "ყველა კვლევის ნახვა",
                "footer": "თქვენ იღებთ ამ შეტყობინებას, რადგან გამოიწერეთ Trial Navigator-ის განახლებები.",
                "unsubscribe": "Email პარამეტრების მართვა"
            },
            "hy": {
                "weekly_digest": "Շdelays delays բdelays delays delays delays",
                "greeting": "Բարdelays {name}!",
                "user": "",
                "intro": " Delays delays {count} delays delays delays delays delays delays delays:",
                "view_all": "Դdelays delays delays",
                "footer": "Դdelays delays delays delays delays delays Trial Navigator delays:",
                "unsubscribe": "Կdelays delays delays delays"
            },
            "az": {
                "weekly_digest": "Həftəlik Klinik Tədqiqatlar",
                "greeting": "Salam {name}!",
                "user": "",
                "intro": "Maraqlarınıza uyğun {count} yeni klinik tədqiqat:",
                "view_all": "Bütün tədqiqatlara bax",
                "footer": "Trial Navigator yeniləmələrinə abunə olduğunuz üçün bu məktubu alırsınız.",
                "unsubscribe": "E-poçt parametrləri"
            }
        }

        return strings.get(language, strings["en"])


def get_subject(language: str) -> str:
    """Get email subject for a language.

    Args:
        language: Language code

    Returns:
        Email subject
    """
    subjects = {
        "en": "🔬 Weekly Clinical Trials Digest - Trial Navigator",
        "ka": "🔬 კვირის კლინიკური კვლევები - Trial Navigator",
        "hy": "🔬 Շdelays delays բdelays delays delays delays - Trial Navigator",
        "az": "🔬 Həftəlik klinik tədqiqatlar - Trial Navigator",
        "ru": "🔬 Еженедельный дайджест клинических исследований - Trial Navigator"
    }

    return subjects.get(language, subjects["en"])
