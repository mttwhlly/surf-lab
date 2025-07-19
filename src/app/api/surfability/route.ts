import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Types
interface SurfData {
  waveHeight: number;
  wavePeriod: number;
  swellDirection: number;
  windDirection: number;
  windSpeed: number;
  tide: string;
  tideHeight?: number;
}

interface WeatherData {
  airTemperature: number;
  waterTemperature: number;
  weatherCode: number;
  weatherDescription: string;
}

interface TideData {
  currentHeight: number;
  state: string;
  nextHigh: { time: string; height: number; timestamp: string } | null;
  nextLow: { time: string; height: number; timestamp: string } | null;
  previousHigh: { time: string; height: number; timestamp: string } | null;
  previousLow: { time: string; height: number; timestamp: string } | null;
}

interface HourlyForecast {
  time: string;
  wave_height: number;
  wave_period: number;
  swell_direction: number;
  wind_speed: number;
  wind_direction: number;
}

// Weather code descriptions
const weatherDescriptions: { [key: number]: string } = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

// Surf rating phrases
const surfRatings = {
  excellent: ["Epic", "Firing", "Going Off", "Pumping", "Primo", "Cranking"],
  good: ["Fun", "Solid", "Decent", "Surfable", "Worth It", "Rideable"],
  marginal: ["Marginal", "Questionable", "Sketchy", "Iffy", "Meh", "Barely"],
  poor: ["Flat", "Blown Out", "Junk", "Trash", "Hopeless", "Netflix Day"]
};

function getRandomRating(category: keyof typeof surfRatings): string {
  const options = surfRatings[category];
  return options[Math.floor(Math.random() * options.length)];
}

function calculateSurfability(data: SurfData) {
  let score = 0;
  
  // Wave height scoring
  if (data.waveHeight >= 2 && data.waveHeight <= 8) {
    score += 25;
  } else if (data.waveHeight >= 1.5 && data.waveHeight < 2) {
    score += 15;
  }
  
  // Wave period scoring
  if (data.wavePeriod >= 10) {
    score += 25;
  } else if (data.wavePeriod >= 7) {
    score += 20;
  } else if (data.wavePeriod >= 5) {
    score += 10;
  }
  
  // Swell direction scoring
  if (data.swellDirection >= 45 && data.swellDirection <= 135) {
    score += 20;
  } else if (data.swellDirection >= 30 && data.swellDirection <= 150) {
    score += 10;
  }
  
  // Wind scoring
  if (data.windSpeed < 5) {
    score += 15;
  } else if (data.windDirection >= 225 && data.windDirection <= 315) {
    if (data.windSpeed <= 15) score += 20;
    else score += 10;
  } else if (data.windSpeed < 10) {
    score += 10;
  }
  
  // Tide scoring
  if (data.tide === 'Mid' || data.tide === 'Rising' || data.tide === 'Falling') {
    score += 10;
  }
  
  if (data.tideHeight !== undefined) {
    if (data.tideHeight >= 0.5 && data.tideHeight <= 2.5) {
      score += 5;
    }
  }

  let rating: string;
  let funRating: string;
  
  if (score >= 80) {
    rating = 'Excellent';
    funRating = getRandomRating('excellent');
  } else if (score >= 65) {
    rating = 'Good';
    funRating = getRandomRating('good');
  } else if (score >= 45) {
    rating = 'Marginal';
    funRating = getRandomRating('marginal');
  } else {
    rating = 'Poor';
    funRating = getRandomRating('poor');
  }

  return {
    score,
    surfable: score >= 45,
    rating,
    funRating,
  };
}

