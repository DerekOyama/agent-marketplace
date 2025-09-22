/**
 * Comprehensive Audit Logging System
 * Provides centralized audit trail for all system changes and events
 */

import { prisma } from './prisma';

export interface AuditLogData {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string;
  changeType: 'create' | 'update' | 'delete';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemErrorData {
  errorCode: string;
  errorType: 'validation' | 'business' | 'system' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  agentId?: string;
  userId?: string;
  executionId?: string;
  requestId?: string;
  message: string;
  details?: Record<string, unknown>;
  stackTrace?: string;
}

export interface SystemMetricData {
  metric: string;
  value: number;
  component: string;
  unit?: string;
  tags?: Record<string, unknown>;
}

export class AuditLogger {
  /**
   * Log agent configuration changes
   */
  async logAgentChange(
    agentId: string, 
    auditData: AuditLogData
  ): Promise<void> {
    try {
      await prisma.agentAuditLog.create({
        data: {
          agentId,
          field: auditData.field,
          oldValue: auditData.oldValue ? JSON.parse(JSON.stringify(auditData.oldValue)) : null,
          newValue: auditData.newValue ? JSON.parse(JSON.stringify(auditData.newValue)) : null,
          changedBy: auditData.changedBy,
          changeType: auditData.changeType,
          reason: auditData.reason,
          metadata: auditData.metadata ? JSON.parse(JSON.stringify(auditData.metadata)) : null
        }
      });

      console.log(`📝 Agent audit logged: ${agentId} - ${auditData.field} (${auditData.changeType})`);
    } catch (error) {
      console.error('❌ Failed to log agent audit:', error);
    }
  }

  /**
   * Log user profile changes
   */
  async logUserChange(
    userId: string, 
    auditData: AuditLogData
  ): Promise<void> {
    try {
      await prisma.userAuditLog.create({
        data: {
          userId,
          field: auditData.field,
          oldValue: auditData.oldValue ? JSON.parse(JSON.stringify(auditData.oldValue)) : null,
          newValue: auditData.newValue ? JSON.parse(JSON.stringify(auditData.newValue)) : null,
          changedBy: auditData.changedBy,
          changeType: auditData.changeType,
          reason: auditData.reason,
          metadata: auditData.metadata ? JSON.parse(JSON.stringify(auditData.metadata)) : null
        }
      });

      console.log(`📝 User audit logged: ${userId} - ${auditData.field} (${auditData.changeType})`);
    } catch (error) {
      console.error('❌ Failed to log user audit:', error);
    }
  }

  /**
   * Log mandate changes
   */
  async logMandateChange(
    mandateId: string, 
    auditData: AuditLogData & { changedBy: string }
  ): Promise<void> {
    try {
      await prisma.mandateAuditLog.create({
        data: {
          mandateId,
          field: auditData.field,
          oldValue: auditData.oldValue ? JSON.parse(JSON.stringify(auditData.oldValue)) : null,
          newValue: auditData.newValue ? JSON.parse(JSON.stringify(auditData.newValue)) : null,
          changedBy: auditData.changedBy,
          changeType: auditData.changeType,
          reason: auditData.reason,
          metadata: auditData.metadata ? JSON.parse(JSON.stringify(auditData.metadata)) : null
        }
      });

      console.log(`📝 Mandate audit logged: ${mandateId} - ${auditData.field} (${auditData.changeType})`);
    } catch (error) {
      console.error('❌ Failed to log mandate audit:', error);
    }
  }

  /**
   * Log system errors
   */
  async logSystemError(errorData: SystemErrorData): Promise<string> {
    try {
      const error = await prisma.systemErrors.create({
        data: {
          errorCode: errorData.errorCode,
          errorType: errorData.errorType,
          severity: errorData.severity,
          component: errorData.component,
          agentId: errorData.agentId,
          userId: errorData.userId,
          executionId: errorData.executionId,
          requestId: errorData.requestId,
          message: errorData.message,
          details: errorData.details ? JSON.parse(JSON.stringify(errorData.details)) : null,
          stackTrace: errorData.stackTrace
        }
      });

      console.log(`🚨 System error logged: ${errorData.errorCode} - ${errorData.component} (${errorData.severity})`);
      return error.id;
    } catch (error) {
      console.error('❌ Failed to log system error:', error);
      return '';
    }
  }

  /**
   * Log system metrics
   */
  async logSystemMetric(metricData: SystemMetricData): Promise<void> {
    try {
      await prisma.systemMetrics.create({
        data: {
          metric: metricData.metric,
          value: metricData.value,
          component: metricData.component,
          unit: metricData.unit,
          tags: metricData.tags ? JSON.parse(JSON.stringify(metricData.tags)) : null
        }
      });

      console.log(`📊 System metric logged: ${metricData.metric} - ${metricData.value} ${metricData.unit || ''}`);
    } catch (error) {
      console.error('❌ Failed to log system metric:', error);
    }
  }

  /**
   * Resolve a system error
   */
  async resolveSystemError(
    errorId: string, 
    resolvedBy: string, 
    resolution?: string
  ): Promise<void> {
    try {
      await prisma.systemErrors.update({
        where: { id: errorId },
        data: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
          ...(resolution && { 
            details: {
              resolution,
              resolvedAt: new Date().toISOString()
            }
          })
        }
      });

      console.log(`✅ System error resolved: ${errorId} by ${resolvedBy}`);
    } catch (error) {
      console.error('❌ Failed to resolve system error:', error);
    }
  }

  /**
   * Get audit logs for an agent
   */
  async getAgentAuditLogs(
    agentId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const logs = await prisma.agentAuditLog.findMany({
        where: { agentId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.agentAuditLog.count({
        where: { agentId }
      });

      return { logs, total, hasMore: offset + limit < total };
    } catch (error) {
      console.error('❌ Failed to get agent audit logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const logs = await prisma.userAuditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.userAuditLog.count({
        where: { userId }
      });

      return { logs, total, hasMore: offset + limit < total };
    } catch (error) {
      console.error('❌ Failed to get user audit logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get system errors
   */
  async getSystemErrors(
    filters: {
      severity?: string;
      component?: string;
      errorType?: string;
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const logs = await prisma.systemErrors.findMany({
        where: {
          ...(filters.severity && { severity: filters.severity }),
          ...(filters.component && { component: filters.component }),
          ...(filters.errorType && { errorType: filters.errorType }),
          ...(filters.resolved !== undefined && { resolved: filters.resolved }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.systemErrors.count({
        where: {
          ...(filters.severity && { severity: filters.severity }),
          ...(filters.component && { component: filters.component }),
          ...(filters.errorType && { errorType: filters.errorType }),
          ...(filters.resolved !== undefined && { resolved: filters.resolved }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        }
      });

      return { logs, total, hasMore: offset + limit < total };
    } catch (error) {
      console.error('❌ Failed to get system errors:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(
    filters: {
      metric?: string;
      component?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 100,
    offset: number = 0
  ) {
    try {
      const metrics = await prisma.systemMetrics.findMany({
        where: {
          ...(filters.metric && { metric: filters.metric }),
          ...(filters.component && { component: filters.component }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.systemMetrics.count({
        where: {
          ...(filters.metric && { metric: filters.metric }),
          ...(filters.component && { component: filters.component }),
          ...(filters.startDate && filters.endDate && {
            timestamp: {
              gte: filters.startDate,
              lte: filters.endDate
            }
          })
        }
      });

      return { metrics, total, hasMore: offset + limit < total };
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      return { metrics: [], total: 0, hasMore: false };
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
