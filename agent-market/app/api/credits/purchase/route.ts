import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createCheckoutSession, isStripeConfigured } from "../../../../lib/stripe";
import { z } from "zod";

const PurchaseCreditsSchema = z.object({
  amountCents: z.number().int().min(500).max(100000), // $5 to $1000
  currency: z.string().default("usd"),
  description: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, currency, description } = PurchaseCreditsSchema.parse(body);
    
    const userId = "demo-user"; // In real app, get from session/auth
    
    // Calculate credits to purchase (1 credit = 1 cent for simplicity)
    const creditsToPurchase = amountCents;
    
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json({
        error: "stripe_not_configured",
        message: "Payment processing is not available. Please contact support.",
        mockResponse: {
          amountCents,
          creditsToPurchase,
          status: "mock_purchase",
          message: "This is a mock purchase - Stripe is not configured"
        }
      }, { status: 400 });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      amount: amountCents,
      currency,
      description: description || `Purchase ${creditsToPurchase} credits`,
      successUrl: `${req.nextUrl.origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${req.nextUrl.origin}/credits/cancel`,
      metadata: {
        userId,
        creditsToPurchase: creditsToPurchase.toString(),
        type: "credit_purchase"
      }
    });

    // Create pending credit purchase record
    const creditPurchase = await prisma.creditPurchase.create({
      data: {
        userId,
        amountCents,
        creditsPurchased: creditsToPurchase,
        currency,
        stripeCheckoutSessionId: session.id,
        status: "pending",
        metadata: {
          description: description || `Purchase ${creditsToPurchase} credits`,
          checkoutUrl: session.url
        }
      }
    });

    // Note: Credits will only be added when Stripe webhook confirms payment
    // This ensures users can't get credits without actually paying
    console.log(`Credit purchase created: ${creditPurchase.id} - Credits will be added after Stripe confirms payment`);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        url: session.url,
        amountTotal: session.amount_total,
        currency: session.currency
      },
      purchase: {
        id: creditPurchase.id,
        amountCents,
        creditsPurchased: creditsToPurchase,
        status: creditPurchase.status
      }
    });

  } catch (error) {
    console.error("Credit purchase error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "validation_error",
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
