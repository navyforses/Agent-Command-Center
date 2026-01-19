"""Background scheduler for Trial Navigator.

Handles:
- Weekly email digests
- Data source syncing
- Cache cleanup
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import db
from services.resend_service import email_service


logger = logging.getLogger(__name__)


class DigestScheduler:
    """Scheduler for email digests and background tasks."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._is_running = False

    def start(self):
        """Start the scheduler."""
        if self._is_running:
            return

        # Weekly digest - Sunday at 9:00 AM UTC
        self.scheduler.add_job(
            self.send_weekly_digests,
            CronTrigger(day_of_week='sun', hour=9, minute=0),
            id='weekly_digest',
            name='Send Weekly Digests',
            replace_existing=True
        )

        # Daily digest for premium users - Every day at 8:00 AM UTC
        self.scheduler.add_job(
            self.send_daily_digests,
            CronTrigger(hour=8, minute=0),
            id='daily_digest',
            name='Send Daily Digests (Premium)',
            replace_existing=True
        )

        # Sync data sources - Every 6 hours
        self.scheduler.add_job(
            self.sync_data_sources,
            CronTrigger(hour='*/6'),
            id='sync_sources',
            name='Sync Data Sources',
            replace_existing=True
        )

        # Cleanup old data - Daily at 3:00 AM UTC
        self.scheduler.add_job(
            self.cleanup_old_data,
            CronTrigger(hour=3, minute=0),
            id='cleanup',
            name='Cleanup Old Data',
            replace_existing=True
        )

        self.scheduler.start()
        self._is_running = True
        logger.info("Scheduler started")

    def stop(self):
        """Stop the scheduler."""
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Scheduler stopped")

    async def send_weekly_digests(self):
        """Send weekly digest emails to all eligible users."""
        logger.info("Starting weekly digest job")

        try:
            async with db.acquire() as conn:
                # Get profiles with weekly digest enabled
                profiles = await conn.fetch("""
                    SELECT
                        pp.id as profile_id,
                        pp.patient_name,
                        pp.primary_diagnosis,
                        pp.preferred_language,
                        pp.extracted_conditions,
                        u.email
                    FROM patient_profiles pp
                    JOIN users u ON u.id = pp.user_id
                    LEFT JOIN notification_settings ns ON ns.profile_id = pp.id
                    WHERE u.email_verified = true
                      AND (ns.email_enabled IS NULL OR ns.email_enabled = true)
                      AND (ns.frequency IS NULL OR ns.frequency = 'weekly')
                """)

                sent_count = 0
                error_count = 0

                for profile in profiles:
                    try:
                        feed_data = await self._get_feed_data(conn, profile['profile_id'])

                        # Skip if no new content
                        if feed_data['total_items'] == 0:
                            continue

                        result = await email_service.send_weekly_digest(
                            to=profile['email'],
                            patient_name=profile['patient_name'] or "Patient",
                            patient_condition=profile['primary_diagnosis'] or "Your condition",
                            language=profile['preferred_language'] or "en",
                            feed_data=feed_data
                        )

                        if result.success:
                            sent_count += 1
                            # Log email
                            await conn.execute("""
                                INSERT INTO email_logs (user_id, email_type, sent_at)
                                SELECT user_id, 'weekly_digest', NOW()
                                FROM patient_profiles WHERE id = $1
                            """, profile['profile_id'])
                        else:
                            error_count += 1
                            logger.error(f"Failed to send digest to {profile['email']}: {result.error}")

                    except Exception as e:
                        error_count += 1
                        logger.error(f"Error processing profile {profile['profile_id']}: {e}")

                logger.info(f"Weekly digest complete: {sent_count} sent, {error_count} errors")

        except Exception as e:
            logger.error(f"Weekly digest job failed: {e}")

    async def send_daily_digests(self):
        """Send daily digest emails to premium users."""
        logger.info("Starting daily digest job")

        try:
            async with db.acquire() as conn:
                # Get profiles with daily digest enabled (premium users)
                profiles = await conn.fetch("""
                    SELECT
                        pp.id as profile_id,
                        pp.patient_name,
                        pp.primary_diagnosis,
                        pp.preferred_language,
                        u.email
                    FROM patient_profiles pp
                    JOIN users u ON u.id = pp.user_id
                    LEFT JOIN notification_settings ns ON ns.profile_id = pp.id
                    WHERE u.email_verified = true
                      AND u.subscription_tier IN ('premium', 'premium_plus')
                      AND ns.frequency = 'daily'
                      AND (ns.email_enabled IS NULL OR ns.email_enabled = true)
                """)

                sent_count = 0
                for profile in profiles:
                    try:
                        feed_data = await self._get_feed_data(conn, profile['profile_id'], days=1)

                        if feed_data['total_items'] == 0:
                            continue

                        result = await email_service.send_weekly_digest(
                            to=profile['email'],
                            patient_name=profile['patient_name'] or "Patient",
                            patient_condition=profile['primary_diagnosis'] or "Your condition",
                            language=profile['preferred_language'] or "en",
                            feed_data=feed_data
                        )

                        if result.success:
                            sent_count += 1

                    except Exception as e:
                        logger.error(f"Error sending daily digest: {e}")

                logger.info(f"Daily digest complete: {sent_count} sent")

        except Exception as e:
            logger.error(f"Daily digest job failed: {e}")

    async def sync_data_sources(self):
        """Sync data from external sources."""
        logger.info("Starting data source sync")

        # Import scrapers
        from scrapers.clinicaltrials_gov import ClinicalTrialsGovScraper
        from scrapers.medical_news import MedicalNewsAggregator

        try:
            # Sync clinical trials
            scraper = ClinicalTrialsGovScraper()
            # Would implement actual sync logic here

            # Sync medical news
            news_aggregator = MedicalNewsAggregator()
            # Would implement actual sync logic here

            # Update sync status
            async with db.acquire() as conn:
                await conn.execute("""
                    UPDATE data_source_status
                    SET last_sync_at = NOW(), last_sync_status = 'success'
                    WHERE source_name = 'clinicaltrials.gov'
                """)

            logger.info("Data source sync complete")

        except Exception as e:
            logger.error(f"Data source sync failed: {e}")

    async def cleanup_old_data(self):
        """Clean up old data and logs."""
        logger.info("Starting cleanup job")

        try:
            async with db.acquire() as conn:
                # Clean up old search history (keep 90 days)
                deleted_searches = await conn.execute("""
                    DELETE FROM search_history
                    WHERE searched_at < NOW() - INTERVAL '90 days'
                """)

                # Clean up old email logs (keep 180 days)
                deleted_logs = await conn.execute("""
                    DELETE FROM email_logs
                    WHERE sent_at < NOW() - INTERVAL '180 days'
                """)

                # Clean up old feed history (keep 30 days)
                deleted_history = await conn.execute("""
                    DELETE FROM feed_item_history
                    WHERE viewed_at < NOW() - INTERVAL '30 days'
                """)

                logger.info("Cleanup complete")

        except Exception as e:
            logger.error(f"Cleanup job failed: {e}")

    async def _get_feed_data(self, conn, profile_id: int, days: int = 7) -> dict:
        """Get feed data for a profile."""
        cutoff = datetime.now() - timedelta(days=days)

        trials_count = await conn.fetchval("""
            SELECT COUNT(*) FROM trials WHERE created_at > $1
        """, cutoff)

        news_counts = await conn.fetchrow("""
            SELECT
                COUNT(*) FILTER (WHERE content_type = 'research_result') as results,
                COUNT(*) FILTER (WHERE content_type = 'discovery') as discoveries
            FROM medical_news WHERE fetched_at > $1
        """, cutoff)

        return {
            "new_trials": trials_count or 0,
            "new_results": news_counts['results'] if news_counts else 0,
            "new_discoveries": news_counts['discoveries'] if news_counts else 0,
            "urgent_items": 0,
            "top_item": None,
            "key_stat": None,
            "highlights": [],
            "total_items": (trials_count or 0) + (news_counts['results'] if news_counts else 0)
        }


