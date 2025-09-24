#!/usr/bin/env node

/**
 * Create User Agents Script
 * 
 * This script creates sample agents for the derek.oyama@gmail.com user
 * with execution data to demonstrate the My Agents functionality.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUserAgents() {
  console.log('🤖 Creating user agents with execution data...\n');

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'derek.oyama@gmail.com' }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`User ID: ${user.id}`);

    // Check if user already has agents
    const existingAgents = await prisma.agent.findMany({
      where: { ownerId: user.id }
    });

    if (existingAgents.length > 0) {
      console.log(`User already has ${existingAgents.length} agents. Adding more...`);
    }

    // Create sample agents for the user
    const agentsData = [
      {
        id: 'user_agent_1',
        name: 'AI Content Writer',
        description: 'Generates high-quality blog posts and articles',
        runUrl: 'https://derekoyama.app.n8n.cloud/webhook/content-writer',
        quoteUrl: 'https://derekoyama.app.n8n.cloud/webhook/content-writer/quote',
        token: 'content-writer-token',
        type: 'n8n',
        n8nWorkflowId: 'content-writer',
        n8nInstanceUrl: 'https://derekoyama.app.n8n.cloud',
        webhookUrl: 'https://derekoyama.app.n8n.cloud/webhook/content-writer',
        triggerType: 'webhook',
        isActive: true,
        metadata: {
          category: 'content-creation',
          tags: ['ai', 'writing', 'content'],
          version: '1.0.0',
          author: 'derekoyama'
        },
        pricing: {
          costPerExecution: 50 // $0.50
        },
        ownerId: user.id
      },
      {
        id: 'user_agent_2',
        name: 'Data Analysis Bot',
        description: 'Analyzes CSV files and generates insights',
        runUrl: 'https://derekoyama.app.n8n.cloud/webhook/data-analysis',
        quoteUrl: 'https://derekoyama.app.n8n.cloud/webhook/data-analysis/quote',
        token: 'data-analysis-token',
        type: 'n8n',
        n8nWorkflowId: 'data-analysis',
        n8nInstanceUrl: 'https://derekoyama.app.n8n.cloud',
        webhookUrl: 'https://derekoyama.app.n8n.cloud/webhook/data-analysis',
        triggerType: 'webhook',
        isActive: true,
        metadata: {
          category: 'data-analysis',
          tags: ['data', 'analysis', 'csv'],
          version: '1.2.0',
          author: 'derekoyama'
        },
        pricing: {
          costPerExecution: 75 // $0.75
        },
        ownerId: user.id
      },
      {
        id: 'user_agent_3',
        name: 'Email Marketing Assistant',
        description: 'Creates personalized email campaigns',
        runUrl: 'https://derekoyama.app.n8n.cloud/webhook/email-marketing',
        quoteUrl: 'https://derekoyama.app.n8n.cloud/webhook/email-marketing/quote',
        token: 'email-marketing-token',
        type: 'n8n',
        n8nWorkflowId: 'email-marketing',
        n8nInstanceUrl: 'https://derekoyama.app.n8n.cloud',
        webhookUrl: 'https://derekoyama.app.n8n.cloud/webhook/email-marketing',
        triggerType: 'webhook',
        isActive: false, // Inactive agent
        metadata: {
          category: 'marketing',
          tags: ['email', 'marketing', 'campaigns'],
          version: '0.9.0',
          author: 'derekoyama'
        },
        pricing: {
          costPerExecution: 100 // $1.00
        },
        ownerId: user.id
      }
    ];

    // Create agents
    for (const agentData of agentsData) {
      await prisma.agent.upsert({
        where: { id: agentData.id },
        update: agentData,
        create: agentData
      });
    }

    console.log(`✅ Created/updated ${agentsData.length} agents`);

    // Create sample executions for the active agents
    const activeAgents = agentsData.filter(agent => agent.isActive);
    
    for (const agent of activeAgents) {
      // Create 5-15 executions per agent
      const executionCount = Math.floor(Math.random() * 11) + 5;
      const executions = [];
      
      for (let i = 0; i < executionCount; i++) {
        const executionDate = new Date();
        executionDate.setDate(executionDate.getDate() - Math.floor(Math.random() * 30)); // Random date within last 30 days
        
        executions.push({
          id: `exec_${agent.id}_${i}`,
          agentId: agent.id,
          userId: user.id, // The user who executed the agent
          executionId: `exec_${agent.id}_${i}_${Date.now()}`,
          status: Math.random() > 0.1 ? 'success' : 'failed', // 90% success rate
          duration: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
          creditsConsumed: agent.pricing.costPerExecution,
          httpStatus: 200,
          inputSize: 100,
          outputSize: 200,
          inputType: 'json',
          outputType: 'json',
          responseTime: Math.floor(Math.random() * 1000) + 500,
          processingTime: Math.floor(Math.random() * 3000) + 1000,
          startedAt: executionDate,
          completedAt: new Date(executionDate.getTime() + Math.floor(Math.random() * 5000) + 1000),
          createdAt: executionDate
        });
      }

      // Create executions
      for (const execution of executions) {
        await prisma.agentExecution.upsert({
          where: { id: execution.id },
          update: execution,
          create: execution
        });
      }

      console.log(`✅ Created ${executions.length} executions for ${agent.name}`);
    }

    // Verify the data
    const userAgents = await prisma.agent.findMany({
      where: { ownerId: user.id },
      include: {
        executions: {
          where: { status: 'success' }
        }
      }
    });

    console.log('\n📊 User Agents Summary:');
    userAgents.forEach((agent, i) => {
      const totalRevenue = agent.executions.reduce((sum, exec) => sum + exec.creditsConsumed, 0);
      const platformFee = Math.floor((totalRevenue * 10) / 100);
      const creatorEarnings = totalRevenue - platformFee;
      
      console.log(`${i + 1}. ${agent.name}`);
      console.log(`   Status: ${agent.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Executions: ${agent.executions.length}`);
      console.log(`   Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
      console.log(`   Platform Fee (10%): $${(platformFee / 100).toFixed(2)}`);
      console.log(`   Your Earnings (90%): $${(creatorEarnings / 100).toFixed(2)}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error creating user agents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserAgents();
