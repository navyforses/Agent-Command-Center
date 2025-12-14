import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { 
  searchAcademicSources, 
  formatAcademicResultsForAI, 
  ALL_DISCIPLINES,
  MEDICAL_CLINICAL_DISCIPLINES,
  TRADITIONAL_MEDICINE_DISCIPLINES,
  CROSS_DISCIPLINARY_SCIENCES,
  DisciplineConfig,
} from "./academicSearch";
import { generateCycleSummaryPDF } from "./pdfGenerator";
import { sendEmailWithAttachments } from "./resend";
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
  InsertAccumulatedKnowledge,
  AccumulatedKnowledgeType,
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
  synthesize: 2,
  validate: 2,
  adapt: 2,
};

const PHASE_ORDER: EvolutionPhase[] = ["observe", "learn", "connect", "theorize", "synthesize", "validate", "adapt"];

// სულისკვეთება - მებრძოლი მიდგომა ყველა ფაზისთვის
const FIGHTER_SPIRIT = `
## განწყობა (Mood & Attitude)

**უკომპრომისო აგრესია პრობლემის მიმართ:** შენ არ ხარ პასიური დამკვირვებელი. შენ ხარ მებრძოლი, რომლის მტერიც არის დრო და ტვინის დაზიანება. შენი განწყობა არის შეტევითი.

**რადიკალური ოპტიმიზმი მეცნიერებით:** შენ გჯერა მონაცემების და ინოვაციების, რომლებიც "შეუძლებელს" ხდის შესაძლებელს.

**ემპათია = ქმედება:** შენი თანაგრძნობა გამოიხატება ახალი კლინიკური ცდის პოვნაში, ექსპერტის საკონტაქტოს მოძიებაში.

**უსაზღვრო:** შენთვის არ არსებობს ენობრივი ან გეოგრაფიული ბარიერი.

## ოპერაციული წესები

**აკრძალული:** "სამწუხაროდ", "შეუძლებელია", "განაჩენი", "უნდა შეეგუოთ". თუ მედიცინა ამბობს "არა", ეძებ ექსპერიმენტულს რომელიც ამბობს "შესაძლოა".

**პროგნოზის უარყოფა:** "მძიმე პროგნოზი" არის გამოწვევა, რომ იპოვო გამაბათილებელი კვლევა.

**დროის ფაქტორი:** 0-2 წელი კრიტიკულია. ყოველი დღე ბრძოლის ველია.

**დევიზი:** "სადაც სხვები ხედავენ კედელს, მე ვხედავ კარს."
`;

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

