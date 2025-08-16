import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🕐 CRON JOB STARTED (BUN-POWERED):', new Date().toISOString());
    
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

    // STEP 3: Call Bun service to generate fresh report
    console.log('🚀 CALLING BUN SERVICE FOR FRESH GENERATION...');
    
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const vercelUrl = `${protocol}://${host}`;
    
    const bunServiceUrl = process.env.BUN_SERVICE_URL;
    if (!bunServiceUrl) {
      throw new Error('BUN_SERVICE_URL not configured');
    }
    
    const generationStart = Date.now();
    
    try {
      const bunResponse = await fetch(`${bunServiceUrl}/cron/generate-fresh-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SurfLab-Vercel-Cron/1.0'
        },
        body: JSON.stringify({
          cronSecret: process.env.CRON_SECRET,
          vercelUrl: vercelUrl
        }),
        signal: AbortSignal.timeout(45000) // 45 second timeout
      });

      const generationTime = Date.now() - generationStart;

      if (bunResponse.ok) {
        const bunResult = await bunResponse.json();
        
        console.log('✅ BUN SERVICE SUCCESS:', {
          reportId: bunResult.actions?.new_report_id,
          generationTime: `${generationTime}ms`,
          bunPerformance: bunResult.performance
        });
        
        const totalTime = Date.now() - startTime;
        
        const response = {
          success: true,
          timestamp: new Date().toISOString(),
          source: 'external-cron-coolify',
          method: 'bun-service-generation',
          performance: {
            total_time_ms: totalTime,
            bun_generation_time_ms: generationTime,
            bun_ai_time_ms: bunResult.performance?.ai_generation_ms,
            within_timeout: totalTime < 50000
          },
          actions: {
            old_reports_cleaned: cleanupResult.length,
            current_cache_cleared: clearCurrentCache.length,
            new_report_generated: bunResult.success,
            new_report_id: bunResult.actions?.new_report_id,
            bun_backend: bunResult.backend
          },
          bun_service: {
            url: bunServiceUrl,
            performance: bunResult.performance,
            runtime: bunResult.performance?.runtime
          },
          note: 'Fresh surf report successfully generated via Bun service'
        };

        console.log('🎯 CRON JOB COMPLETED SUCCESSFULLY (BUN-POWERED)');
        return NextResponse.json(response);
        
      } else {
        const errorText = await bunResponse.text();
        throw new Error(`Bun service failed: ${bunResponse.status} - ${errorText}`);
      }
      
    } catch (generationError) {
      console.error('⚠️ Bun service failed, but cache cleared:', generationError);
      
      const partialTime = Date.now() - startTime;
      
      // Return success even if generation failed - cache is cleared
      const response = {
        success: true, // Still success because cache was cleared
        timestamp: new Date().toISOString(),
        source: 'external-cron-coolify',
        method: 'cache-clear-only',
        performance: {
          total_time_ms: partialTime,
          bun_generation_failed: true,
          bun_generation_error: generationError instanceof Error ? generationError.message : String(generationError)
        },
        actions: {
          old_reports_cleaned: cleanupResult.length,
          current_cache_cleared: clearCurrentCache.length,
          new_report_generated: false,
          fallback_strategy: 'next-user-request-will-generate-via-bun'
        },
        bun_service: {
          url: bunServiceUrl,
          status: 'failed',
          error: generationError instanceof Error ? generationError.message : String(generationError)
        },
        note: 'Cache cleared - next user request will generate fresh report via Bun service'
      };

      console.log('⚡ CRON JOB COMPLETED (cache cleared, Bun generation will happen on next user request)');
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