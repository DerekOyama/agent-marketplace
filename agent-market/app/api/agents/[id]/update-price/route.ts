import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUserId } from "../../../../../lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const { pricePerExecutionCents } = await req.json();

    if (pricePerExecutionCents === undefined || pricePerExecutionCents === null) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    if (typeof pricePerExecutionCents !== 'number' || pricePerExecutionCents < 0) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
    }

    // Get the current agent
    const agent = await (prisma as any).agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update the agent price
    const updatedAgent = await (prisma as any).agent.update({
      where: { id: agentId },
      data: { pricePerExecutionCents: Math.round(pricePerExecutionCents) }
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        pricePerExecutionCents: updatedAgent.pricePerExecutionCents
      },
      message: `Price updated to $${((updatedAgent.pricePerExecutionCents || 0) / 100).toFixed(2)} per execution`
    });

  } catch (error) {
    console.error("Update price error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to update agent price",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
