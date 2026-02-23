'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from '@/app/components/ui/Button';
import { MessageSquare, ThumbsUp, ThumbsDown, Send, User as UserIcon, Shield, Activity, Image as ImageIcon, X } from 'lucide-react';
import CommentSection from './CommentSection';
import { ShareButton } from '../ui/ShareButton';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  picPath: string | null;
  baseRating: number;
  verified: boolean;
  user: {
    id: string;
    name: string | null;
    profilePath: string | null;
  };
  _count: {
    comments: number;
    likes: number;
  };
}

interface PostWallProps {
  targetUserId?: string;
  targetCelebId?: string;
  title?: string;
}

export default function PostWall({ targetUserId, targetCelebId, title = "Community Wall" }: PostWallProps) {
  const { user, token } = useAuth();
  const { openAuthModal } = useUI();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isScoop, setIsScoop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetUserId) params.append('targetUserId', targetUserId);
      if (targetCelebId) params.append('targetCelebId', targetCelebId);
      params.append('limit', '10');

      if (isLoadMore && posts.length > 0) {
        params.append('cursor', posts[posts.length - 1].id);
      }

      const res = await fetch(`/api/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setPosts(prev => [...prev, ...data]);
          if (data.length < 10) setHasMore(false);
        } else {
          setPosts(data);
          setHasMore(data.length === 10);
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [targetUserId, targetCelebId]);

  // Infinite scroll observer
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !loading && hasMore) {
        fetchPosts(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, posts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      openAuthModal('login');
      return;
    }

    if (!newPost.trim() && !selectedImage) return;

    setSubmitting(true);
    try {
      let picPath = null;
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          picPath = url;
        }
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newPost,
          picPath,
          targetUserId,
          targetCelebId,
          isFeedCandidate: isScoop
        })
      });

      if (res.ok) {
        setNewPost('');
        setIsScoop(false);
        removeImage();
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isUpvote: boolean) => {
    if (!user || !token) {
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
        body: JSON.stringify({
          postId,
          isUpvote
        })
      });

      if (res.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-primary" size={20} /> {title}
        </h2>
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            Broadcasts: {posts.length}
        </span>
      </div>

      {/* Post Creation Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder={user ? "Write something for the wall..." : "Sign in to post on the wall"}
          className="w-full bg-surface/30 border border-white/5 rounded-3xl p-6 pr-16 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/30 transition-all resize-none min-h-[120px] shadow-2xl"
          onFocus={() => !user && openAuthModal('login')}
        />

        {previewUrl && (
          <div className="absolute top-6 right-20 w-16 h-16 rounded-xl overflow-hidden border border-white/10 group/preview shadow-xl">
            <img src={previewUrl} className="w-full h-full object-cover" />
            <button 
              type="button" 
              onClick={removeImage}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        )}
        
        <div className="absolute bottom-4 left-6 right-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="relative group/upload">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button type="button" className={`p-1.5 rounded-lg transition-all ${selectedImage ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    <ImageIcon size={18} />
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer group/scoop">
                    <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isScoop ? 'bg-primary border-primary' : 'bg-black/50 border-white/20 group-hover/scoop:border-primary/50'}`}>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isScoop}
                            onChange={(e) => setIsScoop(e.target.checked)}
                        />
                        {isScoop && <Shield size={12} className="text-white" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isScoop ? 'text-primary' : 'text-gray-500 group-hover/scoop:text-gray-400'}`}>
                        Report as Scoop
                    </span>
                </label>
                
                {isScoop && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-[8px] font-mono text-primary uppercase animate-pulse">
                        <Activity size={8} /> Verification Pipeline Active
                    </div>
                )}
            </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !newPost.trim()}
          className="absolute bottom-6 right-6 p-3 bg-primary text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </form>

      {/* Posts Feed */}
      <div className="space-y-6">
        {loading && posts.length === 0 ? (
          <div className="text-center py-12 text-gray-600 font-mono text-xs animate-pulse">SYNCHRONIZING_TRANSITIONS...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center bg-surface/20 rounded-3xl border border-white/5 text-gray-600 text-sm italic font-mono uppercase tracking-[0.2em]">
              The wall is currently silent.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="group p-6 rounded-3xl bg-surface/40 border border-white/5 hover:border-white/10 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    {post.user.profilePath ? (
                      <img src={post.user.profilePath} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={18} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{post.user.name || 'Anonymous'}</h4>
                    <span className="text-[10px] text-gray-500 font-mono">{new Date(post.createdAt).toLocaleDateString()} // GMT</span>
                  </div>
                </div>
                {post.verified && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-bold text-green-500 uppercase tracking-widest">
                    <Shield size={10} /> Verified
                  </div>
                )}
              </div>

              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                {post.content}
              </p>

              {post.picPath && (
                <div className="rounded-2xl overflow-hidden border border-white/5 max-h-96">
                  <img src={post.picPath} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleLike(post.id, true)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-colors"
                  >
                    <ThumbsUp size={14} /> {post._count.likes}
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
                  <MessageSquare size={14} /> {post._count.comments} Comments
                </button>

                <ShareButton 
                  url={targetCelebId ? `/celebrity/${targetCelebId}?post=${post.id}` : targetUserId ? `/user/${targetUserId}?post=${post.id}` : `/post/${post.id}`} 
                  title={`Check out this broadcast from ${post.user.name || 'Anonymous'} on Icomly!`}
                  variant="ghost"
                  size="sm"
                />
              </div>

              {/* Nested Comments */}
              {expandedPostId === post.id && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-fade-in">
                  <CommentSection postId={post.id} />
                </div>
              )}
            </div>
          ))
        )}
        
        {loading && posts.length > 0 && (
          <div className="py-8 text-center">
            <div className="inline-block p-4 rounded-full border-t-2 border-primary animate-spin" />
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-2">Loading_More_Intel...</p>
          </div>
        )}
        
        {!hasMore && posts.length > 0 && (
          <div className="py-12 text-center text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em]">
            End of Broadcast History
          </div>
        )}
      </div>
    </div>
  );
}
