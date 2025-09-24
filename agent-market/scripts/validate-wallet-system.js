#!/usr/bin/env node

/**
 * Wallet System Validation Script
 * 
 * This script validates the consistency between:
 * - User credit balances
 * - Credit transactions
 * - Agent executions
 * - Agent earnings
 * - Payouts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validateWalletSystem() {
  console.log('🔍 Starting wallet system validation...\n');

  try {
    // 1. Validate user credit balances against transaction history
    console.log('1. Validating user credit balances...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        creditBalanceCents: true,
        creditTransactions: {
          select: {
            amountCents: true,
            type: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    let balanceIssues = 0;
    for (const user of users) {
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      if (calculatedBalance !== user.creditBalanceCents) {
        console.log(`❌ Balance mismatch for user ${user.email}:`);
        console.log(`   Stored: ${user.creditBalanceCents} cents`);
        console.log(`   Calculated: ${calculatedBalance} cents`);
        console.log(`   Difference: ${user.creditBalanceCents - calculatedBalance} cents`);
        balanceIssues++;
      }
    }

    if (balanceIssues === 0) {
      console.log('✅ All user credit balances are consistent\n');
    } else {
      console.log(`❌ Found ${balanceIssues} balance inconsistencies\n`);
    }

    // 2. Validate execution costs against agent prices
    console.log('2. Validating execution costs...');
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

    let costIssues = 0;
    for (const execution of executions) {
      const expectedCost = execution.agent.pricePerExecutionCents || 50;
      if (execution.creditsConsumed !== expectedCost) {
        console.log(`❌ Cost mismatch for execution ${execution.executionId}:`);
        console.log(`   Agent: ${execution.agent.name}`);
        console.log(`   Expected: ${expectedCost} cents`);
        console.log(`   Actual: ${execution.creditsConsumed} cents`);
        costIssues++;
      }
    }

    if (costIssues === 0) {
      console.log('✅ All execution costs match agent prices\n');
    } else {
      console.log(`❌ Found ${costIssues} cost inconsistencies\n`);
    }

    // 3. Validate earnings calculations
    console.log('3. Validating earnings calculations...');
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

    let earningsIssues = 0;
    for (const earning of earnings) {
      // Calculate expected earnings from successful executions
      const successfulExecutions = await prisma.agentExecution.count({
        where: {
          agentId: earning.agentId,
          status: 'success'
        }
      });

      const expectedTotalEarnings = successfulExecutions * (earning.agent.pricePerExecutionCents || 50) * 0.9; // 90% creator share
      
      if (Math.abs(earning.totalEarningsCents - expectedTotalEarnings) > 1) { // Allow 1 cent tolerance
        console.log(`❌ Earnings mismatch for agent ${earning.agent.name}:`);
        console.log(`   Expected: ${expectedTotalEarnings} cents`);
        console.log(`   Actual: ${earning.totalEarningsCents} cents`);
        console.log(`   Difference: ${earning.totalEarningsCents - expectedTotalEarnings} cents`);
        earningsIssues++;
      }
    }

    if (earningsIssues === 0) {
      console.log('✅ All earnings calculations are correct\n');
    } else {
      console.log(`❌ Found ${earningsIssues} earnings inconsistencies\n`);
    }

    // 4. Validate balance tracking in executions
    console.log('4. Validating balance tracking in executions...');
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

    let balanceTrackingIssues = 0;
    for (const execution of executionsWithBalance) {
      const expectedAfterBalance = execution.balanceBeforeCents - execution.creditsConsumed;
      if (execution.balanceAfterCents !== expectedAfterBalance) {
        console.log(`❌ Balance tracking mismatch for execution ${execution.executionId}:`);
        console.log(`   Before: ${execution.balanceBeforeCents} cents`);
        console.log(`   Consumed: ${execution.creditsConsumed} cents`);
        console.log(`   Expected After: ${expectedAfterBalance} cents`);
        console.log(`   Actual After: ${execution.balanceAfterCents} cents`);
        balanceTrackingIssues++;
      }
    }

    if (balanceTrackingIssues === 0) {
      console.log('✅ All balance tracking is correct\n');
    } else {
      console.log(`❌ Found ${balanceTrackingIssues} balance tracking inconsistencies\n`);
    }

    // 5. Summary statistics
    console.log('5. System Summary:');
    const totalUsers = await prisma.user.count();
    const totalAgents = await prisma.agent.count();
    const totalExecutions = await prisma.agentExecution.count();
    const totalTransactions = await prisma.creditTransaction.count();
    const totalEarnings = await prisma.agentEarnings.count();
    const totalPayouts = await prisma.payout.count();

    console.log(`   Users: ${totalUsers}`);
    console.log(`   Agents: ${totalAgents}`);
    console.log(`   Executions: ${totalExecutions}`);
    console.log(`   Credit Transactions: ${totalTransactions}`);
    console.log(`   Earnings Records: ${totalEarnings}`);
    console.log(`   Payouts: ${totalPayouts}`);

    const totalCreditsInSystem = await prisma.creditTransaction.aggregate({
      _sum: { amountCents: true }
    });

    console.log(`   Total Credits in System: ${totalCreditsInSystem._sum.amountCents || 0} cents`);

    const totalEarningsValue = await prisma.agentEarnings.aggregate({
      _sum: { totalEarningsCents: true }
    });

    console.log(`   Total Earnings Value: ${totalEarningsValue._sum.totalEarningsCents || 0} cents`);

    // 6. Recent activity
    console.log('\n6. Recent Activity (last 24 hours):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentExecutions = await prisma.agentExecution.count({
      where: {
        createdAt: { gte: yesterday }
      }
    });

    const recentTransactions = await prisma.creditTransaction.count({
      where: {
        createdAt: { gte: yesterday }
      }
    });

    console.log(`   Recent Executions: ${recentExecutions}`);
    console.log(`   Recent Transactions: ${recentTransactions}`);

    console.log('\n✅ Wallet system validation complete!');

  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the validation
validateWalletSystem().catch(console.error);