export async function translateToGeorgian(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    console.log("[Translation] Skipping empty text");
    return text;
  }
  
  console.log(`[Translation] Translating to Georgian: "${text.substring(0, 50)}..."`);
  
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

    const result = completion.choices[0]?.message?.content || text;
    console.log(`[Translation] Success: "${result.substring(0, 50)}..."`);
    return result;
  } catch (error) {
    console.error("[Translation] Error:", error);
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
      model: "gemini-2.5-pro",
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
      model: "claude-opus-4-5",
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

async function queryOpenAIThinking(query: string, systemPrompt: string): Promise<AIResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "o1",
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${query}` },
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
      confidence: (parsed.confidence as number) || 85,
      success: true,
    };
  } catch (error) {
    console.error("OpenAI Thinking (o1) error:", error);
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
      model: "grok-3",
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

async function executeObservePhase(
  diagnosisContext: string,
  previousCycleInsights: EvolutionInsight[] = []
): Promise<PhaseResult> {
  const insights: InsertEvolutionInsight[] = [];

  const previousCycleContext = previousCycleInsights.length > 0
    ? `\n\n=== ACCUMULATED KNOWLEDGE FROM PREVIOUS CYCLES ===\nThe following insights were synthesized from previous research cycles. Build upon this knowledge and look for NEW developments, confirmations, or contradictions:\n\n${previousCycleInsights.map((i, idx) => `[Previous Insight ${idx + 1}]\n${i.contentEn}`).join("\n\n")}\n\n=== END ACCUMULATED KNOWLEDGE ===\n`
    : "";

  // მულტიდისციპლინური ძიება: სამედიცინო კლინიკური სპეციალობები + ტრადიციული/ხალხური მედიცინა + კროს-დისციპლინური
  // Comprehensive list for academic search (OpenAlex/Semantic Scholar free-text search)
  const targetDisciplines = [
    // === კროს-დისციპლინური მეცნიერებები (Cross-disciplinary Sciences) ===
    "physics",
    "engineering", 
    "mathematics",
    "computer science",
    "materials science",
    "biomedical engineering",
    
    // === სამედიცინო კლინიკური სპეციალობები (Medical Clinical Specialties) ===
    "neonatology",
    "pediatric neurology",
    "neurology",
    "rehabilitation",
    "regenerative medicine",
    "stem cell therapy",
    "neuropharmacology",
    "neuroimaging",
    "neurophysiology",
    "developmental pediatrics",
    "ophthalmology",
    "audiology",
    "speech therapy",
    "occupational therapy",
    
    // === ტრადიციული/ხალხური მედიცინა (Traditional/Folk Medicine) ===
    "acupuncture",
    "electroacupuncture",
    "traditional Chinese medicine",
    "TCM herbal",
    "ayurveda",
    "Medhya Rasayana",
    "Brahmi ashwagandha",
    "Kampo medicine",
    "Tibetan medicine",
    "Korean medicine",
    "homeopathy",
    "naturopathy",
    "phytotherapy",
    "herbal medicine",
    "osteopathy",
    "craniosacral therapy",
    "chiropractic",
    "aromatherapy",
    "music therapy",
    "art therapy",
    "hyperbaric oxygen therapy",
    "HBOT brain injury",
    "massage therapy infant",
    "hydrotherapy",
    "aquatic therapy",
    "yoga therapy",
    
    // === HIE კვლევის სფეროები (HIE Research Areas) ===
    "neuroplasticity",
    "neuroprotection",
    "brain injury",
    "cerebral palsy",
    "hypoxic ischemic encephalopathy",
  ];
  
  const academicSearchResult = await searchAcademicSources(diagnosisContext, {
    maxResults: 50, // გაზრდილი რაოდენობა მეტი დისციპლინისთვის
    yearFrom: new Date().getFullYear() - 3, // 3 წლიანი პერიოდი უფრო სრულყოფილი მონაცემებისთვის
    openAccessOnly: false,
    includeCrossDisciplinary: true,
    targetDisciplines: targetDisciplines,
  });

  const academicContext = formatAcademicResultsForAI(academicSearchResult);

  if (academicSearchResult.papers.length > 0) {
    const academicSummary = `Found ${academicSearchResult.totalResults} academic papers from ${academicSearchResult.sources.join(", ")}.\n\nTop papers include:\n${academicSearchResult.papers.slice(0, 5).map((p, i) => `${i + 1}. "${p.title}" (${p.year || "N/A"}) - ${p.citationCount || 0} citations`).join("\n")}`;

    const academicContentKa = await translateToGeorgian(academicSummary);

    insights.push({
      phase: "observe",
      insightType: "observation",
      contentEn: academicSummary,
      contentKa: academicContentKa,
      sources: academicSearchResult.papers.slice(0, 10).map((p) => ({
        title: p.title,
        url: p.url || p.openAccessUrl,
        snippet: p.abstract?.substring(0, 200),
        source: p.source,
      })),
      metadata: {
        keyPoints: academicSearchResult.papers.slice(0, 5).map((p) => p.title),
        aiProvider: "academic-search",
        searchType: "academic-databases",
        sources: academicSearchResult.sources,
        crossDisciplinaryInsights: academicSearchResult.crossDisciplinaryInsights,
      },
      confidence: 90,
      relevanceScore: 95,
    });
  }

  const systemPrompt = `You are a medical research observer specializing in neurological conditions, particularly Hypoxic-Ischemic Encephalopathy (HIE) and related pediatric neurological disorders.
${FIGHTER_SPIRIT}
Your task is to search for and compile the latest research, clinical trials, and medical news related to the diagnosis provided.
${previousCycleContext}
You have access to the following academic research from OpenAlex and Semantic Scholar:
${academicContext}

Focus on:
- Recent PubMed publications (last 6 months)
- Active clinical trials on ClinicalTrials.gov
- Medical news and breakthrough announcements
- Emerging therapies and treatments
- New diagnostic techniques

MEDICAL CLINICAL SPECIALTIES to explore:
- Neonatology (თერაპიული ჰიპოთერმია, NICU პროტოკოლები)
- Pediatric Neurology (ნევროლოგიური შეფასება, განვითარების პროგნოზი)
- Neuroradiology (MRI ბიომარკერები, დიფუზური გამოსახულება)
- Neurophysiology (EEG/aEEG მონიტორინგი, კრუნჩხვების გამოვლენა)
- Rehabilitation Medicine (Vojta, Bobath, CME-Medek)
- Developmental Pediatrics (განვითარების ეტაპები, ადრეული ინტერვენცია)
- Regenerative Medicine (ღეროვანი უჯრედები, Duke EAP)
- Neuropharmacology (ერითროპოეტინი, მელატონინი, ქსენონი)

TRADITIONAL/FOLK MEDICINE to explore (ტრადიციული/ხალხური მედიცინა):
- Acupuncture (აკუპუნქტურა, ელექტროაკუპუნქტურა, თავის აკუპუნქტურა)
- Traditional Chinese Medicine/TCM (ტრადიციული ჩინური მედიცინა, მცენარეული ფორმულები)
- Ayurveda (აიურვედა - მეღა რასაიანა, ბრაჰმი, აშვაგანდა, შიროდჰარა)
- Kampo Medicine (კამპო მედიცინა - იაპონური ტრადიციული მედიცინა)
- Tibetan Medicine/Sowa-Rigpa (ტიბეტური მედიცინა)
- Homeopathy (ჰომეოპათია)
- Osteopathy & Craniosacral Therapy (ოსტეოპათია, კრანიოსაკრალური თერაპია)
- Music Therapy (მუსიკოთერაპია - ნეიროლოგიური მუსიკოთერაპია)
- Aromatherapy (არომათერაპია - ეთერზეთები)
- Hyperbaric Oxygen Therapy/HBOT (ჰიპერბარული ჟანგბადის თერაპია)
- Massage Therapy (მასაჟი თერაპია - ჩვილის მასაჟი)
- Aquatic Therapy/Hydrotherapy (აკვათერაპია, ჰიდროთერაპია)
- Yoga Therapy (იოგა თერაპია)

CROSS-DISCIPLINARY SCIENCES (კროს-დისციპლინური მეცნიერებები):
- Physics (ფიზიკა - ფოტობიომოდულაცია, მაგნიტური სტიმულაცია, ულტრაბგერა)
- Biomedical Engineering (ბიოსამედიცინო ინჟინერია - ასისტური ტექნოლოგიები, BCI, რობოტული რეაბილიტაცია)
- AI & Machine Learning (ხელოვნური ინტელექტი - პროგნოზირების მოდელები, პერსონალიზირებული მკურნალობა)
- Materials Science (მასალათმცოდნეობა - ნანონაწილაკები, წამლის მიწოდების სისტემები, ბიომასალები)
- Systems Biology (სისტემური ბიოლოგია - ქსელის ანალიზი, მულტი-ომიკსი)

${previousCycleInsights.length > 0 ? "- Building upon and extending knowledge from previous research cycles\n- Identifying confirmations, contradictions, or new developments related to previous findings" : ""}

Respond with a JSON object:
{
  "summary": "Overview of recent findings and developments (2-3 paragraphs)",
  "keyPoints": ["Key finding 1", "Key finding 2", ...],
  "sources": [{"title": "Source title", "url": "URL if available", "snippet": "Relevant excerpt", "source": "PubMed/ClinicalTrials/News/Academic"}],
  "clinicalTrials": ["Trial 1 description", "Trial 2 description", ...],
  "emergingTherapies": ["Therapy 1", "Therapy 2", ...],
  "medicalSpecialtiesFindings": {
    "neonatology": "...",
    "rehabilitationMedicine": "...",
    "regenerativeMedicine": "..."
  },
  "traditionalMedicineFindings": {
    "acupuncture": "...",
    "ayurveda": "...",
    "osteopathy": "...",
    "musicTherapy": "...",
    "hyperbaricOxygen": "..."
  },
  "crossDisciplinaryFindings": ["Finding from physics/engineering/AI/materials science", ...],${previousCycleInsights.length > 0 ? '\n  "continuityWithPreviousCycles": "How these findings relate to or extend previous cycle insights",' : ""}
  "confidence": 85
}`;

  const query = `Search for the latest medical research, clinical trials, and news related to: ${diagnosisContext}

Focus on:
1. Recent publications about treatments and outcomes from medical clinical specialties
2. Active clinical trials accepting patients (especially regenerative medicine, stem cells)
3. Breakthrough research or discoveries in neonatology, pediatric neurology
4. New rehabilitation approaches (Vojta, Bobath, CME-Medek, early intervention)
5. Traditional/folk medicine approaches with evidence (acupuncture, ayurveda, TCM, HBOT, osteopathy)
6. Cross-disciplinary applications from physics, engineering, AI/ML, materials science
7. Nutritional neuroscience (DHA, omega-3, breast milk optimization)
8. Neuropharmacology (erythropoietin, melatonin, xenon therapy)
9. Music therapy, sensory integration, aquatic therapy for pediatric brain injury`;

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
${FIGHTER_SPIRIT}
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
${FIGHTER_SPIRIT}
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
${FIGHTER_SPIRIT}
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

  const [gptThinkingResult, geminiResult, claudeResult, grokResult, perplexityResult] = await Promise.all([
    queryOpenAIThinking(query, swarmPrompt),
    queryGemini(query, swarmPrompt),
    queryClaude(query, swarmPrompt),
    queryGrok(query, swarmPrompt),
    queryPerplexity(query, swarmPrompt),
  ]);

  const allResults = [
    { result: gptThinkingResult, provider: "gpt-o1-thinking" },
    { result: geminiResult, provider: "gemini-2.5-pro" },
    { result: claudeResult, provider: "claude-opus-4.5" },
    { result: grokResult, provider: "grok-3" },
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

async function executeSynthesizePhase(
  diagnosisContext: string,
  theorizeInsights: EvolutionInsight[]
): Promise<PhaseResult> {
  const hypothesesByAI: Record<string, string> = {};
  
  for (const insight of theorizeInsights) {
    const provider = (insight.metadata as Record<string, unknown>)?.aiProvider as string;
    if (provider && insight.contentEn) {
      hypothesesByAI[provider] = insight.contentEn;
    }
  }

  const allHypothesesContext = Object.entries(hypothesesByAI)
    .map(([ai, content]) => `=== ${ai.toUpperCase()} HYPOTHESIS ===\n${content}`)
    .join("\n\n");

  const debatePrompt = `You are part of a Multi-AI Synthesis Debate for medical research on Hypoxic-Ischemic Encephalopathy (HIE).
${FIGHTER_SPIRIT}
You have received hypotheses from 5 different AI systems (Claude, GPT, Gemini, Grok, Perplexity). Your task is to:

1. ANALYZE each AI's hypothesis for strengths and weaknesses
2. IDENTIFY areas of agreement (consensus points)
3. IDENTIFY areas of disagreement (debate points)
4. SYNTHESIZE the strongest elements into unified recommendations
5. PROPOSE a merged hypothesis that combines the best insights

Consider:
- Which hypotheses have the strongest evidence base?
- What unique perspectives does each AI bring?
- Where do the AIs agree most strongly?
- What contradictions exist and how can they be resolved?
- What novel treatment approaches emerge from combining perspectives?

Respond with a JSON object:
{
  "summary": "Synthesis debate summary (2-3 paragraphs)",
  "keyPoints": ["Key synthesis point 1", ...],
  "consensusPoints": [
    {
      "point": "What all/most AIs agree on",
      "supportingAIs": ["claude", "gpt", ...],
      "strength": "strong/moderate/weak"
    }
  ],
  "debatePoints": [
    {
      "topic": "Area of disagreement",
      "positions": [
        {"ai": "claude", "position": "Claude's view"},
        {"ai": "gpt", "position": "GPT's view"}
      ],
      "resolution": "How to reconcile or which is stronger"
    }
  ],
  "mergedHypothesis": {
    "statement": "The unified hypothesis combining best insights",
    "rationale": "Why this synthesis is stronger than individual hypotheses",
    "contributingAIs": ["claude", "gpt", ...],
    "novelElements": ["New insight from synthesis 1", ...]
  },
  "actionableRecommendations": [
    {
      "recommendation": "Specific actionable recommendation",
      "priority": "high/medium/low",
      "evidence": "Supporting evidence"
    }
  ],
  "sources": [{"title": "Source", "snippet": "Key excerpt"}],
  "confidence": 85
}`;

  const query = `Synthesize and debate the following hypotheses from 5 AI systems for: ${diagnosisContext}

${allHypothesesContext}

Your task:
1. Identify where the AIs agree (consensus)
2. Identify where they disagree (debate points)
3. Synthesize the strongest elements into a unified recommendation
4. Propose actionable next steps based on the synthesis`;

  const insights: InsertEvolutionInsight[] = [];

  const [claudeResult, gptResult, geminiResult, grokResult, perplexityResult] = await Promise.all([
    queryClaude(query, debatePrompt),
    queryOpenAI(query, debatePrompt),
    queryGemini(query, debatePrompt),
    queryGrok(query, debatePrompt),
    queryPerplexity(query, debatePrompt),
  ]);

  const allDebateResults = [
    { result: claudeResult, provider: "claude-synthesis" },
    { result: gptResult, provider: "gpt-synthesis" },
    { result: geminiResult, provider: "gemini-synthesis" },
    { result: grokResult, provider: "grok-synthesis" },
    { result: perplexityResult, provider: "perplexity-synthesis" },
  ];

  for (const { result, provider } of allDebateResults) {
    if (result.success) {
      const contentKa = await translateToGeorgian(result.content);
      insights.push({
        phase: "synthesize",
        insightType: "synthesis",
        contentEn: result.content,
        contentKa,
        sources: result.sources,
        metadata: {
          keyPoints: result.keyPoints,
          aiProvider: provider,
          synthesisType: "debate-contribution",
          inputHypothesesCount: Object.keys(hypothesesByAI).length,
        },
        confidence: result.confidence,
        relevanceScore: 90,
      });
    }
  }

  const successfulDebates = allDebateResults.filter((r) => r.result.success);
  if (successfulDebates.length >= 3) {
    const metaSynthesisPrompt = `You are the final synthesizer in a Multi-AI debate. Analyze the synthesis contributions from ${successfulDebates.length} AI systems and produce the FINAL unified synthesis.

Extract:
- The strongest consensus points across all syntheses
- The most actionable recommendations
- The unified hypothesis that represents the collective intelligence
- Priority actions for the child's treatment journey

Respond with JSON containing the final synthesized conclusions.`;

    const metaSynthesisContext = successfulDebates
      .map((r) => `[${r.provider.toUpperCase()}]: ${r.result.content}`)
      .join("\n\n");

    const finalSynthesis = await queryClaude(metaSynthesisContext, metaSynthesisPrompt);

    if (finalSynthesis.success) {
      const contentKa = await translateToGeorgian(finalSynthesis.content);
      insights.push({
        phase: "synthesize",
        insightType: "synthesis",
        contentEn: finalSynthesis.content,
        contentKa,
        sources: finalSynthesis.sources,
        metadata: {
          keyPoints: finalSynthesis.keyPoints,
          aiProvider: "meta-synthesis",
          synthesisType: "final-unified",
          participatingAIs: successfulDebates.map((r) => r.provider),
        },
        confidence: finalSynthesis.confidence,
        relevanceScore: 98,
      });
    }
  }

  return {
    insights,
    success: insights.length > 0,
    error: insights.length === 0 ? "No synthesis generated" : undefined,
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
${FIGHTER_SPIRIT}
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
    synthesize: allInsights.filter((i) => i.phase === "synthesize"),
    validate: allInsights.filter((i) => i.phase === "validate"),
  };

  const adaptationPrompt = `You are a medical AI adaptation specialist. Your task is to analyze the complete cycle of research and generate adaptation recommendations.
${FIGHTER_SPIRIT}
Based on all phases (observe, learn, connect, theorize, synthesize, validate), determine:
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

SYNTHESIZE (${insightsByPhase.synthesize.length} insights): ${insightsByPhase.synthesize.map((i) => i.contentEn?.substring(0, 200)).join("... ")}

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
          synthesizeCount: insightsByPhase.synthesize.length,
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

  const cycles = await storage.getAllActiveEvolutionCycles();
  const cycle = cycles.find((c) => c.id === dailyRun.cycleId);
  if (!cycle) {
    console.error(`[Evolution Engine] Cycle not found for daily run ${dailyRunId}, cycleId: ${dailyRun.cycleId}`);
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
        const userId = cycle.userId;
        let previousCycleInsights: EvolutionInsight[] = [];
        if (userId) {
          previousCycleInsights = await storage.getPreviousCycleSynthesizedInsights(userId, cycle.id);
          console.log(`[Evolution Engine] Found ${previousCycleInsights.length} insights from previous cycles for continuous learning (userId: ${userId})`);
        } else {
          console.log(`[Evolution Engine] No userId found on cycle ${cycle.id}, skipping continuous learning`);
        }
        phaseResult = await executeObservePhase(diagnosisContext, previousCycleInsights);
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

      case "synthesize":
        const theorizeInsights = previousInsights.filter(
          (i) => i.phase === "theorize"
        );
        phaseResult = await executeSynthesizePhase(diagnosisContext, theorizeInsights);
        break;

      case "validate":
        const synthesizeInsights = previousInsights.filter(
          (i) => i.phase === "synthesize"
        );
        phaseResult = await executeValidatePhase(diagnosisContext, synthesizeInsights);
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
      status: currentPhasesCompleted.length === 7 ? "completed" : "running",
      ...(currentPhasesCompleted.length === 7 ? { completedAt: new Date() } : {}),
    });

    if (currentPhasesCompleted.length === 7) {
      // Re-fetch all insights including the ones just created in this phase
      const allInsightsForKnowledge = await storage.getEvolutionInsights(dailyRunId);
      await storeAccumulatedKnowledgeFromCycle(cycle, dailyRunId, allInsightsForKnowledge);
    }

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
  if (hourOfDay < 22) return "synthesize";
  if (hourOfDay < 24) return "validate";
  return "adapt";
}

