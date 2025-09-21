import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const userId = "demo-user";
    
    // Get or create user
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: "demo@example.com",
          creditBalanceCents: 1000 // $10.00
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        creditBalanceCents: user.creditBalanceCents,
        balanceFormatted: `$${(user.creditBalanceCents / 100).toFixed(2)}`
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Test credits error:", error);
    return NextResponse.json({ 
      success: false,
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
