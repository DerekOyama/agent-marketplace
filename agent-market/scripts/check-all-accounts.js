#!/usr/bin/env node

/**
 * Check All Accounts Script
 * 
 * This script checks the balance for all user accounts in the system.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllAccounts() {
  console.log('👥 Checking all user accounts...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        creditBalanceCents: true,
        createdAt: true,
        creditTransactions: {
          select: {
            amountCents: true,
            type: true,
            description: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${users.length} user accounts:\n`);

    for (const user of users) {
      // Calculate balance from transactions
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      const balanceConsistent = user.creditBalanceCents === calculatedBalance;
      
      console.log(`📧 Account: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Stored Balance: $${(user.creditBalanceCents / 100).toFixed(2)}`);
      console.log(`   Calculated Balance: $${(calculatedBalance / 100).toFixed(2)}`);
      console.log(`   Balance Consistent: ${balanceConsistent ? '✅' : '❌'}`);
      console.log(`   Account Created: ${user.createdAt.toLocaleString()}`);
      console.log(`   Total Transactions: ${user.creditTransactions.length}`);
      
      // Show recent transactions
      if (user.creditTransactions.length > 0) {
        console.log(`   Recent Transactions:`);
        user.creditTransactions.slice(0, 3).forEach((tx, index) => {
          const amount = tx.amountCents > 0 ? `+$${(tx.amountCents / 100).toFixed(2)}` : `$${(tx.amountCents / 100).toFixed(2)}`;
          console.log(`     ${index + 1}. ${tx.description} - ${amount} (${tx.type})`);
        });
      }
      console.log('');
    }

    // Summary
    const totalBalance = users.reduce((sum, user) => sum + user.creditBalanceCents, 0);
    const totalTransactions = users.reduce((sum, user) => sum + user.creditTransactions.length, 0);
    
    console.log('📊 System Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Total System Balance: $${(totalBalance / 100).toFixed(2)}`);
    console.log(`   Total Transactions: ${totalTransactions}`);
    
    // Check for inconsistencies
    const inconsistentUsers = users.filter(user => {
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      return user.creditBalanceCents !== calculatedBalance;
    });
    
    if (inconsistentUsers.length > 0) {
      console.log(`\n⚠️  Found ${inconsistentUsers.length} accounts with balance inconsistencies:`);
      inconsistentUsers.forEach(user => {
        const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
        console.log(`   - ${user.email}: Stored $${(user.creditBalanceCents / 100).toFixed(2)} vs Calculated $${(calculatedBalance / 100).toFixed(2)}`);
      });
    } else {
      console.log(`\n✅ All accounts have consistent balances!`);
    }

  } catch (error) {
    console.error('❌ Error checking accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAllAccounts().catch(console.error);
