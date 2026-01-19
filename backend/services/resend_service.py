"""Resend email service for Trial Navigator.

Handles:
- Weekly digest emails
- Urgent alerts
- Welcome emails
- Deep Search notifications
"""

import resend
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from dataclasses import dataclass

from config import settings
from services.email_templates import render_weekly_digest, get_strings


@dataclass
class EmailResult:
    """Result of email send operation."""
    success: bool
    email_id: Optional[str] = None
    error: Optional[str] = None


class ResendEmailService:
    """Email service using Resend API."""

    def __init__(self):
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key
        self.from_email = settings.email_from or "Trial Navigator <noreply@trialnavigator.com>"
        self.reply_to = settings.email_reply_to or "support@trialnavigator.com"

    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
        tags: Optional[List[Dict]] = None
    ) -> EmailResult:
        """Send an email via Resend."""
        try:
            params = {
                "from": self.from_email,
                "to": [to],
                "subject": subject,
                "html": html,
                "reply_to": self.reply_to,
            }

            if text:
                params["text"] = text

            if tags:
                params["tags"] = tags

            response = resend.Emails.send(params)

            return EmailResult(
                success=True,
                email_id=response.get("id")
            )
        except Exception as e:
            return EmailResult(
                success=False,
                error=str(e)
            )

    async def send_weekly_digest(
        self,
        to: str,
        patient_name: str,
        patient_condition: str,
        language: str,
        feed_data: Dict[str, Any],
        dashboard_url: str = "https://trialnavigator.com/feed"
    ) -> EmailResult:
        """Send weekly digest email."""
        strings = get_strings(language)

        # Calculate period
        today = date.today()
        period_start = today - timedelta(days=7)
        period_end = today

        # Render HTML
        html = render_weekly_digest(
            patient_name=patient_name,
            patient_condition=patient_condition,
            language=language,
            new_trials=feed_data.get("new_trials", 0),
            new_results=feed_data.get("new_results", 0),
            new_discoveries=feed_data.get("new_discoveries", 0),
            urgent_items=feed_data.get("urgent_items", 0),
            top_item=feed_data.get("top_item"),
            key_stat=feed_data.get("key_stat"),
            highlights=feed_data.get("highlights", []),
            period_start=period_start,
            period_end=period_end,
            dashboard_url=dashboard_url
        )

        # Subject line
        subject_templates = {
            "ka": f"🔬 {strings['weekly_report']} - {feed_data.get('new_trials', 0)} ახალი კვლევა",
            "en": f"🔬 {strings['weekly_report']} - {feed_data.get('new_trials', 0)} New Trials",
            "ru": f"🔬 {strings['weekly_report']} - {feed_data.get('new_trials', 0)} новых исследований",
        }
        subject = subject_templates.get(language, subject_templates["en"])

        # Add urgent indicator
        if feed_data.get("urgent_items", 0) > 0:
            urgent_text = {
                "ka": "სასწრაფო",
                "en": "URGENT",
                "ru": "СРОЧНО"
            }
            subject = f"🚨 {urgent_text.get(language, 'URGENT')} | {subject}"

        return await self.send_email(
            to=to,
            subject=subject,
            html=html,
            tags=[
                {"name": "type", "value": "weekly_digest"},
                {"name": "language", "value": language}
            ]
        )

    async def send_urgent_alert(
        self,
        to: str,
        patient_name: str,
        language: str,
        item: Dict[str, Any],
        dashboard_url: str = "https://trialnavigator.com/feed"
    ) -> EmailResult:
        """Send urgent alert email for high-priority items."""
        strings = get_strings(language)

        # Build urgent alert HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fef2f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #fecaca;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ef4444; padding: 25px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 22px;">
                                🚨 {strings['urgent']}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151;">
                                {strings['hello']}, {patient_name}!
                            </p>

                            <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border-left: 4px solid #ef4444;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <span style="font-size: 28px; font-weight: bold; color: #ef4444;">
                                        {item.get('relevance_score', 0):.0f}%
                                    </span>
                                    <span style="font-size: 12px; color: #6b7280;">{strings['match']}</span>
                                </div>

                                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">
                                    {item.get('title', '')}
                                </h2>

                                <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                                    {item.get('personal_relevance', item.get('summary', ''))}
                                </p>

                                <a href="{item.get('source_url', dashboard_url)}"
                                   style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                    {strings['view_details']} →
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                <a href="{dashboard_url}/settings" style="color: #2563eb; text-decoration: none;">
                                    {strings['manage_notifications']}
                                </a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        subject_templates = {
            "ka": f"🚨 სასწრაფო: {item.get('title', '')[:50]}...",
            "en": f"🚨 URGENT: {item.get('title', '')[:50]}...",
            "ru": f"🚨 СРОЧНО: {item.get('title', '')[:50]}...",
        }

        return await self.send_email(
            to=to,
            subject=subject_templates.get(language, subject_templates["en"]),
            html=html,
            tags=[
                {"name": "type", "value": "urgent_alert"},
                {"name": "language", "value": language}
            ]
        )

    async def send_welcome_email(
        self,
        to: str,
        patient_name: str,
        language: str,
        dashboard_url: str = "https://trialnavigator.com"
    ) -> EmailResult:
        """Send welcome email after profile creation."""
        strings = get_strings(language)

        welcome_content = {
            "ka": {
                "title": "მოგესალმებით Trial Navigator-ში! 🎉",
                "intro": "თქვენი პროფილი წარმატებით შეიქმნა. ახლა ჩვენი AI სისტემა ავტომატურად მოძებნის შესაბამის კლინიკურ კვლევებს და სიახლეებს თქვენთვის.",
                "features": [
                    "🔬 პერსონალიზებული კვლევების ძიება",
                    "📰 ბოლო სამედიცინო სიახლეები",
                    "🔔 კვირეული დაიჯესტი ელფოსტაზე",
                    "🌐 თარგმანი 40+ ენაზე"
                ],
                "cta": "თქვენი Feed-ის ნახვა"
            },
            "en": {
                "title": "Welcome to Trial Navigator! 🎉",
                "intro": "Your profile has been successfully created. Our AI system will now automatically search for relevant clinical trials and news for you.",
                "features": [
                    "🔬 Personalized trial search",
                    "📰 Latest medical news",
                    "🔔 Weekly email digest",
                    "🌐 Translation to 40+ languages"
                ],
                "cta": "View Your Feed"
            },
            "ru": {
                "title": "Добро пожаловать в Trial Navigator! 🎉",
                "intro": "Ваш профиль успешно создан. Теперь наша AI-система будет автоматически искать подходящие клинические исследования и новости для вас.",
                "features": [
                    "🔬 Персонализированный поиск исследований",
                    "📰 Последние медицинские новости",
                    "🔔 Еженедельная рассылка",
                    "🌐 Перевод на 40+ языков"
                ],
                "cta": "Посмотреть вашу ленту"
            }
        }

        content = welcome_content.get(language, welcome_content["en"])
        features_html = "".join([f"<li style='margin-bottom: 10px;'>{f}</li>" for f in content["features"]])

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 28px;">
                                🔬 Trial Navigator
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                                {content['title']}
                            </h2>

                            <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px;">
                                {strings['hello']}, {patient_name}!
                            </p>

                            <p style="margin: 0 0 25px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                {content['intro']}
                            </p>

                            <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
                                {features_html}
                            </ul>

                            <div style="text-align: center;">
                                <a href="{dashboard_url}/feed"
                                   style="display: inline-block; padding: 15px 40px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                    {content['cta']} →
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                Trial Navigator - {strings['footer_text'].split('.')[0]}
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        return await self.send_email(
            to=to,
            subject=content["title"],
            html=html,
            tags=[
                {"name": "type", "value": "welcome"},
                {"name": "language", "value": language}
            ]
        )

    async def send_deep_search_complete(
        self,
        to: str,
        patient_name: str,
        language: str,
        search_id: int,
        trials_found: int,
        dashboard_url: str = "https://trialnavigator.com"
    ) -> EmailResult:
        """Send notification when Deep Search is complete."""
        content = {
            "ka": {
                "title": "🎯 თქვენი Deep Search დასრულდა!",
                "intro": f"ჩვენმა ექსპერტებმა იპოვეს <strong>{trials_found}</strong> კლინიკური კვლევა, რომელიც შეესაბამება თქვენს პროფილს.",
                "cta": "შედეგების ნახვა"
            },
            "en": {
                "title": "🎯 Your Deep Search is Complete!",
                "intro": f"Our experts found <strong>{trials_found}</strong> clinical trials matching your profile.",
                "cta": "View Results"
            },
            "ru": {
                "title": "🎯 Ваш Deep Search завершен!",
                "intro": f"Наши эксперты нашли <strong>{trials_found}</strong> клинических исследований, соответствующих вашему профилю.",
                "cta": "Посмотреть результаты"
            }
        }

        c = content.get(language, content["en"])
        strings = get_strings(language)

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #bbf7d0;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color: #16a34a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 24px;">
                                {c['title']}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px; text-align: center;">
                            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>

                            <p style="margin: 0 0 10px 0; color: #374151;">
                                {strings['hello']}, {patient_name}!
                            </p>

                            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                {c['intro']}
                            </p>

                            <a href="{dashboard_url}/deep-search/{search_id}/results"
                               style="display: inline-block; padding: 15px 40px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                {c['cta']} →
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                Trial Navigator Deep Search
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        return await self.send_email(
            to=to,
            subject=c["title"],
            html=html,
            tags=[
                {"name": "type", "value": "deep_search_complete"},
                {"name": "search_id", "value": str(search_id)}
            ]
        )


# Global instance
email_service = ResendEmailService()
