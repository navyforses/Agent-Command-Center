/**
 * Question Routes - Q&A Feature
 * ==============================
 * Users can ask questions about articles, trials, or any medical topic
 * AI researches and provides comprehensive answers
 */

import { Router, Response } from "express";
import { storage } from "../storage";
import { AuthenticatedRequest, getUserId } from "../types";
import { sendError } from "../middleware/errorHandler";
import { getConsensusResponse, MULTI_AI_SYSTEM_PROMPT } from "../multiAI";
import { z } from "zod";

const router = Router();

// Validation schemas
const askQuestionSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  context: z
    .object({
      type: z.enum(["clinical_trial", "research_article", "drug_info", "general"]).optional(),
      itemId: z.string().optional(),
      itemTitle: z.string().optional(),
      itemContent: z.string().optional(),
    })
    .optional(),
  useDeepResearch: z.boolean().default(false),
});

/**
 * POST /api/questions/ask
 * Ask a question and get AI-powered answer
 */
router.post("/ask", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const parseResult = askQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError.badRequest(res, "Invalid question data", parseResult.error.errors);
    }

    const { question, context } = parseResult.data;

    // Get patient profile for personalized context
    const patientProfile = await storage.getPatientProfile(userId);

    // Build system prompt with context
    let systemPrompt = MULTI_AI_SYSTEM_PROMPT;

    if (patientProfile) {
      systemPrompt += `\n\nPatient context: ${patientProfile.primaryDiagnosis || "Not specified"}`;
      if (patientProfile.icd10Codes && patientProfile.icd10Codes.length > 0) {
        systemPrompt += `\nICD-10 codes: ${patientProfile.icd10Codes.join(", ")}`;
      }
    }

    // Build user message with context
    let userMessage = question;
    if (context?.itemTitle) {
      userMessage = `Context: User is asking about "${context.itemTitle}"\n\nQuestion: ${question}`;
    }
    if (context?.itemContent) {
      userMessage += `\n\nRelevant content: ${context.itemContent.substring(0, 2000)}`;
    }

    const startTime = Date.now();

    // Get AI response using multi-AI consensus
    const aiResponse = await getConsensusResponse(systemPrompt, userMessage);

    const processingTimeMs = Date.now() - startTime;
    const answer = aiResponse.content || "Unable to provide answer";
    const sources = aiResponse.sources || [];

    // Save question and answer to database
    const savedQuestion = await storage.createUserQuestion({
      userId,
      question,
      contextType: context?.type || "general",
      contextItemId: context?.itemId,
      contextItemTitle: context?.itemTitle,
    });

    const savedAnswer = await storage.createQuestionAnswer({
      questionId: savedQuestion.id,
      answer,
      confidence: 0.75, // Default confidence for consensus response
      sources,
      processingTimeMs,
    });

    return res.json({
      questionId: savedQuestion.id,
      question,
      answer,
      confidence: 0.75,
      sources,
      processingTimeMs,
      contextType: context?.type || "general",
      createdAt: savedQuestion.createdAt,
    });
  } catch (error) {
    console.error("Error processing question:", error);
    return sendError.internal(res, "Failed to process question");
  }
});

/**
 * GET /api/questions
 * Get user's question history
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const { page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const questions = await storage.getUserQuestions(userId, pageNum, limitNum);
    const total = await storage.getUserQuestionsCount(userId);

    return res.json({
      questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return sendError.internal(res, "Failed to fetch questions");
  }
});

/**
 * GET /api/questions/:id
 * Get specific question with answer
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return sendError.badRequest(res, "Invalid question ID");
    }

    const question = await storage.getUserQuestion(questionId, userId);
    if (!question) {
      return sendError.notFound(res, "Question");
    }

    const answers = await storage.getQuestionAnswers(questionId);

    return res.json({
      ...question,
      answers,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return sendError.internal(res, "Failed to fetch question");
  }
});

/**
 * DELETE /api/questions/:id
 * Delete a question from history
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return sendError.badRequest(res, "Invalid question ID");
    }

    const deleted = await storage.deleteUserQuestion(questionId, userId);
    if (!deleted) {
      return sendError.notFound(res, "Question");
    }

    return res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return sendError.internal(res, "Failed to delete question");
  }
});

/**
 * POST /api/questions/:id/follow-up
 * Ask a follow-up question
 */
router.post("/:id/follow-up", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError.unauthorized(res);
    }

    const originalQuestionId = parseInt(req.params.id, 10);
    if (isNaN(originalQuestionId)) {
      return sendError.badRequest(res, "Invalid question ID");
    }

    const { question: followUpQuestion } = req.body;
    if (!followUpQuestion || followUpQuestion.length < 5) {
      return sendError.badRequest(res, "Follow-up question must be at least 5 characters");
    }

    // Get original question for context
    const originalQuestion = await storage.getUserQuestion(originalQuestionId, userId);
    if (!originalQuestion) {
      return sendError.notFound(res, "Original question");
    }

    const originalAnswers = await storage.getQuestionAnswers(originalQuestionId);
    const lastAnswer = originalAnswers[originalAnswers.length - 1];

    // Build user message with conversation context
    const userMessage = `Previous question: ${originalQuestion.question}
Previous answer: ${lastAnswer?.answer || "No previous answer"}

Follow-up question: ${followUpQuestion}`;

    // Get AI response
    const startTime = Date.now();
    const aiResponse = await getConsensusResponse(MULTI_AI_SYSTEM_PROMPT, userMessage);
    const processingTimeMs = Date.now() - startTime;

    // Save follow-up answer
    const savedAnswer = await storage.createQuestionAnswer({
      questionId: originalQuestionId,
      answer: aiResponse.content || "Unable to provide answer",
      confidence: 0.75,
      sources: aiResponse.sources || [],
      processingTimeMs,
      isFollowUp: true,
      followUpQuestion,
    });

    return res.json({
      questionId: originalQuestionId,
      followUpQuestion,
      answer: savedAnswer.answer,
      confidence: savedAnswer.confidence,
      sources: savedAnswer.sources,
      processingTimeMs,
    });
  } catch (error) {
    console.error("Error processing follow-up:", error);
    return sendError.internal(res, "Failed to process follow-up question");
  }
});

export default router;
