'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, role }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const interactiveProps = onClick ? {
    role: role || 'button',
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    className: `cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181b] ${className}`
  } : {
    className
  };

  return (
    <div 
      {...interactiveProps}
      onClick={onClick}
      className={`bg-surface border border-white/5 rounded-xl p-6 shadow-xl hover:border-white/10 transition-colors ${interactiveProps.className}`}
    >
      {children}
    </div>
  );
};