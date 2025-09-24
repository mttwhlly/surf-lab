export interface SurfReport {
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
    
    // 🆕 Added compass direction fields
    swell_direction_deg?: number;
    swell_direction_compass?: string;
    swell_direction_text?: string;
    swell_direction_description?: string;
    wind_direction_compass?: string;
    wind_direction_text?: string;
    wind_direction_description?: string;
    
    // 🆕 Added additional fields from surfability API
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