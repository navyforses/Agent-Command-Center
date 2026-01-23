/**
 * Auth Routes - Authentication API
 * =================================
 * Extended authentication endpoints
 *
 * Note: Core auth (login, register, logout) is handled in emailAuth.ts
 * This module provides additional auth-related functionality
 */

import { Router, Response } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /api/auth/session
 * Check current session status and get user info
 */
router.get("/session", async (req, res: Response) => {
  const sessionUser = (req.session as any)?.user;

  if (!sessionUser) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  // Get full user profile from database
  const user = await storage.getUser(sessionUser.id);

  return res.json({
    authenticated: true,
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      firstName: sessionUser.firstName || user?.firstName,
      lastName: sessionUser.lastName || user?.lastName,
      profileImageUrl: user?.profileImageUrl,
    },
  });
});

/**
 * GET /api/auth/onboarding-status
 * Check if user has completed onboarding (uploaded Form 100)
 */
router.get(
  "/onboarding-status",
  isEmailAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return sendError.unauthorized(res);
      }

      // Check if user has a patient profile (created from Form 100)
      const patientProfile = await storage.getPatientProfile(userId);

      return res.json({
        completed: !!patientProfile,
        hasPatientProfile: !!patientProfile,
        patientProfileId: patientProfile?.id || null,
      });
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      return sendError.internal(res, "Failed to check onboarding status");
    }
  }
);

/**
 * DELETE /api/auth/account
 * Delete user account and all associated data
 */
router.delete(
  "/account",
  isEmailAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return sendError.unauthorized(res);
      }

      // Delete user and all associated data
      await storage.deleteUser(userId);

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      return sendError.internal(res, "Failed to delete account");
    }
  }
);

export default router;
