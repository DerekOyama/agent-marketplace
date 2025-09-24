import { NextRequest, NextResponse } from "next/server";
import { auditLogger } from "../../../../lib/audit-logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const metric = searchParams.get('metric');
    const component = searchParams.get('component');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const filters = {
      ...(metric && { metric }),
      ...(component && { component }),
      ...(startDate && endDate && { startDate, endDate })
    };

    const result = await auditLogger.getSystemMetrics(filters, limit, offset);

    return NextResponse.json({
      success: true,
      metrics: result.metrics,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore
      },
      filters
    });

  } catch (error) {
    console.error('System metrics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch system metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { metric, value, component, unit, tags } = await req.json();

    if (!metric || value === undefined || !component) {
      return NextResponse.json(
        { error: 'metric, value, and component are required' },
        { status: 400 }
      );
    }

    await auditLogger.logSystemMetric({
      metric,
      value,
      component,
      unit,
      tags
    });

    return NextResponse.json({
      success: true,
      message: 'System metric logged successfully'
    });

  } catch (error) {
    console.error('Log system metric error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to log system metric',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

