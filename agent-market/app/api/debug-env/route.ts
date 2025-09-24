import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      // Check if env vars exist (don't expose actual values for security)
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      // Show first/last few chars of DATABASE_URL to verify it's correct
      databaseUrlPreview: process.env.DATABASE_URL 
        ? `${process.env.DATABASE_URL.substring(0, 20)}...${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 10)}`
        : 'NOT_SET',
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...`
        : 'NOT_SET'
    };

    return NextResponse.json({
      status: "ok",
      message: "Environment variables check",
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

