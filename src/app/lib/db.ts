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

const sql = neon(databaseUrl);

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

// Initialize database
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
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_location_cached 
      ON surf_reports(location, cached_until DESC)
    `;
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Get cached report
export async function getCachedReport(location: string = 'St. Augustine, FL'): Promise<SurfReport | null> {
  try {
    const result = await sql`
      SELECT * FROM surf_reports 
      WHERE location = ${location} 
      AND cached_until > NOW()
      ORDER BY timestamp DESC 
      LIMIT 1
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      timestamp: row.timestamp,
      location: row.location,
      report: row.report,
      conditions: row.conditions,
      recommendations: row.recommendations,
      cached_until: row.cached_until
    };
  } catch (error) {
    console.error('Error fetching cached report:', error);
    return null;
  }
}

// Save report
export async function saveReport(report: SurfReport): Promise<void> {
  try {
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
    
    console.log('✅ Report saved:', report.id);
  } catch (error) {
    console.error('❌ Error saving report:', error);
    throw error;
  }
}