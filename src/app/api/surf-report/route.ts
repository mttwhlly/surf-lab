import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

// AI Response Schema
const surfReportSchema = z.object({
  report: z.string().describe("A natural, conversational surf report in the voice of a local St. Augustine surfer"),
  boardRecommendation: z.string().describe("What type of board to bring (longboard, shortboard, funboard, etc.)"),
  wetsuitAdvice: z.string().optional().describe("Wetsuit thickness recommendation if needed"),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe("Recommended skill level for current conditions"),
  bestSpots: z.array(z.string()).optional().describe("Best surf spots in St. Augustine for these conditions"),
  timingAdvice: z.string().optional().describe("Best time to surf or when conditions might improve")
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const isDebug = request.headers.get('X-Debug') === 'true';
  
  try {
    console.log('🎯 SURF REPORT REQUEST:', {
      timestamp: new Date().toISOString(),
      isDebug,
      url: request.url
    });

    // STEP 1: ALWAYS CHECK CACHE FIRST - SERVE IMMEDIATELY IF AVAILABLE
    console.log('🔍 Checking database cache...');
    const cachedReport = await getCachedReport();
    
    if (cachedReport) {
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      const ageHours = reportAge / (1000 * 60 * 60);
      const responseTime = Date.now() - startTime;
      
      console.log('📊 CACHE ANALYSIS:', {
        reportId: cachedReport.id,
        ageHours: Math.round(ageHours * 10) / 10,
        responseTime
      });
      
      // Serve ANY cached report that's less than 8 hours old
      // Users get instant responses, cron jobs keep data fresh
      if (ageHours < 8) {
        const cacheStatus = ageHours < 1 ? 'fresh' : ageHours < 4 ? 'good' : 'stale-but-usable';
        
        console.log(`✅ CACHE HIT: ${cacheStatus.toUpperCase()}`);
        
        return NextResponse.json(cachedReport, {
          headers: {
            'X-Data-Source': `cache-${cacheStatus}`,
            'X-Cache-Status': 'hit',
            'X-Response-Time': `${responseTime}ms`,
            'X-Report-Age-Hours': `${Math.round(ageHours * 10) / 10}`,
            'X-Cache-Valid-Until': cachedReport.cached_until,
            'X-API-Calls-Made': '0',
            'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' // 30min cache, 1hr stale
          }
        });
      }
    }

    // STEP 2: NO CACHE OR EXPIRED - GENERATE FRESH (SHOULD BE RARE)
    console.log('🚨 GENERATING FRESH REPORT - THIS SHOULD BE RARE!');
    return await generateFreshReport(request, startTime);

  } catch (error) {
    console.error('❌ SURF REPORT ERROR:', error);
    
    // Emergency fallback - serve any cached report regardless of age
    try {
      const emergencyCache = await getCachedReport();
      if (emergencyCache) {
        console.log('🆘 Using emergency cache fallback');
        return NextResponse.json({
          ...emergencyCache,
          _fallback: true,
          _error: 'Fresh generation failed, using emergency cache'
        }, {
          headers: {
            'X-Data-Source': 'emergency-cache-fallback',
            'X-Error': error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (fallbackError) {
      console.error('❌ Even emergency fallback failed:', fallbackError);
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

async function generateFreshReport(request: NextRequest, startTime: number) {
  console.log('🚨 FRESH GENERATION STARTING...');
  
  try {
    // Initialize database
    await initializeDatabase();
    
    // Get base URL for internal API calls  
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');
    
    console.log('🌊 Fetching fresh surf conditions...');
    const surfDataStart = Date.now();
    
    const surfDataResponse = await fetch(`${baseUrl}/api/surfability?nocache=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'SurfLab-AI/1.0',
        'X-Force-Fresh': 'true'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    const surfDataTime = Date.now() - surfDataStart;
    console.log(`📊 Surf data fetch: ${surfDataTime}ms`);
    
    if (!surfDataResponse.ok) {
      throw new Error(`Failed to fetch surf conditions: ${surfDataResponse.status}`);
    }

    const surfData = await surfDataResponse.json();
    console.log('📊 Fresh surf data obtained:', {
      location: surfData.location,
      waveHeight: surfData.details.wave_height_ft,
      windSpeed: surfData.details.wind_speed_kts,
      score: surfData.score
    });
    
    // STEP 3: GENERATE AI REPORT
    console.log('🤖 Generating AI surf report...');
    const aiStart = Date.now();
    
    const prompt = `You are a local St. Augustine surfer giving a casual surf report to fellow surfers. 

Current Conditions:
- Wave Height: ${surfData.details.wave_height_ft} feet
- Wave Period: ${surfData.details.wave_period_sec} seconds  
- Wind: ${surfData.details.wind_speed_kts} knots from ${surfData.details.wind_direction_deg}°
- Tide: ${surfData.details.tide_state} at ${surfData.details.tide_height_ft} feet
- Air Temp: ${surfData.weather.air_temperature_f}°F
- Water Temp: ${surfData.weather.water_temperature_f}°F
- Weather: ${surfData.weather.weather_description}
- Surf Score: ${surfData.score}/100

Write a natural, conversational surf report (2-3 paragraphs) that captures:
- Current wave quality and rideability
- How the wind is affecting conditions
- Tide timing and impact
- Board recommendations
- Best spots in St. Augustine area
- Any timing advice for better conditions

Keep it authentic to Florida's East Coast surf culture - casual, informative, and stoked about good waves when they happen. Mention specific St. Augustine spots like Vilano Beach, St. Augustine Pier, or Anastasia State Park when relevant.`;

    const { object: aiResponse } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt,
      temperature: 0.7,
    });

    const aiTime = Date.now() - aiStart;
    console.log(`🤖 AI generation completed: ${aiTime}ms`);

    // Create complete report object
    const report = {
      id: `surf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      location: surfData.location,
      report: aiResponse.report,
      conditions: {
        wave_height_ft: surfData.details.wave_height_ft,
        wave_period_sec: surfData.details.wave_period_sec,
        wind_speed_kts: surfData.details.wind_speed_kts,
        wind_direction_deg: surfData.details.wind_direction_deg,
        tide_state: surfData.details.tide_state,
        weather_description: surfData.weather.weather_description,
        surfability_score: surfData.score
      },
      recommendations: {
        board_type: aiResponse.boardRecommendation,
        wetsuit_thickness: aiResponse.wetsuitAdvice,
        skill_level: aiResponse.skillLevel,
        best_spots: aiResponse.bestSpots,
        timing_advice: aiResponse.timingAdvice
      },
      cached_until: calculateOptimalCacheExpiration()
    };

    // Save to database
    await saveReport(report);
    console.log('✅ Report saved to database:', report.id);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ Total generation time: ${totalTime}ms`);
    
    return NextResponse.json(report, {
      headers: {
        'X-Data-Source': 'fresh-generation',
        'X-Cache-Status': 'miss',
        'X-Response-Time': `${totalTime}ms`,
        'X-Surf-Data-Time': `${surfDataTime}ms`,
        'X-AI-Generation-Time': `${aiTime}ms`,
        'X-Cache-Valid-Until': report.cached_until,
        'X-API-Calls-Made': '2'
      }
    });

  } catch (error) {
    console.error('❌ Fresh generation failed:', error);
    throw error;
  }
}

function calculateOptimalCacheExpiration(): string {
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
  
  // Add 30 minutes buffer after cron time for cache safety
  nextCron.setMinutes(30);
  
  console.log(`⏰ Optimal cache: Next cron at ${nextCron.toLocaleString()}, caching until then`);
  
  return nextCron.toISOString();
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