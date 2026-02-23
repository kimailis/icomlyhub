'use client';

import React from 'react';
import { Zap, Target, Shield, Users, Activity } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUI } from '@/app/providers/UIProvider';

export default function AboutPage() {
  const { isAuthenticated } = useAuth();
  const { openAuthModal, openProfileModal } = useUI();

  const handleGoPro = () => {
    if (!isAuthenticated) {
      openAuthModal('register');
    } else {
      openProfileModal('subscription');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-16 animate-fade-in">
      <section className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase">
          THE <span className="text-primary">JUICE</span> IS REAL.
        </h1>
        <p className="text-xl text-gray-400 font-mono uppercase tracking-widest">
          ICOMLY // GLOBAL ENTERTAINMENT HUB
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface/30 border border-white/5 p-8 rounded-3xl space-y-4">
          <Zap className="text-primary" size={32} />
          <h2 className="text-2xl font-bold text-white">Our Mission</h2>
          <p className="text-gray-400 leading-relaxed">
            In an era of fragmented social media and endless noise, Icomly provides a unified destination for celebrity news. We aggregate real-time stories, sightings, and trends to give you the most accurate look at global celebrity influence.
          </p>
        </div>

        <div className="bg-surface/30 border border-white/5 p-8 rounded-3xl space-y-4">
          <Target className="text-accent" size={32} />
          <h2 className="text-2xl font-bold text-white">Latest Scoops</h2>
          <p className="text-gray-400 leading-relaxed">
            Our platform uses smart analysis to separate authentic news from the rumors. We track what's truly trending to help you stay ahead of the curve before stories hit the mainstream.
          </p>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-white text-center">How We Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-2">
            <Shield className="mx-auto text-primary" size={24} />
            <h3 className="font-bold text-white">Verified News</h3>
            <p className="text-xs text-gray-500">Every reported story is checked for quality and relevance.</p>
          </div>
          <div className="text-center space-y-2">
            <Users className="mx-auto text-primary" size={24} />
            <h3 className="font-bold text-white">Fan Community</h3>
            <p className="text-xs text-gray-500">A global community of dedicated fans and scoop hunters.</p>
          </div>
          <div className="text-center space-y-2">
            <Activity className="mx-auto text-primary" size={24} />
            <h3 className="font-bold text-white">Live Updates</h3>
            <p className="text-xs text-gray-500">Real-time entertainment updates delivered as they happen.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary/10 border border-primary/20 p-12 rounded-[3rem] text-center space-y-6">
        <h2 className="text-3xl font-black text-white italic">Ready for more juice?</h2>
        <p className="text-gray-300 max-w-lg mx-auto">
          Upgrade to Icomly Pro for exclusive insider data, early alerts, and deep historical insights.
        </p>
        <button 
          onClick={handleGoPro}
          className="bg-primary hover:bg-primary-hover text-white font-bold py-4 px-10 rounded-full transition-all shadow-xl shadow-primary/20"
        >
          GO PRO NOW
        </button>
      </section>
    </div>
  );
}