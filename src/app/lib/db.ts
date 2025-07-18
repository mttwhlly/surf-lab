import { neon } from '@neondatabase/serverless';

// Use the auto-configured Neon database URL from Vercel Marketplace
const sql = neon(process.env.NEON_DATABASE_URL!);

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

// Initialize database (run once)
export async function initializeDatabase() {
  try {
    // Create table
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
    
    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_location_cached 
      ON surf_reports(location, cached_until DESC)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_surf_reports_created_at 
      ON surf_reports(created_at DESC)
    `;
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Get cached report (if still valid)
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

// Save new report
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

// Get recent reports (for analytics/history)
export async function getRecentReports(location: string = 'St. Augustine, FL', limit: number = 10): Promise<SurfReport[]> {
  try {
    const result = await sql`
      SELECT * FROM surf_reports 
      WHERE location = ${location}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `;
    
    return result.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      location: row.location,
      report: row.report,
      conditions: row.conditions,
      recommendations: row.recommendations,
      cached_until: row.cached_until
    }));
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return [];
  }
}

// Clean up old reports (run periodically)
export async function cleanupOldReports(daysOld: number = 7): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM surf_reports 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
    `;
    
    const deletedCount = result.length;
    console.log(`🧹 Cleaned up ${deletedCount} old reports`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up old reports:', error);
    return 0;
  }
}