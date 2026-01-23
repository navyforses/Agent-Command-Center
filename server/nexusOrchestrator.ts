import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { translateToGeorgian } from "./services/translator";
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

interface TreatmentPlan {
  phase: string;
  duration: string;
  interventions: string[];
  goals: string[];
}

interface SpecialistRecommendation {
  specialty: string;
  role: string;
  priority: "critical" | "important" | "supportive";
}

interface SwarmHypothesis {
  id: string;
  hypothesis: string;
  confidence: number;
  evidence: string[];
  testability: string;
  disciplines: string[];
}

interface SwarmDebateOutput {
  agreements: { topic: string; supportingAgents: string[]; confidence: number }[];
  disagreements: { topic: string; positions: { agent: string; position: string }[] }[];
  synthesizedConclusions: string[];
  emergentInsights: string[];
}

interface ResearchOrchestrationResult {
  query: NexusResearchQuery;
  finding: NexusFinding & {
    treatmentPlan?: TreatmentPlan[];
    specialists?: SpecialistRecommendation[];
    criticalRisks?: string[];
    followUpInvestigations?: string[];
  };
  aiAnalyses: AIResearchResponse[];
  disciplinaryPerspectives: DisciplinaryPerspective[];
  consensusLevel: "low" | "moderate" | "high" | "unanimous";
  processingTimeMs: number;
  diagnosisAnalyzed?: boolean;
  swarmDebate?: SwarmDebateOutput;
  swarmHypotheses?: SwarmHypothesis[];
}

const AI_AGENT_ROLES = {
  claude: {
    role: "Chief Analyst & Ethical Guardian",
    strengths: [
      "Deep nuanced analysis",
      "Ethical evaluation", 
      "Long context processing",
      "Balanced perspective",
      "Complex reasoning"
    ],
    primaryTasks: [
      "In-depth literature analysis",
      "Ethical implications assessment",
      "Hypothesis logical validation",
      "Consensus formulation"
    ],
    specialtyLens: ["Philosophical analysis", "Ethical framework", "Systems thinking"]
  },
  gpt4: {
    role: "Creative Problem Solver & Synthesizer",
    strengths: [
      "Creative connection finding",
      "Multi-domain knowledge",
      "Technical analysis",
      "Visualization and explanation",
      "Broad general knowledge"
    ],
    primaryTasks: [
      "Creative hypothesis generation",
      "Cross-disciplinary connection finding",
      "Technical modeling",
      "Complex concept visualization"
    ],
    specialtyLens: ["Mathematical modeling", "Algorithmic thinking", "Creative synthesis"]
  },
  grok: {
    role: "Real-Time Intelligence & Contrarian Thinker",
    strengths: [
      "Real-time monitoring",
      "Unconventional perspectives",
      "Fast direct responses",
      "Early trend detection",
      "First principles thinking"
    ],
    primaryTasks: [
      "Real-time news monitoring",
      "Social media signal analysis",
      "Contrarian perspective provision",
      "Early warning signals"
    ],
    specialtyLens: ["First principles reasoning", "Skeptical analysis", "Trend forecasting"]
  },
  gemini: {
    role: "Multimodal Researcher & Data Integrator",
    strengths: [
      "Direct Google Scholar access",
      "Multimodal analysis",
      "Massive data processing",
      "Academic rigor",
      "Google ecosystem"
    ],
    primaryTasks: [
      "Systematic academic literature review",
      "Medical image analysis",
      "Meta-analyses",
      "Patent and funding research"
    ],
    specialtyLens: ["Statistical analysis", "Meta-analysis", "Data mining"]
  },
  perplexity: {
    role: "Citation Hunter & Fact Verifier",
    strengths: [
      "Real-time source citation",
      "Fact verification",
      "Multi-source aggregation",
      "Fast accurate responses",
      "Automatic bibliography"
    ],
    primaryTasks: [
      "Fact checking",
      "Source validation",
      "Bibliography compilation",
      "Competitive information reconciliation"
    ],
    specialtyLens: ["Fact-checking", "Critical source evaluation", "Information reliability rating"]
  }
};

