'use client';

import { useMemo } from 'react';

interface WaveHeightVisualProps {
  waveHeight: number;
  className?: string;
}

export function WaveHeightVisual({ waveHeight, className = '' }: WaveHeightVisualProps) {
  const fillStyle = useMemo(() => {
    const minHeight = 0.5;
    const maxHeight = 12;
    
    // Clamp the wave height to reasonable bounds
    const clampedHeight = Math.min(Math.max(waveHeight, minHeight), maxHeight);
    
    // Calculate percentage (0-100)
    const percentage = (clampedHeight - minHeight) / (maxHeight - minHeight);
    const fillPercentage = Math.max(5, percentage * 100); // Minimum 5% visible
    
    // Calculate where the line should be (from bottom)
    const linePosition = 100 - fillPercentage;
    
    return {
      background: `linear-gradient(to bottom, 
        transparent 0%, 
        transparent ${linePosition - 0.1}%, 
        rgba(0, 0, 0, 1) ${linePosition}%, 
        rgba(0, 0, 0, 1) ${linePosition + 0.2}%, 
        transparent ${linePosition + 0.3}%, 
        transparent 100%)`
    };
  }, [waveHeight]);

  // Don't render if wave height is 0 or invalid
  if (!waveHeight || waveHeight <= 0) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={fillStyle}
      title={`Wave Height: ${waveHeight.toFixed(1)} ft`}
    />
  );
}