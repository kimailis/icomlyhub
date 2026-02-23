# Cost Optimization Guide for Icomly

## 💰 Current Cost Structure Analysis

### 1. **Gemini API Costs (HIGHEST COST)**

#### Current Usage Pattern:
```
GlobalFeedGenerator: Every 5 minutes = 288 calls/day
ProfileRefresher: Every 5 minutes, 10 celebs = 2,880 calls/day
TrendAnalyzer: Every 6 hours = 4 calls/day
---
TOTAL: ~3,172 API calls/day = ~95,160 calls/month
```

#### Gemini 2.0 Flash Pricing:
- **Input:** $0.075 per 1M tokens
- **Output:** $0.30 per 1M tokens

#### Estimated Token Usage:
- **GlobalFeedGenerator:** ~500 input + 1,000 output tokens per call
- **ProfileRefresher:** ~300 input + 400 output tokens per call
- **Total per day:**
  - Input: (288 × 500) + (2,880 × 300) = 1,008,000 tokens
  - Output: (288 × 1,000) + (2,880 × 400) = 1,440,000 tokens

#### Monthly Cost Estimate:
```
Input:  30.24M tokens × $0.075 / 1M = $2.27
Output: 43.20M tokens × $0.30 / 1M  = $12.96
---
TOTAL: ~$15.23/month (current usage)
```

**With 1000+ celebs (scaled up):**
```
ProfileRefresher: 1000 celebs × 12 calls/day = 12,000 calls/day
Monthly: ~$150-200/month
```

---

### 2. **Database Costs (PostgreSQL)**

#### Current Setup:
- Self-hosted PostgreSQL in Docker
- Storage: ~1-5 GB (estimated)

#### Cloud Options:
- **AWS RDS (db.t4g.micro):** $13/month + storage
- **DigitalOcean Managed DB:** $15/month
- **Supabase Free Tier:** $0 (up to 500MB)
- **Neon Free Tier:** $0 (up to 3GB)

#### Optimization Opportunities:
- Use free tier databases (Supabase/Neon)
- Implement aggressive data cleanup
- Archive old data to cold storage

---

### 3. **Redis Costs**

#### Current Setup:
- Self-hosted Redis in Docker
- Memory: ~100-500 MB

#### Cloud Options:
- **Upstash Free Tier:** 10,000 commands/day FREE
- **Redis Cloud Free:** 30MB FREE
- **AWS ElastiCache:** $13/month (cache.t4g.micro)

#### Optimization:
- Use Upstash free tier (sufficient for current usage)
- Implement cache compression
- Reduce TTL for less critical data

---

### 4. **Hosting Costs**

#### Current Setup:
- Docker containers (backend, frontend, postgres, redis)
- Estimated: 1-2 vCPU, 2-4 GB RAM

#### Cloud Options:
- **Vercel (Frontend):** FREE for hobby projects
- **Railway (Backend):** $5/month starter
- **Render (Backend):** FREE tier available
- **DigitalOcean Droplet:** $6/month (1GB RAM)
- **AWS Lightsail:** $5/month (1GB RAM)

---

### 5. **External API Costs**

#### Wikipedia API:
- **Cost:** FREE ✅
- **Rate Limit:** Reasonable (no strict limits)
- **Usage:** Image fetching for celebrities

#### Potential Future Costs:
- News APIs (if implemented): $50-200/month
- Image CDN: $5-20/month
- Email service: $0-10/month

---

## 🎯 COST OPTIMIZATION STRATEGIES

### Strategy 1: Reduce Gemini API Calls (Save 60-80%)

#### A. Implement Intelligent Caching
```typescript
// backend/src/services/gemini.service.ts

export class GeminiService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async generateContent(prompt: string): Promise<any> {
    // Generate cache key from prompt
    const cacheKey = this.hashPrompt(prompt);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[Gemini] Cache hit, saving API call');
      return cached.data;
    }

    // Make API call
    const result = await ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = result.text;
    if (!text) throw new Error('Gemini returned empty response');
    
    const data = JSON.parse(text);
    
    // Cache result
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  private hashPrompt(prompt: string): string {
    // Simple hash for cache key
    return Buffer.from(prompt).toString('base64').slice(0, 32);
  }
}
```

