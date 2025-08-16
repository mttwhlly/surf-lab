import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { initializeDatabase, getCachedReport, getCacheStats } from '@/lib/db';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test 1: Basic connection
    const connectionTest = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    // Test 2: Initialize database
    await initializeDatabase();
    
    // Test 3: Check table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'surf_reports'
      ORDER BY ordinal_position
    `;
    
    // Test 4: Count existing reports
    const reportCount = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as recent,
        MAX(timestamp) as latest_timestamp
      FROM surf_reports
    `;
    
    // Test 5: Get cache stats
    const cacheStats = await getCacheStats();
    
    // Test 6: Try to get cached report
    const cachedReport = await getCachedReport();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        connection: {
          status: 'success',
          current_time: connectionTest[0].current_time,
          pg_version: connectionTest[0].pg_version?.substring(0, 50) + '...'
        },
        table_structure: {
          status: 'success',
          columns: tableInfo.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable
          }))
        },
        report_counts: {
          total_reports: parseInt(reportCount[0].total),
          recent_reports: parseInt(reportCount[0].recent),
          latest_timestamp: reportCount[0].latest_timestamp
        },
        cache_stats: cacheStats,
        cached_report: {
          exists: !!cachedReport,
          id: cachedReport?.id,
          timestamp: cachedReport?.timestamp,
          length: cachedReport?.report?.length
        }
      },
      database_url_configured: !!process.env.NEON_DATABASE_URL,
      recommendations: []
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      database_url_configured: !!process.env.NEON_DATABASE_URL
    }, { status: 500 });
  }
}