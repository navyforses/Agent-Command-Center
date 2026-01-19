"""Email digest templates."""

from typing import List, Dict, Any, Optional
from datetime import date


def render_weekly_digest(
    patient_name: str,
    patient_condition: str,
    language: str,
    new_trials: int,
    new_results: int,
    new_discoveries: int,
    urgent_items: int,
    top_item: Optional[Dict[str, Any]],
    key_stat: Optional[Dict[str, str]],
    highlights: List[Dict[str, Any]],
    period_start: date,
    period_end: date,
    dashboard_url: str = "https://trialnavigator.com/feed"
) -> str:
    """Render weekly email digest HTML.

    Args:
        patient_name: Patient's name
        patient_condition: Primary condition
        language: Language code
        new_trials: Count of new trials
        new_results: Count of new research results
        new_discoveries: Count of discoveries
        urgent_items: Count of urgent items
        top_item: Most important item this week
        key_stat: Key statistic of the week
        highlights: Other highlight items
        period_start: Week start date
        period_end: Week end date
        dashboard_url: URL to patient dashboard

    Returns:
        HTML string for email
    """
    # Language-specific strings
    strings = get_strings(language)

    # Format dates
    period_str = f"{period_start.strftime('%d.%m')} - {period_end.strftime('%d.%m.%Y')}"

    # Build top item HTML
    top_item_html = ""
    if top_item:
        priority_color = "#ef4444" if top_item.get("priority") == "urgent" else "#f97316"
        top_item_html = f"""
        <tr>
            <td style="padding: 20px; background-color: #fef2f2; border-radius: 12px; border: 2px solid #fecaca;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <span style="display: inline-block; padding: 4px 12px; background-color: {priority_color}; color: white; font-size: 12px; font-weight: bold; border-radius: 20px; margin-bottom: 10px;">
                                {strings['urgent'] if top_item.get('priority') == 'urgent' else strings['important']}
                            </span>
                        </td>
                        <td style="text-align: right;">
                            <span style="font-size: 24px; font-weight: bold; color: #1f2937;">{top_item.get('relevance_score', 0):.0f}%</span>
                            <br>
                            <span style="font-size: 12px; color: #6b7280;">{strings['match']}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-top: 15px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">
                                {top_item.get('title', '')}
                            </h3>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                                {top_item.get('personal_relevance', '')}
                            </p>
                            <a href="{top_item.get('source_url', dashboard_url)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                                {strings['view_details']} →
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr><td style="height: 20px;"></td></tr>
        """

    # Build key stat HTML
    key_stat_html = ""
    if key_stat:
        key_stat_html = f"""
        <tr>
            <td style="padding: 25px; background-color: #f0fdf4; border-radius: 12px; text-align: center; border: 2px solid #bbf7d0;">
                <div style="font-size: 48px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">
                    {key_stat.get('value', '')}
                </div>
                <div style="font-size: 14px; color: #166534;">
                    {key_stat.get('label', '')}
                </div>
            </td>
        </tr>
        <tr><td style="height: 20px;"></td></tr>
        """

    # Build highlights HTML
    highlights_html = ""
    if highlights:
        items_html = ""
        for item in highlights[:3]:
            icon = get_content_type_icon(item.get('content_type', 'news'))
            items_html += f"""
            <tr>
                <td style="padding: 15px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="40" style="vertical-align: top;">
                                <span style="font-size: 24px;">{icon}</span>
                            </td>
                            <td style="padding-left: 10px;">
                                <a href="{item.get('source_url', '#')}" style="color: #1f2937; text-decoration: none; font-weight: 500;">
                                    {item.get('title', '')}
                                </a>
                                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                                    {item.get('source', '')}
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr><td style="height: 10px;"></td></tr>
            """

        highlights_html = f"""
        <tr>
            <td>
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
                    📰 {strings['more_highlights']}
                </h3>
            </td>
        </tr>
        {items_html}
        """

    # Main template
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{strings['weekly_report']} - Trial Navigator</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 24px;">
                                🔬 Trial Navigator
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                                {strings['weekly_report']} • {period_str}
                            </p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px;">
                            <h2 style="margin: 0 0 5px 0; font-size: 20px; color: #1f2937;">
                                {strings['hello']}, {patient_name}! 👋
                            </h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                {strings['weekly_summary']} <strong>{patient_condition}</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Stats -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="25%" style="padding: 15px; text-align: center; background-color: #f9fafb; border-radius: 8px;">
                                        <div style="font-size: 28px; font-weight: bold; color: #2563eb;">{new_trials}</div>
                                        <div style="font-size: 12px; color: #6b7280;">{strings['new_trials']}</div>
                                    </td>
                                    <td width="5%"></td>
                                    <td width="25%" style="padding: 15px; text-align: center; background-color: {('#fef2f2' if urgent_items > 0 else '#f9fafb')}; border-radius: 8px;">
                                        <div style="font-size: 28px; font-weight: bold; color: {'#ef4444' if urgent_items > 0 else '#6b7280'};">{urgent_items}</div>
                                        <div style="font-size: 12px; color: {'#ef4444' if urgent_items > 0 else '#6b7280'};">{strings['urgent']}</div>
                                    </td>
                                    <td width="5%"></td>
                                    <td width="25%" style="padding: 15px; text-align: center; background-color: #f9fafb; border-radius: 8px;">
                                        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">{new_results}</div>
                                        <div style="font-size: 12px; color: #6b7280;">{strings['results']}</div>
                                    </td>
                                    <td width="5%"></td>
                                    <td width="25%" style="padding: 15px; text-align: center; background-color: #f9fafb; border-radius: 8px;">
                                        <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">{new_discoveries}</div>
                                        <div style="font-size: 12px; color: #6b7280;">{strings['discoveries']}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                {top_item_html}
                                {key_stat_html}
                                {highlights_html}
                            </table>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; text-align: center;">
                            <a href="{dashboard_url}" style="display: inline-block; padding: 15px 40px; background-color: #1f2937; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                {strings['view_all']} →
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="font-size: 12px; color: #6b7280;">
                                        <p style="margin: 0 0 10px 0;">
                                            {strings['footer_text']}
                                        </p>
                                        <p style="margin: 0;">
                                            <a href="{dashboard_url}/settings" style="color: #2563eb; text-decoration: none;">
                                                {strings['manage_notifications']}
                                            </a>
                                            &nbsp;•&nbsp;
                                            <a href="{dashboard_url}/unsubscribe" style="color: #6b7280; text-decoration: none;">
                                                {strings['unsubscribe']}
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html


