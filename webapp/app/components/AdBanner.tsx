'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export const AdBanner: React.FC = () => {
  return (
    <div className="group relative bg-surface/40 border border-white/5 rounded-xl overflow-hidden min-h-[100px] flex items-stretch">
        {/* Ad Indicator Strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50" />
        
        {/* Mock Image Area (To match feed item layout) */}
        <div className="p-4 pr-0 flex items-center">
            <div className="w-16 h-16 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent" />
                 <span className="text-[10px] font-bold text-yellow-500/80 tracking-widest uppercase rotate-[-15deg] border-2 border-yellow-500/50 px-1 py-0.5 rounded">Ad</span>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Sponsored</span>
                <span className="text-gray-600 text-[10px]">•</span>
                <span className="text-xs text-gray-500">Google Ads</span>
             </div>
             
             {/* Ad Script Placeholder */}
             <div className="w-full">
                {/* 
                  * INTEGRATION NOTE: 
                  * Replace the visual mock below with the actual Google AdSense code.
                  * The container styling ensures it fits the dimensions of the list item.
                  * 
                  * <ins className="adsbygoogle" ... ></ins>
                  */}
                 <div className="flex items-center justify-between gap-4">
                     <p className="text-gray-400 text-sm leading-tight truncate">
                         Discover premium brands tailored to your interests.
                     </p>
                     <ExternalLink size={14} className="text-gray-600 shrink-0" />
                 </div>
             </div>
        </div>
        
        {/* Ad Choice Icon */}
        <div className="absolute top-2 right-2 opacity-50">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-blue-400" />
        </div>
    </div>
  );
};