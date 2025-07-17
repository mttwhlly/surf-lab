'use client';

import { SurfData } from '../../types/surf';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';

interface WeatherCardProps {
  data: SurfData | null;
  loading: boolean;
}

const weatherIcons: { [key: number]: string } = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

export function WeatherCard({ data, loading }: WeatherCardProps) {
  const getWeatherIcon = (code: number | null) => {
    if (code === null) return '○';
    return weatherIcons[code] || '🌤️';
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
            <div className="weather-icon font-emoji text-2xl mr-4">
              {getWeatherIcon(data?.weather?.weather_code || null)}
            </div>
          </LoadingShimmer>
          <LoadingShimmer isLoading={loading}>
            <span>{data?.weather?.air_temperature_f ? Math.round(data.weather.air_temperature_f) : '--'}</span>
          </LoadingShimmer>
          <span className="temp-unit text-base opacity-70 ml-1">°F</span>
        </div>
      </div>
    </div>
  );
}