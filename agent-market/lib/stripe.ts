import Stripe from "stripe";

// Initialize Stripe with proper configuration
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

// Stripe configuration validation
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY && 
    process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere" &&
    process.env.STRIPE_PUBLISHABLE_KEY &&
    process.env.STRIPE_PUBLISHABLE_KEY !== "pk_test_yourKeyHere"
  );
}

// Get Stripe environment info (without exposing secrets)
export function getStripeEnvironment() {
  return {
    configured: isStripeConfigured(),
    hasSecretKey: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere"),
    hasPublishableKey: !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_PUBLISHABLE_KEY !== "pk_test_yourKeyHere"),
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) + "..." : null,
    publishableKeyPrefix: process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 8) + "..." : null,
    apiVersion: "2025-08-27.basil"
  };
}

// Create a payment intent with proper error handling
export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not properly configured");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      description: params.description || "Agent Marketplace Payment",
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: "agent_marketplace",
        ...params.metadata
      }
    });

    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

// Create a checkout session with proper error handling
export async function createCheckoutSession(params: {
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not properly configured");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: params.description,
              description: `Add $${(params.amount / 100).toFixed(2)} credits to your account`,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        source: "agent_marketplace",
        ...params.metadata
      }
    });

    return session;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook secret not configured");
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
}

// Format currency for display
export function formatCurrency(amountCents: number, currency: string = "usd"): string {
  const amount = amountCents / 100;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  
  return formatter.format(amount);
}

// Validate payment amount
export function validatePaymentAmount(amountCents: number): { valid: boolean; error?: string } {
  if (amountCents < 50) {
    return { valid: false, error: "Minimum payment amount is $0.50" };
  }
  
  if (amountCents > 10000000) { // $100,000
    return { valid: false, error: "Maximum payment amount is $100,000" };
  }
  
  return { valid: true };
}

// Get Stripe account information
export async function getStripeAccountInfo() {
  if (!isStripeConfigured()) {
    return null;
  }

  try {
    const account = await stripe.accounts.retrieve();
    return {
      id: account.id,
      type: account.type,
      country: account.country,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    };
  } catch (error) {
    console.error("Error fetching Stripe account info:", error);
    return null;
  }
}

// Create a transfer to a connected account (for payouts)
export async function createTransferToConnectedAccount(params: {
  amount: number;
  currency: string;
  destination: string; // Connected account ID
  description?: string;
  metadata?: Record<string, string>;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not properly configured");
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.destination,
      description: params.description || "Agent Marketplace Payout",
      metadata: {
        source: "agent_marketplace_payout",
        ...params.metadata
      }
    });

    return transfer;
  } catch (error) {
    console.error("Error creating transfer:", error);
    throw error;
  }
}

// Create a payout to a bank account (direct payout)
export async function createDirectPayout(params: {
  amount: number;
  currency: string;
  destination: string; // Bank account ID or external account
  description?: string;
  metadata?: Record<string, string>;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not properly configured");
  }

  try {
    // First, create a transfer to the platform account
    const transfer = await stripe.transfers.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      destination: params.destination,
      description: params.description || "Agent Marketplace Payout",
      metadata: {
        source: "agent_marketplace_direct_payout",
        ...params.metadata
      }
    });

    // Then create a payout from the platform account
    const payout = await stripe.payouts.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      description: params.description || "Agent Marketplace Payout",
      metadata: {
        source: "agent_marketplace_payout",
        transfer_id: transfer.id,
        ...params.metadata
      }
    });

    return { transfer, payout };
  } catch (error) {
    console.error("Error creating direct payout:", error);
    throw error;
  }
}

// Validate payout amount
export function validatePayoutAmount(amountCents: number): { valid: boolean; error?: string } {
  if (amountCents < 500) { // $5.00 minimum
    return { valid: false, error: "Minimum payout amount is $5.00" };
  }
  
  if (amountCents > 10000000) { // $100,000
    return { valid: false, error: "Maximum payout amount is $100,000" };
  }
  
  return { valid: true };
}