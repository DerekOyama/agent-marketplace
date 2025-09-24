#!/usr/bin/env node

/**
 * Test Wallet System Script
 * 
 * This script tests the wallet system by:
 * - Creating a test user
 * - Creating a test agent with a specific price
 * - Executing the agent
 * - Verifying the balance and earnings calculations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalletSystem() {
  console.log('🧪 Testing wallet system...\n');

  try {
    // 1. Create or get test user
    console.log('1. Setting up test user...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        creditBalanceCents: 10000 // $100.00
      }
    });
    console.log(`   Test user: ${testUser.email} with ${testUser.creditBalanceCents} cents\n`);

    // 2. Create test agent
    console.log('2. Setting up test agent...');
    const testAgent = await prisma.agent.upsert({
      where: { name: 'Test Wallet Agent' },
      update: {},
      create: {
        name: 'Test Wallet Agent',
        description: 'A test agent for wallet system validation',
        runUrl: 'https://example.com/run',
        quoteUrl: 'https://example.com/quote',
        token: 'test-token',
        type: 'n8n',
        webhookUrl: 'https://httpbin.org/post', // Use httpbin for testing
        pricePerExecutionCents: 150, // $1.50
        ownerId: testUser.id
      }
    });
    console.log(`   Test agent: ${testAgent.name} with price ${testAgent.pricePerExecutionCents} cents\n`);

    // 3. Test execution
    console.log('3. Testing agent execution...');
    const executionId = `test_exec_${Date.now()}`;
    
    // Simulate the execution process
    const executionCostCents = testAgent.pricePerExecutionCents || 50;
    const balanceBefore = testUser.creditBalanceCents;
    
    console.log(`   Balance before: ${balanceBefore} cents`);
    console.log(`   Execution cost: ${executionCostCents} cents`);
    
    // Deduct credits
    const creditResult = await prisma.$transaction(async (tx) => {
      // Update user balance
      await tx.user.update({
        where: { id: testUser.id },
        data: { creditBalanceCents: { decrement: executionCostCents } }
      });
      
      // Create credit transaction
      const transaction = await tx.creditTransaction.create({
        data: {
          userId: testUser.id,
          amountCents: -executionCostCents,
          type: 'usage',
          description: `Test execution: ${testAgent.name}`,
          referenceId: executionId,
          referenceType: 'execution',
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceBefore - executionCostCents
        }
      });
      
      return transaction;
    });
    
    console.log(`   Credits deducted: ${executionCostCents} cents`);
    
    // Get updated balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { creditBalanceCents: true }
    });
    
    console.log(`   Balance after: ${updatedUser?.creditBalanceCents} cents`);
    console.log(`   Expected balance: ${balanceBefore - executionCostCents} cents`);
    
    // 4. Record execution
    console.log('\n4. Recording execution...');
    const execution = await prisma.agentExecution.create({
      data: {
        agentId: testAgent.id,
        userId: testUser.id,
        executionId,
        status: 'success',
        duration: 1000,
        creditsConsumed: executionCostCents,
        httpStatus: 200,
        inputSize: 100,
        outputSize: 200,
        inputType: 'json',
        outputType: 'json',
        responseTime: 1000,
        processingTime: 1000,
        balanceBeforeCents: balanceBefore,
        balanceAfterCents: updatedUser?.creditBalanceCents || 0,
        completedAt: new Date()
      }
    });
    console.log(`   Execution recorded: ${execution.id}`);

    // 5. Record earnings
    console.log('\n5. Recording earnings...');
    const platformFeeCents = Math.floor((executionCostCents * 10) / 100); // 10%
    const creatorEarningsCents = executionCostCents - platformFeeCents; // 90%
    
    const earnings = await prisma.agentEarnings.upsert({
      where: {
        agentId_userId: {
          agentId: testAgent.id,
          userId: testAgent.ownerId
        }
      },
      update: {
        totalEarningsCents: { increment: creatorEarningsCents },
        pendingEarningsCents: { increment: creatorEarningsCents },
        totalExecutions: { increment: 1 },
        lastEarningAt: new Date()
      },
      create: {
        agentId: testAgent.id,
        userId: testAgent.ownerId,
        totalEarningsCents: creatorEarningsCents,
        pendingEarningsCents: creatorEarningsCents,
        totalExecutions: 1,
        lastEarningAt: new Date()
      }
    });
    
    console.log(`   Platform fee: ${platformFeeCents} cents`);
    console.log(`   Creator earnings: ${creatorEarningsCents} cents`);
    console.log(`   Total earnings: ${earnings.totalEarningsCents} cents`);

    // 6. Verify consistency
    console.log('\n6. Verifying system consistency...');
    
    // Check user balance
    const finalUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { creditBalanceCents: true }
    });
    
    const calculatedBalance = await prisma.creditTransaction.aggregate({
      where: { userId: testUser.id },
      _sum: { amountCents: true }
    });
    
    const balanceConsistent = finalUser?.creditBalanceCents === (calculatedBalance._sum.amountCents || 0);
    console.log(`   Balance consistent: ${balanceConsistent ? '✅' : '❌'}`);
    
    // Check execution cost
    const executionCostConsistent = execution.creditsConsumed === testAgent.pricePerExecutionCents;
    console.log(`   Execution cost consistent: ${executionCostConsistent ? '✅' : '❌'}`);
    
    // Check earnings calculation
    const expectedEarnings = Math.floor(executionCostCents * 0.9);
    const earningsConsistent = earnings.totalEarningsCents === expectedEarnings;
    console.log(`   Earnings calculation consistent: ${earningsConsistent ? '✅' : '❌'}`);
    
    // Check balance tracking
    const balanceTrackingConsistent = execution.balanceAfterCents === (execution.balanceBeforeCents - execution.creditsConsumed);
    console.log(`   Balance tracking consistent: ${balanceTrackingConsistent ? '✅' : '❌'}`);

    // 7. Summary
    console.log('\n7. Test Summary:');
    console.log(`   User: ${testUser.email}`);
    console.log(`   Initial Balance: $${(balanceBefore / 100).toFixed(2)}`);
    console.log(`   Final Balance: $${((finalUser?.creditBalanceCents || 0) / 100).toFixed(2)}`);
    console.log(`   Execution Cost: $${(executionCostCents / 100).toFixed(2)}`);
    console.log(`   Creator Earnings: $${(creatorEarningsCents / 100).toFixed(2)}`);
    console.log(`   Platform Fee: $${(platformFeeCents / 100).toFixed(2)}`);
    
    const allConsistent = balanceConsistent && executionCostConsistent && earningsConsistent && balanceTrackingConsistent;
    console.log(`\n🎉 Wallet system test ${allConsistent ? 'PASSED' : 'FAILED'}!`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWalletSystem().catch(console.error);
