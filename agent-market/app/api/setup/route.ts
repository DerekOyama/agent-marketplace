import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST() {
  try {
    console.log("🚀 Starting database setup...");

    // Check if agents already exist
    const existingAgents = await (prisma as any).agent.count();
    if (existingAgents > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already has ${existingAgents} agents. Skipping setup.`,
        agents: existingAgents
      });
    }

    console.log("📝 Creating demo agents...");

    // Create the 4 demo agents
    const agents = [];

    // 1. N8n webhook agent
    const webhookAgent = await (prisma as any).agent.create({
      data: {
        name: "Demo n8n Agent",
        description: "AI Agent for testing with standardized JSON input/output",
        quoteUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
        runUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
        token: "n8n-webhook-token",
        type: "n8n",
        n8nWorkflowId: "test-agent",
        n8nInstanceUrl: "https://derekoyama.app.n8n.cloud",
        webhookUrl: "https://derekoyama.app.n8n.cloud/webhook/test-agent",
        triggerType: "webhook",
        isActive: true,
        // inputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.webhook.input)),
        // outputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.webhook.output)),
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
    agents.push(webhookAgent);

    // 2. Text Processing Agent
    const textAgent = await (prisma as any).agent.create({
      data: {
        name: "Text Processor Agent",
        description: "AI-powered text processing agent that can summarize, translate, and analyze text",
        quoteUrl: "https://api.example.com/text-processor/quote",
        runUrl: "https://api.example.com/text-processor/execute",
        token: "text-processor-demo-token",
        type: "legacy",
        triggerType: "manual",
        isActive: true,
        // inputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.textProcessor.input)),
        // outputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.textProcessor.output)),
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
    agents.push(textAgent);

    // 3. Data Analysis Agent
    const dataAgent = await (prisma as any).agent.create({
      data: {
        name: "Data Analyzer Agent",
        description: "Advanced data analysis agent for statistical analysis, trend detection, and predictions",
        quoteUrl: "https://api.example.com/data-analyzer/quote",
        runUrl: "https://api.example.com/data-analyzer/execute",
        token: "data-analyzer-demo-token",
        type: "legacy",
        triggerType: "manual",
        isActive: true,
        // inputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.dataAnalyzer.input)),
        // outputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.dataAnalyzer.output)),
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
    agents.push(dataAgent);

    // 4. Web Scraper Agent
    const scraperAgent = await (prisma as any).agent.create({
      data: {
        name: "Web Scraper Agent",
        description: "Intelligent web scraping agent with CSS selector support and data extraction",
        quoteUrl: "https://api.example.com/web-scraper/quote",
        runUrl: "https://api.example.com/web-scraper/execute",
        token: "web-scraper-demo-token",
        type: "legacy",
        triggerType: "manual",
        isActive: true,
        // inputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.webScraper.input)),
        // outputSchema: JSON.parse(JSON.stringify(CommonAgentSchemas.webScraper.output)),
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
    agents.push(scraperAgent);

    console.log("✅ Successfully created all demo agents");

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully!",
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        category: (agent.metadata as Record<string, unknown>)?.category as string
      })),
      totalCreated: agents.length
    });

  } catch (error) {
    console.error("❌ Setup failed:", error);
    return NextResponse.json({
      success: false,
      error: "Setup failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const agentCount = await (prisma as any).agent.count();
    const agents = await (prisma as any).agent.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        metadata: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Found ${agentCount} agents in database`,
      agents: agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        isActive: agent.isActive,
        category: (agent.metadata as Record<string, unknown>)?.category as string
      })),
      total: agentCount
    });

  } catch (error) {
    console.error("❌ Status check failed:", error);
    return NextResponse.json({
      success: false,
      error: "Status check failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

