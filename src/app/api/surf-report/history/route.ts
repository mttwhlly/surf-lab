import { NextRequest, NextResponse } from 'next/server';
import { getRecentReports } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const reports = await getRecentReports('St. Augustine, FL', limit);
    
    return NextResponse.json({
      reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report history' },
      { status: 500 }
    );
  }
}