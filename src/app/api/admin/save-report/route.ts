import { NextRequest, NextResponse } from 'next/server';
import { saveReport } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Save report request received');
    
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized save request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { report } = body;
    
    if (!report || !report.id || !report.report) {
      return NextResponse.json({ error: 'Invalid report data' }, { status: 400 });
    }

    await saveReport(report);
    console.log('✅ Report saved successfully:', report.id);
    
    return NextResponse.json({
      success: true,
      reportId: report.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error saving report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}