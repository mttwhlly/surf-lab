import { NextRequest, NextResponse } from 'next/server';
import { getCachedReport } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Test 1: Check if we have a cached report
    const cacheCheckStart = Date.now();
    const cachedReport = await getCachedReport();
    const cacheCheckTime = Date.now() - cacheCheckStart;
    
    // Test 2: Make a request to our surf report API
    const apiTestStart = Date.now();
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const testResponse = await fetch(`${baseUrl}/api/surf-report`, {
      headers: {
        'User-Agent': 'SurfLab-Performance-Check/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const apiTestTime = Date.now() - apiTestStart;
    const totalTime = Date.now() - startTime;
    
    // Analyze cache status
    let cacheStatus = 'none';
    let cacheAge = null;
    let isOptimal = false;
    
    if (cachedReport) {
      const reportAge = Date.now() - new Date(cachedReport.timestamp).getTime();
      cacheAge = Math.round(reportAge / (1000 * 60)); // minutes
      
      if (reportAge < 2 * 60 * 60 * 1000) { // < 2 hours
        cacheStatus = 'fresh';
        isOptimal = apiTestTime < 500; // Should be very fast with fresh cache
      } else if (reportAge < 6 * 60 * 60 * 1000) { // < 6 hours  
        cacheStatus = 'stale';
        isOptimal = apiTestTime < 1000; // Should still be reasonably fast
      } else {
        cacheStatus = 'expired';
        isOptimal = false; // Will trigger fresh generation
      }
    }
    
    // Calculate next cron run
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = etNow.getHours();
    const cronHours = [5, 9, 13, 16];
    
    let nextCronHour = cronHours.find(hour => hour > currentHour);
    const nextCron = new Date(etNow);
    
    if (nextCronHour) {
      nextCron.setHours(nextCronHour, 0, 0, 0);
    } else {
      nextCron.setDate(nextCron.getDate() + 1);
      nextCron.setHours(5, 0, 0, 0);
    }
    
    const hoursToNextCron = (nextCron.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Performance assessment
    const performanceGrade = 
      apiTestTime < 200 ? 'A+' :
      apiTestTime < 500 ? 'A' :
      apiTestTime < 1000 ? 'B' :
      apiTestTime < 2000 ? 'C' :
      'D';
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      performance: {
        api_response_time_ms: apiTestTime,
        cache_check_time_ms: cacheCheckTime,
        total_health_check_ms: totalTime,
        grade: performanceGrade,
        is_optimal: isOptimal,
        target_response_time: '< 500ms'
      },
      cache: {
        status: cacheStatus,
        age_minutes: cacheAge,
        has_valid_cache: cacheStatus === 'fresh',
        report_id: cachedReport?.id,
        cached_until: cachedReport?.cached_until
      },
      cron: {
        next_run_et: nextCron.toLocaleString('en-US', {timeZone: 'America/New_York'}),
        hours_until_next_run: Math.round(hoursToNextCron * 10) / 10,
        expected_times: ['5:00 AM', '9:00 AM', '1:00 PM', '4:00 PM'],
        timezone: 'America/New_York'
      },
      api_test: {
        endpoint_responsive: testResponse.ok,
        http_status: testResponse.status,
        data_source: testResponse.headers.get('X-Data-Source'),
        response_time_category: 
          apiTestTime < 200 ? 'Excellent (Pre-generated)' :
          apiTestTime < 500 ? 'Very Good (Cached)' :
          apiTestTime < 1500 ? 'Good (Fast DB)' :
          apiTestTime < 3000 ? 'Slow (Fresh Generation)' :
          'Very Slow (Possible Issues)'
      },
      recommendations: [] as string[],
      overall_status: 'unknown'
    };
    
    // Add recommendations
    if (cacheStatus === 'none') {
      healthCheck.recommendations.push('⚠️ No cached report - cron jobs may not be working');
    } else if (cacheStatus === 'expired' && hoursToNextCron > 0.5) {
      healthCheck.recommendations.push('⚠️ Cache expired - manual cron trigger recommended');
    } else if (apiTestTime > 2000) {
      healthCheck.recommendations.push('🐌 Slow API response - check cron job frequency');
    } else if (cacheStatus === 'fresh' && apiTestTime < 500) {
      healthCheck.recommendations.push('✅ Excellent performance - optimization working perfectly');
    }
    
    if (hoursToNextCron < 0.1) {
      healthCheck.recommendations.push('🔄 Cron job should run very soon');
    }
    
    // Overall status
    if (isOptimal && cacheStatus === 'fresh') {
      healthCheck.overall_status = 'excellent';
    } else if (apiTestTime < 1000 && cacheStatus !== 'none') {
      healthCheck.overall_status = 'good';
    } else if (apiTestTime < 3000) {
      healthCheck.overall_status = 'fair';
    } else {
      healthCheck.overall_status = 'poor';
    }
    
    return NextResponse.json(healthCheck);
    
  } catch (error) {
    console.error('❌ Performance check failed:', error);
    
    return NextResponse.json({
      error: 'Performance check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      overall_status: 'error'
    }, { status: 500 });
  }
}