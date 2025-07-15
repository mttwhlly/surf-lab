'use client';

import { SurfData } from '@/app/types/surf';
import { DetailCard } from './DetailCard';
import { SwellAnimation } from '../animations/SwellAnimation';
import { WindAnimation } from '../animations/WindAnimation';

interface SurfDetailsProps {
  data: SurfData | null;
  loading: boolean;
}

function DirectionArrow({ degrees }: { degrees: number }) {
  return (
    <span 
      className="direction-arrow inline-block ml-1.5 text-black font-semibold transition-all duration-300"
      style={{ transform: `rotate(${degrees + 90}deg)` }}
      title={`Direction: ${degrees}°`}
    >
      →
    </span>
  );
}

function WaveHeightBackground({ height }: { height: number }) {
  const percentage = Math.min(Math.max((height - 0.5) / 11.5, 0), 1);
  const fillHeight = Math.max(10, percentage * 90);
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `linear-gradient(to bottom, 
          transparent 0%, 
          transparent calc(${100 - fillHeight}% - 0.5px), 
          rgba(0, 0, 0, 1) calc(${100 - fillHeight}% - 0.5px), 
          rgba(0, 0, 0, 1) calc(${100 - fillHeight}% + 0.5px), 
          transparent calc(${100 - fillHeight}% + 0.5px), 
          transparent 100%)`
      }}
    />
  );
}

export function SurfDetails({ data, loading }: SurfDetailsProps) {
  const details = data?.details;

  return (
    <div className="details-grid grid grid-cols-2 gap-4 mb-8">
      <DetailCard
        label="Wave Height"
        value={details?.wave_height_ft || '--'}
        unit="ft"
        loading={loading}
        visualBackground={
          details?.wave_height_ft && !loading ? 
          <WaveHeightBackground height={details.wave_height_ft} /> : 
          undefined
        }
      />
      
      <DetailCard
        label="Period"
        value={details?.wave_period_sec || '--'}
        unit="sec"
        loading={loading}
        visualBackground={
          details?.wave_period_sec && details?.swell_direction_deg && !loading ? 
          <SwellAnimation 
            direction={details.swell_direction_deg}
            period={details.wave_period_sec}
            intensity={0.15 + ((Math.min(Math.max(details.wave_period_sec, 3), 20) - 3) / 17) * 0.25}
          /> : 
          undefined
        }
      >
        {details?.swell_direction_deg && !loading && (
          <DirectionArrow degrees={details.swell_direction_deg} />
        )}
      </DetailCard>
      
      <DetailCard
        label="Wind Speed"
        value={details?.wind_speed_kts ? Math.round(details.wind_speed_kts) : '--'}
        unit="kts"
        loading={loading}
        visualBackground={
          details?.wind_speed_kts && details?.wind_direction_deg && !loading ? 
          <WindAnimation 
            direction={details.wind_direction_deg}
            speed={details.wind_speed_kts}
            intensity={0.2 + (Math.min(Math.max(details.wind_speed_kts, 0), 40) / 40) * 0.6}
          /> : 
          undefined
        }
      >
        {details?.wind_direction_deg && !loading && (
          <DirectionArrow degrees={details.wind_direction_deg} />
        )}
      </DetailCard>
      
      <DetailCard
        label="Water"
        value={data?.weather?.water_temperature_f ? Math.round(data.weather.water_temperature_f) : '--'}
        unit="°F"
        loading={loading}
      />
    </div>
  );
}