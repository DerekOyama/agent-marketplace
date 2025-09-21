import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        stripeKeyValid: process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere"
      },
      deployment: {
        platform: "vercel",
        region: process.env.VERCEL_REGION || "unknown"
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

