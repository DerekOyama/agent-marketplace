import { NextRequest, NextResponse } from "next/server";
import { CreditManager } from "../../../../lib/credit-manager";
import { z } from "zod";

const AddCreditsSchema = z.object({
  amountCents: z.number().int().positive(),
  type: z.enum(['bonus', 'adjustment']).default('bonus'),
  description: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, type, description } = AddCreditsSchema.parse(body);
    
    const userId = "demo-user"; // In real app, get from session/auth
    
    // Add credits using CreditManager for proper transaction tracking
    const result = await CreditManager.addCredits({
      userId,
      amountCents,
      type,
      description: description || `Credit ${type}: ${amountCents} cents`,
      metadata: {
        source: 'manual_addition',
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      return NextResponse.json({
        error: "failed_to_add_credits",
        message: result.error
      }, { status: 400 });
    }

    // Get updated user info
    const balanceResult = await CreditManager.getBalance(userId);

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      newBalance: result.newBalance,
      user: {
        id: userId,
        creditBalanceCents: balanceResult.balance
      }
    });

  } catch (error) {
    console.error("Add credits error:", error);
    
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
