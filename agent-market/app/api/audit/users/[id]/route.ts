import { NextRequest, NextResponse } from "next/server";
import { auditLogger } from "../../../../../lib/audit-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await auditLogger.getUserAuditLogs(userId, limit, offset);

    return NextResponse.json({
      success: true,
      userId,
      logs: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('User audit logs error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch user audit logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
