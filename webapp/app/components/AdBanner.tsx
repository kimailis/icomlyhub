'use client';

import React, { useEffect } from 'react';

export const AdBanner: React.FC = () => {
  useEffect(() => {
    try {
      // Initialize the ad unit
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      // Silently catch errors if ads are blocked or script hasn't loaded yet
    }
  }, []);

  return (
    <div className="group relative bg-surface/40 border border-white/5 rounded-xl overflow-hidden min-h-[120px] w-full transition-all hover:border-white/10">
        {/* Ad Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/30" />
        
        <div className="px-4 py-1 flex justify-between items-center bg-black/20 border-b border-white/5">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sponsored Content</span>
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-blue-400/40" />
        </div>

        <div className="p-4 flex items-center justify-center min-h-[100px] overflow-hidden">
            {/* Google AdSense Unit */}
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%', textAlign: 'center' }}
                 data-ad-client="ca-pub-7873079521814069"
                 data-ad-slot="YOUR_AD_SLOT_HERE"
                 data-ad-format="fluid"
                 data-ad-layout-key="-fb+5w+4e-db+86"
                 data-full-width-responsive="true"></ins>
        </div>
    </div>
  );
};
