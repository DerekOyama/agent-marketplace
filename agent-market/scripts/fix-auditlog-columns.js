require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAuditLogColumns() {
  try {
    console.log('🔍 Checking AuditLog table columns...');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'AuditLog' 
      ORDER BY column_name;
    `;
    
    console.log('📋 AuditLog table columns:');
    result.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
    // Check for missing columns
    const hasEvent = result.some(col => col.column_name === 'event');
    const hasActor = result.some(col => col.column_name === 'actor');
    const hasPayload = result.some(col => col.column_name === 'payload');
    
    console.log(`\n🔍 Missing columns:`);
    console.log(`   - event: ${hasEvent ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - actor: ${hasActor ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - payload: ${hasPayload ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (!hasEvent) {
      console.log('\n🔧 Adding missing event column...');
      await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "event" TEXT;`;
      console.log('✅ Added event column');
    }
    
    if (!hasActor) {
      console.log('\n🔧 Adding missing actor column...');
      await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actor" TEXT;`;
      console.log('✅ Added actor column');
    }
    
    if (!hasPayload) {
      console.log('\n🔧 Adding missing payload column...');
      await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "payload" JSONB;`;
      console.log('✅ Added payload column');
    }
    
    console.log('\n🎉 AuditLog table fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuditLogColumns();
