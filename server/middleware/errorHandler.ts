/**
 * Centralized Error Handling Middleware
 * =====================================
 * Provides consistent error responses across all API endpoints
 * Integrates with Sentry for error tracking
 */

import { Request, Response, NextFunction } from "express";
import { captureException, addBreadcrumb } from "../sentry";

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Authentication errors (401)
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Authorization errors (403)
  ACCESS_DENIED: "ACCESS_DENIED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // Validation errors (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_ID: "INVALID_ID",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_FIELD: "MISSING_FIELD",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",

  // Conflict errors (409)
  ALREADY_EXISTS: "ALREADY_EXISTS",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // Rate limiting (429)
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: any;

  constructor(statusCode: number, message: string, code: ErrorCode, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "ApiError";

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR, details?: any): ApiError {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message: string = "Authentication required"): ApiError {
    return new ApiError(401, message, ErrorCodes.AUTH_REQUIRED);
  }

  static forbidden(message: string = "Access denied"): ApiError {
    return new ApiError(403, message, ErrorCodes.ACCESS_DENIED);
  }

  static notFound(resource: string = "Resource"): ApiError {
    return new ApiError(404, `${resource} not found`, ErrorCodes.NOT_FOUND);
  }

  static conflict(message: string, code: ErrorCode = ErrorCodes.ALREADY_EXISTS): ApiError {
    return new ApiError(409, message, code);
  }

  static rateLimited(message: string = "Too many requests"): ApiError {
    return new ApiError(429, message, ErrorCodes.RATE_LIMITED);
  }

  static internal(message: string = "Internal server error", details?: any): ApiError {
    return new ApiError(500, message, ErrorCodes.INTERNAL_ERROR, details);
  }
}

// ============================================================================
// Error Response Interface
// ============================================================================

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: any;
  timestamp: string;
  path?: string;
  requestId?: string;
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Log the error
  console.error(`[Error Handler] ${req.method} ${req.path}:`, err);

  // Add breadcrumb for Sentry
  addBreadcrumb(`Error in ${req.method} ${req.path}`, "error", "error", {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Default error response
  let statusCode = 500;
  let errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR;
  let message = "An unexpected error occurred";
  let details: any = undefined;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle Multer errors
  else if (err.name === "MulterError") {
    statusCode = 400;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = err.message || "File upload error";
  }
  // Handle JSON parse errors
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_INPUT;
    message = "Invalid JSON in request body";
  }
  // Handle Drizzle/PostgreSQL errors
  else if (err.message?.includes("duplicate key")) {
    statusCode = 409;
    errorCode = ErrorCodes.DUPLICATE_ENTRY;
    message = "Resource already exists";
  }
  // In development, include more details
  else if (process.env.NODE_ENV === "development") {
    details = {
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 5),
    };
  }

  // Capture server errors with Sentry
  if (statusCode >= 500) {
    captureException(err, {
      statusCode,
      errorCode,
      path: req.path,
      method: req.method,
      query: req.query,
      userId: (req as any).user?.id || (req as any).user?.claims?.sub,
    });
  }

  const response: ErrorResponse = {
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

// ============================================================================
// Not Found Handler (for undefined routes)
// ============================================================================

export function notFoundHandler(req: Request, res: Response): Response {
  const response: ErrorResponse = {
    error: `Route not found: ${req.method} ${req.path}`,
    code: ErrorCodes.NOT_FOUND,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  return res.status(404).json(response);
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Helper functions for creating error responses (without throwing)
// ============================================================================

export function sendErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  code: ErrorCode,
  details?: any
): Response {
  const response: ErrorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Convenience helpers for common error responses
 */
export const sendError = {
  badRequest: (res: Response, message: string, details?: any) =>
    sendErrorResponse(res, 400, message, ErrorCodes.VALIDATION_ERROR, details),

  unauthorized: (res: Response, message: string = "Authentication required") =>
    sendErrorResponse(res, 401, message, ErrorCodes.AUTH_REQUIRED),

  forbidden: (res: Response, message: string = "Access denied") =>
    sendErrorResponse(res, 403, message, ErrorCodes.ACCESS_DENIED),

  notFound: (res: Response, resource: string = "Resource") =>
    sendErrorResponse(res, 404, `${resource} not found`, ErrorCodes.NOT_FOUND),

  conflict: (res: Response, message: string) =>
    sendErrorResponse(res, 409, message, ErrorCodes.ALREADY_EXISTS),

  rateLimited: (res: Response, message: string = "Too many requests") =>
    sendErrorResponse(res, 429, message, ErrorCodes.RATE_LIMITED),

  internal: (res: Response, message: string = "Internal server error", details?: any) =>
    sendErrorResponse(res, 500, message, ErrorCodes.INTERNAL_ERROR, details),
};

// ============================================================================
// Legacy helper (kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use sendError.* helpers instead
 */
export function createErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  code?: ErrorCode
): Response {
  return sendErrorResponse(
    res,
    statusCode,
    message,
    code || (statusCode >= 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.VALIDATION_ERROR)

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}
