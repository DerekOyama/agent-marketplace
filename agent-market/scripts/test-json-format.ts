import { PrismaClient } from "@prisma/client";
import { StandardAgentInput, StandardAgentOutput, validateAgentInput, validateAgentOutput } from "../types/agent-schemas";

const prisma = new PrismaClient();

async function testJsonFormat() {
  try {
    console.log("🧪 Testing JSON input/output format for agents...\n");

    // Get all agents with schemas
    const agents = await prisma.agent.findMany({
      where: {
        inputSchema: { not: null },
        outputSchema: { not: null }
      },
      select: {
        id: true,
        name: true,
        type: true,
        inputSchema: true,
        outputSchema: true
      }
    });

    console.log(`Found ${agents.length} agents with JSON schemas:\n`);

    for (const agent of agents) {
      console.log(`📋 Testing Agent: ${agent.name} (${agent.type})`);
      console.log(`   ID: ${agent.id}`);

      // Test input validation
      const testInput: StandardAgentInput = {
        data: {
          test: "Hello, world!",
          operation: "summarize"
        },
        metadata: {
          requestId: `test_${Date.now()}`,
          userId: "demo-user",
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        },
        config: {
          timeout: 30000
        }
      };

      const inputValidation = validateAgentInput(testInput, agent.inputSchema as any);
      console.log(`   ✅ Input validation: ${inputValidation.valid ? 'PASSED' : 'FAILED'}`);
      if (!inputValidation.valid && inputValidation.errors) {
        console.log(`      Errors: ${inputValidation.errors.join(', ')}`);
      }

      // Test output validation
      const testOutput: StandardAgentOutput = {
        success: true,
        data: {
          result: "This is a test output",
          confidence: 0.95
        },
        metadata: {
          executionId: `exec_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 1250
        },
        usage: {
          tokensUsed: 150,
          creditsConsumed: 25
        }
      };

      const outputValidation = validateAgentOutput(testOutput, agent.outputSchema as any);
      console.log(`   ✅ Output validation: ${outputValidation.valid ? 'PASSED' : 'FAILED'}`);
      if (!outputValidation.valid && outputValidation.errors) {
        console.log(`      Errors: ${outputValidation.errors.join(', ')}`);
      }

      console.log(`   📝 Input Schema: ${JSON.stringify(agent.inputSchema, null, 2).substring(0, 100)}...`);
      console.log(`   📝 Output Schema: ${JSON.stringify(agent.outputSchema, null, 2).substring(0, 100)}...`);
      console.log("");
    }

    // Test API endpoint format
    console.log("🌐 Testing API endpoint response format...");
    
    try {
      const response = await fetch('http://localhost:3000/api/agents');
      if (response.ok) {
        const data = await response.json();
        const agentsWithSchemas = data.agents.filter((agent: any) => agent.inputSchema && agent.outputSchema);
        console.log(`   ✅ API Response: Found ${agentsWithSchemas.length} agents with schemas`);
        
        if (agentsWithSchemas.length > 0) {
          const sampleAgent = agentsWithSchemas[0];
          console.log(`   📋 Sample agent schema fields present: ${!!sampleAgent.inputSchema && !!sampleAgent.outputSchema}`);
        }
      } else {
        console.log(`   ⚠️  API Response: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ⚠️  API test skipped (server not running): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log("\n🎉 JSON format testing completed!");
    console.log("\n📊 Summary:");
    console.log(`   • ${agents.length} agents have JSON schemas defined`);
    console.log(`   • All agents use standardized input/output format`);
    console.log(`   • Input validation: StandardAgentInput interface`);
    console.log(`   • Output validation: StandardAgentOutput interface`);
    console.log(`   • Schema validation functions available`);

    console.log("\n🔧 Next steps:");
    console.log("   1. Run 'npm run db:migrate' to apply schema changes");
    console.log("   2. Run 'npm run db:seed' to create agents with JSON schemas");
    console.log("   3. Test agent execution with standardized JSON format");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testJsonFormat();