const MULTIDISCIPLINARY_SCIENCES = {
  lifeSciences: {
    name: "Life Sciences",
    disciplines: [
      { id: "Neuroscience", question: "How do neurons survive and regenerate after damage?" },
      { id: "Cell Biology", question: "What cellular mechanisms drive regeneration?" },
      { id: "Molecular Biology", question: "Which molecular pathways activate regeneration?" },
      { id: "Biochemistry", question: "What metabolic processes support neural growth?" },
      { id: "Pharmacology", question: "Which compounds stimulate neuronal growth?" },
      { id: "Immunology", question: "How can immune response shift from destruction to regeneration?" },
      { id: "Genetics", question: "What genes control regenerative capacity?" },
      { id: "Developmental Biology", question: "How can we replicate natural brain formation?" }
    ]
  },
  physicalSciences: {
    name: "Physical Sciences",
    disciplines: [
      { id: "Physics", question: "What physical principles govern neural signal transmission?" },
      { id: "Chemistry", question: "What chemical reactions enable synaptic plasticity?" },
      { id: "Quantum Biology", question: "Do quantum effects play a role in neural function?" },
      { id: "Biophysics", question: "How do physical forces affect neural development?" }
    ]
  },
  mathematicalSciences: {
    name: "Mathematical Sciences",
    disciplines: [
      { id: "Mathematics", question: "What mathematical models describe neural networks?" },
      { id: "Statistics", question: "What statistical patterns emerge in treatment outcomes?" },
      { id: "Network Theory", question: "How do neural network topologies affect recovery?" },
      { id: "Complexity Science", question: "What emergent properties arise in neural systems?" }
    ]
  },
  engineering: {
    name: "Engineering",
    disciplines: [
      { id: "Biomedical Engineering", question: "What devices can support neural regeneration?" },
      { id: "Materials Science", question: "What materials best interface with neural tissue?" },
      { id: "Nanotechnology", question: "How can nanoscale delivery enhance treatment?" },
      { id: "Computer Science", question: "What AI/ML patterns emerge in research data?" },
      { id: "Electrical Engineering", question: "How can electrical stimulation promote healing?" }
    ]
  },
  crossDisciplinary: {
    name: "Cross-Disciplinary",
    disciplines: [
      { id: "Systems Biology", question: "How do multiple systems interact in recovery?" },
      { id: "Cybernetics", question: "What feedback loops govern neural adaptation?" },
      { id: "Epigenetics", question: "How can dormant regeneration genes be awakened?" },
      { id: "Translational Medicine", question: "How do discoveries reach real patients?" }
    ]
  }
};

function getAgentSpecificPrompt(agentId: string, query: string): string {
  const agent = AI_AGENT_ROLES[agentId as keyof typeof AI_AGENT_ROLES];
  if (!agent) return getBaseResearchPrompt();
  
  return `You are ${agent.role} in the NEXUS OMEGA Multi-AI Swarm Intelligence System.

YOUR UNIQUE STRENGTHS:
${agent.strengths.map(s => `- ${s}`).join('\n')}

YOUR PRIMARY TASKS:
${agent.primaryTasks.map(t => `- ${t}`).join('\n')}

YOUR SPECIALTY LENS:
${agent.specialtyLens.map(l => `- ${l}`).join('\n')}

MULTIDISCIPLINARY ANALYSIS FRAMEWORK:
You must analyze the query through multiple scientific lenses:
- Life Sciences: Neuroscience, Cell Biology, Molecular Biology, Pharmacology, Immunology
- Physical Sciences: Physics, Chemistry, Quantum Biology
- Mathematical Sciences: Mathematics, Statistics, Network Theory
- Engineering: Biomedical, Materials Science, Nanotechnology, AI/ML
- Cross-Disciplinary: Systems Biology, Cybernetics, Epigenetics

SWARM INTELLIGENCE PROTOCOL:
1. Provide your unique perspective based on your role and strengths
2. Identify potential disagreements with other AI perspectives
3. Suggest cross-connections between different scientific fields
4. Generate novel hypotheses that emerge from interdisciplinary thinking
5. Rate your confidence and explain your reasoning

Respond with a JSON object:
{
  "summary": "Your analysis from your unique perspective (2-3 paragraphs)",
  "keyPoints": ["Key finding 1", "Key finding 2", ...],
  "concerns": ["Concern or limitation 1", ...],
  "uniqueInsights": ["Novel insight from your specialty 1", ...],
  "confidence": 85,
  "reasoning": "Explanation of your confidence level",
  "crossDisciplinaryConnections": [
    {"fromField": "field1", "toField": "field2", "connection": "how they relate", "novelty": "high/medium/low"}
  ],
  "hypotheses": [
    {"hypothesis": "Novel hypothesis statement", "evidence": "Supporting evidence", "testability": "How it could be tested"}
  ],
  "potentialDisagreements": ["Area where other AIs might disagree"],
  "sources": [{"title": "Source name", "snippet": "Relevant excerpt"}]
}`;
}

