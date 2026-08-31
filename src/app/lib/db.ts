import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import type { SurfReport } from '../types/surf-report';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(`
    ❌ Missing database connection string!
    
    Please add to your environment variables:
    NEON_DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
  `);
}

// Configure Neon with connection pooling optimizations
const sql = neon(databaseUrl, {
  // Connection pool settings for faster queries
  arrayMode: false,
  fullResults: false,
});

export type { SurfReport };

let initPromise: Promise<void> | null = null;
export function ensureInitialized(): Promise<void> {
  if (!initPromise) initPromise = initializeDatabase();
  return initPromise;
}

let locationRequestsInitPromise: Promise<void> | null = null;
export function ensureLocationRequestsTable(): Promise<void> {
  if (!locationRequestsInitPromise) {
    locationRequestsInitPromise = sql`
      CREATE TABLE IF NOT EXISTS location_requests (
        id TEXT PRIMARY KEY,
        spot_name TEXT NOT NULL,
        city_state TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return locationRequestsInitPromise;
}

// Initialize database with optimized indexes
export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS surf_reports (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        location TEXT NOT NULL,
        report TEXT NOT NULL,
        conditions JSONB NOT NULL,
        recommendations JSONB NOT NULL,
        cached_until TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // FIXED INDEXES - Remove problematic WHERE clauses that reference functions
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_location_timestamp 
      ON surf_reports(location, timestamp DESC)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_cached_until 
      ON surf_reports(cached_until DESC)
    `;
    
    // FIXED: Simple index without function-based WHERE clause
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_cleanup
      ON surf_reports(location, created_at)
    `;

    console.log('✅ Database initialized with fixed indexes');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    
    // If indexes fail, at least ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS surf_reports (
          id TEXT PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          location TEXT NOT NULL,
          report TEXT NOT NULL,
          conditions JSONB NOT NULL,
          recommendations JSONB NOT NULL,
          cached_until TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      console.log('✅ Table created successfully (indexes skipped due to errors)');
    } catch (tableError) {
      console.error('❌ Critical: Table creation failed:', tableError);
      throw tableError;
    }
  }
}

// OPTIMIZED: Get cached report with minimal data transfer
export async function getCachedReport(location: string = 'St. Augustine, FL'): Promise<SurfReport | null> {
  try {
    const queryStart = Date.now();
    
    // Single optimized query with LIMIT 1 for fastest response
    const result = await sql`
      SELECT id, timestamp, location, report, conditions, recommendations, cached_until
      FROM surf_reports 
      WHERE location = ${location}
      ORDER BY timestamp DESC 
      LIMIT 1
    `;
    
    const queryTime = Date.now() - queryStart;
    console.log(`📊 Cache query: ${queryTime}ms`);
    
    if (result.length === 0) {
      console.log('📭 No cached reports found');
      return null;
    }
    
    const row = result[0];
    const report: SurfReport = {
      id: row.id,
      timestamp: row.timestamp,
      location: row.location,
      report: row.report,
      conditions: row.conditions,
      recommendations: row.recommendations,
      cached_until: row.cached_until
    };
    
    console.log(`✅ Cache hit: ${report.id} (${queryTime}ms)`);
    return report;
    
  } catch (error) {
    console.error('❌ Error fetching cached report:', error);
    return null;
  }
}

// OPTIMIZED: Faster save with prepared statement pattern
export async function saveReport(report: SurfReport): Promise<void> {
  try {
    const saveStart = Date.now();
    
    // Use a transaction for consistency
    await sql`
      INSERT INTO surf_reports (
        id, timestamp, location, report, conditions, recommendations, cached_until
      ) VALUES (
        ${report.id},
        ${report.timestamp},
        ${report.location},
        ${report.report},
        ${JSON.stringify(report.conditions)},
        ${JSON.stringify(report.recommendations)},
        ${report.cached_until}
      )
    `;
    
    const saveTime = Date.now() - saveStart;
    console.log(`✅ Report saved: ${report.id} (${saveTime}ms)`);
    
  } catch (error) {
    console.error('❌ Error saving report:', error);
    throw error;
  }
}

// NEW: Fast cache validation (just check if valid cache exists)
export async function hasValidCache(location: string = 'St. Augustine, FL'): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 
      FROM surf_reports 
      WHERE location = ${location} 
      AND timestamp > NOW() - INTERVAL '8 hours'
      LIMIT 1
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('❌ Error checking cache validity:', error);
    return false;
  }
}

// NEW: Bulk cleanup for maintenance
export async function cleanupOldReports(retentionHours: number = 24): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM surf_reports 
      WHERE created_at < NOW() - INTERVAL '${retentionHours} hours'
      RETURNING id
    `;
    
    console.log(`🗑️ Cleaned up ${result.length} old reports (>${retentionHours}h)`);
    return result.length;
  } catch (error) {
    console.error('❌ Error cleaning up old reports:', error);
    return 0;
  }
}

