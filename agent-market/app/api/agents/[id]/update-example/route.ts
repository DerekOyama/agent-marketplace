import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUserId } from "../../../../../lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { exampleInput, exampleOutput } = await req.json();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    if (!exampleInput || !exampleOutput) {
      return NextResponse.json({ error: "Example input and output are required" }, { status: 400 });
    }

    // Check if agent exists
    const agent = await (prisma as any).agent.findUnique({
      where: { id: agentId },
      select: { id: true, ownerId: true }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if user is the owner or admin
    const isAdmin = userId === "derek.oyama@gmail.com";
    if (agent.ownerId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Only the agent owner or admin can update examples" }, { status: 403 });
    }

    // Update agent with new examples
    const updatedAgent = await (prisma as any).agent.update({
      where: { id: agentId },
      data: {
        exampleInput: exampleInput,
        exampleOutput: exampleOutput
      },
      select: {
        id: true,
        name: true,
        exampleInput: true,
        exampleOutput: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "Example updated successfully",
      agent: updatedAgent
    });

  } catch (error) {
    console.error("Error updating agent example:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
