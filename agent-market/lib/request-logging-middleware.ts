/**
 * Request Logging Middleware for API Routes
 * Automatically logs requests with agent and execution context
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestLogger, RequestLogData } from './request-logger';
import { ErrorCode } from './error-codes';

export class RequestLoggingMiddleware {
  private requestLogger = new RequestLogger();

  /**
   * Extract agent and execution context from request
   */
  private extractContext(req: NextRequest): { agentId?: string; executionId?: string } {
    const url = new URL(req.url);
    const path = url.pathname;

    // Extract agent ID from URL patterns
    const agentIdMatch = path.match(/\/api\/agents\/([^\/]+)/);
    const agentId = agentIdMatch ? agentIdMatch[1] : undefined;

    // Extract execution ID from headers or URL
    const executionId = req.headers.get('x-execution-id') || 
                       req.headers.get('x-idempotency-key') ||
                       url.searchParams.get('executionId') ||
                       undefined;

    return { agentId, executionId: executionId || undefined };
  }

  /**
   * Wrap an API route handler with request logging
   */
  async withLogging(
    handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
    req: NextRequest,
    ...args: unknown[]
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract context
    const { agentId, executionId } = this.extractContext(req);
    
    // Extract request data
    const requestData = await this.requestLogger.extractRequestData(req, traceId);
    
    let response: NextResponse;
    let logData: RequestLogData;

    try {
      // Execute the handler
      response = await handler(req, ...args);
      
      // Extract response data
      const responseData = await this.requestLogger.extractResponseData(response, traceId);
      
      // Create log data
      logData = {
        traceId,
        ...requestData,
        ...responseData,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        agentId,
        executionId
      };

    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse = NextResponse.json(
        { error: 'Internal server error', message: errorMessage },
        { status: 500 }
      );

      // Create log data for error case
      logData = {
        traceId,
        ...requestData,
        responseStatus: 500,
        responseBody: { error: errorMessage },
        responseSize: JSON.stringify({ error: errorMessage }).length,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        errorCode: ErrorCode.INTERNAL_ERROR,
        errorMessage,
        agentId,
        executionId
      };

      response = errorResponse;
    }

    // Log the request (don't await to avoid blocking)
    this.requestLogger.logRequest(logData).catch(error => {
      console.error('Failed to log request:', error);
    });

    return response;
  }

  /**
   * Create a logged version of an API route handler
   */
  createLoggedHandler(
    handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: unknown[]) => {
      return this.withLogging(handler, req, ...args);
    };
  }
}

// Export a singleton instance
export const requestLoggingMiddleware = new RequestLoggingMiddleware();

// Helper function to wrap handlers
export function withRequestLogging(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
  return requestLoggingMiddleware.createLoggedHandler(handler);
}
