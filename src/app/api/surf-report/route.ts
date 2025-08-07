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
    const cachedReport = await getCachedReport();
    
    if (cachedReport) {
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      const maxFreshAge = 2 * 60 * 60 * 1000; // 2 hours - fresh
      const maxStaleAge = 6 * 60 * 60 * 1000; // 6 hours - stale but usable
      
      if (reportAge < maxFreshAge) {
        // Fresh cache - return immediately
        console.log('✅ FRESH CACHE HIT');
        return NextResponse.json(cachedReport);
        
      } else if (reportAge < maxStaleAge) {
        // Stale but usable - return immediately, then revalidate in background
        console.log('⚡ STALE-WHILE-REVALIDATE: Returning stale data');
        
        return NextResponse.json({
          ...cachedReport,
          _stale: true,
          _revalidating: true
        }, {
          headers: {
            'X-Data-Source': 'stale-while-revalidate',
            'X-Cache-Status': 'stale-revalidating'
          }
        });
        
      } else {
        // Too stale - must generate fresh
        console.log('❌ Cache too stale, generating fresh');
      }
    }

    // STEP 2: ONLY GENERATE NEW REPORT IF CACHE MISS/EXPIRED/INVALID
    console.log('🔄 GENERATING NEW AI REPORT - This should be rare for normal users');
    console.log('📡 About to make API calls to external services...');
    
    // Get base URL for internal API calls  
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');
    
    console.log('🌊 Fetching fresh surf conditions for AI report generation...');
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
      // Try to fall back to stale cache if fresh generation fails
      console.log('❌ Fresh data fetch failed, attempting stale cache fallback...');
      const staleCache = await getCachedReport();
      if (staleCache) {
        console.log('🆘 Using stale cached report as fallback');
        return NextResponse.json({
          ...staleCache,
          _fallback: true,
          _note: 'Fresh generation failed, using stale cache'
        }, {
          headers: {
            'X-Data-Source': 'stale-cache-fallback',
            'X-Fallback-Reason': `Surf data fetch failed: ${surfDataResponse.status}`
          }
        });
      }
      throw new Error(`Failed to fetch surf conditions: ${surfDataResponse.status}`);
    }

    let surfData = await surfDataResponse.json();
    console.log('📊 Fresh surf data obtained for AI generation');
    
    // ... rest of your AI generation logic stays the same ...
    
    // Generate contextual timing advice and AI report
    const optimalTiming = getOptimalSurfTiming(surfData);
    const tideContext = getTideContext(surfData);
    
    // Convert to everyday language
    const swellDirectionText = degreesToDirection(surfData.details.swell_direction_deg);
    const windDirectionText = degreesToDirection(surfData.details.wind_direction_deg);
    const airTempText = formatTemperature(surfData.weather.air_temperature_f);
    const waterTempText = formatTemperature(surfData.weather.water_temperature_f);

    // Board recommendations
    const getBoardRecommendation = function (waveHeight: number, period: number): string {
      if (waveHeight < 1.5) {
        return 'longboard (9+ feet) - only option for these small waves';
      } else if (waveHeight < 2.5) {
        return 'longboard or mid-length (8-9 feet) - need the paddle power';
      } else if (waveHeight < 4) {
        return 'funboard or shortboard (6-8 feet) - plenty of push available';
      } else if (waveHeight < 6) {
        return 'shortboard (5.5-6.5 feet) - waves have enough power';
      } else {
        return 'shorter board (under 6 feet) - powerful conditions';
      }
    }

    // Time-aware advice
    const getTimeAwareAdvice = function (surfData: any, optimalTiming: string): string {
      const now = new Date();
      const currentHour = now.getHours();
      const isDaylight = currentHour >= 6 && currentHour <= 19;
      
      // Safety first - never recommend night surfing
      if (!isDaylight) {
        return `Conditions look ${surfData.score >= 60 ? 'decent' : 'marginal'} but wait for daylight hours (6 AM - 7 PM) for safety. ${optimalTiming.includes('NOW') ? 'Good timing for tomorrow morning.' : optimalTiming}`;
      }
      
      // Daylight hours - use the optimal timing
      return optimalTiming;
    }
    
    // Generate AI report
    const { object: aiReport } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt: `
        You are a local St. Augustine surfer giving a real-time surf report. Use ONLY the current data provided.

        ${tideContext}

        CURRENT CONDITIONS - USE THESE EXACT VALUES:
        Wave Height: ${surfData.details.wave_height_ft} ft
        Wave Period: ${surfData.details.wave_period_sec} seconds  
        Swell Direction: Coming from the ${swellDirectionText}
        Wind: ${surfData.details.wind_speed_kts} knots from the ${windDirectionText}
        Weather: ${surfData.weather.weather_description}
        Air Temperature: ${airTempText} | Water Temperature: ${waterTempText}
        Surfability Score: ${surfData.score}/100

        TIMING ADVICE: ${getTimeAwareAdvice(surfData, optimalTiming)}

        BOARD RECOMMENDATION: ${getBoardRecommendation(surfData.details.wave_height_ft, surfData.details.wave_period_sec)}

        WETSUIT GUIDANCE: ${surfData.weather.water_temperature_f < 65 ? '4/3mm fullsuit recommended' : 
                          surfData.weather.water_temperature_f < 70 ? '3/2mm fullsuit or spring suit' :
                          surfData.weather.water_temperature_f < 75 ? 'spring suit or rashguard' : 
                          'rashguard or board shorts sufficient'}

        CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
        - Write a 150-200 word conversational surf report
        - Use the EXACT wave height and period provided above
        - NEVER recommend surfing after dark (7 PM) or before dawn (6 AM)
        - Use the board recommendation provided above - DO NOT suggest shortboards for waves under 2.5 feet
        - If current time is after 7 PM, focus advice on tomorrow's sessions
        - Include specific St. Augustine spots only if conditions warrant: Vilano Beach (beginner-friendly), St. Augustine Beach Pier (main break), Anastasia State Park (less crowded)
        - Be honest about poor conditions - don't oversell marginal surf
        - Use compass directions (like "southeast") not degrees
        - Write in a friendly, knowledgeable local voice
        - NO EMOJIS anywhere in the response
        - If wind is strong (>15 knots) from bad directions (east/southeast/south), mention choppy/blown out conditions

        WAVE HEIGHT REALITY CHECK:
        - Under 1.5 ft = Minimal/flat, longboard only, beginner practice
        - 1.5-2.5 ft = Small but rideable, longboard/mid-length territory  
        - 2.5-4 ft = Fun size, most boards work
        - 4+ ft = Good size, shortboards fine

        TIMING REALITY CHECK:
        - Never suggest surfing in darkness
        - If it's currently night time, focus on tomorrow's opportunities
        - Be specific about tide timing within the next 12 daylight hours

        Use natural, conversational language. You're talking to fellow surfers who know the area.
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
      cached_until: calculateSmartCacheExpiration()
    };

    // Save to database
    await saveReport(report);
    
    console.log('✅ NEW REPORT GENERATED AND SAVED:', report.id);
    console.log('💾 This report will now be served from cache for 2 hours');
    
    return NextResponse.json(report, {
      headers: {
        'X-Data-Source': 'fresh-generation',
        'X-Report-Age-Minutes': '0',
        'X-Cache-Valid-Until': report.cached_until,
        'X-API-Calls-Made': '2' // surfability + AI generation
      }
    });

  } catch (error) {
    console.error('❌ Error generating surf report:', error);
    
    // Try to return stale cache as final fallback
    try {
      console.log('🆘 Attempting stale cache fallback...');
      const staleCache = await getCachedReport();
      if (staleCache) {
        console.log('✅ Returning stale cached report as emergency fallback');
        return NextResponse.json({
          ...staleCache,
          _fallback: true,
          _error: 'Fresh generation failed, using stale cache'
        }, {
          headers: {
            'X-Data-Source': 'emergency-stale-fallback',
            'X-Fallback-Reason': error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (cacheError) {
      console.error('❌ Even emergency fallback failed:', cacheError);
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

function calculateSmartCacheExpiration(): string {
  const now = new Date();
  
  // Convert to Eastern Time
  const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const currentHour = et.getHours();
  
  // Cron jobs run at: 5, 9, 13, 16 (5AM, 9AM, 1PM, 4PM ET)
  const cronHours = [5, 9, 13, 16];
  
  // Find next cron hour
  let nextCronHour = cronHours.find(hour => hour > currentHour);
  
  const nextCron = new Date(et);
  
  if (nextCronHour) {
    // Next cron is today
    nextCron.setHours(nextCronHour, 0, 0, 0);
  } else {
    // Next cron is tomorrow at 5 AM
    nextCron.setDate(nextCron.getDate() + 1);
    nextCron.setHours(5, 0, 0, 0);
  }
  
  // Cache until 5 minutes before next cron (gives cron time to run)
  const cacheUntil = new Date(nextCron.getTime() - (5 * 60 * 1000));
  
  console.log(`⏰ Smart cache: Next cron at ${nextCron.toLocaleString()}, caching until ${cacheUntil.toLocaleString()}`);
  
  return cacheUntil.toISOString();
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