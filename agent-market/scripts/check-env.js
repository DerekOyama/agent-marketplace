console.log('🔍 Checking Environment Variables...\n');

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

console.log('\n🔧 All Environment Variables (first 100 chars):');
Object.keys(process.env)
  .filter(key => key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('SUPABASE'))
  .forEach(key => {
    const value = process.env[key];
    const preview = value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'undefined';
    console.log(`${key}: ${preview}`);
  });
