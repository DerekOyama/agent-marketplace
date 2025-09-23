const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processPendingPurchase() {
  console.log('=== PROCESSING PENDING PURCHASE ===\n');
  
  // Get the latest pending purchase
  const pendingPurchase = await prisma.creditPurchase.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!pendingPurchase) {
    console.log('No pending purchases found.');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Found pending purchase:');
  console.log(`ID: ${pendingPurchase.id}`);
  console.log(`Session: ${pendingPurchase.stripeCheckoutSessionId}`);
  console.log(`Amount: $${(pendingPurchase.amountCents/100).toFixed(2)}`);
  console.log(`Credits: ${pendingPurchase.creditsPurchased}`);
  console.log(`Status: ${pendingPurchase.status}`);
  console.log(`Created: ${pendingPurchase.createdAt.toLocaleString()}`);
  
  // Get user's current balance
  const user = await prisma.user.findUnique({
    where: { id: pendingPurchase.userId }
  });
  
  console.log(`\nUser current balance: $${(user?.creditBalanceCents || 0)/100}`);
  
  try {
    // Manually process the purchase (simulating webhook)
    const balanceBefore = user?.creditBalanceCents || 0;
    const creditsToAdd = pendingPurchase.creditsPurchased;
    const balanceAfter = balanceBefore + creditsToAdd;
    
    // Update user balance
    await prisma.user.update({
      where: { id: pendingPurchase.userId },
      data: { creditBalanceCents: balanceAfter }
    });
    
    // Update purchase status
    await prisma.creditPurchase.update({
      where: { id: pendingPurchase.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        stripePaymentIntentId: `pi_test_${Date.now()}`
      }
    });
    
    // Create credit transaction
    await prisma.creditTransaction.create({
      data: {
        userId: pendingPurchase.userId,
        amountCents: creditsToAdd,
        type: 'purchase',
        description: `Credit purchase - ${creditsToAdd} credits`,
        referenceId: pendingPurchase.id,
        referenceType: 'purchase',
        balanceBeforeCents: balanceBefore,
        balanceAfterCents: balanceAfter,
        creditPurchaseId: pendingPurchase.id,
        metadata: {
          purchaseAmount: pendingPurchase.amountCents,
          currency: pendingPurchase.currency,
          stripeCheckoutSessionId: pendingPurchase.stripeCheckoutSessionId,
          testMode: true
        }
      }
    });
    
    console.log('\n✅ Purchase processed successfully!');
    console.log(`Credits added: ${creditsToAdd}`);
    console.log(`Balance: $${(balanceBefore/100).toFixed(2)} → $${(balanceAfter/100).toFixed(2)}`);
    
    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { id: pendingPurchase.userId }
    });
    
    const updatedPurchase = await prisma.creditPurchase.findUnique({
      where: { id: pendingPurchase.id }
    });
    
    console.log('\n=== VERIFICATION ===');
    console.log(`Purchase status: ${updatedPurchase?.status}`);
    console.log(`User balance: $${(updatedUser?.creditBalanceCents || 0)/100}`);
    
    if (updatedPurchase?.status === 'completed') {
      console.log('🎉 Success! Credits have been added to your account.');
    } else {
      console.log('❌ Something went wrong - purchase not marked as completed.');
    }
    
  } catch (error) {
    console.error('\n❌ Error processing purchase:', error);
  }
  
  await prisma.$disconnect();
}

processPendingPurchase().catch(console.error);