// NEW: Fixed tide state calculation function
function calculateTideState(
  currentHeight: number,
  nextHigh: { time: string; height: number; timestamp: string } | null,
  nextLow: { time: string; height: number; timestamp: string } | null,
  previousHigh: { time: string; height: number; timestamp: string } | null,
  previousLow: { time: string; height: number; timestamp: string } | null
): string {
  const now = new Date();
  
  // Convert timestamps to Date objects for comparison
  const nextHighTime = nextHigh ? new Date(nextHigh.timestamp) : null;
  const nextLowTime = nextLow ? new Date(nextLow.timestamp) : null;
  
  // Determine what comes next: high or low tide
  let timeToNextHigh = nextHighTime ? nextHighTime.getTime() - now.getTime() : Infinity;
  let timeToNextLow = nextLowTime ? nextLowTime.getTime() - now.getTime() : Infinity;
  
  // If we have both, see which is sooner
  if (nextHighTime && nextLowTime) {
    if (timeToNextHigh < timeToNextLow) {
      // Next event is HIGH tide - we're currently RISING
      const range = nextHigh && previousLow ? Math.abs(nextHigh.height - previousLow.height) : 3;
      const midPoint = nextHigh && previousLow ? (nextHigh.height + previousLow.height) / 2 : currentHeight;
      
      if (Math.abs(currentHeight - midPoint) < range * 0.25) {
        return 'Mid Rising';
      } else if (currentHeight < midPoint) {
        return 'Low Rising';
      } else {
        return 'High Rising';
      }
    } else {
      // Next event is LOW tide - we're currently FALLING
      const range = previousHigh && nextLow ? Math.abs(previousHigh.height - nextLow.height) : 3;
      const midPoint = previousHigh && nextLow ? (previousHigh.height + nextLow.height) / 2 : currentHeight;
      
      if (Math.abs(currentHeight - midPoint) < range * 0.25) {
        return 'Mid Falling';
      } else if (currentHeight > midPoint) {
        return 'High Falling';
      } else {
        return 'Low Falling';
      }
    }
  }
  
  // Fallback logic if we only have one tide prediction
  if (nextHighTime && timeToNextHigh < 6 * 60 * 60 * 1000) { // Within 6 hours
    return currentHeight > 1.5 ? 'High Rising' : 'Rising';
  } else if (nextLowTime && timeToNextLow < 6 * 60 * 60 * 1000) { // Within 6 hours
    return currentHeight < 1.0 ? 'Low Falling' : 'Falling';
  }
  
  // Final fallback
  return currentHeight > 2.0 ? 'High' : currentHeight < 1.0 ? 'Low' : 'Mid';
}

