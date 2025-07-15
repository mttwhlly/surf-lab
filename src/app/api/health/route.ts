import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Surf Lab API',
    version: '2.0.0'
  });
}