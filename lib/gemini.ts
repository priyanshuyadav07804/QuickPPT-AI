import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface Question {
  number: string;
  text: string;
  options: string[];
  exam_full_text?: string;
}

export function hasCorruptedHindi(text: string): boolean {
  if (!text) return false;
  
  // High density of specific corrupted UTF-8 encodings (mojibake common in Hindi OCR)
  const mojibakeMatch = text.match(/à¤|à¥|â€|ðŸ/g);
  if (mojibakeMatch && mojibakeMatch.length > 2) {
    return true;
  }
  
  // Mixed unreadable sequences
  const devanagariChars = text.match(/[\u0900-\u097F]/g);
  if (devanagariChars && devanagariChars.length > 0) {
      // If Devanagari is heavy with weird non-standard symbols instead of punctuation
      const weirdSymbols = text.match(/[âäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥ƒáíóúñÑªº¿]/g);
      if (weirdSymbols && weirdSymbols.length > 3) return true;
  }
  
  return false;
}

export interface ExtractionResult {
  questions: Question[];
  rawResponse: string;
  modelUsed: string;
  retryCount: number;
  fallbackCount: number;
  responseTime: number;
  errorLogs: string[];
  expectedCount?: number;
  extractedCount?: number;
  missingCount?: number;
  questionRange?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function recoverMissingQuestionsFromText(text: string, missingNumbers: number[], context?: { previousExamFullText?: string }): Promise<ExtractionResult> {
  const ai = getAiClient();
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
  const maxRetries = 0;
  const backoffDelays = [2000];

  const contextPrompt = context && context.previousExamFullText
    ? `\nPREVIOUS CONTEXT (From previous pages/chunks):\nFull Text: ${context.previousExamFullText}\nIf the current text does not specify a new exam/date/shift, assume the questions belong to this previous context.`
    : ``;

  let lastError: Error | null = null;
  let fallbackCount = 0;
  const errorLogs: string[] = [];

  for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
    const model = modelsToTry[modelIdx];

    for (let retry = 0; retry <= maxRetries; retry++) {
      const startTime = Date.now();
      try {
        console.log(`[Gemini Recovery] Model: ${model}, Attempt ${retry + 1}`);
        
        const response = await ai.models.generateContent({
            model: model,
            contents: `You are an expert bilingual OCR cleanup and exam-question extraction AI.

Your specific task now is to RECOVER missing or corrupted questions from the provided text.
We previously ran an extraction and missed or corrupted these specific question numbers: ${missingNumbers.join(', ')}.

Scan the original text carefully, locate these specific questions, and extract them properly.
Do not extract any other questions, ONLY the ones requested.

CRITICAL:
If Hindi text appears corrupted, scattered, or uses wrong encodings (e.g., mojibake, random symbols), intelligently reconstruct it into proper, readable Hindi Unicode.
Make sure the Hindi is functionally readable and correctly aligned with the English text.
Do NOT transliterate, use proper Devanagari script.
${contextPrompt}

For every question:
1. Preserve the English version.
2. Preserve the Hindi version.
3. Keep both together inside the same question text.
4. Preserve options exactly.
5. Keep mathematical symbols intact.
6. Extract exam_full_text if available. Ensure it is a clean string (e.g., "SSC CGL 19/04/2022 (Shift-03)") without embedded JSON.

OUTPUT FORMAT (Provide strict JSON array of objects inside \`\`\`json block):
[{
  "number": "Q.X", // Replace X with the actual number
  "text": "Question text in English\nहिंदी में प्रश्न",
  "options": [
    "(a) option 1",
    "(b) option 2",
    "(c) option 3",
    "(d) option 4"
  ],
  "exam_full_text": "..."
}]

Text to process:
${text}`,
            config: {
                temperature: 0.2, // Extremely low temperature for recovery
            }
        });

        const rawText = response.text || "";
        
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        let jsonStr = match ? match[1] : rawText;
        jsonStr = jsonStr.trim();
        
        let questions: Question[] = [];
        if (jsonStr) {
          try {
            questions = JSON.parse(jsonStr);
          } catch (e: any) {
             const cleanedStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
                                       .replace(/,\s*([}\]])/g, "$1")
                                       .replace(/'/g, '"');
             questions = JSON.parse(cleanedStr);
          }
        }
        
        const responseTime = Date.now() - startTime;
        return { 
          questions, 
          rawResponse: jsonStr, 
          modelUsed: model, 
          retryCount: retry, 
          fallbackCount, 
          responseTime, 
          errorLogs
        };
      } catch (e: any) {
        lastError = e;
        const msg = e.message || String(e);
        errorLogs.push(`Model ${model} Attempt ${retry + 1} failed: ${msg}`);
        console.warn(`[Gemini Recovery Error] Model: ${model}, Attempt: ${retry + 1}:`, msg);
        if (msg.includes('429') || msg.includes('500') || msg.includes('503') || msg.includes('overloaded') || msg.includes('timeout') || msg.includes('invalid JSON')) {
            break;
        }
      }
    }
    
