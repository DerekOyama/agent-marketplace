require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

console.log('🚀 Migrating to target database...');
console.log('');

try {
  // Set the environment variable and run prisma db push
  process.env.DATABASE_URL = process.env.DATABASE_URL;
  
  console.log('📡 Pushing schema to target database...');
  execSync('npx prisma db push', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  
  console.log('✅ Migration completed successfully!');
  
  // Verify the new tables were created
  console.log('🔍 Verifying new tables...');
  execSync('npx prisma db pull --print', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
