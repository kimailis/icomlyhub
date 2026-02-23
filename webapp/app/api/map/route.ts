import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';

export async function GET() {
  try {
    const cachedMap = await redisClient.get('sightings:geo:v2');
    if (cachedMap) {
      return NextResponse.json(JSON.parse(cachedMap));
    }

    // Get ALL recent sightings (last 7 days)
    const sightings = await prisma.sighting.findMany({
      where: {
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
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
    await redisClient.set('sightings:geo:v2', JSON.stringify(uniqueSightings), { EX: 1800 });
    
    return NextResponse.json(uniqueSightings);
  } catch (error) {
    console.error('Failed to fetch map data:', error);
    return NextResponse.json({ message: 'Failed to fetch map data' }, { status: 500 });
  }
}
