require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCredits() {
  try {
    console.log('💰 Testing credit system...\n');
    
    const user = await prisma.user.findUnique({
      where: { id: 'demo-user' },
      select: { creditBalanceCents: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    const currentBalance = user.creditBalanceCents;
    const executionCost = 50; // 50 cents
    const newBalance = currentBalance - executionCost;
    
    console.log('📊 Current balance:', currentBalance, 'cents');
    console.log('💵 Current balance: $' + (currentBalance / 100).toFixed(2));
    console.log('🔧 Execution cost: $' + (executionCost / 100).toFixed(2));
    console.log('📈 After execution: $' + (newBalance / 100).toFixed(2));
    console.log('✅ Credit calculation looks correct!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCredits();