    fallbackCount++;
  }

  throw new Error(`[Gemini Recovery] All models failed. Last error: ${lastError?.message}. Logs: ${errorLogs.join(' | ')}`);
}

export async function extractQuestionsFromText(text: string, context?: { previousExamFullText?: string }): Promise<ExtractionResult> {
  const ai = getAiClient();
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
  const maxRetries = 0;
  const backoffDelays = [2000];

  const contextPrompt = context && context.previousExamFullText
    ? `\nPREVIOUS CONTEXT (From previous pages/chunks):\nFull Text: ${context.previousExamFullText}\nIf the current text does not specify a new exam/date/shift, assume the questions belong to this previous context.`
    : ``;

  let lastError: Error | null = null;
  let fallbackCount = 0;
  const errorLogs: string[] = [];

  for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
    const model = modelsToTry[modelIdx];

    for (let retry = 0; retry <= maxRetries; retry++) {
      const startTime = Date.now();
      try {
        console.log(`[Gemini Extraction] Model: ${model}, Attempt ${retry + 1}`);
        
        const response = await ai.models.generateContent({
            model: model,
            contents: `You are an expert bilingual OCR cleanup and exam-question extraction AI.

The text may contain:
- English questions
- Hindi questions
- Mixed bilingual content
- Broken OCR Hindi text
- Mathematical formulas
- Multiple-choice options
- Exam Metadata (e.g. "SSC CGL 19/04/2022 (Shift-03)", "SSC CHSL 2023 Shift-01")

Your task is to CLEAN, RECONSTRUCT, and EXTRACT questions correctly for PPT generation.
Additionally, deeply analyze the text for exam metadata and extract ONE clean string representing the full exam label (e.g., "SSC CGL 19/04/2022 (Shift-03)"). Do not break it into multiple fields.
Be aware of OCR inconsistencies like missing spaces, broken brackets, merged dates, etc.

IMPORTANT:
If Hindi text appears corrupted, scattered, or uses wrong encodings (e.g., mojibake, random symbols), intelligently reconstruct it into proper, readable Hindi Unicode.
Make sure the Hindi is functionally readable and correctly aligned with the English text.
Do NOT transliterate, use proper Devanagari script.
${contextPrompt}

For every question:
1. Preserve the English version.
2. Preserve the Hindi version.
3. Keep both together inside the same question text.
4. Preserve options exactly.
5. Keep mathematical symbols intact.
6. Merge multiline questions properly.
7. Extract only exam_full_text. Look carefully; even a year or partial date is valid. Ensure it is a clean string (e.g., "SSC CGL 19/04/2022 (Shift-03)") without embedded JSON.
8. Return clean readable output suitable for PowerPoint slides.

OUTPUT FORMAT:
Return ONLY valid JSON.

[
  {
    "number": "1",
    "text": "Mohit and Rohit undertook a work for ₹4400. Mohit alone can do that work in 10 days and Rohit alone can do the same work in 15 days. If they work together, then what will be the difference in the amount they receive?\\n\\nमोहित और रोहित ने ₹4400 में एक काम हाथ में लिया। मोहित अकेले उस काम को 10 दिनों में कर सकता है और रोहित अकेले उसी काम को 15 दिनों में कर सकता है। यदि वे एक साथ कार्य करते हैं, तो उन्हें प्राप्त होने वाली राशि में कितना अंतर होगा?",
    "options": [
      "(a) ₹800",
      "(b) ₹1050",
      "(c) ₹900",
      "(d) ₹880"
    ],
    "exam_full_text": "SSC CGL 19/04/2022 (Shift-03)"
  }
]

STRICT RULES:
1. Return ONLY raw JSON.
2. Do NOT use markdown.
3. Do NOT explain anything.
4. Preserve bilingual formatting.
5. Keep English + Hindi together in same question text (do not include options in text).
6. Preserve question numbering exactly.
7. Output exactly 4 options in the options array.
8. Remove OCR garbage/noise lines.
9. Ensure JSON is always valid and parsable.
10. If exam info is missing entirely, leave those fields as null or omit them.

TEXT:
${text}`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.STRING },
                    text: { type: Type.STRING },
                    options: { 
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    exam_full_text: { type: Type.STRING, nullable: true }
                  },
                  required: ["number", "text", "options"],
                },
              },
            },
          });

        const jsonStr = response.text || "[]";
        let questions: Question[] = [];
        
        try {
          questions = JSON.parse(jsonStr);
          if (!Array.isArray(questions)) throw new Error("Parsed JSON is not an array");
        } catch (parseError: any) {
          console.warn("JSON parse error, attempting recovery for truncated output.");
          const lastBracket = jsonStr.lastIndexOf('}');
          if (lastBracket > -1) {
            const recovered = jsonStr.substring(0, lastBracket + 1) + ']';
            try {
              questions = JSON.parse(recovered);
            } catch (e2) {
              throw new Error(`Failed to parse valid JSON from model ${model}`);
            }
          } else {
            throw new Error(`Failed to parse valid JSON from model ${model}`);
          }
        }
        
        let expectedCount = 0;
        let extractedCount = questions.length;
        let missingCount = 0;
        let questionRange = "";

        const qNumbers = questions
          .map(q => {
            const match = String(q.number).match(/\d+/);
            return match ? parseInt(match[0], 10) : NaN;
          })
          .filter(n => !isNaN(n));

        if (qNumbers.length > 0) {
          const minNumber = Math.min(...qNumbers);
          const maxNumber = Math.max(...qNumbers);
          expectedCount = maxNumber - minNumber + 1;
          missingCount = Math.max(0, expectedCount - extractedCount);
          questionRange = `Questions ${minNumber}–${maxNumber}`;
        }

        const responseTime = Date.now() - startTime;
        return { 
          questions, 
          rawResponse: jsonStr, 
          modelUsed: model, 
          retryCount: retry, 
          fallbackCount, 
          responseTime, 
          errorLogs,
          expectedCount,
          extractedCount,
          missingCount,
          questionRange
        };
      } catch (e: any) {
        lastError = e;
        const msg = e.message || String(e);
        const logMsg = `Model ${model} attempt ${retry + 1} failed: ${msg}`;
        errorLogs.push(logMsg);
        console.warn(`[Gemini Extraction Error] ${logMsg}`);
        
        if (retry < maxRetries) {
           const delay = backoffDelays[retry] || 10000;
           console.log(`[Gemini Backoff] Waiting ${delay}ms before next retry...`);
           await sleep(delay);
        }
      }
    }
    
    // Model exhausted its retries, will fallback if not the last model
    if (modelIdx < modelsToTry.length - 1) {
      fallbackCount++;
      console.log(`[Gemini Fallback] Switching to fallback model ${modelsToTry[modelIdx + 1]}...`);
    }
  }

  const isUnavailable = lastError?.message?.includes('503') || lastError?.message?.includes('UNAVAILABLE') || lastError?.message?.includes('high demand');
  if (isUnavailable) {
    throw new Error("The AI service is currently busy due to exceptionally high demand after all fallbacks and retries. Please wait and try again.");
  }
  
  throw lastError || new Error("Failed to extract questions after all retries and fallbacks");
}
