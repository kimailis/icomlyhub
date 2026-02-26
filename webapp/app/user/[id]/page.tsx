'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User as UserIcon, Calendar, MessageSquare, Shield, Users, Activity, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { RelativeTime } from '@/app/components/ui/RelativeTime';
import Link from 'next/link';
import { ShareButton } from '@/app/components/ui/ShareButton';
import CommentSection from '@/app/components/social/CommentSection';

type TabType = 'broadcasts' | 'followers' | 'following';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const { openAuthModal, openConfirmModal } = useUI();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('broadcasts');

  // Data states
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  
  // Loading & Pagination states
  const [loadingData, setLoadingData] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (isLoadMore = false) => {
    setLoadingData(true);
    try {
      const limit = 4;
      const params = new URLSearchParams();
      params.append('userId', userId); // Posts CREATED BY the user
      params.append('limit', limit.toString());
      if (isLoadMore && posts.length > 0) {
        params.append('cursor', posts[posts.length - 1].id);
      }
      
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setPosts(prev => [...prev, ...data]);
          setHasMorePosts(data.length === limit);
        } else {
          setPosts(data);
          setHasMorePosts(data.length === limit);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchFollowers = async (isLoadMore = false) => {
    setLoadingData(true);
    try {
      const limit = 10;
      const offset = isLoadMore ? followers.length : 0;
      const res = await fetch(`/api/user/${userId}/followers?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setFollowers(prev => [...prev, ...data]);
        } else {
          setFollowers(data);
        }
        setHasMoreFollowers(data.length === limit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchFollowing = async (isLoadMore = false) => {
    setLoadingData(true);
    try {
      const limit = 10;
      const offset = isLoadMore ? followingList.length : 0;
      const res = await fetch(`/api/user/${userId}/following?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setFollowingList(prev => [...prev, ...data]);
        } else {
          setFollowingList(data);
        }
        setHasMoreFollowing(data.length === limit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'broadcasts' && posts.length === 0) fetchPosts();
    if (activeTab === 'followers' && followers.length === 0) fetchFollowers();
    if (activeTab === 'following' && followingList.length === 0) fetchFollowing();
  }, [activeTab, userId]);

  const handleFollow = async () => {
    if (!currentUser || !token) {
      openAuthModal('login');
      return;
    }

    setLoadingFollow(true);
    try {
      const res = await fetch(`/api/user/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        fetchProfile(); // Refresh counts
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (!currentUser || !token) return;
    
    openConfirmModal({
      title: 'Delete Broadcast',
      message: 'Are you sure you want to permanently delete this broadcast?',
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
            setPosts(posts.filter(p => p.id !== postId));
            fetchProfile(); // Update count
          }
        } catch (error) {
          console.error('Failed to delete post:', error);
        }
      }
    });
  };

  const handleLike = async (postId: string, isUpvote: boolean) => {
    if (!currentUser || !token) {
      openAuthModal('login');
      return;
    }

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId, isUpvote })
      });

      if (res.ok) {
        // Refresh posts to show updated likes
        const updatedPosts = await Promise.all(posts.map(async p => {
            if (p.id === postId) {
                const r = await fetch(`/api/posts?postId=${postId}`); // Need a single post fetch ideally
                // For simplicity, just increment/decrement or re-fetch current page
                return p; 
            }
            return p;
        }));
        fetchPosts(); // Simpler for now
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-600 font-mono text-xs animate-pulse tracking-widest uppercase">
          SYNCHRONIZING_PROFILE_DATA...
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="text-red-500/50 font-mono text-sm tracking-widest uppercase">
          ERROR: USER_NOT_FOUND
        </div>
        <Button variant="ghost" onClick={() => router.push('/')} className="text-gray-500 text-xs">
          Return to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 pb-20">
      <Button variant="ghost" onClick={() => router.push('/?tab=community')} className="gap-2 text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Back
      </Button>

      {/* Profile Header */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface/20">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {userProfile.profilePath ? (
              <img src={userProfile.profilePath} className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={48} className="text-primary" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
              <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter">
                {userProfile.name || 'Anonymous User'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${userProfile.role === 'pro' ? 'bg-gradient-to-r from-primary to-secondary text-white border border-primary/30' : 'bg-gray-800 text-gray-400 border border-white/5'}`}>
                {userProfile.role === 'pro' ? 'INSIDER' : 'OBSERVER'}
              </span>
            </div>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed">
              {userProfile.bio || 'This user has not broadcasted a bio yet.'}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest pt-1">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {new Date(userProfile.createdAt).toLocaleDateString()}</span>
              <span>ID: {userProfile.id.substring(0, 8)}</span>
            </div>
          </div>

          {currentUser?.id !== userProfile.id && (
            <div className="w-full md:w-auto self-center md:self-start">
              <Button 
                onClick={handleFollow}
                disabled={loadingFollow}
                className={`w-full md:w-40 rounded-2xl py-6 flex items-center justify-center gap-2 transition-all ${
                  following 
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' 
                  : 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20'
                }`}
              >
                <Users size={18} />
                <span className="font-black uppercase tracking-widest text-xs">
                  {loadingFollow ? 'Wait...' : following ? 'Unfollow' : 'Follow User'}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 border-t border-white/10 bg-black/40">
          <button 
            onClick={() => setActiveTab('broadcasts')}
            className={`p-4 text-center border-r border-white/10 transition-all hover:bg-white/5 ${activeTab === 'broadcasts' ? 'bg-primary/10 border-b-2 border-b-primary' : ''}`}
          >
            <div className={`text-xl font-black ${activeTab === 'broadcasts' ? 'text-primary' : 'text-white'}`}>{userProfile.postCount}</div>
            <div className={`text-[10px] font-mono uppercase tracking-widest ${activeTab === 'broadcasts' ? 'text-primary/70' : 'text-gray-500'}`}>Broadcasts</div>
          </button>
          <button 
            onClick={() => setActiveTab('followers')}
            className={`p-4 text-center border-r border-white/10 transition-all hover:bg-white/5 ${activeTab === 'followers' ? 'bg-primary/10 border-b-2 border-b-primary' : ''}`}
          >
            <div className={`text-xl font-black ${activeTab === 'followers' ? 'text-primary' : 'text-white'}`}>{userProfile.followerCount}</div>
            <div className={`text-[10px] font-mono uppercase tracking-widest ${activeTab === 'followers' ? 'text-primary/70' : 'text-gray-500'}`}>Followers</div>
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className={`p-4 text-center transition-all hover:bg-white/5 ${activeTab === 'following' ? 'bg-primary/10 border-b-2 border-b-primary' : ''}`}
          >
            <div className={`text-xl font-black ${activeTab === 'following' ? 'text-primary' : 'text-white'}`}>{userProfile.followingCount}</div>
            <div className={`text-[10px] font-mono uppercase tracking-widest ${activeTab === 'following' ? 'text-primary/70' : 'text-gray-500'}`}>Following</div>
          </button>
        </div>
      </section>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'broadcasts' && (
          <div className="space-y-4 animate-fade-in">
             {posts.length === 0 && !loadingData ? (
                <div className="p-12 text-center bg-surface/20 rounded-3xl border border-white/5 text-gray-500 font-mono text-xs uppercase tracking-widest">
                  NO BROADCASTS FOUND
                </div>
             ) : (
                <>
                  {posts.map((post) => (
                    <div key={post.id} className="group p-5 rounded-3xl bg-surface/40 border border-white/5 hover:border-white/10 transition-all space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                            {userProfile.profilePath ? (
                              <img src={userProfile.profilePath} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={18} className="text-primary" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight">{userProfile.name || 'Anonymous'}</h4>
                            <RelativeTime date={post.createdAt} className="text-[10px] text-gray-500 font-mono" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.verified && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-bold text-green-500 uppercase tracking-widest">
                              <Shield size={10} /> Verified
                            </div>
                          )}
                          {currentUser?.id === userId && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleLike(post.id, true)}
                                className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-colors"
                              >
                                <ThumbsUp size={14} /> {post._count?.likes || 0}
                              </button>
                              <div className="w-px h-3 bg-white/5 mx-1" />
                              <button 
                                onClick={() => handleLike(post.id, false)}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                              >
                                <ThumbsDown size={14} />
                              </button>
                            </div>

                            <button 
                              onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                                expandedPostId === post.id ? 'text-primary' : 'text-gray-500 hover:text-white'
                              }`}
                            >
                              <MessageSquare size={14} /> {post._count?.comments || 0} Comments
                            </button>
                        </div>
                        <ShareButton 
                          url={`/user/${userId}?post=${post.id}`} 
                          title={`Check out this broadcast from ${userProfile.name || 'Anonymous'} on Icomly!`}
                          variant="ghost"
                          size="sm"
                        />
                      </div>

                      {expandedPostId === post.id && (
                        <div className="mt-6 pt-6 border-t border-white/5 animate-fade-in">
                          <CommentSection postId={post.id} />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {hasMorePosts && (
                    <Button 
                      variant="secondary" 
                      className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-xs" 
                      onClick={() => fetchPosts(true)}
                      disabled={loadingData}
                    >
                      {loadingData ? 'Synchronizing...' : 'Load More Posts'}
                    </Button>
                  )}
                </>
             )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="space-y-3 animate-fade-in">
            {followers.length === 0 && !loadingData ? (
                <div className="p-12 text-center bg-surface/20 rounded-3xl border border-white/5 text-gray-500 font-mono text-xs uppercase tracking-widest">
                  NO FOLLOWERS RECORDED
                </div>
            ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {followers.map((f) => (
                      <Link 
                        key={f.id} 
                        href={`/user/${f.id}`}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-surface/30 border border-white/5 hover:border-primary/30 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 flex-shrink-0">
                          {f.profilePath ? (
                            <img src={f.profilePath} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><UserIcon className="text-primary/40" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{f.name || 'Anonymous'}</h4>
                          <p className="text-[10px] text-gray-500 font-mono uppercase truncate">{f.role === 'pro' ? 'INSIDER' : 'OBSERVER'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {hasMoreFollowers && (
                    <Button 
                      variant="secondary" 
                      className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px]" 
                      onClick={() => fetchFollowers(true)}
                      disabled={loadingData}
                    >
                      {loadingData ? 'Retrieving...' : 'Load More'}
                    </Button>
                  )}
                </>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="space-y-3 animate-fade-in">
            {followingList.length === 0 && !loadingData ? (
                <div className="p-12 text-center bg-surface/20 rounded-3xl border border-white/5 text-gray-500 font-mono text-xs uppercase tracking-widest">
                  NOT TRACKING ANY TARGETS
                </div>
            ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {followingList.map((f) => (
                      <Link 
                        key={f.id} 
                        href={f.type === 'celebrity' ? `/celebrity/${f.id}` : `/user/${f.id}`}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-surface/30 border border-white/5 hover:border-primary/30 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 flex-shrink-0">
                          {f.profilePath ? (
                            <img src={f.profilePath} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><UserIcon className="text-primary/40" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{f.name || 'Anonymous'}</h4>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-primary font-mono uppercase">{f.type === 'celebrity' ? (f.category || 'CELEBRITY') : 'USER'}</span>
                             {f.type === 'celebrity' && <span className="text-[10px] text-gray-600 font-mono uppercase tracking-tighter">Noise: {f.noiseRating}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {hasMoreFollowing && (
                    <Button 
                      variant="secondary" 
                      className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px]" 
                      onClick={() => fetchFollowing(true)}
                      disabled={loadingData}
                    >
                      {loadingData ? 'Retrieving...' : 'Load More'}
                    </Button>
                  )}
                </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
