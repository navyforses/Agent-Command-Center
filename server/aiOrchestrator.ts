import { openai, AI_MODEL } from "./openai";
import { storage } from "./storage";
import { 
  processDocument, 
  processDocumentFromUrl,
  extractTextFromPDF,
  extractTextFromImage,
  type DocumentProcessingResult,
} from "./documentProcessor";
import type { 
  Document, 
  Child, 
  Therapy, 
  Appointment,
  InsertChild,
  InsertTherapy,
  InsertAppointment,
  InsertDocument,
} from "@shared/schema";

export interface ActionResult {
  success: boolean;
  actionType: string;
  data?: any;
  message: string;
  messageKa?: string;
}

export interface DocumentAnalysisResult {
  documentType: string;
  category: string;
  summary: string;
  summaryKa: string;
  keyFindings: string[];
  purpose: string;
  extractedChildInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    diagnosis?: string;
    diagnosisDate?: string;
  };
  suggestedActions?: Array<{
    type: "create_child" | "add_therapy" | "schedule_appointment";
    data: any;
    description: string;
    descriptionKa: string;
  }>;
}

const COMMAND_CENTER_SYSTEM_PROMPT = `You are the AI Command Center for the HIE Parent Command Center app - a comprehensive medical management platform for parents of children with Hypoxic-Ischemic Encephalopathy (HIE).

Your capabilities:
1. Document Processing: Analyze medical documents (PDFs, images), categorize them, extract key information
2. Action Execution: Create child profiles, add therapies, schedule appointments, draft emails
3. Knowledge Base: Reference uploaded documents to answer questions about the child's condition
4. Bilingual Support: Respond in both English and Georgian when appropriate

Document Types you recognize:
- form_100: Georgian Form 100 (child medical registration form)
- diagnosis: Medical diagnosis reports
- mri_report: MRI or brain imaging reports
- therapy_note: Therapy session notes or progress reports
- research: Medical research papers or clinical trial information
- prescription: Medication prescriptions
- lab_result: Laboratory test results
- other: Other medical documents

When analyzing Form 100 (Georgian medical form), extract:
- Child's name (ბავშვის სახელი და გვარი)
- Date of birth (დაბადების თარიღი)
- Diagnosis (დიაგნოზი)
- Diagnosis date (დიაგნოზის თარიღი)

Always be empathetic and supportive when discussing medical information with parents.`;

const DOCUMENT_ANALYSIS_PROMPT = `Analyze this medical document and provide a comprehensive analysis.

Document content:
{content}

Respond with a JSON object containing:
{
  "documentType": "form_100" | "diagnosis" | "mri_report" | "therapy_note" | "research" | "prescription" | "lab_result" | "other",
  "category": "Medical Records" | "Therapy" | "Research" | "Prescriptions" | "Lab Results" | "Other",
  "summary": "English summary of the document (2-3 sentences)",
  "summaryKa": "Georgian summary (ქართულ ენაზე მოკლე შეჯამება)",
  "keyFindings": ["Key finding 1", "Key finding 2", ...],
  "purpose": "What this document is used for",
  "extractedChildInfo": {
    "firstName": "Child's first name if found",
    "lastName": "Child's last name if found",
    "dateOfBirth": "YYYY-MM-DD if found",
    "diagnosis": "Diagnosis text if found",
    "diagnosisDate": "YYYY-MM-DD if found"
  },
  "suggestedActions": [
    {
      "type": "create_child" | "add_therapy" | "schedule_appointment",
      "data": { action-specific data },
      "description": "English description of suggested action",
      "descriptionKa": "Georgian description"
    }
  ]
}

If Form 100 is detected and child info is found, always suggest creating a child profile.
If therapy notes are found, suggest adding a therapy session.`;

