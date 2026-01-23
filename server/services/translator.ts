import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * Translates text from English to Georgian using OpenAI
 * Specialized for medical and scientific terminology
 */
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
