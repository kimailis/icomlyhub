'use client';

import React, { useState } from 'react';
import { CelebProfile as CelebProfileType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Activity, TrendingUp, TrendingDown, 
  Minus, Users, MapPin, ExternalLink, Shield, Info,
  Heart, HeartOff, ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { backend } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PostWall from '@/app/components/social/PostWall';
import CommentSection from '@/app/components/social/CommentSection';
import { ShareButton } from '@/app/components/ui/ShareButton';
import { formatRelativeTime } from '@/lib/utils';
import { RelativeTime } from '@/app/components/ui/RelativeTime';

interface CelebProfileViewProps {
    profile: CelebProfileType & { totalArticles?: number, actualFollowerCount?: number };
}

export default function CelebProfileView({ profile }: CelebProfileViewProps) {
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const { openAuthModal } = useUI();
  const [activeTab, setActiveTab] = useState<'scoops' | 'insights'>('scoops');
  const [visibleScoops, setVisibleScoops] = useState(3);
  const [expandedScoopId, setExpandedScoopId] = useState<string | null>(null);
  const [following, setFollowing] = useState(user?.following?.includes(profile.id) || false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // Mark as viewed when profile is loaded
  React.useEffect(() => {
    if (token && following) {
        backend.markAsViewed(profile.id, token);
    }
  }, [profile.id, token, following]);

  const handleFollow = async () => {
    if (!user || !token) {
        openAuthModal('login');
        return;
    }

    setLoadingFollow(true);
    try {
        const newFollowing = await backend.followCeleb(profile.id, token);
        setFollowing(newFollowing.includes(profile.id));
        updateUser({ ...user, following: newFollowing });
        router.refresh();
    } catch (e) {
        console.error("Failed to follow/unfollow:", e);
    } finally {
        setLoadingFollow(false);
    }
  };

  const getTrendIcon = (dir: string) => {
    if (dir === 'up') return <TrendingUp className="text-green-500" size={20} />;
    if (dir === 'down') return <TrendingDown className="text-red-500" size={20} />;
    return <Minus className="text-gray-500" size={20} />;
  };

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-gray-400 hover:text-white">
              <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              ID: {profile.id.toUpperCase()}
          </div>
      </div>

      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute inset-0">
          <img 
            src={profile.imageUrl} 
            alt={`${profile.name} Background`}
            className="w-full h-full object-cover opacity-60" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
        </div>
        
        <div className="relative p-6 md:p-12 flex flex-col items-start md:flex-row md:items-end gap-8">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0">
                <img 
                    src={profile.imageUrl} 
                    alt={profile.name}
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                />
            </div>
            
            <div className="flex-1 min-w-0 w-full text-left">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 mb-2">
                    <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase tracking-widest border border-primary/30">
                        {profile.category || 'Celebrity'}
                    </span>
                    <div className="hidden md:block h-4 w-px bg-white/10" />
                    <span className="text-gray-400 text-xs font-mono">{profile.nationality || 'Global Citizen'}</span>
                </div>
                <h1 className="text-4xl md:text-7xl font-black text-white leading-none mb-4 tracking-tighter">
                    {profile.name}
                </h1>
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-col gap-3 w-full md:w-auto">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:w-32 text-center col-span-1">
                    <div className="text-3xl font-black text-primary mb-0">{profile.noiseRating}</div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Noise</div>
                    <div className="flex justify-center mt-1">{getTrendIcon(profile.trendDirection)}</div>
                </div>

                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:w-32 text-center col-span-1">
                    <div className="text-3xl font-black text-white mb-0">{profile.actualFollowerCount || 0}</div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Tracking</div>
                    <div className="flex justify-center mt-1"><Users className="text-blue-400" size={18} /></div>
                </div>

                <div className="col-span-1 md:w-32">
                    <Button 
                        onClick={handleFollow}
                        disabled={loadingFollow}
                        className={`w-full h-16 md:h-24 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                            following 
                            ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' 
                            : 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]'
                        }`}
                    >
                        {following ? <HeartOff size={20} className="text-gray-400" /> : <Heart size={20} fill="white" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {loadingFollow ? 'Wait...' : following ? 'Unfollow' : 'Follow'}
                        </span>
                    </Button>
                </div>

                <div className="col-span-1 md:w-32">
                    <ShareButton 
                        url={`/celebrity/${profile.id}`} 
                        title={`Check out ${profile.name} on Icomly!`}
                        variant="ghost"
                        className="w-full h-16 md:h-auto bg-white/5 border border-white/10 rounded-xl flex flex-col md:flex-row items-center justify-center gap-2 hover:bg-white/10"
                    />
                </div>
            </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-full md:w-fit overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('scoops')}
            className={`px-4 md:px-8 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'scoops' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Latest Scoops
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`px-4 md:px-8 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === 'insights' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Celeb Insights
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
              {activeTab === 'insights' && (
                <div className="space-y-10 animate-fade-in">
                    <section className="bg-surface/30 border border-white/5 rounded-3xl p-6 md:p-8">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="text-primary" size={20} /> Buzz Velocity (30-Day Trend)
                        </h2>
                        <div className="h-[250px] w-full">
                            {profile.noiseHistory && profile.noiseHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={profile.noiseHistory}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#d946ef' }}
                                            labelStyle={{ display: 'none' }}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 font-mono text-xs">
                                    INSUFFICIENT HISTORICAL DATA
                                </div>
                            )}
                        </div>
                    </section>

                    {(profile.lifeSummary || profile.hobbies) && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Info className="text-primary" size={20} /> Profile
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {profile.lifeSummary && (
                                    <div className="bg-surface/30 border border-white/5 rounded-2xl p-5 space-y-2">
                                        <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Biography</h3>
                                        <p className="text-gray-400 text-xs leading-relaxed">{profile.lifeSummary}</p>
                                    </div>
                                )}
                                {profile.hobbies && (
                                    <div className="bg-surface/30 border border-white/5 rounded-2xl p-5 space-y-2">
                                        <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Interests</h3>
                                        <p className="text-gray-400 text-xs leading-relaxed">{profile.hobbies}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
              )}

              {activeTab === 'scoops' && (
                <section className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-primary" size={20} /> Latest Scoops
                        </h2>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            Total Scoops: {profile.totalArticles || profile.recentStories.length}
                        </span>
                    </div>
                    
                    <div className="space-y-6">
                        {profile.recentStories.length === 0 ? (
                            <div className="p-12 text-center bg-surface/20 rounded-3xl border border-white/5 text-gray-500 text-sm">
                                No recent stories found.
                            </div>
                        ) : (
                            <>
                            {profile.recentStories.slice(0, visibleScoops).map((story, i) => (
                                <div key={i} className="group p-6 rounded-3xl bg-surface/40 border border-white/5 hover:border-primary/20 hover:bg-surface/60 transition-all space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[10px] font-bold text-primary uppercase">{story.source}</span>
                                            <span className="text-gray-600 text-[10px]">•</span>
                                            <span className="text-[10px] text-gray-500">{story.publishedAt}</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-white mb-2 group-hover:text-primary transition-colors">{story.title}</h3>
                                        <p className="text-sm text-gray-400 leading-relaxed mb-4">{story.snippet}</p>
                                        <a 
                                            href={story.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs text-primary font-bold hover:underline"
                                        >
                                            View Full Story <ExternalLink size={12} />
                                        </a>
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center justify-between md:justify-start gap-6">
                                            <div className="flex items-center gap-4">
                                                <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary transition-colors">
                                                    <ThumbsUp size={14} /> 0
                                                </button>
                                                <button className="text-gray-500 hover:text-red-500 transition-colors">
                                                    <ThumbsDown size={14} />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => setExpandedScoopId(expandedScoopId === story.id ? null : story.id)}
                                                className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
                                            >
                                                <MessageSquare size={14} /> Comments
                                            </button>
                                        </div>
                                    </div>

                                    {expandedScoopId === story.id && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <CommentSection articleId={story.id} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {visibleScoops < profile.recentStories.length && (
                                <div className="pt-4 flex justify-center">
                                    <Button variant="secondary" className="w-full md:w-auto min-w-[200px]" onClick={() => setVisibleScoops(prev => prev + 5)}>
                                        Load More Scoops
                                    </Button>
                                </div>
                            )}
                            </>
                        )}
                    </div>
                </section>
              )}
          </div>

          <div className="space-y-8">
              <section className="space-y-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MapPin className="text-primary" size={20} /> Recent Sightings
                  </h2>
                  <div className="space-y-3">
                      {profile.sightings.length === 0 ? (
                          <div className="p-6 text-center bg-surface/20 rounded-2xl border border-white/5 text-gray-500 text-xs italic">
                              Target is currently not spotted.
                          </div>
                      ) : (
                        (() => {
                            const uniqueLocations = new Map();
                            const sortedSightings = [...profile.sightings].sort((a, b) => 
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                            );

                            for (const sighting of sortedSightings) {
                                if (!uniqueLocations.has(sighting.location)) {
                                    uniqueLocations.set(sighting.location, sighting);
                                }
                                if (uniqueLocations.size >= 3) break;
                            }

                            return Array.from(uniqueLocations.values()).map((sighting, i) => (
                                <div key={i} className="p-4 rounded-xl bg-surface/30 border border-white/5 space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-xs font-bold text-white leading-tight">{sighting.location}</span>
                                        </div>
                                        <RelativeTime date={sighting.date} className="text-[10px] text-gray-500 whitespace-nowrap mt-0.5" />
                                    </div>
                                    <p className="text-xs text-gray-400 italic line-clamp-2">&quot;{sighting.snippet}&quot;</p>
                                    <div className="pt-2 flex justify-between items-center">
                                         <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary" 
                                                style={{ width: `${sighting.confidence * 100}%` }}
                                            />
                                         </div>
                                         <span className="text-[9px] font-mono text-gray-600 uppercase">Conf: {Math.round(sighting.confidence * 100)}%</span>
                                    </div>
                                </div>
                            ));
                        })()
                      )}
                  </div>
              </section>

              <section className="bg-surface/30 border border-white/5 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Shield size={16} className="text-primary" /> Tracking Status
                  </h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Last Synced</span>
                          <div className="text-xs text-gray-300 font-mono">
                            {profile.lastUpdated ? <RelativeTime date={profile.lastUpdated} /> : 'LIVE'}
                          </div>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Data Integrity</span>
                          <span className={`text-xs font-mono ${profile.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                            {profile.verified ? 'VERIFIED' : 'HIGH-RES'}
                          </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                          <span className="text-xs text-gray-500 shrink-0 mt-0.5">Relationship Status</span>
                          <span className="text-xs text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-left">
                              {profile.relationshipStatus || 'UNKNOWN'}
                          </span>
                      </div>
                  </div>
              </section>
          </div>
      </div>
    </div>
  );
}
