'use client';

import { MessageCircle, Clock, Waves, Wind, Thermometer } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';

interface SurfReport {
  id: string;
  timestamp: string;
  location: string;
  report: string;
  conditions: {
    wave_height_ft: number;
    wave_period_sec: number;
    wind_speed_kts: number;
    wind_direction_deg: number;
    tide_state: string;
    weather_description: string;
    surfability_score: number;
  };
  recommendations: {
    board_type: string;
    wetsuit_thickness?: string;
    skill_level: 'beginner' | 'intermediate' | 'advanced';
    best_spots?: string[];
    timing_advice?: string;
  };
  cached_until: string;
}

interface SurfReportCardProps {
  report: SurfReport | null;
  loading: boolean;
}

export function SurfReportCard({ report, loading }: SurfReportCardProps) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - reportTime.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  const getBoardEmoji = (boardType: string) => {
    if (!boardType) return '🏄‍♂️';
    
    const type = boardType.toLowerCase();
    if (type.includes('longboard')) return '🏄‍♂️';
    if (type.includes('shortboard')) return '🏄‍♀️';
    if (type.includes('funboard') || type.includes('mid-length')) return '🏄';
    return '🏄‍♂️';
  };

  // Don't render anything if loading and no report
  if (loading && !report) {
    return (
      <Card className="mb-8 text-left p-6">
        <LoadingShimmer isLoading={true}>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </LoadingShimmer>
      </Card>
    );
  }

  // Don't render if no report and not loading
  if (!report && !loading) {
    return null;
  }

  return (
    <Card className="mb-8 text-left p-6">

      <LoadingShimmer isLoading={loading}>
        <div className="prose prose-lg max-w-none mb-6">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {report?.report || 'Loading surf report...'}
          </p>
        </div>
      </LoadingShimmer>

    
    </Card>
  );
}