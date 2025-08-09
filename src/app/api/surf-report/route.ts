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
      userAgent: request.headers.get('user-agent'),
      isDebug,
      url: request.url
    });

    // STEP 1: CHECK CACHE FIRST
    console.log('🔍 Checking database cache...');
    const cachedReport = await getCachedReport();
    
    if (cachedReport) {
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      const maxFreshAge = 2 * 60 * 60 * 1000; // 2 hours
      const maxStaleAge = 6 * 60 * 60 * 1000; // 6 hours
      
      console.log('📊 CACHE ANALYSIS:', {
        reportId: cachedReport.id,
        reportAge: Math.round(reportAge / (1000 * 60)), // minutes
        isFresh: reportAge < maxFreshAge,
        isUsable: reportAge < maxStaleAge
      });
      
      if (reportAge < maxFreshAge) {
        const responseTime = Date.now() - startTime;
        console.log('✅ FRESH CACHE HIT');
        
        return NextResponse.json(cachedReport, {
          headers: {
            'X-Data-Source': 'fresh-cache',
            'X-Cache-Status': 'hit',
            'X-Response-Time': `${responseTime}ms`,
            'X-Report-Age-Minutes': `${Math.round(reportAge / (1000 * 60))}`,
            'X-Cache-Valid-Until': cachedReport.cached_until,
            'X-API-Calls-Made': '0'
          }
        });
      } else if (reportAge < maxStaleAge) {
        const responseTime = Date.now() - startTime;
        console.log('⚡ STALE-WHILE-SERVING');
        
        return NextResponse.json({
          ...cachedReport,
          _stale: true,
          _note: 'Using slightly stale cache - will refresh via cron'
        }, {
          headers: {
            'X-Data-Source': 'stale-cache',
            'X-Cache-Status': 'stale-hit',
            'X-Response-Time': `${responseTime}ms`,
            'X-Report-Age-Minutes': `${Math.round(reportAge / (1000 * 60))}`,
            'X-API-Calls-Made': '0'
          }
        });
      }
    }

    // STEP 2: GENERATE FRESH REPORT
    console.log('🚨 GENERATING FRESH REPORT');
    
    // Initialize database
    try {
      await initializeDatabase();
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError);
    }
    
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
      }
    });
    
    const surfDataTime = Date.now() - surfDataStart;
    console.log(`📊 Surf data fetch: ${surfDataTime}ms`);
    
    if (!surfDataResponse.ok) {
      console.error('❌ Surf data fetch failed:', surfDataResponse.status);
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

    try {
      const { object: aiResponse } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: surfReportSchema,
        prompt,
        temperature: 0.7,
      });

      const aiTime = Date.now() - aiStart;
      console.log(`🤖 AI generation completed: ${aiTime}ms`);
      console.log('📝 AI report preview:', aiResponse.report.substring(0, 100) + '...');

      // Create complete report object
      const report = {
        id: `surf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        location: surfData.location,
        report: aiResponse.report, // ✅ ACTUAL AI REPORT HERE!
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
        cached_until: calculateSmartCacheExpiration()
      };

      // Save to database
      try {
        await saveReport(report);
        console.log('✅ Report saved to database:', report.id);
      } catch (saveError) {
        console.error('❌ Failed to save report:', saveError);
        // Continue anyway - at least return the report
      }
      
      const totalTime = Date.now() - startTime;
      console.log('✅ FRESH REPORT GENERATED');
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

    } catch (aiError) {
      console.error('❌ AI generation failed:', aiError);
      
      // Fallback to manual report if AI fails
      const getSkillLevel = (score: number): 'beginner' | 'intermediate' | 'advanced' => {
        if (score > 70) return 'beginner';
        if (score > 50) return 'intermediate';
        return 'advanced';
      };

      const fallbackReport = {
        id: `surf_fallback_${Date.now()}`,
        timestamp: new Date().toISOString(),
        location: surfData.location,
        report: `Current conditions at St. Augustine: ${surfData.details.wave_height_ft}ft waves with ${surfData.details.wave_period_sec}s period. Wind is ${surfData.details.wind_speed_kts} knots from ${surfData.details.wind_direction_deg}°. Tide is ${surfData.details.tide_state} at ${surfData.details.tide_height_ft}ft. Overall surf score: ${surfData.score}/100. ${surfData.score > 60 ? 'Conditions look surfable!' : 'Might want to wait for better conditions.'}`,
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
          board_type: surfData.score > 70 ? 'Any board' : surfData.details.wave_height_ft > 3 ? 'Shortboard' : 'Longboard',
          skill_level: getSkillLevel(surfData.score)
        },
        cached_until: calculateSmartCacheExpiration()
      };

      await saveReport(fallbackReport);
      
      return NextResponse.json(fallbackReport, {
        headers: {
          'X-Data-Source': 'fallback-generation',
          'X-AI-Error': 'true'
        }
      });
    }

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ SURF REPORT ERROR:', error);
    console.log(`💥 Error occurred after ${errorTime}ms`);
    
    // Final emergency fallback
    try {
      const emergencyCache = await getCachedReport();
      if (emergencyCache) {
        console.log('🆘 Using final emergency cache fallback');
        return NextResponse.json({
          ...emergencyCache,
          _fallback: true,
          _error: 'Fresh generation failed, using stale cache'
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
  
  console.log(`⏰ Smart cache: Next cron at ${nextCron.toLocaleString()}, caching until then`);
  
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