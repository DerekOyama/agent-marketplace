require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function migrate() {
  console.log('🚀 Starting migration to target database...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    
    // Check current tables
    console.log('🔍 Checking current tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('📋 Current tables:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Check if new tables exist
    const newTables = ['AgentExecution', 'AgentMetrics', 'AgentLog', 'UserAgentInteraction'];
    const existingTables = tables.map(t => t.table_name);
    
    console.log('\n🔍 Checking for new tables...');
    newTables.forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`   ✅ ${tableName} - EXISTS`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
      }
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
  }
}

migrate();
