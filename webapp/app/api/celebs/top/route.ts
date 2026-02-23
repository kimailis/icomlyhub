import { NextResponse } from 'next/server';
import redisClient from '@/lib/redis';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cachedCelebs = await redisClient.get('celebs:top');
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

    await redisClient.set('celebs:top', JSON.stringify(celebs), { EX: 1800 });
    return NextResponse.json(celebs);
  } catch (error) {
    console.error('API Error /api/celebs/top:', error);
    return NextResponse.json({ message: 'Failed to fetch top celebs', error }, { status: 500 });
  }
}