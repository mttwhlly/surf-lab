import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap, Play, Square, RefreshCw } from 'lucide-react';

export default function SSETestComponent() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [eventSource, setEventSource] = useState(null);

  const connect = () => {
    console.log('🔌 Connecting to SSE...');
    setConnectionState('connecting');
    
    const es = new EventSource('/api/surf-stream');
    setEventSource(es);
    
    es.onopen = () => {
      console.log('✅ SSE Connected');
      setIsConnected(true);
      setConnectionState('connected');
      addMessage('Connected to surf stream', 'success');
    };
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 SSE Message:', data);
        
        if (data.type === 'surf-report') {
          addMessage(`New surf report: ${data.data.id}`, 'report');
        } else if (data.type === 'heartbeat') {
          addMessage('Heartbeat received', 'heartbeat');
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
        addMessage('Error parsing message', 'error');
      }
    };
    
    es.onerror = (error) => {
      console.error('❌ SSE Error:', error);
      setIsConnected(false);
      setConnectionState('error');
      addMessage('Connection error', 'error');
    };
  };
  
  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsConnected(false);
    setConnectionState('disconnected');
    addMessage('Disconnected from surf stream', 'info');
  };
  
  const addMessage = (text, type = 'info') => {
    setMessages(prev => [...prev.slice(-9), {
      id: Date.now(),
      text,
      type,
      time: new Date().toLocaleTimeString()
    }]);
  };
  
  const triggerCronTest = async () => {
    addMessage('Triggering cron job test...', 'info');
    try {
      const response = await fetch('/api/admin/request-forecast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-secret'}`
        }
      });
      
      if (response.ok) {
        addMessage('Cron job triggered successfully', 'success');
      } else {
        addMessage(`Cron job failed: ${response.status}`, 'error');
      }
    } catch (error) {
      addMessage(`Cron job error: ${error.message}`, 'error');
    }
  };
  
  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connecting': return <Zap className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'connected': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'error': return <WifiOff className="w-4 h-4 text-orange-500" />;
      default: return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connecting': return 'border-blue-200 bg-blue-50';
      case 'connected': return 'border-green-200 bg-green-50';
      case 'error': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🧪 SSE Connection Test
        </h2>
        <p className="text-gray-600 text-sm">
          Test your Server-Sent Events implementation and real-time updates
        </p>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              Connection Status: {connectionState}
            </span>
          </div>
          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={connect}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                <Play className="w-3 h-3" />
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                <Square className="w-3 h-3" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Test Controls</h3>
        <div className="flex gap-2">
          <button
            onClick={triggerCronTest}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <RefreshCw className="w-4 h-4" />
            Trigger Cron Update
          </button>
          <button
            onClick={() => setMessages([])}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Messages
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Live Messages ({messages.length})
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No messages yet...</p>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`text-sm p-2 rounded flex justify-between items-start ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' :
                  message.type === 'error' ? 'bg-red-100 text-red-800' :
                  message.type === 'report' ? 'bg-blue-100 text-blue-800' :
                  message.type === 'heartbeat' ? 'bg-gray-100 text-gray-600' :
                  'bg-white text-gray-700'
                }`}
              >
                <span>{message.text}</span>
                <span className="text-xs opacity-75 ml-2">{message.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How to Test:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Click "Connect" to establish SSE connection</li>
          <li>2. You should see initial surf report data</li>
          <li>3. Heartbeats will appear every 30 seconds</li>
          <li>4. Click "Trigger Cron Update" to simulate a scheduled update</li>
          <li>5. Watch for real-time updates in the message log</li>
        </ol>
      </div>

      {/* Expected Behavior */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Connection should establish within 1-2 seconds</li>
          <li>• Initial surf report should load immediately</li>
          <li>• Heartbeats every 30 seconds keep connection alive</li>
          <li>• Cron updates should broadcast to all connected clients</li>
          <li>• Automatic reconnection on connection drops</li>
        </ul>
      </div>
    </div>
  );
}