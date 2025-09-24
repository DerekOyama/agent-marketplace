#!/usr/bin/env node

/**
 * Fix Execution Balances Script
 * 
 * This script fixes execution records by calculating the correct balance
 * information from the transaction history and updating the execution records.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixExecutionBalances() {
  console.log('🔧 Fixing execution balance tracking...\n');

  try {
    // Get all executions for the demo user
    const executions = await prisma.agentExecution.findMany({
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

    console.log(`Found ${executions.length} executions to fix\n`);

    // Get all transactions for the demo user
    const transactions = await prisma.creditTransaction.findMany({
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

    console.log(`Found ${transactions.length} transactions\n`);

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

    console.log('Transaction balance history:');
    balanceHistory.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.transaction.description} - Balance: $${(entry.balance / 100).toFixed(2)} (${entry.timestamp.toLocaleString()})`);
    });
    console.log('');

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
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter
        }
      });

      console.log(`Fixed execution ${execution.executionId}:`);
      console.log(`  Before: $${(balanceBefore / 100).toFixed(2)}`);
      console.log(`  After: $${(balanceAfter / 100).toFixed(2)}`);
      console.log(`  Cost: $${(execution.creditsConsumed / 100).toFixed(2)}`);
      console.log('');

      fixedCount++;
    }

    console.log(`✅ Fixed ${fixedCount} execution records`);

    // Verify the fix
    console.log('\nVerifying fix...');
    const updatedExecutions = await prisma.agentExecution.findMany({
      where: {
        userId: 'demo-user',
        status: 'success',
        balanceBeforeCents: { not: null },
        balanceAfterCents: { not: null }
      },
      select: {
        executionId: true,
        creditsConsumed: true,
        balanceBeforeCents: true,
        balanceAfterCents: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`Executions with balance data: ${updatedExecutions.length}`);
    
    updatedExecutions.forEach((exec, index) => {
      const expectedAfter = exec.balanceBeforeCents - exec.creditsConsumed;
      const isCorrect = exec.balanceAfterCents === expectedAfter;
      console.log(`${index + 1}. ${exec.executionId}: ${isCorrect ? '✅' : '❌'} (Before: $${(exec.balanceBeforeCents / 100).toFixed(2)}, After: $${(exec.balanceAfterCents / 100).toFixed(2)})`);
    });

  } catch (error) {
    console.error('❌ Error fixing execution balances:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixExecutionBalances().catch(console.error);
