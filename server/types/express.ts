/**
 * Express Type Extensions
 * =======================
 * Custom type definitions for Express Request with authentication
 */

import { Request as ExpressRequest, Response, NextFunction } from "express";

// ============================================================================
// User Types
// ============================================================================

/**
 * OIDC Claims from Replit Auth
 */
export interface OIDCClaims {
  sub: string;           // User ID
  email?: string;        // User email
  name?: string;         // User display name
  picture?: string;      // Profile picture URL
  preferred_username?: string;
  iat?: number;          // Issued at
  exp?: number;          // Expiration
}

/**
 * User object attached to request
 */
export interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  claims?: OIDCClaims;
}

// ============================================================================
// Extended Request Types
// ============================================================================

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthUser;
}

/**
 * Express Request with required authenticated user (after auth middleware)
 */
export interface RequiredAuthRequest extends ExpressRequest {
  user: AuthUser;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user ID from request (handles both OIDC claims and direct ID)
 */
export function getUserId(req: AuthenticatedRequest): string | null {
  if (!req.user) return null;
  return req.user.claims?.sub || req.user.id || null;
}

/**
 * Get user email from request
 */
export function getUserEmail(req: AuthenticatedRequest): string | null {
  if (!req.user) return null;
  return req.user.claims?.email || req.user.email || null;
}

/**
 * Assert that user is authenticated and return user ID
 * Throws if not authenticated
 */
export function requireUserId(req: AuthenticatedRequest): string {
  const userId = getUserId(req);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

// ============================================================================
// Request Handler Types
// ============================================================================

/**
 * Async route handler type
 */
export type AsyncRouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Sync route handler type
 */
export type RouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Response;

// ============================================================================
// Express Module Augmentation
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