**Savings:** 40-60% reduction in API calls

---

#### B. Reduce Job Frequency
```typescript
// Current: Every 5 minutes
feedQueue.add('GlobalFeedGenerator', {}, {
  repeat: { pattern: '*/5 * * * *' }
});

// Optimized: Every 15 minutes (3x less calls)
feedQueue.add('GlobalFeedGenerator', {}, {
  repeat: { pattern: '*/15 * * * *' }
});

// ProfileRefresher: Every 30 minutes instead of 5
feedQueue.add('ProfileRefresher', {}, {
  repeat: { pattern: '*/30 * * * *' }
});
```

**Savings:** 66% reduction in API calls
**New cost:** ~$5/month (from $15)

---

#### C. Use Smaller Batches with Longer Intervals
```typescript
// Instead of 10 articles every 5 min (288 calls/day)
// Do 5 articles every 10 min (144 calls/day)

const prompt = `
  Generate 5 trending celebrity gossip headlines...
`;
```

**Savings:** 50% reduction
**Combined with frequency change:** 83% reduction

---

#### D. Implement Request Batching
```typescript
// Batch multiple celebrity updates into single API call
const profileRefresher = async () => {
  const staleCelebs = await prisma.celebrity.findMany({
    where: { /* ... */ },
    take: 10
  });

  // Single API call for all 10 celebs instead of 10 separate calls
  const prompt = `
    Update profiles for these celebrities in a single response:
    ${staleCelebs.map(c => c.name).join(', ')}
    
    Return JSON array with updates for each:
    {
      "updates": [
        {
          "name": "Celebrity Name",
          "bio": "...",
          "sighting": { /* ... */ }
        }
      ]
    }
  `;
  
  const data = await geminiService.generateContent(prompt);
  // Process all updates from single response
};
```

**Savings:** 90% reduction in ProfileRefresher calls
**New cost:** ~$2-3/month

---

### Strategy 2: Use Pre-Generated Content (Save 90%+)

#### A. Celebrity Bio Database
```typescript
// backend/data/celebrity-bios.json
{
  "taylor-swift": {
    "bio": "American singer-songwriter and global pop icon...",
    "lastUpdated": "2024-01-01"
  }
  // ... 1000+ celebs
}

// Only use AI for NEW celebrities or outdated bios (>6 months)
const getCelebrityBio = async (celebId: string) => {
  const cached = bioDatabase[celebId];
  if (cached && isRecent(cached.lastUpdated)) {
    return cached.bio;
  }
  // Only call AI if needed
  return await geminiService.generateBio(celebId);
};
```

**Savings:** 95% reduction in bio generation calls

---

#### B. Template-Based Sighting Generation
```typescript
// Use templates instead of AI for routine sightings
const generateSighting = (celeb: Celebrity) => {
  const templates = [
    `Spotted at ${celeb.primaryCity} enjoying ${randomActivity()}`,
    `Seen shopping in ${celeb.primaryCity}`,
    `Photographed leaving ${randomVenue()} in ${celeb.primaryCity}`
  ];
  
  return {
    location: celeb.primaryCity,
    lat: celeb.primaryLat,
    lng: celeb.primaryLng,
    confidence: 0.6,
    snippet: templates[Math.floor(Math.random() * templates.length)]
  };
};
```

**Savings:** 100% reduction in sighting generation calls
**New cost:** $0 for sightings

---

### Strategy 3: Optimize Database Costs (Save $10-15/month)

#### A. Use Free Tier Services
```typescript
// Use Supabase or Neon free tier
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/icomly

// Benefits:
// - $0 cost
// - Managed backups
// - Auto-scaling
// - Built-in connection pooling
```

**Savings:** $13-15/month

---

#### B. Aggressive Data Cleanup
```typescript
// Reduce retention periods
const cleanupCrew = async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Was 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Was 30 days
  
  await Promise.all([
    prisma.article.deleteMany({ where: { publishedAt: { lt: threeDaysAgo } } }),
    prisma.sighting.deleteMany({ where: { date: { lt: threeDaysAgo } } }),
    prisma.noiseHistory.deleteMany({ where: { date: { lt: sevenDaysAgo } } })
  ]);
};
```

