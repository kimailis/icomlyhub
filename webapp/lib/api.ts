import { CelebProfile, GossipHeadline, FollowingStat } from './types';

const API_BASE_URL = (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL.includes('localhost')))
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || '/api');

class BackendService {
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    // Remove leading slash if base url ends with slash, etc.
    // Standardize: API_BASE_URL no trailing slash, endpoint starts with slash.
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error(`Unauthorized access to ${endpoint}.`);
      }
      
      let errorMessage = response.statusText;
      try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
      } catch (e) {
          // Fallback to statusText if body is not JSON
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getFeed(): Promise<GossipHeadline[]> {
    const data = await this.fetchApi('/feed');
    return data.map((item: any) => ({
      id: item.id,
      type: item.type,
      headline: item.headline,
      summary: item.summary,
      celebName: item.celebrity?.name || item.celebName,
      celebId: item.celebrity?.id || item.celebId,
      mentionedCelebs: item.celebrity ? [item.celebrity.name] : [],
      source: item.source,
      sourceUrl: item.sourceUrl,
      timeAgo: this.getTimeAgo(new Date(item.publishedAt)),
      category: item.category,
      impactScore: item.impactScore,
      imageUrl: item.celebrity?.imageUrl || item.imageUrl,
      timestamp: item.timestamp || (item.publishedAt ? new Date(item.publishedAt).getTime() : undefined),
      likeCount: item.likeCount || item._count?.likes || 0,
      commentCount: item.commentCount || item._count?.comments || 0,
      user: item.user
    }));
  }

  async getTopCelebs(): Promise<CelebProfile[]> {
    const data = await this.fetchApi('/celebs/top');
    return data.map((item: any) => this.mapCeleb(item));
  }

  async getProfile(id: string): Promise<CelebProfile> {
    const item = await this.fetchApi(`/celebs/${id}`);
    return this.mapCeleb(item);
  }

  async getMapData(token?: string): Promise<any[]> {
    const options: RequestInit = {};
    if (token) {
        options.headers = { Authorization: `Bearer ${token}` };
    }
    return this.fetchApi('/map', options);
  }

  async getCelebsByCountry(country: string): Promise<CelebProfile[]> {
    const data = await this.fetchApi(`/celebs/country/${country}`);
    return data.map((item: any) => this.mapCeleb(item));
  }

  async getSightingsByRegion(region: string): Promise<any[]> {
    return this.fetchApi(`/sightings/region/${region}`);
  }

  async getCelebArticles(id: string, skip: number = 0, take: number = 10): Promise<{
    articles: Array<{
      id: string;
      headline: string;
      summary: string;
      source: string;
      sourceUrl: string;
      publishedAt: string;
      impactScore: number;
      category: string;
    }>;
    hasMore: boolean;
    total: number;
  }> {
    const data = await this.fetchApi(`/celebs/${id}/articles?skip=${skip}&take=${take}`);
    return {
      articles: data.articles.map((a: any) => ({
        ...a,
        title: a.headline,
        snippet: a.summary,
        url: a.sourceUrl,
        publishedAt: this.getTimeAgo(new Date(a.publishedAt))
      })),
      hasMore: data.hasMore,
      total: data.total
    };
  }

  async updateUser(data: Partial<any>, token: string): Promise<any> {
    return this.fetchApi('/user/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
  }

  async createCheckoutSession(plan: string, token: string): Promise<{ sessionId: string, url: string }> {
    return this.fetchApi('/subscription/create-checkout-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan })
    });
  }

  async followCeleb(id: string, token: string): Promise<string[]> {
    const data = await this.fetchApi(`/user/celebs/${id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.following;
  }

  async getFollowing(token: string): Promise<CelebProfile[]> {
    const data = await this.fetchApi('/user/following', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.map((item: any) => this.mapCeleb(item));
  }

  async getFollowingStats(token: string): Promise<FollowingStat[]> {
    const celebs = await this.getFollowing(token);
    return celebs.map((c: any) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      newItems: c.newItems || 0,
      trend: c.trendDirection
    }));
  }

  async markAsViewed(celebId: string, token: string): Promise<void> {
    try {
      await this.fetchApi(`/user/celebs/${celebId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Failed to mark as viewed:', e);
    }
  }

  async login(email: string, password: string): Promise<{ user: any, token: string }> {
    return this.fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(data: any): Promise<{ user: any, token: string }> {
    return this.fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async googleLogin(credential: string): Promise<{ user: any, token: string }> {
    return this.fetchApi('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.fetchApi('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(data: any): Promise<{ message: string }> {
    return this.fetchApi('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMe(token: string): Promise<any> {
    return this.fetchApi('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private mapCeleb(item: any): CelebProfile {
    return {
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      bio: item.bio,
      noiseRating: item.noiseRating,
      trendDirection: item.trendDirection,
      tags: [],
      recentStories: (item.articles || []).map((a: any) => ({
        title: a.headline,
        snippet: a.summary,
        url: a.sourceUrl,
        source: a.source,
        publishedAt: this.getTimeAgo(new Date(a.publishedAt))
      })),
      sightings: item.sightings || [],
      noiseHistory: (item.noiseHistory || []).map((h: any) => ({
        date: h.date,
        score: h.score
      })).reverse(),
      lifeSummary: item.lifeSummary || undefined,
      hobbies: item.hobbies || undefined,
      relationshipStatus: item.relationshipStatus || undefined,
      category: item.category || undefined,
      nationality: item.nationality || undefined,
      verified: item.verified || false,
      lastUpdated: item.lastUpdated ? new Date(item.lastUpdated).getTime() : undefined
    };
  }

  private getTimeAgo(date: Date): string {
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
}

export const backend = new BackendService();
