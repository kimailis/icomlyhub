import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // await params in Next.js 15
  const { id } = await params;

  try {
    // Check Plan
    let plan = 'free';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded && decoded.userId) {
                const user = await prisma.user.findUnique({
                    where: { id: decoded.userId },
                    select: { role: true }
                });
                if (user) plan = user.role;
            }
        } catch (e) {
            // Invalid token
        }
    }

    const isPro = plan === 'pro';
    const cacheKey = isPro ? `profile:${id}:pro` : `profile:${id}:free`;
    const newsDelayMs = 3 * 60 * 60 * 1000;
    const newsTimeLimit = new Date(Date.now() - (isPro ? 0 : newsDelayMs));
    // Locations: Pro=0ms, Free=24h
    const sightingTimeLimit = new Date(Date.now() - (isPro ? 0 : 24 * 60 * 60 * 1000));

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
            where: { publishedAt: { lte: newsTimeLimit } },
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
            where: { date: { lte: sightingTimeLimit } },
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
      prisma.article.count({ 
        where: { 
            celebrityId: id,
            publishedAt: { lte: newsTimeLimit }
        } 
      }),
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
