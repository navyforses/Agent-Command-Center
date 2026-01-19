import * as pdfParse from "pdf-parse";
import { openai, AI_MODEL } from "./openai";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";
import type { File } from "@google-cloud/storage";

export interface ExtractedContent {
  text: string;
  pageCount?: number;
  metadata?: Record<string, any>;
  extractionMethod: "pdf" | "vision" | "text" | "none";
  language?: "en" | "ka" | "mixed" | "unknown";
}

export interface DocumentProcessingResult extends ExtractedContent {
  success: boolean;
  error?: string;
}

const VISION_OCR_PROMPT = `You are an OCR system specialized in medical documents. Extract ALL text from this image accurately.

For Georgian medical documents (like Form 100 / ფორმა 100):
- Preserve Georgian characters (ქართული) exactly as shown
- Extract names, dates, diagnoses, and all medical information
- Note any handwritten text separately

For English documents:
- Extract all text maintaining structure
- Preserve medical terminology accurately

Respond with JSON:
{
  "extractedText": "Full text content from the image",
  "language": "en" | "ka" | "mixed",
  "documentType": "form_100" | "diagnosis" | "mri_report" | "therapy_note" | "prescription" | "lab_result" | "other",
  "hasHandwriting": true/false,
  "structuredData": {
    "patientName": "if found",
    "dateOfBirth": "YYYY-MM-DD if found",
    "diagnosis": "if found",
    "date": "YYYY-MM-DD if found"
  }
}`;

export async function extractTextFromPDF(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    // @ts-ignore - pdf-parse types are not well-defined
    const data = await (pdfParse as any).default(buffer);

    const text = data.text?.trim() || "";
    const language = detectLanguage(text);

    return {
      success: true,
      text,
      pageCount: data.numpages,
      metadata: data.info,
      extractionMethod: "pdf",
      language,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: error instanceof Error ? error.message : "Failed to extract PDF text",
    };
  }
}

export async function extractTextFromImage(
  imageData: Buffer | string,
  mimeType: string = "image/jpeg"
): Promise<DocumentProcessingResult> {
  try {
    let base64Image: string;
    
    if (Buffer.isBuffer(imageData)) {
      base64Image = imageData.toString("base64");
    } else if (imageData.startsWith("data:")) {
      base64Image = imageData.split(",")[1];
    } else {
      base64Image = imageData;
    }

    const validMimeType = mimeType.startsWith("image/") ? mimeType : "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: VISION_OCR_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${validMimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    return {
      success: true,
      text: result.extractedText || "",
      extractionMethod: "vision",
      language: result.language || "unknown",
      metadata: {
        documentType: result.documentType,
        hasHandwriting: result.hasHandwriting,
        structuredData: result.structuredData,
      },
    };
  } catch (error) {
    console.error("Vision OCR error:", error);
    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: error instanceof Error ? error.message : "Failed to extract text from image",
    };
  }
}

async function downloadFileToBuffer(filePath: string): Promise<Buffer> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (filePath.startsWith("/objects/")) {
    const objectStorage = new ObjectStorageService();
    const file = await objectStorage.getObjectEntityFile(filePath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = file.createReadStream();
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  let normalizedPath = filePath;
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  const pathParts = normalizedPath.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error("Invalid path: must contain bucket and object name");
  }

  const bucketName = pathParts[0];
  const objectName = pathParts.slice(1).join("/");
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = file.createReadStream();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function processDocument(
  filePath: string | null,
  fileType: string,
  textContent?: string
): Promise<DocumentProcessingResult> {
  if (textContent && textContent.trim().length > 0) {
    return {
      success: true,
      text: textContent,
      extractionMethod: "text",
      language: detectLanguage(textContent),
    };
  }

  if (!filePath) {
    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: "No file path or text content provided",
    };
  }

  try {
    const fileBuffer = await downloadFileToBuffer(filePath);

    if (fileType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
      return await extractTextFromPDF(fileBuffer);
    }

    if (fileType.startsWith("image/") || 
        /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(filePath)) {
      const mimeType = fileType.startsWith("image/") ? fileType : getMimeTypeFromPath(filePath);
      return await extractTextFromImage(fileBuffer, mimeType);
    }

    if (fileType.startsWith("text/") || 
        /\.(txt|md|json|xml|csv)$/i.test(filePath)) {
      const text = fileBuffer.toString("utf-8");
      return {
        success: true,
        text,
        extractionMethod: "text",
        language: detectLanguage(text),
      };
    }

    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: `Unsupported file type: ${fileType}`,
    };
  } catch (error) {
    console.error("Document processing error:", error);
    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: error instanceof Error ? error.message : "Failed to process document",
    };
  }
}

export async function processDocumentFromUrl(
  url: string,
  fileType: string
): Promise<DocumentProcessingResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf")) {
      return await extractTextFromPDF(buffer);
    }

    if (fileType.startsWith("image/") || 
        /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(url)) {
      const mimeType = fileType.startsWith("image/") ? fileType : getMimeTypeFromPath(url);
      return await extractTextFromImage(buffer, mimeType);
    }

    if (fileType.startsWith("text/")) {
      const text = buffer.toString("utf-8");
      return {
        success: true,
        text,
        extractionMethod: "text",
        language: detectLanguage(text),
      };
    }

    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: `Unsupported file type: ${fileType}`,
    };
  } catch (error) {
    console.error("Document URL processing error:", error);
    return {
      success: false,
      text: "",
      extractionMethod: "none",
      error: error instanceof Error ? error.message : "Failed to process document from URL",
    };
  }
}

function detectLanguage(text: string): "en" | "ka" | "mixed" | "unknown" {
  if (!text || text.length < 10) return "unknown";

  const georgianPattern = /[\u10A0-\u10FF]/g;
  const latinPattern = /[a-zA-Z]/g;

  const georgianCount = (text.match(georgianPattern) || []).length;
  const latinCount = (text.match(latinPattern) || []).length;
  const totalLetters = georgianCount + latinCount;

  if (totalLetters === 0) return "unknown";

  const georgianRatio = georgianCount / totalLetters;
  const latinRatio = latinCount / totalLetters;

  if (georgianRatio > 0.7) return "ka";
  if (latinRatio > 0.7) return "en";
  if (georgianRatio > 0.2 && latinRatio > 0.2) return "mixed";
  
  return georgianRatio > latinRatio ? "ka" : "en";
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    xml: "application/xml",
    csv: "text/csv",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export function isImageFile(fileType: string, fileName?: string): boolean {
  if (fileType.startsWith("image/")) return true;
  if (fileName && /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(fileName)) return true;
  return false;
}

export function isPDFFile(fileType: string, fileName?: string): boolean {
  if (fileType === "application/pdf") return true;
  if (fileName && fileName.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export function isTextFile(fileType: string, fileName?: string): boolean {
  if (fileType.startsWith("text/")) return true;
  if (fileName && /\.(txt|md|json|xml|csv)$/i.test(fileName)) return true;
  return false;
}
