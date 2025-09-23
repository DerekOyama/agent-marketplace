const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAgentDescriptions() {
  try {
    console.log('Updating agent descriptions...');
    
    // Update all agents that have n8n webhook URLs in their descriptions
    const agents = await prisma.agent.findMany({
      where: {
        description: {
          contains: 'N8n webhook agent'
        }
      }
    });

    console.log(`Found ${agents.length} agents to update`);

    for (const agent of agents) {
      // Extract just the input requirements part after the URL
      const match = agent.description.match(/N8n webhook agent: .*? - (.+)/);
      const newDescription = match ? `AI Agent: ${match[1]}` : 'AI Agent';
      
      await prisma.agent.update({
        where: { id: agent.id },
        data: { description: newDescription }
      });
      
      console.log(`Updated agent ${agent.name}: "${agent.description}" -> "${newDescription}"`);
    }

    console.log('✅ All agent descriptions updated successfully!');
  } catch (error) {
    console.error('❌ Error updating agent descriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAgentDescriptions();
