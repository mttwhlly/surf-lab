import { NextRequest } from 'next/server';
import { getCachedReport } from '@/lib/db';

// Simple in-memory store for SSE connections (same as cron job)
const sseConnections = new Set<WritableStreamDefaultWriter>();

export async function GET(request: NextRequest) {
  console.log('🌊 SSE client connected');

  const stream = new ReadableStream({
    start(controller) {
      let isActive = true;
      const writer = controller;
      
      // Add this connection to the pool for cron job broadcasts
      sseConnections.add(writer);
      console.log(`📊 SSE connections: ${sseConnections.size} active`);
      
      // Send initial data immediately
      const sendInitialData = async () => {
        try {
          const report = await getCachedReport();
          if (report && isActive) {
            const message = `data: ${JSON.stringify({
              type: 'surf-report',
              data: report,
              timestamp: new Date().toISOString(),
              source: 'initial-connection'
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
            console.log('📡 Sent initial surf report via SSE');
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
        }
      };

      // Send initial data
      sendInitialData();

      // Set up heartbeat interval (no need for update polling - cron handles broadcasts)
      const heartbeatInterval = setInterval(sendHeartbeat, 30000); // 30 seconds

      // Cleanup on disconnect
      const cleanup = () => {
        isActive = false;
        sseConnections.delete(writer);
        clearInterval(heartbeatInterval);
        console.log(`🔌 SSE client disconnected. Remaining: ${sseConnections.size}`);
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