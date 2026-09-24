import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export async function GET(req: Request) {
  try {
    // Check Plan
    let plan = 'free';
    const authHeader = req.headers.get('Authorization');
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
    const cacheKey = isPro ? 'celebs:top:pro' : 'celebs:top:free';
    const sightingDelayMs = 24 * 60 * 60 * 1000;
    const sightingTimeLimit = new Date(Date.now() - (isPro ? 0 : sightingDelayMs));

    const cachedCelebs = await redisClient.get(cacheKey);
    if (cachedCelebs) {
      return NextResponse.json(JSON.parse(cachedCelebs));
    }

    const celebs = await prisma.celebrity.findMany({
      take: 10,
      orderBy: { noiseRating: 'desc' },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        noiseRating: true,
        trendDirection: true,
        followerCount: true,
        sightings: {
          where: {
            date: { lte: sightingTimeLimit }
          },
          take: 1,
          orderBy: { date: 'desc' },
          select: {
            location: true,
            date: true,
            confidence: true
          }
        }
      }
    });

    await redisClient.set(cacheKey, JSON.stringify(celebs), { EX: 1800 });
    return NextResponse.json(celebs);
  } catch (error) {
    console.error('API Error /api/celebs/top:', error);
    return NextResponse.json({ message: 'Failed to fetch top celebs' }, { status: 500 });
  }
}
