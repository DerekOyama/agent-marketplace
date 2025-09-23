const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showDetailedLogging() {
  console.log('=== DETAILED STRIPE LOGGING ANALYSIS ===\n');
  
  // Get the most recent completed purchase
  const latestPurchase = await prisma.creditPurchase.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    include: { creditTransactions: true }
  });
  
  if (latestPurchase) {
    console.log('🔍 LATEST COMPLETED PURCHASE:');
    console.log('Purchase ID:', latestPurchase.id);
    console.log('Stripe Session:', latestPurchase.stripeCheckoutSessionId);
    console.log('Amount Paid:', '$' + (latestPurchase.amountCents/100).toFixed(2));
    console.log('Credits Added:', latestPurchase.creditsPurchased);
    console.log('Status:', latestPurchase.status);
    console.log('Created:', latestPurchase.createdAt.toLocaleString());
    console.log('Completed:', latestPurchase.completedAt?.toLocaleString());
    
    console.log('\n📋 METADATA LOGGED:');
    console.log(JSON.stringify(latestPurchase.metadata, null, 2));
    
    console.log('\n💳 LINKED TRANSACTION:');
    if (latestPurchase.creditTransactions.length > 0) {
      const tx = latestPurchase.creditTransactions[0];
      console.log('Transaction ID:', tx.id);
      console.log('Type:', tx.type);
      console.log('Amount:', '$' + (tx.amountCents/100).toFixed(2));
      console.log('Description:', tx.description);
      console.log('Balance Before:', '$' + (tx.balanceBeforeCents/100).toFixed(2));
      console.log('Balance After:', '$' + (tx.balanceAfterCents/100).toFixed(2));
      console.log('Transaction Metadata:');
      console.log(JSON.stringify(tx.metadata, null, 2));
    }
  }
  
  console.log('\n=== WHAT GETS LOGGED FOR EACH STRIPE PURCHASE ===');
  console.log('✅ CreditPurchase Table:');
  console.log('   - Stripe Checkout Session ID');
  console.log('   - Payment Amount');
  console.log('   - Credits Purchased');
  console.log('   - Purchase Status (pending/completed/failed)');
  console.log('   - Completion Timestamp');
  console.log('   - Metadata (description, checkout URL)');
  
  console.log('\n✅ CreditTransaction Table:');
  console.log('   - Transaction Type (purchase)');
  console.log('   - Amount (credits added)');
  console.log('   - Description');
  console.log('   - Balance Before/After');
  console.log('   - Reference to Purchase ID');
  console.log('   - Metadata (Stripe session, test mode flag)');
  
  console.log('\n✅ User Table:');
  console.log('   - Updated Credit Balance');
  console.log('   - Last Updated Timestamp');
  
  await prisma.$disconnect();
}

showDetailedLogging().catch(console.error);