// NEW: Save a "suggest a spot" location request
export async function saveLocationRequest(request: {
  id: string;
  spotName: string;
  cityState: string;
  email?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO location_requests (id, spot_name, city_state, email)
    VALUES (${request.id}, ${request.spotName}, ${request.cityState}, ${request.email ?? null})
  `;
}

let pushSubscriptionsInitPromise: Promise<void> | null = null;
export function ensurePushSubscriptionsTable(): Promise<void> {
  if (!pushSubscriptionsInitPromise) {
    pushSubscriptionsInitPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          endpoint TEXT UNIQUE NOT NULL,
          subscription JSONB NOT NULL,
          location TEXT NOT NULL,
          criteria JSONB,
          last_matched BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Idempotent for rows created before criteria/last_matched existed.
      await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS criteria JSONB`;
      await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_matched BOOLEAN NOT NULL DEFAULT false`;
    })();
  }
  return pushSubscriptionsInitPromise;
}

// A push subscription is identified by its endpoint (one per browser/device).
// Re-subscribing with the same endpoint but a different location moves it —
// scope is single-location-per-subscriber, whichever location they last opted in from.
// `criteria` is nullable: null means "use the default Good-conditions bar" (see lib/push.ts).
export async function savePushSubscription(record: {
  endpoint: string;
  subscription: unknown;
  location: string;
  criteria?: unknown;
}): Promise<void> {
  await sql`
    INSERT INTO push_subscriptions (id, endpoint, subscription, location, criteria, last_matched)
    VALUES (${crypto.randomUUID()}, ${record.endpoint}, ${JSON.stringify(record.subscription)}, ${record.location}, ${record.criteria ? JSON.stringify(record.criteria) : null}, false)
    ON CONFLICT (endpoint) DO UPDATE
    SET subscription = EXCLUDED.subscription, location = EXCLUDED.location, criteria = EXCLUDED.criteria, last_matched = false, updated_at = NOW()
  `;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export interface PushSubscriptionRow {
  endpoint: string;
  subscription: unknown;
  criteria: unknown;
  last_matched: boolean;
}

export async function getSubscriptionsForLocation(location: string): Promise<PushSubscriptionRow[]> {
  const rows = await sql`
    SELECT endpoint, subscription, criteria, last_matched
    FROM push_subscriptions
    WHERE location = ${location}
  `;
  return rows as unknown as PushSubscriptionRow[];
}

export async function setSubscriptionMatchState(endpoint: string, matched: boolean): Promise<void> {
  await sql`UPDATE push_subscriptions SET last_matched = ${matched}, updated_at = NOW() WHERE endpoint = ${endpoint}`;
}

// NEW: Get cache statistics for monitoring
export async function getCacheStats(): Promise<{
  totalReports: number;
  validReports: number;
  oldestReport: string | null;
  newestReport: string | null;
}> {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '8 hours') as valid_reports,
        MIN(timestamp) as oldest_report,
        MAX(timestamp) as newest_report
      FROM surf_reports 
      WHERE location = 'St. Augustine, FL'
    `;
    
    const row = stats[0];
    return {
      totalReports: parseInt(row.total_reports),
      validReports: parseInt(row.valid_reports),
      oldestReport: row.oldest_report,
      newestReport: row.newest_report
    };
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return {
      totalReports: 0,
      validReports: 0,
      oldestReport: null,
      newestReport: null
    };
  }
}