
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  profilePath?: string;
  bio?: string;
  plan: 'free' | 'pro' | 'insider';
  following: string[]; // List of celeb IDs
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  notificationSettings: {
    email: boolean;
    push: boolean;
    weeklyDigest: boolean;
  };
}

export interface Source {
  name: string;
  url: string;
  credibility: 'High' | 'Medium' | 'Low';
}

export interface Article {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface Sighting {
  location: string;
  lat: number;
  lng: number;
  confidence: number;
  date: string;
  snippet: string;
}

export interface CelebProfile {
  id: string;
  name: string;
  imageUrl: string;
  bio: string;
  noiseRating: number; // 0-100
  trendDirection: 'up' | 'down' | 'flat';
  tags: string[];
  recentStories: Article[];
  sightings: Sighting[];
  noiseHistory: { date: string; score: number }[];
  lastUpdated?: number; // Timestamp for caching
  verified?: boolean;
  // Enhanced bio fields
  lifeSummary?: string | null;
  hobbies?: string | null;
  relationshipStatus?: string | null;
  nationality?: string | null;
  category?: string | null;
}

export interface GossipHeadline {
  id: string;
  type: 'ARTICLE' | 'SCOOP';
  headline: string;
  summary: string; // New field for expanded view
  celebName: string; // The PRIMARY celeb (for display)
  celebId: string; // The PRIMARY celeb ID (slug)
  mentionedCelebs: string[]; // All celebs mentioned (for tagging)
  source: string;
  sourceUrl: string;
  timeAgo: string;
  category: string;
  impactScore: number;
  imageUrl: string;
  timestamp?: number; // Timestamp for caching
  likeCount: number;
  commentCount: number;
  userHasLiked?: boolean;
  user?: {
    id: string;
    name: string | null;
    profilePath: string | null;
  };
}

export interface FollowingStat {
  id: string;
  name: string;
  imageUrl: string;
  newItems: number;
  trend: 'up' | 'down' | 'flat';
}

export enum ViewState {
  HOME = 'HOME',
  PROFILE = 'PROFILE',
  MAP = 'MAP',
  SUBSCRIPTION = 'SUBSCRIPTION'
}
