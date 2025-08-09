import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '');

// Simple in-memory store for SSE connections (in production, use Redis)
const sseConnections = new Set<WritableStreamDefaultWriter>();

// Function to broadcast to all SSE connections
async function broadcastToSSE(data: any) {
  const message = `data: ${JSON.stringify({
    type: 'surf-report',
    data,
    timestamp: new Date().toISOString(),
    source: 'cron-update'
  })}\n\n`;

  const messageBuffer = new TextEncoder().encode(message);
  
  // Send to all connected clients
  const disconnectedClients: WritableStreamDefaultWriter[] = [];
  
  for (const writer of sseConnections) {
    try {
      await writer.write(messageBuffer);
      console.log('📡 Broadcasted update to SSE client');
    } catch (error) {
      console.log('🔌 SSE client disconnected, removing from pool');
      disconnectedClients.push(writer);
    }
  }
  
  // Clean up disconnected clients
  disconnectedClients.forEach(writer => sseConnections.delete(writer));
  
  console.log(`📊 SSE broadcast sent to ${sseConnections.size} connected clients`);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Cron job triggered at:', new Date().toISOString());
    
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Vercel cron jobs include a special header
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') ||
                        request.headers.get('x-vercel-cron') === '1';
    
    // Allow Vercel cron requests or manual requests with correct auth
    const isAuthorized = authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !isAuthorized) {
      console.log('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authorized cron request - clearing cache and refreshing forecast');

    // Step 1: Clear cached surf reports
    const clearedReports = await sql`
      DELETE FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
      RETURNING id, timestamp
    `;

    console.log(`🗑️ Cleared ${clearedReports.length} cached surf reports`);

    // Step 2: Get the base URL for internal API calls  
    const baseUrl = process.env.VERCEL_URL ? 
                   `https://${process.env.VERCEL_URL}` : 
                   (process.env.NEXT_PUBLIC_API_URL || 
                    `https://${request.headers.get('host')}`);

    console.log('🔗 Using base URL:', baseUrl);

    // Step 3: Trigger fresh surf data fetch
    console.log('🌊 Fetching fresh surf conditions...');
    const surfDataResponse = await fetch(`${baseUrl}/api/surfability`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'SurfLab-Cron/1.0'
      }
    });

    if (!surfDataResponse.ok) {
      throw new Error(`Surf data fetch failed: ${surfDataResponse.status}`);
    }

    const surfData = await surfDataResponse.json();
    console.log('✅ Fresh surf data fetched');

    // Step 4: Trigger fresh AI report generation
    console.log('🤖 Generating fresh AI surf report...');
    const aiReportResponse = await fetch(`${baseUrl}/api/surf-report`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'SurfLab-Cron/1.0'
      }
    });

    if (!aiReportResponse.ok) {
      throw new Error(`AI report generation failed: ${aiReportResponse.status}`);
    }

    const aiReport = await aiReportResponse.json();
    console.log('✅ Fresh AI report generated:', aiReport.id);

    // Step 5: Broadcast to all SSE connections
    console.log('📡 Broadcasting update to SSE clients...');
    try {
      await broadcastToSSE(aiReport);
    } catch (sseError) {
      console.error('❌ Error broadcasting to SSE clients:', sseError);
      // Don't fail the whole cron job if SSE broadcast fails
    }

    // Step 6: Return success response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      actions: {
        cleared_reports: clearedReports.length,
        surf_data_updated: true,
        ai_report_generated: true,
        new_report_id: aiReport.id,
        sse_broadcast_sent: true,
        sse_clients_notified: sseConnections.size
      },
      next_scheduled_runs: [
        '5:00 AM Eastern',
        '9:00 AM Eastern', 
        '1:00 PM Eastern',
        '4:00 PM Eastern'
      ]
    };

    console.log('🎯 Cron job completed successfully:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle POST requests too (some cron services prefer POST)
export async function POST(request: NextRequest) {
  return GET(request);
}

// Export the SSE connections for use in the stream endpoint
export { sseConnections, broadcastToSSE };