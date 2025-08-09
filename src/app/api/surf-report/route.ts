import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

// ... (keep all your existing helper functions and schema)

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const isDebug = request.headers.get('X-Debug') === 'true';
  
  try {
    // ENHANCED LOGGING
    console.log('🎯 SURF REPORT REQUEST:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      isDebug,
      url: request.url
    });

    // STEP 1: ALWAYS CHECK CACHE FIRST
    console.log('🔍 Checking database cache...');
    const cachedReport = await getCachedReport();
    
    if (cachedReport) {
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      const maxFreshAge = 2 * 60 * 60 * 1000; // 2 hours
      const maxStaleAge = 6 * 60 * 60 * 1000; // 6 hours
      
      console.log('📊 CACHE ANALYSIS:', {
        reportId: cachedReport.id,
        reportAge: Math.round(reportAge / (1000 * 60)), // minutes
        maxFreshAge: Math.round(maxFreshAge / (1000 * 60)), // minutes
        maxStaleAge: Math.round(maxStaleAge / (1000 * 60)), // minutes
        isFresh: reportAge < maxFreshAge,
        isUsable: reportAge < maxStaleAge
      });
      
      if (reportAge < maxFreshAge) {
        // FRESH CACHE HIT - This should be 90%+ of requests
        const responseTime = Date.now() - startTime;
        console.log('✅ FRESH CACHE HIT - RETURNING IMMEDIATELY');
        console.log(`⚡ Response time: ${responseTime}ms`);
        
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
        // STALE BUT USABLE - Return immediately, don't revalidate
        const responseTime = Date.now() - startTime;
        console.log('⚡ STALE-WHILE-SERVING: Returning stale data');
        console.log(`⚡ Response time: ${responseTime}ms`);
        
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
        
      } else {
        // TOO STALE - Must regenerate
        console.log('❌ Cache too stale, must generate fresh');
      }
    } else {
      console.log('❌ NO CACHE FOUND - Must generate fresh');
    }

    // STEP 2: GENERATE FRESH REPORT (Should be rare!)
    console.log('🚨 GENERATING FRESH REPORT - This should be RARE!');
    console.log('📞 About to make external API calls...');
    
    // Initialize database if needed
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
      
      // Try to fall back to any cache if fresh generation fails
      const emergencyCache = await getCachedReport();
      if (emergencyCache) {
        console.log('🆘 Using emergency stale cache fallback');
        return NextResponse.json({
          ...emergencyCache,
          _fallback: true,
          _note: 'Fresh generation failed, using emergency stale cache'
        }, {
          headers: {
            'X-Data-Source': 'emergency-stale-fallback',
            'X-Fallback-Reason': `Surf data fetch failed: ${surfDataResponse.status}`
          }
        });
      }
      
      throw new Error(`Failed to fetch surf conditions: ${surfDataResponse.status}`);
    }

    const surfData = await surfDataResponse.json();
    console.log('📊 Fresh surf data obtained');
    
    // ... (keep all your existing AI generation logic) ...
    console.log('🤖 Generating AI report...');
    const aiStart = Date.now();
    
    // (Your existing AI generation code here - don't change it)
    
    const aiTime = Date.now() - aiStart;
    console.log(`🤖 AI generation: ${aiTime}ms`);
    
    // Create report object (your existing code)
    const report = {
      id: `surf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      location: surfData.location,
      report: "Generated AI report here", // Your actual AI report
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
        board_type: "AI recommendations here",
        skill_level: 'intermediate' as const
      },
      cached_until: calculateSmartCacheExpiration()
    };

    // Save to database
    try {
      await saveReport(report);
      console.log('✅ Report saved to database');
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
  
  // Cache until next cron (no buffer needed now)
  console.log(`⏰ Smart cache: Next cron at ${nextCron.toLocaleString()}, caching until then`);
  
  return nextCron.toISOString();
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