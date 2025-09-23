import { NextRequest } from 'next/server';
import { wrapApi, createSuccessResponse } from '../../../../lib/api-wrapper';
import { RequestLogger } from '../../../../lib/request-logger';
import { ErrorCode } from '../../../../lib/error-codes';

const requestLogger = new RequestLogger();

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
  const errorCode = searchParams.get('errorCode') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Get error statistics
  const errorStats = await requestLogger.getErrorStats(startDate, endDate);

  // Get detailed error logs
  const errorLogs = await requestLogger.getRequestLogs({
    startDate,
    endDate,
    errorCode: errorCode as ErrorCode | undefined,
    limit,
    offset
  });

  return createSuccessResponse({
    errorStats,
    errorLogs,
    period: {
      startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate || new Date()
    }
  });
}

export const GET = wrapApi(handler);