**Savings:** 50% reduction in storage needs

---

#### C. Implement Data Compression
```typescript
// Compress large text fields
import zlib from 'zlib';

const compressSummary = (text: string): Buffer => {
  return zlib.gzipSync(text);
};

const decompressSummary = (buffer: Buffer): string => {
  return zlib.gunzipSync(buffer).toString();
};

// Store compressed in DB
await prisma.article.create({
  data: {
    summary: compressSummary(longSummary),
    // ...
  }
});
```

**Savings:** 60-70% reduction in text storage

---

### Strategy 4: Optimize Redis Costs (Save $10-13/month)

#### A. Use Upstash Free Tier
```typescript
// .env
REDIS_URL=https://your-db.upstash.io
REDIS_TOKEN=your-token

// Benefits:
// - 10,000 commands/day FREE
// - Serverless (pay per request after free tier)
// - Global edge caching
```

**Savings:** $13/month (if using AWS ElastiCache)

---

#### B. Implement Cache Compression
```typescript
// backend/src/config/redis.ts
import zlib from 'zlib';

export const setCompressed = async (key: string, value: any, ttl?: number) => {
  const json = JSON.stringify(value);
  const compressed = zlib.gzipSync(json);
  await redisClient.set(key, compressed.toString('base64'), { EX: ttl });
};

export const getCompressed = async (key: string) => {
  const compressed = await redisClient.get(key);
  if (!compressed) return null;
  const buffer = Buffer.from(compressed, 'base64');
  const json = zlib.gunzipSync(buffer).toString();
  return JSON.parse(json);
};
```

**Savings:** 70% reduction in memory usage

---

#### C. Reduce Cache TTL
```typescript
// Reduce cache duration for less critical data
await redisClient.set('feed:global', data, { EX: 300 }); // 5 min instead of 15
await redisClient.set('celebs:top', data, { EX: 600 }); // 10 min instead of 30
```

**Savings:** 50% reduction in memory usage

---

### Strategy 5: Optimize Hosting Costs (Save $10-20/month)

#### A. Use Free Tiers
```yaml
# Frontend: Vercel (FREE)
# Backend: Render Free Tier or Railway Starter ($5)
# Database: Supabase/Neon (FREE)
# Redis: Upstash (FREE)
# Total: $0-5/month
```

**Savings:** $15-25/month

---

#### B. Optimize Docker Images
```dockerfile
# Use multi-stage builds
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**Savings:** 60% smaller images = faster deploys = lower bandwidth costs

---

#### C. Implement CDN for Static Assets
```typescript
// Use Cloudflare CDN (FREE)
// - Cache celebrity images
// - Cache frontend assets
// - Reduce bandwidth costs
```

**Savings:** $5-10/month in bandwidth

---

## 📊 COST COMPARISON

### Current Architecture (Unoptimized)
```
Gemini API:        $15-200/month (depending on scale)
PostgreSQL:        $13/month (AWS RDS)
Redis:             $13/month (ElastiCache)
Hosting:           $20/month (DigitalOcean)
---
TOTAL:             $61-246/month
```

### Optimized Architecture (Recommended)
```
Gemini API:        $2-5/month (90% reduction)
PostgreSQL:        $0 (Supabase free tier)
Redis:             $0 (Upstash free tier)
Hosting:           $5/month (Railway/Render)
---
TOTAL:             $7-10/month
```

**SAVINGS: $51-236/month (83-96% reduction)**

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Reduce job frequency (15 min instead of 5 min)
2. ✅ Implement Gemini response caching
3. ✅ Reduce batch sizes (5 articles instead of 10)
4. ✅ Aggressive data cleanup (3 days instead of 7)

**Expected Savings:** $8-12/month

---

### Phase 2: Infrastructure (2-4 hours)
1. ✅ Migrate to Supabase/Neon (free tier)
2. ✅ Migrate to Upstash Redis (free tier)
3. ✅ Deploy frontend to Vercel (free)
4. ✅ Deploy backend to Railway ($5/month)

**Expected Savings:** $20-30/month

---

### Phase 3: Advanced Optimizations (4-8 hours)
1. ✅ Implement celebrity bio database
2. ✅ Template-based sighting generation
3. ✅ Request batching for AI calls
4. ✅ Cache compression
5. ✅ CDN integration

**Expected Savings:** $30-50/month

---

## 📝 COST MONITORING

### Implement Cost Tracking
```typescript
// backend/src/services/cost-tracker.service.ts

