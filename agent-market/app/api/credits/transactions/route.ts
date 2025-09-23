import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

const GetTransactionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  type: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = GetTransactionsSchema.parse({
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      type: searchParams.get('type') || undefined
    });

    const userId = "demo-user"; // In real app, get from session/auth
    
    // Build where clause
    const where: { userId: string; type?: string } = { userId };
    if (query.type) {
      where.type = query.type;
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          creditPurchase: {
            select: {
              id: true,
              stripePaymentIntentId: true,
              stripeCheckoutSessionId: true
            }
          }
        }
      }),
      prisma.creditTransaction.count({ where })
    ]);

    // Get current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalanceCents: true }
    });

    return NextResponse.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        amountCents: tx.amountCents,
        type: tx.type,
        description: tx.description,
        balanceBeforeCents: tx.balanceBeforeCents,
        balanceAfterCents: tx.balanceAfterCents,
        referenceId: tx.referenceId,
        referenceType: tx.referenceType,
        createdAt: tx.createdAt,
        metadata: tx.metadata,
        purchase: tx.creditPurchase
      })),
      pagination: {
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < totalCount
      },
      currentBalance: user?.creditBalanceCents || 0
    });

  } catch (error) {
    console.error("Get transactions error:", error);
    
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
