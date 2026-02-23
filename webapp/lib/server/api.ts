import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';
import { GossipHeadline, CelebProfile } from '@/lib/types';

export async function getFeedServer(): Promise<GossipHeadline[]> {
  try {
    const cachedFeed = await redisClient.get('feed:global');
    if (cachedFeed) return JSON.parse(cachedFeed);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const feed = await prisma.article.findMany({
      where: { publishedAt: { gte: twentyFourHoursAgo } },
      take: 50,
      orderBy: { publishedAt: 'desc' },
      include: {
        celebrity: {
          select: { id: true, name: true, imageUrl: true, noiseRating: true, trendDirection: true, category: true }
        }
      }
    });

    const mappedFeed: GossipHeadline[] = feed.map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      celebName: item.celebrity.name,
      celebId: item.celebrity.id,
      mentionedCelebs: [item.celebrity.name],
      source: item.source,
      sourceUrl: item.sourceUrl,
      timeAgo: getTimeAgo(new Date(item.publishedAt)),
      category: item.celebrity.category || item.category,
      impactScore: item.impactScore,
      imageUrl: item.celebrity.imageUrl,
    }));

    await redisClient.set('feed:global', JSON.stringify(mappedFeed), { EX: 900 });
    return mappedFeed;
  } catch (error) {
    console.error('getFeedServer error:', error);
    return [];
  }
}

export async function getTopCelebsServer(): Promise<CelebProfile[]> {
  try {
    const cachedCelebs = await redisClient.get('celebs:top');
    if (cachedCelebs) return JSON.parse(cachedCelebs);

    const celebs = await prisma.celebrity.findMany({
      take: 10,
      orderBy: { noiseRating: 'desc' },
      include: {
        sightings: {
          take: 1,
          orderBy: { date: 'desc' },
          select: { location: true, date: true, confidence: true }
        }
      }
    });

    const mappedCelebs: CelebProfile[] = celebs.map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      bio: item.bio,
      noiseRating: item.noiseRating,
      trendDirection: item.trendDirection as any,
      tags: [],
      recentStories: [],
      sightings: item.sightings.map(s => ({ ...s, date: s.date.toISOString(), snippet: '' })) as any,
      noiseHistory: [],
      category: item.category
    }));

    await redisClient.set('celebs:top', JSON.stringify(mappedCelebs), { EX: 1800 });
    return mappedCelebs;
  } catch (error) {
    console.error('getTopCelebsServer error:', error);
    return [];
  }
}

export async function getProfileServer(id: string): Promise<any> {
    try {
        const celebrity = await prisma.celebrity.findUnique({
            where: { id },
            include: {
                articles: {
                    take: 10,
                    orderBy: { publishedAt: 'desc' }
                },
                sightings: {
                    take: 10,
                    orderBy: { date: 'desc' }
                },
                noiseHistory: {
                    take: 30,
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!celebrity) return null;

        const totalArticles = await prisma.article.count({ where: { celebrityId: id } });

        return {
            id: celebrity.id,
            name: celebrity.name,
            imageUrl: celebrity.imageUrl,
            bio: celebrity.bio,
            noiseRating: celebrity.noiseRating,
            trendDirection: celebrity.trendDirection,
            followerCount: celebrity.followerCount,
            actualFollowerCount: celebrity.followerCount,
            category: celebrity.category,
            nationality: celebrity.nationality,
            lifeSummary: celebrity.lifeSummary,
            hobbies: celebrity.hobbies,
            relationshipStatus: celebrity.relationshipStatus,
            recentStories: celebrity.articles.map(a => ({
                title: a.headline,
                snippet: a.summary,
                url: a.sourceUrl,
                source: a.source,
                publishedAt: getTimeAgo(new Date(a.publishedAt))
            })),
            sightings: celebrity.sightings.map(s => ({
                location: s.location,
                date: s.date.toISOString(),
                snippet: s.snippet,
                confidence: s.confidence
            })),
            noiseHistory: celebrity.noiseHistory.map(h => ({
                date: h.date.toISOString(),
                score: h.score
            })).reverse(),
            totalArticles
        };
    } catch (e) {
        console.error('getProfileServer error:', e);
        return null;
    }
}

export async function getMapDataServer(): Promise<any[]> {
  try {
    const cachedMap = await redisClient.get('sightings:geo:v2');
    if (cachedMap) {
      return JSON.parse(cachedMap);
    }

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
      take: 500 // Fetch more to allow for deduplication
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

    const mappedSightings = uniqueSightings.map(s => ({
        ...s,
        date: s.date.toISOString()
    }));

    await redisClient.set('sightings:geo:v2', JSON.stringify(mappedSightings), { EX: 1800 });
    return mappedSightings;
  } catch (error) {
    console.error('getMapDataServer error:', error);
    return [];
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}