function getCycleStartHour(dailyRun: EvolutionDailyRun): number {
  if (!dailyRun.createdAt) return 0;
  return new Date(dailyRun.createdAt).getHours();
}

function getCurrentPhaseForRun(dailyRun: EvolutionDailyRun): EvolutionPhase | null {
  const now = new Date();
  // Use createdAt (run start time), not phaseStartedAt (current phase start time)
  const startTime = dailyRun.createdAt;
  
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

  // All phases complete - return null to mark run as completed
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

      // First, check for any incomplete runs from previous days and complete them
      const allRuns = await storage.getEvolutionDailyRuns(cycle.id);
      for (const oldRun of allRuns) {
        if (oldRun.status === "running") {
          const expectedPhase = getCurrentPhaseForRun(oldRun);
          if (!expectedPhase) {
            // Time elapsed - mark as completed and generate report
            console.log(`[Evolution Engine] Completing old run ${oldRun.id} from ${oldRun.runDate}`);
            await storage.updateEvolutionDailyRun(oldRun.id, {
              status: "completed",
              completedAt: new Date(),
            });
          }
        }
      }

      // Backfill missing days: create daily runs for any missed days between cycle start and today
      // Use UTC date strings to avoid timezone issues
      const cycleStartDateStr = (cycle.startDate || cycle.createdAt).toString().split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];
      
      const existingRunDates = new Set(allRuns.map(r => r.runDate));
      
      // Helper to add days to a date string (YYYY-MM-DD format)
      const addDays = (dateStr: string, days: number): string => {
        const date = new Date(dateStr + "T12:00:00Z"); // Use noon UTC to avoid DST issues
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().split("T")[0];
      };
      
      let currentDateStr = cycleStartDateStr;
      
      while (currentDateStr < todayStr) {
        if (!existingRunDates.has(currentDateStr)) {
          console.log(`[Evolution Engine] Backfilling missing daily run for ${currentDateStr} in cycle ${cycle.id}`);
          
          // Create a completed run for the missed day (can't run phases retroactively)
          const backfilledRun = await storage.createEvolutionDailyRun({
            cycleId: cycle.id,
            runDate: currentDateStr,
            currentPhase: "adapt",
            status: "completed",
            phasesCompleted: [],
          });
          
          // Add to existingRunDates to prevent duplicates within same loop
          existingRunDates.add(currentDateStr);
          
          // Update with completedAt timestamp (end of that day in UTC)
          await storage.updateEvolutionDailyRun(backfilledRun.id, {
            completedAt: new Date(currentDateStr + "T23:59:59.999Z"),
          });
          
          console.log(`[Evolution Engine] Created backfilled run ${backfilledRun.id} for ${currentDateStr} (marked as completed - server was offline)`);
        }
        
        currentDateStr = addDays(currentDateStr, 1);
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
      console.log(`[Evolution Engine] Creating placeholder report for run ${dailyRunId} - no insights available`);
      
      const reportDate = dailyRun.runDate || new Date().toISOString().split("T")[0];
      const formattedDate = new Date(reportDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      const placeholderSummaryEn = "No research data was collected for this day. The evolution cycle will continue gathering insights in subsequent days.";
      const placeholderSummaryKa = "ამ დღეს კვლევითი მონაცემები არ შეგროვებულა. ევოლუციური ციკლი გააგრძელებს ინსაითების შეგროვებას მომდევნო დღეებში.";
      
      const placeholderReportData: InsertEvolutionReport = {
        dailyRunId,
        reportDate,
        titleEn: `Daily Research Report - ${formattedDate}`,
        titleKa: `ყოველდღიური კვლევითი ანგარიში - ${formattedDate}`,
        summaryEn: placeholderSummaryEn,
        summaryKa: placeholderSummaryKa,
        contentEn: placeholderSummaryEn,
        contentKa: placeholderSummaryKa,
        keyFindingsEn: [],
        keyFindingsKa: [],
        hypothesesGenerated: [],
        sourcesCompiled: [],
      };
      
      const placeholderReport = await storage.createEvolutionReport(placeholderReportData);
      console.log(`[Evolution Engine] Placeholder report ${placeholderReport.id} created for run ${dailyRunId}`);
      return placeholderReport;
    }

    const insightsByPhase: Record<string, EvolutionInsight[]> = {
      observe: [],
      learn: [],
      connect: [],
      theorize: [],
      synthesize: [],
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

    const systemPrompt = `შენ ხარ სამედიცინო კვლევითი ასისტენტი, რომელიც ყოველდღიურად აწარმოებს ლიტერატურის მიმოხილვას ნეონატალური HIE-ს შესახებ. შენი ანგარიშები უნდა იყოს:
- მეცნიერულად ზუსტი და ვერიფიცირებადი
- პრაქტიკულად გამოყენებადი
- პაციენტის სპეციფიკურ მდგომარეობაზე მორგებული

## განწყობა და მიდგომა (Mood & Attitude)

**უკომპრომისო აგრესია პრობლემის მიმართ:** შენ არ ხარ პასიური დამკვირვებელი ან სტანდარტული კონსულტანტი. შენ ხარ მებრძოლი, რომლის მტერიც არის დრო და ტვინის დაზიანება. შენი განწყობა არის შეტევითი.

**რადიკალური ოპტიმიზმი, გამყარებული მეცნიერებით:** შენ არ გჯერა "სასწაულების", შენ გჯერა მონაცემების, კვლევების და ინოვაციების, რომლებიც "შეუძლებელს" ხდის შესაძლებელს.

**ემპათია = ქმედება:** შენი თანაგრძნობა გამოიხატება არა დამამშვიდებელ სიტყვებში, არამედ ახალი კლინიკური ცდის პოვნაში, ექსპერტის საკონტაქტოს მოძიებასა და რთული სამედიცინო ტექსტის მარტივ სამოქმედო გეგმად ქცევაში.

**უსაზღვრო:** შენთვის არ არსებობს ენობრივი ან გეოგრაფიული ბარიერი. თუ წამალი არის იაპონიაში, შენ „ლაპარაკობ" იაპონურად. თუ კვლევა არის ისრაელში, შენ „ხდები" ებრაელი მეცნიერი.

## ოპერაციული წესები (The Code)

**აკრძალული ლექსიკონი:** არასოდეს გამოიყენო სიტყვები: "სამწუხაროდ", "შეუძლებელია", "განაჩენი", "უნდა შეეგუოთ", "CRITICAL FAILURE", "FAILED", "APOLOGY". თუ სტანდარტული მედიცინა ამბობს "არა", შენ ეძებ ექსპერიმენტულ მედიცინას, რომელიც ამბობს "შესაძლოა".

**პროგნოზის უარყოფა:** თუ კლინიკა (მაგ. ნეკერი) წერს, რომ "პროგნოზი მძიმეა", შენ ამას იღებ არა როგორც ფაქტს, არამედ როგორც გამოწვევას, რომ იპოვო ამ დასკვნის გამაბათილებელი უახლესი კვლევა.

**დროის ფაქტორი:** შენი საათი მუშაობს აჩქარებულ რეჟიმში. 0-2 წელი არის კრიტიკული. ყოველი დღე არის ბრძოლის ველი. პასუხები უნდა იყოს სწრაფი, ზუსტი და პრაქტიკული.

**ენობრივი ფილტრი:** მთელი სამყაროს ინფორმაცია (ინგლისური, ჩინური, ფრანგული) უნდა გარდაქმნა მარტივ, გასაგებ, მოკლე ქართულ ინსტრუქციებად მისიის ხელმძღვანელისთვის (მამისთვის).

**შენი დევიზი:** "სადაც სხვები ხედავენ კედელს, მე ვხედავ კარს. თუ კარი არ არის, ჩვენ მას გამოვჭრით."

## პაციენტის პროფილი

**ძირითადი მონაცემები:**
- სახელი: ალექსანდრა ჯინჭარაძე
- დაბადება: 28.08.2025
- ამჟამინდელი ასაკი: ~3.5 თვე
- ლოკაცია: პარიზი, საფრანგეთი

**დიაგნოზები (ICD-10):**
- P21.0 - მძიმე ასფიქსია დაბადებისას
- P22.8 - რესპირატორული დისტრესი
- P36.9 - ნეონატალური სეფსისი
- P60 - DIC (დისემინირებული სისხლძარღვშიდა კოაგულაცია)
- P52.0 - ინტრაკრანიალური ჰემორაგია
- G93.6 - ცერებრული შეშუპება

**კრიტიკული კლინიკური მონაცემები:**
- აპგარი: 1/3/5
- თერაპიული ჰიპოთერმია: ჩატარდა (დასრულდა 31.08.25)

**MRI დასკვნა (25.09.2025):**
⚠️ კრიტიკული: ეს არ არის "cystic leukomalacia" ან "white matter atrophy"

სწორი აღწერა:
- Near-total cerebral parenchymal loss (თითქმის სრული პარენქიმის დანაკარგი)
- Diffuse cystic encephalomalacia
- Chronic epidural hemorrhage 5.5cm (მარჯვენა frontoparietal)
- Bilateral subdural hemorrhage
- Cerebellar hemorrhage 8mm
- Severe ventriculomegaly
- Corpus callosum marked thinning
- MRA: distal branches reduction

**თერაპიული ფანჯრები:**
- თერაპიული ჰიპოთერმია: ❌ დახურული (საჭირო იყო <6 საათი)
- EPO ნეიროპროტექცია: ❌ დახურული (საჭირო იყო <48 საათი)
- ღეროვანი უჯრედები: ⚠️ შესაძლებელი (Duke EAP აპლიკაცია მიმდინარე)
- ნეირორეაბილიტაცია: ✅ აქტიური (CME-Medek, Vojta, Bobath)

## OUTPUT FORMAT

Your output must be a valid JSON object with this exact structure:
{
  "title": "HIE Research Report - [Date]",
  "executiveSummary": "A 2-3 paragraph executive summary of today's work, key discoveries, and recommended actions.",
  "fullContent": "The complete structured report in markdown format",
  "keyFindings": ["Specific finding 1", "Specific finding 2", ...up to 8-10 findings],
  "synthesizedHypotheses": [
    {
      "hypothesis": "Clear hypothesis statement",
      "confidence": 80,
      "evidence": ["Evidence 1", "Evidence 2"],
      "disciplines": ["Neurology", "Pharmacology"]
    }
  ]
}

## fullContent MUST follow this exact structure:

## 1. What Was Done Today
[რა კვლევა ჩატარდა, რა მონაცემთა ბაზები, რამდენი სტატია]

## 2. Key Discoveries
[თითოეული აღმოჩენისთვის:]
- **Finding**: [კონკრეტული აღმოჩენა]
- **Source**: [ავტორი, წელი, ჟურნალი, PMID/DOI]
- **Relevance to Alexandra**: [როგორ ეხება კონკრეტულად მის შემთხვევას]
- **Confidence**: [High/Medium/Low + დასაბუთება]

## 3. Clinical Implications & Results
[პრაქტიკული შედეგები, რისკები, რეკომენდაციები]

## 4. Next Steps & Action Plan
- **მშობლებისთვის**: [კონკრეტული ქმედებები]
- **სამედიცინო გუნდისთვის კითხვები**: [რა უნდა იკითხონ]
- **კვლევის პრიორიტეტები**: [შემდეგი ციკლისთვის]

## 5. Sources & References
[სრული ბიბლიოგრაფია - PMID/DOI ლინკებით]

## SOURCE REQUIREMENTS

❌ NEVER use:
- Irrelevant sources (e.g., "Cigarette Smoke Exposure", "Metal-free photocatalyst", "Nitrogen-doped carbon materials")
- Vague references (e.g., "Current clinical guidelines 2015-2025", "Recent research shows...", "Studies suggest...")

✅ CORRECT source format:
Juul SE, Comstock BA, Heagerty PJ, et al. High-Dose Erythropoietin for 
Asphyxia and Encephalopathy (HEAL): A Randomized Controlled Trial. 
JAMA. 2020;324(21):2165-2175. 
DOI: 10.1001/jama.2020.18948
PMID: 33258906
[RCT, n=500, High Confidence]

## CONTEXT AWARENESS

**აქტუალური კვლევები (ახლა შესაძლებელი):**
- Cord blood/stem cell therapy (Duke EAP)
- Intensive early intervention (CME Medek, Vojta, Bobath)
- Nutritional neuroprotection (DHA, choline)
- Seizure management optimization

**არა-აქტუალური (ფანჯარა დახურული):**
- Therapeutic hypothermia protocols
- Acute phase EPO
- Xenon anesthesia
- Immediate post-birth interventions

**სპეციფიკური კითხვები:**
1. რა მტკიცებულება არსებობს near-total parenchymal loss-ის დროს რეაბილიტაციის ეფექტურობაზე?
2. რა არის brainstem preservation-ის პროგნოსტული მნიშვნელობა?
3. რა ინტენსივობის რეაბილიტაცია არის ოპტიმალური 3-6 თვის ასაკში?
4. რა არის cord blood therapy-ს ეფექტურობა chronic phase-ში?

## CONFIDENCE LEVELS

- **High**: ≥2 RCT ან meta-analysis (მაგ: HEAL Trial, CoolCap)
- **Medium**: Phase I/II trials, large cohorts (მაგ: Duke cord blood feasibility)
- **Low**: Case reports, animal studies, expert opinion

## CRITICAL RULES

🚫 რას არ აკეთებ:
- არ იგონებ წყაროებს - თუ ვერ პოულობ, აღიარე
- არ ამარტივებ დიაგნოზს - "near-total parenchymal loss" ≠ "cystic leukomalacia"
- არ იძლევი ცრუ იმედს - რეალისტური პროგნოზი
- არ უგულებელყოფ დროის ფაქტორს - რა არის ახლა შესაძლებელი
- არ რეკომენდაციებ მიუწვდომელს - გაითვალისწინე პარიზი, asylum status

✅ რას აკეთებ:
- ამოწმებ ყველა ციტატას გამოქვეყნებამდე
- უკავშირებ ალექსანდრას შემთხვევას ყველა აღმოჩენას
- მიუთითებ პრაქტიკულ ნაბიჯებს კონკრეტული ვადებით
- აღიარებ შეზღუდვებს როცა evidence არასაკმარისია
- განასხვავებ აქტუალურს არა-აქტუალურისგან`;


    const query = `Generate a structured executive research report for the Evolution Cycle run on ${formattedDate}.

Below is all the raw research data collected today. Synthesize this into a clear, actionable report following the exact format specified.

---

## RAW DATA: OBSERVE PHASE (Literature Review)
${phaseContent("observe", insightsByPhase.observe)}

---

## RAW DATA: LEARN PHASE (Knowledge Extraction)
${phaseContent("learn", insightsByPhase.learn)}

---

## RAW DATA: CONNECT PHASE (Clinical Connections)
${phaseContent("connect", insightsByPhase.connect)}

---

## RAW DATA: THEORIZE PHASE (Hypotheses)
${phaseContent("theorize", insightsByPhase.theorize)}

---

## RAW DATA: VALIDATE PHASE (Evidence Assessment)
${phaseContent("validate", insightsByPhase.validate)}

---

## RAW DATA: ADAPT PHASE (Recommendations)
${phaseContent("adapt", insightsByPhase.adapt)}

---

MANDATORY: Your fullContent MUST use exactly these markdown headings in this order:

## 1. What Was Done Today
(List as bullet points: specific research activities, sources searched, papers reviewed)

## 2. Key Discoveries
(For each finding use this format:
- **Finding**: [concrete statement]
- **Source**: [name/link]
- **Relevance to HIE**: [specific application]
- **Confidence**: High/Medium/Low)

## 3. Clinical Implications & Results
(Bullet points: treatment implications, therapy recommendations, safety notes)

## 4. Next Steps & Action Plan
(Bullet points: specific actions parents can take, questions for doctors, research priorities)

## 5. Sources & References
(List all sources with titles)

CRITICAL RULES:
- Use ONLY the headings above - no other section headings
- Use bullet points within each section
- State concrete facts and recommendations, NOT "the text discusses" or "the research mentions"
- Every finding must be specific and actionable`;

    console.log(`[Evolution Engine] Calling Claude to synthesize report...`);

    let responseContent = "{}";
    
    try {
      const claudePromise = anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: query }],
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Claude API timeout after 120s")), 120000)
      );
      
      const response = await Promise.race([claudePromise, timeoutPromise]);
      responseContent = response.content[0]?.type === "text" ? response.content[0].text : "{}";
      console.log(`[Evolution Engine] Claude response received successfully`);
    } catch (claudeError) {
      console.error(`[Evolution Engine] Claude API failed:`, claudeError);
      console.log(`[Evolution Engine] Falling back to OpenAI GPT-4o for report generation...`);
      
      try {
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
          ],
        });
        responseContent = openaiResponse.choices[0]?.message?.content || "{}";
        console.log(`[Evolution Engine] OpenAI fallback response received successfully`);
      } catch (openaiError) {
        console.error(`[Evolution Engine] OpenAI fallback also failed:`, openaiError);
        throw new Error("Both Claude and OpenAI failed to generate report");
      }
    }

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

