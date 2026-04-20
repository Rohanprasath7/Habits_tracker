import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export interface ExtractedEvent {
  title: string;
  type: 'task' | 'meeting' | 'schedule';
  category: 'work' | 'personal' | 'meeting' | 'appointment' | 'health' | 'leisure';
  priority: 'high' | 'medium' | 'low';
  description?: string;
  startTime?: string; // ISO string
  endTime?: string;
  isRecurring?: boolean;
}

export async function parseDayPlan(paragraph: string): Promise<ExtractedEvent[]> {
  const model = "gemini-3-flash-preview";
  const genAI = getGenAI();
  
  const prompt = `Analyze the following paragraph describing a person's day and extract all tasks, meetings, and schedules. 
  For each item found, identify:
  - title: A short descriptive name
  - type: One of 'task', 'meeting', or 'schedule'
  - category: One of 'work', 'personal', 'meeting', 'appointment', 'health', 'leisure'. If not explicitly mentioned, infer based on context.
  - priority: One of 'high', 'medium', 'low'. Assign 'high' for urgent deadlines, important meetings, or critical events.
  - description: Any additional context
  - startTime: Estimated start time in ISO-like format for today (if mentioned)
  - endTime: Estimated end time in ISO-like format for today (if mentioned)
  
  Text: "${paragraph}"`;

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['task', 'meeting', 'schedule'] },
            category: { type: Type.STRING, enum: ['work', 'personal', 'meeting', 'appointment', 'health', 'leisure'] },
            priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
            description: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
          },
          required: ['title', 'type', 'category', 'priority'],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return [];
  }
}
