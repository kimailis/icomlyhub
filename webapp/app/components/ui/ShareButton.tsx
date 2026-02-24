'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Share2, Twitter, Facebook, Copy, Check, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  url, 
  title, 
  text, 
  variant = 'outline', 
  size = 'sm',
  showLabel = true,
  className = "",
  labelClassName = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setIsOpen(false);
  };

  const shareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full gap-2"
      >
        <Share2 size={size === 'sm' ? 14 : 18} />
        {showLabel && <span className={labelClassName}>Share</span>}
      </Button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button 
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          
          <div className="h-px bg-white/5 my-1" />
          
          <button 
            onClick={shareTwitter}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Twitter size={14} className="text-sky-400" />
            Share on X
          </button>
          
          <button 
            onClick={shareFacebook}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Facebook size={14} className="text-blue-500" />
            Share on Facebook
          </button>
        </div>
      )}
    </div>
  );
};
