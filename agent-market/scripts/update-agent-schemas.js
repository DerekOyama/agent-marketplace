require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { CommonAgentSchemas } = require('../dist/types/agent-schemas');

async function updateAgentSchemas() {
  console.log('🔧 Updating agent schemas...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    
    // Get all agents
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, type: true, metadata: true, inputSchema: true, outputSchema: true }
    });
    
    console.log(`📊 Found ${agents.length} agents to update`);
    
    for (const agent of agents) {
      console.log(`\n🔧 Updating agent: ${agent.name} (${agent.id})`);
      
      let inputSchema = agent.inputSchema;
      let outputSchema = agent.outputSchema;
      
      // If agent doesn't have schemas, assign based on type or metadata
      if (!inputSchema || !outputSchema) {
        const metadata = agent.metadata || {};
        const category = metadata.category || 'webhook';
        
        console.log(`   📝 Category: ${category}`);
        
        // Assign schema based on category
        switch (category) {
          case 'text-processing':
          case 'textProcessor':
            inputSchema = CommonAgentSchemas.textProcessor.input;
            outputSchema = CommonAgentSchemas.textProcessor.output;
            console.log('   ✅ Assigned text processor schema');
            break;
          case 'data-analysis':
          case 'dataAnalyzer':
            inputSchema = CommonAgentSchemas.dataAnalyzer.input;
            outputSchema = CommonAgentSchemas.dataAnalyzer.output;
            console.log('   ✅ Assigned data analyzer schema');
            break;
          case 'web-scraping':
          case 'webScraper':
            inputSchema = CommonAgentSchemas.webScraper.input;
            outputSchema = CommonAgentSchemas.webScraper.output;
            console.log('   ✅ Assigned web scraper schema');
            break;
          default:
            inputSchema = CommonAgentSchemas.webhook.input;
            outputSchema = CommonAgentSchemas.webhook.output;
            console.log('   ✅ Assigned webhook schema');
        }
        
        // Update the agent
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            inputSchema: inputSchema,
            outputSchema: outputSchema
          }
        });
        
        console.log('   ✅ Schema updated successfully');
      } else {
        console.log('   ⏭️ Agent already has schemas, skipping');
      }
    }
    
    // Verify updates
    console.log('\n🔍 Verifying schema updates...');
    const updatedAgents = await prisma.agent.findMany({
      select: { id: true, name: true, inputSchema: true, outputSchema: true }
    });
    
    const agentsWithSchemas = updatedAgents.filter(agent => agent.inputSchema && agent.outputSchema);
    console.log(`✅ ${agentsWithSchemas.length}/${updatedAgents.length} agents now have schemas`);
    
    agentsWithSchemas.forEach(agent => {
      const inputProps = agent.inputSchema?.properties ? Object.keys(agent.inputSchema.properties) : [];
      const outputProps = agent.outputSchema?.properties ? Object.keys(agent.outputSchema.properties) : [];
      console.log(`   📋 ${agent.name}: ${inputProps.length} input props, ${outputProps.length} output props`);
    });
    
    await prisma.$disconnect();
    console.log('\n🎉 Agent schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

updateAgentSchemas();
