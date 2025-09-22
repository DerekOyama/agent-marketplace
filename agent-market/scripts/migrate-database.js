require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

console.log('🚀 Starting database migration...');

try {
  // Push the schema to the database
  console.log('📡 Pushing schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database migration completed successfully!');
  
  // Verify the new tables were created
  console.log('🔍 Verifying new tables...');
  execSync('npx prisma db pull --print', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Database migration failed:', error.message);
  process.exit(1);
}
