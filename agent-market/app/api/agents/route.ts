import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'full'; // 'light' or 'full'
    const debugMode = url.searchParams.get('debug') === 'true';
    const showDeleted = url.searchParams.get('showDeleted') === 'true';
    
    // Build where clause based on parameters
    const whereClause: Record<string, unknown> = {};
    
    if (!debugMode) {
      whereClause.isHidden = false;
    }
    
    if (!showDeleted) {
      whereClause.isDeleted = false;
    }
    
    const agents = await prisma.agent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }, // Newest first
      select: { 
        id: true, 
        name: true, 
        description: true,
        runUrl: true,
        quoteUrl: true,
        token: true,
        type: true,
        n8nWorkflowId: true,
        n8nInstanceUrl: true,
        webhookUrl: true,
        triggerType: true,
        isActive: true,
        isHidden: true,
        isDeleted: true,
        metadata: true,
        pricing: true,
        stats: mode === 'full',
        inputSchema: true,
        outputSchema: true,
        inputRequirements: true,
        pricePerExecutionCents: true,
        exampleInput: true,
        exampleOutput: true,
        createdAt: true,
        updatedAt: true,
        totalExecutions: mode === 'full',
        avgRating: mode === 'full',
        totalUsers: mode === 'full',
        lastExecutedAt: mode === 'full'
      }
    });
    
    if (mode === 'light') {
      return NextResponse.json({ agents }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // Batch fetch all stats in one query for better performance (full mode)
    const agentIds = agents.map(a => a.id);
    
    // Get execution stats for all agents at once
    const executionStats = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIds } },
      _count: { id: true },
      _avg: { duration: true },
      _min: { duration: true },
      _max: { duration: true }
    });
    
    // Get success/failure counts for all agents
    const successCounts = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIds }, status: 'success' },
      _count: { id: true }
    });
    
    const failureCounts = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { 
        agentId: { in: agentIds }, 
        status: { in: ['failed', 'error', 'timeout'] } 
      },
      _count: { id: true }
    });
    
    // Get user interaction stats for all agents
    const userStats = await prisma.userAgentInteraction.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIds } },
      _count: { id: true },
      _avg: { rating: true }
    });
    
    // Create lookup maps for fast access
    const executionMap = new Map(executionStats.map(s => [s.agentId, s]));
    const successMap = new Map(successCounts.map(s => [s.agentId, s._count.id]));
    const failureMap = new Map(failureCounts.map(s => [s.agentId, s._count.id]));
    const userMap = new Map(userStats.map(s => [s.agentId, s]));
    
    // Attach computed stats to each agent
    const agentsWithStats = agents.map(agent => {
      const execStats = executionMap.get(agent.id);
      const successCount = successMap.get(agent.id) || 0;
      const failureCount = failureMap.get(agent.id) || 0;
      const userStat = userMap.get(agent.id);
      
      const totalExecutions = execStats?._count.id || 0;
      const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0;
      
      const realTimeStats = {
        totalExecutions,
        successfulExecutions: successCount,
        failedExecutions: failureCount,
        successRate,
        failureRate: totalExecutions > 0 ? Math.round((failureCount / totalExecutions) * 100) : 0,
        averageExecutionTime: Math.round(execStats?._avg.duration || 0),
        minExecutionTime: execStats?._min.duration || 0,
        maxExecutionTime: execStats?._max.duration || 0,
        uniqueUsers: userStat?._count.id || 0,
        averageRating: userStat?._avg.rating || 0,
        lastExecutedAt: agent.lastExecutedAt,
        lastUpdated: new Date().toISOString()
      };
      
      return {
        ...agent,
        stats: realTimeStats
      };
    });
    
    return NextResponse.json({ agents: agentsWithStats }, { status: 200 });
  } catch (e: unknown) {
    console.error("Database error:", e);
    return NextResponse.json({ 
      agents: [], 
      error: "db_error", 
      message: String((e as Error)?.message || e) 
    }, { status: 500 });
  }
}
