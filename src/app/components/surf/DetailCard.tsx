'use client';

import { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';

interface DetailCardProps {
  label: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
  children?: ReactNode;
  visualBackground?: ReactNode;
}

export function DetailCard({ 
  label, 
  value, 
  unit, 
  loading = false, 
  children,
  visualBackground 
}: DetailCardProps) {
  const displayValue = loading ? '--' : value;
  
  return (
    <Card className="hover:scale-105">
      {visualBackground && (
        <div className="detail-visual-bg absolute inset-0 pointer-events-none">
          {visualBackground}
        </div>
      )}
      
      <div className="detail-label text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">
        {label}
      </div>
      
      <LoadingShimmer isLoading={loading}>
        <div className="detail-value text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
          {displayValue}
          {unit && !loading && <span className="text-base opacity-70">{unit}</span>}
          {children}
        </div>
      </LoadingShimmer>
    </Card>
  );
}