async function fetchTideData(): Promise<TideData> {
  try {
    const stationId = '8720587'; // St. Augustine Beach, FL
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    const currentUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${stationId}&product=water_level&datum=MLLW&time_zone=lst_ldt&units=english&application=SurfLab&format=json`;
    const predictionsUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDate(yesterday)}&end_date=${formatDate(tomorrow)}&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&application=SurfLab&format=json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const [currentRes, predictionsRes] = await Promise.all([
      fetch(currentUrl, { signal: controller.signal }),
      fetch(predictionsUrl, { signal: controller.signal })
    ]);
    
    clearTimeout(timeoutId);
    
    let currentHeight = 0;
    let nextHigh: { time: string; height: number; timestamp: string } | null = null;
    let nextLow: { time: string; height: number; timestamp: string } | null = null;
    let previousHigh: { time: string; height: number; timestamp: string } | null = null;
    let previousLow: { time: string; height: number; timestamp: string } | null = null;
    
    // Parse current height
    if (currentRes.ok) {
      const currentData = await currentRes.json();
      if (currentData.data && currentData.data.length > 0) {
        currentHeight = parseFloat(currentData.data[0].v);
      }
    }
    
    // Parse predictions
    if (predictionsRes.ok) {
      const predictionsData = await predictionsRes.json();
      if (predictionsData.predictions && predictionsData.predictions.length > 0) {
        const now = new Date();
        
        const allPredictions = predictionsData.predictions.map((p: any) => ({
          ...p,
          time: new Date(p.t),
          parsedHeight: parseFloat(p.v),
          timestamp: p.t // Keep original timestamp string
        }));
        
        // Separate past and future predictions
        const pastPredictions = allPredictions.filter((p: any) => p.time < now);
        const futurePredictions = allPredictions.filter((p: any) => p.time >= now);
        
        // Find ACTUAL previous tides (from past)
        for (let i = pastPredictions.length - 1; i >= 0; i--) {
          const prediction = pastPredictions[i];
          
          if (prediction.type === 'H' && !previousHigh) {
            previousHigh = {
              time: prediction.t,
              height: prediction.parsedHeight,
              timestamp: prediction.timestamp
            };
          } else if (prediction.type === 'L' && !previousLow) {
            previousLow = {
              time: prediction.t,
              height: prediction.parsedHeight,
              timestamp: prediction.timestamp
            };
          }
          
          if (previousHigh && previousLow) break;
        }
        
        // Find next tides (from future)
        for (const prediction of futurePredictions) {
          if (prediction.type === 'H' && !nextHigh) {
            nextHigh = {
              time: prediction.t,
              height: prediction.parsedHeight,
              timestamp: prediction.timestamp
            };
          } else if (prediction.type === 'L' && !nextLow) {
            nextLow = {
              time: prediction.t,
              height: prediction.parsedHeight,
              timestamp: prediction.timestamp
            };
          }
          
          if (nextHigh && nextLow) break;
        }
      }
    }
    
    // Use the NEW tide state calculation
    const state = calculateTideState(currentHeight, nextHigh, nextLow, previousHigh, previousLow);
    
    // Fallback current height
    if (currentHeight === 0) {
      if (nextHigh && nextLow) {
        currentHeight = (nextHigh.height + nextLow.height) / 2;
      } else {
        currentHeight = 1.5;
      }
    }
    
    console.log('🌊 Tide Debug:', {
      currentHeight,
      state,
      nextHigh: nextHigh?.time,
      nextLow: nextLow?.time,
      previousHigh: previousHigh?.time,
      previousLow: previousLow?.time
    });
    
    return {
      currentHeight,
      state,
      nextHigh,
      nextLow,
      previousHigh,
      previousLow
    };
    
  } catch (error) {
    console.error('Error fetching tide data:', error);
    return {
      currentHeight: 1.5,
      state: 'Mid',
      nextHigh: null,
      nextLow: null,
      previousHigh: null,
      previousLow: null
    };
  }
}

export async function GET() {
  try {
    // Fetch tide data
    const tideData = await fetchTideData();
    
    // Fetch marine data
    const marineRes = await fetch(
      'https://api.open-meteo.com/v1/marine?latitude=29.9&longitude=-81.3&hourly=wave_height,wave_period,swell_wave_direction,sea_surface_temperature&current=sea_surface_temperature',
      { signal: AbortSignal.timeout(8000) }
    );
    
    const marineData = marineRes.ok ? await marineRes.json() : null;
    
    // Fetch weather data
    const weatherRes = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=29.9&longitude=-81.3&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&hourly=wind_speed_10m,wind_direction_10m&timezone=America/New_York&forecast_days=2',
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!weatherRes.ok) {
      throw new Error(`Weather API returned ${weatherRes.status}`);
    }
    
    const weatherData = await weatherRes.json();
    
    // Extract current conditions
    const waveHeight = marineData?.hourly?.wave_height?.[0] ? 
      marineData.hourly.wave_height[0] * 3.28084 : 1.5;
    const wavePeriod = marineData?.hourly?.wave_period?.[0] ?? 6;
    const swellDirection = marineData?.hourly?.swell_wave_direction?.[0] ?? 90;
    const windSpeed = weatherData.current.wind_speed_10m * 0.539957;
    const windDirection = weatherData.current.wind_direction_10m;
    
    const currentSurfData: SurfData = {
      waveHeight,
      wavePeriod,
      swellDirection,
      windDirection,
      windSpeed,
      tide: tideData.state,
      tideHeight: tideData.currentHeight,
    };
    
    const { score, surfable, rating, funRating } = calculateSurfability(currentSurfData);
    
    // Format tide times
    const formatTideTime = (tideEvent: { time: string; height: number; timestamp: string } | null) => {
      if (!tideEvent) return null;
      
      const time = new Date(tideEvent.timestamp);
      const timeStr = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return {
        time: timeStr,
        height: Math.round(tideEvent.height * 10) / 10,
        timestamp: tideEvent.timestamp
      };
    };
    
    const response = {
      location: 'St. Augustine, FL',
      timestamp: new Date().toISOString(),
      surfable,
      rating: funRating,
      score,
      goodSurfDuration: "Loading forecast...",
      details: {
        wave_height_ft: Math.round(waveHeight * 10) / 10,
        wave_period_sec: Math.round(wavePeriod * 10) / 10,
        swell_direction_deg: Math.round(swellDirection),
        wind_direction_deg: Math.round(windDirection),
        wind_speed_kts: Math.round(windSpeed * 10) / 10,
        tide_state: tideData.state,
        tide_height_ft: Math.round(tideData.currentHeight * 10) / 10,
        data_source: marineData?.hourly ? 'Marine + NOAA Tides + Weather API' : 'Weather API + NOAA Tides + defaults'
      },
      weather: {
        air_temperature_c: Math.round(weatherData.current.temperature_2m * 10) / 10,
        air_temperature_f: Math.round((weatherData.current.temperature_2m * 9/5 + 32) * 10) / 10,
        water_temperature_c: Math.round((marineData?.current?.sea_surface_temperature ?? 22) * 10) / 10,
        water_temperature_f: Math.round(((marineData?.current?.sea_surface_temperature ?? 22) * 9/5 + 32) * 10) / 10,
        weather_code: weatherData.current.weather_code,
        weather_description: weatherDescriptions[weatherData.current.weather_code] || 'Unknown conditions'
      },
      tides: {
        current_height_ft: Math.round(tideData.currentHeight * 10) / 10,
        state: tideData.state,
        next_high: formatTideTime(tideData.nextHigh),
        next_low: formatTideTime(tideData.nextLow),
        previous_high: formatTideTime(tideData.previousHigh),
        previous_low: formatTideTime(tideData.previousLow),
        station: 'NOAA 8720587 (St. Augustine Beach, FL)'
      },
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Error fetching surf data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}