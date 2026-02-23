import axios from 'axios';
import crypto from 'crypto';
import redisClient, { connectRedis } from '../config/redis';

export class OpenAIOptimizedService {
  private apiKey: string;
  private CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  private async ensureRedisConnected() {
    if (!redisClient.isOpen) {
      await connectRedis();
    }
  }

  async generateText(prompt: string, options?: { skipCache?: boolean }): Promise<string> {
    if (!this.apiKey) {
      console.error('[OpenAI] API Key missing');
      return '';
    }

    await this.ensureRedisConnected();
    
    const cacheKey = `openai:cache:${this.hashPrompt(prompt)}`;
    
    if (!options?.skipCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log('[OpenAI] ✅ Cache hit');
          return cached;
        }
      } catch (err) {
        console.error('[OpenAI] Redis cache read error:', err);
      }
    }

    console.log('[OpenAI] 🔄 Making API call...');
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const text = response.data.choices[0]?.message?.content?.trim() || '';
      
      if (text) {
        try {
          await redisClient.set(cacheKey, text, { EX: this.CACHE_TTL });
        } catch (err) {
          console.error('[OpenAI] Redis cache write error:', err);
        }
      }
      
      return text;
    } catch (error: any) {
      console.error('[OpenAI] ❌ Error generating content:', error.response?.data || error.message);
      return '';
    }
  }

  private hashPrompt(prompt: string): string {
    return crypto.createHash('md5').update(prompt).digest('hex');
  }
}

export const openaiOptimizedService = new OpenAIOptimizedService();
