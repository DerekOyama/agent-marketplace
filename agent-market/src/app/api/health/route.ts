import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyValid: process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere"
    }
  });
}

