import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { searchParams } = new URL(req.url);
    
    const executionId = searchParams.get('executionId');
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { agentId };
    
    if (executionId) {
      whereClause.executionId = executionId;
    }
    if (category) {
      whereClause.category = category;
    }
    if (level) {
      whereClause.level = level;
    }

    // Get logs
    const logs = await prisma.agentLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 1000), // Cap at 1000
      skip: offset
    });

    // Get total count
    const total = await prisma.agentLog.count({
      where: whereClause
    });

    // Get log statistics
    const stats = await prisma.agentLog.groupBy({
      by: ['category', 'level'],
      _count: {
        category: true
      },
      where: { agentId }
    });

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      logs: logs.map(log => ({
        id: log.id,
        executionId: log.executionId,
        category: log.category,
        level: log.level,
        message: log.message,
        context: log.context,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString()
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      statistics: stats.map(stat => ({
        category: stat.category,
        level: stat.level,
        count: stat._count.category
      }))
    });

  } catch (error) {
    console.error('Agent logs error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch agent logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