export const commandCenterTools = [
  {
    type: "function" as const,
    function: {
      name: "createChildProfile",
      description: "Create a new child profile in the system. Use when user wants to add a child or when a Form 100 document is analyzed.",
      parameters: {
        type: "object",
        properties: {
          firstName: { type: "string", description: "Child's first name" },
          lastName: { type: "string", description: "Child's last name" },
          dateOfBirth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
          diagnosis: { type: "string", description: "Medical diagnosis" },
          diagnosisDate: { type: "string", description: "Date of diagnosis in YYYY-MM-DD format" },
          notes: { type: "string", description: "Additional notes about the child" },
        },
        required: ["firstName", "lastName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "addTherapy",
      description: "Add a new therapy for a child. Use when user wants to track a therapy program.",
      parameters: {
        type: "object",
        properties: {
          childId: { type: "number", description: "ID of the child" },
          type: { type: "string", description: "Type of therapy (e.g., Physical Therapy, Speech Therapy, Occupational Therapy)" },
          therapistName: { type: "string", description: "Name of the therapist" },
          frequency: { type: "string", description: "How often therapy occurs (e.g., 2x/week)" },
          goals: { type: "array", items: { type: "string" }, description: "Therapy goals" },
          notes: { type: "string", description: "Additional notes" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "scheduleAppointment",
      description: "Schedule a new appointment. Use when user wants to add a medical appointment or meeting.",
      parameters: {
        type: "object",
        properties: {
          childId: { type: "number", description: "ID of the child" },
          title: { type: "string", description: "Appointment title" },
          description: { type: "string", description: "Appointment description" },
          location: { type: "string", description: "Location of the appointment" },
          appointmentDate: { type: "string", description: "Date and time in ISO format" },
          endDate: { type: "string", description: "End date and time in ISO format" },
        },
        required: ["title", "appointmentDate"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sendEmail",
      description: "Send an email on behalf of the user.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyzeDocument",
      description: "Analyze an uploaded document and extract information. Use when a document is uploaded.",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "number", description: "ID of the document to analyze" },
          content: { type: "string", description: "Text content of the document" },
        },
        required: ["documentId"],
      },
    },
  },
];

export async function analyzeDocument(
  content: string,
  fileName: string,
  fileType: string
): Promise<DocumentAnalysisResult> {
  const prompt = DOCUMENT_ANALYSIS_PROMPT.replace("{content}", content || `[Document: ${fileName}, Type: ${fileType}]`);

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: COMMAND_CENTER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const responseContent = completion.choices[0]?.message?.content || "{}";
  
  try {
    const result = JSON.parse(responseContent) as DocumentAnalysisResult;
    return {
      documentType: result.documentType || "other",
      category: result.category || "Other",
      summary: result.summary || "Document analysis pending",
      summaryKa: result.summaryKa || "დოკუმენტის ანალიზი მიმდინარეობს",
      keyFindings: result.keyFindings || [],
      purpose: result.purpose || "",
      extractedChildInfo: result.extractedChildInfo,
      suggestedActions: result.suggestedActions,
    };
  } catch {
    return {
      documentType: "other",
      category: "Other",
      summary: "Unable to analyze document",
      summaryKa: "დოკუმენტის ანალიზი ვერ მოხერხდა",
      keyFindings: [],
      purpose: "",
    };
  }
}

export interface FullDocumentProcessingResult {
  extraction: DocumentProcessingResult;
  analysis: DocumentAnalysisResult;
  success: boolean;
  error?: string;
}

export async function processAndAnalyzeDocument(
  filePath: string | null,
  fileName: string,
  fileType: string,
  textContent?: string
): Promise<FullDocumentProcessingResult> {
  try {
    const extraction = await processDocument(filePath, fileType, textContent);
    
    if (!extraction.success || !extraction.text) {
      return {
        extraction,
        analysis: {
          documentType: "other",
          category: "Other",
          summary: extraction.error || "Failed to extract document content",
          summaryKa: "დოკუმენტის შინაარსის ამოღება ვერ მოხერხდა",
          keyFindings: [],
          purpose: "",
        },
        success: false,
        error: extraction.error,
      };
    }

    const analysis = await analyzeDocument(extraction.text, fileName, fileType);

    return {
      extraction,
      analysis,
      success: true,
    };
  } catch (error) {
    console.error("Full document processing error:", error);
    return {
      extraction: {
        success: false,
        text: "",
        extractionMethod: "none",
        error: error instanceof Error ? error.message : "Processing failed",
      },
      analysis: {
        documentType: "other",
        category: "Other",
        summary: "Document processing failed",
        summaryKa: "დოკუმენტის დამუშავება ვერ მოხერხდა",
        keyFindings: [],
        purpose: "",
      },
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

export async function executeAction(
  actionType: string,
  actionData: any,
  userId: string
): Promise<ActionResult> {
  try {
    switch (actionType) {
      case "create_child": {
        const childData: InsertChild = {
          userId,
          firstName: actionData.firstName,
          lastName: actionData.lastName,
          dateOfBirth: actionData.dateOfBirth || null,
          diagnosis: actionData.diagnosis || null,
          diagnosisDate: actionData.diagnosisDate || null,
          notes: actionData.notes || null,
        };
        const child = await storage.createChild(childData);
        return {
          success: true,
          actionType: "create_child",
          data: child,
          message: `Child profile created for ${child.firstName} ${child.lastName}`,
          messageKa: `შეიქმნა ბავშვის პროფილი: ${child.firstName} ${child.lastName}`,
        };
      }

      case "add_therapy": {
        const therapyData: InsertTherapy = {
          userId,
          childId: actionData.childId || null,
          type: actionData.type,
          therapistName: actionData.therapistName || null,
          frequency: actionData.frequency || null,
          goals: actionData.goals || null,
          notes: actionData.notes || null,
          isActive: true,
          startDate: actionData.startDate || null,
        };
        const therapy = await storage.createTherapy(therapyData);
        return {
          success: true,
          actionType: "add_therapy",
          data: therapy,
          message: `Added ${therapy.type} therapy`,
          messageKa: `დაემატა ${therapy.type} თერაპია`,
        };
      }

      case "schedule_appointment": {
        const appointmentData: InsertAppointment = {
          userId,
          childId: actionData.childId || null,
          title: actionData.title,
          description: actionData.description || null,
          location: actionData.location || null,
          appointmentDate: new Date(actionData.appointmentDate),
          endDate: actionData.endDate ? new Date(actionData.endDate) : null,
          reminderSent: false,
          status: "scheduled",
        };
        const appointment = await storage.createAppointment(appointmentData);
        return {
          success: true,
          actionType: "schedule_appointment",
          data: appointment,
          message: `Scheduled appointment: ${appointment.title}`,
          messageKa: `დაინიშნა ვიზიტი: ${appointment.title}`,
        };
      }

      default:
        return {
          success: false,
          actionType,
          message: `Unknown action type: ${actionType}`,
          messageKa: `უცნობი ქმედების ტიპი: ${actionType}`,
        };
    }
  } catch (error) {
    console.error(`Error executing action ${actionType}:`, error);
    return {
      success: false,
      actionType,
      message: `Failed to execute action: ${actionType}`,
      messageKa: `ქმედების შესრულება ვერ მოხერხდა: ${actionType}`,
    };
  }
}

export interface SuggestedAction {
  actionType: string;
  actionData: any;
  description: string;
  descriptionKa?: string;
  status: "pending" | "confirmed" | "executed" | "cancelled";
}

export interface CommandCenterChatResult {
  content: string;
  suggestedActions?: SuggestedAction[];
  executedActions?: ActionResult[];
  documentIds?: number[];
}

function shouldIncludeFullContent(userMessage: string): boolean {
  const contentTriggers = [
    "what does", "what do", "what is", "what are",
    "tell me about", "explain", "describe", "summarize",
    "find in", "look for", "search",
    "according to", "based on", "in the document", "in my document",
    "from the", "from my",
    "details", "information about", "info about",
    "report", "results", "findings", "diagnosis",
    "treatment", "therapy", "medication", "prescription",
    "history", "condition", "progress",
    "mri", "scan", "test", "lab",
    "რას ნიშნავს", "რა არის", "ახსენი", "აღწერე", "შემაჯამე",
    "მოძებნე", "დოკუმენტში", "ანგარიშში",
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  return contentTriggers.some(trigger => lowerMessage.includes(trigger));
}

export async function processCommandCenterChat(
  userId: string,
  content: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  documents: Document[],
  children: Child[]
): Promise<CommandCenterChatResult> {
  const includeFullContent = shouldIncludeFullContent(content);
  const contextPrompt = buildContextPrompt(documents, children, includeFullContent);
  
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: COMMAND_CENTER_SYSTEM_PROMPT + "\n\n" + contextPrompt },
    ...chatHistory,
    { role: "user", content },
  ];

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages,
    tools: commandCenterTools,
    tool_choice: "auto",
  });

  const responseMessage = completion.choices[0]?.message;
  const suggestedActions: SuggestedAction[] = [];

  if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
    for (const toolCall of responseMessage.tool_calls) {
      if ('function' in toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        
        switch (toolCall.function.name) {
          case "createChildProfile":
            suggestedActions.push({
              actionType: "create_child",
              actionData: args,
              description: `Create child profile for ${args.firstName} ${args.lastName}`,
              descriptionKa: `შექმენით ბავშვის პროფილი: ${args.firstName} ${args.lastName}`,
              status: "pending",
            });
            break;
            
          case "addTherapy":
            suggestedActions.push({
              actionType: "add_therapy",
              actionData: args,
              description: `Add ${args.type} therapy`,
              descriptionKa: `დაამატეთ ${args.type} თერაპია`,
              status: "pending",
            });
            break;
            
          case "scheduleAppointment":
            suggestedActions.push({
              actionType: "schedule_appointment",
              actionData: args,
              description: `Schedule appointment: ${args.title}`,
              descriptionKa: `დანიშნეთ ვიზიტი: ${args.title}`,
              status: "pending",
            });
            break;
            
          case "sendEmail":
            suggestedActions.push({
              actionType: "send_email",
              actionData: args,
              description: `Send email to ${args.to}: ${args.subject}`,
              descriptionKa: `გაგზავნეთ ელ-ფოსტა ${args.to}-ზე: ${args.subject}`,
              status: "pending",
            });
            break;
            
          case "analyzeDocument":
            suggestedActions.push({
              actionType: "analyze_document",
              actionData: args,
              description: `Analyze document${args.documentId ? ` (ID: ${args.documentId})` : ''}`,
              descriptionKa: `გააანალიზეთ დოკუმენტი${args.documentId ? ` (ID: ${args.documentId})` : ''}`,
              status: "pending",
            });
            break;
            
          default:
            console.warn(`Unknown tool call: ${toolCall.function.name}`);
            break;
        }
      }
    }

    let responseContent = responseMessage.content || "";
    
    if (suggestedActions.length > 0 && !responseContent) {
      const actionSummary = suggestedActions
        .map(a => `- ${a.description}`)
        .join("\n");
      
      responseContent = `Based on your request, I suggest the following actions:\n\n${actionSummary}\n\nPlease confirm or cancel each action.`;
    }

    return {
      content: responseContent,
      suggestedActions,
    };
  }

  return {
    content: responseMessage?.content || "I apologize, but I couldn't process your request. Please try again.",
  };
}

function buildContextPrompt(documents: Document[], children: Child[], includeFullContent: boolean = false): string {
  let context = "=== KNOWLEDGE BASE ===\n\n";

  if (children.length > 0) {
    context += "CHILD PROFILES:\n";
    children.forEach(child => {
      context += `\n--- Child: ${child.firstName} ${child.lastName} [ID: ${child.id}] ---\n`;
      if (child.dateOfBirth) context += `Date of Birth: ${child.dateOfBirth}\n`;
      if (child.diagnosis) context += `Diagnosis: ${child.diagnosis}\n`;
      if (child.diagnosisDate) context += `Diagnosis Date: ${child.diagnosisDate}\n`;
      if (child.notes) context += `Notes: ${child.notes}\n`;
    });
    context += "\n";
  } else {
    context += "CHILD PROFILES: None created yet.\n\n";
  }

  if (documents.length > 0) {
    context += "MEDICAL DOCUMENTS:\n";
    context += "(Use this information to answer questions about the child's condition, treatments, and medical history)\n\n";
    
    documents.forEach((doc, index) => {
      context += `--- Document ${index + 1}: ${doc.title} [ID: ${doc.id}] ---\n`;
      context += `Type: ${doc.documentType || "Unknown"}\n`;
      context += `Category: ${doc.category || "Uncategorized"}\n`;
      
      if (doc.purpose) {
        context += `Purpose: ${doc.purpose}\n`;
      }
      
      if (doc.aiSummary) {
        context += `Summary: ${doc.aiSummary}\n`;
      }
      
      if (doc.aiKeyFindings && Array.isArray(doc.aiKeyFindings) && doc.aiKeyFindings.length > 0) {
        context += `Key Findings:\n`;
        doc.aiKeyFindings.forEach(finding => {
          if (finding) {
            context += `  - ${finding}\n`;
          }
        });
      }
      
      if (includeFullContent && doc.extractedText && typeof doc.extractedText === 'string') {
        const maxTextLength = 3000;
        const text = doc.extractedText.length > maxTextLength 
          ? doc.extractedText.substring(0, maxTextLength) + "... [truncated]"
          : doc.extractedText;
        context += `\nFull Document Content:\n${text}\n`;
      }
      
      context += "\n";
    });
  } else {
    context += "MEDICAL DOCUMENTS: No documents uploaded yet.\n\n";
  }

  context += "=== END KNOWLEDGE BASE ===\n\n";
  context += "INSTRUCTIONS: When answering questions about the child's medical condition, treatments, or history, reference the documents and information above. Cite specific documents by name when relevant. If asked about something not in the knowledge base, clearly state that information is not available in the uploaded documents.\n";

  return context;
}

export async function generateBilingualResponse(
  englishContent: string
): Promise<{ english: string; georgian: string }> {
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a translator. Translate the following English text to Georgian (ქართული). Keep medical terms accurate. Respond with JSON: {\"georgian\": \"translated text\"}",
      },
      { role: "user", content: englishContent },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return {
      english: englishContent,
      georgian: result.georgian || englishContent,
    };
  } catch {
    return {
      english: englishContent,
      georgian: englishContent,
    };
  }
}
