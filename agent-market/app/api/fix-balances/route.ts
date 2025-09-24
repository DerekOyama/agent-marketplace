import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Fixing execution balance tracking...');

    // Get all executions for the demo user
    const executions = await (prisma as any).agentExecution.findMany({
      where: {
        userId: 'demo-user',
        status: 'success'
      },
      select: {
        id: true,
        executionId: true,
        creditsConsumed: true,
        createdAt: true,
        balanceBeforeCents: true,
        balanceAfterCents: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${executions.length} executions to fix`);

    // Get all transactions for the demo user
    const transactions = await (prisma as any).creditTransaction.findMany({
      where: { userId: 'demo-user' },
      select: {
        amountCents: true,
        balanceBeforeCents: true,
        balanceAfterCents: true,
        createdAt: true,
        type: true,
        description: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${transactions.length} transactions`);

    // Calculate running balance from transactions
    let runningBalance = 0;
    const balanceHistory = [];

    for (const tx of transactions) {
      runningBalance += tx.amountCents;
      balanceHistory.push({
        timestamp: tx.createdAt,
        balance: runningBalance,
        transaction: tx
      });
    }

    // Fix each execution
    let fixedCount = 0;
    for (const execution of executions) {
      // Find the balance at the time of execution
      const executionTime = execution.createdAt;
      
      // Find the last transaction before or at the execution time
      let balanceBefore = 0;
      let balanceAfter = 0;
      
      for (let i = balanceHistory.length - 1; i >= 0; i--) {
        const entry = balanceHistory[i];
        if (entry.timestamp <= executionTime) {
          balanceBefore = entry.balance - entry.transaction.amountCents; // Balance before this transaction
          balanceAfter = entry.balance; // Balance after this transaction
          break;
        }
      }

      // If this execution consumed credits, adjust the balance
      if (execution.creditsConsumed > 0) {
        balanceAfter = balanceBefore - execution.creditsConsumed;
      }

      // Update the execution record
      await (prisma as any).agentExecution.update({
        where: { id: execution.id },
        data: {
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter
        }
      });

      console.log(`Fixed execution ${execution.executionId}: Before $${(balanceBefore / 100).toFixed(2)}, After $${(balanceAfter / 100).toFixed(2)}`);
      fixedCount++;
    }

    console.log(`✅ Fixed ${fixedCount} execution records`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} execution records`,
      fixedCount
    });

  } catch (error) {
    console.error('❌ Error fixing execution balances:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