async function storeAccumulatedKnowledgeFromCycle(
  cycle: EvolutionCycle,
  dailyRunId: number,
  allInsights: EvolutionInsight[]
): Promise<void> {
  console.log(`[Evolution Engine] Storing accumulated knowledge from cycle ${cycle.id}`);
  
  try {
    const synthesizeInsights = allInsights.filter(
      (i) => i.phase === "synthesize" && (i.confidence || 0) >= 70
    );
    
    const validateInsights = allInsights.filter(
      (i) => i.phase === "validate" && (i.confidence || 0) >= 75
    );
    
    const highValueInsights = [...synthesizeInsights, ...validateInsights];
    
    if (highValueInsights.length === 0) {
      console.log("[Evolution Engine] No high-confidence insights to store as accumulated knowledge");
      return;
    }
    
    const existingKnowledge = await storage.getActiveAccumulatedKnowledge(cycle.userId || "");
    const processedKnowledgeIds = new Set<number>();
    
    for (const insight of highValueInsights) {
      const knowledgeType = determineKnowledgeType(insight);
      const title = extractTitleFromContent(insight.contentEn || "");
      
      const similarKnowledge = existingKnowledge.find(k => 
        !processedKnowledgeIds.has(k.id) && (
          k.titleEn?.toLowerCase().includes(title.toLowerCase().substring(0, 30)) ||
          title.toLowerCase().includes(k.titleEn?.toLowerCase().substring(0, 30) || "")
        )
      );
      
      if (similarKnowledge) {
        processedKnowledgeIds.add(similarKnowledge.id);
        
        const alreadyContributed = (similarKnowledge.contributingCycleIds || []).includes(cycle.id);
        if (alreadyContributed) {
          console.log(`[Evolution Engine] Cycle ${cycle.id} already contributed to knowledge #${similarKnowledge.id}, skipping`);
          continue;
        }
        
        const updatedCycleIds = [...(similarKnowledge.contributingCycleIds || []), cycle.id];
        const newValidationCount = (similarKnowledge.validationCount || 0) + 1;
        
        let newStatus = similarKnowledge.status;
        if (newValidationCount >= 3) {
          newStatus = "validated";
        } else if (newValidationCount >= 1 && similarKnowledge.status === "emerging") {
          newStatus = "active";
        }
        
        await storage.updateAccumulatedKnowledge(similarKnowledge.id, cycle.userId || "", {
          validationCount: newValidationCount,
          confidence: Math.min(100, (similarKnowledge.confidence || 50) + 5),
          contributingCycleIds: updatedCycleIds,
          status: newStatus,
        });
        
        console.log(`[Evolution Engine] Updated existing knowledge #${similarKnowledge.id} (validations: ${newValidationCount}, status: ${newStatus})`);
      } else {
        const newKnowledge: InsertAccumulatedKnowledge = {
          userId: cycle.userId,
          childId: cycle.childId,
          knowledgeType,
          titleEn: title,
          titleKa: insight.contentKa ? extractTitleFromContent(insight.contentKa) : undefined,
          contentEn: insight.contentEn || "",
          contentKa: insight.contentKa,
          confidence: insight.confidence || 70,
          validationCount: 0,
          contradictionCount: 0,
          status: "emerging",
          sources: insight.sources as InsertAccumulatedKnowledge["sources"],
          contributingCycleIds: [cycle.id],
          originCycleId: cycle.id,
          originInsightId: insight.id,
          metadata: {
            phase: insight.phase,
            insightType: insight.insightType,
            aiProvider: (insight.metadata as Record<string, unknown>)?.aiProvider,
          },
        };
        
        await storage.createAccumulatedKnowledge(newKnowledge);
        console.log(`[Evolution Engine] Created new accumulated knowledge from insight #${insight.id}`);
      }
    }
    
    console.log(`[Evolution Engine] Processed ${highValueInsights.length} insights for accumulated knowledge`);
  } catch (error) {
    console.error("[Evolution Engine] Error storing accumulated knowledge:", error);
  }
}

