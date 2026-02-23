import { GoogleGenAI } from '@google/genai';

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

  async generateContent(prompt: string, options?: { useSearch?: boolean }): Promise<any> {
    try {
      const ai = this.getClient();
      
      const config: any = {
        responseMimeType: "application/json"
      };

      if (options?.useSearch) {
        config.tools = [{ googleSearch: {} }];
        // Search tool is not compatible with controlled generation (JSON mode)
        delete config.responseMimeType;
      }

      const result = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: config
      });

      const text = result.text;
      if (!text) {
        throw new Error('Gemini returned empty response');
      }

      // If we used search, we might need to clean up markdown code blocks and conversational text
      if (options?.useSearch) {
        // Find the first '{' or '['
        const firstOpenBrace = text.indexOf('{');
        const firstOpenBracket = text.indexOf('[');
        let start = -1;

        if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
            start = Math.min(firstOpenBrace, firstOpenBracket);
        } else if (firstOpenBrace !== -1) {
            start = firstOpenBrace;
        } else {
            start = firstOpenBracket;
        }

        // Find the last '}' or ']'
        const lastCloseBrace = text.lastIndexOf('}');
        const lastCloseBracket = text.lastIndexOf(']');
        let end = -1;

        if (lastCloseBrace !== -1 && lastCloseBracket !== -1) {
            end = Math.max(lastCloseBrace, lastCloseBracket);
        } else if (lastCloseBrace !== -1) {
            end = lastCloseBrace;
        } else {
            end = lastCloseBracket;
        }

        if (start !== -1 && end !== -1 && end > start) {
            const jsonStr = text.substring(start, end + 1);
            return JSON.parse(jsonStr);
        }
        
        // Fallback to simple cleanup if no braces found (unlikely for valid JSON)
        const cleanText = text.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
      }

      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
