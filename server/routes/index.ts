/**
 * Routes Index - New Simplified Structure
 * ========================================
 * Medical Newspaper Subscription Platform
 *
 * Core Routes:
 * - /api/auth - Authentication (login, register, logout)
 * - /api/feed - Personalized news feed
 * - /api/questions - Q&A on articles
 * - /api/saved - Bookmarked items
 * - /api/subscriptions - Subscription management
 * - /api/profile - User profile & onboarding
 */

import { Express, Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";

// Import route modules
import authRoutes from "./authRoutes";
import feedRoutes from "./feedRoutes";
import questionRoutes from "./questionRoutes";
import savedRoutes from "./savedRoutes";
import subscriptionRoutes from "./subscriptionRoutes";
import profileRoutes from "./profileRoutes";

// Keep useful existing routes
import documentRoutes from "./documentRoutes";
import appointmentRoutes from "./appointmentRoutes";
import appointmentExtractRoutes from "./appointmentExtractRoutes";
import researchAlertRoutes from "./researchAlertRoutes";

/**
 * Register all API routes
 */
export function registerApiRoutes(app: Express): void {
  // Public routes (no auth required)
  app.use("/api/auth", authRoutes);

  // Protected routes (require authentication)
  app.use("/api/feed", isEmailAuthenticated, feedRoutes);
  app.use("/api/questions", isEmailAuthenticated, questionRoutes);
  app.use("/api/saved", isEmailAuthenticated, savedRoutes);
  app.use("/api/subscriptions", isEmailAuthenticated, subscriptionRoutes);
  app.use("/api/profile", isEmailAuthenticated, profileRoutes);

  // Document upload (for Form 100)
  app.use("/api/documents", isEmailAuthenticated, documentRoutes);

  // P2 Features: Appointment extraction and Research Alerts
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/appointments", appointmentExtractRoutes);
  app.use("/api/research-alerts", isEmailAuthenticated, researchAlertRoutes);

  console.log("[Routes] API routes registered successfully");
}

export {
  authRoutes,
  feedRoutes,
  questionRoutes,
  savedRoutes,
  subscriptionRoutes,
  profileRoutes,
};

export default { registerApiRoutes };
