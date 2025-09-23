import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUserId } from "../../../lib/auth";

// GET - Get user's current credit balance
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        creditBalanceCents: true,
        updatedAt: true
      }
    });

    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Credit balance fetch error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST - Update user's credit balance (for adding credits, etc.)
export async function POST(req: NextRequest) {
  try {
    const { amountCents, operation = "add" } = await req.json();
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    if (!amountCents || typeof amountCents !== "number") {
      return NextResponse.json({ 
        error: "bad_request", 
        message: "amountCents is required and must be a number" 
      }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        error: "user_not_found" 
      }, { status: 404 });
    }

    let newBalance;
    if (operation === "add") {
      newBalance = user.creditBalanceCents + amountCents;
    } else if (operation === "subtract") {
      newBalance = user.creditBalanceCents - amountCents;
      if (newBalance < 0) {
        return NextResponse.json({ 
          error: "insufficient_credits", 
          message: "Not enough credits for this operation" 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: "bad_request", 
        message: "Operation must be 'add' or 'subtract'" 
      }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { creditBalanceCents: newBalance },
      select: { 
        id: true, 
        email: true, 
        creditBalanceCents: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ 
      user: updatedUser,
      operation,
      amountCents,
      previousBalance: user.creditBalanceCents,
      newBalance
    }, { status: 200 });

  } catch (error) {
    console.error("Credit update error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
