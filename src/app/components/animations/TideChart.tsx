'use client';

import { useEffect, useRef, useMemo } from 'react';
import { SurfData } from '../../types/surf';

interface TideChartProps {
  tideData: SurfData['tides'];
  className?: string;
}

export function TideChart({ tideData, className = '' }: TideChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate tide phase with improved logic
  const tidePhase = useMemo(() => {
    if (!tideData) return { phase: 0, amplitude: 1, midHeight: 2, currentHeight: 2, isRising: false };

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

    // Determine tide direction based on which comes next
    let phase = 0;
    let isRising = false;
    
    const timeToNextHigh = nextHigh ? nextHigh.getTime() - now.getTime() : Infinity;
    const timeToNextLow = nextLow ? nextLow.getTime() - now.getTime() : Infinity;
    
    if (timeToNextHigh < timeToNextLow) {
      // Next event is HIGH - we're RISING
      isRising = true;
      
      if (prevLow && nextHigh) {
        const totalTime = nextHigh.getTime() - prevLow.getTime();
        const elapsedTime = now.getTime() - prevLow.getTime();
        const progress = Math.max(0, Math.min(1, elapsedTime / totalTime));
        
        // Phase: -π/2 (low) to π/2 (high)
        phase = (-Math.PI / 2) + (progress * Math.PI);
        
        console.log('🌊 RISING TIDE:', {
          from: prevLow.toLocaleTimeString(),
          to: nextHigh.toLocaleTimeString(),
          progress: (progress * 100).toFixed(1) + '%',
          phase: phase.toFixed(2),
          currentHeight: tideData.current_height_ft
        });
      }
    } else {
      // Next event is LOW - we're FALLING
      isRising = false;
      
      if (prevHigh && nextLow) {
        const totalTime = nextLow.getTime() - prevHigh.getTime();
        const elapsedTime = now.getTime() - prevHigh.getTime();
        const progress = Math.max(0, Math.min(1, elapsedTime / totalTime));
        
        // Phase: π/2 (high) to -π/2 (low)
        phase = (Math.PI / 2) - (progress * Math.PI);
        
        console.log('🌊 FALLING TIDE:', {
          from: prevHigh.toLocaleTimeString(),
          to: nextLow.toLocaleTimeString(),
          progress: (progress * 100).toFixed(1) + '%',
          phase: phase.toFixed(2),
          currentHeight: tideData.current_height_ft
        });
      }
    }

    return {
      phase,
      amplitude,
      midHeight,
      currentHeight: tideData.current_height_ft,
      isRising
    };
  }, [tideData]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tideData) return;

    // Clear previous content
    svg.innerHTML = '';

    const width = 1440; // 24 hours worth of pixels
    const height = 360;
    const verticalCenter = height / 2;
    const maxAmplitude = height * 0.35;

    // Debug: Log what we're about to draw
    console.log('🎨 Drawing tide chart:', {
      currentPhase: tidePhase.phase.toFixed(2),
      amplitude: tidePhase.amplitude.toFixed(1),
      midHeight: tidePhase.midHeight.toFixed(1),
      isRising: tidePhase.isRising,
      currentHeight: tidePhase.currentHeight
    });
    
    // Generate the tide curve
    let pathData = '';
    for (let x = 0; x <= width; x += 3) {
      // Center of chart (x = width/2) represents current time
      // Convert x position to hours relative to current time
      const hoursFromNow = ((x - (width / 2)) / width) * 24; // -12 to +12 hours
      
      // Calculate the wave phase at this time point
      // Use standard tidal period of 12.42 hours (lunar day / 2)
      const wavePhase = tidePhase.phase + (hoursFromNow * 2 * Math.PI) / 12.42;
      const tideHeight = tidePhase.midHeight + tidePhase.amplitude * Math.sin(wavePhase);
      
      // Convert to SVG coordinates (flip Y axis)
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
    const currentX = width / 2;
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

    // Add current height indicator (dot on the curve)
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

    // Add directional arrow to show tide direction
    const arrowSize = 8;
    const arrowX = currentX + 20;
    const arrowY = currentY;
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    if (tidePhase.isRising) {
      // Up arrow for rising tide
      arrow.setAttribute('points', `${arrowX},${arrowY - arrowSize} ${arrowX - arrowSize/2},${arrowY + arrowSize/2} ${arrowX + arrowSize/2},${arrowY + arrowSize/2}`);
      arrow.setAttribute('fill', '#22c55e'); // Green for rising
    } else {
      // Down arrow for falling tide
      arrow.setAttribute('points', `${arrowX},${arrowY + arrowSize} ${arrowX - arrowSize/2},${arrowY - arrowSize/2} ${arrowX + arrowSize/2},${arrowY - arrowSize/2}`);
      arrow.setAttribute('fill', '#ef4444'); // Red for falling
    }
    arrow.setAttribute('stroke', '#ffffff');
    arrow.setAttribute('stroke-width', '1');
    svg.appendChild(arrow);

    // Add time labels at key points if tide data is available
    if (tideData.next_high && tideData.next_low) {
      const now = new Date();
      
      // Calculate positions for next high and low
      const nextHigh = new Date(tideData.next_high.timestamp);
      const nextLow = new Date(tideData.next_low.timestamp);
      
      const hoursToHigh = (nextHigh.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hoursToLow = (nextLow.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Only show if within chart range (-12 to +12 hours)
      if (hoursToHigh >= -12 && hoursToHigh <= 12) {
        const highX = (width / 2) + (hoursToHigh / 24) * width;
        const highLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        highLabel.setAttribute('x', highX.toString());
        highLabel.setAttribute('y', '20');
        highLabel.setAttribute('text-anchor', 'middle');
        highLabel.setAttribute('font-size', '12');
        highLabel.setAttribute('font-weight', 'bold');
        highLabel.setAttribute('fill', '#000000');
        highLabel.textContent = `H ${tideData.next_high.time}`;
        svg.appendChild(highLabel);
      }
      
      if (hoursToLow >= -12 && hoursToLow <= 12) {
        const lowX = (width / 2) + (hoursToLow / 24) * width;
        const lowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lowLabel.setAttribute('x', lowX.toString());
        lowLabel.setAttribute('y', (height - 10).toString());
        lowLabel.setAttribute('text-anchor', 'middle');
        lowLabel.setAttribute('font-size', '12');
        lowLabel.setAttribute('font-weight', 'bold');
        lowLabel.setAttribute('fill', '#000000');
        lowLabel.textContent = `L ${tideData.next_low.time}`;
        svg.appendChild(lowLabel);
      }
    }

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