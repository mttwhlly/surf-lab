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
    <div className="grid grid-cols-2 gap-4 mb-8">
      <DetailCard
        label="Wave Height"
        value={details?.wave_height_ft || '--'}
        unit="ft"
        loading={loading}
        animationType="wave-height"
        animationProps={{ 
          waveHeight: details?.wave_height_ft || 0 
        }}
      />
      
      <DetailCard
        label="Period"
        value={details?.wave_period_sec || '--'}
        unit="sec"
        loading={loading}
        animationType="swell"
        animationProps={{ 
          direction: details?.swell_direction_deg || 90,
          period: details?.wave_period_sec || 8,
          intensity: 0.2
        }}
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
        animationType="wind"
        animationProps={{
          direction: details?.wind_direction_deg || 0,
          speed: details?.wind_speed_kts || 5,
          intensity: 0.3
        }}
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
        animationType="none"
      >
        <Droplet strokeWidth={1} className="ml-2" />
      </DetailCard>
    </div>
  );
}