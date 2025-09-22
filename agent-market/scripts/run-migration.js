require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

console.log('🚀 Starting migration to target database...');
console.log(`📡 Database URL: ${process.env.DATABASE_URL ? 'Found' : 'Not found'}`);
console.log('');

// Run prisma db push with the loaded environment
const prisma = spawn('npx', ['prisma', 'db', 'push'], {
  stdio: 'inherit',
  env: { ...process.env }
});

prisma.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log(`❌ Migration failed with code ${code}`);
  }
});

prisma.on('error', (error) => {
  console.error('❌ Migration error:', error);
});
