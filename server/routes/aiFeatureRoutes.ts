/**
 * AI Feature Routes
 * ==================
 * P1 Features: Smart Search, Auto-Categorize, Email Draft
 * AI-powered endpoints for enhanced user experience
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ============================================================================
// Smart Search API
// ============================================================================

/**
 * POST /api/search/smart
 * Natural language search across user's data
 */
router.post("/search/smart", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { query, language = "ka" } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Query is required" });
    }

    // Fetch user data to search through
    const [children, appointments, documents, therapies] = await Promise.all([
      storage.getChildren(userId),
      storage.getAppointments(userId),
      storage.getDocuments(userId),
      storage.getTherapies(userId),
    ]);

    // Create context for AI
    const dataContext = {
      children: children.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        diagnosis: c.diagnosis,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        title: a.title,
        date: a.appointmentDate,
        location: a.location,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        type: d.fileType,
      })),
      therapies: therapies.map((t) => ({
        id: t.id,
        type: t.type,
        therapist: t.therapistName,
        active: t.isActive,
      })),
    };

    const systemPrompt = language === "ka"
      ? `შენ ხარ HIE Parent Command Center-ის ჭკვიანი ძიების ასისტენტი.
მომხმარებელს აქვს შემდეგი მონაცემები:
${JSON.stringify(dataContext, null, 2)}

მომხმარებლის შეკითხვის მიხედვით:
1. დააბრუნე რელევანტური შედეგები JSON ფორმატში
2. თუ შესაძლებელია, მიეცი მოკლე AI პასუხი
3. შემოგვთავაზე შესაბამისი მოქმედებები

პასუხის ფორმატი (მხოლოდ JSON):
{
  "results": [{"id": "...", "type": "document|appointment|therapy|child", "title": "...", "description": "...", "url": "...", "relevance": 0.0-1.0}],
  "aiSummary": "მოკლე პასუხი კითხვაზე (თუ შესაძლებელია)",
  "suggestedActions": [{"label": "მოქმედება", "action": "/path"}]
}`
      : `You are the smart search assistant for HIE Parent Command Center.
User has the following data:
${JSON.stringify(dataContext, null, 2)}

Based on the user's query:
1. Return relevant results in JSON format
2. If possible, provide a brief AI answer
3. Suggest relevant actions

Response format (JSON only):
{
  "results": [{"id": "...", "type": "document|appointment|therapy|child", "title": "...", "description": "...", "url": "...", "relevance": 0.0-1.0}],
  "aiSummary": "Brief answer to the question (if applicable)",
  "suggestedActions": [{"label": "Action", "action": "/path"}]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    const searchResult = JSON.parse(responseContent);

    // Map URLs based on result types
    const resultsWithUrls = (searchResult.results || []).map((r: any) => ({
      ...r,
      url: getUrlForResult(r.type, r.id),
    }));

    res.json({
      query,
      results: resultsWithUrls,
      aiSummary: searchResult.aiSummary,
      suggestedActions: searchResult.suggestedActions,
    });
  } catch (error) {
    console.error("Smart search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

function getUrlForResult(type: string, id: string | number): string {
  switch (type) {
    case "document":
      return `/documents`;
    case "appointment":
      return `/calendar`;
    case "therapy":
      return `/therapies`;
    case "child":
      return `/children/${id}`;
    case "research":
      return `/research-alerts`;
    default:
      return "/dashboard";
  }
}

// ============================================================================
// Document Categorization API
// ============================================================================

/**
 * POST /api/documents/:id/categorize
 * AI categorization for a single document
 */
router.post("/documents/:id/categorize", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const documentId = parseInt(req.params.id, 10);

    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const document = await storage.getDocument(documentId, userId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const systemPrompt = `You are a document classification AI for a medical care management platform.
Analyze the document information and categorize it.

Categories:
- medical_record: General medical records, clinical notes
- lab_result: Laboratory test results, blood work
- imaging: MRI, CT scans, X-rays, ultrasounds
- prescription: Medication prescriptions
- therapy_report: Physical therapy, occupational therapy reports
- insurance: Insurance documents, claims
- legal: Legal documents, authorizations
- correspondence: Letters, communications
- other: Anything else