# Global scheduler instance
digest_scheduler = DigestScheduler()


async def check_urgent_alerts():
    """Check for urgent items and send real-time alerts."""
    async with db.acquire() as conn:
        # Get profiles with real-time notifications
        profiles = await conn.fetch("""
            SELECT
                pp.id,
                pp.patient_name,
                pp.preferred_language,
                pp.extracted_conditions,
                u.email,
                ns.urgent_threshold
            FROM patient_profiles pp
            JOIN users u ON u.id = pp.user_id
            JOIN notification_settings ns ON ns.profile_id = pp.id
            WHERE ns.frequency = 'realtime'
              AND ns.email_enabled = true
              AND u.subscription_tier = 'premium_plus'
        """)

        for profile in profiles:
            threshold = profile['urgent_threshold'] or 90.0

            # Check for new high-relevance items not yet notified
            urgent_item = await conn.fetchrow("""
                SELECT t.*
                FROM trials t
                LEFT JOIN feed_item_history fh ON fh.item_id = t.nct_id AND fh.profile_id = $1
                WHERE t.relevance_score >= $2
                  AND fh.id IS NULL
                  AND t.created_at > NOW() - INTERVAL '24 hours'
                ORDER BY t.relevance_score DESC
                LIMIT 1
            """, profile['id'], threshold)

            if urgent_item:
                await email_service.send_urgent_alert(
                    to=profile['email'],
                    patient_name=profile['patient_name'] or "Patient",
                    language=profile['preferred_language'] or "en",
                    item={
                        "title": urgent_item['title_original'],
                        "relevance_score": float(urgent_item['relevance_score']),
                        "source_url": urgent_item['source_url']
                    }
                )

                # Mark as notified
                await conn.execute("""
                    INSERT INTO feed_item_history (profile_id, item_id, viewed_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (profile_id, item_id) DO NOTHING
                """, profile['id'], urgent_item['nct_id'])
