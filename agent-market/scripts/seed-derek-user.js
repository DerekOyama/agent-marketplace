#!/usr/bin/env node

/**
 * Seed Derek User Script
 * 
 * This script creates the derek.oyama@gmail.com user with the correct balance
 * and transaction history to match the UI display.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDerekUser() {
  console.log('👤 Seeding derek.oyama@gmail.com user...\n');

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (existingUser) {
      console.log('User already exists, updating balance and transactions...');
      
      // Update user balance
      await prisma.user.update({
        where: { email: 'derek.oyama@gmail.com' },
        data: { creditBalanceCents: 800 } // $8.00
      });

      // Delete existing transactions
      await prisma.creditTransaction.deleteMany({
        where: { user: { email: 'derek.oyama@gmail.com' } }
      });
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          email: 'derek.oyama@gmail.com',
          creditBalanceCents: 800, // $8.00
        }
      });
    }

    // Get the user ID
    const user = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (!user) {
      throw new Error('Failed to create or find user');
    }

    console.log(`User ID: ${user.id}`);

    // Create transactions in reverse chronological order (newest first)
    // The balance should work backwards from $8.00
    const transactions = [
      {
        id: 'tx_derek_10',
        amountCents: -50,
        type: 'usage',
        description: 'Agent Execution: Bbb',
        balanceBeforeCents: 850,
        balanceAfterCents: 800,
        createdAt: new Date('2025-09-23T13:25:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_11',
        amountCents: -50,
        type: 'usage',
        description: 'Agent Execution: Bbb',
        balanceBeforeCents: 900,
        balanceAfterCents: 850,
        createdAt: new Date('2025-09-23T13:11:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_12',
        amountCents: -50,
        type: 'usage',
        description: 'Agent Execution: Aa',
        balanceBeforeCents: 950,
        balanceAfterCents: 900,
        createdAt: new Date('2025-09-23T11:48:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_13',
        amountCents: 1000,
        type: 'purchase',
        description: 'Credit Purchase - 1000 Credits',
        balanceBeforeCents: 950,
        balanceAfterCents: 1950,
        createdAt: new Date('2025-09-23T10:17:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_14',
        amountCents: -50,
        type: 'usage',
        description: 'Agent Execution: Demo N8n Agent',
        balanceBeforeCents: 1000,
        balanceAfterCents: 950,
        createdAt: new Date('2025-09-23T10:07:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_15',
        amountCents: -50,
        type: 'usage',
        description: 'Agent Execution: Test Agent',
        balanceBeforeCents: 1050,
        balanceAfterCents: 1000,
        createdAt: new Date('2025-09-23T09:30:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_16',
        amountCents: -100,
        type: 'usage',
        description: 'Agent Execution: Advanced AI',
        balanceBeforeCents: 1150,
        balanceAfterCents: 1050,
        createdAt: new Date('2025-09-23T09:15:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_17',
        amountCents: 2000,
        type: 'purchase',
        description: 'Credit Purchase - 2000 Credits',
        balanceBeforeCents: 1150,
        balanceAfterCents: 3150,
        createdAt: new Date('2025-09-23T08:45:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_18',
        amountCents: -25,
        type: 'usage',
        description: 'Agent Execution: Quick Task',
        balanceBeforeCents: 1175,
        balanceAfterCents: 1150,
        createdAt: new Date('2025-09-23T08:30:00Z'),
        userId: user.id
      },
      {
        id: 'tx_derek_19',
        amountCents: 500,
        type: 'bonus',
        description: 'Welcome Bonus',
        balanceBeforeCents: 675,
        balanceAfterCents: 1175,
        createdAt: new Date('2025-09-23T08:00:00Z'),
        userId: user.id
      }
    ];

    // Create transactions
    for (const transaction of transactions) {
      await prisma.creditTransaction.create({
        data: transaction
      });
    }

    console.log(`✅ Created ${transactions.length} transactions for derek.oyama@gmail.com`);
    console.log(`Final balance: $${user.creditBalanceCents / 100}`);

    // Verify the data
    const finalUser = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    console.log('\n📊 Verification:');
    console.log(`Current Balance: $${finalUser.creditBalanceCents / 100}`);
    console.log(`Transaction Count: ${finalUser.creditTransactions.length}`);
    console.log('\nRecent Transactions:');
    finalUser.creditTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.description}`);
      console.log(`   Amount: $${tx.amountCents / 100}`);
      console.log(`   Balance After: $${tx.balanceAfterCents / 100}`);
      console.log(`   Date: ${tx.createdAt.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error seeding derek user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDerekUser();
