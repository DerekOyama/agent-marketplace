import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'full'; // 'light' or 'full'
    const debugMode = url.searchParams.get('debug') === 'true';
    const showDeleted = url.searchParams.get('showDeleted') === 'true';
    
    console.log("API received parameters:", { mode, debugMode, showDeleted });
    
    // Get all agent data including isHidden and isDeleted using raw query
    // We need to query all agents (not just the filtered ones) to get the correct isDeleted values
    const allAgentsRaw = await prisma.$queryRaw`
      SELECT id, name, description, "runUrl", "quoteUrl", token, type, "n8nWorkflowId", 
             "n8nInstanceUrl", "webhookUrl", "triggerType", "isActive", "isHidden", "isDeleted",
             metadata, pricing, "inputSchema", "outputSchema", "createdAt", "updatedAt",
             "totalExecutions", "avgRating", "totalUsers", "lastExecutedAt"
      FROM "Agent"
      ORDER BY "createdAt" DESC
    ` as Array<{
      id: string; name: string; description: string | null; runUrl: string; quoteUrl: string;
      token: string; type: string; n8nWorkflowId: string | null; n8nInstanceUrl: string | null;
      webhookUrl: string | null; triggerType: string | null; isActive: boolean;
      isHidden: boolean; isDeleted: boolean; metadata: any; pricing: any;
      inputSchema: any; outputSchema: any; createdAt: Date; updatedAt: Date;
      totalExecutions: number; avgRating: number | null; totalUsers: number | null;
      lastExecutedAt: Date | null;
    }>;
    
    // Apply the same filtering logic as the original query
    let filteredAgents = allAgentsRaw;
    
    if (!debugMode) {
      filteredAgents = filteredAgents.filter(agent => !agent.isHidden);
    }
    
    if (!showDeleted) {
      filteredAgents = filteredAgents.filter(agent => !agent.isDeleted);
    }
    
    // Convert to the expected format
    const agentsWithFields = filteredAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      runUrl: agent.runUrl,
      quoteUrl: agent.quoteUrl,
      token: agent.token,
      type: agent.type,
      n8nWorkflowId: agent.n8nWorkflowId,
      n8nInstanceUrl: agent.n8nInstanceUrl,
      webhookUrl: agent.webhookUrl,
      triggerType: agent.triggerType,
      isActive: agent.isActive,
      isHidden: agent.isHidden,
      isDeleted: agent.isDeleted,
      metadata: agent.metadata,
      pricing: agent.pricing,
      inputSchema: agent.inputSchema,
      outputSchema: agent.outputSchema,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      totalExecutions: mode === 'full' ? agent.totalExecutions : undefined,
      avgRating: mode === 'full' ? agent.avgRating : undefined,
      totalUsers: mode === 'full' ? agent.totalUsers : undefined,
      lastExecutedAt: mode === 'full' ? agent.lastExecutedAt?.toISOString() : undefined
    }));
    
    console.log("Found agents:", agentsWithFields.length);
    console.log("Agent details:", agentsWithFields.map(a => ({ id: a.id, name: a.name, isActive: a.isActive, isHidden: a.isHidden, isDeleted: a.isDeleted })));
    
    if (mode === 'light') {
      return NextResponse.json({ agents: agentsWithFields }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // Batch fetch all stats in one query for better performance (full mode)
    const agentIdsForStats = agentsWithFields.map(a => a.id);
    
    // Get execution stats for all agents at once
    const executionStats = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIdsForStats } },
      _count: { id: true },
      _avg: { duration: true },
      _min: { duration: true },
      _max: { duration: true }
    });
    
    // Get success/failure counts for all agents
    const successCounts = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIdsForStats }, status: 'success' },
      _count: { id: true }
    });
    
    const failureCounts = await prisma.agentExecution.groupBy({
      by: ['agentId'],
      where: { 
        agentId: { in: agentIdsForStats }, 
        status: { in: ['failed', 'error', 'timeout'] } 
      },
      _count: { id: true }
    });
    
    // Get user interaction stats for all agents
    const userStats = await prisma.userAgentInteraction.groupBy({
      by: ['agentId'],
      where: { agentId: { in: agentIdsForStats } },
      _count: { id: true },
      _avg: { rating: true }
    });
    
    // Create lookup maps for fast access
    const executionMap = new Map(executionStats.map(s => [s.agentId, s]));
    const successMap = new Map(successCounts.map(s => [s.agentId, s._count.id]));
    const failureMap = new Map(failureCounts.map(s => [s.agentId, s._count.id]));
    const userMap = new Map(userStats.map(s => [s.agentId, s]));
    
    // Attach computed stats to each agent
    const agentsWithStats = agentsWithFields.map(agent => {
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
