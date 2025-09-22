/**
 * DataSanitizer - Sanitizes sensitive data for metrics collection
 * Ensures privacy while maintaining useful analytics data
 */

export class DataSanitizer {
  /**
   * Sanitize error messages to remove sensitive information
   */
  sanitizeError(error: Error): { code: string; message: string } {
    const message = error.message;
    
    // Categorize error types
    let code = 'UNKNOWN_ERROR';
    
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      code = 'TIMEOUT';
    } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('unreachable')) {
      code = 'UNREACHABLE';
    } else if (message.includes('validation') || message.includes('invalid')) {
      code = 'VALIDATION_ERROR';
    } else if (message.includes('unauthorized') || message.includes('401')) {
      code = 'UNAUTHORIZED';
    } else if (message.includes('forbidden') || message.includes('403')) {
      code = 'FORBIDDEN';
    } else if (message.includes('not found') || message.includes('404')) {
      code = 'NOT_FOUND';
    } else if (message.includes('rate limit') || message.includes('429')) {
      code = 'RATE_LIMITED';
    } else if (message.includes('server error') || message.includes('500')) {
      code = 'SERVER_ERROR';
    } else if (message.includes('network') || message.includes('connection')) {
      code = 'NETWORK_ERROR';
    }

    // Sanitize the message
    let sanitizedMessage = message
      // Remove file paths
      .replace(/\/[^\s]+/g, '/[PATH]')
      // Remove IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      // Remove email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      // Remove tokens and keys
      .replace(/[A-Za-z0-9]{20,}/g, '[TOKEN]')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      // Remove database connection strings
      .replace(/postgresql:\/\/[^\s]+/g, '[DB_URL]')
      // Remove API keys
      .replace(/[A-Za-z0-9]{32,}/g, '[API_KEY]')
      // Truncate very long messages
      .substring(0, 500);

    return { code, message: sanitizedMessage };
  }

  /**
   * Anonymize IP address by keeping only first 3 octets
   */
  anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  /**
   * Analyze input/output data without storing sensitive content
   */
  analyzeInputOutput(data: any): {
    size: number;
    type: string;
    structure?: Record<string, unknown>;
  } {
    try {
      const jsonString = JSON.stringify(data);
      const size = new Blob([jsonString]).size;
      
      // Determine data type
      let type = 'unknown';
      if (typeof data === 'string') {
        type = 'text';
      } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
          type = 'array';
        } else {
          type = 'object';
        }
      } else if (typeof data === 'number') {
        type = 'number';
      } else if (typeof data === 'boolean') {
        type = 'boolean';
      }

      // Analyze structure for objects
      let structure: Record<string, unknown> | undefined;
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        structure = this.analyzeObjectStructure(data);
      }

      return { size, type, structure };
    } catch (error) {
      return { size: 0, type: 'error' };
    }
  }

  /**
   * Analyze object structure without storing sensitive data
   */
  private analyzeObjectStructure(obj: Record<string, unknown>, maxDepth: number = 3, currentDepth: number = 0): Record<string, unknown> {
    if (currentDepth >= maxDepth) {
      return { '[truncated]': '...' };
    }

    const structure: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        structure[key] = '[REDACTED]';
        continue;
      }

      if (value === null) {
        structure[key] = 'null';
      } else if (typeof value === 'string') {
        // Check if it looks like sensitive data
        if (this.looksLikeSensitiveData(value)) {
          structure[key] = '[REDACTED]';
        } else {
          structure[key] = `string(${value.length})`;
        }
      } else if (typeof value === 'number') {
        structure[key] = 'number';
      } else if (typeof value === 'boolean') {
        structure[key] = 'boolean';
      } else if (Array.isArray(value)) {
        structure[key] = `array(${value.length})`;
      } else if (typeof value === 'object') {
        structure[key] = this.analyzeObjectStructure(value as Record<string, unknown>, maxDepth, currentDepth + 1);
      } else {
        structure[key] = typeof value;
      }
    }

    return structure;
  }

  /**
   * Check if a key looks sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'auth',
      'credential', 'private', 'sensitive', 'confidential', 'ssn',
      'social', 'credit', 'card', 'bank', 'account', 'email', 'phone',
      'address', 'name', 'id', 'uuid', 'session', 'cookie'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  /**
   * Check if a value looks like sensitive data
   */
  private looksLikeSensitiveData(value: string): boolean {
    // Check for common patterns
    const patterns = [
      /^[A-Za-z0-9]{20,}$/, // Long alphanumeric strings (tokens)
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/, // Email
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IP address
      /^https?:\/\/.+/, // URLs
      /^postgresql:\/\/.+/, // Database URLs
      /^[A-Za-z0-9]{32,}$/ // Long hex strings (API keys)
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitize user agent string
   */
  sanitizeUserAgent(userAgent: string): string {
    // Remove version numbers and specific browser details
    return userAgent
      .replace(/\d+\.\d+\.\d+/g, 'X.X.X') // Version numbers
      .replace(/\([^)]*\)/g, '(OS)') // OS details
      .substring(0, 100); // Truncate
  }

  /**
   * Sanitize session ID
   */
  sanitizeSessionId(sessionId: string): string {
    // Keep only first 8 characters for analytics
    return sessionId.substring(0, 8) + '...';
  }

  /**
   * Sanitize context data for logging
   */
  sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && this.looksLikeSensitiveData(value)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.analyzeObjectStructure(value as Record<string, unknown>, 2);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}
