import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import type { 
  InsertNexusFinding, 
  InsertNexusAiAnalysis, 
  InsertNexusDisciplinaryAnalysis,
  NexusResearchQuery,
  NexusFinding,
} from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

interface AIResearchResponse {
  provider: string;
  agentId: string;
  content: string;
  keyPoints: string[];
  concerns: string[];
  uniqueInsights: string[];
  confidence: number;
  success: boolean;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

interface DisciplinaryPerspective {
  discipline: string;
  analysis: string;
  crossConnections: { toDiscipline: string; connection: string; strength?: number }[];
}

interface ResearchOrchestrationResult {
  query: NexusResearchQuery;
  finding: NexusFinding;
  aiAnalyses: AIResearchResponse[];
  disciplinaryPerspectives: DisciplinaryPerspective[];
  consensusLevel: "low" | "moderate" | "high" | "unanimous";
  processingTimeMs: number;
}

const NEXUS_RESEARCH_SYSTEM_PROMPT = `You are an advanced research AI agent analyzing medical and scientific queries related to Hypoxic-Ischemic Encephalopathy (HIE) and related neurological conditions.

Your task is to provide a structured research analysis. Respond with a JSON object containing:
{
  "summary": "A concise summary of findings (2-3 paragraphs)",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "concerns": ["Concern or limitation 1", "Concern 2", ...],
  "uniqueInsights": ["Unique perspective or insight 1", ...],
  "confidence": 85,
  "sources": [{"title": "Source name", "snippet": "Relevant excerpt"}]
}

Focus on:
- Evidence-based medical research
- Current clinical trials and emerging therapies
- Neuroprotection mechanisms and pathways
- Cross-disciplinary connections (neuroscience, immunology, pharmacology, etc.)
- Practical implications for treatment

Be thorough but concise. Always cite confidence level (0-100) based on evidence strength.`;

async function queryOpenAIResearch(query: string): Promise<AIResearchResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: NEXUS_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: `Research query: ${query}\n\nProvide your structured analysis in JSON format.` },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      provider: "OpenAI",
      agentId: "gpt4",
      content: parsed.summary || content,
      keyPoints: parsed.keyPoints || [],
      concerns: parsed.concerns || [],
      uniqueInsights: parsed.uniqueInsights || [],
      confidence: parsed.confidence || 70,
      success: true,
      rawResponse: parsed,
    };
  } catch (error) {
    console.error("OpenAI research error:", error);
    return {
      provider: "OpenAI",
      agentId: "gpt4",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryGeminiResearch(query: string): Promise<AIResearchResponse> {
  try {
    const prompt = `${NEXUS_RESEARCH_SYSTEM_PROMPT}

Research query: ${query}

Provide your structured analysis in JSON format.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const content = response.text || "{}";
    let parsed: Record<string, unknown> = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { summary: content };
    }

    return {
      provider: "Gemini",
      agentId: "gemini",
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      concerns: (parsed.concerns as string[]) || [],
      uniqueInsights: (parsed.uniqueInsights as string[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
      rawResponse: parsed,
    };
  } catch (error) {
    console.error("Gemini research error:", error);
    return {
      provider: "Gemini",
      agentId: "gemini",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryAnthropicResearch(query: string): Promise<AIResearchResponse> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: NEXUS_RESEARCH_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Research query: ${query}\n\nProvide your structured analysis in JSON format.` },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    let parsed: Record<string, unknown> = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { summary: content };
    }

    return {
      provider: "Claude",
      agentId: "claude",
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      concerns: (parsed.concerns as string[]) || [],
      uniqueInsights: (parsed.uniqueInsights as string[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
      rawResponse: parsed,
    };
  } catch (error) {
    console.error("Claude research error:", error);
    return {
      provider: "Claude",
      agentId: "claude",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryPerplexityResearch(query: string): Promise<AIResearchResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    return {
      provider: "Perplexity",
      agentId: "perplexity",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: "PERPLEXITY_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: NEXUS_RESEARCH_SYSTEM_PROMPT },
          { role: "user", content: `Research query: ${query}\n\nProvide your structured analysis in JSON format.` },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { summary: content };
    }

    return {
      provider: "Perplexity",
      agentId: "perplexity",
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      concerns: (parsed.concerns as string[]) || [],
      uniqueInsights: (parsed.uniqueInsights as string[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
      rawResponse: parsed,
    };
  } catch (error) {
    console.error("Perplexity research error:", error);
    return {
      provider: "Perplexity",
      agentId: "perplexity",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryGrokResearch(query: string): Promise<AIResearchResponse> {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return {
      provider: "Grok",
      agentId: "grok",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: "XAI_API_KEY not configured",
    };
  }

  try {
    const completion = await grok.chat.completions.create({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: NEXUS_RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: `Research query: ${query}\n\nProvide your structured analysis in JSON format.` },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { summary: content };
    }

    return {
      provider: "Grok",
      agentId: "grok",
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      concerns: (parsed.concerns as string[]) || [],
      uniqueInsights: (parsed.uniqueInsights as string[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
      rawResponse: parsed,
    };
  } catch (error) {
    console.error("Grok research error:", error);
    return {
      provider: "Grok",
      agentId: "grok",
      content: "",
      keyPoints: [],
      concerns: [],
      uniqueInsights: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function calculateConsensusLevel(responses: AIResearchResponse[]): "low" | "moderate" | "high" | "unanimous" {
  const successful = responses.filter(r => r.success && r.content.trim());
  if (successful.length === 0) return "low";
  if (successful.length <= 2) return "low";
  if (successful.length === 3) return "moderate";
  if (successful.length === 4) return "high";
  return "unanimous";
}

async function synthesizeFindingTitle(query: string, responses: AIResearchResponse[]): Promise<string> {
  const successful = responses.filter(r => r.success);
  if (successful.length === 0) return `Research: ${query.substring(0, 50)}...`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Generate a concise, informative title (max 80 chars) for a research finding based on the query and AI responses. Return only the title, no quotes or extra text." 
        },
        { 
          role: "user", 
          content: `Query: ${query}\n\nKey points from research:\n${successful.map(r => r.keyPoints.slice(0, 2).join(", ")).join("\n")}` 
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || `Research: ${query.substring(0, 50)}`;
  } catch {
    return `Research: ${query.substring(0, 50)}${query.length > 50 ? "..." : ""}`;
  }
}

async function synthesizeFindingSummary(query: string, responses: AIResearchResponse[]): Promise<string> {
  const successful = responses.filter(r => r.success && r.content);
  if (successful.length === 0) return "No analysis available from AI agents.";
  if (successful.length === 1) return successful[0].content;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `Synthesize multiple AI research analyses into a coherent summary. 
DO NOT mention that multiple AIs were used.
Create a unified narrative combining the best insights.
Maintain scientific accuracy and cite confidence levels where appropriate.
Be concise but comprehensive (3-4 paragraphs max).` 
        },
        { 
          role: "user", 
          content: `Query: ${query}\n\n${successful.map(r => `[${r.provider}]:\n${r.content}`).join("\n\n---\n\n")}` 
        },
      ],
    });
    return completion.choices[0]?.message?.content || successful[0].content;
  } catch {
    return successful[0].content;
  }
}

async function generateDisciplinaryPerspectives(
  query: string, 
  findingSummary: string, 
  disciplines: string[]
): Promise<DisciplinaryPerspective[]> {
  if (!disciplines || disciplines.length === 0) {
    disciplines = ["neuroscience", "pharmacology"];
  }

  const perspectives: DisciplinaryPerspective[] = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are generating disciplinary perspectives for a multi-disciplinary research analysis.
For each discipline, provide:
1. A focused analysis from that discipline's viewpoint (2-3 paragraphs)
2. Cross-connections to other disciplines

Respond with a JSON array:
[{
  "discipline": "discipline name",
  "analysis": "Detailed analysis from this discipline's perspective...",
  "crossConnections": [
    {"toDiscipline": "other discipline", "connection": "how they connect", "strength": 0.8}
  ]
}]`
        },
        { 
          role: "user", 
          content: `Research query: ${query}\n\nFindings summary:\n${findingSummary}\n\nProvide perspectives for these disciplines: ${disciplines.join(", ")}` 
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const parsed = JSON.parse(content);
    const perspectivesArray = Array.isArray(parsed) ? parsed : (parsed.perspectives || parsed.disciplines || []);
    
    for (const p of perspectivesArray) {
      perspectives.push({
        discipline: p.discipline || "unknown",
        analysis: p.analysis || "",
        crossConnections: p.crossConnections || [],
      });
    }
  } catch (error) {
    console.error("Error generating disciplinary perspectives:", error);
    for (const discipline of disciplines) {
      perspectives.push({
        discipline,
        analysis: `Analysis from ${discipline} perspective is pending.`,
        crossConnections: [],
      });
    }
  }

  return perspectives;
}

export async function runNexusResearch(
  queryId: number,
  queryText: string,
  disciplines: string[] = [],
  userId: string
): Promise<ResearchOrchestrationResult> {
  const startTime = Date.now();

  await storage.updateNexusResearchQuery(queryId, userId, { status: "searching" });

  const responses = await Promise.all([
    queryOpenAIResearch(queryText),
    queryGeminiResearch(queryText),
    queryAnthropicResearch(queryText),
    queryPerplexityResearch(queryText),
    queryGrokResearch(queryText),
  ]);

  const successfulResponses = responses.filter(r => r.success);
  console.log(`NEXUS Research: ${successfulResponses.length}/5 AI agents responded`);

  await storage.updateNexusResearchQuery(queryId, userId, { status: "analyzing" });

  const consensusLevel = calculateConsensusLevel(responses);
  const title = await synthesizeFindingTitle(queryText, responses);
  const summary = await synthesizeFindingSummary(queryText, responses);

  const avgConfidence = successfulResponses.length > 0
    ? Math.round(successfulResponses.reduce((sum, r) => sum + r.confidence, 0) / successfulResponses.length)
    : 0;

  const allSources: { title: string; url?: string; doi?: string; snippet?: string }[] = [];
  for (const r of successfulResponses) {
    const rawSources = (r.rawResponse?.sources as Array<{ title?: string; url?: string; doi?: string; snippet?: string }>) || [];
    for (const s of rawSources) {
      if (s.title) {
        allSources.push({
          title: s.title,
          url: s.url,
          doi: s.doi,
          snippet: s.snippet,
        });
      }
    }
  }

  const findingData: InsertNexusFinding = {
    queryId,
    title,
    summary,
    consensusLevel,
    confidenceScore: avgConfidence,
    relevanceScore: Math.min(100, avgConfidence + 10),
    sources: allSources.length > 0 ? allSources : null,
    hypothesesGenerated: null,
  };

  const finding = await storage.createNexusFinding(findingData);

  for (const response of responses) {
    const analysisData: InsertNexusAiAnalysis = {
      findingId: finding.id,
      aiAgentId: response.agentId,
      perspective: response.content,
      confidence: response.confidence,
      keyPoints: response.keyPoints.length > 0 ? response.keyPoints : null,
      concerns: response.concerns.length > 0 ? response.concerns : null,
      uniqueInsights: response.uniqueInsights.length > 0 ? response.uniqueInsights : null,
      rawResponse: response.rawResponse || null,
    };
    await storage.createNexusAiAnalysis(analysisData);
  }

  await storage.updateNexusResearchQuery(queryId, userId, { status: "consensus" });

  const disciplinaryPerspectives = await generateDisciplinaryPerspectives(
    queryText, 
    summary, 
    disciplines
  );

  for (const perspective of disciplinaryPerspectives) {
    const disciplinaryData: InsertNexusDisciplinaryAnalysis = {
      findingId: finding.id,
      discipline: perspective.discipline,
      analysis: perspective.analysis,
      crossConnections: perspective.crossConnections.length > 0 ? perspective.crossConnections : null,
    };
    await storage.createNexusDisciplinaryAnalysis(disciplinaryData);
  }

  await storage.updateNexusResearchQuery(queryId, userId, { 
    status: "completed",
    completedAt: new Date(),
  });

  const updatedQuery = await storage.getNexusResearchQuery(queryId, userId);

  return {
    query: updatedQuery!,
    finding,
    aiAnalyses: responses,
    disciplinaryPerspectives,
    consensusLevel,
    processingTimeMs: Date.now() - startTime,
  };
}
