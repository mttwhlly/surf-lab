'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SwellAnimationProps {
  direction: number;
  period: number;
  intensity?: number;
  className?: string;
}

export function SwellAnimation({ 
  direction, 
  period, 
  intensity = 0.3, 
  className = '' 
}: SwellAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const linesRef = useRef<Array<{ x: number; y: number; opacity: number }>>([]);
  const lastTimeRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Convert direction to radians
    const angleRad = ((direction + 90) * Math.PI) / 180;
    const speed = (Math.max(width, height) / period / 30) * 0.5;
    const spacing = Math.max(period * 800, 2000);

    // Add new line periodically
    const now = Date.now();
    if (now - lastTimeRef.current > spacing) {
      const margin = Math.max(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const offsetX = Math.cos(angleRad + Math.PI) * margin;
      const offsetY = Math.sin(angleRad + Math.PI) * margin;

      linesRef.current.push({
        x: centerX + offsetX,
        y: centerY + offsetY,
        opacity: intensity
      });
      lastTimeRef.current = now;
    }

    // Draw and update lines
    linesRef.current = linesRef.current.filter((line, i) => {
      const lineLength = Math.min(width, height) * 1.5;
      const dx = Math.cos(angleRad + Math.PI / 2) * lineLength;
      const dy = Math.sin(angleRad + Math.PI / 2) * lineLength;

      const fadeDistance = Math.max(width, height) * 0.7;
      const distanceFromCenter = Math.sqrt(
        Math.pow(line.x - width / 2, 2) + Math.pow(line.y - height / 2, 2)
      );
      const fadeFactor = Math.max(0, 1 - (distanceFromCenter / fadeDistance));
      const opacity = line.opacity * fadeFactor;

      if (opacity > 0.01) {
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(line.x - dx, line.y - dy);
        ctx.lineTo(line.x + dx, line.y + dy);
        ctx.stroke();
      }

      // Move line
      line.x += Math.cos(angleRad) * speed;
      line.y += Math.sin(angleRad) * speed;

      // Keep line if still in bounds
      const margin = Math.max(width, height);
      return line.x >= -margin && line.x <= width + margin && 
             line.y >= -margin && line.y <= height + margin;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [direction, period, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        const ctx = canvas.getContext('2d');
        ctx?.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ borderRadius: '15px' }}
    />
  );
}