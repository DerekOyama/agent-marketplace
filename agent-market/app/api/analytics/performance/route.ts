import { NextRequest } from 'next/server';
import { wrapApi, createSuccessResponse } from '../../../../lib/api-wrapper';
import { RequestLogger } from '../../../../lib/request-logger';

const requestLogger = new RequestLogger();

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
  const path = searchParams.get('path') || undefined;
  const method = searchParams.get('method') || undefined;

  // Get performance statistics
  const performanceStats = await requestLogger.getPerformanceStats(startDate, endDate);

  // Get detailed request logs for analysis
  const requestLogs = await requestLogger.getRequestLogs({
    startDate,
    endDate,
    path,
    method,
    limit: 1000
  });

  // Calculate additional performance metrics
  const logs = requestLogs.logs;
  const durations = logs.map((log: { duration: number }) => log.duration).filter((d: number) => d > 0);
  
  const performanceMetrics = {
    ...performanceStats,
    p50Duration: durations.length > 0 ? durations.sort((a: number, b: number) => a - b)[Math.floor(durations.length * 0.5)] : 0,
    p95Duration: durations.length > 0 ? durations.sort((a: number, b: number) => a - b)[Math.floor(durations.length * 0.95)] : 0,
    p99Duration: durations.length > 0 ? durations.sort((a: number, b: number) => a - b)[Math.floor(durations.length * 0.99)] : 0,
    successRate: logs.length > 0 ? (logs.filter((log: { errorCode?: string | null }) => !log.errorCode).length / logs.length) * 100 : 0,
    errorRate: logs.length > 0 ? (logs.filter((log: { errorCode?: string | null }) => log.errorCode).length / logs.length) * 100 : 0
  };

  return createSuccessResponse({
    performanceMetrics,
    requestLogs: {
      logs: logs.slice(0, 100), // Return only first 100 for detailed view
      total: requestLogs.total,
      hasMore: requestLogs.hasMore
    },
    period: {
      startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate || new Date()
    }
  });
}

export const GET = wrapApi(handler);
