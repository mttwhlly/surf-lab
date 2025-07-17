import { Droplet } from 'lucide-react';
import { SurfData } from '../../types/surf';
import { DetailCard } from './DetailCard';

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
          <div 
            id="waveHeightBg"
            className="absolute inset-0 pointer-events-none"
          />
        }
      />
      
      <DetailCard
        label="Period"
        value={details?.wave_period_sec || '--'}
        unit="sec"
        loading={loading}
        visualBackground={
          <div 
            id="periodVisualContainer"
            className="period-visual-container absolute inset-0 overflow-hidden pointer-events-none"
          />
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
          <div 
            id="windLinesContainer"
            className="wind-lines-container absolute inset-0 overflow-hidden pointer-events-none"
          />
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
      >
        <Droplet strokeWidth={1} className="ml-2" />
      </DetailCard>
    </div>
  );
}