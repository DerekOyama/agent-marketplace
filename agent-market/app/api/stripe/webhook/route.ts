import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";
import { CreditManager } from "../../../../lib/credit-manager";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil"
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('PaymentIntent succeeded:', paymentIntent.id);
  
  try {
    // Find transaction by Stripe payment intent ID
    const transaction = await prisma.transaction.findFirst({
      where: { stripePi: paymentIntent.id }
    });

    if (transaction) {
      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'completed',
          receiptJson: JSON.parse(JSON.stringify({
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            timestamp: new Date().toISOString()
          }))
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          txId: transaction.id,
          actor: 'stripe_webhook',
          event: 'payment_succeeded',
          payload: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        }
      });

      console.log(`Transaction ${transaction.id} updated to completed`);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('PaymentIntent failed:', paymentIntent.id);
  
  try {
    // Find transaction by Stripe payment intent ID
    const transaction = await prisma.transaction.findFirst({
      where: { stripePi: paymentIntent.id }
    });

    if (transaction) {
      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'failed',
          receiptJson: JSON.parse(JSON.stringify({
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            lastPaymentError: paymentIntent.last_payment_error,
            timestamp: new Date().toISOString()
          }))
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          txId: transaction.id,
          actor: 'stripe_webhook',
          event: 'payment_failed',
          payload: {
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error ? {
              type: paymentIntent.last_payment_error.type,
              code: paymentIntent.last_payment_error.code,
              message: paymentIntent.last_payment_error.message
            } : null
          }
        }
      });

      console.log(`Transaction ${transaction.id} updated to failed`);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  try {
    // Get metadata from session
    const userId = session.metadata?.userId || "demo-user";
    const creditsToPurchase = parseInt(session.metadata?.creditsToPurchase || "0");
    const purchaseType = session.metadata?.type;
    
    if (purchaseType === "credit_purchase" && creditsToPurchase > 0) {
      // Find the credit purchase record
      const creditPurchase = await prisma.creditPurchase.findFirst({
        where: {
          stripeCheckoutSessionId: session.id,
          status: "pending"
        }
      });

      if (creditPurchase) {
        // Process the credit purchase
        const result = await CreditManager.processPurchaseSuccess(
          creditPurchase.id,
          session.payment_intent as string
        );

        if (result.success) {
          console.log(`Successfully processed credit purchase ${creditPurchase.id} for user ${userId}`);
          
          // Note: Audit logging can be added later if needed
          console.log(`Credit purchase completed: ${creditPurchase.id} for user ${userId}`);
        } else {
          console.error(`Failed to process credit purchase ${creditPurchase.id}:`, result.error);
        }
      } else {
        console.warn(`No pending credit purchase found for session ${session.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Handle successful invoice payment
  // This could be used for subscription payments, etc.
}
