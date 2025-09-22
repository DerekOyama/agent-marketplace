require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Environment Variables from .env.local...\n');

// Common database environment variable names
const envVars = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL', 
  'SUPABASE_DATABASE_URL',
  'POSTGRES_URL',
  'DB_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('📋 Environment Variables Found:');
envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive parts of the connection string
    const masked = value.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2');
    console.log(`✅ ${varName}: ${masked}`);
  } else {
    console.log(`❌ ${varName}: Not found`);
  }
});

console.log('\n🔧 All Database-Related Environment Variables:');
Object.keys(process.env)
  .filter(key => key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('SUPABASE'))
  .forEach(key => {
    const value = process.env[key];
    const preview = value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'undefined';
    console.log(`${key}: ${preview}`);
  });

// Test database connection if we find a valid URL
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DATABASE_URL;
if (dbUrl) {
  console.log('\n🔗 Testing Database Connection...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.$queryRaw`SELECT NOW() as current_time`
    .then(result => {
      console.log('✅ Database connection successful!');
      console.log('Current time:', result[0].current_time);
      return prisma.$disconnect();
    })
    .catch(error => {
      console.log('❌ Database connection failed:', error.message);
      return prisma.$disconnect();
    });
} else {
  console.log('\n❌ No database URL found in environment variables');
}
