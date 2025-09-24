#!/usr/bin/env node

/**
 * Add Earnings and Payouts Script
 * 
 * This script adds earnings and payout transactions to the derek.oyama@gmail.com user
 * to demonstrate how earnings and payouts are reflected in the balance history.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addEarningsAndPayouts() {
  console.log('💰 Adding earnings and payout transactions...\n');

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`User ID: ${user.id}`);

    // Add earnings transactions (money earned from agent usage)
    const earningsTransactions = [
      {
        id: 'tx_earnings_1',
        amountCents: 150, // $1.50 earned
        type: 'earnings',
        description: 'Agent Earnings - Bbb Agent',
        balanceBeforeCents: 800,
        balanceAfterCents: 950,
        createdAt: new Date('2025-09-23T14:00:00Z'),
        userId: user.id,
        referenceType: 'agent_earnings',
        referenceId: 'agent_bb_earnings_1'
      },
      {
        id: 'tx_earnings_2',
        amountCents: 100, // $1.00 earned
        type: 'earnings',
        description: 'Agent Earnings - Aa Agent',
        balanceBeforeCents: 950,
        balanceAfterCents: 1050,
        createdAt: new Date('2025-09-23T13:30:00Z'),
        userId: user.id,
        referenceType: 'agent_earnings',
        referenceId: 'agent_aa_earnings_1'
      },
      {
        id: 'tx_earnings_3',
        amountCents: 200, // $2.00 earned
        type: 'earnings',
        description: 'Agent Earnings - Demo N8n Agent',
        balanceBeforeCents: 1050,
        balanceAfterCents: 1250,
        createdAt: new Date('2025-09-23T12:00:00Z'),
        userId: user.id,
        referenceType: 'agent_earnings',
        referenceId: 'agent_demo_earnings_1'
      }
    ];

    // Add payout transactions (money withdrawn)
    const payoutTransactions = [
      {
        id: 'tx_payout_1',
        amountCents: -500, // $5.00 payout
        type: 'payout',
        description: 'Payout Request - Bank Transfer',
        balanceBeforeCents: 1250,
        balanceAfterCents: 750,
        createdAt: new Date('2025-09-23T15:00:00Z'),
        userId: user.id,
        referenceType: 'payout',
        referenceId: 'payout_1'
      },
      {
        id: 'tx_payout_2',
        amountCents: -200, // $2.00 payout
        type: 'payout',
        description: 'Payout Request - PayPal',
        balanceBeforeCents: 750,
        balanceAfterCents: 550,
        createdAt: new Date('2025-09-23T16:00:00Z'),
        userId: user.id,
        referenceType: 'payout',
        referenceId: 'payout_2'
      }
    ];

    // Create earnings transactions
    for (const transaction of earningsTransactions) {
      await prisma.creditTransaction.create({
        data: transaction
      });
    }

    // Create payout transactions
    for (const transaction of payoutTransactions) {
      await prisma.creditTransaction.create({
        data: transaction
      });
    }

    // Update user balance to reflect the final amount
    const finalBalance = 550; // $5.50
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalanceCents: finalBalance }
    });

    console.log(`✅ Added ${earningsTransactions.length} earnings transactions`);
    console.log(`✅ Added ${payoutTransactions.length} payout transactions`);
    console.log(`Final balance: $${finalBalance / 100}`);

    // Verify the data
    const finalUser = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    console.log('\n📊 Verification:');
    console.log(`Current Balance: $${finalUser.creditBalanceCents / 100}`);
    console.log(`Transaction Count: ${finalUser.creditTransactions.length}`);
    console.log('\nRecent Transactions (including earnings/payouts):');
    finalUser.creditTransactions.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.description}`);
      console.log(`   Amount: $${tx.amountCents / 100}`);
      console.log(`   Balance After: $${tx.balanceAfterCents / 100}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Date: ${tx.createdAt.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error adding earnings and payouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEarningsAndPayouts();
