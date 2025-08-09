import { NextRequest } from 'next/server';
import { getCachedReport } from '@/lib/db';

export async function GET(request: NextRequest) {
  console.log('🌊 SSE client connected');

  const stream = new ReadableStream({
    start(controller) {
      let isActive = true;
      let lastReportId: string | null = null;
      
      // Send initial data immediately
      const sendInitialData = async () => {
        try {
          const report = await getCachedReport();
          if (report && isActive) {
            lastReportId = report.id;
            const message = `data: ${JSON.stringify({
              type: 'surf-report',
              data: report,
              timestamp: new Date().toISOString(),
              source: 'initial-connection'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
            console.log('📡 Sent initial surf report via SSE:', report.id);
          }
        } catch (error) {
          console.error('❌ Error sending initial SSE data:', error);
        }
      };

      // Send heartbeat to keep connection alive
      const sendHeartbeat = () => {
        if (isActive) {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
          console.log('💓 SSE heartbeat sent');
        }
      };

      // Check for new reports (polling-based, but only for SSE clients)
      const checkForUpdates = async () => {
        try {
          const report = await getCachedReport();
          if (report && isActive && report.id !== lastReportId) {
            lastReportId = report.id;
            const message = `data: ${JSON.stringify({
              type: 'surf-report',
              data: report,
              timestamp: new Date().toISOString(),
              source: 'update-detected'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
            console.log('📡 Sent updated surf report via SSE:', report.id);
          }
        } catch (error) {
          console.error('❌ Error in SSE update check:', error);
        }
      };

      // Send initial data
      sendInitialData();

      // Set up intervals
      const heartbeatInterval = setInterval(sendHeartbeat, 30000); // 30 seconds
      const updateInterval = setInterval(checkForUpdates, 60000); // 1 minute

      // Cleanup on disconnect
      const cleanup = () => {
        isActive = false;
        clearInterval(heartbeatInterval);
        clearInterval(updateInterval);
        console.log('🔌 SSE client disconnected');
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
      
      // Handle stream end
      return cleanup;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}