#!/usr/bin/env node

/**
 * Check Earnings Script
 * 
 * This script checks if there are any earnings records for the derek.oyama@gmail.com user
 * and creates some if they don't exist.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEarnings() {
  console.log('💰 Checking earnings data...\n');

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`User ID: ${user.id}`);

    // Check existing earnings
    const existingEarnings = await prisma.agentEarnings.findMany({
      where: { userId: user.id },
      include: {
        agent: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`Existing earnings records: ${existingEarnings.length}`);
    
    if (existingEarnings.length > 0) {
      console.log('\nExisting earnings:');
      existingEarnings.forEach((earning, i) => {
        console.log(`${i + 1}. Agent: ${earning.agent.name}`);
        console.log(`   Total Earnings: $${earning.totalEarningsCents / 100}`);
        console.log(`   Pending: $${earning.pendingEarningsCents / 100}`);
        console.log(`   Paid Out: $${earning.paidOutCents / 100}`);
        console.log(`   Executions: ${earning.totalExecutions}`);
        console.log('');
      });
    } else {
      console.log('No earnings records found. Creating sample data...');
      
      // Get some agents to create earnings for
      const agents = await prisma.agent.findMany({
        take: 3,
        select: { id: true, name: true }
      });

      if (agents.length === 0) {
        console.log('No agents found. Creating sample agents first...');
        
        // Create sample agents
        const sampleAgents = [
          {
            id: 'agent_bb',
            name: 'Bbb Agent',
            description: 'Sample agent for testing',
            runUrl: 'https://example.com/run',
            quoteUrl: 'https://example.com/quote',
            token: 'test-token',
            type: 'test'
          },
          {
            id: 'agent_aa',
            name: 'Aa Agent', 
            description: 'Sample agent for testing',
            runUrl: 'https://example.com/run',
            quoteUrl: 'https://example.com/quote',
            token: 'test-token',
            type: 'test'
          },
          {
            id: 'agent_demo',
            name: 'Demo N8n Agent',
            description: 'Sample agent for testing',
            runUrl: 'https://example.com/run',
            quoteUrl: 'https://example.com/quote',
            token: 'test-token',
            type: 'test'
          }
        ];

        for (const agent of sampleAgents) {
          await prisma.agent.create({
            data: agent
          });
        }

        console.log('Created sample agents');
      }

      // Get agents again
      const agentsForEarnings = await prisma.agent.findMany({
        take: 3,
        select: { id: true, name: true }
      });

      // Create earnings records
      const earningsData = [
        {
          agentId: agentsForEarnings[0].id,
          userId: user.id,
          totalEarningsCents: 1500, // $15.00
          pendingEarningsCents: 1000, // $10.00
          paidOutCents: 500, // $5.00
          totalExecutions: 15,
          lastEarningAt: new Date('2025-09-23T14:00:00Z')
        },
        {
          agentId: agentsForEarnings[1].id,
          userId: user.id,
          totalEarningsCents: 800, // $8.00
          pendingEarningsCents: 600, // $6.00
          paidOutCents: 200, // $2.00
          totalExecutions: 8,
          lastEarningAt: new Date('2025-09-23T13:30:00Z')
        },
        {
          agentId: agentsForEarnings[2].id,
          userId: user.id,
          totalEarningsCents: 2000, // $20.00
          pendingEarningsCents: 1500, // $15.00
          paidOutCents: 500, // $5.00
          totalExecutions: 20,
          lastEarningAt: new Date('2025-09-23T12:00:00Z')
        }
      ];

      for (const earning of earningsData) {
        await prisma.agentEarnings.create({
          data: earning
        });
      }

      console.log(`✅ Created ${earningsData.length} earnings records`);

      // Verify the data
      const newEarnings = await prisma.agentEarnings.findMany({
        where: { userId: user.id },
        include: {
          agent: {
            select: { id: true, name: true }
          }
        }
      });

      console.log('\n📊 New earnings data:');
      newEarnings.forEach((earning, i) => {
        console.log(`${i + 1}. Agent: ${earning.agent.name}`);
        console.log(`   Total Earnings: $${earning.totalEarningsCents / 100}`);
        console.log(`   Pending: $${earning.pendingEarningsCents / 100}`);
        console.log(`   Paid Out: $${earning.paidOutCents / 100}`);
        console.log(`   Executions: ${earning.totalExecutions}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking earnings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEarnings();
