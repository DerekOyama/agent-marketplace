import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "./auth";
import { ErrorCode, ErrorMapper, ValidationError, BusinessLogicError } from "./error-codes";

// Re-export ErrorHelpers for convenience
export { ErrorHelpers } from "./error-codes";

/**
 * Standardized API Response utilities
 */
export class ApiResponse {
  static success<T>(data: T, status = 200, headers?: Record<string, string>) {
    return NextResponse.json(
      { success: true, data },
      { 
        status,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );
  }

  static error(
    error: string, 
    message?: string, 
    status = 400, 
    details?: Record<string, unknown>
  ) {
    return NextResponse.json(
      { 
        success: false, 
        error, 
        ...(message && { message }),
        ...(details && { details })
      },
      { status }
    );
  }

  static validationError(issues: z.ZodIssue[]) {
    return NextResponse.json(
      {
        success: false,
        error: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: issues
      },
      { status: 400 }
    );
  }

  static unauthorized(message = "Unauthorized") {
    return NextResponse.json(
      {
        success: false,
        error: ErrorCode.UNAUTHORIZED,
        message
      },
      { status: 401 }
    );
  }

  static notFound(resource: string, id?: string) {
    return NextResponse.json(
      {
        success: false,
        error: ErrorCode.NOT_FOUND,
        message: `${resource} not found${id ? ` with id: ${id}` : ''}`
      },
      { status: 404 }
    );
  }

  static internalError(message = "Internal server error", traceId?: string) {
    return NextResponse.json(
      {
        success: false,
        error: ErrorCode.INTERNAL_ERROR,
        message,
        ...(traceId && { traceId })
      },
      { status: 500 }
    );
  }
}

/**
 * API Handler wrapper with common error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Handler Error:", error);
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return ApiResponse.validationError(error.issues);
      }

      // Handle custom business logic errors
      if (error instanceof BusinessLogicError) {
        return ApiResponse.error(
          error.code,
          error.message,
          error.statusCode,
          error.details
        );
      }

      // Handle validation errors
      if (error instanceof ValidationError) {
        return ApiResponse.error(
          ErrorCode.VALIDATION_ERROR,
          error.message,
          400,
          error.details
        );
      }

      // Use the existing error mapper for other errors
      const errorDetails = ErrorMapper.mapError(error);
      return ApiResponse.error(
        errorDetails.code,
        errorDetails.message,
        errorDetails.statusCode,
        errorDetails.details
      );
    }
  };
}

/**
 * Authentication middleware wrapper
 */
export function withAuth<T extends unknown[]>(
  handler: (req: NextRequest, userId: string, ...args: T) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest, ...args: T) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      return ApiResponse.unauthorized();
    }
    return handler(req, userId, ...args);
  });
}

/**
 * Request validation utilities
 */
export class RequestValidator {
  static async validateJson<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid request data", { issues: error.issues });
      }
      throw new ValidationError("Invalid JSON body");
    }
  }

  static async validateQuery<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
    try {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams.entries());
      return schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid query parameters", { issues: error.issues });
      }
      throw new ValidationError("Invalid query parameters");
    }
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  id: z.string().min(1, "ID is required"),
  amountCents: z.number().int().positive("Amount must be a positive integer"),
  email: z.string().email("Invalid email format"),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};

/**
 * Utility for handling common API patterns
 */
export class ApiHandler {
  /**
   * Create a GET handler with authentication
   */
  static createGetHandler<T>(
    handler: (req: NextRequest, userId: string) => Promise<T>
  ) {
    return withAuth(async (req: NextRequest, userId: string) => {
      const data = await handler(req, userId);
      return ApiResponse.success(data);
    });
  }

  /**
   * Create a POST handler with authentication and validation
   */
  static createPostHandler<T, U>(
    schema: z.ZodSchema<T>,
    handler: (req: NextRequest, userId: string, data: T) => Promise<U>
  ) {
    return withAuth(async (req: NextRequest, userId: string) => {
      const data = await RequestValidator.validateJson(req, schema);
      const result = await handler(req, userId, data);
      return ApiResponse.success(result);
    });
  }

  /**
   * Create a PUT handler with authentication and validation
   */
  static createPutHandler<T, U>(
    schema: z.ZodSchema<T>,
    handler: (req: NextRequest, userId: string, data: T) => Promise<U>
  ) {
    return withAuth(async (req: NextRequest, userId: string) => {
      const data = await RequestValidator.validateJson(req, schema);
      const result = await handler(req, userId, data);
      return ApiResponse.success(result);
    });
  }

  /**
   * Create a DELETE handler with authentication
   */
  static createDeleteHandler<T>(
    handler: (req: NextRequest, userId: string) => Promise<T>
  ) {
    return withAuth(async (req: NextRequest, userId: string) => {
      const result = await handler(req, userId);
      return ApiResponse.success(result);
    });
  }
}
