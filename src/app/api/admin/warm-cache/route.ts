import { NextRequest, NextResponse } from 'next/server';
import { hasValidCache, getCacheStats, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔥 Cache warmer started');
    
    // Optional auth check (remove if not needed)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Initialize database connection
    const initStart = Date.now();
    await initializeDatabase();
    const initTime = Date.now() - initStart;
    
    // Step 2: Warm the connection with a simple query
    const warmStart = Date.now();
    const hasCache = await hasValidCache();
    const warmTime = Date.now() - warmStart;
    
    // Step 3: Get cache statistics  
    const statsStart = Date.now();
    const stats = await getCacheStats();
    const statsTime = Date.now() - statsStart;
    
    const totalTime = Date.now() - startTime;
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      performance: {
        total_time_ms: totalTime,
        init_time_ms: initTime,
        warm_query_ms: warmTime,
        stats_query_ms: statsTime
      },
      cache_status: {
        has_valid_cache: hasCache,
        total_reports: stats.totalReports,
        valid_reports: stats.validReports,
        oldest_report: stats.oldestReport,
        newest_report: stats.newestReport
      },
      recommendations: [] as string[]
    };
    
    // Add performance recommendations
    if (warmTime < 100) {
      result.recommendations.push('✅ Excellent database performance');
    } else if (warmTime < 500) {
      result.recommendations.push('✅ Good database performance');
    } else if (warmTime < 2000) {
      result.recommendations.push('⚠️ Slow database - possible cold start');
    } else {
      result.recommendations.push('🐌 Very slow database - check connection');
    }
    
    if (!hasCache) {
      result.recommendations.push('⚠️ No valid cache - recommend running cron job');
    }
    
    if (stats.validReports === 0) {
      result.recommendations.push('🚨 No valid reports in cache - urgent cron job needed');
    }
    
    console.log(`🔥 Cache warmer completed: ${totalTime}ms`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Cache warmer failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cache warmer failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Support POST for easier testing
export async function POST(request: NextRequest) {
  return GET(request);
}