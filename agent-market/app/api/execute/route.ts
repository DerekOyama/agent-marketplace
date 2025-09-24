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
    const agent = await (prisma as any).agent.findUnique({
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
    
    // Get user's current balance
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { creditBalanceCents: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const balanceBeforeCents = user.creditBalanceCents;
    const balanceAfterCents = balanceBeforeCents - executionCostCents;

    // Check if user has sufficient credits
    if (balanceAfterCents < 0) {
      return NextResponse.json({ 
        error: "insufficient_credits",
        message: "Insufficient credits for this execution",
        requiredCredits: executionCostCents,
        availableCredits: balanceBeforeCents
      }, { status: 400 });
    }

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

    // Only deduct balance and save execution record after successful execution
    // Update user balance
    await (prisma as any).user.update({
      where: { id: userId },
      data: { creditBalanceCents: balanceAfterCents }
    });

    // Save execution record
    const executionId = `exec_${Date.now()}`;
    await (prisma as any).agentExecution.create({
      data: {
        agentId: agent.id,
        userId: userId,
        executionId: executionId,
        status: "success",
        duration: 100,
        creditsConsumed: executionCostCents,
        inputData: data,
        outputData: result,
        balanceBeforeCents: balanceBeforeCents,
        balanceAfterCents: balanceAfterCents
      }
    });

    return NextResponse.json({
      success: true,
      result: result,
      agent: {
        id: agent.id,
        name: agent.name,
        pricePerExecutionCents: executionCostCents
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

