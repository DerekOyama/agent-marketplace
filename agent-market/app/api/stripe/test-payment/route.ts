import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const TestPaymentSchema = z.object({
  amountCents: z.number().int().positive().default(1000), // $10.00 default
  currency: z.string().default("usd"),
  description: z.string().default("Test payment for Agent Marketplace")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, currency, description } = TestPaymentSchema.parse(body);
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_yourKeyHere") {
      return NextResponse.json({
        error: "stripe_not_configured",
        message: "Stripe is not properly configured. Please set STRIPE_SECRET_KEY in your environment variables.",
        mockResponse: {
          amountCents,
          currency,
          description,
          status: "mock_payment_intent",
          clientSecret: "mock_client_secret",
          message: "This is a mock response - Stripe is not configured"
        }
      }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil"
    });

    // Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      description,
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata: {
        test: "true",
        source: "agent_marketplace_debug"
      }
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata
      }
    });

  } catch (error) {
    console.error("Stripe test payment error:", error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: "stripe_error",
        type: error.type,
        code: error.code,
        message: error.message,
        decline_code: error.decline_code
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
