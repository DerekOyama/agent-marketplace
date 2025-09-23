const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('=== DATABASE OVERVIEW ===\n');
  
  // Check Credit Transactions
  console.log('📊 CREDIT TRANSACTIONS:');
  const transactions = await prisma.creditTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  transactions.forEach((tx, i) => {
    console.log(`${i+1}. ${tx.type.toUpperCase()} - $${(tx.amountCents/100).toFixed(2)}`);
    console.log(`   Description: ${tx.description}`);
    console.log(`   Balance: $${(tx.balanceBeforeCents/100).toFixed(2)} → $${(tx.balanceAfterCents/100).toFixed(2)}`);
    console.log(`   Date: ${tx.createdAt.toLocaleString()}`);
    if (tx.referenceType === 'purchase') {
      console.log(`   🔗 Linked to Purchase ID: ${tx.referenceId}`);
    }
    console.log('');
  });
  
  // Check Credit Purchases (Stripe)
  console.log('💳 CREDIT PURCHASES (STRIPE):');
  const purchases = await prisma.creditPurchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  purchases.forEach((purchase, i) => {
    console.log(`${i+1}. $${(purchase.amountCents/100).toFixed(2)} → ${purchase.creditsPurchased} credits`);
    console.log(`   Status: ${purchase.status.toUpperCase()}`);
    console.log(`   Stripe Session: ${purchase.stripeCheckoutSessionId}`);
    console.log(`   Date: ${purchase.createdAt.toLocaleString()}`);
    if (purchase.completedAt) {
      console.log(`   Completed: ${purchase.completedAt.toLocaleString()}`);
    }
    console.log('');
  });
  
  // Check User Balance
  console.log('👤 USER BALANCE:');
  const user = await prisma.user.findUnique({
    where: { id: 'demo-user' }
  });
  if (user) {
    console.log(`Current Balance: $${(user.creditBalanceCents/100).toFixed(2)}`);
    console.log(`Last Updated: ${user.updatedAt.toLocaleString()}`);
  }
  
  // Summary Stats
  console.log('\n=== SUMMARY STATS ===');
  const totalTransactions = await prisma.creditTransaction.count();
  const totalPurchases = await prisma.creditPurchase.count();
  const completedPurchases = await prisma.creditPurchase.count({
    where: { status: 'completed' }
  });
  
  console.log(`Total Transactions: ${totalTransactions}`);
  console.log(`Total Stripe Purchases: ${totalPurchases}`);
  console.log(`Completed Purchases: ${completedPurchases}`);
  
  // Check if transactions are linked to purchases
  console.log('\n=== TRANSACTION LINKING ===');
  const linkedTransactions = await prisma.creditTransaction.findMany({
    where: { referenceType: 'purchase' },
    include: { creditPurchase: true }
  });
  
  linkedTransactions.forEach((tx, i) => {
    console.log(`${i+1}. Transaction ${tx.id} linked to Purchase ${tx.referenceId}`);
    console.log(`   Purchase Status: ${tx.creditPurchase?.status || 'N/A'}`);
    console.log(`   Stripe Session: ${tx.creditPurchase?.stripeCheckoutSessionId || 'N/A'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
