import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUserId } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { agentId, data } = await req.json();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Get the agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.isActive) {
      return NextResponse.json({ error: "Agent is not available" }, { status: 403 });
    }

    // Check if user has sufficient credits
    const executionCostCents = (agent as { pricePerExecutionCents?: number }).pricePerExecutionCents || 0;
    
    // For now, we'll skip credit checking for demo purposes
    // In production, you'd check user credits here

    // Execute the agent based on its type
    let result;
    
    if (agent.type === 'n8n' && agent.webhookUrl) {
      // Prepare the payload for n8n
      // Try the original format that might be expected by the n8n workflow
      const n8nPayload = {
        data: data,
        source: "agent-marketplace",
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending to n8n webhook:', agent.webhookUrl);
      console.log('n8n payload:', JSON.stringify(n8nPayload, null, 2));
      
      // Call n8n webhook
      const response = await fetch(agent.webhookUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "agent-marketplace/1.0"
        },
        body: JSON.stringify(n8nPayload),
      });

      console.log('n8n response status:', response.status);
      
      if (response.ok) {
        result = await response.json();
        console.log('n8n response data:', JSON.stringify(result, null, 2));
      } else {
        const errorText = await response.text();
        console.log('n8n error response:', errorText);
        throw new Error(`Agent execution failed: ${response.status} ${response.statusText}`);
      }
    } else {
      // Handle other agent types
      result = {
        success: true,
        data: { message: "Agent executed successfully", input: data },
        metadata: {
          executionId: `exec_${Date.now()}`,
          timestamp: new Date().toISOString(),
          duration: 100
        }
      };
    }

    // Log the execution
    const executionId = `exec_${Date.now()}`;
    await prisma.agentExecution.create({
      data: {
        agentId: agent.id,
        userId: userId,
        executionId: executionId,
        status: "success",
        duration: 100,
        creditsConsumed: executionCostCents,
        inputData: data,
        outputData: result
      }
    });

    return NextResponse.json({
      success: true,
      result: result,
      agent: {
        id: agent.id,
        name: agent.name
      }
    });

  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Agent execution failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
