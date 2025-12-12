import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsBreakdown, UserPersona, GroundingChunk, NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We need a specific type for the analysis response to include grounding metadata
export interface AnalysisResult {
    breakdown: NewsBreakdown;
    groundingChunks: GroundingChunk[];
}

// Helper to clean Markdown and extract JSON from potential conversational filler
const cleanJson = (str: string) => {
    if (!str) return "";
    
    // Remove markdown code blocks
    let cleaned = str.replace(/```json/gi, '').replace(/```/g, '');
    
    // Attempt to find the outer-most JSON array or object
    const firstSquare = cleaned.indexOf('[');
    const firstCurly = cleaned.indexOf('{');
    
    let start = -1;
    
    // Determine if we are looking for an array or object based on which comes first
    if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
        start = firstSquare;
        const end = cleaned.lastIndexOf(']');
        if (end !== -1) return cleaned.substring(start, end + 1);
    } else if (firstCurly !== -1) {
        start = firstCurly;
        const end = cleaned.lastIndexOf('}');
        if (end !== -1) return cleaned.substring(start, end + 1);
    }
    
    return cleaned;
};

// Helper: Translates a small chunk of simplified items with retry logic
const translateChunk = async (
    chunk: {index: number, title: string, snippet: string}[], 
    targetLanguage: string, 
    retries = 1
): Promise<any[]> => {
    const prompt = `
    You are a professional news translator.
    Task: Translate the "title" and "snippet" of the provided news items into ${targetLanguage}.
    
    Rules:
    1. Output ONLY a VALID JSON Array. No markdown, no intro text.
    2. Preserve the "index" property for each item EXACTLY as provided.
    3. Translate "title" and "snippet" to ${targetLanguage}.
    4. Do not omit any items.
    
    Input:
    ${JSON.stringify(chunk)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text || "[]";
        const cleanedText = cleanJson(text);
        const result = JSON.parse(cleanedText);
        
        // Basic validation
        if (!Array.isArray(result)) throw new Error("Response is not an array");
        
        return result;
    } catch (e) {
        console.warn(`Chunk translation error for ${targetLanguage}:`, e);
        if (retries > 0) {
            console.warn(`Retrying chunk translation...`);
            return translateChunk(chunk, targetLanguage, retries - 1);
        }
        return []; // Return empty, these will stay English fallback
    }
};

export const translateNewsBatch = async (
    items: NewsItem[],
    targetLanguage: string
): Promise<NewsItem[]> => {
    if (targetLanguage === 'English') return items;

    // 1. Prepare simplified items with index tracking
    // We use a simple index (0, 1, 2) instead of the complex GUID to ensure the AI 
    // can map it back correctly without hallucinating characters in the ID.
    const simplifiedItems = items.map((item, index) => ({
        index,
        title: item.title,
        snippet: item.snippet?.slice(0, 200) || "" // Limit length to help AI focus
    }));

    // 2. Process in chunks of 10 to balance speed and reliability (15 items total = max 2 requests)
    const CHUNK_SIZE = 10;
    const chunks = [];
    for (let i = 0; i < simplifiedItems.length; i += CHUNK_SIZE) {
        chunks.push(simplifiedItems.slice(i, i + CHUNK_SIZE));
    }

    // 3. Process all chunks in parallel with retry logic included in translateChunk
    const results = await Promise.all(
        chunks.map(chunk => translateChunk(chunk, targetLanguage))
    );

    // 4. Flatten results
    const flatTranslations = results.flat();

    // 5. Create a map of Index -> Translated Data
    const translationMap = new Map();
    flatTranslations.forEach((t: any) => {
        if (t && typeof t.index === 'number') {
            translationMap.set(t.index, t);
        }
    });

    // 6. Merge translation back into original items
    return items.map((item, index) => {
        const translation = translationMap.get(index);
        if (translation) {
            return { 
                ...item, 
                title: translation.title || item.title, 
                snippet: translation.snippet || item.snippet 
            };
        }
        return item; // Fallback to original if translation failed
    });
};

export const analyzeNewsItem = async (
  headline: string,
  snippet: string,
  persona: UserPersona,
  language: string = "English"
): Promise<AnalysisResult> => {
  
  // Stronger instruction to ensure output language is respected
  const systemInstruction = `You are "The Unsalted Truth", a quick, visual, and simple news simplifier.
  Your goal is to make complex news instantly understandable for ${persona.role} located in ${persona.location}.
  
  CRITICAL RULES:
  1. The output Language for all VALUES must be: ${language.toUpperCase()}.
  2. The output Keys for JSON must be: ENGLISH.
  3. Use very simple, plain language (ELI5 level) in ${language}.
  4. Use bullet points for almost everything.
  5. Be objective.
  6. You MUST use the Google Search tool to verify details.
  `;

  const prompt = `Analyze the following news.
  Headline: "${headline}"
  Snippet: "${snippet}"

  Task:
  1. Verify the facts using Google Search.
  2. Synthesize the story.
  3. TRANSLATE the final output values to ${language}.

  Return valid JSON with this EXACT structure (ensure values are in ${language}):
  {
    "what": ["Bullet 1 in ${language}", "Bullet 2 in ${language}", "Bullet 3 in ${language}"],
    "who": ["List of key people/orgs in ${language}"],
    "why": "Max 10 words summary in ${language}",
    "audience": "Target audience (e.g. 'Student', 'Everyone') - TRANSLATED to ${language}",
    "past_references": ["Context/History in ${language}"],
    "present_consequences": ["Impact now in ${language}"],
    "future_impact": ["Future outlook in ${language}"],
    "wait_or_prepare": {
      "advice": "One word advice in ${language} (e.g. WAIT, ACT, IGNORE)",
      "reasoning": "Short reasoning in ${language}"
    },
    "geolocation": {
      "lat": 0.0,
      "lng": 0.0,
      "label": "City, Country"
    },
    "bias_analysis": {
      "detected_bias": "Bias note in ${language}",
      "missing_perspectives": ["Perspective in ${language}"],
      "is_controversial": false,
      "label": "One word label: 'Controversial' or 'Verified' - TRANSLATED to ${language}"
    },
    "emotional_load": {
      "score": 0,
      "warning": "Trigger warning in ${language} if needed"
    }
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "{}";
    const cleanedJson = cleanJson(text);

    let breakdown: NewsBreakdown;
    try {
        breakdown = JSON.parse(cleanedJson);
    } catch (e) {
        console.warn("Initial JSON parse failed, attempting self-correction...", e);
        // Self-Correction: Ask Gemini to fix the JSON
        const repairResponse = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: `The following JSON is invalid. Fix it and return ONLY the valid JSON.\n\n${text}`,
             config: { responseMimeType: "application/json" }
        });
        const repairedText = cleanJson(repairResponse.text || "{}");
        breakdown = JSON.parse(repairedText);
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      breakdown,
      groundingChunks
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};

export const generateNewsImage = async (headline: string): Promise<string> => {
    // Uses "nano banana" (Gemini 2.5 Flash Image)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Internal helper to try generation with a specific prompt
    const attemptGeneration = async (promptText: string) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: promptText }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    };

    try {
        // 1. Try with the specific headline (Sanitized slightly)
        // Simplified prompt to avoid safety triggers on complex news keywords
        const specificPrompt = `Editorial pencil sketch illustration for news topic: "${headline}". Vintage newspaper style, black and white, minimal, artistic, no text.`;
        const result1 = await attemptGeneration(specificPrompt);
        if (result1) return result1;

        console.warn("Specific image generation blocked or failed. Attempting fallback.");

        // 2. Fallback: Completely generic "Breaking News" concept
        const fallbackPrompt = "A vintage newspaper lying on a wooden table next to a cup of coffee. Artistic pencil sketch, detailed, black and white. No text.";
        const result2 = await attemptGeneration(fallbackPrompt);
        if (result2) return result2;

        throw new Error("No image data returned from nano banana (both attempts failed)");
    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
    }
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");

        // Decode base64 to ArrayBuffer (Raw PCM)
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;

    } catch (error) {
        console.error("TTS failed:", error);
        throw error;
    }
};