import axios from 'axios';

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    source: { name: string; url: string };
    publishedAt: string;
    image?: string;
}

interface GNewsResponse {
    totalArticles: number;
    articles: NewsArticle[];
}

class NewsService {
    private apiKey: string;
    private baseUrl = 'https://gnews.io/api/v4';

    constructor() {
        this.apiKey = process.env.GNEWS_API_KEY || '';
        if (!this.apiKey) {
            console.warn('[NewsService] GNEWS_API_KEY not set. Real news fetching disabled.');
        }
    }

    /**
     * Fetch real news articles for a celebrity.
     * Returns up to 5 articles with real URLs.
     */
    async fetchCelebNews(celebName: string, maxResults: number = 5): Promise<{
        headline: string;
        summary: string;
        source: string;
        sourceUrl: string;
        publishedAt: Date;
        impactScore: number;
        category: string;
    }[]> {
        if (!this.apiKey) {
            console.log(`[NewsService] API key missing. Skipping news fetch for ${celebName}.`);
            return [];
        }

        try {
            const url = `${this.baseUrl}/search?q=${encodeURIComponent(celebName)}&lang=en&max=${maxResults}&apikey=${this.apiKey}`;
            const response = await axios.get<GNewsResponse>(url, {
                headers: { 'User-Agent': 'Icomly/1.0' },
                timeout: 10000
            });

            if (!response.data.articles || response.data.articles.length === 0) {
                console.log(`[NewsService] No articles found for ${celebName}.`);
                return [];
            }

            console.log(`[NewsService] Found ${response.data.articles.length} articles for ${celebName}.`);

            return response.data.articles.map(article => ({
                headline: article.title,
                summary: article.description || article.title,
                source: article.source?.name || 'News',
                sourceUrl: article.url,
                publishedAt: new Date(article.publishedAt),
                impactScore: 50 + Math.floor(Math.random() * 30), // Assign random impact
                category: this.categorizeArticle(article.title)
            }));
        } catch (error: any) {
            console.error(`[NewsService] Failed to fetch news for ${celebName}:`, error.message);
            return [];
        }
    }

    /**
     * Simple category detection based on keywords.
     */
    private categorizeArticle(title: string): string {
        const lower = title.toLowerCase();
        if (lower.includes('dating') || lower.includes('romance') || lower.includes('relationship') || lower.includes('married')) {
            return 'Romance';
        }
        if (lower.includes('scandal') || lower.includes('controversy') || lower.includes('arrested') || lower.includes('lawsuit')) {
            return 'Scandal';
        }
        if (lower.includes('movie') || lower.includes('album') || lower.includes('tour') || lower.includes('award')) {
            return 'Career';
        }
        if (lower.includes('outfit') || lower.includes('fashion') || lower.includes('style') || lower.includes('wore')) {
            return 'Fashion';
        }
        if (lower.includes('viral') || lower.includes('trending') || lower.includes('meme')) {
            return 'Viral';
        }
        return 'General';
    }

    /**
     * Check if the service is configured and ready.
     */
    isEnabled(): boolean {
        return !!this.apiKey;
    }
}

export const newsService = new NewsService();
