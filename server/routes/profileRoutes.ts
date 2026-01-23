/**
 * Profile Routes - User Profile & Onboarding
 * ===========================================
 * Manages user profile, preferences, and onboarding flow
 */

import { Router, Response } from "express";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  clinicalTrialAlerts: z.boolean().optional(),
  researchArticleAlerts: z.boolean().optional(),
  medicationNewsAlerts: z.boolean().optional(),
  dataSharing: z.boolean().optional(),
  language: z.enum(["en", "ka"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notificationFrequency: z.enum(["realtime", "daily", "weekly"]).optional(),
});

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return sendError.notFound(res, "User");
    }

    // Get patient profile if exists
    const patientProfile = await storage.getPatientProfile(userId);

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      createdAt: user.createdAt,
      patientProfile: patientProfile
        ? {
            id: patientProfile.id,
            fullName: patientProfile.fullName,
            primaryDiagnosis: patientProfile.primaryDiagnosis,
            icd10Codes: patientProfile.icd10Codes,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return sendError.internal(res, "Failed to fetch profile");
  }
});

/**
 * PATCH /api/profile
 * Update user profile
 */
router.patch("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid profile data", parseResult.error.errors);
    }

    const user = await storage.updateUserProfile(userId, parseResult.data);
    if (!user) {
      return sendError.notFound(res, "User");
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return sendError.internal(res, "Failed to update profile");
  }
});

/**
 * GET /api/profile/preferences
 * Get user preferences
 */
router.get("/preferences", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    let preferences = await storage.getUserPreferences(userId);

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await storage.createUserPreferences({
        userId,
        emailNotifications: true,
        appointmentReminders: true,
        clinicalTrialAlerts: true,
        dataSharing: false,
        language: "ka",
        theme: "light",
      });
    }

    return res.json(preferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return sendError.internal(res, "Failed to fetch preferences");
  }
});

/**
 * PUT /api/profile/preferences
 * Update user preferences
 */
router.put("/preferences", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = updatePreferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid preferences", parseResult.error.errors);
    }

    const preferences = await storage.updateUserPreferences(userId, parseResult.data);
    if (!preferences) {
      return sendError.notFound(res, "Preferences");
    }

    return res.json(preferences);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return sendError.internal(res, "Failed to update preferences");
  }
});

/**
 * GET /api/profile/patient
 * Get patient profile (from Form 100)
 */
router.get("/patient", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const patientProfile = await storage.getPatientProfile(userId);
    if (!patientProfile) {
      return sendError.notFound(res, "Patient profile");
    }

    return res.json(patientProfile);
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    return sendError.internal(res, "Failed to fetch patient profile");
  }
});

/**
 * GET /api/profile/export
 * Export all user data (GDPR compliance)
 */
router.get("/export", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const [user, preferences, patientProfile, documents] = await Promise.all([
      storage.getUser(userId),
      storage.getUserPreferences(userId),
      storage.getPatientProfile(userId),
      storage.getDocuments(userId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        createdAt: user?.createdAt,
      },
      preferences,
      patientProfile,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        uploadedAt: d.uploadedAt,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user-data-export-${new Date().toISOString().split("T")[0]}.json"`
    );
    return res.json(exportData);
  } catch (error) {
    console.error("Error exporting data:", error);
    return sendError.internal(res, "Failed to export data");
  }
});

export default router;
