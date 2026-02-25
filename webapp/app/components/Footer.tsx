'use client';

import React from 'react';
import Link from 'next/link';
import { useUI } from '@/app/providers/UIProvider';

export const Footer: React.FC = () => {
  const { openAuthModal, openProfileModal } = useUI();

  return (
    <footer className="w-full bg-black/40 border-t border-white/5 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="iComly Logo" className="w-6 h-6 object-contain" />
              <span className="text-xl font-black text-white tracking-tighter"><span className="text-primary">i</span>Comly</span>
            </div>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
              Your real-time destination for celebrity news, sightings, and global entertainment trends. 
              We bring you the stories that matter.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Navigation</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-500 hover:text-primary text-sm transition-colors">The Feed</Link></li>
              <li><Link href="/sightings" className="text-gray-500 hover:text-primary text-sm transition-colors">Star Map</Link></li>
              <li><button onClick={() => openProfileModal()} className="text-gray-500 hover:text-primary text-sm transition-colors text-left">Your Profile</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Support</h4>
            <ul className="space-y-2">
              <li><button onClick={() => openAuthModal('privacy')} className="text-gray-500 hover:text-primary text-sm transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => openAuthModal('terms')} className="text-gray-500 hover:text-primary text-sm transition-colors text-left">Terms of Service</button></li>
              <li><button onClick={() => openAuthModal('contact')} className="text-gray-500 hover:text-primary text-sm transition-colors text-left">Contact Us</button></li>
              <li><Link href="/about" className="text-gray-500 hover:text-primary text-sm transition-colors">About iComly</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono uppercase">
            &copy; 2026 <span className="text-primary">i</span>COMLY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-gray-700 font-mono tracking-widest uppercase">Verified News Source</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
