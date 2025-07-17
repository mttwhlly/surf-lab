'use client';

import { Sun, CloudSun, Cloud, Cloudy, CloudFog, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, Zap } from 'lucide-react';
import { SurfData } from '../../types/surf';
import { LoadingShimmer } from '../ui/LoadingShimmer';

interface WeatherHeaderProps {
  data: SurfData | null;
  loading: boolean;
}

export function WeatherHeader({ data, loading }: WeatherHeaderProps) {
  const getWeatherIcon = (weatherCode: number | null) => {
    if (weatherCode === null || weatherCode === undefined) {
      return <Sun className="w-7 h-7" strokeWidth={1} />;
    }
    
    const iconProps = { className: "w-7 h-7", strokeWidth: 1 };
    
    switch (weatherCode) {
      case 0: return <Sun {...iconProps} />; // Clear sky
      case 1: return <CloudSun {...iconProps} />; // Mainly clear
      case 2: return <Cloud {...iconProps} />; // Partly cloudy
      case 3: return <Cloudy {...iconProps} />; // Overcast
      case 45:
      case 48: return <CloudFog {...iconProps} />; // Fog
      case 51:
      case 53: return <CloudDrizzle {...iconProps} />; // Drizzle
      case 55:
      case 61:
      case 63:
      case 65: return <CloudRain {...iconProps} />; // Rain
      case 56:
      case 57:
      case 66:
      case 67:
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86: return <CloudSnow {...iconProps} />; // Snow
      case 80:
      case 81: return <CloudRain {...iconProps} />; // Rain showers
      case 82: return <CloudLightning {...iconProps} />; // Heavy rain
      case 95:
      case 96:
      case 99: return <Zap {...iconProps} />; // Thunderstorm
      default: return <CloudSun {...iconProps} />;
    }
  };

  return (
    <div className="text-center mb-8">
      <LoadingShimmer isLoading={loading}>
        <div className="location text-2xl font-semibold mb-2">
          {data?.location || 'St. Augustine, FL'}
        </div>
      </LoadingShimmer>
      
      <div className="temp-item">
        <div className="temp-value flex justify-center items-center text-2xl font-semibold">
          <LoadingShimmer isLoading={loading}>
            <div className="weather-icon mr-4">
              {getWeatherIcon(data?.weather?.weather_code || null)}
            </div>
          </LoadingShimmer>
          <LoadingShimmer isLoading={loading}>
            <span>
              {data?.weather?.air_temperature_f ? 
                Math.round(data.weather.air_temperature_f) : 
                '--'
              }
            </span>
          </LoadingShimmer>
          <span className="temp-unit text-base opacity-70 ml-1">°F</span>
        </div>
      </div>
    </div>
  );
}