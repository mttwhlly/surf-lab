// Simple src/app/components/animations/TideChart.tsx
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { SurfData } from '../../types/surf';

interface TideChartProps {
  tideData: SurfData['tides'];
  className?: string;
}

export function TideChart({ tideData, className = '' }: TideChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate where we are in the tide cycle using actual tide times
  const tidePhase = useMemo(() => {
    if (!tideData) return { phase: 0, amplitude: 1, midHeight: 2, currentHeight: 2 };

    const now = new Date();
    
    // Parse tide times to get actual positions
    const nextHigh = tideData.next_high ? new Date(tideData.next_high.timestamp) : null;
    const nextLow = tideData.next_low ? new Date(tideData.next_low.timestamp) : null;
    const prevHigh = tideData.previous_high ? new Date(tideData.previous_high.timestamp) : null;
    const prevLow = tideData.previous_low ? new Date(tideData.previous_low.timestamp) : null;

    // Get tide range
    const highHeight = tideData.next_high?.height || tideData.previous_high?.height || 4.0;
    const lowHeight = tideData.next_low?.height || tideData.previous_low?.height || 0.5;
    const amplitude = (highHeight - lowHeight) / 2;
    const midHeight = (highHeight + lowHeight) / 2;

    // Determine which direction we're going based on which comes next
    let phase = 0;
    
    const timeToNextHigh = nextHigh ? nextHigh.getTime() - now.getTime() : Infinity;
    const timeToNextLow = nextLow ? nextLow.getTime() - now.getTime() : Infinity;
    
    if (timeToNextLow < timeToNextHigh) {
      // Next event is LOW - we're falling from previous high to next low
      if (prevHigh && nextLow) {
        const totalTime = nextLow.getTime() - prevHigh.getTime();
        const elapsedTime = now.getTime() - prevHigh.getTime();
        const progress = Math.max(0, Math.min(1, elapsedTime / totalTime)); // 0 = at high, 1 = at low
        
        // Phase: π/2 (high) to -π/2 (low)
        phase = (Math.PI / 2) - (progress * Math.PI);
        
        console.log('FALLING - Next event is LOW:', {
          prevHigh: prevHigh.toLocaleTimeString(),
          nextLow: nextLow.toLocaleTimeString(),
          now: now.toLocaleTimeString(),
          progress: (progress * 100).toFixed(1) + '%',
          phase: phase.toFixed(2),
          timeToLow: Math.round(timeToNextLow / (1000 * 60)) + ' minutes'
        });
      }
    } else {
      // Next event is HIGH - we're rising from previous low to next high
      if (prevLow && nextHigh) {
        const totalTime = nextHigh.getTime() - prevLow.getTime();
        const elapsedTime = now.getTime() - prevLow.getTime();
        const progress = Math.max(0, Math.min(1, elapsedTime / totalTime)); // 0 = at low, 1 = at high
        
        // Phase: -π/2 (low) to π/2 (high)
        phase = (-Math.PI / 2) + (progress * Math.PI);
        
        console.log('RISING - Next event is HIGH:', {
          prevLow: prevLow.toLocaleTimeString(),
          nextHigh: nextHigh.toLocaleTimeString(),
          now: now.toLocaleTimeString(),
          progress: (progress * 100).toFixed(1) + '%',
          phase: phase.toFixed(2),
          timeToHigh: Math.round(timeToNextHigh / (1000 * 60)) + ' minutes'
        });
      }
    }

    return {
      phase,
      amplitude,
      midHeight,
      currentHeight: tideData.current_height_ft
    };
  }, [tideData]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tideData) return;

    // Clear previous content
    svg.innerHTML = '';

    const width = 1440; // 24 hours
    const height = 360;
    const verticalCenter = height / 2;
    const maxAmplitude = height * 0.35;

    // Debug: Calculate where next tides should appear on chart
    const now = new Date();
    const nextLow = tideData.next_low ? new Date(tideData.next_low.timestamp) : null;
    const nextHigh = tideData.next_high ? new Date(tideData.next_high.timestamp) : null;
    
    if (nextLow) {
      const hoursToLow = (nextLow.getTime() - now.getTime()) / (1000 * 60 * 60);
      const lowX = (width / 2) + (hoursToLow / 24) * width;
      console.log(`Next LOW at ${nextLow.toLocaleTimeString()} should appear at X=${lowX.toFixed(0)} (${hoursToLow.toFixed(1)} hours from now)`);
    }
    
    if (nextHigh) {
      const hoursToHigh = (nextHigh.getTime() - now.getTime()) / (1000 * 60 * 60);
      const highX = (width / 2) + (hoursToHigh / 24) * width;
      console.log(`Next HIGH at ${nextHigh.toLocaleTimeString()} should appear at X=${highX.toFixed(0)} (${hoursToHigh.toFixed(1)} hours from now)`);
    }
    let pathData = '';
    for (let x = 0; x <= width; x += 3) {
      // Center of chart (x = width/2) represents current time
      // Convert x position to hours relative to current time
      const hoursFromNow = ((x - (width / 2)) / width) * 24; // -12 to +12 hours
      
      // Calculate the wave phase at this time point
      // Current phase represents where we are NOW in the tidal cycle
      const wavePhase = tidePhase.phase + (hoursFromNow * 2 * Math.PI) / 12.42;
      const tideHeight = tidePhase.midHeight + tidePhase.amplitude * Math.sin(wavePhase);
      
      // Convert to SVG coordinates
      const normalizedHeight = (tideHeight - tidePhase.midHeight) / tidePhase.amplitude;
      const y = verticalCenter - (normalizedHeight * maxAmplitude);
      
      if (x === 0) {
        pathData = `M ${x} ${y.toFixed(2)}`;
      } else {
        pathData += ` L ${x} ${y.toFixed(2)}`;
      }
    }

    // Create fill area under the curve
    const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fillPath.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
    fillPath.setAttribute('d', `${pathData} L ${width} ${height} L 0 ${height} Z`);
    svg.appendChild(fillPath);

    // Create the tide curve line
    const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curvePath.setAttribute('fill', 'none');
    curvePath.setAttribute('stroke', 'rgba(0, 0, 0, 1)');
    curvePath.setAttribute('stroke-width', '2');
    curvePath.setAttribute('vector-effect', 'non-scaling-stroke');
    curvePath.setAttribute('d', pathData);
    svg.appendChild(curvePath);

    // Add current time indicator (vertical dashed line at center)
    const currentX = width / 2; // Center of chart is "now"
    const currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    currentLine.setAttribute('stroke', '#000000');
    currentLine.setAttribute('stroke-width', '1.5');
    currentLine.setAttribute('stroke-dasharray', '8,4');
    currentLine.setAttribute('vector-effect', 'non-scaling-stroke');
    currentLine.setAttribute('x1', currentX.toString());
    currentLine.setAttribute('y1', '0');
    currentLine.setAttribute('x2', currentX.toString());
    currentLine.setAttribute('y2', height.toString());
    currentLine.setAttribute('opacity', '0.8');
    svg.appendChild(currentLine);

    // Add current height indicator (small circle)
    const currentNormalizedHeight = (tidePhase.currentHeight - tidePhase.midHeight) / tidePhase.amplitude;
    const currentY = verticalCenter - (currentNormalizedHeight * maxAmplitude);
    
    const currentDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    currentDot.setAttribute('cx', currentX.toString());
    currentDot.setAttribute('cy', currentY.toString());
    currentDot.setAttribute('r', '4');
    currentDot.setAttribute('fill', '#000000');
    currentDot.setAttribute('stroke', '#ffffff');
    currentDot.setAttribute('stroke-width', '2');
    svg.appendChild(currentDot);

  }, [tideData, tidePhase]);

  if (!tideData) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <span className="text-sm opacity-50">No tide data</span>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full ${className}`}
      viewBox="0 0 1440 360"
      preserveAspectRatio="none"
      style={{ 
        background: 'transparent',
        borderRadius: '10px'
      }}
    />
  );
}