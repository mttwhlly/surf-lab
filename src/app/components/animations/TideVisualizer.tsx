'use client';

import { useEffect, useRef } from 'react';

interface TideVisualizerProps {
  currentHeight: number;
  state: string;
  nextHigh?: { time: string; height: number } | null;
  nextLow?: { time: string; height: number } | null;
  className?: string;
}

export function TideVisualizer({ 
  currentHeight, 
  state, 
  nextHigh, 
  nextLow, 
  className = '' 
}: TideVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear existing content
    svg.innerHTML = '';

    const width = 1440; // 24 hours in minutes
    const height = 120 * 9; // SVG height
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Create tide curve
    const generateTideCurve = () => {
      const verticalCenter = height / 2;
      const amplitude = (height * 0.35);
      
      // Simple sinusoidal tide curve
      let path = '';
      for (let x = 0; x <= width; x += 2) {
        const timeInHours = x / 60;
        const phase = (timeInHours * 2 * Math.PI) / 12.4; // 12.4 hour cycle
        const y = verticalCenter + amplitude * Math.sin(phase);
        
        if (x === 0) {
          path = `M ${x} ${y.toFixed(1)}`;
        } else {
          path += ` L ${x} ${y.toFixed(1)}`;
        }
      }
      return path;
    };

    // Create filled area
    const pathData = generateTideCurve();
    const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fillPath.setAttribute('d', pathData + ` L${width},${height} L0,${height} Z`);
    fillPath.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
    svg.appendChild(fillPath);

    // Create curve line
    const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curvePath.setAttribute('d', pathData);
    curvePath.setAttribute('fill', 'none');
    curvePath.setAttribute('stroke', 'rgba(0, 0, 0, 1)');
    curvePath.setAttribute('stroke-width', '1');
    curvePath.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(curvePath);

    // Add current time line
    const currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    currentLine.setAttribute('x1', currentMinutes.toString());
    currentLine.setAttribute('y1', '0');
    currentLine.setAttribute('x2', currentMinutes.toString());
    currentLine.setAttribute('y2', height.toString());
    currentLine.setAttribute('stroke', '#000000');
    currentLine.setAttribute('stroke-width', '1');
    currentLine.setAttribute('stroke-dasharray', '12,8');
    currentLine.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(currentLine);

  }, [currentHeight, state, nextHigh, nextLow]);

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full ${className}`}
      viewBox="0 0 1440 1080"
      preserveAspectRatio="none"
      style={{
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.05)',
        display: 'block',
      }}
    />
  );
}