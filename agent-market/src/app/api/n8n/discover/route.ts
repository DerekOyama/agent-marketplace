import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { discoverN8nWorkflows } from "@/lib/n8n";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { instanceUrl, apiKey } = await req.json();

    if (!instanceUrl || !apiKey) {
      return NextResponse.json(
        { error: "Instance URL and API key are required" },
        { status: 400 }
      );
    }

    // Discover workflows from n8n instance
    const discovery = await discoverN8nWorkflows(instanceUrl, apiKey);

    if (!discovery.success) {
      return NextResponse.json(
        { error: discovery.error },
        { status: 400 }
      );
    }

    // Register discovered workflows as agents
    const registeredAgents = [];
    
    for (const agentData of discovery.agents) {
      try {
        // Check if agent already exists
        const existingAgent = await prisma.agent.findFirst({
          where: {
            n8nWorkflowId: agentData.n8nWorkflowId,
            n8nInstanceUrl: agentData.n8nInstanceUrl,
          },
        });

        if (existingAgent) {
          // Update existing agent
          const updatedAgent = await prisma.agent.update({
            where: { id: existingAgent.id },
            data: {
              name: agentData.name,
              description: agentData.description,
              isActive: agentData.isActive,
              metadata: agentData.metadata,
              pricing: agentData.pricing,
              stats: agentData.stats,
              updatedAt: new Date(),
            },
          });
          registeredAgents.push(updatedAgent);
        } else {
          // Create new agent
          const newAgent = await prisma.agent.create({
            data: {
              name: agentData.name!,
              description: agentData.description,
              quoteUrl: `${agentData.n8nInstanceUrl}/workflow/${agentData.n8nWorkflowId}`,
              runUrl: agentData.webhookUrl || `${agentData.n8nInstanceUrl}/api/v1/executions`,
              token: apiKey,
              type: 'n8n',
              n8nWorkflowId: agentData.n8nWorkflowId,
              n8nInstanceUrl: agentData.n8nInstanceUrl,
              webhookUrl: agentData.webhookUrl,
              triggerType: agentData.triggerType,
              isActive: agentData.isActive,
              metadata: agentData.metadata,
              pricing: agentData.pricing,
              stats: agentData.stats,
            },
          });
          registeredAgents.push(newAgent);
        }
      } catch (error) {
        console.error(`Failed to register agent ${agentData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully discovered and registered ${registeredAgents.length} n8n workflows`,
      agents: registeredAgents,
      totalDiscovered: discovery.totalWorkflows,
      totalRegistered: registeredAgents.length,
    });

  } catch (error) {
    console.error("N8n discovery error:", error);
    return NextResponse.json(
      { 
        error: "Failed to discover n8n workflows",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

