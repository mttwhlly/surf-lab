'use client';

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
    const reportTime = new Date(timestamp);
    return reportTime.toLocaleDateString('en-US', {
  year: "numeric",
  month: "short",
  day: "numeric",
}) + ' @ ' + reportTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ;
  };

  // Don't render anything if loading and no report
  if (loading && !report) {
    return (
<>
        <div className="h-4"></div>
          <div className="mb-12">
            <div className="h-6 bg-gray-200 rounded w-1/3 block mx-auto"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="h-4"></div>
          <div className="my-8"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="my-8">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
 </>
    );
  }

  // Don't render if no report and not loading
  if (!report && !loading) {
    return null;
  }

  return (

        <div className="prose prose-lg mb-6">
            <pre className="text-center pt-4 pb-8 uppercase text-gray-500 tracking-wide">{formatTimeAgo(report?.timestamp || '')}</pre>
          <p className="text-gray-800 leading-relaxed text-2xl md:text-3xl whitespace-pre-wrap">
            {report?.report || 'Loading surf report...'}
          </p>
        </div>

    
  );
}