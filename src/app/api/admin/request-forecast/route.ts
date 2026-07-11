import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { LOCATIONS } from '@/lib/locations';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🕐 CRON JOB STARTED (multi-location):', new Date().toISOString());

    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ Authorized cron request — processing ${LOCATIONS.length} locations`);

    const bunServiceUrl = process.env.BUN_SERVICE_URL;
    if (!bunServiceUrl) {
      throw new Error('BUN_SERVICE_URL not configured');
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const vercelUrl = `${protocol}://${host}`;

    // Clear stale reports (>24h) for all locations
    const cleanupResult = await sql`
      DELETE FROM surf_reports
      WHERE timestamp < NOW() - INTERVAL '24 hours'
      RETURNING id
    `;
    console.log(`🗑️ Cleaned up ${cleanupResult.length} old reports (>24h)`);

    // Clear current cache for all locations
    const clearResult = await sql`
      DELETE FROM surf_reports
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      RETURNING id, location
    `;
    console.log(`🗑️ Cleared ${clearResult.length} current cached reports`);

    // Generate fresh report for each location sequentially
    const results: Array<{ slug: string; name: string; success: boolean; reportId?: string; error?: string }> = [];

    for (const location of LOCATIONS) {
      console.log(`🌊 Generating report for ${location.name}...`);

      try {
        const bunResponse = await fetch(`${bunServiceUrl}/cron/generate-fresh-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'SurfLab-Vercel-Cron/1.0' },
          body: JSON.stringify({
            cronSecret,
            vercelUrl,
            locationSlug: location.slug,
            locationName: location.name,
            localKnowledge: location.localKnowledge,
            voiceDescriptor: location.voiceDescriptor,
            bestSpots: location.bestSpots,
            lat: location.lat,
            timezone: location.timezone,
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (bunResponse.ok) {
          const bunResult = await bunResponse.json();
          console.log(`✅ ${location.name}: report generated (${bunResult.actions?.new_report_id})`);
          results.push({ slug: location.slug, name: location.name, success: true, reportId: bunResult.actions?.new_report_id });
        } else {
          const errorText = await bunResponse.text();
          throw new Error(`Bun service returned ${bunResponse.status}: ${errorText}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ ${location.name} failed:`, message);
        results.push({ slug: location.slug, name: location.name, success: false, error: message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;

    console.log(`🎯 CRON COMPLETE: ${succeeded}/${LOCATIONS.length} locations generated in ${totalTime}ms`);

    return NextResponse.json({
      success: failed === 0,
      timestamp: new Date().toISOString(),
      performance: { total_time_ms: totalTime, within_timeout: totalTime < 55000 },
      actions: {
        old_reports_cleaned: cleanupResult.length,
        current_cache_cleared: clearResult.length,
        locations_succeeded: succeeded,
        locations_failed: failed,
        results,
      },
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ CRON JOB FAILED:', error);

    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      performance: { total_time_ms: totalTime },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
