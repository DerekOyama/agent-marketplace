import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const CheckoutSessionSchema = z.object({
  amountCents: z.number().int().positive().default(2000), // $20.00 default
  currency: z.string().default("usd"),
  successUrl: z.string().default("http://localhost:3000?payment=success"),
  cancelUrl: z.string().default("http://localhost:3000?payment=cancelled"),
  description: z.string().default("Agent Marketplace Credits")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, currency, successUrl, cancelUrl, description } = CheckoutSessionSchema.parse(body);
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_yourKeyHere") {
      return NextResponse.json({
        error: "stripe_not_configured",
        message: "Stripe is not properly configured. Please set STRIPE_SECRET_KEY in your environment variables.",
        mockResponse: {
          amountCents,
          currency,
          description,
          sessionId: "mock_checkout_session",
          url: "mock_checkout_url",
          message: "This is a mock checkout session - Stripe is not configured"
        }
      }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil"
    });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description,
              description: `Add $${(amountCents / 100).toFixed(2)} credits to your account`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        test: "true",
        source: "agent_marketplace_debug",
        amount_cents: amountCents.toString()
      }
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        url: session.url,
        amountTotal: session.amount_total,
        currency: session.currency,
        mode: session.mode,
        paymentStatus: session.payment_status,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error("Stripe checkout session error:", error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: "stripe_error",
        type: error.type,
        code: error.code,
        message: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
