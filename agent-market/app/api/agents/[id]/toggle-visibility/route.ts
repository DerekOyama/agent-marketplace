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

    // Get the current agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Toggle the hidden status
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: { isHidden: !agent.isHidden }
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        isHidden: updatedAgent.isHidden
      },
      message: updatedAgent.isHidden ? "Agent hidden successfully" : "Agent unhidden successfully"
    });

  } catch (error) {
    console.error("Toggle visibility error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to toggle agent visibility",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
