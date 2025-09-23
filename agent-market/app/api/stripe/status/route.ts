import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  try {
    const hasSecretKey = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere");
    const hasPublishableKey = !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_PUBLISHABLE_KEY !== "pk_test_yourKeyHere");
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeInfo = null;
    let connectionTest = null;

    if (hasSecretKey) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2025-08-27.basil"
        });

        // Test connection by getting account info
        const account = await stripe.accounts.retrieve();
        
        stripeInfo = {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        };

        connectionTest = {
          success: true,
          message: "Successfully connected to Stripe"
        };

      } catch (error) {
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return NextResponse.json({
      configured: hasSecretKey && hasPublishableKey,
      environment: {
        hasSecretKey,
        hasPublishableKey,
        hasWebhookSecret,
        secretKeyPrefix: hasSecretKey ? process.env.STRIPE_SECRET_KEY!.substring(0, 8) + "..." : null,
        publishableKeyPrefix: hasPublishableKey ? process.env.STRIPE_PUBLISHABLE_KEY!.substring(0, 8) + "..." : null
      },
      stripeInfo,
      connectionTest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Stripe status check error:", error);
    return NextResponse.json({
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
