'use client';

import { Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface DataFreshnessIndicatorProps {
  freshness: 'fresh' | 'recent' | 'stale' | 'old' | null;
  reportAge: number | null; // minutes
  nextUpdate: Date | null;
  isRefetching: boolean;
}

export function DataFreshnessIndicator({ 
  freshness, 
  reportAge, 
  nextUpdate, 
  isRefetching 
}: DataFreshnessIndicatorProps) {
  if (!freshness || !reportAge) return null;

  const getFreshnessConfig = () => {
    switch (freshness) {
      case 'fresh':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Fresh',
          description: `Updated ${reportAge} minutes ago`
        };
      case 'recent':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Recent',
          description: `Updated ${reportAge} minutes ago`
        };
      case 'stale':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Getting Stale',
          description: `Updated ${Math.floor(reportAge / 60)}h ${reportAge % 60}m ago`
        };
      case 'old':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Outdated',
          description: `Updated ${Math.floor(reportAge / 60)}h ${reportAge % 60}m ago`
        };
      default:
        return null;
    }
  };

  const config = getFreshnessConfig();
  if (!config) return null;

  const Icon = config.icon;

  const formatNextUpdate = () => {
    if (!nextUpdate) return '';
    
    const now = new Date();
    const hoursUntil = Math.ceil((nextUpdate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntil <= 1) return 'within the hour';
    if (hoursUntil <= 24) return `in ${hoursUntil} hours`;
    return 'tomorrow morning';
  };

  return (
    <div className={`mb-4 p-3 flex justify-between`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRefetching ? (
            <RefreshCw className={`w-4 h-4 ${config.color} animate-spin`} />
          ) : (
            <Icon className={`w-4 h-4 ${config.color}`} />
          )}
          <span className={`text-sm font-medium ${config.color}`}>
            {isRefetching ? 'Refreshing...' : config.label}
          </span>
          <span className="text-xs text-gray-600">
            {config.description}
          </span>
        </div>
        
        {nextUpdate && !isRefetching && (
          <span className="text-xs text-gray-500">
            Next update {formatNextUpdate()}
          </span>
        )}
      </div>
    </div>
  );
}