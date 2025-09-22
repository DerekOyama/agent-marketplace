require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function addSchemaColumns() {
  console.log('🔧 Adding inputSchema and outputSchema columns to Agent table...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    
    // Add inputSchema column
    console.log('📝 Adding inputSchema column...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "inputSchema" JSONB;`;
      console.log('✅ inputSchema column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ inputSchema column already exists');
      } else {
        throw error;
      }
    }
    
    // Add outputSchema column
    console.log('📤 Adding outputSchema column...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "outputSchema" JSONB;`;
      console.log('✅ outputSchema column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ outputSchema column already exists');
      } else {
        throw error;
      }
    }
    
    // Create indexes for better performance
    console.log('🔍 Creating indexes for schema columns...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Agent_inputSchema_idx" ON "Agent" USING GIN ("inputSchema");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Agent_outputSchema_idx" ON "Agent" USING GIN ("outputSchema");`;
      console.log('✅ Schema indexes created');
    } catch (error) {
      console.log('⚠️ Index creation failed (may already exist):', error.message);
    }
    
    // Verify the columns were added
    console.log('\n🔍 Verifying new columns...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Agent' 
      AND column_name IN ('inputSchema', 'outputSchema')
      ORDER BY column_name;
    `;
    
    console.log('Agent table schema columns:');
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name} - ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    await prisma.$disconnect();
    console.log('\n🎉 Schema columns migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

addSchemaColumns();
