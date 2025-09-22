require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyNewTables() {
  try {
    console.log('🔍 Verifying new tables...\n');

    // Check AgentExecution table
    console.log('📊 AgentExecution table:');
    const executions = await prisma.agentExecution.findMany({ take: 1 });
    console.log(`   Found ${executions.length} executions (table exists)`);

    // Check AgentMetrics table
    console.log('📈 AgentMetrics table:');
    const metrics = await prisma.agentMetrics.findMany({ take: 1 });
    console.log(`   Found ${metrics.length} metrics records (table exists)`);

    // Check AgentLog table
    console.log('📝 AgentLog table:');
    const logs = await prisma.agentLog.findMany({ take: 1 });
    console.log(`   Found ${logs.length} log entries (table exists)`);

    // Check UserAgentInteraction table
    console.log('👥 UserAgentInteraction table:');
    const interactions = await prisma.userAgentInteraction.findMany({ take: 1 });
    console.log(`   Found ${interactions.length} user interactions (table exists)`);

    // Check Agent table new fields
    console.log('\n🤖 Agent table new fields:');
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        totalExecutions: true,
        totalUsers: true,
        avgRating: true,
        lastExecutedAt: true
      },
      take: 1
    });
    
    if (agents.length > 0) {
      const agent = agents[0];
      console.log(`   Agent: ${agent.name}`);
      console.log(`   - totalExecutions: ${agent.totalExecutions}`);
      console.log(`   - totalUsers: ${agent.totalUsers}`);
      console.log(`   - avgRating: ${agent.avgRating}`);
      console.log(`   - lastExecutedAt: ${agent.lastExecutedAt}`);
    }

    console.log('\n✅ All new tables and fields verified successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyNewTables();
