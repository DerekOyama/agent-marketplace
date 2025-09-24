import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUserId } from "../../../../../lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: agentId } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, ownerId: true }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if user is admin or owner
    const isAdmin = userId === "derek.oyama@gmail.com"; // Admin check
    if (agent.ownerId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Only the agent owner or admin can delete agents" }, { status: 403 });
    }

    // Delete the agent (this will cascade delete related records)
    await prisma.agent.delete({
      where: { id: agentId }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Agent "${agent.name}" has been deleted successfully` 
    });

  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent", message: (error as Error).message },
      { status: 500 }
    );
  }
}