Respond with JSON only:
{
  "suggestedCategory": "category_id",
  "confidence": 0.0-1.0,
  "alternativeCategories": [{"category": "id", "confidence": 0.0-1.0}],
  "extractedKeywords": ["keyword1", "keyword2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Document title: ${document.title}\nFile type: ${document.fileType || "unknown"}\nCurrent category: ${document.category || "none"}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

    res.json({
      documentId,
      ...result,
    });
  } catch (error) {
    console.error("Document categorization error:", error);
    res.status(500).json({ message: "Categorization failed" });
  }
});

/**
 * POST /api/documents/categorize-all
 * Categorize all uncategorized documents
 */
router.post("/documents/categorize-all", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const documents = await storage.getDocuments(userId);

    const uncategorized = documents.filter(
      (d) => !d.category || d.category === "other"
    );

    const results = [];

    for (const doc of uncategorized) {
      try {
        const systemPrompt = `Categorize this medical document. Categories: medical_record, lab_result, imaging, prescription, therapy_report, insurance, legal, correspondence, other.
Respond with JSON: {"suggestedCategory": "id", "confidence": 0.0-1.0, "alternativeCategories": [], "extractedKeywords": []}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Title: ${doc.title}, Type: ${doc.fileType}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
        results.push({
          documentId: doc.id,
          ...result,
        });
      } catch (err) {
        console.error(`Failed to categorize document ${doc.id}:`, err);
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Batch categorization error:", error);
    res.status(500).json({ message: "Batch categorization failed" });
  }
});

// ============================================================================
// Email Draft Generation API
// ============================================================================

/**
 * POST /api/emails/generate-draft
 * AI-powered email draft generation
 */
router.post("/emails/generate-draft", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const {
      purpose,
      prompt,
      recipientName,
      tone = "formal",
      additionalContext,
      language = "ka",
    } = req.body;

    if (!purpose) {
      return res.status(400).json({ message: "Purpose is required" });
    }

    // Get user info for signature
    const user = await storage.getUser(userId);
    const userName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`
      : "Parent";

    const toneInstructions = {
      formal: language === "ka" ? "ფორმალური, პროფესიონალური ტონი" : "formal, professional tone",
      friendly: language === "ka" ? "მეგობრული, თბილი ტონი" : "friendly, warm tone",
      urgent: language === "ka" ? "გადაუდებელი, მნიშვნელოვანი ტონი" : "urgent, important tone",
      grateful: language === "ka" ? "მადლიერი, დაფასებული ტონი" : "grateful, appreciative tone",
    };

    const systemPrompt = language === "ka"
      ? `შენ ხარ პროფესიონალური წერილების შემდგენელი HIE (Hypoxic-Ischemic Encephalopathy) მშობლებისთვის.
მომხმარებლის სახელი: ${userName}
მიმღების სახელი: ${recipientName || "მიმღები"}
ტონი: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.formal}

დაწერე ქართულ ენაზე პროფესიონალური წერილი.
${additionalContext ? `დამატებითი კონტექსტი: ${additionalContext}` : ""}

პასუხის ფორმატი (JSON):
{
  "subject": "წერილის სათაური",
  "body": "წერილის ტექსტი (ხელმოწერით)",
  "tone": "${tone}",
  "suggestions": ["შემოთავაზება 1", "შემოთავაზება 2"]
}`
      : `You are a professional email composer for HIE (Hypoxic-Ischemic Encephalopathy) parents.
User name: ${userName}
Recipient name: ${recipientName || "Recipient"}
Tone: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.formal}

Write a professional email in English.
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Response format (JSON):
{
  "subject": "Email subject line",
  "body": "Email body text (with signature)",
  "tone": "${tone}",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt || `Write an email for: ${purpose}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

    res.json(result);
  } catch (error) {
    console.error("Email draft generation error:", error);
    res.status(500).json({ message: "Failed to generate email draft" });
  }
});

export default router;