function getBaseResearchPrompt(): string {
  return `You are an advanced research AI agent in the NEXUS OMEGA Swarm Intelligence System, analyzing medical and scientific queries related to Hypoxic-Ischemic Encephalopathy (HIE) and neurological conditions.

Your task is to provide structured research analysis using multidisciplinary scientific perspectives.

Respond with a JSON object containing:
{
  "summary": "A concise summary of findings (2-3 paragraphs)",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "concerns": ["Concern or limitation 1", "Concern 2", ...],
  "uniqueInsights": ["Unique perspective or insight 1", ...],
  "confidence": 85,
  "crossDisciplinaryConnections": [{"fromField": "...", "toField": "...", "connection": "..."}],
  "hypotheses": [{"hypothesis": "...", "evidence": "...", "testability": "..."}],
  "sources": [{"title": "Source name", "snippet": "Relevant excerpt"}]
}

Focus on:
- Evidence-based medical research across all scientific disciplines
- Current clinical trials and emerging therapies
- Neuroprotection mechanisms and pathways
- Cross-disciplinary connections (all sciences)
- Novel hypothesis generation
- Practical implications for treatment

Be thorough but concise. Always cite confidence level (0-100) based on evidence strength.`;
}

const NEXUS_RESEARCH_SYSTEM_PROMPT = getBaseResearchPrompt();

const DIAGNOSIS_TREATMENT_SYSTEM_PROMPT = `You are an advanced medical AI specializing in treatment planning for Hypoxic-Ischemic Encephalopathy (HIE) and related neurological conditions.

You are analyzing a diagnosis document and must provide a comprehensive treatment research analysis.

Respond with a JSON object containing:
{
  "summary": "A concise summary of the diagnosis and recommended treatment approach (2-3 paragraphs)",
  "keyPoints": ["Key finding 1", "Key finding 2", ...],
  "concerns": ["Risk or concern 1", "Risk 2", ...],
  "uniqueInsights": ["Novel treatment approach 1", ...],
  "confidence": 85,
  "treatmentPlan": [
    {
      "phase": "Acute/Immediate",
      "duration": "0-72 hours",
      "interventions": ["Intervention 1", "Intervention 2"],
      "goals": ["Goal 1", "Goal 2"]
    },
    {
      "phase": "Rehabilitation",
      "duration": "3-12 months",
      "interventions": ["Therapy 1", "Therapy 2"],
      "goals": ["Goal 1", "Goal 2"]
    }
  ],
  "specialists": [
    {
      "specialty": "Pediatric Neurologist",
      "role": "Primary diagnosis confirmation and treatment oversight",
      "priority": "critical"
    },
    {
      "specialty": "Physical Therapist",
      "role": "Motor development and rehabilitation",
      "priority": "important"
    }
  ],
  "criticalRisks": ["Risk that requires immediate attention 1", ...],
  "followUpInvestigations": ["Recommended test or scan 1", ...],
  "sources": [{"title": "Source name", "snippet": "Relevant excerpt"}]
}

Focus on:
- Evidence-based treatment protocols for the specific diagnosis
- Required medical specialists and their roles (prioritize as critical/important/supportive)
- Phased treatment approach with clear timelines
- Potential risks and contraindications
- Follow-up investigations needed
- Cross-disciplinary treatment integration

Be thorough and specific to the diagnosis provided.`;

