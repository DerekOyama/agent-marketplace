import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUserId } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { webhookUrl, name, inputRequirements, pricePerExecutionCents, exampleInput, exampleOutput } = await req.json();

    console.log('Registering webhook as agent:', { webhookUrl, name, inputRequirements, pricePerExecutionCents });

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 }
      );
    }

    if (!inputRequirements || !inputRequirements.trim()) {
      return NextResponse.json(
        { error: "Input requirements are required" },
        { status: 400 }
      );
    }

    if (!pricePerExecutionCents || pricePerExecutionCents < 0) {
      return NextResponse.json(
        { error: "Valid price per execution is required" },
        { status: 400 }
      );
    }

    if (!exampleInput || !exampleInput.trim()) {
      return NextResponse.json(
        { error: "Example input is required" },
        { status: 400 }
      );
    }

    if (!exampleOutput || !exampleOutput.trim()) {
      return NextResponse.json(
        { error: "Example output is required" },
        { status: 400 }
      );
    }

    // Create a new agent based on the webhook
    const agent = await (prisma as any).agent.create({
      data: {
        name: name.trim(),
        description: `AI Agent: ${inputRequirements.trim()}`,
        quoteUrl: webhookUrl, // Use webhook URL as quote URL
        runUrl: webhookUrl,   // Use webhook URL as run URL
        token: "n8n-webhook-token", // Generate a token for n8n agents
        type: "n8n",
        n8nWorkflowId: "webhook-agent",
        n8nInstanceUrl: webhookUrl.split('/webhook')[0],
        webhookUrl: webhookUrl,
        triggerType: "webhook",
        isActive: true,
        inputRequirements: inputRequirements.trim(),
        pricePerExecutionCents: pricePerExecutionCents,
        exampleInput: exampleInput.trim(),
        exampleOutput: exampleOutput.trim(),
        metadata: {
          category: "n8n-webhook",
          tags: ["webhook", "n8n"],
          version: "1.0.0",
          author: "n8n",
          documentation: webhookUrl,
          inputFormat: "standardized",
          outputFormat: "standardized",
          inputRequirements: inputRequirements.trim(),
          pricePerExecutionCents: pricePerExecutionCents,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        },
        pricing: {
          pricePerExecution: pricePerExecutionCents / 100, // Convert back to dollars for display
          currency: "USD",
          freeExecutions: 0, // No free executions for paid agents
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
