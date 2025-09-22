import { NextRequest, NextResponse } from "next/server";
import { auditLogger } from "../../../../lib/audit-logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity');
    const component = searchParams.get('component');
    const errorType = searchParams.get('errorType');
    const resolved = searchParams.get('resolved');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const filters = {
      ...(severity && { severity }),
      ...(component && { component }),
      ...(errorType && { errorType }),
      ...(resolved !== null && { resolved: resolved === 'true' }),
      ...(startDate && endDate && { startDate, endDate })
    };

    const result = await auditLogger.getSystemErrors(filters, limit, offset);

    return NextResponse.json({
      success: true,
      errors: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore
      },
      filters
    });

  } catch (error) {
    console.error('System errors error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch system errors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorId, resolvedBy, resolution } = await req.json();

    if (!errorId || !resolvedBy) {
      return NextResponse.json(
        { error: 'errorId and resolvedBy are required' },
        { status: 400 }
      );
    }

    await auditLogger.resolveSystemError(errorId, resolvedBy, resolution);

    return NextResponse.json({
      success: true,
      message: 'System error resolved successfully',
      errorId,
      resolvedBy
    });

  } catch (error) {
    console.error('Resolve system error error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resolve system error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
