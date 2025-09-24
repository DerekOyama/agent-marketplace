import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUserId } from "../../../../../lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { rating } = await req.json();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if user has already rated this agent
    const existingRating = await prisma.agentRating.findFirst({
      where: {
        agentId: agentId,
        userId: userId
      }
    });

    if (existingRating) {
      // Update existing rating
      await prisma.agentRating.update({
        where: { id: existingRating.id },
        data: { rating: rating }
      });
    } else {
      // Create new rating
      await prisma.agentRating.create({
        data: {
          agentId: agentId,
          userId: userId,
          rating: rating
        }
      });
    }

    // Calculate new average rating
    const allRatings = await prisma.agentRating.findMany({
      where: { agentId: agentId },
      select: { rating: true }
    });

    const newAvgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    // Update agent stats
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        avgRating: newAvgRating,
        stats: {
          ...(agent.stats as Record<string, unknown> || {}),
          avgRating: newAvgRating,
          starRating: newAvgRating
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
      newAvgRating: newAvgRating,
      totalRatings: allRatings.length
    });

  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
