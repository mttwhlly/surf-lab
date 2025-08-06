import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

// Convert degrees to compass direction
function degreesToDirection(degrees: number): string {
  const directions = [
    'north', 'north-northeast', 'northeast', 'east-northeast',
    'east', 'east-southeast', 'southeast', 'south-southeast', 
    'south', 'south-southwest', 'southwest', 'west-southwest',
    'west', 'west-northwest', 'northwest', 'north-northwest'
  ];
  
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Convert wind direction to readable format (where wind is blowing TO)
function windDegreesToDirection(degrees: number): string {
  // Wind direction is typically described as where it's blowing TO
  const windToDirection = (degrees + 180) % 360;
  return degreesToDirection(windToDirection);
}

// Format temperature in everyday language
function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°F`;
}

const surfReportSchema = z.object({
  report: z.string().describe('A friendly, conversational surf report in the voice of a local surfer'),
  recommendations: z.object({
    board_type: z.string().describe('Recommended board type (longboard, shortboard, funboard, etc.)'),
    wetsuit_thickness: z.string().optional().describe('Wetsuit thickness needed (e.g., 3/2mm, 4/3mm)'),
    skill_level: z.enum(['beginner', 'intermediate', 'advanced']).describe('Who these conditions are best for'),
    best_spots: z.array(z.string()).optional().describe('Specific surf spots in St. Augustine area'),
    timing_advice: z.string().optional().describe('CURRENT real-time advice - when to surf TODAY from this moment forward')
  })
});

// Helper function to get next optimal surf window
function getOptimalSurfTiming(surfData: any): string {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Parse tide times
  const nextHigh = surfData.tides.next_high ? new Date(surfData.tides.next_high.timestamp) : null;
  const nextLow = surfData.tides.next_low ? new Date(surfData.tides.next_low.timestamp) : null;
  
  let timingAdvice = '';
  
  // Check if tide is currently rising or falling
  const isRising = surfData.details.tide_state.includes('Rising');
  const isFalling = surfData.details.tide_state.includes('Falling');
  
  if (isRising && nextHigh) {
    const hoursToHigh = (nextHigh.getTime() - now.getTime()) / (1000 * 60 * 60);
    const highHour = nextHigh.getHours();
    
    if (hoursToHigh > 0 && hoursToHigh <= 4 && highHour >= 6 && highHour <= 19) {
      // Rising tide with good timing
      timingAdvice = `Perfect timing! Tide is rising toward ${surfData.tides.next_high.time} - surf NOW through ${nextHigh.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
    } else if (hoursToHigh > 4) {
      timingAdvice = `Rising tide but peak is later. Good window in ${Math.round(hoursToHigh - 2)}-${Math.round(hoursToHigh)} hours`;
    } else if (currentHour >= 6 && currentHour <= 18) {
      timingAdvice = `Go NOW! Currently rising with good daylight`;
    }
  } else if (isFalling && nextLow) {
    const hoursToLow = (nextLow.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursToLow > 2 && currentHour >= 6 && currentHour <= 18) {
      timingAdvice = `Surf NOW! Still ${Math.round(hoursToLow)} hours before low tide`;
    } else {
      timingAdvice = `Wait for rising tide after ${surfData.tides.next_low.time}`;
    }
  }
  
  // Safety check for thunderstorms
  if (surfData.weather.weather_code >= 95) {
    timingAdvice = `⚠️ WAIT - Thunderstorms in area! Check back after storms pass`;
  }
  
  // Night surfing safety
  if (currentHour < 6 || currentHour > 19) {
    timingAdvice += '. Recommend daylight hours (6 AM - 7 PM) for safety';
  }
  
  return timingAdvice || 'Check conditions and tide timing for best session';
}

