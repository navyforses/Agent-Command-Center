/**
 * Appointment Extractor Service
 * ==============================
 * AI-powered extraction of appointments from email text
 * Priority 2 feature: Email → Calendar integration
 */

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ExtractedAppointment {
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string; // ISO format
  endDate?: string; // ISO format
  confidence: number; // 0-1 confidence score
  sourceText?: string; // Original text that was parsed
}

export interface ExtractionResult {
  success: boolean;
  appointments: ExtractedAppointment[];
  rawResponse?: string;
  error?: string;
}

/**
 * Extract appointment information from email text using AI
 */
export async function extractAppointmentsFromEmail(
  emailText: string,
  emailSubject?: string
): Promise<ExtractionResult> {
  try {
    const systemPrompt = `You are an AI assistant specialized in extracting medical appointment information from emails.
Your task is to identify and extract appointment details from the provided email text.

Extract the following information for each appointment found:
- title: Brief description of the appointment (e.g., "MRI Scan", "Physical Therapy", "Dr. Smith Consultation")
- description: Additional details about the appointment
- location: Where the appointment takes place (hospital, clinic, address)
- appointmentDate: Date and time in ISO 8601 format (e.g., "2025-01-15T14:30:00")
- endDate: End time if mentioned, in ISO 8601 format
- confidence: Your confidence level (0.0-1.0) in the extraction accuracy

Important:
- If year is not specified, assume current year (2025)
- If time is not specified, assume 09:00
- Extract ALL appointments mentioned in the email
- If no appointments are found, return an empty array
- Return ONLY valid JSON, no additional text

Return format:
{
  "appointments": [
    {
      "title": "string",
      "description": "string or null",
      "location": "string or null",
      "appointmentDate": "ISO string",
      "endDate": "ISO string or null",
      "confidence": 0.0-1.0
    }
  ]
}`;

    const userMessage = emailSubject
      ? `Email Subject: ${emailSubject}\n\nEmail Body:\n${emailText}`
      : emailText;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";

    try {
      const parsed = JSON.parse(responseContent);
      const appointments: ExtractedAppointment[] = (parsed.appointments || []).map((apt: any) => ({
        title: apt.title || "Appointment",
        description: apt.description || undefined,
        location: apt.location || undefined,
        appointmentDate: apt.appointmentDate,
        endDate: apt.endDate || undefined,
        confidence: typeof apt.confidence === "number" ? apt.confidence : 0.5,
        sourceText: emailText.substring(0, 500), // Store first 500 chars as reference
      }));

      return {
        success: true,
        appointments,
        rawResponse: responseContent,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return {
        success: false,
        appointments: [],
        rawResponse: responseContent,
        error: "Failed to parse AI response as JSON",
      };
    }
  } catch (error) {
    console.error("Appointment extraction error:", error);
    return {
      success: false,
      appointments: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate and normalize extracted appointment data
 */
export function validateAppointment(appointment: ExtractedAppointment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!appointment.title || appointment.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!appointment.appointmentDate) {
    errors.push("Appointment date is required");
  } else {
    const date = new Date(appointment.appointmentDate);
    if (isNaN(date.getTime())) {
      errors.push("Invalid appointment date format");
    }
  }

  if (appointment.endDate) {
    const endDate = new Date(appointment.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push("Invalid end date format");
    } else if (appointment.appointmentDate) {
      const startDate = new Date(appointment.appointmentDate);
      if (endDate < startDate) {
        errors.push("End date cannot be before start date");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Batch extract appointments from multiple emails
 */
export async function extractAppointmentsFromEmails(
  emails: { text: string; subject?: string }[]
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  for (const email of emails) {
    const result = await extractAppointmentsFromEmail(email.text, email.subject);
    results.push(result);
  }

  return results;
}

export default {
  extractAppointmentsFromEmail,
  extractAppointmentsFromEmails,
  validateAppointment,
};
