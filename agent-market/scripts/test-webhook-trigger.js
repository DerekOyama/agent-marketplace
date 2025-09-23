const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWebhookTrigger() {
  console.log('=== TESTING WEBHOOK TRIGGER ===\n');
  
  // Get the latest pending purchase
  const latestPurchase = await prisma.creditPurchase.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!latestPurchase) {
    console.log('No pending purchases found. Create a purchase first.');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Found pending purchase:');
  console.log(`ID: ${latestPurchase.id}`);
  console.log(`Session: ${latestPurchase.stripeCheckoutSessionId}`);
  console.log(`Amount: $${(latestPurchase.amountCents/100).toFixed(2)}`);
  console.log(`Credits: ${latestPurchase.creditsPurchased}`);
  console.log(`Status: ${latestPurchase.status}`);
  console.log(`Created: ${latestPurchase.createdAt.toLocaleString()}`);
  
  // Get user's current balance
  const user = await prisma.user.findUnique({
    where: { id: latestPurchase.userId }
  });
  
  console.log(`\nUser current balance: $${(user?.creditBalanceCents || 0)/100}`);
  
  console.log('\n=== SIMULATING WEBHOOK CALL ===');
  
  // Simulate the webhook call
  const webhookUrl = 'http://localhost:3000/api/stripe/webhook';
  const sessionId = latestPurchase.stripeCheckoutSessionId;
  
  const webhookPayload = {
    id: `evt_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        amount_total: latestPurchase.amountCents,
        currency: 'usd',
        payment_status: 'paid',
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          userId: latestPurchase.userId,
          creditsToPurchase: latestPurchase.creditsPurchased.toString(),
          type: 'credit_purchase'
        }
      }
    }
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // For testing
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.text();
    console.log(`Webhook response status: ${response.status}`);
    console.log(`Webhook response: ${result}`);
    
    // Check if credits were added
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: latestPurchase.userId }
    });
    
    const updatedPurchase = await prisma.creditPurchase.findUnique({
      where: { id: latestPurchase.id }
    });
    
    console.log('\n=== RESULTS ===');
    console.log(`User balance after: $${(updatedUser?.creditBalanceCents || 0)/100}`);
    console.log(`Purchase status: ${updatedPurchase?.status}`);
    
    if (updatedPurchase?.status === 'completed') {
      console.log('✅ Credits were successfully added via webhook!');
    } else {
      console.log('❌ Credits were not added - check webhook logs');
    }
    
  } catch (error) {
    console.error('Error calling webhook:', error);
  }
  
  await prisma.$disconnect();
}

testWebhookTrigger().catch(console.error);
