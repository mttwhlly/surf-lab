import { initializeDatabase } from '../lib/db';

async function setup() {
  console.log('🚀 Setting up Neon database...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database setup complete!');
    
    // Test the connection
    const { getCachedReport } = await import('../lib/db');
    const testReport = await getCachedReport();
    console.log('📋 Test query successful:', testReport ? 'Found cached report' : 'No cached reports');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setup();