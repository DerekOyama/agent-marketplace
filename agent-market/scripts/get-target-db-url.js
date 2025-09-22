require('dotenv').config({ path: '.env.local' });

console.log('🔍 Target Supabase Database Information:');
console.log('');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && anonKey) {
  console.log('✅ Target Supabase Project Found:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Anon Key: ${anonKey.substring(0, 20)}...`);
  console.log('');
  
  // Extract project reference from URL
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  console.log(`📋 Project Reference: ${projectRef}`);
  console.log('');
  
  console.log('🔗 To get the database URL:');
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Select the project with URL:', supabaseUrl);
  console.log('3. Go to Settings > Database');
  console.log('4. Copy the "Connection string" under "Connection parameters"');
  console.log('5. The format should be:');
  console.log(`   postgresql://postgres:[YOUR_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres?schema=public`);
  console.log('');
  console.log('💡 Or use the "Connection pooling" URL if available (recommended for production)');
  
} else {
  console.log('❌ Target Supabase environment variables not found');
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
}
