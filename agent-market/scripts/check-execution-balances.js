#!/usr/bin/env node

/**
 * Check Execution Balances Script
 * 
 * This script checks if execution records have balance information
 * and compares them with the actual user balance at the time.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExecutionBalances() {
  console.log('🔍 Checking execution balance tracking...\n');

  try {
    // Get recent executions with balance information
    const executions = await prisma.agentExecution.findMany({
      where: {
        userId: 'demo-user',
        status: 'success'
      },
      select: {
        id: true,
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
      take: 10
    });

    console.log(`Found ${executions.length} recent executions\n`);

    executions.forEach((exec, index) => {
      console.log(`${index + 1}. Execution: ${exec.executionId}`);
      console.log(`   Agent: ${exec.agent.name}`);
      console.log(`   Cost: $${(exec.creditsConsumed / 100).toFixed(2)}`);
      console.log(`   Balance Before: ${exec.balanceBeforeCents ? `$${(exec.balanceBeforeCents / 100).toFixed(2)}` : 'NULL'}`);
      console.log(`   Balance After: ${exec.balanceAfterCents ? `$${(exec.balanceAfterCents / 100).toFixed(2)}` : 'NULL'}`);
      console.log(`   Date: ${exec.createdAt.toLocaleString()}`);
      
      if (exec.balanceBeforeCents && exec.balanceAfterCents) {
        const expectedAfter = exec.balanceBeforeCents - exec.creditsConsumed;
        const isCorrect = exec.balanceAfterCents === expectedAfter;
        console.log(`   Expected After: $${(expectedAfter / 100).toFixed(2)}`);
        console.log(`   Balance Tracking: ${isCorrect ? '✅' : '❌'}`);
      } else {
        console.log(`   Balance Tracking: ❌ (Missing data)`);
      }
      console.log('');
    });

    // Check if any executions have balance data
    const executionsWithBalance = executions.filter(e => e.balanceBeforeCents !== null && e.balanceAfterCents !== null);
    console.log(`Executions with balance data: ${executionsWithBalance.length}/${executions.length}`);

    if (executionsWithBalance.length === 0) {
      console.log('\n❌ No executions have balance tracking data!');
      console.log('This means the balance fields are not being saved to the database.');
      console.log('The issue is likely that the Prisma client needs to be regenerated.');
    }

  } catch (error) {
    console.error('❌ Error checking execution balances:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkExecutionBalances().catch(console.error);