export class CostTracker {
  private costs = {
    geminiCalls: 0,
    geminiTokens: { input: 0, output: 0 },
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  trackGeminiCall(inputTokens: number, outputTokens: number) {
    this.costs.geminiCalls++;
    this.costs.geminiTokens.input += inputTokens;
    this.costs.geminiTokens.output += outputTokens;
  }

  async getDailyCost() {
    const inputCost = (this.costs.geminiTokens.input / 1_000_000) * 0.075;
    const outputCost = (this.costs.geminiTokens.output / 1_000_000) * 0.30;
    return {
      gemini: inputCost + outputCost,
      calls: this.costs.geminiCalls,
      cacheHitRate: this.costs.cacheHits / (this.costs.cacheHits + this.costs.cacheMisses)
    };
  }
}
```

---

## 🎯 RECOMMENDED CONFIGURATION

### Optimized Worker Schedule
```typescript
// backend/src/workers/feed.worker.ts

// Feed Generation: Every 15 minutes (was 5)
feedQueue.add('GlobalFeedGenerator', {}, {
  repeat: { pattern: '*/15 * * * *' }
});

// Profile Refresh: Every 30 minutes (was 5)
feedQueue.add('ProfileRefresher', {}, {
  repeat: { pattern: '*/30 * * * *' }
});

// Trend Analysis: Every 12 hours (was 6)
feedQueue.add('TrendAnalyzer', {}, {
  repeat: { pattern: '0 */12 * * *' }
});

// Cleanup: Daily at 3 AM
feedQueue.add('CleanupCrew', {}, {
  repeat: { pattern: '0 3 * * *' }
});
```

### Optimized Batch Sizes
```typescript
// Generate 5 articles instead of 10
const prompt = `Generate 5 trending celebrity gossip headlines...`;

// Update 5 profiles instead of 10
const staleCelebs = await prisma.celebrity.findMany({
  take: 5, // Reduced from 10
  // ...
});
```

### Optimized Cache TTLs
```typescript
// Feed: 10 minutes (was 15)
await redisClient.set('feed:global', data, { EX: 600 });

// Top Celebs: 20 minutes (was 30)
await redisClient.set('celebs:top', data, { EX: 1200 });

// Profiles: 30 minutes (was 60)
await redisClient.set(`profile:${id}`, data, { EX: 1800 });
```

---

## 💡 ADDITIONAL COST-SAVING TIPS

1. **Use Gemini Flash instead of Pro**
   - Already using Flash ✅
   - 10x cheaper than Pro

2. **Implement Rate Limiting**
   - Prevent abuse
   - Control API usage

3. **Use Webhooks Instead of Polling**
   - For real-time updates
   - Reduce unnecessary checks

4. **Implement Lazy Loading**
   - Load data only when needed
   - Reduce initial payload

5. **Use HTTP/2 and Compression**
   - Reduce bandwidth costs
   - Faster response times

6. **Monitor and Alert**
   - Set up cost alerts
   - Track usage patterns
   - Identify anomalies

---

## 📈 SCALING CONSIDERATIONS

### At 1,000 Users:
- Current optimized cost: $7-10/month
- No changes needed

### At 10,000 Users:
- Estimated cost: $20-30/month
- May need paid database tier
- Consider CDN for images

### At 100,000 Users:
- Estimated cost: $100-200/month
- Dedicated database required
- CDN essential
- Consider caching layer (Cloudflare)

---

## ✅ SUMMARY

**Current Monthly Cost:** $61-246
**Optimized Monthly Cost:** $7-10
**Total Savings:** $51-236/month (83-96%)

**Key Optimizations:**
1. Reduce Gemini API calls by 90%
2. Use free tier services (Supabase, Upstash)
3. Implement intelligent caching
4. Reduce job frequencies
5. Use template-based generation

**ROI:** Optimizations pay for themselves immediately with 10x cost reduction!
