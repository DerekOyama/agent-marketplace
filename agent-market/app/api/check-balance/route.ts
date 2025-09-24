import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('💰 Checking current balance for demo user...');

    // Get the demo user
    const user = await (prisma as any).user.findUnique({
      where: { email: 'demo@example.com' },
      select: {
        id: true,
        email: true,
        creditBalanceCents: true,
        creditTransactions: {
          select: {
            id: true,
            amountCents: true,
            type: true,
            description: true,
            balanceBeforeCents: true,
            balanceAfterCents: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Demo user not found' }, { status: 404 });
    }

    // Calculate balance from transactions
    const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
    const balanceConsistent = user.creditBalanceCents === calculatedBalance;

    // Get recent executions with balance data
    const recentExecutions = await (prisma as any).agentExecution.findMany({
      where: {
        userId: user.id,
        status: 'success',
        balanceBeforeCents: { not: null },
        balanceAfterCents: { not: null }
      },
      select: {
        executionId: true,
        creditsConsumed: true,
        balanceBeforeCents: true,
        balanceAfterCents: true,
        createdAt: true,
        agent: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return NextResponse.json({
      user: {
        email: user.email,
        storedBalance: user.creditBalanceCents,
        calculatedBalance,
        balanceConsistent
      },
      recentTransactions: user.creditTransactions.slice(0, 5).map(tx => ({
        description: tx.description,
        amount: tx.amountCents,
        balanceAfter: tx.balanceAfterCents,
        type: tx.type,
        createdAt: tx.createdAt
      })),
      recentExecutions: recentExecutions.map(exec => ({
        executionId: exec.executionId,
        agentName: exec.agent.name,
        cost: exec.creditsConsumed,
        balanceBefore: exec.balanceBeforeCents,
        balanceAfter: exec.balanceAfterCents,
        createdAt: exec.createdAt
      })),
      summary: {
        totalTransactions: user.creditTransactions.length,
        executionsWithBalance: recentExecutions.length,
        currentBalance: user.creditBalanceCents,
        balanceFormatted: `$${(user.creditBalanceCents / 100).toFixed(2)}`
      }
    });

  } catch (error) {
    console.error('❌ Error checking balance:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

