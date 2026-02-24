import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';
import { GossipHeadline, CelebProfile } from '@/lib/types';

export async function getFeedServer(): Promise<GossipHeadline[]> {
  try {
    const cachedFeed = await redisClient.get('feed:global');
    if (cachedFeed) return JSON.parse(cachedFeed);

    const twentyFourHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h for more content

    // Fetch Articles
    const articles = await prisma.article.findMany({
      where: { publishedAt: { gte: twentyFourHoursAgo } },
      take: 40,
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
        createdAt: { gte: twentyFourHoursAgo }
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

    const unifiedFeed: GossipHeadline[] = [
      ...articles.map(a => ({
        id: a.id,
        type: 'ARTICLE' as const,
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        sourceUrl: a.sourceUrl,
        publishedAt: a.publishedAt.toISOString(),
        impactScore: a.impactScore,
        category: a.category,
        celebId: a.celebrity.id,
        celebName: a.celebrity.name,
        timestamp: new Date(a.publishedAt).getTime(),
        likeCount: a._count.likes,
        commentCount: a._count.comments,
        imageUrl: a.celebrity.imageUrl,
        timeAgo: getTimeAgo(new Date(a.publishedAt)),
        mentionedCelebs: [a.celebrity.name]
      })),
      ...scoops.map(s => ({
        id: s.id,
        type: 'SCOOP' as const,
        headline: `User Scoop: ${s.targetCeleb?.name || 'Celebrity Update'}`,
        summary: s.content,
        source: s.user.name || 'Anonymous Agent',
        sourceUrl: `/celebrity/${s.targetCelebId}?post=${s.id}`,
        publishedAt: s.createdAt.toISOString(),
        impactScore: 75,
        category: 'Community',
        celebId: s.targetCelebId || '',
        celebName: s.targetCeleb?.name || '',
        user: {
            id: s.user.id,
            name: s.user.name,
            profilePath: s.user.profilePath
        },
        timestamp: new Date(s.createdAt).getTime(),
        likeCount: s._count.likes,
        commentCount: s._count.comments,
        imageUrl: s.targetCeleb?.imageUrl || '',
        timeAgo: getTimeAgo(new Date(s.createdAt)),
        mentionedCelebs: s.targetCeleb ? [s.targetCeleb.name] : []
      }))
    ];

    // Sort by timestamp
    unifiedFeed.sort((a, b) => b.timestamp! - a.timestamp!);

    const finalFeed = unifiedFeed.slice(0, 50);

    await redisClient.set('feed:global', JSON.stringify(finalFeed), { EX: 300 });
    return finalFeed;
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
            verified: celebrity.verified,
            lifeSummary: celebrity.lifeSummary,
            hobbies: celebrity.hobbies,
            relationshipStatus: celebrity.relationshipStatus,
            lastUpdated: celebrity.lastUpdated.getTime(),
            recentStories: celebrity.articles.map(a => ({
                id: a.id,
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
      take: 500
    });

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
  if (seconds < 0) return "just now";
  if (seconds < 60) return seconds + "s ago";
  let interval = seconds / 60;
  if (interval < 60) return Math.floor(interval) + "m ago";
  interval = interval / 60;
  if (interval < 24) return Math.floor(interval) + "h ago";
  interval = interval / 24;
  if (interval < 7) return Math.floor(interval) + "d ago";
  interval = interval / 7;
  if (interval < 4) return Math.floor(interval) + "w ago";
  interval = seconds / 2592000;
  if (interval < 12) return Math.floor(interval) + "mo ago";
  return Math.floor(seconds / 31536000) + "y ago";
}
