'use client';

import { MessageCircle, Clock, Waves, Wind, Thermometer } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';
import { SurfReport } from '../../types/surf-report';

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
    const type = boardType.toLowerCase();
    if (type.includes('longboard')) return '🏄‍♂️';
    if (type.includes('shortboard')) return '🏄‍♀️';
    if (type.includes('funboard')) return '🏄';
    return '🏄‍♂️';
  };

  return (
    <Card className="mb-8 text-left p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
        <h2 className="text-xl font-bold">Today's Surf Report</h2>
        {report && (
          <div className="flex items-center gap-1 text-sm text-gray-600 ml-auto">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
            {formatTimeAgo(report.timestamp)}
          </div>
        )}
      </div>

      <LoadingShimmer isLoading={loading}>
        <div className="prose prose-lg max-w-none mb-6">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {report?.report || 'Loading surf report...'}
          </p>
        </div>
      </LoadingShimmer>

      {report && !loading && (
        <div className="space-y-4">
          {/* Recommendations */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-900">Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getBoardEmoji(report.recommendations.board_type)}</span>
                <span className="font-medium">{report.recommendations.board_type}</span>
              </div>
              
              {report.recommendations.wetsuit_thickness && (
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                  <span>{report.recommendations.wetsuit_thickness} wetsuit</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                  {report.recommendations.skill_level}
                </span>
              </div>
            </div>

            {report.recommendations.timing_advice && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Best timing:</strong> {report.recommendations.timing_advice}
                </p>
              </div>
            )}
          </div>

          {/* Current Conditions Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <Waves className="w-5 h-5 mx-auto mb-1 text-blue-600" strokeWidth={1.5} />
              <div className="text-sm text-gray-600">Waves</div>
              <div className="font-semibold">{report.conditions.wave_height_ft} ft</div>
            </div>
            
            <div className="text-center">
              <Wind className="w-5 h-5 mx-auto mb-1 text-gray-600" strokeWidth={1.5} />
              <div className="text-sm text-gray-600">Wind</div>
              <div className="font-semibold">{Math.round(report.conditions.wind_speed_kts)} kts</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-600">Score</div>
              <div className="font-semibold text-lg">{report.conditions.surfability_score}/100</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}