export interface SurfData {
  location: string;
  timestamp: string;
  surfable: boolean;
  rating: string;
  score: number;
  goodSurfDuration: string;
  details: {
    wave_height_ft: number;
    wave_period_sec: number;
    swell_direction_deg: number;
    wind_direction_deg: number;
    wind_speed_kts: number;
    tide_state: string;
    tide_height_ft: number;
    data_source: string;
  };
  weather: {
    air_temperature_c: number;
    air_temperature_f: number;
    water_temperature_c: number;
    water_temperature_f: number;
    weather_code: number;
    weather_description: string;
  };
  tides: {
    current_height_ft: number;
    state: string;
    next_high: { time: string; height: number; timestamp: string } | null;
    next_low: { time: string; height: number; timestamp: string } | null;
    previous_high: { time: string; height: number; timestamp: string } | null;
    previous_low: { time: string; height: number; timestamp: string } | null;
    station: string;
  };
}