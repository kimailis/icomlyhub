import { Queue, Worker, Job } from 'bullmq';
import prisma from '../config/prisma';
import { openaiOptimizedService } from '../services/openai-optimized.service';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const verificationQueue = new Queue('verification-pipeline', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  }
});

interface VerificationResult {
  isVerifiable: boolean;
  truthScore: number; // 0-100
  impactScore: number; // 0-100
  category: 'Career' | 'Romance' | 'Scandal' | 'Social';
  headline: string;
  summary: string;
  suggestedCelebId: string | null;
}

async function verifyPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { user: true, targetCeleb: true }
  });

  if (!post || !post.isFeedCandidate) return;

  console.log(`[Verification] Analyzing post ${postId} by ${post.user.name}...`);

  const prompt = `
    Analyze the following user-submitted celebrity gossip/news post:
    "${post.content}"
    
    Target Celebrity: ${post.targetCeleb?.name || 'Unknown'}
    
    Tasks:
    1. Determine if this sounds like a real verifiable event or just personal opinion.
    2. Assign a truthScore (confidence) from 0-100.
    3. Assign an impactScore (how "big" is this news) from 0-100.
    4. Categorize it: Career, Romance, Scandal, or Social.
    5. Write a professional "news-style" headline for this.
    6. Write a detailed 3-4 sentence summary of this scoop.
    
    Return ONLY a valid JSON object.
    
    {
      "isVerifiable": boolean,
      "truthScore": number,
      "impactScore": number,
      "category": string,
      "headline": string,
      "summary": string,
      "suggestedCelebId": string | null
    }
  `;

  try {
    const responseText = await openaiOptimizedService.generateText(prompt);
    // Basic JSON extraction from response text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in OpenAI response');
    
    const result: VerificationResult = JSON.parse(jsonMatch[0]);

    if (result.isVerifiable && result.truthScore > 70) {
      console.log(`[Verification] ✅ Post ${postId} PASSED. Promoting to Global Feed.`);
      
      const celebId = post.targetCelebId || result.suggestedCelebId;
      
      if (celebId) {
        // Create an official Article based on user post
        await prisma.article.create({
          data: {
            headline: result.headline,
            summary: result.summary,
            source: `Icomly // ${post.user.name}`,
            sourceUrl: `/user/${post.userId}`, // Link back to original reporter
            publishedAt: new Date(),
            impactScore: result.impactScore,
            category: result.category,
            celebrityId: celebId
          }
        });

        // Mark post as verified
        await prisma.post.update({
          where: { id: postId },
          data: { verified: true, isFeedCandidate: false }
        });
      }
    } else {
      console.log(`[Verification] ❌ Post ${postId} REJECTED for Global Feed (Truth: ${result.truthScore}).`);
      await prisma.post.update({
        where: { id: postId },
        data: { isFeedCandidate: false }
      });
    }
  } catch (error) {
    console.error(`[Verification] Failed for post ${postId}:`, error);
  }
}

const verificationWorker = new Worker('verification-pipeline', async (job: Job) => {
  if (job.name === 'verify-post') {
    await verifyPost(job.data.postId);
  }
}, { connection });

export default verificationWorker;
