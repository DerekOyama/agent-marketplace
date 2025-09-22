import { PrismaClient } from "@prisma/client";
import { CommonAgentSchemas } from "../types/agent-schemas";

const prisma = new PrismaClient();

async function main() {
  // Create multiple demo agents with different schemas
  
  // 1. N8n webhook agent (generic)
  await prisma.agent.create({
    data: {
      name: "Demo n8n Agent",
      description: "N8n webhook agent for testing with standardized JSON input/output",
      quoteUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      runUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      token: "n8n-webhook-token",
      type: "n8n",
      n8nWorkflowId: "test-agent",
      n8nInstanceUrl: "https://derekoyama.app.n8n.cloud",
      webhookUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
      triggerType: "webhook",
      isActive: true,
      inputSchema: CommonAgentSchemas.webhook.input,
      outputSchema: CommonAgentSchemas.webhook.output,
      metadata: {
        category: "n8n-webhook",
        tags: ["webhook", "n8n", "test"],
        version: "1.0.0",
        author: "derekoyama",
        documentation: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
        inputFormat: "standardized",
        outputFormat: "standardized"
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

  // 2. Text Processing Agent
  await prisma.agent.create({
    data: {
      name: "Text Processor Agent",
      description: "AI-powered text processing agent that can summarize, translate, and analyze text",
      quoteUrl: "https://api.example.com/text-processor/quote",
      runUrl: "https://api.example.com/text-processor/execute",
      token: "text-processor-demo-token",
      type: "legacy",
      triggerType: "manual",
      isActive: true,
      inputSchema: CommonAgentSchemas.textProcessor.input,
      outputSchema: CommonAgentSchemas.textProcessor.output,
      metadata: {
        category: "ai-text",
        tags: ["text", "ai", "nlp", "summarization", "translation"],
        version: "2.1.0",
        author: "AI Labs",
        documentation: "https://docs.example.com/text-processor",
        inputFormat: "standardized",
        outputFormat: "standardized"
      },
      pricing: {
        pricePerExecution: 0.25,
        currency: "USD",
        freeExecutions: 10,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      },
    }
  });

  // 3. Data Analysis Agent
  await prisma.agent.create({
    data: {
      name: "Data Analyzer Agent",
      description: "Advanced data analysis agent for statistical analysis, trend detection, and predictions",
      quoteUrl: "https://api.example.com/data-analyzer/quote",
      runUrl: "https://api.example.com/data-analyzer/execute",
      token: "data-analyzer-demo-token",
      type: "legacy",
      triggerType: "manual",
      isActive: true,
      inputSchema: CommonAgentSchemas.dataAnalyzer.input,
      outputSchema: CommonAgentSchemas.dataAnalyzer.output,
      metadata: {
        category: "data-science",
        tags: ["data", "analytics", "statistics", "ml", "predictions"],
        version: "1.5.2",
        author: "DataCorp",
        documentation: "https://docs.example.com/data-analyzer",
        inputFormat: "standardized",
        outputFormat: "standardized"
      },
      pricing: {
        pricePerExecution: 1.00,
        currency: "USD",
        freeExecutions: 5,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      },
    }
  });

  // 4. Web Scraper Agent
  await prisma.agent.create({
    data: {
      name: "Web Scraper Agent",
      description: "Intelligent web scraping agent with CSS selector support and data extraction",
      quoteUrl: "https://api.example.com/web-scraper/quote",
      runUrl: "https://api.example.com/web-scraper/execute",
      token: "web-scraper-demo-token",
      type: "legacy",
      triggerType: "manual",
      isActive: true,
      inputSchema: CommonAgentSchemas.webScraper.input,
      outputSchema: CommonAgentSchemas.webScraper.output,
      metadata: {
        category: "web-automation",
        tags: ["scraping", "web", "automation", "data-extraction"],
        version: "3.0.1",
        author: "WebTools Inc",
        documentation: "https://docs.example.com/web-scraper",
        inputFormat: "standardized",
        outputFormat: "standardized"
      },
      pricing: {
        pricePerExecution: 0.75,
        currency: "USD",
        freeExecutions: 3,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      },
    }
  });

  console.log("✅ Seeded 4 demo agents with standardized JSON schemas:");
  console.log("  1. Demo n8n Agent (webhook)");
  console.log("  2. Text Processor Agent (AI text processing)");
  console.log("  3. Data Analyzer Agent (data science)");
  console.log("  4. Web Scraper Agent (web automation)");
  console.log("");
  console.log("All agents now use standardized JSON input/output format!");
}

main().finally(()=>prisma.$disconnect());