def get_strings(language: str) -> Dict[str, str]:
    """Get language-specific strings for email."""
    strings = {
        "ka": {
            "weekly_report": "კვირეული ანგარიში",
            "hello": "გამარჯობა",
            "weekly_summary": "აი ამ კვირის მნიშვნელოვანი სიახლეები:",
            "new_trials": "ახალი კვლევა",
            "urgent": "სასწრაფო",
            "results": "შედეგი",
            "discoveries": "აღმოჩენა",
            "important": "მნიშვნელოვანი",
            "match": "შესაბამისობა",
            "view_details": "დეტალების ნახვა",
            "more_highlights": "სხვა სიახლეები",
            "view_all": "ყველას ნახვა",
            "footer_text": "ეს შეტყობინება გამოგზავნილია Trial Navigator-ის მიერ, რადგან გამოწერილი გაქვთ კვირეული შეჯამება.",
            "manage_notifications": "შეტყობინებების მართვა",
            "unsubscribe": "გამოწერის გაუქმება"
        },
        "en": {
            "weekly_report": "Weekly Report",
            "hello": "Hello",
            "weekly_summary": "Here are this week's important updates for:",
            "new_trials": "New Trials",
            "urgent": "Urgent",
            "results": "Results",
            "discoveries": "Discoveries",
            "important": "Important",
            "match": "Match",
            "view_details": "View Details",
            "more_highlights": "More Highlights",
            "view_all": "View All",
            "footer_text": "This email was sent by Trial Navigator because you're subscribed to weekly digests.",
            "manage_notifications": "Manage Notifications",
            "unsubscribe": "Unsubscribe"
        },
        "hy": {
            "weekly_report": "Շdelays delays delays delays",
            "hello": "Բdelays delays",
            "weekly_summary": "Այdelays delays delays delays delays delays delays:",
            "new_trials": "Նdelays delays",
            "urgent": "Շdelay",
            "results": "Արdelays delays",
            "discoveries": "Բdelays delays",
            "important": "Delays delay",
            "match": "Հdelay",
            "view_details": "Տdelay մ delays delay",
            "more_highlights": "Այdelay նdelays delay",
            "view_all": "Delays տdelay",
            "footer_text": "Այdelay delay delay delays Trial Navigator-delay, delay delays delay delays delay delays delay:",
            "manage_notifications": "Delay delays delay delays",
            "unsubscribe": "Delay delays delay"
        },
        "ru": {
            "weekly_report": "Еженедельный отчет",
            "hello": "Здравствуйте",
            "weekly_summary": "Вот важные новости этой недели для:",
            "new_trials": "Новых исследований",
            "urgent": "Срочных",
            "results": "Результатов",
            "discoveries": "Открытий",
            "important": "Важное",
            "match": "Совпадение",
            "view_details": "Подробнее",
            "more_highlights": "Другие новости",
            "view_all": "Смотреть все",
            "footer_text": "Это письмо отправлено Trial Navigator, так как вы подписаны на еженедельную рассылку.",
            "manage_notifications": "Управление уведомлениями",
            "unsubscribe": "Отписаться"
        }
    }
    return strings.get(language, strings["en"])


def get_content_type_icon(content_type: str) -> str:
    """Get emoji icon for content type."""
    icons = {
        "clinical_trial": "🔬",
        "news": "📰",
        "research_result": "📊",
        "discovery": "🧬",
        "drug_approval": "💊",
        "community": "👥"
    }
    return icons.get(content_type, "📄")
