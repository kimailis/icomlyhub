'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from '@/app/components/ui/Button';
import { MessageSquare, ThumbsUp, ThumbsDown, Send, User as UserIcon, Shield } from 'lucide-react';
import CommentSection from './CommentSection';

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetUserId) params.append('targetUserId', targetUserId);
      if (targetCelebId) params.append('targetCelebId', targetCelebId);

      const res = await fetch(`/api/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      openAuthModal('login');
      return;
    }

    if (!newPost.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newPost,
          targetUserId,
          targetCelebId
        })
      });

      if (res.ok) {
        setNewPost('');
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
      </div>
    </div>
  );
}
