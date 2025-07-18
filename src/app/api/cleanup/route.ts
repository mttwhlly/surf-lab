import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldReports } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron job or authenticated request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const deletedCount = await cleanupOldReports(7); // Keep 7 days
    
    return NextResponse.json({ 
      message: `Cleaned up ${deletedCount} old reports` 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}