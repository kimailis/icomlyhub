'use client';

import React, { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

interface RelativeTimeProps {
  date: string | Date | number;
  className?: string;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({ date, className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{formatRelativeTime(date)}</span>;
};
