require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Supabase URL variables:');
console.log('');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const currentDbUrl = process.env.DATABASE_URL;

console.log('📋 Current Environment Variables:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? anonKey.substring(0, 20) + '...' : 'Not found'}`);
console.log(`   DATABASE_URL: ${currentDbUrl ? currentDbUrl.substring(0, 50) + '...' : 'Not found'}`);
console.log('');

if (supabaseUrl) {
  // Extract project reference
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  console.log(`📊 Project Reference: ${projectRef}`);
  console.log('');
  
  // Check if this is a database URL or just the API URL
  if (supabaseUrl.includes('postgresql://')) {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL appears to be a database connection string');
    console.log('   This can be used directly as DATABASE_URL');
  } else if (supabaseUrl.includes('supabase.co')) {
    console.log('ℹ️  NEXT_PUBLIC_SUPABASE_URL appears to be the Supabase API URL');
    console.log('   To get the database URL, you need to:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Select this project:', supabaseUrl);
    console.log('   3. Go to Settings > Database');
    console.log('   4. Copy the "Connection string"');
    console.log('   5. It should look like:');
    console.log(`      postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres?schema=public`);
  } else {
    console.log('❓ NEXT_PUBLIC_SUPABASE_URL format is unclear');
    console.log('   Please check if this is the correct database connection string');
  }
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found in environment variables');
}
