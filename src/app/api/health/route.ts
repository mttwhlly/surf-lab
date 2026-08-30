import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  detail?: string;
}

// Previously this endpoint returned 200 unconditionally — a liveness check, not a
// readiness check, so it couldn't catch a dead DB connection or an unreachable AI
// service. DB failure is fatal (nothing can be served without it); the AI service
// being down is "degraded" rather than fatal because /api/surf-report already has a
// deterministic template fallback for that case.
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('NEON_DATABASE_URL not configured');
    const sql = neon(databaseUrl);
    await sql`SELECT 1`;
    return { ok: true, latency_ms: Date.now() - start };
  } catch (error) {
    return { ok: false, latency_ms: Date.now() - start, detail: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkAiService(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const bunServiceUrl = process.env.BUN_SERVICE_URL;
    if (!bunServiceUrl) throw new Error('BUN_SERVICE_URL not configured');
    const res = await fetch(`${bunServiceUrl}/health`, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    return { ok: true, latency_ms: Date.now() - start };
  } catch (error) {
    return { ok: false, latency_ms: Date.now() - start, detail: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET() {
  const [database, aiService] = await Promise.all([checkDatabase(), checkAiService()]);

  const status = !database.ok ? 'error' : !aiService.ok ? 'degraded' : 'ok';
  const httpStatus = database.ok ? 200 : 503;

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    service: 'Swells',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: { database, aiService },
  }, { status: httpStatus });
}

// Support for HEAD requests (common in health checks)
export async function HEAD() {
  return new Response(null, { status: 200 });
}