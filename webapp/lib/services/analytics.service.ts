import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';

export class AnalyticsService {
  /**
   * Calculate trend direction based on noise history
   */
  async calculateTrendDirection(celebrityId: string): Promise<'up' | 'down' | 'flat'> {
    const history = await prisma.noiseHistory.findMany({
      where: { celebrityId },
      orderBy: { date: 'desc' },
      take: 5,
      select: { score: true }
    });

    if (history.length < 2) return 'flat';

    const recent = history.slice(0, 2);
    const older = history.slice(2);

    const recentAvg = recent.reduce((sum: number, h: { score: number }) => sum + h.score, 0) / recent.length;
    const olderAvg = older.reduce((sum: number, h: { score: number }) => sum + h.score, 0) / older.length;

    const diff = recentAvg - olderAvg;
    
    if (diff > 10) return 'up';
    if (diff < -10) return 'down';
    return 'flat';
  }

  /**
   * Update all celebrity trends in batch
   */
  async updateAllTrends(): Promise<void> {
    const celebrities = await prisma.celebrity.findMany({
      select: { id: true }
    });

    const updates = await Promise.all(
      celebrities.map(async (celeb: { id: string }) => {
        const trend = await this.calculateTrendDirection(celeb.id);
        return prisma.celebrity.update({
          where: { id: celeb.id },
          data: { trendDirection: trend }
        });
      })
    );

    console.log(`[Analytics] Updated trends for ${updates.length} celebrities`);
  }

  /**
   * Get aggregated statistics for dashboard
   */
  async getDashboardStats(): Promise<any> {
    const cacheKey = 'stats:dashboard';
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      totalCelebs,
      totalArticles,
      totalSightings,
      avgNoiseRating,
      topCategory
    ] = await Promise.all([
      prisma.celebrity.count(),
      prisma.article.count(),
      prisma.sighting.count(),
      prisma.celebrity.aggregate({
        _avg: { noiseRating: true }
      }),
      prisma.article.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 1
      })
    ]);

    const stats = {
      totalCelebs,
      totalArticles,
      totalSightings,
      avgNoiseRating: Math.round(avgNoiseRating._avg.noiseRating || 0),
      topCategory: topCategory[0]?.category || 'N/A'
    };

    await redisClient.set(cacheKey, JSON.stringify(stats), { EX: 3600 });
    return stats;
  }

  /**
   * Get trending celebrities (rising noise ratings)
   */
  async getTrendingCelebs(limit: number = 10): Promise<any[]> {
    const cacheKey = `celebs:trending:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get celebrities with upward trend
    const trending = await prisma.celebrity.findMany({
      where: { trendDirection: 'up' },
      orderBy: { noiseRating: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        noiseRating: true,
        trendDirection: true,
        followerCount: true
      }
    });

    await redisClient.set(cacheKey, JSON.stringify(trending), { EX: 1800 });
    return trending;
  }

  /**
   * Get category breakdown for analytics
   */
  async getCategoryBreakdown(): Promise<any[]> {
    const cacheKey = 'stats:categories';
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const breakdown = await prisma.article.groupBy({
      by: ['category'],
      _count: { category: true },
      _avg: { impactScore: true },
      orderBy: { _count: { category: 'desc' } }
    });

    const formatted = breakdown.map((b: any) => ({
      category: b.category,
      count: b._count.category,
      avgImpact: Math.round(b._avg.impactScore || 0)
    }));

    await redisClient.set(cacheKey, JSON.stringify(formatted), { EX: 3600 });
    return formatted;
  }
}

export const analyticsService = new AnalyticsService();
