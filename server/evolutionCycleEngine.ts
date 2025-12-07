import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import type {
  EvolutionCycle,
  EvolutionDailyRun,
  EvolutionInsight,
  EvolutionPhase,
  EvolutionReport,
  InsertEvolutionInsight,
  InsertEvolutionDailyRun,
  InsertEvolutionCycle,
  InsertEvolutionReport,
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

const PHASE_DURATIONS: Record<EvolutionPhase, number> = {
  observe: 8,
  learn: 4,
  connect: 4,
  theorize: 4,
  validate: 2,
  adapt: 2,
};

const PHASE_ORDER: EvolutionPhase[] = ["observe", "learn", "connect", "theorize", "validate", "adapt"];

interface PhaseResult {
  insights: InsertEvolutionInsight[];
  success: boolean;
  error?: string;
}

interface AIResponse {
  content: string;
  keyPoints: string[];
  sources: { title: string; url?: string; snippet?: string; source?: string }[];
  confidence: number;
  success: boolean;
  error?: string;
}

async function translateToGeorgian(text: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in medical and scientific terminology. Translate the following English text to Georgian (ქართული). Maintain medical accuracy and use appropriate Georgian medical terminology. Provide only the translation, no explanations.`,
        },
        { role: "user", content: text },
      ],
    });

    return completion.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

async function queryPerplexity(query: string, systemPrompt: string): Promise<AIResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: "PERPLEXITY_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

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
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      sources: (parsed.sources as { title: string; url?: string; snippet?: string }[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
    };
  } catch (error) {
    console.error("Perplexity error:", error);
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryOpenAI(query: string, systemPrompt: string): Promise<AIResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      content: parsed.summary || content,
      keyPoints: parsed.keyPoints || [],
      sources: parsed.sources || [],
      confidence: parsed.confidence || 70,
      success: true,
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryGemini(query: string, systemPrompt: string): Promise<AIResponse> {
  try {
    const prompt = `${systemPrompt}\n\n${query}`;
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
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      sources: (parsed.sources as { title: string; url?: string; snippet?: string }[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
    };
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryClaude(query: string, systemPrompt: string): Promise<AIResponse> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
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
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      sources: (parsed.sources as { title: string; url?: string; snippet?: string }[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
    };
  } catch (error) {
    console.error("Claude error:", error);
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryGrok(query: string, systemPrompt: string): Promise<AIResponse> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: "XAI_API_KEY not configured",
    };
  }

  try {
    const completion = await grok.chat.completions.create({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
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
      content: (parsed.summary as string) || content,
      keyPoints: (parsed.keyPoints as string[]) || [],
      sources: (parsed.sources as { title: string; url?: string; snippet?: string }[]) || [],
      confidence: (parsed.confidence as number) || 70,
      success: true,
    };
  } catch (error) {
    console.error("Grok error:", error);
    return {
      content: "",
      keyPoints: [],
      sources: [],
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function executeObservePhase(diagnosisContext: string): Promise<PhaseResult> {
  const systemPrompt = `You are a medical research observer specializing in neurological conditions, particularly Hypoxic-Ischemic Encephalopathy (HIE) and related pediatric neurological disorders.

Your task is to search for and compile the latest research, clinical trials, and medical news related to the diagnosis provided.

Focus on:
- Recent PubMed publications (last 6 months)
- Active clinical trials on ClinicalTrials.gov
- Medical news and breakthrough announcements
- Emerging therapies and treatments
- New diagnostic techniques

Respond with a JSON object:
{
  "summary": "Overview of recent findings and developments (2-3 paragraphs)",
  "keyPoints": ["Key finding 1", "Key finding 2", ...],
  "sources": [{"title": "Source title", "url": "URL if available", "snippet": "Relevant excerpt", "source": "PubMed/ClinicalTrials/News"}],
  "clinicalTrials": ["Trial 1 description", "Trial 2 description", ...],
  "emergingTherapies": ["Therapy 1", "Therapy 2", ...],
  "confidence": 85
}`;

  const query = `Search for the latest medical research, clinical trials, and news related to: ${diagnosisContext}

Focus on:
1. Recent publications about treatments and outcomes
2. Active clinical trials accepting patients
3. Breakthrough research or discoveries
4. New rehabilitation approaches
5. Emerging technologies in this field`;

  const insights: InsertEvolutionInsight[] = [];

  const perplexityResult = await queryPerplexity(query, systemPrompt);

  if (perplexityResult.success) {
    const contentKa = await translateToGeorgian(perplexityResult.content);

    insights.push({
      phase: "observe",
      insightType: "observation",
      contentEn: perplexityResult.content,
      contentKa,
      sources: perplexityResult.sources,
      metadata: {
        keyPoints: perplexityResult.keyPoints,
        aiProvider: "perplexity",
        searchType: "real-time",
      },
      confidence: perplexityResult.confidence,
      relevanceScore: 80,
    });
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No observations gathered" : undefined,
  };
}

async function executeLearnPhase(diagnosisContext: string, observations: EvolutionInsight[]): Promise<PhaseResult> {
  const observationContext = observations
    .map((o) => o.contentEn)
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are a medical knowledge extraction specialist. Your task is to analyze research observations and extract structured medical knowledge.

Given observations from the OBSERVE phase, extract and structure:
- Key medical concepts and their relationships
- Treatment protocols and their evidence levels
- Mechanism pathways relevant to the condition
- Statistical patterns in outcomes
- Critical risk factors and contraindications

Respond with a JSON object:
{
  "summary": "Structured analysis of the observations (2-3 paragraphs)",
  "keyPoints": ["Extracted insight 1", "Extracted insight 2", ...],
  "conceptMap": [{"concept": "Concept name", "relatedTo": ["Related concept 1", ...], "evidenceLevel": "high/medium/low"}],
  "treatmentProtocols": [{"name": "Protocol name", "phases": ["Phase 1", ...], "evidence": "Description"}],
  "mechanismPathways": ["Pathway 1 description", ...],
  "sources": [{"title": "Source", "snippet": "Key excerpt"}],
  "confidence": 85
}`;

  const query = `Analyze and extract structured knowledge from these medical research observations related to ${diagnosisContext}:

${observationContext}

Provide structured extraction of:
1. Key medical concepts and terminology
2. Evidence-based treatment approaches
3. Biological mechanisms involved
4. Statistical findings and patterns
5. Risk factors and safety considerations`;

  const insights: InsertEvolutionInsight[] = [];

  const [gptResult, geminiResult] = await Promise.all([
    queryOpenAI(query, systemPrompt),
    queryGemini(query, systemPrompt),
  ]);

  if (gptResult.success) {
    const contentKa = await translateToGeorgian(gptResult.content);
    insights.push({
      phase: "learn",
      insightType: "learning",
      contentEn: gptResult.content,
      contentKa,
      sources: gptResult.sources,
      metadata: {
        keyPoints: gptResult.keyPoints,
        aiProvider: "gpt-4",
        analysisType: "knowledge-extraction",
      },
      confidence: gptResult.confidence,
      relevanceScore: 85,
    });
  }

  if (geminiResult.success) {
    const contentKa = await translateToGeorgian(geminiResult.content);
    insights.push({
      phase: "learn",
      insightType: "learning",
      contentEn: geminiResult.content,
      contentKa,
      sources: geminiResult.sources,
      metadata: {
        keyPoints: geminiResult.keyPoints,
        aiProvider: "gemini",
        analysisType: "knowledge-extraction",
      },
      confidence: geminiResult.confidence,
      relevanceScore: 85,
    });
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No learnings extracted" : undefined,
  };
}

async function executeConnectPhase(
  diagnosisContext: string,
  learnings: EvolutionInsight[]
): Promise<PhaseResult> {
  const learningContext = learnings
    .map((l) => l.contentEn)
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are a medical specialist focused on personalized medicine and connecting research findings to individual patient contexts.

Your task is to analyze structured medical knowledge and identify specific connections to a child's diagnosis. Consider:
- How findings apply to this specific condition
- Age-appropriate treatment adaptations
- Individual risk factors based on diagnosis specifics
- Potential contraindications for pediatric patients
- Quality of life implications

Respond with a JSON object:
{
  "summary": "Analysis of how findings connect to this child's diagnosis (2-3 paragraphs)",
  "keyPoints": ["Connection 1", "Connection 2", ...],
  "specificConnections": [{"finding": "Research finding", "applicationToChild": "How it applies", "priority": "high/medium/low"}],
  "ageConsiderations": ["Consideration 1", ...],
  "riskAssessment": [{"risk": "Risk description", "severity": "high/medium/low", "mitigation": "Mitigation strategy"}],
  "qualityOfLifeFactors": ["Factor 1", ...],
  "sources": [{"title": "Source", "snippet": "Relevant excerpt"}],
  "confidence": 85
}`;

  const query = `Connect these medical learnings to the specific diagnosis of: ${diagnosisContext}

Learnings from research:
${learningContext}

Analyze:
1. Direct applicability of each finding to this diagnosis
2. Age and development-appropriate adaptations
3. Specific risks for this patient profile
4. Potential benefits and quality of life improvements
5. Priority ranking of treatment approaches`;

  const insights: InsertEvolutionInsight[] = [];

  const claudeResult = await queryClaude(query, systemPrompt);

  if (claudeResult.success) {
    const contentKa = await translateToGeorgian(claudeResult.content);
    insights.push({
      phase: "connect",
      insightType: "connection",
      contentEn: claudeResult.content,
      contentKa,
      sources: claudeResult.sources,
      metadata: {
        keyPoints: claudeResult.keyPoints,
        aiProvider: "claude",
        connectionType: "diagnosis-specific",
      },
      confidence: claudeResult.confidence,
      relevanceScore: 90,
    });
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No connections established" : undefined,
  };
}

async function executeTheorizePhase(
  diagnosisContext: string,
  allInsights: EvolutionInsight[]
): Promise<PhaseResult> {
  const insightContext = allInsights
    .map((i) => `[${i.phase?.toUpperCase()}] ${i.contentEn}`)
    .filter(Boolean)
    .join("\n\n");

  const swarmPrompt = `You are part of a Multi-AI Swarm Intelligence system generating novel hypotheses for medical research.

Based on all gathered insights across observation, learning, and connection phases, generate:
- Novel therapeutic hypotheses
- Cross-disciplinary connections
- Emerging treatment combinations
- Predictive models for outcomes
- Research directions worth pursuing

Consider perspectives from:
- Neuroscience and neuroplasticity
- Pharmacology and drug development
- Rehabilitation science
- Developmental biology
- Technology and bioengineering

Respond with a JSON object:
{
  "summary": "Synthesis of insights leading to hypotheses (2-3 paragraphs)",
  "keyPoints": ["Key synthesis point 1", ...],
  "hypotheses": [
    {
      "hypothesis": "Hypothesis statement",
      "rationale": "Why this hypothesis is promising",
      "evidence": ["Supporting evidence 1", ...],
      "testability": "How it could be tested",
      "disciplines": ["Neuroscience", "Pharmacology", ...],
      "confidence": 75
    }
  ],
  "crossDisciplinaryConnections": [{"from": "Field 1", "to": "Field 2", "connection": "How they relate", "novelty": "high/medium/low"}],
  "predictions": [{"prediction": "Prediction statement", "timeframe": "Expected timeframe", "confidence": 70}],
  "sources": [{"title": "Source", "snippet": "Key excerpt"}],
  "confidence": 80
}`;

  const query = `Generate novel hypotheses based on all insights gathered for: ${diagnosisContext}

Accumulated insights:
${insightContext}

Generate:
1. Novel therapeutic hypotheses with supporting rationale
2. Cross-disciplinary connections that suggest new approaches
3. Predictions about treatment outcomes
4. Recommendations for further research
5. Potential breakthrough combinations of existing approaches`;

  const insights: InsertEvolutionInsight[] = [];

  const [gptResult, geminiResult, claudeResult, grokResult, perplexityResult] = await Promise.all([
    queryOpenAI(query, swarmPrompt),
    queryGemini(query, swarmPrompt),
    queryClaude(query, swarmPrompt),
    queryGrok(query, swarmPrompt),
    queryPerplexity(query, swarmPrompt),
  ]);

  const allResults = [
    { result: gptResult, provider: "gpt-4" },
    { result: geminiResult, provider: "gemini" },
    { result: claudeResult, provider: "claude" },
    { result: grokResult, provider: "grok" },
    { result: perplexityResult, provider: "perplexity" },
  ];

  for (const { result, provider } of allResults) {
    if (result.success) {
      const contentKa = await translateToGeorgian(result.content);
      insights.push({
        phase: "theorize",
        insightType: "hypothesis",
        contentEn: result.content,
        contentKa,
        sources: result.sources,
        metadata: {
          keyPoints: result.keyPoints,
          aiProvider: provider,
          hypothesisType: "swarm-generated",
        },
        confidence: result.confidence,
        relevanceScore: 85,
      });
    }
  }

  const successfulCount = allResults.filter((r) => r.result.success).length;
  const synthesisPrompt = `Based on ${successfulCount} AI perspectives, synthesize the most promising and consensus-backed hypotheses. Identify:
- Areas of agreement across AIs
- Unique insights from each perspective
- Strongest hypotheses with multi-AI support
- Areas of disagreement worth exploring

Respond with JSON containing synthesized conclusions.`;

  if (successfulCount >= 3) {
    const synthesisContext = allResults
      .filter((r) => r.result.success)
      .map((r) => `[${r.provider.toUpperCase()}]: ${r.result.content}`)
      .join("\n\n");

    const synthesisResult = await queryClaude(synthesisContext, synthesisPrompt);

    if (synthesisResult.success) {
      const contentKa = await translateToGeorgian(synthesisResult.content);
      insights.push({
        phase: "theorize",
        insightType: "prediction",
        contentEn: synthesisResult.content,
        contentKa,
        sources: synthesisResult.sources,
        metadata: {
          keyPoints: synthesisResult.keyPoints,
          aiProvider: "swarm-synthesis",
          participatingAIs: allResults.filter((r) => r.result.success).map((r) => r.provider),
        },
        confidence: synthesisResult.confidence,
        relevanceScore: 95,
      });
    }
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No hypotheses generated" : undefined,
  };
}

async function executeValidatePhase(
  diagnosisContext: string,
  hypotheses: EvolutionInsight[]
): Promise<PhaseResult> {
  const hypothesesContext = hypotheses
    .filter((h) => h.insightType === "hypothesis" || h.insightType === "prediction")
    .map((h) => h.contentEn)
    .filter(Boolean)
    .join("\n\n");

  const validationPrompt = `You are a medical research validator specializing in evidence-based medicine and hypothesis testing.

Your task is to validate generated hypotheses against:
- Existing clinical evidence
- Published research outcomes
- Known contraindications
- Biological plausibility
- Practical feasibility

For each hypothesis, assess:
- Evidence support level (strong/moderate/weak/none)
- Potential conflicts with existing knowledge
- Required conditions for validity
- Suggested validation approaches

Respond with a JSON object:
{
  "summary": "Overall validation assessment (2-3 paragraphs)",
  "keyPoints": ["Validation finding 1", ...],
  "validationResults": [
    {
      "hypothesis": "Hypothesis being validated",
      "evidenceLevel": "strong/moderate/weak/none",
      "supportingEvidence": ["Evidence 1", ...],
      "contradictingEvidence": ["Counter-evidence 1", ...],
      "feasibility": "high/medium/low",
      "recommendation": "pursue/modify/reject",
      "validationApproach": "How to further validate"
    }
  ],
  "overallConfidence": 75,
  "prioritizedHypotheses": ["Hypothesis 1", "Hypothesis 2", ...],
  "sources": [{"title": "Source", "snippet": "Relevant validation evidence"}],
  "confidence": 80
}`;

  const query = `Validate these hypotheses against existing medical evidence for: ${diagnosisContext}

Hypotheses to validate:
${hypothesesContext}

For each hypothesis:
1. Search for supporting and contradicting evidence
2. Assess biological plausibility
3. Evaluate practical feasibility
4. Recommend priority level
5. Suggest validation methodology`;

  const insights: InsertEvolutionInsight[] = [];

  const [perplexityResult, claudeResult] = await Promise.all([
    queryPerplexity(query, validationPrompt),
    queryClaude(query, validationPrompt),
  ]);

  if (perplexityResult.success) {
    const contentKa = await translateToGeorgian(perplexityResult.content);
    insights.push({
      phase: "validate",
      insightType: "validation",
      contentEn: perplexityResult.content,
      contentKa,
      sources: perplexityResult.sources,
      metadata: {
        keyPoints: perplexityResult.keyPoints,
        aiProvider: "perplexity",
        validationType: "evidence-search",
      },
      confidence: perplexityResult.confidence,
      relevanceScore: 90,
    });
  }

  if (claudeResult.success) {
    const contentKa = await translateToGeorgian(claudeResult.content);
    insights.push({
      phase: "validate",
      insightType: "validation",
      contentEn: claudeResult.content,
      contentKa,
      sources: claudeResult.sources,
      metadata: {
        keyPoints: claudeResult.keyPoints,
        aiProvider: "claude",
        validationType: "logical-validation",
      },
      confidence: claudeResult.confidence,
      relevanceScore: 90,
    });
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No validation completed" : undefined,
  };
}

async function executeAdaptPhase(
  diagnosisContext: string,
  allInsights: EvolutionInsight[]
): Promise<PhaseResult> {
  const insightsByPhase = {
    observe: allInsights.filter((i) => i.phase === "observe"),
    learn: allInsights.filter((i) => i.phase === "learn"),
    connect: allInsights.filter((i) => i.phase === "connect"),
    theorize: allInsights.filter((i) => i.phase === "theorize"),
    validate: allInsights.filter((i) => i.phase === "validate"),
  };

  const adaptationPrompt = `You are a medical AI adaptation specialist. Your task is to analyze the complete cycle of research and generate adaptation recommendations.

Based on all phases (observe, learn, connect, theorize, validate), determine:
- What new knowledge should be integrated into the research model
- How to improve future observation strategies
- Which hypothesis directions proved most promising
- What knowledge gaps remain
- Recommended focus areas for the next cycle

Respond with a JSON object:
{
  "summary": "Cycle summary and adaptation recommendations (2-3 paragraphs)",
  "keyPoints": ["Adaptation insight 1", ...],
  "knowledgeIntegration": [
    {"knowledge": "New knowledge item", "confidence": 85, "source": "Which phase"}
  ],
  "modelUpdates": [
    {"aspect": "Model aspect to update", "currentState": "Current understanding", "updatedState": "New understanding", "evidence": "Supporting evidence"}
  ],
  "focusRecommendations": [
    {"area": "Focus area", "rationale": "Why to focus here", "priority": "high/medium/low"}
  ],
  "knowledgeGaps": ["Gap 1", "Gap 2", ...],
  "nextCycleStrategy": {
    "observeFocus": ["Focus area 1", ...],
    "hypothesisPriorities": ["Priority 1", ...],
    "validationNeeds": ["Need 1", ...]
  },
  "sources": [{"title": "Source", "snippet": "Key adaptation evidence"}],
  "confidence": 85
}`;

  const query = `Analyze the complete research cycle and generate adaptation recommendations for: ${diagnosisContext}

Phase Results:
OBSERVE (${insightsByPhase.observe.length} insights): ${insightsByPhase.observe.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

LEARN (${insightsByPhase.learn.length} insights): ${insightsByPhase.learn.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

CONNECT (${insightsByPhase.connect.length} insights): ${insightsByPhase.connect.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

THEORIZE (${insightsByPhase.theorize.length} insights): ${insightsByPhase.theorize.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

VALIDATE (${insightsByPhase.validate.length} insights): ${insightsByPhase.validate.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

Generate:
1. Knowledge to integrate from this cycle
2. Model updates based on new findings
3. Focus recommendations for next cycle
4. Identified knowledge gaps
5. Strategy for next 24-hour cycle`;

  const insights: InsertEvolutionInsight[] = [];

  const [gptResult, claudeResult] = await Promise.all([
    queryOpenAI(query, adaptationPrompt),
    queryClaude(query, adaptationPrompt),
  ]);

  if (gptResult.success) {
    const contentKa = await translateToGeorgian(gptResult.content);
    insights.push({
      phase: "adapt",
      insightType: "adaptation",
      contentEn: gptResult.content,
      contentKa,
      sources: gptResult.sources,
      metadata: {
        keyPoints: gptResult.keyPoints,
        aiProvider: "gpt-4",
        adaptationType: "model-update",
        cycleStats: {
          observeCount: insightsByPhase.observe.length,
          learnCount: insightsByPhase.learn.length,
          connectCount: insightsByPhase.connect.length,
          theorizeCount: insightsByPhase.theorize.length,
          validateCount: insightsByPhase.validate.length,
        },
      },
      confidence: gptResult.confidence,
      relevanceScore: 90,
    });
  }

  if (claudeResult.success) {
    const contentKa = await translateToGeorgian(claudeResult.content);
    insights.push({
      phase: "adapt",
      insightType: "adaptation",
      contentEn: claudeResult.content,
      contentKa,
      sources: claudeResult.sources,
      metadata: {
        keyPoints: claudeResult.keyPoints,
        aiProvider: "claude",
        adaptationType: "strategic-planning",
      },
      confidence: claudeResult.confidence,
      relevanceScore: 90,
    });
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No adaptations generated" : undefined,
  };
}

export async function executeEvolutionPhase(
  dailyRunId: number,
  phase: EvolutionPhase
): Promise<{ success: boolean; insightsCreated: number; error?: string }> {
  console.log(`[Evolution Engine] Executing phase: ${phase} for daily run ${dailyRunId}`);

  const dailyRun = await storage.getEvolutionDailyRun(dailyRunId);
  if (!dailyRun || !dailyRun.cycleId) {
    return { success: false, insightsCreated: 0, error: "Daily run not found" };
  }

  const cycles = await storage.getEvolutionCycles("");
  const cycle = cycles.find((c) => c.id === dailyRun.cycleId);
  if (!cycle) {
    return { success: false, insightsCreated: 0, error: "Cycle not found" };
  }

  const diagnosisContext = cycle.diagnosisContext || "General neurological condition";

  await storage.updateEvolutionDailyRun(dailyRunId, {
    currentPhase: phase,
    phaseStartedAt: new Date(),
    status: "running",
  });

  let phaseResult: PhaseResult;

  try {
    const previousInsights = await storage.getEvolutionInsights(dailyRunId);

    switch (phase) {
      case "observe":
        phaseResult = await executeObservePhase(diagnosisContext);
        break;

      case "learn":
        const observations = previousInsights.filter((i) => i.phase === "observe");
        phaseResult = await executeLearnPhase(diagnosisContext, observations);
        break;

      case "connect":
        const learnings = previousInsights.filter((i) => i.phase === "learn");
        phaseResult = await executeConnectPhase(diagnosisContext, learnings);
        break;

      case "theorize":
        phaseResult = await executeTheorizePhase(diagnosisContext, previousInsights);
        break;

      case "validate":
        const hypotheses = previousInsights.filter(
          (i) => i.phase === "theorize"
        );
        phaseResult = await executeValidatePhase(diagnosisContext, hypotheses);
        break;

      case "adapt":
        phaseResult = await executeAdaptPhase(diagnosisContext, previousInsights);
        break;

      default:
        return { success: false, insightsCreated: 0, error: `Unknown phase: ${phase}` };
    }

    for (const insight of phaseResult.insights) {
      await storage.createEvolutionInsight({
        ...insight,
        dailyRunId,
      });
    }

    const currentPhasesCompleted = dailyRun.phasesCompleted || [];
    if (!currentPhasesCompleted.includes(phase)) {
      currentPhasesCompleted.push(phase);
    }

    await storage.updateEvolutionDailyRun(dailyRunId, {
      phasesCompleted: currentPhasesCompleted,
      status: currentPhasesCompleted.length === 6 ? "completed" : "running",
      ...(currentPhasesCompleted.length === 6 ? { completedAt: new Date() } : {}),
    });

    console.log(
      `[Evolution Engine] Phase ${phase} completed with ${phaseResult.insights.length} insights`
    );

    return {
      success: phaseResult.success,
      insightsCreated: phaseResult.insights.length,
      error: phaseResult.error,
    };
  } catch (error) {
    console.error(`[Evolution Engine] Phase ${phase} failed:`, error);

    await storage.updateEvolutionDailyRun(dailyRunId, {
      status: "failed",
    });

    return {
      success: false,
      insightsCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getPhaseForHour(hourOfDay: number): EvolutionPhase {
  if (hourOfDay < 8) return "observe";
  if (hourOfDay < 12) return "learn";
  if (hourOfDay < 16) return "connect";
  if (hourOfDay < 20) return "theorize";
  if (hourOfDay < 22) return "validate";
  return "adapt";
}

function getCycleStartHour(dailyRun: EvolutionDailyRun): number {
  if (!dailyRun.createdAt) return 0;
  return new Date(dailyRun.createdAt).getHours();
}

function getCurrentPhaseForRun(dailyRun: EvolutionDailyRun): EvolutionPhase | null {
  const now = new Date();
  const startTime = dailyRun.phaseStartedAt || dailyRun.createdAt;
  
  if (!startTime) return "observe";

  const startDate = new Date(startTime);
  const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);

  let cumulativeHours = 0;
  for (const phase of PHASE_ORDER) {
    cumulativeHours += PHASE_DURATIONS[phase];
    if (hoursSinceStart < cumulativeHours) {
      return phase;
    }
  }

  return null;
}

export async function runEvolutionTick(): Promise<{
  cyclesProcessed: number;
  phasesExecuted: string[];
  errors: string[];
}> {
  console.log("[Evolution Engine] Running tick...");

  const result = {
    cyclesProcessed: 0,
    phasesExecuted: [] as string[],
    errors: [] as string[],
  };

  try {
    const activeCycles = await storage.getAllActiveEvolutionCycles();

    if (activeCycles.length === 0) {
      console.log("[Evolution Engine] No active cycles found");
      return result;
    }

    for (const cycle of activeCycles) {
      result.cyclesProcessed++;

      const now = new Date();
      if (cycle.endDate && new Date(cycle.endDate) < now) {
        await storage.updateEvolutionCycle(cycle.id, cycle.userId || "", {
          status: "completed",
        });
        console.log(`[Evolution Engine] Cycle ${cycle.id} completed (end date reached)`);
        continue;
      }

      let dailyRun = await storage.getTodaysDailyRun(cycle.id);

      if (!dailyRun) {
        const today = new Date().toISOString().split("T")[0];
        dailyRun = await storage.createEvolutionDailyRun({
          cycleId: cycle.id,
          runDate: today,
          currentPhase: "observe",
          status: "running",
          phasesCompleted: [],
        });
        console.log(`[Evolution Engine] Created new daily run ${dailyRun.id} for cycle ${cycle.id}`);
      }

      if (dailyRun.status === "completed" || dailyRun.status === "failed") {
        continue;
      }

      const completedPhases = dailyRun.phasesCompleted || [];
      const currentExpectedPhase = getCurrentPhaseForRun(dailyRun);

      if (!currentExpectedPhase) {
        await storage.updateEvolutionDailyRun(dailyRun.id, {
          status: "completed",
          completedAt: new Date(),
        });
        continue;
      }

      if (!completedPhases.includes(currentExpectedPhase)) {
        const phaseIndex = PHASE_ORDER.indexOf(currentExpectedPhase);
        for (let i = 0; i < phaseIndex; i++) {
          const prerequisitePhase = PHASE_ORDER[i];
          if (!completedPhases.includes(prerequisitePhase)) {
            console.log(
              `[Evolution Engine] Executing prerequisite phase ${prerequisitePhase} for cycle ${cycle.id}`
            );
            const phaseResult = await executeEvolutionPhase(dailyRun.id, prerequisitePhase);
            result.phasesExecuted.push(`${cycle.id}:${prerequisitePhase}`);
            if (!phaseResult.success) {
              result.errors.push(
                `Phase ${prerequisitePhase} failed for cycle ${cycle.id}: ${phaseResult.error}`
              );
            }
          }
        }

        console.log(
          `[Evolution Engine] Executing current phase ${currentExpectedPhase} for cycle ${cycle.id}`
        );
        const phaseResult = await executeEvolutionPhase(dailyRun.id, currentExpectedPhase);
        result.phasesExecuted.push(`${cycle.id}:${currentExpectedPhase}`);
        if (!phaseResult.success) {
          result.errors.push(
            `Phase ${currentExpectedPhase} failed for cycle ${cycle.id}: ${phaseResult.error}`
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error("[Evolution Engine] Tick failed:", error);
    result.errors.push(error instanceof Error ? error.message : "Unknown tick error");
    return result;
  }
}

export async function generateDailyReport(dailyRunId: number): Promise<EvolutionReport | null> {
  console.log(`[Evolution Engine] Generating daily report for run ${dailyRunId}`);

  try {
    const dailyRun = await storage.getEvolutionDailyRun(dailyRunId);
    if (!dailyRun) {
      console.error(`[Evolution Engine] Daily run ${dailyRunId} not found`);
      return null;
    }

    const insights = await storage.getEvolutionInsights(dailyRunId);
    if (insights.length === 0) {
      console.error(`[Evolution Engine] No insights found for daily run ${dailyRunId}`);
      return null;
    }

    const insightsByPhase: Record<string, EvolutionInsight[]> = {
      observe: [],
      learn: [],
      connect: [],
      theorize: [],
      validate: [],
      adapt: [],
    };

    for (const insight of insights) {
      const phase = insight.phase || "observe";
      if (insightsByPhase[phase]) {
        insightsByPhase[phase].push(insight);
      }
    }

    const allSources: { title: string; url?: string; doi?: string; snippet?: string; source?: string }[] = [];
    const allHypotheses: { hypothesis: string; confidence: number; evidence: string[]; disciplines?: string[] }[] = [];

    for (const insight of insights) {
      if (Array.isArray(insight.sources)) {
        for (const src of insight.sources as { title: string; url?: string; doi?: string; snippet?: string; source?: string }[]) {
          if (src.title && !allSources.some(s => s.title === src.title)) {
            allSources.push(src);
          }
        }
      }

      if (insight.insightType === "hypothesis" && insight.metadata) {
        const metadata = insight.metadata as Record<string, unknown>;
        if (metadata.keyPoints && Array.isArray(metadata.keyPoints)) {
          allHypotheses.push({
            hypothesis: insight.contentEn || "",
            confidence: insight.confidence || 70,
            evidence: metadata.keyPoints as string[],
            disciplines: metadata.disciplines as string[] | undefined,
          });
        }
      }
    }

    const reportDate = dailyRun.runDate || new Date().toISOString().split("T")[0];
    const formattedDate = new Date(reportDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const phaseContent = (phase: string, phaseInsights: EvolutionInsight[]) => {
      if (phaseInsights.length === 0) return "No data collected for this phase.";
      return phaseInsights.map(i => i.contentEn || "").filter(Boolean).join("\n\n");
    };

    const systemPrompt = `You are a senior medical research scientist specializing in synthesizing multi-source research into comprehensive academic reports. Your task is to compile research findings from an autonomous 24-hour Evolution Cycle into a structured, publication-quality academic report.

The report should be written for medical professionals, researchers, and informed caregivers of children with neurological conditions such as Hypoxic-Ischemic Encephalopathy (HIE).

Your output must be a valid JSON object with this exact structure:
{
  "title": "Evolution Cycle Daily Research Report - [Date]",
  "executiveSummary": "A comprehensive 2-3 paragraph executive summary covering the day's most significant findings, breakthroughs, and clinical implications.",
  "fullContent": "The complete academic report content with all sections formatted in markdown",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", ...],
  "synthesizedHypotheses": [
    {
      "hypothesis": "Hypothesis statement",
      "confidence": 80,
      "evidence": ["Evidence 1", "Evidence 2"],
      "disciplines": ["Neurology", "Pharmacology"]
    }
  ]
}

The fullContent should include these sections in markdown format:
1. Literature Review & Observations
2. Knowledge Extraction
3. Clinical Connections
4. Novel Hypotheses
5. Validation Analysis
6. Recommendations & Adaptations
7. Conclusions

Be thorough, scientifically rigorous, and clinically relevant.`;

    const query = `Generate a comprehensive academic research report for the Evolution Cycle run on ${formattedDate}.

## OBSERVE PHASE - Literature Review & Recent Findings
${phaseContent("observe", insightsByPhase.observe)}

## LEARN PHASE - Knowledge Extraction & Analysis
${phaseContent("learn", insightsByPhase.learn)}

## CONNECT PHASE - Clinical Connections to Diagnosis
${phaseContent("connect", insightsByPhase.connect)}

## THEORIZE PHASE - Novel Hypotheses Generation
${phaseContent("theorize", insightsByPhase.theorize)}

## VALIDATE PHASE - Validation & Evidence Assessment
${phaseContent("validate", insightsByPhase.validate)}

## ADAPT PHASE - Recommendations & Adaptations
${phaseContent("adapt", insightsByPhase.adapt)}

Synthesize all of this into a cohesive, publication-quality academic report. Extract the most important findings, formulate clear hypotheses with evidence, and provide actionable clinical recommendations.`;

    console.log(`[Evolution Engine] Calling Claude to synthesize report...`);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    });

    const responseContent = response.content[0]?.type === "text" ? response.content[0].text : "{}";

    let parsed: {
      title?: string;
      executiveSummary?: string;
      fullContent?: string;
      keyFindings?: string[];
      synthesizedHypotheses?: { hypothesis: string; confidence: number; evidence: string[]; disciplines?: string[] }[];
    } = {};

    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("[Evolution Engine] Failed to parse Claude response as JSON");
      parsed = {
        title: `Evolution Cycle Daily Research Report - ${formattedDate}`,
        executiveSummary: responseContent.substring(0, 1000),
        fullContent: responseContent,
        keyFindings: [],
        synthesizedHypotheses: [],
      };
    }

    const titleEn = parsed.title || `Evolution Cycle Daily Research Report - ${formattedDate}`;
    const summaryEn = parsed.executiveSummary || "";
    const contentEn = parsed.fullContent || responseContent;
    const keyFindingsEn = parsed.keyFindings || [];

    console.log(`[Evolution Engine] Translating report to Georgian...`);

    const [titleKa, summaryKa, contentKa] = await Promise.all([
      translateToGeorgian(titleEn),
      translateToGeorgian(summaryEn),
      translateToGeorgian(contentEn),
    ]);

    const keyFindingsKa: string[] = [];
    for (const finding of keyFindingsEn.slice(0, 10)) {
      const translatedFinding = await translateToGeorgian(finding);
      keyFindingsKa.push(translatedFinding);
    }

    const hypothesesGenerated = parsed.synthesizedHypotheses && parsed.synthesizedHypotheses.length > 0
      ? parsed.synthesizedHypotheses
      : allHypotheses.slice(0, 10);

    const reportData: InsertEvolutionReport = {
      dailyRunId,
      reportDate,
      titleEn,
      titleKa,
      summaryEn,
      summaryKa,
      contentEn,
      contentKa,
      keyFindingsEn,
      keyFindingsKa,
      hypothesesGenerated,
      sourcesCompiled: allSources,
    };

    console.log(`[Evolution Engine] Creating report in database...`);

    const report = await storage.createEvolutionReport(reportData);

    console.log(`[Evolution Engine] Report ${report.id} created successfully`);

    return report;
  } catch (error) {
    console.error(`[Evolution Engine] Failed to generate daily report:`, error);
    return null;
  }
}

export async function processReportChat(
  systemPrompt: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<{ contentEn: string; contentKa: string }> {
  try {
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage }
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const contentEn = response.content[0]?.type === "text" ? response.content[0].text : "";
    const contentKa = await translateToGeorgian(contentEn);

    return { contentEn, contentKa };
  } catch (error) {
    console.error("[Evolution Engine] Report chat error:", error);
    return { 
      contentEn: "I apologize, but I encountered an error processing your question. Please try again.", 
      contentKa: "ბოდიში, თქვენი კითხვის დამუშავებისას შეცდომა მოხდა. გთხოვთ, სცადოთ ხელახლა." 
    };
  }
}

export async function startEvolutionCycle(
  userId: string,
  childId: number,
  endDate: Date,
  triggerDocumentId: number,
  diagnosisContext: string
): Promise<EvolutionCycle> {
  console.log(`[Evolution Engine] Starting new cycle for user ${userId}, child ${childId}`);

  const existingActive = await storage.getActiveEvolutionCycle(userId);
  if (existingActive) {
    await storage.updateEvolutionCycle(existingActive.id, userId, {
      status: "paused",
    });
    console.log(`[Evolution Engine] Paused existing cycle ${existingActive.id}`);
  }

  const cycle = await storage.createEvolutionCycle({
    userId,
    childId,
    status: "active",
    startDate: new Date(),
    endDate,
    triggerDocumentId,
    diagnosisContext,
  });

  console.log(`[Evolution Engine] Created new cycle ${cycle.id}`);

  const today = new Date().toISOString().split("T")[0];
  const dailyRun = await storage.createEvolutionDailyRun({
    cycleId: cycle.id,
    runDate: today,
    currentPhase: "observe",
    status: "running",
    phasesCompleted: [],
  });

  console.log(`[Evolution Engine] Created initial daily run ${dailyRun.id}`);

  executeEvolutionPhase(dailyRun.id, "observe").catch((error) => {
    console.error("[Evolution Engine] Initial observe phase failed:", error);
  });

  return cycle;
}
