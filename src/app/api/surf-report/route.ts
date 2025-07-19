import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

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

    // Check cache first (unless forcing refresh)  
    if (!forceRefresh) {
      const cachedReport = await getCachedReport();
      if (cachedReport) {
        // Check if cached report is still relevant (less than 2 hours old)
        const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        
        if (reportAge < maxAge) {
          console.log('📋 Returning cached report');
          return NextResponse.json(cachedReport);
        } else {
          console.log('🕒 Cached report too old, generating fresh one');
        }
      }
    }

    console.log('🌊 Generating new AI report...');
    
    // Fetch current surf conditions from your existing API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');
    
    const surfDataResponse = await fetch(`${baseUrl}/api/surfability`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'SurfLab-AI/1.0'
      }
    });
    
    if (!surfDataResponse.ok) {
      throw new Error(`Failed to fetch surf conditions: ${surfDataResponse.status}`);
    }

    const surfData = await surfDataResponse.json();
    console.log('📊 Got surf data, generating AI report...');
    
    // Get contextual timing advice
    const optimalTiming = getOptimalSurfTiming(surfData);
    const tideContext = getTideContext(surfData);
    
    // Generate AI report with improved context
    const { object: aiReport } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt: `
        You are a local St. Augustine surfer giving a real-time surf report. Be specific about CURRENT timing.

        ${tideContext}

        CURRENT CONDITIONS:
        🌊 Wave Height: ${surfData.details.wave_height_ft} ft
        ⏱️ Wave Period: ${surfData.details.wave_period_sec} seconds  
        💨 Wind: ${surfData.details.wind_speed_kts} knots from ${surfData.details.wind_direction_deg}°
        ☀️ Weather: ${surfData.weather.weather_description} ${surfData.weather.weather_code >= 95 ? '⚠️ THUNDERSTORMS' : ''}
        🌡️ Air: ${surfData.weather.air_temperature_f}°F | Water: ${surfData.weather.water_temperature_f}°F
        📊 Surfability Score: ${surfData.score}/100

        OPTIMAL TIMING SUGGESTION: ${optimalTiming}

        Instructions:
        - Write a conversational 150-200 word report
        - Give CURRENT, actionable timing advice (not past recommendations)
        - If it's thunderstorms, prioritize safety warnings
        - Only recommend surfing during daylight hours (6 AM - 7 PM ET)
        - Be honest about conditions - don't oversell poor surf
        - Include board and wetsuit recommendations
        - Mention specific St. Augustine spots if relevant
        - Use current tide state (Rising/Falling) for timing advice

        CRITICAL: Base timing advice on the current time and tide state above, not generic suggestions.
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
      cached_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours (shorter cache for better real-time updates)
    };

    // Save to database
    await saveReport(report);
    
    console.log('✅ New report generated and saved:', report.id);
    return NextResponse.json(report);

  } catch (error) {
    console.error('❌ Error generating surf report:', error);
    
    // Return a more detailed error response
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