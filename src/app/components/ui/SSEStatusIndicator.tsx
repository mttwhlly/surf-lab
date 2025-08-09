'use client';

import { Wifi, WifiOff, Zap, CheckCircle2 } from 'lucide-react';

interface SSEStatusIndicatorProps {
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  method: 'sse' | 'react-query';
  className?: string;
}

export function SSEStatusIndicator({ 
  connectionState, 
  method, 
  className = '' 
}: SSEStatusIndicatorProps) {
  // Don't show for react-query fallback
  if (method !== 'sse') return null;

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          icon: Zap,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          text: 'Connecting...',
          description: 'Establishing real-time connection'
        };
      case 'connected':
        return {
          icon: CheckCircle2,
          color: 'text-green-600 bg-green-50 border-green-200',
          text: 'Live Updates',
          description: 'Real-time connection active'
        };
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          text: 'Connection Issue',
          description: 'Retrying connection...'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-600 bg-red-50 border-red-200',
          text: 'Disconnected',
          description: 'Using cached data'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${config.color} ${className}`}>
      <Icon className="w-3 h-3" />
      <span>{config.text}</span>
    </div>
  );
}