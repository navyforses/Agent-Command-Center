/**
 * Subscription Routes - Billing & Plans
 * ======================================
 * Manage user subscriptions and billing
 *
 * Plans:
 * - Free: Basic access, limited questions
 * - Standard: Full access, unlimited questions
 * - Premium: Priority support, email to researchers
 */

import { Router, Response } from "express";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

// Plan definitions
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    nameKa: "უფასო",
    price: 0,
    features: {
      feedAccess: true,
      questionsPerMonth: 5,
      savedItemsLimit: 20,
      emailResearchers: false,
      prioritySupport: false,
      deepResearch: false,
    },
  },
  standard: {
    id: "standard",
    name: "Standard",
    nameKa: "სტანდარტული",
    price: 9.99,
    features: {
      feedAccess: true,
      questionsPerMonth: 100,
      savedItemsLimit: 500,
      emailResearchers: true,
      prioritySupport: false,
      deepResearch: true,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    nameKa: "პრემიუმ",
    price: 24.99,
    features: {
      feedAccess: true,
      questionsPerMonth: -1, // unlimited
      savedItemsLimit: -1, // unlimited
      emailResearchers: true,
      prioritySupport: true,
      deepResearch: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Validation
const createSubscriptionSchema = z.object({
  planId: z.enum(["free", "standard", "premium"]),
  paymentMethodId: z.string().optional(),
});

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 */
router.get("/plans", async (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    plans: Object.values(PLANS),
  });
});

/**
 * GET /api/subscriptions/current
 * Get user's current subscription
 */
router.get("/current", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const subscription = await storage.getUserSubscription(userId);

    if (!subscription) {
      // Default to free plan
      return res.json({
        subscription: null,
        plan: PLANS.free,
        usage: {
          questionsThisMonth: 0,
          savedItems: 0,
        },
      });
    }

    const plan = PLANS[subscription.planId as PlanId] || PLANS.free;

    // Get current usage
    const questionsThisMonth = await storage.getUserQuestionsThisMonth(userId);
    const savedItemsCount = await storage.getSavedItemsCount(userId);

    return res.json({
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan,
      usage: {
        questionsThisMonth,
        savedItems: savedItemsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return sendError.internal(res, "Failed to fetch subscription");
  }
});

/**
 * POST /api/subscriptions
 * Create/upgrade subscription
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = createSubscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid subscription data", parseResult.error.errors);
    }

    const { planId, paymentMethodId } = parseResult.data;
    const plan = PLANS[planId];

    // Check if upgrading from existing subscription
    const existingSubscription = await storage.getUserSubscription(userId);

    if (planId !== "free" && !paymentMethodId) {
      // In production, you would integrate with Stripe/Paddle here
      return sendError.badRequest(res, "Payment method required for paid plans");
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      subscription = await storage.updateUserSubscription(existingSubscription.id, {
        planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    } else {
      // Create new subscription
      subscription = await storage.createUserSubscription({
        userId,
        planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    return res.json({
      subscription,
      plan,
      message: `Subscribed to ${plan.name} plan`,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return sendError.internal(res, "Failed to create subscription");
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription (at period end)
 */
router.post("/cancel", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const subscription = await storage.getUserSubscription(userId);
    if (!subscription) {
      return sendError.notFound(res, "Subscription");
    }

    if (subscription.planId === "free") {
      return sendError.badRequest(res, "Cannot cancel free plan");
    }

    const updated = await storage.updateUserSubscription(subscription.id, {
      cancelAtPeriodEnd: true,
    });

    return res.json({
      subscription: updated,
      message: "Subscription will be cancelled at period end",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return sendError.internal(res, "Failed to cancel subscription");
  }
});

/**
 * POST /api/subscriptions/reactivate
 * Reactivate cancelled subscription
 */
router.post("/reactivate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const subscription = await storage.getUserSubscription(userId);
    if (!subscription) {
      return sendError.notFound(res, "Subscription");
    }

    if (!subscription.cancelAtPeriodEnd) {
      return sendError.badRequest(res, "Subscription is not pending cancellation");
    }

    const updated = await storage.updateUserSubscription(subscription.id, {
      cancelAtPeriodEnd: false,
    });

    return res.json({
      subscription: updated,
      message: "Subscription reactivated",
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return sendError.internal(res, "Failed to reactivate subscription");
  }
});

/**
 * GET /api/subscriptions/usage
 * Get current usage stats
 */
router.get("/usage", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const subscription = await storage.getUserSubscription(userId);
    const plan = subscription ? PLANS[subscription.planId as PlanId] : PLANS.free;

    const questionsThisMonth = await storage.getUserQuestionsThisMonth(userId);
    const savedItemsCount = await storage.getSavedItemsCount(userId);

    const questionsLimit = plan.features.questionsPerMonth;
    const savedLimit = plan.features.savedItemsLimit;

    return res.json({
      questions: {
        used: questionsThisMonth,
        limit: questionsLimit,
        unlimited: questionsLimit === -1,
        remaining: questionsLimit === -1 ? -1 : Math.max(0, questionsLimit - questionsThisMonth),
      },
      savedItems: {
        used: savedItemsCount,
        limit: savedLimit,
        unlimited: savedLimit === -1,
        remaining: savedLimit === -1 ? -1 : Math.max(0, savedLimit - savedItemsCount),
      },
      plan: {
        id: plan.id,
        name: plan.name,
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return sendError.internal(res, "Failed to fetch usage");
  }
});

/**
 * Middleware to check subscription limits
 */
export async function checkQuestionLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: Function
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const subscription = await storage.getUserSubscription(userId);
    const plan = subscription ? PLANS[subscription.planId as PlanId] : PLANS.free;
    const limit = plan.features.questionsPerMonth;

    if (limit === -1) {
      // Unlimited
      return next();
    }

    const questionsThisMonth = await storage.getUserQuestionsThisMonth(userId);
    if (questionsThisMonth >= limit) {
      return sendError.rateLimited(
        res,
        `Question limit reached (${limit}/month). Upgrade your plan for more questions.`
      );
    }

    next();
  } catch (error) {
    console.error("Error checking question limit:", error);
    return sendError.internal(res, "Failed to check limits");
  }
}

export default router;
