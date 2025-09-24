import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { searchParams } = new URL(req.url);
    
    const period = searchParams.get('period') || 'day';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metric = searchParams.get('metric') || 'executions';

    // Parse date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const end = endDate ? new Date(endDate) : new Date();

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

    // Query metrics based on period
    const metrics = await prisma.agentMetrics.findMany({
      where: {
        agentId,
        date: {
          gte: start,
          lte: end
        },
        ...(period === 'hour' ? {} : { hour: null }) // Only daily records for 'day' period
      },
      orderBy: { date: 'asc' }
    });

    // Aggregate data based on metric type
    let aggregatedData: Record<string, unknown> = {};

    switch (metric) {
      case 'executions':
        aggregatedData = {
          executions: {
            total: metrics.reduce((sum: number, m: any) => sum + m.totalExecutions, 0),
            successful: metrics.reduce((sum: number, m: any) => sum + m.successfulExecutions, 0),
            failed: metrics.reduce((sum: number, m: any) => sum + m.failedExecutions, 0),
            timeout: metrics.reduce((sum: number, m: any) => sum + m.timeoutExecutions, 0),
            error: metrics.reduce((sum: number, m: any) => sum + m.errorExecutions, 0)
          },
          successRate: metrics.length > 0 ? 
            Math.round((metrics.reduce((sum: number, m: any) => sum + m.successfulExecutions, 0) / 
                       metrics.reduce((sum: number, m: any) => sum + m.totalExecutions, 0)) * 100) / 100 : 0
        };
        break;

      case 'performance':
        const durations = metrics.filter((m: any) => m.avgDuration !== null).map((m: any) => m.avgDuration!);
        aggregatedData = {
          performance: {
            avgDuration: durations.length > 0 ? 
              Math.round(durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length) : 0,
            minDuration: Math.min(...metrics.map((m: any) => m.minDuration || 0).filter((d: number) => d > 0)),
            maxDuration: Math.max(...metrics.map((m: any) => m.maxDuration || 0)),
            p95Duration: Math.round(metrics.reduce((sum: number, m: any) => sum + (m.p95Duration || 0), 0) / metrics.length),
            p99Duration: Math.round(metrics.reduce((sum: number, m: any) => sum + (m.p99Duration || 0), 0) / metrics.length)
          }
        };
        break;

      case 'errors':
        const errorCounts: Record<string, number> = {};
        metrics.forEach((m: any) => {
          if (m.errorCounts) {
            Object.entries(m.errorCounts as Record<string, number>).forEach(([error, count]) => {
              errorCounts[error] = (errorCounts[error] || 0) + count;
            });
          }
        });
        aggregatedData = {
          errors: errorCounts
        };
        break;

      case 'users':
        aggregatedData = {
          users: {
            unique: Math.max(...metrics.map((m: any) => m.uniqueUsers)),
            totalCreditsConsumed: metrics.reduce((sum: number, m: any) => sum + m.totalCreditsConsumed, 0),
            avgCreditsPerExecution: metrics.length > 0 ?
              Math.round(metrics.reduce((sum: number, m: any) => sum + (m.avgCreditsPerExecution || 0), 0) / metrics.length) : 0
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid metric type. Valid types: executions, performance, errors, users' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      period,
      metric,
      data: aggregatedData,
      timestamps: metrics.map((m: any) => m.date.toISOString()),
      recordCount: metrics.length
    });

  } catch (error) {
    console.error('Agent metrics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch agent metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
