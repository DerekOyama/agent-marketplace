#!/usr/bin/env node

/**
 * Check Payouts Script
 * 
 * This script checks if there are any payout records for the derek.oyama@gmail.com user
 * and creates some if they don't exist.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPayouts() {
  console.log('💸 Checking payout data...\n');

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`User ID: ${user.id}`);

    // Check existing payouts
    const existingPayouts = await prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Existing payout records: ${existingPayouts.length}`);
    
    if (existingPayouts.length > 0) {
      console.log('\nExisting payouts:');
      existingPayouts.forEach((payout, i) => {
        console.log(`${i + 1}. Amount: $${payout.amountCents / 100}`);
        console.log(`   Status: ${payout.status}`);
        console.log(`   Description: ${payout.description}`);
        console.log(`   Created: ${payout.createdAt.toLocaleString()}`);
        console.log(`   Processed: ${payout.processedAt?.toLocaleString() || 'Not processed'}`);
        console.log('');
      });
    } else {
      console.log('No payout records found. Creating sample data...');
      
      // Create sample payout records
      const payoutData = [
        {
          id: 'payout_1',
          userId: user.id,
          amountCents: 500, // $5.00
          status: 'completed',
          description: 'Payout Request - Bank Transfer',
          createdAt: new Date('2025-09-23T15:00:00Z'),
          processedAt: new Date('2025-09-23T15:30:00Z')
        },
        {
          id: 'payout_2',
          userId: user.id,
          amountCents: 200, // $2.00
          status: 'pending',
          description: 'Payout Request - PayPal',
          createdAt: new Date('2025-09-23T16:00:00Z'),
          processedAt: null
        },
        {
          id: 'payout_3',
          userId: user.id,
          amountCents: 1000, // $10.00
          status: 'completed',
          description: 'Payout Request - Bank Transfer',
          createdAt: new Date('2025-09-22T10:00:00Z'),
          processedAt: new Date('2025-09-22T10:30:00Z')
        }
      ];

      for (const payout of payoutData) {
        await prisma.payout.create({
          data: payout
        });
      }

      console.log(`✅ Created ${payoutData.length} payout records`);

      // Verify the data
      const newPayouts = await prisma.payout.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      console.log('\n📊 New payout data:');
      newPayouts.forEach((payout, i) => {
        console.log(`${i + 1}. Amount: $${payout.amountCents / 100}`);
        console.log(`   Status: ${payout.status}`);
        console.log(`   Description: ${payout.description}`);
        console.log(`   Created: ${payout.createdAt.toLocaleString()}`);
        console.log(`   Processed: ${payout.processedAt?.toLocaleString() || 'Not processed'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking payouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayouts();
