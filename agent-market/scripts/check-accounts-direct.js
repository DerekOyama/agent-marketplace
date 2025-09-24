#!/usr/bin/env node

/**
 * Check All Accounts Script - Direct Database Query
 * 
 * This script directly queries the database to check all user accounts
 * without using the Prisma client.
 */

const { Client } = require('pg');

async function checkAllAccountsDirect() {
  console.log('👥 Checking all user accounts (direct database query)...\n');

  const client = new Client({
    connectionString: process.env.POSTGRES_PRISMA_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all users
    const usersResult = await client.query(`
      SELECT 
        id, 
        email, 
        "creditBalanceCents", 
        "createdAt"
      FROM "User" 
      ORDER BY "createdAt" ASC
    `);

    console.log(`Found ${usersResult.rows.length} user accounts:\n`);

    for (const user of usersResult.rows) {
      // Get transactions for this user
      const transactionsResult = await client.query(`
        SELECT 
          "amountCents",
          type,
          description,
          "createdAt"
        FROM "CreditTransaction" 
        WHERE "userId" = $1 
        ORDER BY "createdAt" DESC
      `, [user.id]);

      // Calculate balance from transactions
      const calculatedBalance = transactionsResult.rows.reduce((sum, tx) => sum + tx.amountCents, 0);
      const balanceConsistent = user.creditBalanceCents === calculatedBalance;
      
      console.log(`📧 Account: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Stored Balance: $${(user.creditBalanceCents / 100).toFixed(2)}`);
      console.log(`   Calculated Balance: $${(calculatedBalance / 100).toFixed(2)}`);
      console.log(`   Balance Consistent: ${balanceConsistent ? '✅' : '❌'}`);
      console.log(`   Account Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log(`   Total Transactions: ${transactionsResult.rows.length}`);
      
      // Show recent transactions
      if (transactionsResult.rows.length > 0) {
        console.log(`   Recent Transactions:`);
        transactionsResult.rows.slice(0, 3).forEach((tx, index) => {
          const amount = tx.amountCents > 0 ? `+$${(tx.amountCents / 100).toFixed(2)}` : `$${(tx.amountCents / 100).toFixed(2)}`;
          console.log(`     ${index + 1}. ${tx.description} - ${amount} (${tx.type})`);
        });
      }
      console.log('');
    }

    // Summary
    const totalBalance = usersResult.rows.reduce((sum, user) => sum + user.creditBalanceCents, 0);
    
    console.log('📊 System Summary:');
    console.log(`   Total Users: ${usersResult.rows.length}`);
    console.log(`   Total System Balance: $${(totalBalance / 100).toFixed(2)}`);
    
    // Check for inconsistencies
    const inconsistentUsers = [];
    for (const user of usersResult.rows) {
      const transactionsResult = await client.query(`
        SELECT "amountCents" FROM "CreditTransaction" WHERE "userId" = $1
      `, [user.id]);
      
      const calculatedBalance = transactionsResult.rows.reduce((sum, tx) => sum + tx.amountCents, 0);
      if (user.creditBalanceCents !== calculatedBalance) {
        inconsistentUsers.push({
          email: user.email,
          storedBalance: user.creditBalanceCents,
          calculatedBalance,
          difference: user.creditBalanceCents - calculatedBalance
        });
      }
    }
    
    if (inconsistentUsers.length > 0) {
      console.log(`\n⚠️  Found ${inconsistentUsers.length} accounts with balance inconsistencies:`);
      inconsistentUsers.forEach(user => {
        console.log(`   - ${user.email}: Stored $${(user.storedBalance / 100).toFixed(2)} vs Calculated $${(user.calculatedBalance / 100).toFixed(2)} (Diff: $${(user.difference / 100).toFixed(2)})`);
      });
    } else {
      console.log(`\n✅ All accounts have consistent balances!`);
    }

  } catch (error) {
    console.error('❌ Error checking accounts:', error);
  } finally {
    await client.end();
  }
}

// Run the check
checkAllAccountsDirect().catch(console.error);
