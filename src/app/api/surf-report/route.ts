import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { getCachedReport, saveReport, initializeDatabase } from '@/lib/db';

const surfReportSchema = z.object({
  report: z.string().describe('A friendly, conversational surf report in the voice of a local surfer'),
  recommendations: z.object({
    board_type: z.string().describe('Recommended board type'),
    wetsuit_thickness: z.string().optional().describe('Wetsuit thickness needed'),
    skill_level: z.enum(['beginner', 'intermediate', 'advanced']).describe('Who these conditions are best for'),
    best_spots: z.array(z.string()).optional().describe('Specific surf spots in St. Augustine area'),
    timing_advice: z.string().optional().describe('Best time to surf today')
  })
});

export async function GET(request: NextRequest) {
  try {
    // Initialize database on first run
    await initializeDatabase();
    
    // Check cache first
    const cachedReport = await getCachedReport();
    if (cachedReport) {
      console.log('📋 Returning cached report');
      return NextResponse.json(cachedReport);
    }

    console.log('🤖 Generating new AI report...');
    
    // Fetch surf conditions
    const surfDataResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/surfability`, {
      cache: 'no-store'
    });
    
    if (!surfDataResponse.ok) {
      throw new Error('Failed to fetch surf conditions');
    }

    const surfData = await surfDataResponse.json();
    
    // Generate AI report
    const { object: aiReport } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt: `
        Generate a friendly, conversational surf report for St. Augustine, Florida based on these conditions:

        🌊 Wave Height: ${surfData.details.wave_height_ft} ft
        ⏱️ Wave Period: ${surfData.details.wave_period_sec} seconds
        💨 Wind: ${surfData.details.wind_speed_kts} knots from ${surfData.details.wind_direction_deg}°
        🌊 Tide: ${surfData.details.tide_state} (${surfData.details.tide_height_ft} ft)
        ☀️ Weather: ${surfData.weather.weather_description}
        🌡️ Air: ${surfData.weather.air_temperature_f}°F | Water: ${surfData.weather.water_temperature_f}°F
        📊 Score: ${surfData.score}/100

        🕐 Next High: ${surfData.tides.next_high?.time || 'N/A'}
        🕐 Next Low: ${surfData.tides.next_low?.time || 'N/A'}

        Write as a friendly local surfer who knows St. Augustine well. Include:
        - Honest assessment (don't oversell poor conditions)
        - Board recommendations based on wave size
        - Wetsuit advice based on water temp
        - Best timing based on tides/wind
        - Specific spots (Vilano Beach, St. Augustine Beach, etc.)
        - Any hazards to watch out for

        Keep it conversational, 150-200 words.
      `,
      temperature: 0.7,
    });

    // Create report object
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
    
    console.log('✅ New report generated and saved');
    return NextResponse.json(report);

  } catch (error) {
    console.error('❌ Error generating surf report:', error);
    return NextResponse.json(
      { error: 'Failed to generate surf report' },
      { status: 500 }
    );
  }
}