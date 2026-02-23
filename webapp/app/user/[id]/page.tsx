'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User as UserIcon, Calendar, MessageSquare, Shield, Users } from 'lucide-react';
import PostWall from '@/app/components/social/PostWall';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const { openAuthModal } = useUI();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/user/${params.id}`);
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

  useEffect(() => {
    fetchProfile();
  }, [params.id]);

  const handleFollow = async () => {
    if (!currentUser || !token) {
      openAuthModal('login');
      return;
    }

    setLoadingFollow(true);
    try {
      const res = await fetch(`/api/user/${params.id}/follow`, {
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-20">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Back
      </Button>

      {/* Profile Header */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface/20">
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {userProfile.profilePath ? (
              <img src={userProfile.profilePath} className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={48} className="text-primary" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                {userProfile.name || 'Anonymous User'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${userProfile.role === 'pro' ? 'bg-gradient-to-r from-primary to-secondary text-white border border-primary/30' : 'bg-gray-800 text-gray-400 border border-white/5'}`}>
                {userProfile.role === 'pro' ? 'INSIDER' : 'OBSERVER'}
              </span>
            </div>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed">
              {userProfile.bio || 'This user has not broadcasted a bio yet.'}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest pt-2">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {new Date(userProfile.createdAt).toLocaleDateString()}</span>
              <span>ID: {userProfile.id.substring(0, 8)}</span>
            </div>
          </div>

          {currentUser?.id !== userProfile.id && (
            <div className="w-full md:w-auto">
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 border-t border-white/10 bg-black/40">
          <div className="p-4 text-center border-r border-white/10">
            <div className="text-xl font-black text-white">{userProfile.postCount}</div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Broadcasts</div>
          </div>
          <div className="p-4 text-center border-r border-white/10">
            <div className="text-xl font-black text-white">{userProfile.followerCount}</div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Followers</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-xl font-black text-white">{userProfile.followingCount}</div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Following</div>
          </div>
        </div>
      </section>

      {/* Profile Wall */}
      <section className="bg-surface/10 rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl">
        <PostWall targetUserId={params.id} title={`${userProfile.name || 'User'}'s Wall`} />
      </section>
    </div>
  );
}
