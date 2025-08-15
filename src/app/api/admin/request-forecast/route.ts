import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🕐 CRON JOB STARTED:', new Date().toISOString());
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.log('❌ CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authorized cron request');

    // STEP 1: Clear old cached reports (optional cleanup)
    const cleanupResult = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL' 
      AND timestamp < NOW() - INTERVAL '12 hours'
      RETURNING id
    `;

    console.log(`🗑️ Cleaned up ${cleanupResult.length} old reports (>12h)`);

    // STEP 2: PRE-GENERATE FRESH SURF REPORT
    // This is the key change - instead of clearing cache, we generate new data
    
    console.log('🚀 PRE-GENERATING FRESH SURF REPORT...');
    
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    // Force fresh generation by making sure no valid cache exists
    const clearCurrentCache = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
      RETURNING id, timestamp
    `;
    
    console.log(`🗑️ Cleared ${clearCurrentCache.length} current reports to force fresh generation`);

    // Now generate completely fresh report
    const generationStart = Date.now();
    
    const reportResponse = await fetch(`${baseUrl}/api/surf-report`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SurfLab-Cron-PreGeneration/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Cron-Generation': 'true'
      },
      signal: AbortSignal.timeout(60000) // 60 second timeout for generation
    });

    const generationTime = Date.now() - generationStart;

    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      
      console.log('✅ FRESH REPORT PRE-GENERATED:', {
        reportId: reportData.id,
        generationTime: `${generationTime}ms`,
        waveHeight: reportData.conditions?.wave_height_ft,
        score: reportData.conditions?.surfability_score
      });
      
      // STEP 3: Verify the report was cached properly
      const verifyCache = await sql`
        SELECT id, timestamp, cached_until 
        FROM surf_reports 
        WHERE location = 'St. Augustine, FL' 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      
      const totalTime = Date.now() - startTime;
      
      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        source: 'external-cron-coolify',
        userAgent: request.headers.get('user-agent'),
        method: 'pre-generation',
        performance: {
          total_time_ms: totalTime,
          generation_time_ms: generationTime,
          report_generation_successful: true
        },
        actions: {
          old_reports_cleaned: cleanupResult.length,
          current_cache_cleared: clearCurrentCache.length,
          new_report_generated: true,
          new_report_id: reportData.id,
          new_report_cached_until: reportData.cached_until
        },
        verification: {
          reports_in_cache: verifyCache.length,
          latest_report_id: verifyCache[0]?.id,
          latest_cached_until: verifyCache[0]?.cached_until
        },
        next_expected_runs: [
          '5:00 AM ET',
          '9:00 AM ET', 
          '1:00 PM ET',
          '4:00 PM ET'
        ],
        note: 'Fresh surf report pre-generated - users will get instant <200ms responses'
      };

      console.log('🎯 CRON JOB COMPLETED SUCCESSFULLY');
      console.log(`⚡ Total time: ${totalTime}ms`);
      
      return NextResponse.json(response);
      
    } else {
      console.error(`❌ Report generation failed: ${reportResponse.status}`);
      
      const errorResponse = {
        success: false,
        error: 'Report generation failed',
        timestamp: new Date().toISOString(),
        details: {
          http_status: reportResponse.status,
          generation_time_ms: generationTime,
          cleanup_completed: true,
          old_reports_cleaned: cleanupResult.length
        },
        note: 'Cache cleared but new report generation failed'
      };
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
      
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ CRON JOB FAILED:', error);
    
    const errorResponse = {
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      performance: {
        total_time_ms: totalTime,
        failed_at: 'unknown'
      }
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}