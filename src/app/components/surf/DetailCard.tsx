'use client';

import { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';
import { SwellAnimation } from '../animations/SwellAnimation';
import { WindAnimation } from '../animations/WindAnimation';
import { WaveHeightVisual } from '../animations/WaveHeightVisual';

interface DetailCardProps {
  label: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
  children?: ReactNode;
  
  // NEW: Add animation props
  animationType?: 'wave-height' | 'swell' | 'wind' | 'none';
  animationProps?: {
    waveHeight?: number;
    direction?: number;
    period?: number;
    speed?: number;
    intensity?: number;
  };
}

export function DetailCard({ 
  label, 
  value, 
  unit, 
  loading = false, 
  children,
  animationType = 'none',
  animationProps = {}
}: DetailCardProps) {
  const displayValue = loading ? '--' : value;
  
  const renderAnimation = () => {
    if (loading || animationType === 'none') return null;

    switch (animationType) {
      case 'wave-height':
        // Make sure we pass a valid number
        const waveHeight = typeof animationProps.waveHeight === 'number' ? 
          animationProps.waveHeight : 0;
        
        return waveHeight > 0 ? (
          <WaveHeightVisual 
            waveHeight={waveHeight}
            className="absolute inset-0 pointer-events-none z-0"
          />
        ) : null;
        
      case 'swell':
        return (
          <SwellAnimation
            direction={animationProps.direction || 90}
            period={animationProps.period || 8}
            intensity={animationProps.intensity || 0.2}
            className="absolute inset-0 pointer-events-none z-0"
          />
        );
        
      case 'wind':
        return (
          <WindAnimation
            direction={animationProps.direction || 0}
            speed={animationProps.speed || 5}
            intensity={animationProps.intensity || 0.3}
            className="absolute inset-0 pointer-events-none z-0"
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="hover:scale-105 relative overflow-hidden">
      {renderAnimation()}
      
      <div className="dtext-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">
        {label}
      </div>
      
      <LoadingShimmer isLoading={loading}>
        <div className="text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
          {displayValue}
          {unit && !loading && <span className="text-base opacity-70">{unit}</span>}
          {children}
        </div>
      </LoadingShimmer>
    </Card>
  );
}