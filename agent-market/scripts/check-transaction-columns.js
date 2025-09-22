require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactionColumns() {
  try {
    console.log('🔍 Checking Transaction table columns...');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Transaction' 
      ORDER BY column_name;
    `;
    
    console.log('📋 Transaction table columns:');
    result.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
    // Check if receiptJson exists
    const hasReceiptJson = result.some(col => col.column_name === 'receiptJson');
    console.log(`\n🔍 Has receiptJson column: ${hasReceiptJson ? '✅ YES' : '❌ NO'}`);
    
    if (!hasReceiptJson) {
      console.log('\n🔧 Adding missing receiptJson column...');
      await prisma.$executeRaw`
        ALTER TABLE "Transaction" 
        ADD COLUMN IF NOT EXISTS "receiptJson" JSONB;
      `;
      console.log('✅ Added receiptJson column');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactionColumns();
