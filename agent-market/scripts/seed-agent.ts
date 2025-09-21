import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.agent.create({
    data: {
      name: "Demo n8n Agent",
      description: "N8n webhook agent for testing",
      quoteUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      runUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      token: "n8n-webhook-token",
      type: "n8n",
      n8nWorkflowId: "test-agent",
      n8nInstanceUrl: "https://derekoyama.app.n8n.cloud",
      webhookUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      triggerType: "webhook",
      isActive: true,
      metadata: {
        category: "n8n-webhook",
        tags: ["webhook", "n8n", "test"],
        version: "1.0.0",
        author: "derekoyama",
        documentation: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      },
      pricing: {
        pricePerExecution: 0.50,
        currency: "USD",
        freeExecutions: 0,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      },
    }
  });
  console.log("Seeded demo agent with webhook URL: https://derekoyama.app.n8n.cloud/webhook/test-agent");
}

main().finally(()=>prisma.$disconnect());
