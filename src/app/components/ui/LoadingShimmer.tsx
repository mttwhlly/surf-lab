'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingShimmerProps {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function LoadingShimmer({ children, isLoading = false, className }: LoadingShimmerProps) {
  return (
    <div className={cn('relative', isLoading && 'loading-shimmer', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
      )}
    </div>
  );
}