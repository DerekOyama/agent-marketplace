import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUserId } from "../../../../../lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log("Delete API called");
    const { id: agentId } = await params;
    console.log("Agent ID:", agentId);
    
    const userId = await getCurrentUserId();
    console.log("User ID:", userId);

    if (!userId) {
      console.log("No user ID, returning 401");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if agent exists
    console.log("Looking up agent...");
    const agent = await (prisma as any).agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, ownerId: true }
    });
    console.log("Agent found:", agent);

    if (!agent) {
      console.log("Agent not found, returning 404");
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if user is admin or owner
    const isAdmin = userId === "derek.oyama@gmail.com"; // Admin check
    console.log("Is admin:", isAdmin, "Owner ID:", agent.ownerId, "User ID:", userId);
    
    if (agent.ownerId !== userId && !isAdmin) {
      console.log("User not authorized, returning 403");
      return NextResponse.json({ error: "Only the agent owner or admin can delete agents" }, { status: 403 });
    }

    // Check for related records (for logging purposes)
    console.log("Checking for related records...");
    const executions = await (prisma as any).agentExecution.findMany({
      where: { agentId: agentId },
      select: { id: true }
    });
    console.log("Related executions:", executions.length);

    const ratings = await (prisma as any).agentRating.findMany({
      where: { agentId: agentId },
      select: { id: true }
    });
    console.log("Related ratings:", ratings.length);

    // Soft delete the agent (mark as deleted, keep all logs and data)
    console.log("Soft deleting agent (marking as deleted)...");
    await (prisma as any).agent.update({
      where: { id: agentId },
      data: { 
        isDeleted: true,
        isActive: false,  // Also deactivate it
        updatedAt: new Date()
      }
    });
    console.log("Agent soft deleted successfully - all logs and data preserved");

    return NextResponse.json({ 
      success: true, 
      message: `Agent "${agent.name}" has been deleted successfully` 
    });

  } catch (error) {
    console.error("Error deleting agent:", error);
    console.error("Error details:", {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: "Failed to delete agent", message: (error as Error).message },
      { status: 500 }
    );
  }
}
