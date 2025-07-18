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
  nextHigh: { time: string; height: number } | null;
  nextLow: { time: string; height: number } | null;
  previousHigh: { time: string; height: number } | null;
  previousLow: { time: string; height: number } | null;
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
    let nextHigh: { time: string; height: number } | null = null;
    let nextLow: { time: string; height: number } | null = null;
    let previousHigh: { time: string; height: number } | null = null;
    let previousLow: { time: string; height: number } | null = null;
    
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
          parsedHeight: parseFloat(p.v)
        }));
        
        const pastPredictions = allPredictions.filter((p: any) => p.time < now);
        const futurePredictions = allPredictions.filter((p: any) => p.time >= now);
        
        // Find previous tides
        for (let i = pastPredictions.length - 1; i >= 0; i--) {
          const prediction = pastPredictions[i];
          
          if (prediction.type === 'H' && !previousHigh) {
            previousHigh = {
              time: prediction.t,
              height: prediction.parsedHeight
            };
          } else if (prediction.type === 'L' && !previousLow) {
            previousLow = {
              time: prediction.t,
              height: prediction.parsedHeight
            };
          }
          
          if (previousHigh && previousLow) break;
        }
        
        // Find next tides
        for (const prediction of futurePredictions) {
          if (prediction.type === 'H' && !nextHigh) {
            nextHigh = {
              time: prediction.t,
              height: prediction.parsedHeight
            };
          } else if (prediction.type === 'L' && !nextLow) {
            nextLow = {
              time: prediction.t,
              height: prediction.parsedHeight
            };
          }
          
          if (nextHigh && nextLow) break;
        }
      }
    }
    
    // Determine tide state
    let state = 'Unknown';
    if (nextHigh && nextLow) {
      const timeToHigh = new Date(nextHigh.time).getTime() - Date.now();
      const timeToLow = new Date(nextLow.time).getTime() - Date.now();
      
      if (timeToHigh < timeToLow) {
        state = currentHeight > 1.5 ? 'High Rising' : 'Rising';
      } else {
        state = currentHeight < 1.0 ? 'Low Falling' : 'Falling';
      }
      
      const range = Math.abs(nextHigh.height - nextLow.height);
      const midPoint = (nextHigh.height + nextLow.height) / 2;
      
      if (Math.abs(currentHeight - midPoint) < range * 0.25) {
        state = 'Mid';
      }
    }
    
    // Fallback current height
    if (currentHeight === 0) {
      if (nextHigh && nextLow) {
        currentHeight = (nextHigh.height + nextLow.height) / 2;
      } else {
        currentHeight = 1.5;
      }
    }
    
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

export async function GET(request: NextRequest) {
  try {
    // Create ETag based on current 5-minute window
    const now = Date.now();
    const fiveMinuteWindow = Math.floor(now / (5 * 60 * 1000));
    const etag = `"surf-${fiveMinuteWindow}"`;
    
    // Check if client has current version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
        }
      });
    }

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
    const formatTideTime = (tideEvent: { time: string; height: number } | null) => {
      if (!tideEvent) return null;
      
      const time = new Date(tideEvent.time);
      const timeStr = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return {
        time: timeStr,
        height: Math.round(tideEvent.height * 10) / 10,
        timestamp: tideEvent.time
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
    
    return NextResponse.json(response, {
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'Vary': 'Accept-Encoding'
      }
    });
    
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
