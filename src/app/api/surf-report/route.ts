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

// 🔧 HELPER FUNCTION: Add compass directions to ANY report
function enhanceReportWithCompassDirections(report: any, surfData: any): any {
  console.log('🧭 Adding compass directions to report:', report.id);
  
  // Always enhance the report with compass data from surfability API
  report.conditions = {
    ...report.conditions,
    
    // Add the missing compass directions from surfData
    swell_direction_deg: surfData.details.swell_direction_deg,
    swell_direction_compass: surfData.details.swell_direction_compass,
    swell_direction_text: surfData.details.swell_direction_text,
    swell_direction_description: surfData.details.swell_direction_description,
    wind_direction_compass: surfData.details.wind_direction_compass,
    wind_direction_text: surfData.details.wind_direction_text,
    wind_direction_description: surfData.details.wind_direction_description,
    
    // Also add tide height and water temperature
    tide_height_ft: surfData.details.tide_height_ft,
    water_temperature_c: surfData.weather.water_temperature_c,
    water_temperature_f: surfData.weather.water_temperature_f,
    air_temperature_c: surfData.weather.air_temperature_c,
    air_temperature_f: surfData.weather.air_temperature_f
  };
  
  console.log('✅ Enhanced report with compass data:', {
    windCompass: report.conditions.wind_direction_compass,
    swellCompass: report.conditions.swell_direction_compass,
    reportId: report.id
  });
  
  return report;
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
      waveHeight: `${surfData.details.wave_height_ft}ft`,
      wavePeriod: `${surfData.details.wave_period_sec}s`, 
      swellDirection: `${surfData.details.swell_direction_deg}° (${surfData.details.swell_direction_compass})`,
      windSpeed: `${surfData.details.wind_speed_kts}kts`,
      windDirection: `${surfData.details.wind_direction_deg}° (${surfData.details.wind_direction_compass})`,
      score: surfData.score
    });
    
    // STEP 3: CALL BUN AI SERVICE WITH COMPLETE DATA
    console.log('🤖 Calling Bun AI service...');
    const aiStart = Date.now();
    
    const bunServiceUrl = process.env.BUN_SERVICE_URL;
    if (!bunServiceUrl) {
      throw new Error('BUN_SERVICE_URL not configured');
    }
    
    let report;
    let aiTime;
    let dataSource = 'bun-ai-service-with-compass';
    
    try {
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

      aiTime = Date.now() - aiStart;

      if (!aiResponse.ok) {
        throw new Error(`Bun AI service failed: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      console.log(`🤖 Bun AI generation completed: ${aiTime}ms`);

      if (!aiResult.success || !aiResult.report) {
        throw new Error('Bun AI service returned invalid response');
      }

      report = aiResult.report;
      console.log('✅ Got successful Bun AI response');
      
    } catch (bunError) {
      console.error('⚠️ Bun AI service failed, using local fallback:', bunError);
      
      // 🔄 LOCAL FALLBACK: Generate report locally when Bun fails
      const windMph = Math.round(surfData.details.wind_speed_kts * 1.15078);
      const fallbackReport = createDetailedFallbackReport(surfData, windMph);
      
      report = {
        id: `surf_fallback_enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        location: surfData.location,
        report: fallbackReport,
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
          board_type: surfData.details.wave_height_ft >= 3 ? 'Shortboard (6\'0" - 6\'6")' : 'Longboard (8\'6" - 9\'2")',
          wetsuit_thickness: surfData.weather.water_temperature_f < 65 ? '3/2mm' : 'Spring suit',
          skill_level: surfData.score >= 65 ? 'intermediate' : 'beginner',
          best_spots: ['Vilano Beach', 'St. Augustine Pier', 'Crescent Beach'],
          timing_advice: 'Check conditions regularly as they change throughout the day'
        },
        cached_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      };
      
      aiTime = Date.now() - aiStart;
      dataSource = 'local-fallback-with-compass';
      console.log('✅ Generated local fallback report');
    }

    // 🚨 CRITICAL: ADD COMPASS DIRECTIONS TO BOTH BUN AND FALLBACK REPORTS
    report = enhanceReportWithCompassDirections(report, surfData);

    // Save to database
    await saveReport(report);
    console.log('✅ Enhanced report saved to database:', report.id);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ Total generation time: ${totalTime}ms`);
    
    return NextResponse.json(report, {
      headers: {
        'X-Data-Source': dataSource,
        'X-Cache-Status': 'miss',
        'X-Response-Time': `${totalTime}ms`,
        'X-Surf-Data-Time': `${surfDataTime}ms`,
        'X-AI-Generation-Time': `${aiTime}ms`,
        'X-Cache-Valid-Until': report.cached_until,
        'X-API-Calls-Made': '2',
        'X-AI-Backend': 'bun-service-or-fallback',
        'X-Compass-Data': 'preserved',
        'X-Enhancement': 'compass-directions-added'
      }
    });

  } catch (error) {
    console.error('❌ Fresh generation via Bun failed:', error);
    throw error;
  }
}

// Enhanced fallback report with more detail and compass references
function createDetailedFallbackReport(surfData: any, windMph: number): string {
  const condition = surfData.score >= 70 ? 'good' : surfData.score >= 50 ? 'fair' : 'poor';
  const waveDesc = surfData.details.wave_height_ft >= 4 ? 'solid' : 
                   surfData.details.wave_height_ft >= 2 ? 'fun-sized' : 'small';
  
  // Use compass directions in the report text
  const swellCompass = surfData.details.swell_direction_compass || 'Unknown';
  const windCompass = surfData.details.wind_direction_compass || 'Unknown';
  
  const paragraph1 = `St. Augustine surf check shows ${waveDesc} ${surfData.details.wave_height_ft}ft waves at ${surfData.details.wave_period_sec} seconds from ${swellCompass} direction, delivering ${surfData.details.wave_period_sec >= 10 ? 'decent power with some nice long rides' : 'quicker, choppier waves with less power'}. Wind is ${windMph} mph from the ${windCompass} which ${windMph < 10 ? 'is light enough for clean, glassy conditions' : 'is creating some texture and bump on the water'}. Tide is ${surfData.details.tide_state.toLowerCase()} and water temp is ${surfData.weather.water_temperature_f}°F.`;
  
  const paragraph2 = `${surfData.details.wave_height_ft >= 3 ? 'Grab your shortboard and head to Vilano Beach or the pier area where the waves should have some punch' : 'Perfect longboard day - try Vilano Beach or Crescent Beach for the mellow, rolling waves'}. ${surfData.weather.water_temperature_f < 65 ? 'You\'ll want a 3/2mm wetsuit for that chilly water' : 'Spring suit or boardshorts should be perfect for the comfortable water temps'}. ${condition === 'good' ? 'Definitely worth the paddle out today!' : condition === 'fair' ? 'Surfable conditions if you need your wave fix.' : 'Might be better for beach walks, but conditions can change quickly.'}`;
  
  return `${paragraph1}\n\n${paragraph2}`;
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