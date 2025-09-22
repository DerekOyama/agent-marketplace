import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { 
        id: true, 
        name: true, 
        stats: true,
        totalExecutions: true,
        avgRating: true,
        totalUsers: true,
        lastExecutedAt: true
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get real-time execution statistics
    const executionStats = await prisma.agentExecution.aggregate({
      where: { agentId },
      _count: { id: true },
      _avg: { duration: true },
      _min: { duration: true },
      _max: { duration: true }
    });

    const successfulExecutions = await prisma.agentExecution.count({
      where: { agentId, status: 'success' }
    });

    const failedExecutions = await prisma.agentExecution.count({
      where: { agentId, status: { in: ['failed', 'error', 'timeout'] } }
    });

    // Get user interaction stats
    const uniqueUsers = await prisma.userAgentInteraction.count({
      where: { agentId }
    });

    const repeatUsers = await prisma.userAgentInteraction.count({
      where: { agentId, totalExecutions: { gt: 1 } }
    });

    // Get rating stats
    const ratingStats = await prisma.userAgentInteraction.aggregate({
      where: { agentId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true }
    });

    // Calculate real-time stats
    const totalExecutions = executionStats._count.id;
    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;
    const failureRate = totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0;
    const repeatClientRate = uniqueUsers > 0 ? Math.min(Math.round((repeatUsers / uniqueUsers) * 100), 100) : 0;

    const realTimeStats = {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      failureRate,
      averageExecutionTime: Math.round(executionStats._avg.duration || 0),
      minExecutionTime: executionStats._min.duration || 0,
      maxExecutionTime: executionStats._max.duration || 0,
      uniqueUsers,
      repeatUsers,
      repeatClientRate,
      averageRating: ratingStats._avg.rating || 0,
      totalRatings: ratingStats._count.rating,
      lastExecutedAt: agent.lastExecutedAt,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      stats: realTimeStats,
      // Include legacy stats for backward compatibility
      legacyStats: agent.stats
    });

  } catch (error) {
    console.error('Agent stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch agent stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
