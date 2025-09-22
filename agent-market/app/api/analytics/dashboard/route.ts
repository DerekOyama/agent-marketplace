import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    // Get overview metrics
    const overview = await prisma.agentMetrics.aggregate({
      _sum: {
        totalExecutions: true,
        successfulExecutions: true,
        totalCreditsConsumed: true
      },
      _avg: {
        avgDuration: true
      }
    });

    // Get total agents count
    const totalAgents = await prisma.agent.count();
    const activeAgents = await prisma.agent.count({ 
      where: { isActive: true } 
    });

    // Calculate success rate
    const totalExecutions = overview._sum.totalExecutions || 0;
    const successfulExecutions = overview._sum.successfulExecutions || 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) : 0;

    // Get top agents by execution count
    const topAgents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        totalExecutions: true,
        avgRating: true,
        type: true
      },
      orderBy: { totalExecutions: 'desc' },
      take: 10
    });

    // Get recent activity (last 20 executions)
    const recentActivity = await prisma.agentExecution.findMany({
      include: {
        agent: { 
          select: { 
            name: true,
            type: true
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Get error distribution
    const errorDistribution = await prisma.agentExecution.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
      where: {
        status: { not: 'success' }
      }
    });

    // Get daily execution trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyTrends = await prisma.agentMetrics.findMany({
      where: {
        date: {
          gte: sevenDaysAgo
        },
        hour: null // Only daily records
      },
      select: {
        date: true,
        totalExecutions: true,
        successfulExecutions: true
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({
      overview: {
        totalAgents,
        activeAgents,
        totalExecutions,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(overview._avg.avgDuration || 0),
        totalCreditsConsumed: overview._sum.totalCreditsConsumed || 0
      },
      topAgents: topAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        executions: agent.totalExecutions,
        avgRating: agent.avgRating || 0
      })),
      recentActivity: recentActivity.map(exec => ({
        id: exec.id,
        agentId: exec.agentId,
        agentName: exec.agent.name,
        agentType: exec.agent.type,
        userId: exec.userId,
        status: exec.status,
        duration: exec.duration,
        creditsConsumed: exec.creditsConsumed,
        timestamp: exec.createdAt.toISOString()
      })),
      errorDistribution: errorDistribution.map(error => ({
        status: error.status,
        count: error._count.status
      })),
      dailyTrends: dailyTrends.map(trend => ({
        date: trend.date.toISOString().split('T')[0],
        totalExecutions: trend.totalExecutions,
        successfulExecutions: trend.successfulExecutions,
        successRate: trend.totalExecutions > 0 ? 
          Math.round((trend.successfulExecutions / trend.totalExecutions) * 100) / 100 : 0
      }))
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
