import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cachedFeed = await redisClient.get('feed:global');
    if (cachedFeed) {
      return NextResponse.json(JSON.parse(cachedFeed));
    }

    // Reduced window to 48 hours for freshness
    const timeWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const rawFeed = await prisma.article.findMany({
      where: {
        publishedAt: { gte: timeWindow }
      },
      take: 60, // Fetch slightly more to allow for filtering/shuffling
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        headline: true,
        summary: true,
        source: true,
        sourceUrl: true,
        publishedAt: true,
        impactScore: true,
        category: true,
        celebrity: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            noiseRating: true,
            trendDirection: true
          }
        }
      }
    });

    // Post-processing: Prevent consecutive items for the same celebrity
    const feed: typeof rawFeed = [];
    const deferred: typeof rawFeed = [];

    for (const item of rawFeed) {
      if (feed.length > 0 && feed[feed.length - 1].celebrity.id === item.celebrity.id) {
        deferred.push(item);
      } else {
        feed.push(item);
      }
    }

    // Try to weave deferred items back in
    for (const item of deferred) {
      let inserted = false;
      // Try to find a spot where neither neighbor is the same celeb
      for (let i = 1; i < feed.length; i++) {
        const prev = feed[i - 1];
        const next = feed[i];
        if (prev.celebrity.id !== item.celebrity.id && next.celebrity.id !== item.celebrity.id) {
          feed.splice(i, 0, item);
          inserted = true;
          break;
        }
      }
      // If no perfect spot, just append (better than losing data, though risks adjacency at the end)
      if (!inserted) {
        feed.push(item);
      }
    }

    // Limit back to 50 after shuffling
    const finalFeed = feed.slice(0, 50);

    await redisClient.set('feed:global', JSON.stringify(finalFeed), { EX: 900 });
    return NextResponse.json(finalFeed);
  } catch (error) {
    console.error('API Error /api/feed:', error);
    return NextResponse.json({ message: 'Failed to fetch feed', error }, { status: 500 });
  }
}