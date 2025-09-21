import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl, name } = await req.json();

    console.log('Registering webhook as agent:', { webhookUrl, name });

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Create a new agent based on the webhook
    const agent = await prisma.agent.create({
      data: {
        name: name || "N8n Webhook Agent",
        description: `N8n webhook agent: ${webhookUrl}`,
        quoteUrl: webhookUrl, // Use webhook URL as quote URL
        runUrl: webhookUrl,   // Use webhook URL as run URL
        token: "n8n-webhook-token", // Generate a token for n8n agents
        type: "n8n",
        n8nWorkflowId: "webhook-agent",
        n8nInstanceUrl: webhookUrl.split('/webhook')[0],
        webhookUrl: webhookUrl,
        triggerType: "webhook",
        isActive: true,
        metadata: {
          category: "n8n-webhook",
          tags: ["webhook", "n8n"],
          version: "1.0.0",
          author: "n8n",
          documentation: webhookUrl,
        },
        pricing: {
          pricePerExecution: 0.01,
          currency: "USD",
          freeExecutions: 100,
        },
        stats: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
        },
      },
    });

    console.log('Created agent:', agent.id);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        webhookUrl: agent.webhookUrl,
      },
      totalRegistered: 1,
    });

  } catch (error) {
    console.error("Webhook registration error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to register webhook as agent",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
