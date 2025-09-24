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
    swell_direction_deg?: number;
    swell_direction_compass?: string;
    swell_direction_text?: string;
    swell_direction_description?: string;
    wind_direction_compass?: string;
    wind_direction_text?: string;
    wind_direction_description?: string;
    tide_height_ft?: number;
    water_temperature_c?: number;
    water_temperature_f?: number;
    air_temperature_c?: number;
    air_temperature_f?: number;
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

// Helper function to convert degrees to compass direction (fallback)
function degreesToCompass(degrees: number): string {
  if (degrees < 0 || degrees > 360) {
    degrees = ((degrees % 360) + 360) % 360;
  }
  
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function SurfReportCard({ report, loading }: SurfReportCardProps) {
  const formatTimeAgo = (timestamp: string) => {
    const reportTime = new Date(timestamp);
    return reportTime.toLocaleDateString('en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + ' @ ' + reportTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Get compass directions (use API data if available, fallback to calculation)
  const windCompass = report?.conditions.wind_direction_compass || 
                     degreesToCompass(report?.conditions.wind_direction_deg || 0);
  
  const swellCompass = report?.conditions.swell_direction_compass || 
                      (report?.conditions.swell_direction_deg ? 
                       degreesToCompass(report.conditions.swell_direction_deg) : null);

  // Create compass info to append to the AI report
  const getCompassInfo = () => {
    if (!report) return '';
    
    let compassInfo = `\n\n📊 Current readings: ${report.conditions.wave_height_ft}ft waves at ${report.conditions.wave_period_sec}s`;
    
    if (swellCompass && report.conditions.swell_direction_deg) {
      compassInfo += `, ${swellCompass} swell (${report.conditions.swell_direction_deg}°)`;
    }
    
    compassInfo += `, ${windCompass} wind at ${Math.round(report.conditions.wind_speed_kts)}kts (${report.conditions.wind_direction_deg}°)`;
    
    if (report.conditions.tide_height_ft) {
      compassInfo += `, ${report.conditions.tide_state.toLowerCase()} tide at ${report.conditions.tide_height_ft}ft`;
    } else {
      compassInfo += `, ${report.conditions.tide_state.toLowerCase()} tide`;
    }

    if (report.conditions.water_temperature_f) {
      compassInfo += `, ${report.conditions.water_temperature_f}°F water`;
    }
    
    return compassInfo;
  };

  return (
    <div className="prose prose-lg mb-6">
      <pre className="text-center pt-4 pb-8 uppercase text-gray-500 tracking-wide">
        {formatTimeAgo(report?.timestamp || '')}
      </pre>
      <p className="text-gray-800 leading-relaxed text-2xl md:text-3xl whitespace-pre-wrap">
        {report?.report || 'Loading surf report...'}
        {report && getCompassInfo()}
      </p>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && report && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer">Debug: Compass Data</summary>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
            Wind: {windCompass} ({report.conditions.wind_direction_deg}°){'\n'}
            Swell: {swellCompass || 'N/A'} ({report.conditions.swell_direction_deg || 'N/A'}°){'\n'}
            Wind Description: {report.conditions.wind_direction_description || 'N/A'}{'\n'}
            Swell Description: {report.conditions.swell_direction_description || 'N/A'}
          </pre>
        </details>
      )}
    </div>
  );
}