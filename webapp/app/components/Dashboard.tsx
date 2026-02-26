'use client';

import React, { useEffect, useState } from 'react';
import { backend } from '@/lib/api';
import { GossipHeadline, CelebProfile } from '@/lib/types';
import dynamic from 'next/dynamic';
const TopCelebsChart = dynamic(() => import('./TopCelebsChart').then(m => m.TopCelebsChart), { ssr: false });
import { AdBanner } from './AdBanner';
import { Activity, Loader2, Zap, Clock, ExternalLink, ChevronDown as LoadMoreIcon, ChevronDown, MessageSquare, Shield, ThumbsUp, ThumbsDown, Trash2, User as UserIcon, Share2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import PostWall from './social/PostWall';
import CommentSection from './social/CommentSection';
import { ShareButton } from './ui/ShareButton';
import { RelativeTime } from '@/app/components/ui/RelativeTime';

interface DashboardProps {
  initialFeed?: GossipHeadline[];
  initialTopCelebs?: CelebProfile[];
}

export const Dashboard: React.FC<DashboardProps> = ({ initialFeed = [], initialTopCelebs = [] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  const { user, token, isAuthenticated } = useAuth();
  const { openAuthModal, openConfirmModal } = useUI();
  const [feed, setFeed] = useState<GossipHeadline[]>(initialFeed);
  const [topCelebs, setTopCelebs] = useState<CelebProfile[]>(initialTopCelebs);
  const [loading, setLoading] = useState(initialFeed.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(9);
  const [activeTab, setActiveTab] = useState<'news' | 'community'>(
    tab === 'community' ? 'community' : 'news'
  );

  const shouldShowAds = !user || user.plan === 'free';

  const onSelectCeleb = (id: string) => {
    if (!id || id === 'undefined') {
        console.error("Attempted to navigate to celebrity with invalid ID:", id);
        return;
    }
    router.push(`/celebrity/${id}`);
  };

  const handleLike = async (e: React.MouseEvent, item: GossipHeadline) => {
    e.stopPropagation();
    if (!user || !token) {
        openAuthModal('login');
        return;
    }

    try {
        const itemType = (item as any).type;
        const isScoop = itemType === 'SCOOP';
        const res = await fetch('/api/likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                [isScoop ? 'postId' : 'articleId']: item.id,
                isUpvote: true
            })
        });

        if (res.ok) {
            // Update local state for immediate feedback
            setFeed((prev: GossipHeadline[]) => prev.map((f: GossipHeadline) => {
                if (f.id === item.id) {
                    return { ...f, likeCount: (f.likeCount || 0) + 1, userHasLiked: true };
                }
                return f;
            }));
        }
    } catch (error) {
        console.error('Failed to like:', error);
    }
  };

  const handleDeletePost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user || !token) return;
    
    openConfirmModal({
      title: 'Delete Scoop',
      message: 'Are you sure you want to permanently delete this scoop from the global feed?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/posts?postId=${postId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            // Update local state for immediate feedback
            setFeed((prev: GossipHeadline[]) => prev.filter((f: GossipHeadline) => f.id !== postId));
          }
        } catch (error) {
          console.error('Failed to delete post:', error);
        }
      }
    });
  };

  // Centralized refresh function
  const refreshFeed = async (showLoader = false, forceCacheClear = false) => {
    if (showLoader) setRefreshing(true);
    try {
      const [feedData, celebData] = await Promise.all([
          backend.getFeed(token || undefined, forceCacheClear),
          backend.getTopCelebs(token || undefined)
      ]);
      setFeed(feedData);
      setTopCelebs(celebData);
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      if (showLoader) setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Check if we need to load data initially
    const init = async () => {
      // If we have SSR data AND no token yet, we wait. 
      // If we have SSR data AND a token, we might want to refresh to ensure Pro tier data.
      // If we have NO data, we must fetch.
      
      const hasInitialData = initialFeed.length > 0;
      
      // If we have no token but were expecting one (SSR might have used a cookie),
      // we don't want to immediately fetch with 'undefined' token because it will return Free feed.
      if (!token && hasInitialData) {
          setLoading(false);
          return;
      }

      setLoading(true);
      await refreshFeed();
      setLoading(false);
    };
    
    init();

    // 2. Setup event listeners
    const handleUpdateEvent = () => refreshFeed(true);
    window.addEventListener('feed-updated', handleUpdateEvent);
    
    // 3. Periodic refresh (60 seconds)
    // Only start interval if we are reasonably sure about the token status
    const interval = setInterval(() => {
        // Only auto-refresh if tab is visible and we have a token (or we are guest)
        if (document.visibilityState === 'visible') {
            refreshFeed();
        }
    }, 60000);
    
    return () => {
        window.removeEventListener('feed-updated', handleUpdateEvent);
        clearInterval(interval);
    };
  }, [token]);

  const toggleExpand = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const handleLoadMore = () => {
      setVisibleCount(prev => prev + 9);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string, id?: string) => {
      const target = e.currentTarget;
      const currentSrc = target.src;
      
      // If we already tried all fallbacks, stop
      if (currentSrc.includes('dicebear.com/7.x/initials')) return;

      const seed = name || id || 'Unknown';

      // First fallback: try Wikipedia FilePath redirect (very reliable for famous celebs)
      if (!currentSrc.includes('wikipedia.org') && !currentSrc.includes('ui-avatars.com')) {
        const wikiName = seed.replace(/\s+/g, '_');
        // We guess it's a .jpg (most common). If this fails, it'll trigger onError again
        target.src = `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(wikiName)}.jpg?width=300`;
        return;
      }

      // Second fallback: Try .png if .jpg failed for Wikipedia
      if (currentSrc.includes('wikipedia.org') && currentSrc.endsWith('.jpg?width=300')) {
        const wikiName = seed.replace(/\s+/g, '_');
        target.src = `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(wikiName)}.png?width=300`;
        return;
      }

      if (currentSrc.includes('ui-avatars.com')) {
        // Last fallback: DiceBear initials
        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=18181b&fontSize=40`;
      } else {
        // UI Avatars
        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=18181b&color=fff&size=200`;
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 space-y-4" aria-live="polite">
        <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
             <Loader2 className="animate-spin h-10 w-10 text-primary relative z-10" />
        </div>
        <p className="text-sm font-mono tracking-widest uppercase animate-pulse">Spilling the tea...</p>
      </div>
    );
  }

  const displayedFeed = feed.slice(0, visibleCount);
  const hasMore = visibleCount < feed.length;

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-2 md:gap-0">
        <div>
            {/* Mobile Branding */}
            <div className="md:hidden flex items-center gap-2 mb-1">
                <img src="/logo.png" alt="iComly Logo" className="w-8 h-8 object-contain" />
                <div className="text-[30px] font-black text-primary tracking-[0.2em]">i<span className="text-white">Comly</span></div>
            </div>
            
            <h1 className="text-xl md:text-4xl font-extrabold text-white mb-1 md:mb-2 flex items-center gap-2 tracking-tight">
                <Zap className={`text-yellow-400 fill-yellow-400 w-5 h-5 md:w-8 md:h-8 ${refreshing ? 'animate-pulse' : ''}`} />
                The Daily Spill
                {refreshing && <Loader2 className="animate-spin h-4 w-4 text-primary ml-2" />}
            </h1>
            <p className="text-gray-400 text-[10px] md:text-sm font-mono">
                LATEST SCOOPS // HOT OFF THE PRESS // VIRAL
            </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
            TRENDING NOW
        </div>
      </header>

      {/* Top 10 Chart */}
      <TopCelebsChart celebs={topCelebs} onSelect={onSelectCeleb} />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mb-8">
          <button 
            onClick={() => {
                if (activeTab === 'news') {
                    refreshFeed(true, true);
                } else {
                    setActiveTab('news');
                }
            }}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'news' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Zap size={14} className={refreshing ? 'animate-spin' : ''} /> Latest Scoops
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'community' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MessageSquare size={14} /> Community Wall
          </button>
      </div>

      {activeTab === 'news' ? (
        <div className="space-y-4" role="feed">
          {displayedFeed.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const showAd = shouldShowAds && (index + 1) % 3 === 0;
            
            return (
              <React.Fragment key={item.id}>
                  <div 
                  className={`group relative bg-surface/40 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-surface/80 border-primary/30 shadow-lg shadow-primary/5' : 'hover:bg-surface/60 hover:border-primary/20'}`}
                  >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/50 to-transparent transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />

                      {/* Header Area (Clickable to Expand) */}
                      <div 
                          className="w-full text-left p-3 md:p-4 flex flex-col md:flex-row gap-2 md:gap-4 md:items-center cursor-pointer focus:outline-none focus:bg-white/5"
                          onClick={(e) => toggleExpand(e, item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  toggleExpand(e, item.id);
                              }
                          }}
                          aria-expanded={isExpanded}
                          aria-controls={`story-content-${item.id}`}
                      >
                          {/* Top Row: Image + Metadata + Score */}
                          <div className="flex items-center gap-3 w-full md:w-auto">
                              <div 
                                className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-black/50 border border-white/5 relative z-10 cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCeleb(item.celebId);
                                }}
                              >
                                  <img 
                                      src={item.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.celebName || 'Unknown')}&background=18181b&color=fff&size=200`} 
                                      alt={item.celebName || 'Celebrity'} 
                                      width={64}
                                      height={64}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      onError={(e) => handleImageError(e, item.celebName, item.celebId)}
                                      referrerPolicy="no-referrer"
                                  />
                              </div>

                              <div className="flex-1 min-w-0 md:hidden">
                                  <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.category}</span>
                                      <span className="text-gray-600 text-[10px]">•</span>
                                      <RelativeTime date={item.timestamp || new Date().getTime()} className="text-[10px] text-gray-500" />
                                  </div>
                                  <div className="font-bold text-white text-xs truncate">
                                      {item.celebName}
                                  </div>
                              </div>

                              {/* Mobile Score & Action */}
                              <div className="flex flex-shrink-0 items-center gap-2 md:hidden z-20">
                                  <div className="flex flex-col items-end gap-0.5 min-w-[32px]">
                                      <div className={`text-lg font-bold font-mono ${item.impactScore > 90 ? 'text-red-500' : 'text-primary'}`}>
                                          {item.impactScore}
                                      </div>
                                  </div>
                                  <div className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                      <ChevronDown size={18} />
                                  </div>
                              </div>
                          </div>

                          {/* Desktop Middle Block */}
                          <div className="flex-1 min-w-0 z-10 hidden md:block">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-primary uppercase tracking-wider">{item.category}</span>
                                  <span className="text-gray-600 text-[10px]">•</span>
                                  <span className="text-xs font-medium text-gray-300">
                                      {item.celebName}
                                  </span>
                                  <span className="text-gray-600 text-[10px]">•</span>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock size={10} /> <RelativeTime date={item.timestamp || new Date().getTime()} />
                                  </div>
                              </div>
                              <h3 className="text-lg font-bold text-white leading-tight pr-4 truncate group-hover:text-primary/90 transition-colors">
                                  {item.headline}
                              </h3>
                          </div>

                          {/* Desktop End Block */}
                          <div className="flex-shrink-0 flex items-center gap-4 z-10 hidden md:flex">
                              <div className="flex flex-col items-end gap-1 min-w-[40px]">
                                  <div className={`text-xl font-bold font-mono ${item.impactScore > 90 ? 'text-red-500' : 'text-primary'}`}>
                                      {item.impactScore}
                                  </div>
                                  <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">HEAT</div>
                              </div>
                              <div className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                  <ChevronDown size={20} />
                              </div>
                          </div>

                          {/* Mobile Headline (Starts under image) */}
                          <h3 className="text-sm font-bold text-white leading-snug md:hidden w-full">
                              {item.headline}
                          </h3>
                      </div>

                      {/* Expanded Content */}
                      <div 
                          id={`story-content-${item.id}`}
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                      >
                          <div className="overflow-hidden">
                              <div className="px-3 pb-4 pt-2 md:pt-0 md:pl-[5.5rem]">
                                  <div className="pt-2 border-t border-white/5">
                                      <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-4">
                                          {item.summary || "Summary data incoming..."}
                                      </p>
                                      
                                      <div className="flex flex-col md:flex-row md:items-center gap-4 mt-6 pt-4 border-t border-white/5">
                                          <div className="flex items-center justify-between md:justify-start gap-6">
                                              <div className="flex items-center gap-4">
                                                  <button 
                                                    onClick={(e) => handleLike(e, item)}
                                                    className={`flex items-center gap-1.5 text-xs font-bold transition-all ${item.userHasLiked ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                                                  >
                                                      <ThumbsUp size={14} className={item.userHasLiked ? 'fill-primary' : ''} /> {item.likeCount}
                                                  </button>
                                                  <button className="text-gray-500 hover:text-red-500 transition-colors">
                                                      <ThumbsDown size={14} />
                                                  </button>
                                              </div>
                                              
                                              <button 
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setExpandedCommentsId(expandedCommentsId === item.id ? null : item.id);
                                                  }}
                                                  className={`flex items-center gap-2 text-xs font-bold transition-all ${expandedCommentsId === item.id ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                                              >
                                                  <MessageSquare size={14} /> {item.commentCount} Comments
                                              </button>
                                          </div>

                                          <div className="hidden md:block flex-1" />

                                          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                                              {item.type === 'SCOOP' && item.user && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="gap-2 h-9 md:h-8 px-4 md:px-3 text-[10px] uppercase font-bold w-full md:w-auto border-primary/30 text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/user/${item.user?.id}`);
                                                    }}
                                                >
                                                    <UserIcon size={12} /> Poster Profile
                                                </Button>
                                              )}
                                              {item.celebId && (
                                                <>
                                                  <Button 
                                                      size="sm" 
                                                      variant="outline" 
                                                      className="gap-2 h-9 md:h-8 px-4 md:px-3 text-[10px] uppercase font-bold w-full md:w-auto"
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          onSelectCeleb(item.celebId);
                                                      }}
                                                  >
                                                      <Activity size={12} /> Celeb Profile
                                                  </Button>
                                                  <ShareButton 
                                                      url={item.type === 'SCOOP' ? `/post/${item.id}` : `/celebrity/${item.celebId}`} 
                                                      title={item.headline}
                                                      variant="outline"
                                                      size="sm"
                                                      className="w-full md:w-auto"
                                                  />
                                                  {item.type === 'SCOOP' && item.user?.id === user?.id && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="gap-2 h-9 md:h-8 px-4 md:px-3 text-[10px] uppercase font-bold w-full md:w-auto border-red-500/30 text-red-500 hover:bg-red-500/10"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeletePost(e, item.id);
                                                      }}
                                                    >
                                                      <Trash2 size={12} /> Delete
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                              <div className="w-full md:w-auto">
                                                {item.source.includes('Icomly') ? (
                                                    <div className="inline-flex items-center justify-center rounded-lg font-medium h-9 md:h-8 px-4 md:px-3 text-[10px] border border-primary/30 bg-primary/5 text-primary gap-2 uppercase tracking-widest font-bold w-full">
                                                        <Shield size={12} /> Verified
                                                    </div>
                                                ) : (
                                                    <a 
                                                        href={item.sourceUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none h-9 md:h-8 px-4 md:px-3 text-xs border border-white/20 bg-transparent hover:bg-white/5 text-white gap-2 w-full"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={14} /> {item.source}
                                                    </a>
                                                )}
                                              </div>
                                          </div>
                                      </div>

                                      {expandedCommentsId === item.id && (
                                          <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in">
                                              <CommentSection 
                                                  articleId={(item as any).type === 'ARTICLE' ? item.id : undefined}
                                                  postId={(item as any).type === 'SCOOP' ? item.id : undefined}
                                              />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {showAd && <AdBanner />}
              </React.Fragment>
            );
          })}

          {hasMore && (
              <div className="flex justify-center pt-4 pb-8">
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    onClick={handleLoadMore}
                    className="w-full md:w-auto min-w-[200px] gap-2 shadow-xl shadow-secondary/10"
                  >
                      <LoadMoreIcon size={18} /> Load More
                  </Button>
              </div>
          )}
          
          {!hasMore && feed.length > 0 && (
              <div className="text-center text-gray-500 text-xs font-mono pb-8">
                  -- ALL CAUGHT UP --
              </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in max-w-4xl">
            <PostWall title="Global Broadcast Feed" />
        </div>
      )}
    </div>
  );
};