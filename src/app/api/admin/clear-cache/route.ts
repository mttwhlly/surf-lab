import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Clearing surf report cache...');
    
    // Delete all cached surf reports
    const result = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
      RETURNING id, timestamp, conditions->>'wave_height_ft' as wave_height
    `;

    console.log(`✅ Cleared ${result.length} cached surf reports`);
    
    // Log what was cleared
    result.forEach((report: any) => {
      console.log(`   - ${report.id}: ${report.wave_height}ft waves from ${report.timestamp}`);
    });

    return NextResponse.json({
      success: true,
      cleared: result.length,
      message: `Cleared ${result.length} cached surf reports`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to clear the surf report cache',
    endpoint: '/api/admin/clear-cache',
    method: 'POST'
  });
}