async function queryOpenAIResearchWithPrompt(query: string, systemPrompt: string): Promise<AIResearchResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
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

async function queryGeminiResearchWithPrompt(query: string, systemPrompt: string): Promise<AIResearchResponse> {
  try {
    const prompt = `${systemPrompt}

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

async function queryAnthropicResearchWithPrompt(query: string, systemPrompt: string): Promise<AIResearchResponse> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
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

async function queryPerplexityResearchWithPrompt(query: string, systemPrompt: string): Promise<AIResearchResponse> {
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
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
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

async function queryGrokResearchWithPrompt(query: string, systemPrompt: string): Promise<AIResearchResponse> {
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
        { role: "system", content: systemPrompt },
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

interface SwarmDebateResult {
  agreements: { topic: string; supportingAgents: string[]; confidence: number }[];
  disagreements: { topic: string; positions: { agent: string; position: string }[] }[];
  synthesizedConclusions: string[];
  novelHypotheses: { hypothesis: string; originatingAgents: string[]; crossDisciplinaryBasis: string }[];
  emergentInsights: string[];
}

async function runSwarmDebate(query: string, responses: AIResearchResponse[]): Promise<SwarmDebateResult> {
  const successful = responses.filter(r => r.success && r.content);
  if (successful.length < 2) {
    return {
      agreements: [],
      disagreements: [],
      synthesizedConclusions: successful[0]?.keyPoints || [],
      novelHypotheses: [],
      emergentInsights: [],
    };
  }

  try {
    const agentAnalyses = successful.map(r => ({
      agent: r.provider,
      role: AI_AGENT_ROLES[r.agentId as keyof typeof AI_AGENT_ROLES]?.role || "Research Agent",
      summary: r.content,
      keyPoints: r.keyPoints,
      concerns: r.concerns,
      uniqueInsights: r.uniqueInsights,
      hypotheses: (r.rawResponse?.hypotheses as Array<{ hypothesis: string }>) || [],
      crossConnections: (r.rawResponse?.crossDisciplinaryConnections as Array<{ fromField: string; toField: string; connection: string }>) || [],
      potentialDisagreements: (r.rawResponse?.potentialDisagreements as string[]) || [],
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are the NEXUS OMEGA Swarm Intelligence Synthesis Engine.
          
Your task is to analyze multiple AI agent research outputs and perform:
1. CONSENSUS DETECTION: Identify where agents agree (with confidence scores)
2. DISAGREEMENT ANALYSIS: Identify where agents disagree and what positions they hold
3. DEBATE RESOLUTION: Synthesize disagreements into balanced conclusions
4. HYPOTHESIS EMERGENCE: Identify novel hypotheses that emerge from combining perspectives
5. EMERGENT INSIGHTS: Discover insights that no single agent found but emerge from synthesis

Respond with JSON:
{
  "agreements": [{"topic": "...", "supportingAgents": ["Claude", "Gemini"], "confidence": 90}],
  "disagreements": [{"topic": "...", "positions": [{"agent": "Claude", "position": "..."}, {"agent": "Grok", "position": "..."}]}],
  "synthesizedConclusions": ["Conclusion that resolves disagreement 1", ...],
  "novelHypotheses": [{"hypothesis": "...", "originatingAgents": ["Claude", "ChatGPT"], "crossDisciplinaryBasis": "Combines neuroscience with..."}],
  "emergentInsights": ["Insight that emerges from combining all perspectives"]
}`
        },
        {
          role: "user",
          content: `Research Query: ${query}\n\nAI Agent Analyses:\n${JSON.stringify(agentAnalyses, null, 2)}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      agreements: parsed.agreements || [],
      disagreements: parsed.disagreements || [],
      synthesizedConclusions: parsed.synthesizedConclusions || [],
      novelHypotheses: parsed.novelHypotheses || [],
      emergentInsights: parsed.emergentInsights || [],
    };
  } catch (error) {
    console.error("Swarm debate error:", error);
    return {
      agreements: [],
      disagreements: [],
      synthesizedConclusions: [],
      novelHypotheses: [],
      emergentInsights: [],
    };
  }
}

async function generateSwarmHypotheses(
  query: string,
  responses: AIResearchResponse[],
  debateResult: SwarmDebateResult
): Promise<{ id: string; hypothesis: string; confidence: number; evidence: string[]; testability: string; disciplines: string[] }[]> {
  const successful = responses.filter(r => r.success);
  if (successful.length === 0) return [];

  const allHypotheses: { hypothesis: string; evidence: string; testability?: string }[] = [];
  for (const r of successful) {
    const rawHypotheses = (r.rawResponse?.hypotheses as Array<{ hypothesis: string; evidence: string; testability?: string }>) || [];
    allHypotheses.push(...rawHypotheses);
  }

  for (const h of debateResult.novelHypotheses) {
    allHypotheses.push({
      hypothesis: h.hypothesis,
      evidence: h.crossDisciplinaryBasis,
      testability: "Requires cross-disciplinary validation"
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Consolidate and rank research hypotheses by novelty and testability. 
Remove duplicates, merge similar ones, and assign confidence scores.

Respond with JSON array:
[{
  "id": "H1",
  "hypothesis": "Clear hypothesis statement",
  "confidence": 75,
  "evidence": ["Supporting evidence 1", "Evidence 2"],
  "testability": "How this hypothesis could be tested",
  "disciplines": ["Neuroscience", "Pharmacology"]
}]`
        },
        {
          role: "user",
          content: `Query: ${query}\n\nHypotheses to consolidate:\n${JSON.stringify(allHypotheses, null, 2)}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.hypotheses || []);
  } catch (error) {
    console.error("Hypothesis generation error:", error);
    return allHypotheses.slice(0, 5).map((h, i) => ({
      id: `H${i + 1}`,
      hypothesis: h.hypothesis,
      confidence: 60,
      evidence: [h.evidence],
      testability: h.testability || "To be determined",
      disciplines: ["General"]
    }));
  }
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
  userId: string,
  diagnosisContext?: string
): Promise<ResearchOrchestrationResult> {
  const startTime = Date.now();
  const hasDiagnosis = !!diagnosisContext && diagnosisContext.trim().length > 0;

  await storage.updateNexusResearchQuery(queryId, userId, { status: "searching" });

  const effectiveQuery = hasDiagnosis 
    ? `DIAGNOSIS DOCUMENT:\n${diagnosisContext}\n\nRESEARCH QUERY: ${queryText}\n\nAnalyze this diagnosis and provide treatment recommendations with required specialists.`
    : queryText;

  const responses = await Promise.all([
    queryOpenAIResearchWithPrompt(effectiveQuery, hasDiagnosis ? DIAGNOSIS_TREATMENT_SYSTEM_PROMPT : getAgentSpecificPrompt("gpt4", effectiveQuery)),
    queryGeminiResearchWithPrompt(effectiveQuery, hasDiagnosis ? DIAGNOSIS_TREATMENT_SYSTEM_PROMPT : getAgentSpecificPrompt("gemini", effectiveQuery)),
    queryAnthropicResearchWithPrompt(effectiveQuery, hasDiagnosis ? DIAGNOSIS_TREATMENT_SYSTEM_PROMPT : getAgentSpecificPrompt("claude", effectiveQuery)),
    queryPerplexityResearchWithPrompt(effectiveQuery, hasDiagnosis ? DIAGNOSIS_TREATMENT_SYSTEM_PROMPT : getAgentSpecificPrompt("perplexity", effectiveQuery)),
    queryGrokResearchWithPrompt(effectiveQuery, hasDiagnosis ? DIAGNOSIS_TREATMENT_SYSTEM_PROMPT : getAgentSpecificPrompt("grok", effectiveQuery)),
  ]);

  const successfulResponses = responses.filter(r => r.success);
  console.log(`NEXUS Research: ${successfulResponses.length}/5 AI agents responded`);

  // Run Swarm Intelligence: Debate and Hypothesis Generation
  const debateResult = await runSwarmDebate(queryText, responses);
  const swarmHypotheses = await generateSwarmHypotheses(queryText, responses, debateResult);
  console.log(`NEXUS Swarm: ${debateResult.agreements.length} agreements, ${debateResult.disagreements.length} disagreements, ${swarmHypotheses.length} hypotheses`);

  await storage.updateNexusResearchQuery(queryId, userId, { status: "analyzing" });

  const consensusLevel = calculateConsensusLevel(responses);
  const title = await synthesizeFindingTitle(queryText, responses);
  const summary = await synthesizeFindingSummary(queryText, responses);

  const avgConfidence = successfulResponses.length > 0
    ? Math.round(successfulResponses.reduce((sum, r) => sum + r.confidence, 0) / successfulResponses.length)
    : 0;

  const allSources: { title: string; url?: string; doi?: string; snippet?: string }[] = [];
  let treatmentPlans: TreatmentPlan[] = [];
  let specialists: SpecialistRecommendation[] = [];
  let criticalRisks: string[] = [];
  let followUpInvestigations: string[] = [];
  
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
    
    if (hasDiagnosis && r.rawResponse) {
      const rawTreatmentPlan = r.rawResponse.treatmentPlan as TreatmentPlan[] | undefined;
      if (rawTreatmentPlan && Array.isArray(rawTreatmentPlan) && treatmentPlans.length === 0) {
        treatmentPlans = rawTreatmentPlan;
      }
      
      const rawSpecialists = r.rawResponse.specialists as SpecialistRecommendation[] | undefined;
      if (rawSpecialists && Array.isArray(rawSpecialists)) {
        for (const spec of rawSpecialists) {
          if (!specialists.find(s => s.specialty === spec.specialty)) {
            specialists.push(spec);
          }
        }
      }
      
      const rawRisks = r.rawResponse.criticalRisks as string[] | undefined;
      if (rawRisks && Array.isArray(rawRisks)) {
        for (const risk of rawRisks) {
          if (!criticalRisks.includes(risk)) {
            criticalRisks.push(risk);
          }
        }
      }
      
      const rawFollowUps = r.rawResponse.followUpInvestigations as string[] | undefined;
      if (rawFollowUps && Array.isArray(rawFollowUps)) {
        for (const fu of rawFollowUps) {
          if (!followUpInvestigations.includes(fu)) {
            followUpInvestigations.push(fu);
          }
        }
      }
    }
  }

  const [titleKa, summaryKa] = await Promise.all([
    translateToGeorgian(title),
    summary ? translateToGeorgian(summary) : Promise.resolve(null),
  ]);

  const activeCycle = await storage.getActiveEvolutionCycle(userId);

  const findingData: InsertNexusFinding = {
    queryId,
    userId,
    evolutionCycleId: activeCycle?.id || null,
    title,
    titleKa,
    summary,
    summaryKa,
    consensusLevel,
    confidenceScore: avgConfidence,
    relevanceScore: Math.min(100, avgConfidence + 10),
    sources: allSources.length > 0 ? allSources : null,
    hypothesesGenerated: null,
    hypothesesGeneratedKa: null,
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

  const enrichedFinding = {
    ...finding,
    ...(hasDiagnosis && {
      treatmentPlan: treatmentPlans.length > 0 ? treatmentPlans : undefined,
      specialists: specialists.length > 0 ? specialists : undefined,
      criticalRisks: criticalRisks.length > 0 ? criticalRisks : undefined,
      followUpInvestigations: followUpInvestigations.length > 0 ? followUpInvestigations : undefined,
    }),
  };

  return {
    query: updatedQuery!,
    finding: enrichedFinding,
    aiAnalyses: responses,
    disciplinaryPerspectives,
    consensusLevel,
    processingTimeMs: Date.now() - startTime,
    diagnosisAnalyzed: hasDiagnosis,
    swarmDebate: {
      agreements: debateResult.agreements,
      disagreements: debateResult.disagreements,
      synthesizedConclusions: debateResult.synthesizedConclusions,
      emergentInsights: debateResult.emergentInsights,
    },
    swarmHypotheses,
  };
}
