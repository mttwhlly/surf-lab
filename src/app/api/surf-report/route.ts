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
    timing_advice: z.string().optional().describe('Best time to surf today')
  })
});

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 AI Surf Report API called');
    
    // Initialize database on first run
    await initializeDatabase();
    
    // Check cache first
    const cachedReport = await getCachedReport();
    if (cachedReport) {
      console.log('📋 Returning cached report');
      return NextResponse.json(cachedReport);
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
    
    // Generate AI report
    const { object: aiReport } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
              prompt: `
        Generate a friendly, conversational surf report for St. Augustine, Florida based on these current conditions:

        🌊 Wave Height: ${surfData.details.wave_height_ft} ft
        ⏱️ Wave Period: ${surfData.details.wave_period_sec} seconds  
        💨 Wind: ${surfData.details.wind_speed_kts} knots from ${surfData.details.wind_direction_deg}°
        🌊 Tide: ${surfData.details.tide_state} (${surfData.details.tide_height_ft} ft)
        ☀️ Weather: ${surfData.weather.weather_description}
        🌡️ Air: ${surfData.weather.air_temperature_f}°F | Water: ${surfData.weather.water_temperature_f}°F
        📊 Surfability Score: ${surfData.score}/100

        🕐 Next High Tide: ${surfData.tides.next_high?.time || 'N/A'}
        🕐 Next Low Tide: ${surfData.tides.next_low?.time || 'N/A'}

        Write this in the voice of a friendly local surfer who knows St. Augustine well. Include:
        - Honest assessment of conditions (don't oversell poor conditions)
        - Practical advice about what to expect
        - Board recommendations based on wave size and conditions
        - Wetsuit advice based on water temperature
        - Timing suggestions based on tide and wind (ONLY suggest surfing during daylight hours - dawn to dusk, roughly 6 AM to 7 PM)
        - Specific spot recommendations if relevant (Vilano Beach, St. Augustine Beach, etc.)
        - Any hazards or things to watch out for

        IMPORTANT: Only recommend surf sessions during reasonable daylight hours (6 AM - 7 PM). If the best tide times are at night, suggest the next best daytime window or mention waiting until tomorrow's better daytime tides.

        Keep it conversational but informative, around 150-200 words.
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
      cached_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
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