import { NextRequest, NextResponse } from 'next/server';
import { saveReport } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Save report request received');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized save request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { report } = body;
    
    if (!report) {
      return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
    }

    // Validate required fields
    if (!report.id || !report.report || !report.conditions || !report.recommendations) {
      return NextResponse.json({ 
        error: 'Invalid report structure', 
        missing: {
          id: !report.id,
          report: !report.report,
          conditions: !report.conditions,
          recommendations: !report.recommendations
        }
      }, { status: 400 });
    }

    // Save to database
    await saveReport(report);
    
    console.log('✅ Report saved successfully:', report.id);
    
    return NextResponse.json({
      success: true,
      reportId: report.id,
      timestamp: new Date().toISOString(),
      reportLength: report.report?.length || 0
    });

  } catch (error) {
    console.error('❌ Error saving report:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save report',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Handle GET requests for debugging
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to save reports',
    endpoint: '/api/admin/save-report',
    method: 'POST',
    auth: 'Bearer token required'
  });
}