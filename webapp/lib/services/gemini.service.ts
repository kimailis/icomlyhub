import { GoogleGenAI } from '@google/genai/node';

export class GeminiService {
  private modelName: string;
  private client: GoogleGenAI | null = null;

  constructor(modelName: string = 'gemini-2.0-flash') {
    this.modelName = modelName;
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async generateContent(prompt: string): Promise<any> {
    try {
      const ai = this.getClient();
      const result = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = result.text;
      if (!text) {
        throw new Error('Gemini returned empty response');
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