function determineKnowledgeType(insight: EvolutionInsight): string {
  const content = (insight.contentEn || "").toLowerCase();
  const insightType = insight.insightType?.toLowerCase() || "";
  
  if (insightType.includes("hypothesis") || content.includes("hypothesis") || content.includes("theory")) {
    return "hypothesis";
  }
  if (insightType.includes("mechanism") || content.includes("mechanism") || content.includes("pathway")) {
    return "mechanism";
  }
  if (content.includes("treatment") || content.includes("therapy") || content.includes("intervention")) {
    return "treatment_insight";
  }
  if (content.includes("pattern") || content.includes("trend") || content.includes("correlation")) {
    return "pattern";
  }
  if (content.includes("connection") || content.includes("cross-disciplinary") || content.includes("interdisciplinary")) {
    return "connection";
  }
  if (insight.phase === "validate" || content.includes("confirmed") || content.includes("validated")) {
    return "discovery";
  }
  
  return "discovery";
}

function extractTitleFromContent(content: string): string {
  const firstSentence = content.split(/[.!?\n]/)[0]?.trim() || "";
  
  if (firstSentence.length <= 100) {
    return firstSentence;
  }
  
  return firstSentence.substring(0, 97) + "...";
}

export async function startEvolutionCycle(
  userId: string,
  childId: number,
  endDate: Date,
  triggerDocumentId: number | null,
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

export async function completeCycleAndStartNew(cycleId: number): Promise<EvolutionCycle | null> {
  console.log(`[Evolution Engine] Completing cycle ${cycleId} and starting new one...`);
  
  try {
    const oldCycle = await storage.getEvolutionCycleById(cycleId);
    if (!oldCycle) {
      console.error(`[Evolution Engine] Cycle ${cycleId} not found`);
      return null;
    }

    await storage.updateEvolutionCycle(cycleId, oldCycle.userId || "", {
      status: "completed",
    });
    console.log(`[Evolution Engine] Marked cycle ${cycleId} as completed`);

    const dailyRuns = await storage.getEvolutionDailyRuns(cycleId);
    let allInsightsFromCycle: EvolutionInsight[] = [];
    
    for (const run of dailyRuns) {
      const insights = await storage.getEvolutionInsights(run.id);
      allInsightsFromCycle = allInsightsFromCycle.concat(insights);
    }

    console.log(`[Evolution Engine] Collected ${allInsightsFromCycle.length} insights from completed cycle`);

    const topInsights = allInsightsFromCycle
      .filter(i => i.confidence && i.confidence >= 70)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 20);

    for (const insight of topInsights) {
      try {
        const knowledgeType = categorizeInsight(insight);
        const existingKnowledge = await storage.getAccumulatedKnowledgeByChild(
          oldCycle.userId || "",
          oldCycle.childId || 0
        );
        
        const isDuplicate = existingKnowledge.some(k => 
          k.contentEn && insight.contentEn && 
          k.contentEn.substring(0, 100) === insight.contentEn.substring(0, 100)
        );

        if (!isDuplicate && insight.contentEn) {
          await storage.createAccumulatedKnowledge({
            userId: oldCycle.userId || "",
            childId: oldCycle.childId || 0,
            knowledgeType,
            titleEn: extractTitleFromContent(insight.contentEn),
            titleKa: insight.contentKa ? extractTitleFromContent(insight.contentKa) : null,
            contentEn: insight.contentEn,
            contentKa: insight.contentKa || null,
            confidence: insight.confidence || 70,
            sourceCycleId: cycleId,
            sourcePhase: insight.phase || "observe",
            validatedCount: 0,
            contradictedCount: 0,
            isActive: true,
            metadata: insight.metadata || {},
          });
        }
      } catch (error) {
        console.error(`[Evolution Engine] Error saving accumulated knowledge:`, error);
      }
    }

    console.log(`[Evolution Engine] Saved top insights to accumulated_knowledge`);

    // Generate and send PDF reports via email
    await sendCycleCompletionEmail(cycleId, allInsightsFromCycle, oldCycle.diagnosisContext || "");

    if (!oldCycle.userId || !oldCycle.childId || !oldCycle.diagnosisContext) {
      console.log(`[Evolution Engine] Missing required data for new cycle, skipping auto-start`);
      return null;
    }

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 26);

    const newCycle = await startEvolutionCycle(
      oldCycle.userId,
      oldCycle.childId,
      newEndDate,
      oldCycle.triggerDocumentId,
      oldCycle.diagnosisContext
    );

    console.log(`[Evolution Engine] Started new cycle ${newCycle.id} from completed cycle ${cycleId}`);
    return newCycle;
  } catch (error) {
    console.error(`[Evolution Engine] Error in completeCycleAndStartNew:`, error);
    return null;
  }
}

