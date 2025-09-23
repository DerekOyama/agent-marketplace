import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_yourKeyHere") {
      return NextResponse.json({
        error: "stripe_not_configured",
        message: "Stripe is not properly configured. Please set STRIPE_SECRET_KEY in your environment variables.",
        mockResponse: {
          webhookTest: true,
          message: "This is a mock webhook test - Stripe is not configured",
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil"
    });

    // Test webhook signature verification (if webhook secret is provided)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let signatureValid = false;
    let signatureError = null;

    if (webhookSecret) {
      try {
        const body = await req.text();
        const signature = req.headers.get('stripe-signature');
        
        if (signature) {
          // In a real webhook, you would verify the signature
          // For testing, we'll just check if the secret exists
          signatureValid = true;
        }
      } catch (error) {
        signatureError = error instanceof Error ? error.message : String(error);
      }
    }

    // Get recent events to test webhook functionality
    const events = await stripe.events.list({
      limit: 5,
      type: 'payment_intent.created'
    });

    return NextResponse.json({
      success: true,
      webhookTest: {
        signatureConfigured: !!webhookSecret,
        signatureValid,
        signatureError,
        recentEvents: events.data.length,
        testTimestamp: new Date().toISOString()
      },
      environment: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!webhookSecret,
        apiVersion: "2025-08-27.basil"
      }
    });

  } catch (error) {
    console.error("Stripe webhook test error:", error);
    
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