// Helper function to get contextual tide info for AI
function getTideContext(surfData: any): string {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });
  
  const nextHigh = surfData.tides.next_high;
  const nextLow = surfData.tides.next_low;
  const prevHigh = surfData.tides.previous_high;
  const prevLow = surfData.tides.previous_low;
  
  let context = `CURRENT TIME: ${currentTime} ET\n`;
  context += `CURRENT TIDE: ${surfData.details.tide_height_ft} ft (${surfData.details.tide_state})\n\n`;
  
  context += `TIDE TIMELINE:\n`;
  if (prevLow) context += `✅ Previous Low: ${prevLow.time} (${prevLow.height} ft)\n`;
  if (prevHigh) context += `✅ Previous High: ${prevHigh.time} (${prevHigh.height} ft)\n`;
  context += `📍 NOW: ${currentTime} (${surfData.details.tide_height_ft} ft)\n`;
  if (nextHigh) context += `🔮 Next High: ${nextHigh.time} (${nextHigh.height} ft)\n`;
  if (nextLow) context += `🔮 Next Low: ${nextLow.time} (${nextLow.height} ft)\n`;
  
  return context;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 AI Surf Report API called');
    
    // Initialize database on first run
    await initializeDatabase();

    // Check for force refresh parameter
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true';

    if (forceRefresh) {
      console.log('⚡ Force refresh requested - skipping cache');
    }

    // Check cache first - THIS IS THE MAIN PATH FOR USERS
    console.log('🔍 Checking database cache for existing report...');
    const cachedReport = await getCachedReport();
    
    if (cachedReport && !forceRefresh) {
      // Check if cached report is still valid
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours
      const ageMinutes = Math.floor(reportAge / (1000 * 60));
      
      // Check for outdated fallback data
      const hasOldFallbackData = cachedReport.conditions.wave_height_ft === 1.5 && 
                                 cachedReport.conditions.wave_period_sec === 6;
      
      if (reportAge < maxAge && !hasOldFallbackData) {
        console.log(`✅ RETURNING CACHED REPORT - Age: ${ageMinutes} minutes`);
        console.log(`📊 Cached data: ${cachedReport.conditions.wave_height_ft}ft waves, ${cachedReport.conditions.surfability_score}/100 score`);
        console.log(`🎯 Report ID: ${cachedReport.id}`);
        console.log(`⏰ Valid until: ${new Date(cachedReport.cached_until).toLocaleString()}`);
        
        // Add a response header to indicate cache usage
        return NextResponse.json(cachedReport, {
          headers: {
            'X-Data-Source': 'database-cache',
            'X-Report-Age-Minutes': ageMinutes.toString(),
            'X-Cache-Valid-Until': cachedReport.cached_until
          }
        });
      } else if (hasOldFallbackData) {
        console.log('🗑️ Cached report has fallback data (1.5ft/6s) - generating fresh report');
      } else {
        console.log(`🕒 Cached report expired (${ageMinutes} minutes > 120) - generating fresh report`);
      }
    } else {
      console.log('❌ No cached report found - generating fresh report');
    }

    // Only generate fresh reports when cache is empty/expired/invalid
    console.log('🔄 GENERATING NEW AI REPORT...');
    
    // OPTION 1: Try to get fresh surfability data
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');
    
    console.log('🔄 Fetching fresh surf conditions for AI report...');
    const surfDataResponse = await fetch(`${baseUrl}/api/surfability?nocache=${Date.now()}&fresh=marine`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'SurfLab-AI/1.0',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Force-Fresh': 'true'
      }
    });
    
    if (!surfDataResponse.ok) {
      throw new Error(`Failed to fetch surf conditions: ${surfDataResponse.status}`);
    }

    let surfData = await surfDataResponse.json();
    
    // Validate we got real marine data, not fallbacks
    const isRealData = surfData.details.wave_height_ft !== 1.5 || surfData.details.wave_period_sec !== 6;
    
    console.log('📊 Got surf data for AI:', {
      waveHeight: `${surfData.details.wave_height_ft}ft`,
      wavePeriod: `${surfData.details.wave_period_sec}s`,
      swellDirection: `${surfData.details.swell_direction_deg}°`,
      windSpeed: `${surfData.details.wind_speed_kts}kts`,
      score: surfData.score,
      timestamp: surfData.timestamp,
      isRealMarineData: isRealData ? '✅ REAL' : '⚠️ FALLBACK'
    });
    
    // If still getting fallback, try bypassing surfability API entirely
    if (!isRealData) {
      console.log('🔄 Bypassing surfability API - fetching marine data directly...');
      
      try {
        // Call the marine API directly (same logic as in surfability route)
        const directMarineRes = await fetch(
          'https://marine-api.open-meteo.com/v1/marine?latitude=29.9&longitude=-81.3&hourly=wave_height,wave_period,swell_wave_direction',
          { signal: AbortSignal.timeout(8000) }
        );
        
        if (directMarineRes.ok) {
          const directMarineData = await directMarineRes.json();
          
          // Find current data from hourly arrays (same logic as findCurrentMarineData)
          if (directMarineData?.hourly?.time) {
            const now = new Date();
            const times = directMarineData.hourly.time;
            let closestIndex = 0;
            let smallestDiff = Infinity;
            
            for (let i = 0; i < times.length; i++) {
              const time = new Date(times[i]);
              const diff = Math.abs(time.getTime() - now.getTime());
              if (diff < smallestDiff) {
                smallestDiff = diff;
                closestIndex = i;
              }
            }
            
            const waveHeight = (directMarineData.hourly.wave_height?.[closestIndex] || 1.5) * 3.28084; // Convert to feet
            const wavePeriod = directMarineData.hourly.wave_period?.[closestIndex] || 6;
            const swellDirection = directMarineData.hourly.swell_wave_direction?.[closestIndex] || 90;
            
            if (waveHeight !== 1.5 * 3.28084 || wavePeriod !== 6) {
              console.log('✅ Got fresh marine data directly:', {
                waveHeight: `${waveHeight.toFixed(1)}ft`,
                wavePeriod: `${wavePeriod}s`,
                swellDirection: `${swellDirection}°`
              });
              
              // Update surfData with fresh marine data
              surfData.details.wave_height_ft = Math.round(waveHeight * 10) / 10;
              surfData.details.wave_period_sec = Math.round(wavePeriod * 10) / 10;
              surfData.details.swell_direction_deg = Math.round(swellDirection);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Direct marine fetch failed:', error);
      }
    }
    
    // Get contextual timing advice
    const optimalTiming = getOptimalSurfTiming(surfData);
    const tideContext = getTideContext(surfData);
    
    // Double-check the data we're sending to AI
    console.log('🤖 Data being sent to AI model:', {
      waveHeight: surfData.details.wave_height_ft,
      wavePeriod: surfData.details.wave_period_sec,
      swellDirection: surfData.details.swell_direction_deg,
      windSpeed: surfData.details.wind_speed_kts,
      windDirection: surfData.details.wind_direction_deg,
      tideState: surfData.details.tide_state,
      score: surfData.score,
      weatherCode: surfData.weather.weather_code
    });

    // Convert to everyday language
    const swellDirectionText = degreesToDirection(surfData.details.swell_direction_deg);
    const windDirectionText = degreesToDirection(surfData.details.wind_direction_deg);
    const airTempText = formatTemperature(surfData.weather.air_temperature_f);
    const waterTempText = formatTemperature(surfData.weather.water_temperature_f);
    
    // Generate AI report with improved context
    const { object: aiReport } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt: `
        You are a local St. Augustine surfer giving a real-time surf report. Use ONLY the current data provided.

        ${tideContext}

        CURRENT CONDITIONS - USE THESE EXACT VALUES:
        Wave Height: ${surfData.details.wave_height_ft} ft (USE THIS EXACT VALUE)
        Wave Period: ${surfData.details.wave_period_sec} seconds (USE THIS EXACT VALUE)
        Swell Direction: Coming from the ${swellDirectionText} (USE THIS EXACT DIRECTION)
        Wind: ${surfData.details.wind_speed_kts} knots from the ${windDirectionText}
        Weather: ${surfData.weather.weather_description} ${surfData.weather.weather_code >= 95 ? 'THUNDERSTORMS WARNING' : ''}
        Air Temperature: ${airTempText} | Water Temperature: ${waterTempText}
        Surfability Score: ${surfData.score}/100

        OPTIMAL TIMING SUGGESTION: ${optimalTiming}

        CRITICAL INSTRUCTIONS:
        - DO NOT USE ANY EMOJIS in the report text
        - Use ONLY the wave height ${surfData.details.wave_height_ft} ft - DO NOT use 1.5 ft
        - Use ONLY the wave period ${surfData.details.wave_period_sec} seconds - DO NOT use 6 seconds
        - Use ONLY the swell direction "${swellDirectionText}" - DO NOT use degrees or generic values
        - Use ONLY the temperatures ${airTempText} and ${waterTempText} - DO NOT write "degrees F"
        - Write a conversational 150-200 word report in plain text
        - Give CURRENT, actionable timing advice
        - If it's thunderstorms, prioritize safety warnings but do not use warning emojis
        - Only recommend surfing during daylight hours (6 AM - 7 PM ET)
        - Be honest about conditions - don't oversell poor surf
        - Include board and wetsuit recommendations based on the ACTUAL wave height provided
        - Mention specific St. Augustine spots if relevant
        - Use current tide state (Rising/Falling) for timing advice
        - Write in a friendly, local surfer voice but without any emojis
        - Use everyday language for directions (like "southeast") and temperatures (like "87°F")

        DO NOT USE ANY DEFAULT OR FALLBACK VALUES - ONLY USE THE PROVIDED DATA ABOVE.
        ABSOLUTELY NO EMOJIS IN THE REPORT TEXT.
        USE COMPASS DIRECTIONS AND SIMPLE TEMPERATURE FORMAT.
      `,
      temperature: 0.7,
    });

    console.log('🎯 AI report generated successfully');

    // Create the full report object
    const report = {
      id: `surf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      location: surfData.location,
      report: aiReport.report,
      conditions: {
        wave_height_ft: surfData.details.wave_height_ft,
        wave_period_sec: surfData.details.wave_period_sec,
        wind_speed_kts: surfData.details.wind_speed_kts,
        wind_direction_deg: surfData.details.wind_direction_deg,
        tide_state: surfData.details.tide_state,
        weather_description: surfData.weather.weather_description,
        surfability_score: surfData.score
      },
      recommendations: aiReport.recommendations,
      cached_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours for database cache
    };

    // Save to database
    await saveReport(report);
    
    console.log('✅ NEW REPORT GENERATED AND CACHED');
    console.log(`🆔 New Report ID: ${report.id}`);
    console.log(`📊 Wave Data: ${report.conditions.wave_height_ft}ft, ${report.conditions.wave_period_sec}s, Score: ${report.conditions.surfability_score}`);
    console.log(`💾 Cached until: ${new Date(report.cached_until).toLocaleString()}`);
    
    return NextResponse.json(report, {
      headers: {
        'X-Data-Source': 'fresh-generation',
        'X-Report-Age-Minutes': '0',
        'X-Cache-Valid-Until': report.cached_until
      }
    });

  } catch (error) {
    console.error('❌ Error in surf report API:', error);
    
    // Try to return stale cache as fallback
    try {
      const staleCache = await getCachedReport();
      if (staleCache) {
        console.log('🆘 Returning stale cached report as fallback');
        return NextResponse.json({
          ...staleCache,
          _fallback: true,
          _error: 'Fresh generation failed, using stale cache'
        }, {
          headers: {
            'X-Data-Source': 'stale-cache-fallback',
            'X-Fallback-Reason': error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (cacheError) {
      console.error('❌ Even cache fallback failed:', cacheError);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate surf report',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
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