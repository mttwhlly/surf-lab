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
    
    // FIXED: Calculate next cron run with proper timezone handling
    const now = new Date();
    
    // Get current time in Eastern timezone
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const utcNow = new Date(); // UTC time for comparison
    
    // Current hour in ET
    const currentHourET = etNow.getHours();
    const currentMinuteET = etNow.getMinutes();
    
    // Cron runs at: 5, 9, 13, 16 (5AM, 9AM, 1PM, 4PM ET)
    const cronHours = [5, 9, 13, 16];
    
    // Find next cron hour
    let nextCronHour = cronHours.find(hour => hour > currentHourET);
    
    // Calculate next cron time in ET
    const nextCronET = new Date(etNow);
    
    if (nextCronHour) {
      // Next cron is today
      nextCronET.setHours(nextCronHour, 0, 0, 0);
    } else {
      // Next cron is tomorrow at 5 AM
      nextCronET.setDate(nextCronET.getDate() + 1);
      nextCronET.setHours(5, 0, 0, 0);
    }
    
    // Convert back to UTC for accurate time difference calculation
    const nextCronUTC = new Date(nextCronET.toLocaleString("en-US", {timeZone: "UTC"}));
    
    // Calculate time difference in hours
    const millisecondsToNext = nextCronUTC.getTime() - utcNow.getTime();
    const hoursToNext = millisecondsToNext / (1000 * 60 * 60);
    
    // Debug logging
    console.log('🕐 Cron calculation debug:', {
      currentUTC: utcNow.toISOString(),
      currentET: etNow.toLocaleString(),
      currentHourET,
      nextCronET: nextCronET.toLocaleString(),
      nextCronUTC: nextCronUTC.toISOString(),
      millisecondsToNext,
      hoursToNext: Math.round(hoursToNext * 10) / 10
    });
    
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
        current_time_et: etNow.toLocaleString('en-US', {timeZone: 'America/New_York'}),
        current_time_utc: utcNow.toISOString(),
        next_run_et: nextCronET.toLocaleString('en-US', {timeZone: 'America/New_York'}),
        next_run_utc: nextCronUTC.toISOString(),
        hours_until_next_run: Math.round(hoursToNext * 10) / 10,
        expected_times: ['5:00 AM ET', '9:00 AM ET', '1:00 PM ET', '4:00 PM ET'],
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
    } else if (cacheStatus === 'expired' && hoursToNext > 0.5) {
      healthCheck.recommendations.push('⚠️ Cache expired - manual cron trigger recommended');
    } else if (apiTestTime > 2000) {
      healthCheck.recommendations.push('🐌 Slow API response - check cron job frequency');
    } else if (cacheStatus === 'fresh' && apiTestTime < 500) {
      healthCheck.recommendations.push('✅ Excellent performance - optimization working perfectly');
    }
    
    // Fixed cron timing recommendations
    if (hoursToNext < 0.1 && hoursToNext > -0.1) {
      healthCheck.recommendations.push('🔄 Cron job should run very soon');
    } else if (hoursToNext < 0) {
      healthCheck.recommendations.push('⚠️ Cron job appears overdue - check scheduler');
    } else if (hoursToNext > 6) {
      healthCheck.recommendations.push('⏰ Next cron job is far away - check if additional runs needed');
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