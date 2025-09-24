#!/usr/bin/env node

/**
 * Check Current Balance Script
 * 
 * This script checks the current balance for the demo user
 * and shows the transaction history to verify the correct balance.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentBalance() {
  console.log('💰 Checking current balance for demo user...\n');

  try {
    // Get the demo user
    const user = await prisma.user.findUnique({
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
      console.log('❌ Demo user not found');
      return;
    }

    console.log(`User: ${user.email}`);
    console.log(`Stored Balance: $${(user.creditBalanceCents / 100).toFixed(2)}`);
    console.log(`User ID: ${user.id}\n`);

    // Calculate balance from transactions
    const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
    console.log(`Calculated Balance: $${(calculatedBalance / 100).toFixed(2)}`);
    console.log(`Balance Consistent: ${user.creditBalanceCents === calculatedBalance ? '✅' : '❌'}\n`);

    // Show recent transactions
    console.log('Recent Transactions:');
    console.log('===================');
    
    user.creditTransactions.slice(0, 10).forEach((tx, index) => {
      const amount = tx.amountCents > 0 ? `+$${(tx.amountCents / 100).toFixed(2)}` : `$${(tx.amountCents / 100).toFixed(2)}`;
      const balance = `$${(tx.balanceAfterCents / 100).toFixed(2)}`;
      const date = tx.createdAt.toLocaleString();
      
      console.log(`${index + 1}. ${tx.description}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Balance After: ${balance}`);
      console.log(`   Date: ${date}`);
      console.log(`   Type: ${tx.type}`);
      console.log('');
    });

    // Check if there are any executions that might affect balance
    const recentExecutions = await prisma.agentExecution.findMany({
      where: {
        userId: user.id,
        status: 'success'
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

    console.log('Recent Executions:');
    console.log('==================');
    
    recentExecutions.forEach((exec, index) => {
      const cost = `$${(exec.creditsConsumed / 100).toFixed(2)}`;
      const balanceBefore = `$${(exec.balanceBeforeCents / 100).toFixed(2)}`;
      const balanceAfter = `$${(exec.balanceAfterCents / 100).toFixed(2)}`;
      const date = exec.createdAt.toLocaleString();
      
      console.log(`${index + 1}. Agent: ${exec.agent.name}`);
      console.log(`   Execution ID: ${exec.executionId}`);
      console.log(`   Cost: ${cost}`);
      console.log(`   Balance Before: ${balanceBefore}`);
      console.log(`   Balance After: ${balanceAfter}`);
      console.log(`   Date: ${date}`);
      console.log('');
    });

    // Final verification
    console.log('Final Verification:');
    console.log('===================');
    console.log(`Current Stored Balance: $${(user.creditBalanceCents / 100).toFixed(2)}`);
    console.log(`Balance from Transactions: $${(calculatedBalance / 100).toFixed(2)}`);
    console.log(`Latest Transaction Balance: $${(user.creditTransactions[0]?.balanceAfterCents / 100).toFixed(2) || 'N/A'}`);
    console.log(`Latest Execution Balance: $${(recentExecutions[0]?.balanceAfterCents / 100).toFixed(2) || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error checking balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCurrentBalance().catch(console.error);
