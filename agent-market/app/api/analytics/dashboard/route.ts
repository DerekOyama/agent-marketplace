import { NextRequest } from 'next/server';
import { wrapApi, createSuccessResponse } from '../../../../lib/api-wrapper';
import { apiWrapper } from '../../../../lib/api-wrapper';

async function handler(req: NextRequest, _context: { params: Promise<Record<string, string>> }) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
  const path = searchParams.get('path') || undefined;
  const method = searchParams.get('method') || undefined;

  // Get metrics from the API wrapper
  const metrics = await apiWrapper.getMetrics({
    startDate,
    endDate,
    path,
    method
  });

  return createSuccessResponse(metrics);
}

export const GET = wrapApi(handler);