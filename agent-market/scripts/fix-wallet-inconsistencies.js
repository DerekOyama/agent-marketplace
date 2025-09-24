#!/usr/bin/env node

/**
 * Wallet System Fix Script
 * 
 * This script fixes inconsistencies in the wallet system by:
 * - Recalculating user balances from transaction history
 * - Updating execution costs to match agent prices
 * - Recalculating earnings based on actual execution data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixWalletInconsistencies() {
  console.log('🔧 Starting wallet system fixes...\n');

  try {
    // 1. Fix user credit balances
    console.log('1. Fixing user credit balances...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        creditBalanceCents: true,
        creditTransactions: {
          select: {
            amountCents: true
          }
        }
      }
    });

    let fixedBalances = 0;
    for (const user of users) {
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      if (calculatedBalance !== user.creditBalanceCents) {
        await prisma.user.update({
          where: { id: user.id },
          data: { creditBalanceCents: calculatedBalance }
        });
        console.log(`   Fixed balance for ${user.email}: ${user.creditBalanceCents} → ${calculatedBalance} cents`);
        fixedBalances++;
      }
    }

    console.log(`✅ Fixed ${fixedBalances} user balances\n`);

    // 2. Fix execution costs
    console.log('2. Fixing execution costs...');
    const executions = await prisma.agentExecution.findMany({
      where: {
        status: 'success',
        creditsConsumed: { gt: 0 }
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            pricePerExecutionCents: true
          }
        }
      }
    });

    let fixedCosts = 0;
    for (const execution of executions) {
      const expectedCost = execution.agent.pricePerExecutionCents || 50;
      if (execution.creditsConsumed !== expectedCost) {
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: { creditsConsumed: expectedCost }
        });
        console.log(`   Fixed cost for execution ${execution.executionId}: ${execution.creditsConsumed} → ${expectedCost} cents`);
        fixedCosts++;
      }
    }

    console.log(`✅ Fixed ${fixedCosts} execution costs\n`);

    // 3. Fix earnings calculations
    console.log('3. Fixing earnings calculations...');
    const earnings = await prisma.agentEarnings.findMany({
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            pricePerExecutionCents: true
          }
        }
      }
    });

    let fixedEarnings = 0;
    for (const earning of earnings) {
      // Calculate correct earnings from successful executions
      const successfulExecutions = await prisma.agentExecution.findMany({
        where: {
          agentId: earning.agentId,
          status: 'success'
        },
        select: {
          creditsConsumed: true
        }
      });

      const totalRevenue = successfulExecutions.reduce((sum, exec) => sum + exec.creditsConsumed, 0);
      const expectedTotalEarnings = Math.floor(totalRevenue * 0.9); // 90% creator share
      const expectedPendingEarnings = expectedTotalEarnings - earning.paidOutCents;

      if (earning.totalEarningsCents !== expectedTotalEarnings || earning.pendingEarningsCents !== expectedPendingEarnings) {
        await prisma.agentEarnings.update({
          where: { id: earning.id },
          data: {
            totalEarningsCents: expectedTotalEarnings,
            pendingEarningsCents: Math.max(0, expectedPendingEarnings),
            totalExecutions: successfulExecutions.length
          }
        });
        console.log(`   Fixed earnings for agent ${earning.agent.name}:`);
        console.log(`     Total: ${earning.totalEarningsCents} → ${expectedTotalEarnings} cents`);
        console.log(`     Pending: ${earning.pendingEarningsCents} → ${expectedPendingEarnings} cents`);
        fixedEarnings++;
      }
    }

    console.log(`✅ Fixed ${fixedEarnings} earnings records\n`);

    // 4. Fix balance tracking in executions
    console.log('4. Fixing balance tracking in executions...');
    const executionsWithBalance = await prisma.agentExecution.findMany({
      where: {
        balanceBeforeCents: { not: null },
        balanceAfterCents: { not: null },
        status: 'success'
      },
      select: {
        id: true,
        executionId: true,
        creditsConsumed: true,
        balanceBeforeCents: true,
        balanceAfterCents: true
      }
    });

    let fixedBalanceTracking = 0;
    for (const execution of executionsWithBalance) {
      const expectedAfterBalance = execution.balanceBeforeCents - execution.creditsConsumed;
      if (execution.balanceAfterCents !== expectedAfterBalance) {
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: { balanceAfterCents: expectedAfterBalance }
        });
        console.log(`   Fixed balance tracking for execution ${execution.executionId}: ${execution.balanceAfterCents} → ${expectedAfterBalance} cents`);
        fixedBalanceTracking++;
      }
    }

    console.log(`✅ Fixed ${fixedBalanceTracking} balance tracking records\n`);

    // 5. Update agent metrics
    console.log('5. Updating agent metrics...');
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true }
    });

    let updatedMetrics = 0;
    for (const agent of agents) {
      // Get execution stats
      const executionStats = await prisma.agentExecution.aggregate({
        where: { agentId: agent.id },
        _count: { id: true },
        _avg: { duration: true },
        _sum: { creditsConsumed: true }
      });

      const successfulExecutions = await prisma.agentExecution.count({
        where: { agentId: agent.id, status: 'success' }
      });

      const failedExecutions = await prisma.agentExecution.count({
        where: { agentId: agent.id, status: { in: ['failed', 'error', 'timeout'] } }
      });

      // Update agent stats
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          totalExecutions: executionStats._count.id,
          lastExecutedAt: executionStats._count.id > 0 ? new Date() : null,
          stats: {
            totalExecutions: executionStats._count.id,
            successfulExecutions,
            failedExecutions,
            averageExecutionTime: Math.round(executionStats._avg.duration || 0),
            totalRevenueCents: executionStats._sum.creditsConsumed || 0,
            lastUpdated: new Date().toISOString()
          }
        }
      });

      updatedMetrics++;
    }

    console.log(`✅ Updated metrics for ${updatedMetrics} agents\n`);

    console.log('🎉 All wallet system fixes completed successfully!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fixes
fixWalletInconsistencies().catch(console.error);