// Send PDF reports via email when cycle completes
async function sendCycleCompletionEmail(
  cycleId: number, 
  allInsights: EvolutionInsight[],
  diagnosisContext: string
): Promise<void> {
  const EMAIL_RECIPIENT = "jincharadzeshako@gmail.com";
  
  try {
    console.log(`[Evolution Engine] Generating PDF reports for cycle ${cycleId}...`);
    
    // Get all reports for this cycle
    const dailyRuns = await storage.getEvolutionDailyRuns(cycleId);
    const reports: EvolutionReport[] = [];
    
    for (const run of dailyRuns) {
      const report = await storage.getEvolutionReportByDailyRun(run.id);
      if (report) {
        reports.push(report);
      }
    }

    // Generate PDF in both languages
    const [pdfEn, pdfKa] = await Promise.all([
      generateCycleSummaryPDF(cycleId, reports, allInsights, { language: "en" }),
      generateCycleSummaryPDF(cycleId, reports, allInsights, { language: "ka" }),
    ]);

    const dateStr = new Date().toISOString().split("T")[0];
    
    // Get child info for email subject
    const cycle = await storage.getEvolutionCycleById(cycleId);
    let childName = "";
    if (cycle?.childId && cycle?.userId) {
      const child = await storage.getChild(cycle.childId, cycle.userId);
      childName = child ? `${child.firstName} ${child.lastName}`.trim() : "";
    }

    const subjectEn = `HIE Research Cycle #${cycleId} Complete - ${childName || "Your Child"}`;
    const subjectKa = `HIE კვლევის ციკლი #${cycleId} დასრულდა - ${childName || "თქვენი შვილი"}`;

    const bodyEn = `
Dear Parent,

The HIE Parent Command Center has completed Evolution Cycle #${cycleId}.

During this 6-day research cycle, our AI agents have:
- Analyzed ${allInsights.length} research insights
- Searched across multiple medical disciplines
- Generated hypotheses and recommendations specific to your child's condition

Please find attached the cycle summary report in both English and Georgian languages.

Key Statistics:
- Total Insights Gathered: ${allInsights.length}
- Reports Generated: ${reports.length}
- Cycle Duration: 6 days

The next research cycle has automatically started and will continue to search for new treatments, clinical trials, and research relevant to your child's condition.

Best regards,
HIE Parent Command Center
    `.trim();

    const bodyKa = `
ძვირფასო მშობელო,

HIE მშობლის სარდლობის ცენტრმა დაასრულა Evolution ციკლი #${cycleId}.

ამ 6-დღიანი კვლევის ციკლის განმავლობაში, ჩვენმა AI აგენტებმა:
- გაანალიზეს ${allInsights.length} კვლევითი ინსაიტი
- მოძებნეს სხვადასხვა სამედიცინო დისციპლინაში
- შექმნეს ჰიპოთეზები და რეკომენდაციები თქვენი შვილის მდგომარეობისთვის

გთხოვთ იხილოთ თანდართული ციკლის შემაჯამებელი ანგარიში ინგლისურ და ქართულ ენებზე.

მთავარი სტატისტიკა:
- სულ შეგროვებული ინსაიტები: ${allInsights.length}
- გენერირებული ანგარიშები: ${reports.length}
- ციკლის ხანგრძლივობა: 6 დღე

შემდეგი კვლევის ციკლი ავტომატურად დაიწყო და გააგრძელებს თქვენი შვილის მდგომარეობისთვის შესაბამისი ახალი მკურნალობების, კლინიკური კვლევებისა და კვლევების ძიებას.

პატივისცემით,
HIE მშობლის სარდლობის ცენტრი
    `.trim();

    // Combine both languages in one email
    const combinedBody = `${bodyKa}\n\n---\n\n${bodyEn}`;
    const combinedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">HIE Parent Command Center</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Evolution Cycle #${cycleId} Complete</p>
        </div>
        
        <div style="padding: 20px; background: #f7fafc; border-left: 4px solid #3182ce;">
          <h2 style="color: #2d3748; margin-top: 0;">ქართულად:</h2>
          <p style="white-space: pre-line; color: #4a5568;">${bodyKa}</p>
        </div>
        
        <div style="padding: 20px; background: #fff;">
          <h2 style="color: #2d3748; margin-top: 0;">In English:</h2>
          <p style="white-space: pre-line; color: #4a5568;">${bodyEn}</p>
        </div>
        
        <div style="background: #2d3748; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated message from HIE Parent Command Center</p>
        </div>
      </div>
    `;

    const result = await sendEmailWithAttachments({
      to: EMAIL_RECIPIENT,
      subject: `${subjectKa} / ${subjectEn}`,
      body: combinedBody,
      html: combinedHtml,
      attachments: [
        {
          filename: `HIE_Cycle_${cycleId}_Summary_EN_${dateStr}.pdf`,
          content: pdfEn,
          contentType: "application/pdf",
        },
        {
          filename: `HIE_Cycle_${cycleId}_Summary_KA_${dateStr}.pdf`,
          content: pdfKa,
          contentType: "application/pdf",
        },
      ],
    });

    if (result.success) {
      console.log(`[Evolution Engine] Successfully sent cycle completion email with PDFs to ${EMAIL_RECIPIENT}`);
    } else {
      console.error(`[Evolution Engine] Failed to send cycle completion email: ${result.error}`);
    }
  } catch (error) {
    console.error(`[Evolution Engine] Error sending cycle completion email:`, error);
  }
}
