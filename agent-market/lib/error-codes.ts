/**
 * Standardized Error Codes for API Responses
 * Maps various error types to consistent codes for better monitoring and debugging
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // Business Logic Errors
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  OVER_CAP = 'OVER_CAP',
  NO_MANDATE = 'NO_MANDATE',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INACTIVE = 'AGENT_INACTIVE',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNREACHABLE = 'UNREACHABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Maps error types to standardized error codes and HTTP status codes
 */
export class ErrorMapper {
  /**
   * Map an error to a standardized error code
   */
  static mapError(error: unknown, traceId?: string): ErrorDetails {
    // Handle known error types
    if (error instanceof ValidationError) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: error.message,
        statusCode: 400,
        details: error.details,
        traceId
      };
    }

    if (error instanceof BusinessLogicError) {
      return {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        traceId
      };
    }

    if (error instanceof ExternalServiceError) {
      return {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        traceId
      };
    }

    if (error instanceof DatabaseError) {
      return {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database operation failed',
        statusCode: 500,
        details: { originalError: error.message },
        traceId
      };
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      
      switch (prismaError.code) {
        case 'P2002':
          return {
            code: ErrorCode.RESOURCE_CONFLICT,
            message: 'Resource already exists',
            statusCode: 409,
            details: { constraint: prismaError.message },
            traceId
          };
        case 'P2025':
          return {
            code: ErrorCode.NOT_FOUND,
            message: 'Resource not found',
            statusCode: 404,
            details: { originalError: prismaError.message },
            traceId
          };
        case 'P2003':
          return {
            code: ErrorCode.CONSTRAINT_VIOLATION,
            message: 'Foreign key constraint violation',
            statusCode: 400,
            details: { originalError: prismaError.message },
            traceId
          };
        default:
          return {
            code: ErrorCode.DATABASE_ERROR,
            message: 'Database operation failed',
            statusCode: 500,
            details: { code: prismaError.code, message: prismaError.message },
            traceId
          };
      }
    }

    // Handle HTTP status codes from fetch responses
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; statusText: string };
      
      switch (httpError.status) {
        case 401:
          return {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
            statusCode: 401,
            traceId
          };
        case 403:
          return {
            code: ErrorCode.FORBIDDEN,
            message: 'Forbidden',
            statusCode: 403,
            traceId
          };
        case 404:
          return {
            code: ErrorCode.NOT_FOUND,
            message: 'Not found',
            statusCode: 404,
            traceId
          };
        case 408:
          return {
            code: ErrorCode.TIMEOUT,
            message: 'Request timeout',
            statusCode: 408,
            traceId
          };
        case 429:
          return {
            code: ErrorCode.RATE_LIMITED,
            message: 'Rate limited',
            statusCode: 429,
            traceId
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            code: ErrorCode.EXTERNAL_SERVICE_ERROR,
            message: 'External service error',
            statusCode: httpError.status,
            traceId
          };
        default:
          return {
            code: ErrorCode.EXTERNAL_SERVICE_ERROR,
            message: httpError.statusText || 'External service error',
            statusCode: httpError.status,
            traceId
          };
      }
    }

    // Handle timeout errors
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
          code: ErrorCode.TIMEOUT,
          message: 'Request timeout',
          statusCode: 408,
          traceId
        };
      }

      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return {
          code: ErrorCode.UNREACHABLE,
          message: 'Service unreachable',
          statusCode: 503,
          traceId
        };
      }

      if (error.message.includes('network') || error.message.includes('connection')) {
        return {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Network error',
          statusCode: 503,
          traceId
        };
      }
    }

    // Default fallback
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      statusCode: 500,
      traceId
    };
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(errorDetails: ErrorDetails) {
    return {
      error: errorDetails.code,
      message: errorDetails.message,
      ...(errorDetails.details && { details: errorDetails.details }),
      ...(errorDetails.traceId && { traceId: errorDetails.traceId })
    };
  }
}

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 502,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Helper functions for common error scenarios
 */
export const ErrorHelpers = {
  notFound: (resource: string, id?: string) => 
    new BusinessLogicError(
      `${resource} not found${id ? ` with id: ${id}` : ''}`,
      ErrorCode.NOT_FOUND,
      404
    ),

  validationError: (message: string, details?: Record<string, unknown>) =>
    new ValidationError(message, details),

  insufficientCredits: (required: number, available: number) =>
    new BusinessLogicError(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      ErrorCode.INSUFFICIENT_CREDITS,
      400,
      { required, available }
    ),

  agentNotFound: (agentId: string) =>
    new BusinessLogicError(
      `Agent not found: ${agentId}`,
      ErrorCode.AGENT_NOT_FOUND,
      404,
      { agentId }
    ),

  agentInactive: (agentId: string) =>
    new BusinessLogicError(
      `Agent is inactive: ${agentId}`,
      ErrorCode.AGENT_INACTIVE,
      400,
      { agentId }
    ),

  overCap: (amount: number, maxAmount: number) =>
    new BusinessLogicError(
      `Amount exceeds cap. Amount: ${amount}, Max: ${maxAmount}`,
      ErrorCode.OVER_CAP,
      403,
      { amount, maxAmount }
    ),

  noMandate: (userId: string) =>
    new BusinessLogicError(
      `No active mandate found for user: ${userId}`,
      ErrorCode.NO_MANDATE,
      400,
      { userId }
    )
};
