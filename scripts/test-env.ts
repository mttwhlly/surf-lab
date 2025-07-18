import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('🔍 Environment variables:');
console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'Set ✅' : 'Not set ❌');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set ✅' : 'Not set ❌');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL ? 'Set ✅' : 'Not set ❌');

if (!process.env.NEON_DATABASE_URL) {
  console.log(`
❌ Missing NEON_DATABASE_URL!

To fix:
1. Go to https://console.neon.tech
2. Create a new project (or use existing)
3. Copy the connection string
4. Add to .env.local:
   NEON_DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
  `);
}