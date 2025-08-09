'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SurfReport } from '../types/surf-report';

interface SSEMessage {
  type: 'surf-report' | 'heartbeat' | 'error';
  data?: SurfReport;
  timestamp: string;
  source?: string;
}

interface SSEState {
  report: SurfReport | null;
  loading: boolean;
  error: string | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  isSSESupported: boolean;
}

export function useSurfReportSSE() {
  const [state, setState] = useState<SSEState>({
    report: null,
    loading: true,
    error: null,
    connectionState: 'connecting',
    lastUpdate: null,
    isSSESupported: typeof EventSource !== 'undefined'
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const connect = useCallback(() => {
    // Don't connect if SSE not supported
    if (!state.isSSESupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Server-Sent Events not supported',
        connectionState: 'error',
        loading: false 
      }));
      return;
    }

    // Clean up existing connection
    cleanup();

    console.log('🔌 Connecting to surf report SSE...');
    
    const eventSource = new EventSource('/api/surf-stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE connected');
      reconnectAttempts.current = 0;
      setState(prev => ({ 
        ...prev, 
        connectionState: 'connected',
        error: null 
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        
        if (message.type === 'surf-report' && message.data) {
          console.log('📡 Received surf report via SSE:', message.data.id);
          setState(prev => ({
            ...prev,
            report: message.data!,
            loading: false,
            lastUpdate: new Date(message.timestamp),
            error: null
          }));
        } else if (message.type === 'heartbeat') {
          console.log('💓 SSE heartbeat received');
          // Just keep connection alive, don't update state
        }
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
      
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error',
        error: 'Connection error'
      }));

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`🔄 Reconnecting SSE in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        console.error('❌ Max SSE reconnection attempts reached');
        setState(prev => ({ 
          ...prev, 
          connectionState: 'disconnected',
          error: 'Unable to connect after multiple attempts'
        }));
      }
    };
  }, [state.isSSESupported, cleanup]);

  // Fallback to traditional fetch if SSE fails
  const fallbackFetch = useCallback(async () => {
    console.log('🔄 Falling back to traditional fetch...');
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/surf-report');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const report = await response.json();
      setState(prev => ({
        ...prev,
        report,
        loading: false,
        error: null,
        lastUpdate: new Date()
      }));
      
      console.log('✅ Fallback fetch successful');
    } catch (error) {
      console.error('❌ Fallback fetch failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (state.connectionState === 'connected') {
      // If SSE is connected, just wait for next update
      console.log('📡 SSE connected - waiting for server update');
    } else {
      // If SSE not connected, do manual fetch
      await fallbackFetch();
    }
  }, [state.connectionState, fallbackFetch]);

  // Initialize connection
  useEffect(() => {
    if (state.isSSESupported) {
      connect();
    } else {
      // Fallback for browsers without SSE support
      fallbackFetch();
    }

    return cleanup;
  }, [connect, fallbackFetch, cleanup, state.isSSESupported]);

  // Fallback polling if SSE fails completely
  useEffect(() => {
    if (state.connectionState === 'disconnected' && reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('🔄 Starting fallback polling...');
      
      const interval = setInterval(fallbackFetch, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [state.connectionState, fallbackFetch]);

  return {
    report: state.report,
    loading: state.loading,
    error: state.error,
    connectionState: state.connectionState,
    lastUpdate: state.lastUpdate,
    isSSESupported: state.isSSESupported,
    refresh,
    
    // Debug info
    debugInfo: {
      reconnectAttempts: reconnectAttempts.current,
      maxReconnectAttempts,
      isConnected: state.connectionState === 'connected',
      hasEventSource: !!eventSourceRef.current
    }
  };
}