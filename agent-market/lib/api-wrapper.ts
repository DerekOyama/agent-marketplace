/**
 * Common API Handler Wrapper
 * Provides standardized error handling, timing, trace IDs, and DB logging for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorMapper, ValidationError } from './error-codes';
import { RequestLogger, RequestLogData } from './request-logger';
import { DataSanitizer } from './data-sanitizer';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  skipLogging?: boolean;
}

export type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export class ApiWrapper {
  private requestLogger = new RequestLogger();
  private dataSanitizer = new DataSanitizer();

  /**
   * Wrap an API handler with common functionality
   */
  wrap(
    handler: ApiHandler,
    options: ApiHandlerOptions = {}
  ): ApiHandler {
    return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      const startTime = Date.now();
      const traceId = this.generateTraceId();
      const timestamp = new Date();

      // Initialize request log data
      let requestLogData: Partial<RequestLogData> = {
        traceId,
        timestamp
      };

      try {
        // Extract request data
        requestLogData = {
          ...requestLogData,
          ...(await this.requestLogger.extractRequestData(req, traceId))
        };

        // Add trace ID to response headers
        const responseHeaders = new Headers();
        responseHeaders.set('X-Trace-ID', traceId);

        // Execute the handler
        const response = await handler(req, context);

        // Add trace ID to response
        response.headers.set('X-Trace-ID', traceId);

        // Extract response data
        const responseData = await this.requestLogger.extractResponseData(response, traceId);
        requestLogData = {
          ...requestLogData,
          ...responseData,
          duration: Date.now() - startTime
        };

        // Log successful request
        if (!options.skipLogging) {
          await this.requestLogger.logRequest(requestLogData as RequestLogData);
        }

        return response;

      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Map error to standardized format
        const errorDetails = ErrorMapper.mapError(error, traceId);
        
        // Create error response
        const errorResponse = NextResponse.json(
          ErrorMapper.createErrorResponse(errorDetails),
          { 
            status: errorDetails.statusCode,
            headers: {
              'X-Trace-ID': traceId,
              'Content-Type': 'application/json'
            }
          }
        );

        // Log error request
        if (!options.skipLogging) {
          const errorLogData: RequestLogData = {
            ...requestLogData,
            responseStatus: errorDetails.statusCode,
            responseBody: ErrorMapper.createErrorResponse(errorDetails),
            responseSize: JSON.stringify(ErrorMapper.createErrorResponse(errorDetails)).length,
            duration,
            errorCode: errorDetails.code,
            errorMessage: errorDetails.message,
            timestamp
          } as RequestLogData;

          await this.requestLogger.logRequest(errorLogData);
        }

        // Log error details for debugging
        console.error(`❌ API Error [${traceId}]:`, {
          error: errorDetails.code,
          message: errorDetails.message,
          statusCode: errorDetails.statusCode,
          duration,
          path: requestLogData.path,
          method: requestLogData.method
        });

        return errorResponse;
      }
    };
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `trace_${timestamp}_${random}`;
  }

  /**
   * Create a standardized success response
   */
  static success(data: unknown, statusCode: number = 200, traceId?: string): NextResponse {
    // For backward compatibility, if data is an object with a single key,
    // return it directly instead of wrapping in { success: true, data: ... }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      const keys = Object.keys(dataObj);
      
      // If it's a simple object with one key (like { agents: [...] }), return it directly
      if (keys.length === 1) {
        return NextResponse.json(data, {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            ...(traceId && { 'X-Trace-ID': traceId })
          }
        });
      }
    }

    // Otherwise, use the full wrapper format
    const response = {
      success: true,
      data,
      ...(traceId && { traceId })
    };

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(traceId && { 'X-Trace-ID': traceId })
      }
    });
  }

  /**
   * Create a standardized error response
   */
  static error(
    error: unknown,
    statusCode: number = 500,
    traceId?: string
  ): NextResponse {
    const errorDetails = ErrorMapper.mapError(error, traceId);
    const response = ErrorMapper.createErrorResponse(errorDetails);

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(traceId && { 'X-Trace-ID': traceId })
      }
    });
  }

  /**
   * Validate request body against a schema
   */
  static validateBody<T>(
    body: unknown,
    validator: (data: unknown) => { success: boolean; data?: T; error?: unknown }
  ): T {
    const result = validator(body);
    
    if (!result.success) {
      throw new ValidationError(
        'Invalid request body',
        { validationError: result.error }
      );
    }

    return result.data!;
  }

  /**
   * Extract user ID from request (placeholder for auth implementation)
   */
  static getUserId(): string | null {
    // TODO: Implement proper authentication
    // For now, return demo user or extract from headers
    return 'demo-user';
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    // TODO: Implement proper authentication check
    // For now, always return true for demo purposes
    return true;
  }

  /**
   * Get request metrics for monitoring
   */
  async getMetrics(filters: {
    startDate?: Date;
    endDate?: Date;
    path?: string;
    method?: string;
  } = {}) {
    const endDate = filters.endDate || new Date();
    const startDate = filters.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Default to last 24 hours

    const [requestLogs, errorStats, performanceStats] = await Promise.all([
      this.requestLogger.getRequestLogs({
        startDate,
        endDate,
        path: filters.path,
        method: filters.method,
        limit: 1000
      }),
      this.requestLogger.getErrorStats(startDate, endDate),
      this.requestLogger.getPerformanceStats(startDate, endDate)
    ]);

    return {
      requestLogs,
      errorStats,
      performanceStats,
      period: {
        startDate,
        endDate
      }
    };
  }
}

// Export a default instance
export const apiWrapper = new ApiWrapper();

// Export convenience functions
export const wrapApi = (handler: ApiHandler, options?: ApiHandlerOptions) => 
  apiWrapper.wrap(handler, options);

export const createSuccessResponse = ApiWrapper.success;
export const createErrorResponse = ApiWrapper.error;
export const validateBody = ApiWrapper.validateBody;
export const getUserId = ApiWrapper.getUserId;
export const isAuthenticated = ApiWrapper.isAuthenticated;
