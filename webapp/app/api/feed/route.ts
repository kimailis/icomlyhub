import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cachedFeed = await redisClient.get('feed:global');
    if (cachedFeed) {
      return NextResponse.json(JSON.parse(cachedFeed));
    }

    const timeWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Fetch Articles
    const articles = await prisma.article.findMany({
      where: { publishedAt: { gte: timeWindow } },
      take: 40,
      orderBy: { publishedAt: 'desc' },
      include: {
        celebrity: {
          select: { id: true, name: true, imageUrl: true, noiseRating: true, trendDirection: true }
        }
      }
    });

    // Fetch Verified User Posts (Scoops)
    const scoops = await prisma.post.findMany({
      where: {
        verified: true,
        isFeedCandidate: true,
        createdAt: { gte: timeWindow }
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profilePath: true } },
        targetCeleb: { select: { id: true, name: true, imageUrl: true } }
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
        publishedAt: a.publishedAt,
        impactScore: a.impactScore,
        category: a.category,
        celebrity: a.celebrity,
        timestamp: new Date(a.publishedAt).getTime()
      })),
      ...scoops.map(s => ({
        id: s.id,
        type: 'SCOOP',
        headline: `User Scoop: ${s.targetCeleb?.name || 'Celebrity Update'}`,
        summary: s.content,
        source: s.user.name || 'Anonymous Agent',
        sourceUrl: `/celebrity/${s.targetCelebId}?post=${s.id}`,
        publishedAt: s.createdAt,
        impactScore: 75, // Scoops are high impact
        category: 'Community',
        celebrity: s.targetCeleb,
        user: s.user,
        timestamp: new Date(s.createdAt).getTime(),
        picPath: s.picPath
      }))
    ];

    // Sort by timestamp
    unifiedFeed.sort((a, b) => b.timestamp - a.timestamp);

    // Post-processing: Prevent consecutive items for the same celebrity
    const feed: any[] = [];
    const deferred: any[] = [];

    for (const item of unifiedFeed) {
      const lastItem = feed[feed.length - 1];
      if (lastItem && lastItem.celebrity?.id === item.celebrity?.id) {
        deferred.push(item);
      } else {
        feed.push(item);
      }
    }

    // Weave deferred items back in
    for (const item of deferred) {
      let inserted = false;
      for (let i = 1; i < feed.length; i++) {
        const prev = feed[i - 1];
        const next = feed[i];
        if (prev.celebrity?.id !== item.celebrity?.id && next.celebrity?.id !== item.celebrity?.id) {
          feed.splice(i, 0, item);
          inserted = true;
          break;
        }
      }
      if (!inserted) feed.push(item);
    }

    const finalFeed = feed.slice(0, 50);

    await redisClient.set('feed:global', JSON.stringify(finalFeed), { EX: 300 }); // 5 min cache
    return NextResponse.json(finalFeed);
  } catch (error) {
    console.error('API Error /api/feed:', error);
    return NextResponse.json({ message: 'Failed to fetch feed' }, { status: 500 });
  }
}