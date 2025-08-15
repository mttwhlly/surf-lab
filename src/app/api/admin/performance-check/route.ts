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
      signal: AbortSignal.timeout(5000)
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
        isOptimal = apiTestTime < 500;
      } else if (reportAge < 6 * 60 * 60 * 1000) { // < 6 hours  
        cacheStatus = 'stale';
        isOptimal = apiTestTime < 1000;
      } else {
        cacheStatus = 'expired';
        isOptimal = false;
      }
    }
    
    // CORRECTED: Proper timezone calculation
    const now = new Date();
    
    // Create a date in Eastern timezone
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const etParts = etFormatter.formatToParts(now);
    const etYear = parseInt(etParts.find(p => p.type === 'year')?.value || '0');
    const etMonth = parseInt(etParts.find(p => p.type === 'month')?.value || '0') - 1; // Month is 0-indexed
    const etDay = parseInt(etParts.find(p => p.type === 'day')?.value || '0');
    const etHour = parseInt(etParts.find(p => p.type === 'hour')?.value || '0');
    const etMinute = parseInt(etParts.find(p => p.type === 'minute')?.value || '0');
    
    // Current time display
    const currentTimeET = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Cron hours: 5, 9, 13, 16 (5AM, 9AM, 1PM, 4PM ET)
    const cronHours = [5, 9, 13, 16];
    
    // Find next cron hour
    let nextCronHour = cronHours.find(hour => hour > etHour);
    
    // Create next cron time in ET
    let nextCronET = new Date();
    nextCronET.setFullYear(etYear, etMonth, etDay);
    
    if (nextCronHour) {
      // Next cron is today
      nextCronET.setHours(nextCronHour, 0, 0, 0);
    } else {
      // Next cron is tomorrow at 5 AM
      nextCronET.setDate(etDay + 1);
      nextCronET.setHours(5, 0, 0, 0);
    }
    
    // Convert to UTC for calculation
    const etOffset = now.getTimezoneOffset() + 
      (nextCronET.getTimezoneOffset() - new Date().getTimezoneOffset());
    const nextCronUTC = new Date(nextCronET.getTime() - (etOffset * 60000));
    
    // Calculate hours until next cron
    const hoursUntilNext = (nextCronUTC.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Format next cron display
    const nextCronDisplay = nextCronET.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
        current_time_et: currentTimeET,
        current_hour_et: etHour,
        next_run_et: nextCronDisplay,
        hours_until_next_run: Math.round(hoursUntilNext * 10) / 10,
        expected_times: ['5:00 AM ET', '9:00 AM ET', '1:00 PM ET', '4:00 PM ET'],
        timezone: 'America/New_York',
        debug: {
          raw_et_hour: etHour,
          next_cron_hour: nextCronHour || 'tomorrow 5AM',
          calculation_method: 'Intl.DateTimeFormat'
        }
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
    
    // Add recommendations based on corrected timing
    if (cacheStatus === 'none') {
      healthCheck.recommendations.push('⚠️ No cached report - cron jobs may not be working');
    } else if (cacheStatus === 'expired' && hoursUntilNext > 0.5) {
      healthCheck.recommendations.push('⚠️ Cache expired - manual cron trigger recommended');
    } else if (apiTestTime > 2000) {
      healthCheck.recommendations.push('🐌 Slow API response - check cron job frequency');
    } else if (cacheStatus === 'fresh' && apiTestTime < 500) {
      healthCheck.recommendations.push('✅ Excellent performance - optimization working perfectly');
    }
    
    // Cron timing recommendations
    if (Math.abs(hoursUntilNext) < 0.1) {
      healthCheck.recommendations.push('🔄 Cron job should run very soon');
    } else if (hoursUntilNext < 0) {
      healthCheck.recommendations.push('⚠️ Cron job appears overdue - check scheduler');
    } else if (hoursUntilNext > 0 && hoursUntilNext < 1) {
      healthCheck.recommendations.push('⏰ Next cron job within the hour');
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