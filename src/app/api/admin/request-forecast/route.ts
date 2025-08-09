import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Cron job triggered at:', new Date().toISOString());
    
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

    // Step 1: Clear cached surf reports
    const clearedReports = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
      RETURNING id, timestamp
    `;

    console.log(`🗑️ Cleared ${clearedReports.length} cached surf reports`);

    // Step 2: Instead of internal API calls, just force cache refresh
    // The next request to /api/surf-report will generate fresh data automatically
    
    console.log('✅ Cache cleared - next request will generate fresh data');

    // Step 3: Optionally, make a single external request to warm the cache
    try {
      console.log('🔥 Warming cache with fresh surf report...');
      
      // Make external request to our own API (this works reliably)
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host');
      const externalUrl = `${protocol}://${host}`;
      
      const warmupResponse = await fetch(`${externalUrl}/api/surf-report`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SurfLab-Cron-Warmup/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(45000) // 45 second timeout
      });

      if (warmupResponse.ok) {
        const warmupData = await warmupResponse.json();
        console.log('✅ Cache warmed with fresh report:', warmupData.id);
        
        const response = {
          success: true,
          timestamp: new Date().toISOString(),
          source: 'external-cron-coolify',
          userAgent: request.headers.get('user-agent'),
          method: 'cache-clear-and-warmup',
          actions: {
            cleared_reports: clearedReports.length,
            cache_warmed: true,
            new_report_id: warmupData.id,
            warmup_status: warmupResponse.status
          },
          note: 'Cache cleared and warmed with fresh surf report'
        };

        console.log('🎯 Cron job completed successfully:', response);
        return NextResponse.json(response);
        
      } else {
        // If warmup fails, that's OK - cache is still cleared
        console.log(`⚠️ Cache warmup failed: ${warmupResponse.status}, but cache cleared successfully`);
        
        const response = {
          success: true,
          timestamp: new Date().toISOString(),
          source: 'external-cron-coolify',
          userAgent: request.headers.get('user-agent'),
          method: 'cache-clear-only',
          actions: {
            cleared_reports: clearedReports.length,
            cache_warmed: false,
            warmup_error: warmupResponse.status
          },
          note: 'Cache cleared - next user request will generate fresh data'
        };

        console.log('🎯 Cron job completed with partial success:', response);
        return NextResponse.json(response);
      }
      
    } catch (warmupError) {
      // If warmup fails completely, that's still OK
      console.log('⚠️ Cache warmup error:', warmupError);
      
      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        source: 'external-cron-coolify',
        userAgent: request.headers.get('user-agent'),
        method: 'cache-clear-only',
        actions: {
          cleared_reports: clearedReports.length,
          cache_warmed: false,
          warmup_error: warmupError instanceof Error ? warmupError.message : String(warmupError)
        },
        note: 'Cache cleared - next user request will generate fresh data'
      };

      console.log('🎯 Cron job completed (cache cleared):', response);
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    
    const errorResponse = {
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}