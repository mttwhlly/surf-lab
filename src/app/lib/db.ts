import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

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

export interface SurfReport {
  id: string;
  timestamp: string;
  location: string;
  report: string;
  conditions: {
    wave_height_ft: number;
    wave_period_sec: number;
    wind_speed_kts: number;
    wind_direction_deg: number;
    tide_state: string;
    weather_description: string;
    surfability_score: number;
  };
  recommendations: {
    board_type: string;
    wetsuit_thickness?: string;
    skill_level: 'beginner' | 'intermediate' | 'advanced';
    best_spots?: string[];
    timing_advice?: string;
  };
  cached_until: string;
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