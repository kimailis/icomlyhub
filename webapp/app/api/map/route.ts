import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function GET(request: Request) {
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
    const cacheKey = isPro ? 'sightings:geo:v2:pro' : 'sightings:geo:v2:free';
    const sightingTimeLimit = new Date(Date.now() - (isPro ? 0 : 24 * 60 * 60 * 1000));

    const cachedMap = await redisClient.get(cacheKey);
    if (cachedMap) {
      return NextResponse.json(JSON.parse(cachedMap));
    }

    // Get ALL recent sightings (last 7 days, but up to sightingTimeLimit)
    const sightings = await prisma.sighting.findMany({
      where: {
        date: { 
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lte: sightingTimeLimit
        }
      },
      select: {
        id: true,
        location: true,
        lat: true,
        lng: true,
        confidence: true,
        date: true,
        snippet: true,
        country: true,
        region: true,
        celebrity: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            noiseRating: true,
            category: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 500 // Limit to top 500 most recent sightings to allow for deduplication
    });

    // Deduplicate: Keep only the latest sighting per celebrity
    const seenCelebs = new Set<string>();
    const uniqueSightings = [];
    
    for (const sighting of sightings) {
        if (!seenCelebs.has(sighting.celebrity.id)) {
            seenCelebs.add(sighting.celebrity.id);
            uniqueSightings.push(sighting);
        }
        if (uniqueSightings.length >= 100) break;
    }

    // Cache for 30 minutes
    await redisClient.set(cacheKey, JSON.stringify(uniqueSightings), { EX: 1800 });
    
    return NextResponse.json(uniqueSightings);
  } catch (error) {
    console.error('Failed to fetch map data:', error);
    return NextResponse.json({ message: 'Failed to fetch map data' }, { status: 500 });
  }
}
