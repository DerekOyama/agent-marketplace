import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ 
      message: "Simple test endpoint working",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: "Test endpoint failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
