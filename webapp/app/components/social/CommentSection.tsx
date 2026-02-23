'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from '@/app/components/ui/Button';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, User as UserIcon } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    profilePath: string | null;
  };
  _count: {
    likes: number;
  };
}

interface CommentSectionProps {
  postId?: string;
  articleId?: string;
  sightingId?: string;
}

export default function CommentSection({ postId, articleId, sightingId }: CommentSectionProps) {
  const { user, token } = useAuth();
  const { openAuthModal } = useUI();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (postId) params.append('postId', postId);
      if (articleId) params.append('articleId', articleId);
      if (sightingId) params.append('sightingId', sightingId);

      const res = await fetch(`/api/comments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, articleId, sightingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      openAuthModal('login');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment,
          postId,
          articleId,
          sightingId
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string, isUpvote: boolean) => {
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
          commentId,
          isUpvote
        })
      });

      if (res.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
        <MessageSquare size={16} className="text-primary" /> 
        Comments ({comments.length})
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Write a comment..." : "Sign in to join the conversation"}
          className="w-full bg-surface/30 border border-white/10 rounded-2xl p-4 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors resize-none min-h-[100px]"
          onFocus={() => !user && openAuthModal('login')}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="absolute bottom-4 right-4 p-2 bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Comment List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs font-mono animate-pulse">LOADING_DATA...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 bg-surface/20 rounded-2xl border border-white/5 text-gray-600 text-xs italic font-mono uppercase tracking-widest">
            No transmissions yet
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4 rounded-2xl bg-surface/30 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    {comment.user.profilePath ? (
                      <img src={comment.user.profilePath} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={12} className="text-primary" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-300">{comment.user.name || 'Anonymous User'}</span>
                </div>
                <span className="text-[10px] text-gray-600 font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{comment.content}</p>
              <div className="flex items-center gap-4 pt-1">
                <button 
                  onClick={() => handleLike(comment.id, true)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-primary transition-colors"
                >
                  <ThumbsUp size={12} /> {comment._count.likes}
                </button>
                <button 
                  onClick={() => handleLike(comment.id, false)}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
