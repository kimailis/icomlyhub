import { Queue, Worker, Job } from 'bullmq';
import prisma from '../config/prisma';
import { geminiOptimizedService } from '../services/gemini-optimized.service';
import { personalityService } from '../services/personality.service';

import { NotificationService } from '../services/notification.service';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const socialQueue = new Queue('social-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  }
});

async function seedUsers() {
  console.log('[SocialWorker] Checking seed users from personality data...');
  const personalities = personalityService.getAllPersonalities();
  
  for (const personality of personalities) {
    const { username } = personality;
    const email = `${username.toLowerCase()}@icomly.com`;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    // Determine default profile path (ui-avatars)
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=18181b&color=fff&size=200`;
    
    // Only update profilePath if it's currently empty, points to legacy /profiles/, or is missing
    let finalProfilePath = existingUser?.profilePath;
    if (!finalProfilePath || finalProfilePath.startsWith('/profiles/')) {
      finalProfilePath = defaultAvatar;
    }
    
    await prisma.user.upsert({
      where: { email },
      update: {
        bio: `The official Icomly account for ${username}. Interested in ${personality.interests.slice(0, 3).join(', ')}.`,
        profilePath: finalProfilePath
      },
      create: {
        email,
        name: username,
        password: '$2b$10$6KVlm8VfUJ.eSPrKBc3qWepNKbPdYc.TRFw0wLgdKnC8ckZGN5zY.', // Standard dev hash
        role: 'free',
        bio: `The official Icomly account for ${username}. Interested in ${personality.interests.slice(0, 3).join(', ')}.`,
        profilePath: finalProfilePath
      }
    });
  }
  console.log(`[SocialWorker] ${personalities.length} seed users synced.`);
}

async function generateSocialActivity() {
  try {
    const seedUsers = await prisma.user.findMany({
      where: { email: { endsWith: '@icomly.com' } }
    });

    if (seedUsers.length === 0) return;

    // Filter users who should post right now
    const postingUsers = seedUsers.filter(user => personalityService.shouldUserPost(user.name || 'Unknown'));
    
    if (postingUsers.length === 0) {
        console.log('[SocialWorker] No users scheduled to post this hour.');
        return;
    }

    // Pick one user to post (to avoid flooding)
    const user = postingUsers[Math.floor(Math.random() * postingUsers.length)];

    // Decide target: Celeb or User
    const celebs = await prisma.celebrity.findMany({ take: 20 });
    const otherUsers = await prisma.user.findMany({ 
      where: { id: { not: user.id } },
      take: 20
    });

    const isCelebTarget = Math.random() > 0.3;
    let data: any = { userId: user.id, verified: true };

    let prompt = '';
    if (isCelebTarget && celebs.length > 0) {
      const targetCeleb = celebs[Math.floor(Math.random() * celebs.length)];
      data.targetCelebId = targetCeleb.id;
      prompt = personalityService.generatePostPrompt(user.name || 'Unknown', targetCeleb.name, true);
    } else if (otherUsers.length > 0) {
      const targetUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
      data.targetUserId = targetUser.id;
      prompt = personalityService.generatePostPrompt(user.name || 'Unknown', targetUser.name || 'Unknown', false);
    }

    if (prompt) {
      const content = await geminiOptimizedService.generateText(prompt);
      if (content) {
        const post = await prisma.post.create({ data: { ...data, content } });
        console.log(`[SocialWorker] Generated post by ${user.name} for ${isCelebTarget ? 'celeb' : 'user'}`);
        
        // Notify target user if applicable
        if (data.targetUserId) {
           await NotificationService.createNotification({
             userId: data.targetUserId,
             type: 'COMMENT', // Using COMMENT type for wall posts for now
             message: `${user.name} left a message on your wall: "${content.substring(0, 30)}..."`,
             link: `/user/${data.targetUserId}`,
             senderId: user.id,
             postId: post.id
           });
        }
      }
    }
  } catch (error) {
    console.error('[SocialWorker] Activity generation failed:', error);
  }
}

async function generateInteractions() {
  try {
    const seedUsers = await prisma.user.findMany({
      where: { email: { endsWith: '@icomly.com' } }
    });

    const recentArticles = await prisma.article.findMany({
      take: 10,
      orderBy: { publishedAt: 'desc' }
    });

    const recentPosts = await prisma.post.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    let commentCount = 0;
    for (const user of seedUsers) {
      // 50% chance to consider commenting on article, 50% on post
      if (Math.random() > 0.5 && recentArticles.length > 0) {
        const article = recentArticles[Math.floor(Math.random() * recentArticles.length)];
        
        if (personalityService.shouldUserComment(user.name || 'Unknown', article.headline)) {
            const prompt = personalityService.generateCommentPrompt(user.name || 'Unknown', article.headline, 'article');
            const content = await geminiOptimizedService.generateText(prompt);
            
            if (content) {
              await prisma.comment.create({
                data: {
                  content,
                  userId: user.id,
                  articleId: article.id
                }
              });
              commentCount++;
            }
        }
      } else if (recentPosts.length > 0) {
        const post = recentPosts[Math.floor(Math.random() * recentPosts.length)];
        if (post.userId === user.id) continue;

        if (personalityService.shouldUserComment(user.name || 'Unknown', post.content)) {
            const prompt = personalityService.generateCommentPrompt(user.name || 'Unknown', post.content, 'post');
            const content = await geminiOptimizedService.generateText(prompt);
            
            if (content) {
              await prisma.comment.create({
                data: {
                  content,
                  userId: user.id,
                  postId: post.id
                }
              });
              commentCount++;

              // Notify post owner
              await NotificationService.notifyComment(user.id, { postId: post.id, content });
            }
        }
      }
      
      // Limit comments per cycle to avoid API spam
      if (commentCount >= 5) break;
    }
    console.log(`[SocialWorker] Generated ${commentCount} interactions.`);
  } catch (error) {
    console.error('[SocialWorker] Interaction generation failed:', error);
  }
}

async function generateLikes() {
  try {
    const seedUsers = await prisma.user.findMany({
      where: { email: { endsWith: '@icomly.com' } }
    });

    if (seedUsers.length === 0) return;

    // Pick a few random items to like
    const posts = await prisma.post.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
    const comments = await prisma.comment.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
    const articles = await prisma.article.findMany({ take: 20, orderBy: { publishedAt: 'desc' } });

    let likeCount = 0;
    for (const user of seedUsers) {
        const personality = personalityService.getPersonality(user.name || 'Unknown');
        const likeProb = personality?.socialBehavior.likeProbability || 0.5;
        
        if (Math.random() > likeProb) continue;

        const coin = Math.random();
        
        if (coin > 0.6 && posts.length > 0) {
            const post = posts[Math.floor(Math.random() * posts.length)];
            const isUpvote = Math.random() > 0.1;
            await prisma.like.upsert({
                where: { userId_postId: { userId: user.id, postId: post.id } },
                update: { isUpvote },
                create: { userId: user.id, postId: post.id, isUpvote }
            });
            likeCount++;
            if (isUpvote) await NotificationService.notifyLike(user.id, { postId: post.id });
        } else if (coin > 0.3 && comments.length > 0) {
            const comment = comments[Math.floor(Math.random() * comments.length)];
            const isUpvote = Math.random() > 0.1;
            await prisma.like.upsert({
                where: { userId_commentId: { userId: user.id, commentId: comment.id } },
                update: { isUpvote },
                create: { userId: user.id, commentId: comment.id, isUpvote }
            });
            likeCount++;
            if (isUpvote) await NotificationService.notifyLike(user.id, { commentId: comment.id });
        } else if (articles.length > 0) {
            const article = articles[Math.floor(Math.random() * articles.length)];
            await prisma.like.upsert({
                where: { userId_articleId: { userId: user.id, articleId: article.id } },
                update: { isUpvote: Math.random() > 0.1 },
                create: { userId: user.id, articleId: article.id, isUpvote: Math.random() > 0.1 }
            });
            likeCount++;
        }

        if (likeCount >= 10) break;
    }
    console.log(`[SocialWorker] Generated ${likeCount} likes.`);
  } catch (error) {
    console.error('[SocialWorker] Like generation failed:', error);
  }
}

const socialWorker = new Worker('social-generation', async (job: Job) => {
  if (job.name === 'seed-users') {
    await seedUsers();
  } else if (job.name === 'generate-activity') {
    await generateSocialActivity();
  } else if (job.name === 'generate-interactions') {
    await generateInteractions();
  } else if (job.name === 'generate-likes') {
    await generateLikes();
  }
}, { connection });

// Schedule recurring jobs
(async () => {
  await socialQueue.add('seed-users', {}, { repeat: { pattern: '0 0 * * *' } }); // Daily sync
  await socialQueue.add('generate-activity', {}, { repeat: { every: 3600000 } }); // Hourly
  await socialQueue.add('generate-interactions', {}, { repeat: { every: 1800000 } }); // Every 30 mins
  await socialQueue.add('generate-likes', {}, { repeat: { every: 900000 } }); // Every 15 mins
  
  // Run seed users immediately on startup
  await socialQueue.add('seed-users', {});
})();

export default socialWorker;
