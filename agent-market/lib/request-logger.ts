/**
 * Request/Response Logging System for Postgres
 * Logs all API requests and responses with timing, error codes, and sanitized data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { DataSanitizer } from './data-sanitizer';
import { ErrorCode } from './error-codes';
import { auditLogger } from './audit-logger';

export interface RequestLogData {
  traceId: string;
  method?: string;
  url?: string;
  path?: string;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  sessionId?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  requestSize?: number;
  responseStatus?: number;
  responseBody?: unknown;
  responseSize?: number;
  duration: number;
  errorCode?: ErrorCode;
  errorMessage?: string;
  timestamp: Date;
  agentId?: string;
  executionId?: string;
}

export class RequestLogger {
  private dataSanitizer = new DataSanitizer();

  /**
   * Log a request/response pair to the database
   */
  async logRequest(logData: RequestLogData): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedHeaders = this.sanitizeHeaders(logData.requestHeaders);
      const sanitizedRequestBody = this.sanitizeRequestBody(logData.requestBody);
      const sanitizedResponseBody = this.sanitizeResponseBody(logData.responseBody);
      const anonymizedIP = logData.ipAddress ? this.dataSanitizer.anonymizeIP(logData.ipAddress) : null;
      const sanitizedUserAgent = logData.userAgent ? this.dataSanitizer.sanitizeUserAgent(logData.userAgent) : null;

      // Create request log entry
      await prisma.requestLog.create({
        data: {
          traceId: logData.traceId,
          method: logData.method || 'UNKNOWN',
          url: logData.url || '',
          path: logData.path || '',
          userAgent: sanitizedUserAgent,
          ipAddress: anonymizedIP,
          userId: logData.userId,
          sessionId: logData.sessionId ? this.dataSanitizer.sanitizeSessionId(logData.sessionId) : null,
          requestHeaders: sanitizedHeaders || undefined,
          requestBody: sanitizedRequestBody || undefined,
          requestSize: logData.requestSize,
          responseStatus: logData.responseStatus,
          responseBody: sanitizedResponseBody || undefined,
          responseSize: logData.responseSize,
          duration: logData.duration,
          errorCode: logData.errorCode,
          errorMessage: logData.errorMessage ? this.dataSanitizer.sanitizeError(new Error(logData.errorMessage)).message : null,
          timestamp: logData.timestamp,
          agentId: logData.agentId,
          executionId: logData.executionId
        }
      });

      console.log(`📝 Logged request: ${logData.traceId} - ${logData.method} ${logData.path} (${logData.duration}ms)`);

      // Log system metrics
      await auditLogger.logSystemMetric({
        metric: 'request_duration',
        value: logData.duration,
        component: 'api',
        unit: 'ms',
        tags: {
          method: logData.method,
          path: logData.path,
          status: logData.responseStatus,
          agentId: logData.agentId
        }
      });

      // Log errors to centralized system
      if (logData.errorCode || (logData.responseStatus && logData.responseStatus >= 400)) {
        await auditLogger.logSystemError({
          errorCode: logData.errorCode || 'HTTP_ERROR',
          errorType: 'system',
          severity: (logData.responseStatus && logData.responseStatus >= 500) ? 'high' : 'medium',
          component: 'api',
          agentId: logData.agentId,
          userId: logData.userId,
          requestId: logData.traceId,
          message: logData.errorMessage || `HTTP ${logData.responseStatus} error`,
          details: {
            method: logData.method,
            path: logData.path,
            status: logData.responseStatus,
            duration: logData.duration
          }
        });
      }

    } catch (error) {
      console.error('❌ Failed to log request:', error);
      
      // Log the logging failure itself
      await auditLogger.logSystemError({
        errorCode: 'REQUEST_LOGGING_ERROR',
        errorType: 'system',
        severity: 'high',
        component: 'request-logger',
        message: 'Failed to log request/response',
        details: {
          traceId: logData.traceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      // Don't throw - logging should not break the main flow
    }
  }

  /**
   * Extract request data from NextRequest
   */
  async extractRequestData(req: NextRequest, traceId: string): Promise<Partial<RequestLogData>> {
    const url = new URL(req.url);
    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || 
                     undefined;
    const sessionId = req.headers.get('x-session-id') || undefined;
    const userId = req.headers.get('x-user-id') || undefined;

    // Extract headers (excluding sensitive ones)
    const requestHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!this.isSensitiveHeader(key)) {
        requestHeaders[key] = value;
      }
    });

    // Extract request body for POST/PUT/PATCH requests
    let requestBody: unknown = undefined;
    let requestSize = 0;
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.clone().text();
        requestSize = new Blob([body]).size;
        
        // Only parse JSON if content-type suggests it
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            requestBody = JSON.parse(body);
          } catch {
            requestBody = body; // Store as string if not valid JSON
          }
        } else {
          requestBody = body;
        }
      } catch (error) {
        console.warn('Failed to extract request body:', error);
      }
    }

    return {
      traceId,
      method: req.method,
      url: req.url,
      path: url.pathname,
      userAgent,
      ipAddress,
      userId,
      sessionId,
      requestHeaders,
      requestBody,
      requestSize
    };
  }

  /**
   * Extract response data from NextResponse
   */
  async extractResponseData(res: NextResponse, traceId: string): Promise<Partial<RequestLogData>> {
    let responseBody: unknown = undefined;
    let responseSize = 0;

    try {
      // Clone response to read body
      const clonedRes = res.clone();
      const body = await clonedRes.text();
      responseSize = new Blob([body]).size;

      // Try to parse as JSON
      try {
        responseBody = JSON.parse(body);
      } catch {
        responseBody = body; // Store as string if not valid JSON
      }
    } catch (error) {
      console.warn('Failed to extract response body:', error);
    }

    return {
      traceId,
      responseStatus: res.status,
      responseBody,
      responseSize
    };
  }

  /**
   * Sanitize request headers
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = [
      'authorization', 'cookie', 'x-api-key', 'x-auth-token', 
      'x-csrf-token', 'x-session-token', 'x-access-token'
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body
   */
  private sanitizeRequestBody(body?: unknown): unknown {
    if (!body) return undefined;

    // For JSON objects, sanitize sensitive fields
    if (typeof body === 'object' && body !== null) {
      return this.dataSanitizer.sanitizeContext(body as Record<string, unknown>);
    }

    // For strings, check if it looks like sensitive data
    if (typeof body === 'string') {
      if (this.dataSanitizer.looksLikeSensitiveData(body)) {
        return '[REDACTED]';
      }
      return body;
    }

    return body;
  }

  /**
   * Sanitize response body
   */
  private sanitizeResponseBody(body?: unknown): unknown {
    if (!body) return undefined;

    // For error responses, sanitize error messages
    if (typeof body === 'object' && body !== null) {
      const bodyObj = body as Record<string, unknown>;
      
      // Sanitize error messages
      if ('error' in bodyObj && typeof bodyObj.error === 'string') {
        bodyObj.error = this.dataSanitizer.sanitizeError(new Error(bodyObj.error)).message;
      }
      
      if ('message' in bodyObj && typeof bodyObj.message === 'string') {
        bodyObj.message = this.dataSanitizer.sanitizeError(new Error(bodyObj.message)).message;
      }

      // Sanitize the entire context
      return this.dataSanitizer.sanitizeContext(bodyObj);
    }

    return body;
  }

  /**
   * Check if a header is sensitive
   */
  private isSensitiveHeader(headerName: string): boolean {
    const sensitiveHeaders = [
      'authorization', 'cookie', 'x-api-key', 'x-auth-token',
      'x-csrf-token', 'x-session-token', 'x-access-token',
      'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'
    ];

    const lowerName = headerName.toLowerCase();
    return sensitiveHeaders.some(sensitive => lowerName.includes(sensitive));
  }

  /**
   * Get request logs for analytics
   */
  async getRequestLogs(filters: {
    traceId?: string;
    method?: string;
    path?: string;
    userId?: string;
    errorCode?: ErrorCode;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const logs = await prisma.requestLog.findMany({
        where: {
          ...(filters.traceId && { traceId: filters.traceId }),
          ...(filters.method && { method: filters.method }),
          ...(filters.path && { path: { contains: filters.path } }),
          ...(filters.userId && { userId: filters.userId }),
          ...(filters.errorCode && { errorCode: filters.errorCode }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0
      });

      const total = await prisma.requestLog.count({
        where: {
          ...(filters.traceId && { traceId: filters.traceId }),
          ...(filters.method && { method: filters.method }),
          ...(filters.path && { path: { contains: filters.path } }),
          ...(filters.userId && { userId: filters.userId }),
          ...(filters.errorCode && { errorCode: filters.errorCode }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        }
      });

      return {
        logs,
        total,
        hasMore: (filters.offset || 0) + (filters.limit || 100) < total
      };
    } catch (error) {
      console.error('❌ Failed to get request logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(startDate?: Date, endDate?: Date) {
    try {
      const errorStats = await prisma.requestLog.groupBy({
        by: ['errorCode'],
        where: {
          errorCode: { not: null },
          ...(startDate && endDate && {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        _count: {
          errorCode: true
        },
        orderBy: {
          _count: {
            errorCode: 'desc'
          }
        }
      });

      return errorStats.map((stat: { errorCode: string | null; _count: { errorCode: number } }) => ({
        errorCode: stat.errorCode || 'UNKNOWN',
        count: stat._count.errorCode
      }));
    } catch (error) {
      console.error('❌ Failed to get error stats:', error);
      return [];
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(startDate?: Date, endDate?: Date) {
    try {
      const stats = await prisma.requestLog.aggregate({
        where: {
          ...(startDate && endDate && {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        _avg: {
          duration: true
        },
        _min: {
          duration: true
        },
        _max: {
          duration: true
        },
        _count: {
          traceId: true
        }
      });

      return {
        totalRequests: stats._count.traceId,
        avgDuration: stats._avg.duration || 0,
        minDuration: stats._min.duration || 0,
        maxDuration: stats._max.duration || 0
      };
    } catch (error) {
      console.error('❌ Failed to get performance stats:', error);
      return {
        totalRequests: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0
      };
    }
  }
}
