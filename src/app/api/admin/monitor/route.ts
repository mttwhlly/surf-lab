import { NextRequest, NextResponse } from 'next/server';
import { getCachedReport } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Check database cache status
    const cachedReport = await getCachedReport();
    
    // Calculate cache status
    let cacheStatus = 'none';
    let cacheAge = null;
    let cacheValidUntil = null;
    
    if (cachedReport) {
      const reportAge = now.getTime() - new Date(cachedReport.timestamp).getTime();
      const cacheUntil = new Date(cachedReport.cached_until);
      
      cacheAge = Math.round(reportAge / (1000 * 60)); // minutes
      cacheValidUntil = cacheUntil.toISOString();
      
      if (reportAge < 2 * 60 * 60 * 1000) { // 2 hours
        cacheStatus = 'fresh';
      } else if (reportAge < 6 * 60 * 60 * 1000) { // 6 hours
        cacheStatus = 'stale';
      } else {
        cacheStatus = 'expired';
      }
    }
    
    // Get next expected cron run
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = etNow.getHours();
    const cronHours = [5, 9, 13, 16]; // 5AM, 9AM, 1PM, 4PM ET
    
    let nextCronHour = cronHours.find(hour => hour > currentHour);
    const nextCron = new Date(etNow);
    
    if (nextCronHour) {
      nextCron.setHours(nextCronHour, 0, 0, 0);
    } else {
      nextCron.setDate(nextCron.getDate() + 1);
      nextCron.setHours(5, 0, 0, 0);
    }
    
    const hoursToNextCron = (nextCron.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Environment info
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
      hasDatabase: !!process.env.NEON_DATABASE_URL,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      region: process.env.VERCEL_REGION || 'unknown'
    };
    
    // Test a simple API call to see response times
    const testStart = Date.now();
    try {
      const testResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/health`);
      const testDuration = Date.now() - testStart;
      
      const monitoring = {
        timestamp: now.toISOString(),
        timezone: 'America/New_York',
        currentTime: etNow.toLocaleString(),
        
        cache: {
          status: cacheStatus,
          ageMinutes: cacheAge,
          validUntil: cacheValidUntil,
          reportId: cachedReport?.id,
          hasValidCache: cacheStatus === 'fresh'
        },
        
        cron: {
          nextRun: nextCron.toISOString(),
          nextRunLocal: nextCron.toLocaleString(),
          hoursUntil: Math.round(hoursToNextCron * 10) / 10,
          expectedRuns: cronHours.map(h => `${h}:00 ET`)
        },
        
        environment,
        
        performance: {
          healthCheckMs: testDuration,
          healthCheckOk: testResponse.ok
        },
        
        recommendations: [] as string[]
      };
      
      // Add recommendations based on status
      if (cacheStatus === 'none') {
        monitoring.recommendations.push('⚠️ No cached report found - first request will be slow');
      } else if (cacheStatus === 'expired') {
        monitoring.recommendations.push('⚠️ Cache expired - requests will trigger fresh generation');
      } else if (cacheStatus === 'fresh') {
        monitoring.recommendations.push('✅ Cache is fresh - requests should be fast (<200ms)');
      }
      
      if (hoursToNextCron < 0.5) {
        monitoring.recommendations.push('🔄 Cron job should run soon - expect cache refresh');
      }
      
      if (testDuration > 1000) {
        monitoring.recommendations.push('⚠️ Slow health check - Vercel cold start or connection issues');
      }
      
      return NextResponse.json(monitoring);
      
    } catch (testError) {
      return NextResponse.json({
        error: 'Monitoring check failed',
        details: testError instanceof Error ? testError.message : 'Unknown error',
        partialData: { cacheStatus, cacheAge, environment }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Monitoring endpoint error:', error);
    
    return NextResponse.json({
      error: 'Monitoring failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}