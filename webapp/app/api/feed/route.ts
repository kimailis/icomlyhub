import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check Plan
    let plan = 'free';
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded) {
                // Try to get role from token first
                if (decoded.role) {
                  plan = decoded.role;
                } else if (decoded.userId) {
                  // Fallback to DB if not in token
                  const user = await prisma.user.findUnique({
                      where: { id: decoded.userId },
                      select: { role: true }
                  });
                  if (user) plan = user.role;
                }
            }
        } catch (e) {
            console.warn('[API/Feed] Token verification failed:', (e as Error).message);
        }
    }

    const isPro = plan === 'pro' || plan === 'insider';
    const cacheKey = isPro ? 'feed:global:pro' : 'feed:global:free';

    if (!forceRefresh) {
      const cachedFeed = await redisClient.get(cacheKey);
      if (cachedFeed) {
        return NextResponse.json(JSON.parse(cachedFeed));
      }
    }

    const newsDelayMs = 3 * 60 * 60 * 1000;
    const timeLimit = new Date(Date.now() - (isPro ? 0 : newsDelayMs));
    const timeWindow = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours for better coverage

    // Fetch Articles
    const articles = await prisma.article.findMany({
      where: { 
        publishedAt: { 
            gte: timeWindow,
            lte: timeLimit
        } 
      },
      take: 60,
      orderBy: { publishedAt: 'desc' },
      include: {
        celebrity: {
          select: { id: true, name: true, imageUrl: true, noiseRating: true, trendDirection: true, category: true }
        },
        _count: {
            select: { likes: true, comments: true }
        }
      }
    });

    // Fetch Verified User Posts (Scoops)
    const scoops = await prisma.post.findMany({
      where: {
        verified: true,
        isFeedCandidate: true,
        createdAt: { 
          gte: timeWindow,
          lte: timeLimit // Also apply time limit to scoops for consistency if not pro
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profilePath: true } },
        targetCeleb: { select: { id: true, name: true, imageUrl: true } },
        _count: {
            select: { likes: true, comments: true }
        }
      }
    });

    // Transform to unified feed format
    const unifiedFeed: any[] = [
      ...articles.map(a => ({
        id: a.id,
        type: 'ARTICLE',
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        sourceUrl: a.sourceUrl,
        publishedAt: a.publishedAt.toISOString(),
        impactScore: a.impactScore,
        category: a.category,
        celebId: a.celebrity?.id,
        celebName: a.celebrity?.name,
        timestamp: new Date(a.publishedAt).getTime(),
        likeCount: a._count.likes,
        commentCount: a._count.comments,
        imageUrl: a.celebrity?.imageUrl,
        mentionedCelebs: a.celebrity ? [a.celebrity.name] : []
      })),
      ...scoops.map(s => ({
        id: s.id,
        type: 'SCOOP',
        headline: `User Scoop: ${s.targetCeleb?.name || 'Celebrity Update'}`,
        summary: s.content,
        source: s.user.name || 'Anonymous Agent',
        sourceUrl: `/celebrity/${s.targetCelebId}?post=${s.id}`,
        publishedAt: s.createdAt.toISOString(),
        impactScore: 75,
        category: 'Community',
        celebId: s.targetCelebId,
        celebName: s.targetCeleb?.name,
        user: {
            id: s.user.id,
            name: s.user.name,
            profilePath: s.user.profilePath
        },
        timestamp: new Date(s.createdAt).getTime(),
        likeCount: s._count.likes,
        commentCount: s._count.comments,
        imageUrl: s.targetCeleb?.imageUrl,
        mentionedCelebs: s.targetCeleb ? [s.targetCeleb.name] : []
      }))
    ];

    // Sort by timestamp
    unifiedFeed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // DE-DUPLICATION and DIVERSITY:
    const finalFeed: any[] = [];
    const seenCelebs = new Set<string>();
    const seenHeadlines = new Set<string>();

    for (const item of unifiedFeed) {
      const headlineKey = item.headline.toLowerCase().trim();
      if (seenHeadlines.has(headlineKey)) continue;
      
      if (item.celebId && seenCelebs.has(item.celebId)) continue;

      finalFeed.push(item);
      seenHeadlines.add(headlineKey);
      if (item.celebId) seenCelebs.add(item.celebId);
      
      if (finalFeed.length >= 50) break;
    }

    await redisClient.set(cacheKey, JSON.stringify(finalFeed), { EX: 300 });
    return NextResponse.json(finalFeed);
  } catch (error) {
    console.error('API Error /api/feed:', error);
    return NextResponse.json({ message: 'Failed to fetch feed' }, { status: 500 });
  }
}
  } catch (error) {
    console.error('API Error /api/feed:', error);
    return NextResponse.json({ message: 'Failed to fetch feed' }, { status: 500 });
  }
}

