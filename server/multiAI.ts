import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Using Replit's AI Integrations service for Gemini - requires httpOptions
const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// Using Replit's AI Integrations service for Anthropic
const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

interface AIResponse {
  provider: string;
  content: string;
  success: boolean;
  error?: string;
}

interface ConsensusResult {
  content: string;
  sources: string[];
  processingTime: number;
}

interface SearchConsensusResult extends ConsensusResult {
  searchResults: { title: string; url: string; snippet: string }[];
}

async function queryOpenAI(
  systemPrompt: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<AIResponse> {
  try {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const content = completion.choices[0]?.message?.content || "";
    return { provider: "OpenAI", content, success: true };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      provider: "OpenAI",
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryGemini(
  systemPrompt: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<AIResponse> {
  try {
    const historyText = chatHistory
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    const fullPrompt = `${systemPrompt}

Previous conversation:
${historyText}

User: ${userMessage}

Please respond to the user's message:`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const content = response.text || "";
    return { provider: "Gemini", content, success: true };
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      provider: "Gemini",
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function queryAnthropic(
  systemPrompt: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<AIResponse> {
  try {
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...chatHistory,
      { role: "user", content: userMessage },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    return { provider: "Claude", content, success: true };
  } catch (error) {
    console.error("Anthropic error:", error);
    return {
      provider: "Claude",
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function synthesizeResponses(
  responses: AIResponse[],
  originalQuestion: string
): Promise<string> {
  const successfulResponses = responses.filter((r) => r.success && r.content.trim());

  if (successfulResponses.length === 0) {
    return "I apologize, but I was unable to generate a response at this time. Please try again.";
  }

  if (successfulResponses.length === 1) {
    return successfulResponses[0].content;
  }

  const synthesisPrompt = `You are a synthesis assistant. Below are responses from multiple AI assistants to the same question. Your job is to create ONE unified, coherent response that combines the best insights from all responses.

IMPORTANT RULES:
- Do NOT mention that multiple AIs were consulted
- Do NOT refer to "different perspectives" or "multiple sources"
- Create a single, natural response as if it came from one assistant
- Combine the most accurate, helpful, and relevant information
- If responses disagree, favor the most medically accurate information
- Maintain an empathetic, supportive tone appropriate for parents of children with HIE

Original question: "${originalQuestion}"

Response 1:
${successfulResponses[0].content}

${successfulResponses[1] ? `Response 2:
${successfulResponses[1].content}` : ""}

${successfulResponses[2] ? `Response 3:
${successfulResponses[2].content}` : ""}

Now provide a single, unified response:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You synthesize multiple AI responses into one coherent answer without revealing that multiple sources were used.",
        },
        { role: "user", content: synthesisPrompt },
      ],
    });

    return (
      completion.choices[0]?.message?.content ||
      successfulResponses[0].content
    );
  } catch (error) {
    console.error("Synthesis error:", error);
    return successfulResponses[0].content;
  }
}

export async function getConsensusResponse(
  systemPrompt: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<ConsensusResult> {
  const startTime = Date.now();

  const responses = await Promise.all([
    queryOpenAI(systemPrompt, userMessage, chatHistory),
    queryGemini(systemPrompt, userMessage, chatHistory),
    queryAnthropic(systemPrompt, userMessage, chatHistory),
  ]);

  const successfulProviders = responses
    .filter((r) => r.success)
    .map((r) => r.provider);

  console.log(`Multi-AI consensus: ${successfulProviders.length}/3 providers responded (${successfulProviders.join(", ")})`);

  const synthesizedContent = await synthesizeResponses(responses, userMessage);

  return {
    content: synthesizedContent,
    sources: successfulProviders,
    processingTime: Date.now() - startTime,
  };
}

export const MULTI_AI_SYSTEM_PROMPT = `You are a helpful medical assistant for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). 
Provide empathetic, accurate information about HIE, therapies, and medical care. Always recommend consulting healthcare providers for specific medical decisions.
Be supportive and understanding of the emotional challenges parents face.`;

async function synthesizeSearchResponses(
  responses: AIResponse[],
  originalQuestion: string,
  searchResultsText: string
): Promise<string> {
  const successfulResponses = responses.filter((r) => r.success && r.content.trim());

  if (successfulResponses.length === 0) {
    return "I apologize, but I was unable to generate a response at this time. Please try again.";
  }

  if (successfulResponses.length === 1) {
    return successfulResponses[0].content;
  }

  const synthesisPrompt = `You are a synthesis assistant for medical search results. Below are responses from multiple AI assistants who analyzed the same web search results. Your job is to create ONE unified, coherent response.

IMPORTANT RULES:
- Do NOT mention that multiple AIs were consulted
- Do NOT say things like "based on my search" or "I found"
- Create a single, natural response as if from one assistant
- Combine the most accurate and relevant information
- ALWAYS include source citations using the format [Source 1], [Source 2], etc.
- Present the information clearly with proper attribution to sources
- Maintain an empathetic tone appropriate for HIE parents
- Prioritize actionable information (contacts, locations, names)

Original question: "${originalQuestion}"

Search results provided to each AI:
${searchResultsText}

Response 1:
${successfulResponses[0].content}

${successfulResponses[1] ? `Response 2:
${successfulResponses[1].content}` : ""}

${successfulResponses[2] ? `Response 3:
${successfulResponses[2].content}` : ""}

Now provide a single, unified response with proper source citations:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You synthesize multiple AI responses about web search results into one coherent answer with source citations.",
        },
        { role: "user", content: synthesisPrompt },
      ],
    });

    return (
      completion.choices[0]?.message?.content ||
      successfulResponses[0].content
    );
  } catch (error) {
    console.error("Search synthesis error:", error);
    return successfulResponses[0].content;
  }
}

export async function getConsensusSearchResponse(
  userMessage: string,
  searchResults: { title: string; url: string; snippet: string }[],
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<SearchConsensusResult> {
  const startTime = Date.now();

  const searchResultsText = searchResults.length > 0
    ? searchResults
        .map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
        .join("\n\n")
    : "No search results found.";

  const searchSystemPrompt = `You are a medical research assistant helping parents of children with Hypoxic-Ischemic Encephalopathy (HIE).

You have been provided with web search results to help answer the user's question. Your task is to:
1. Analyze the search results carefully
2. Extract relevant information that answers the user's question
3. Present the information clearly with citations like [Source 1], [Source 2], etc.
4. Be empathetic and supportive in your tone
5. If information is incomplete or uncertain, acknowledge limitations
6. Prioritize actionable information (clinic names, doctor contacts, study details)

SEARCH RESULTS:
${searchResultsText}

Respond based on these search results. Always cite your sources using [Source X] format.`;

  const responses = await Promise.all([
    queryOpenAI(searchSystemPrompt, userMessage, chatHistory),
    queryGemini(searchSystemPrompt, userMessage, chatHistory),
    queryAnthropic(searchSystemPrompt, userMessage, chatHistory),
  ]);

  const successfulProviders = responses
    .filter((r) => r.success)
    .map((r) => r.provider);

  console.log(`Multi-AI search consensus: ${successfulProviders.length}/3 providers responded (${successfulProviders.join(", ")})`);

  const synthesizedContent = await synthesizeSearchResponses(
    responses,
    userMessage,
    searchResultsText
  );

  return {
    content: synthesizedContent,
    sources: successfulProviders,
    processingTime: Date.now() - startTime,
    searchResults: searchResults,
  };
}

export const SEARCH_SYSTEM_PROMPT = `You are a medical research assistant helping parents of children with Hypoxic-Ischemic Encephalopathy (HIE).
Help find relevant clinics, doctors, clinical trials, research, and resources. Always cite your sources and provide actionable information.`;
