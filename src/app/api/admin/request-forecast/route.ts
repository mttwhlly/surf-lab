import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

// Configure timeout for this function
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

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

    // STEP 1: Quick cleanup of very old reports
    const cleanupResult = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL' 
      AND timestamp < NOW() - INTERVAL '24 hours'
      RETURNING id
    `;

    console.log(`🗑️ Cleaned up ${cleanupResult.length} old reports (>24h)`);

    // STEP 2: Clear current cache to force fresh generation
    const clearCurrentCache = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
      RETURNING id, timestamp
    `;
    
    console.log(`🗑️ Cleared ${clearCurrentCache.length} current reports`);

    // STEP 3: Attempt fresh generation with shorter timeout
    console.log('🚀 ATTEMPTING FRESH GENERATION...');
    
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    const generationStart = Date.now();
    
    try {
      // Use shorter timeout for the generation call
      const reportResponse = await fetch(`${baseUrl}/api/surf-report`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SurfLab-Cron-PreGeneration/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Cron-Generation': 'true'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const generationTime = Date.now() - generationStart;

      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        
        console.log('✅ FRESH REPORT GENERATED:', {
          reportId: reportData.id,
          generationTime: `${generationTime}ms`,
          waveHeight: reportData.conditions?.wave_height_ft,
          score: reportData.conditions?.surfability_score
        });
        
        const totalTime = Date.now() - startTime;
        
        const response = {
          success: true,
          timestamp: new Date().toISOString(),
          source: 'external-cron-coolify',
          method: 'pre-generation-success',
          performance: {
            total_time_ms: totalTime,
            generation_time_ms: generationTime,
            within_timeout: totalTime < 50000 // 50 second buffer
          },
          actions: {
            old_reports_cleaned: cleanupResult.length,
            current_cache_cleared: clearCurrentCache.length,
            new_report_generated: true,
            new_report_id: reportData.id,
            new_report_cached_until: reportData.cached_until
          },
          note: 'Fresh surf report successfully pre-generated'
        };

        console.log('🎯 CRON JOB COMPLETED SUCCESSFULLY');
        return NextResponse.json(response);
        
      } else {
        throw new Error(`Generation failed: ${reportResponse.status}`);
      }
      
    } catch (generationError) {
      console.error('⚠️ Generation failed, but cache cleared:', generationError);
      
      const partialTime = Date.now() - startTime;
      
      // Return success even if generation failed - cache is cleared
      const response = {
        success: true, // Still success because cache was cleared
        timestamp: new Date().toISOString(),
        source: 'external-cron-coolify',
        method: 'cache-clear-only',
        performance: {
          total_time_ms: partialTime,
          generation_failed: true,
          generation_error: generationError instanceof Error ? generationError.message : String(generationError)
        },
        actions: {
          old_reports_cleaned: cleanupResult.length,
          current_cache_cleared: clearCurrentCache.length,
          new_report_generated: false,
          fallback_strategy: 'next-user-request-will-generate'
        },
        note: 'Cache cleared - next user request will generate fresh report'
      };

      console.log('⚡ CRON JOB COMPLETED (cache cleared, generation will happen on next user request)');
      return NextResponse.json(response);
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
        failed_at: 'setup-or-auth'
      }
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}