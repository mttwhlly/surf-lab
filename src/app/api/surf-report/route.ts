// src/app/api/surf-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

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
            'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
          }
        });
      }
    }

    // STEP 2: NO CACHE OR EXPIRED - GENERATE FRESH (SHOULD BE RARE)
    console.log('🚨 GENERATING FRESH REPORT - THIS SHOULD BE RARE!');
    return await generateFreshReportViaBun(request, startTime);

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

async function generateFreshReportViaBun(request: NextRequest, startTime: number) {
  console.log('🚨 FRESH GENERATION VIA BUN SERVICE...');
  
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
      signal: AbortSignal.timeout(15000)
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
    
    // STEP 3: CALL BUN AI SERVICE
    console.log('🤖 Calling Bun AI service...');
    const aiStart = Date.now();
    
    const bunServiceUrl = process.env.BUN_SERVICE_URL;
    if (!bunServiceUrl) {
      throw new Error('BUN_SERVICE_URL not configured');
    }
    
    const aiResponse = await fetch(`${bunServiceUrl}/generate-surf-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SurfLab-Vercel/1.0'
      },
      body: JSON.stringify({
        surfData,
        apiKey: process.env.BUN_API_SECRET
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!aiResponse.ok) {
      throw new Error(`Bun AI service failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiTime = Date.now() - aiStart;
    
    console.log(`🤖 Bun AI generation completed: ${aiTime}ms`);

    if (!aiResult.success || !aiResult.report) {
      throw new Error('Bun AI service returned invalid response');
    }

    const report = aiResult.report;

    // Save to database
    await saveReport(report);
    console.log('✅ Report saved to database:', report.id);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ Total generation time: ${totalTime}ms`);
    
    return NextResponse.json(report, {
      headers: {
        'X-Data-Source': 'bun-ai-service',
        'X-Cache-Status': 'miss',
        'X-Response-Time': `${totalTime}ms`,
        'X-Surf-Data-Time': `${surfDataTime}ms`,
        'X-AI-Generation-Time': `${aiTime}ms`,
        'X-Cache-Valid-Until': report.cached_until,
        'X-API-Calls-Made': '2',
        'X-AI-Backend': 'bun-service'
      }
    });

  } catch (error) {
    console.error('❌ Fresh generation via Bun failed:', error);
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