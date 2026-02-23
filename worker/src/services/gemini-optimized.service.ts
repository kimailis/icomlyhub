import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import redisClient, { connectRedis } from '../config/redis';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export class GeminiOptimizedService {
  private modelName: string;
  private CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  
  // Cost tracking
  private stats = {
    totalCalls: 0,
    cachedCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0
  };

  constructor(modelName: string = 'gemini-2.0-flash') {
    this.modelName = modelName;
  }

  private async ensureRedisConnected() {
    if (!redisClient.isOpen) {
      await connectRedis();
    }
  }

  async generateContent(prompt: string, options?: { skipCache?: boolean; useSearch?: boolean }, retryCount = 0): Promise<any> {
    await this.ensureRedisConnected();
    
    // Generate cache key (include useSearch in hash)
    const cacheKey = `gemini:cache:${this.hashPrompt(prompt + (options?.useSearch ? '_search' : ''))}`;
    
    // Check cache first (unless explicitly skipped)
    if (!options?.skipCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          this.stats.cachedCalls++;
          console.log('[Gemini] ✅ Cache hit - Saved API call');
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('[Gemini] Redis cache read error:', err);
      }
    }

    // Make API call
    this.stats.totalCalls++;
    console.log(`[Gemini] 🔄 Making API call... (Search: ${options?.useSearch ? 'ON' : 'OFF'})`);
    
    try {
      const config: any = {
        responseMimeType: "application/json"
      };

      // Search tool is not compatible with controlled generation (JSON mode)
      if (options?.useSearch) {
        config.tools = [{ googleSearch: {} }];
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
      
      let data;
      try {
          // Attempt standard parse first
          data = JSON.parse(this.cleanJson(text));
      } catch (e) {
          console.warn('[Gemini] ⚠️ Initial JSON parse failed, attempting deep clean...');
          try {
              data = JSON.parse(this.deepCleanJson(text));
          } catch (deepError) {
              if (retryCount < 2) {
                  console.warn(`[Gemini] 🔄 Malformed JSON, retrying (${retryCount + 1}/2)...`);
                  return this.generateContent(prompt, { ...options, skipCache: true }, retryCount + 1);
              }
              throw deepError;
          }
      }
      
      // Estimate token counts (rough approximation)
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);
      
      this.stats.totalInputTokens += inputTokens;
      this.stats.totalOutputTokens += outputTokens;
      
      // Cache the result in Redis
      try {
        await redisClient.set(cacheKey, JSON.stringify(data), { EX: this.CACHE_TTL });
      } catch (err) {
        console.error('[Gemini] Redis cache write error:', err);
      }
      
      // Log cost estimate
      const cost = this.estimateCost(inputTokens, outputTokens);
      console.log(`[Gemini] 💰 Estimated cost: $${cost.toFixed(4)}`);
      
      return data;
    } catch (error) {
      console.error('[Gemini] ❌ Error generating content:', error);
      throw error;
    }
  }

  /**
   * Basic JSON cleaning
   */
  private cleanJson(text: string): string {
      return text.replace(/```json\n?|\n?```/g, '').trim();
  }

  /**
   * Aggressive JSON cleaning for malformed responses
   */
  private deepCleanJson(text: string): string {
      let cleaned = this.cleanJson(text);
      
      // Extract what looks like a JSON object or array
      const firstOpenBrace = cleaned.indexOf('{');
      const firstOpenBracket = cleaned.indexOf('[');
      let start = -1;

      if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
          start = Math.min(firstOpenBrace, firstOpenBracket);
      } else if (firstOpenBrace !== -1) {
          start = firstOpenBrace;
      } else {
          start = firstOpenBracket;
      }

      const lastCloseBrace = cleaned.lastIndexOf('}');
      const lastCloseBracket = cleaned.lastIndexOf(']');
      let end = -1;

      if (lastCloseBrace !== -1 && lastCloseBracket !== -1) {
          end = Math.max(lastCloseBrace, lastCloseBracket);
      } else if (lastCloseBrace !== -1) {
          end = lastCloseBrace;
      } else {
          end = lastCloseBracket;
      }

      if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.substring(start, end + 1);
      }

      // Fix common JSON errors from LLMs
      cleaned = cleaned
          .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
          .replace(/(\w+):/g, '"$1":') // Ensure keys are quoted (if not already)
          .replace(/":\s*'([^']*)'/g, '": "$1"') // Convert single quoted values to double
          .replace(/\\'/g, "'"); // Unescape single quotes
          
      return cleaned;
  }

  /**
   * Batch generate content for multiple prompts
   * More efficient than individual calls
   */
  async generateBatch(prompts: string[]): Promise<any[]> {
    if (prompts.length === 0) return [];
    if (prompts.length === 1) return [await this.generateContent(prompts[0])];

    // Combine prompts into single request
    const batchPrompt = `
      Process these ${prompts.length} requests and return an array of responses in the EXACT same order.
      
      ${prompts.map((p, i) => `REQUEST ${i + 1}:\n${p}`).join('\n\n')}
      
      IMPORTANT: Return a JSON object with a "responses" array. Each element in the array must be the JSON response for the corresponding request.
      Format: { "responses": [ {request1_data}, {request2_data}, ... ] }
    `;
    
    console.log(`[Gemini] 📦 Generating batch of ${prompts.length} requests...`);
    const result = await this.generateContent(batchPrompt);
    return result.responses || [];
  }

  /**
   * Get cost statistics (Note: These are now per-instance and reset on restart)
   * Real stats should be stored in Redis if needed globally
   */
  getStats() {
    const inputCost = (this.stats.totalInputTokens / 1_000_000) * 0.075;
    const outputCost = (this.stats.totalOutputTokens / 1_000_000) * 0.30;
    const totalCost = inputCost + outputCost;
    const cacheHitRate = (this.stats.totalCalls + this.stats.cachedCalls) > 0 
      ? (this.stats.cachedCalls / (this.stats.totalCalls + this.stats.cachedCalls)) * 100
      : 0;
    
    return {
      totalCalls: this.stats.totalCalls,
      cachedCalls: this.stats.cachedCalls,
      cacheHitRate: cacheHitRate.toFixed(2) + '%',
      totalInputTokens: this.stats.totalInputTokens,
      totalOutputTokens: this.stats.totalOutputTokens,
      estimatedCost: {
        input: inputCost.toFixed(4),
        output: outputCost.toFixed(4),
        total: totalCost.toFixed(4)
      }
    };
  }

  /**
   * Clear cache (useful for testing or forcing fresh data)
   */
  async clearCache() {
    await this.ensureRedisConnected();
    const keys = await redisClient.keys('gemini:cache:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    console.log(`[Gemini] 🗑️  Cleared ${keys.length} cache entries from Redis`);
  }

  private hashPrompt(prompt: string): string {
    return crypto.createHash('md5').update(prompt).digest('hex');
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
  }
}

// Export singleton instance
export const geminiOptimizedService = new GeminiOptimizedService();

