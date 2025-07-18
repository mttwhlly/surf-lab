'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'status' | 'tide';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white/40 border-none relative overflow-hidden transition-transform duration-200',
        {
          'rounded-2xl p-5 text-center': variant === 'default',
          'rounded-3xl p-6 mb-8 text-center': variant === 'status',
          'rounded-3xl p-5 mb-8': variant === 'tide',

        },
        className
      )}
    >
      {children}
    </div>
  );
}