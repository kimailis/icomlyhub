import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // await params in Next.js 15
  const { id } = await params;

  try {
    const cacheKey = `profile:${id}`;
    const cachedProfile = await redisClient.get(cacheKey);
    if (cachedProfile) {
      return NextResponse.json(JSON.parse(cachedProfile));
    }

    const [profile, articleCount, followerCount] = await Promise.all([
      prisma.celebrity.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          bio: true,
          imageUrl: true,
          noiseRating: true,
          trendDirection: true,
          lastUpdated: true,
          followerCount: true,
          lifeSummary: true,
          hobbies: true,
          relationshipStatus: true,
          bioLastUpdated: true,
          category: true,
          articles: {
            take: 50,
            orderBy: { publishedAt: 'desc' },
            select: {
              id: true,
              headline: true,
              summary: true,
              source: true,
              sourceUrl: true,
              publishedAt: true,
              impactScore: true,
              category: true
            }
          },
          sightings: {
            take: 10,
            orderBy: { date: 'desc' },
            select: {
              id: true,
              location: true,
              lat: true,
              lng: true,
              confidence: true,
              date: true,
              snippet: true
            }
          },
          noiseHistory: {
            take: 30,
            orderBy: { date: 'desc' },
            select: {
              score: true,
              date: true
            }
          }
        }
      }),
      prisma.article.count({ where: { celebrityId: id } }),
      prisma.follow.count({ where: { celebrityId: id } })
    ]);

    if (!profile) {
      return NextResponse.json({ message: 'Celebrity not found' }, { status: 404 });
    }

    const enrichedProfile = {
      ...profile,
      totalArticles: articleCount,
      actualFollowerCount: followerCount
    };

    await redisClient.set(cacheKey, JSON.stringify(enrichedProfile), { EX: 900 }); // 15 min cache
    return NextResponse.json(enrichedProfile);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch celebrity profile', error }, { status: 500 });
  }
}