import { PrismaClient } from '@prisma/client';
import { DataSanitizer } from './data-sanitizer';

const prisma = new PrismaClient();
const dataSanitizer = new DataSanitizer();

export interface ExecutionData {
  agentId: string;
  userId: string;
  executionId: string;
  status: 'success' | 'failed' | 'timeout' | 'error';
  duration: number;
  creditsConsumed: number;
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  inputSize?: number;
  outputSize?: number;
  inputType?: string;
  outputType?: string;
  responseTime?: number;
  processingTime?: number;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LogData {
  executionId: string;
  agentId: string;
  userId: string;
  category: 'execution' | 'error' | 'performance' | 'user_action';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UserInteractionData {
  userId: string;
  agentId: string;
  isSuccessful: boolean;
  rating?: number;
  feedback?: string;
}

export class MetricsCollector {
  /**
   * Record agent execution data
   */
  async recordExecution(executionData: ExecutionData): Promise<void> {
    try {
      // Sanitize error message if present
      const sanitizedErrorMessage = executionData.errorMessage 
        ? dataSanitizer.sanitizeError(new Error(executionData.errorMessage)).message
        : executionData.errorMessage;

      // Anonymize IP address
      const anonymizedIP = executionData.ipAddress 
        ? dataSanitizer.anonymizeIP(executionData.ipAddress)
        : executionData.ipAddress;

      // Create execution record
      const execution = await prisma.agentExecution.create({
        data: {
          agentId: executionData.agentId,
          userId: executionData.userId,
          executionId: executionData.executionId,
          status: executionData.status,
          duration: executionData.duration,
          creditsConsumed: executionData.creditsConsumed,
          httpStatus: executionData.httpStatus,
          errorCode: executionData.errorCode,
          errorMessage: sanitizedErrorMessage,
          inputSize: executionData.inputSize,
          outputSize: executionData.outputSize,
          inputType: executionData.inputType,
          outputType: executionData.outputType,
          responseTime: executionData.responseTime,
          processingTime: executionData.processingTime,
          sessionId: executionData.sessionId,
          userAgent: executionData.userAgent,
          ipAddress: anonymizedIP,
          completedAt: new Date()
        }
      });

      // Update agent computed fields
      await this.updateAgentStats(executionData.agentId, executionData.status);

      // Update metrics aggregation
      await this.updateMetrics(executionData.agentId, executionData.status, executionData.duration);

      // Update user interaction
      await this.updateUserInteraction(executionData.userId, executionData.agentId, {
        isSuccessful: executionData.status === 'success'
      });

      console.log(`📊 Recorded execution: ${execution.id} for agent ${executionData.agentId}`);

    } catch (error) {
      console.error('❌ Failed to record execution:', error);
      // Don't throw - metrics collection should not break the main flow
    }
  }

  /**
   * Log execution details
   */
  async logExecution(logData: LogData): Promise<void> {
    try {
      await prisma.agentLog.create({
        data: {
          executionId: logData.executionId,
          agentId: logData.agentId,
          userId: logData.userId,
          category: logData.category,
          level: logData.level,
          message: logData.message,
          context: logData.context ? JSON.parse(JSON.stringify(logData.context)) : null,
          metadata: logData.metadata ? JSON.parse(JSON.stringify(logData.metadata)) : null
        }
      });

      console.log(`📝 Logged execution: ${logData.category}/${logData.level} for ${logData.executionId}`);

    } catch (error) {
      console.error('❌ Failed to log execution:', error);
    }
  }

  /**
   * Update user interaction data
   */
  async updateUserInteraction(
    userId: string, 
    agentId: string, 
    data: UserInteractionData
  ): Promise<void> {
    try {
      await prisma.userAgentInteraction.upsert({
        where: {
          userId_agentId: {
            userId,
            agentId
          }
        },
        create: {
          userId,
          agentId,
          totalExecutions: 1,
          successfulExecutions: data.isSuccessful ? 1 : 0,
          firstExecutedAt: new Date(),
          lastExecutedAt: new Date(),
          rating: data.rating,
          feedback: data.feedback
        },
        update: {
          totalExecutions: { increment: 1 },
          successfulExecutions: data.isSuccessful ? { increment: 1 } : undefined,
          lastExecutedAt: new Date(),
          rating: data.rating,
          feedback: data.feedback
        }
      });

    } catch (error) {
      console.error('❌ Failed to update user interaction:', error);
    }
  }

  /**
   * Update agent computed stats
   */
  private async updateAgentStats(agentId: string, status: string): Promise<void> {
    try {
      const isSuccess = status === 'success';
      
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          totalExecutions: { increment: 1 },
          lastExecutedAt: new Date()
        }
      });

      // Update total users count
      const uniqueUsers = await prisma.userAgentInteraction.count({
        where: { agentId }
      });

      await prisma.agent.update({
        where: { id: agentId },
        data: { totalUsers: uniqueUsers }
      });

    } catch (error) {
      console.error('❌ Failed to update agent stats:', error);
    }
  }

  /**
   * Update metrics aggregation
   */
  private async updateMetrics(agentId: string, status: string, duration: number): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      
      const hour = new Date().getHours();
      const isSuccess = status === 'success';
      const isError = status === 'error';
      const isTimeout = status === 'timeout';

      // Get or create today's metrics
      const existingMetrics = await prisma.agentMetrics.findUnique({
        where: {
          agentId_date_hour: {
            agentId,
            date: today,
            hour
          }
        }
      });

      if (existingMetrics) {
        // Update existing metrics
        await prisma.agentMetrics.update({
          where: { id: existingMetrics.id },
          data: {
            totalExecutions: { increment: 1 },
            successfulExecutions: isSuccess ? { increment: 1 } : undefined,
            failedExecutions: !isSuccess ? { increment: 1 } : undefined,
            timeoutExecutions: isTimeout ? { increment: 1 } : undefined,
            errorExecutions: isError ? { increment: 1 } : undefined,
            avgDuration: this.calculateNewAverage(existingMetrics.avgDuration, duration, existingMetrics.totalExecutions),
            minDuration: existingMetrics.minDuration ? Math.min(existingMetrics.minDuration, duration) : duration,
            maxDuration: existingMetrics.maxDuration ? Math.max(existingMetrics.maxDuration, duration) : duration,
            totalCreditsConsumed: { increment: 50 }, // Standard cost
            avgCreditsPerExecution: existingMetrics.totalCreditsConsumed / (existingMetrics.totalExecutions + 1),
            errorCounts: isError ? this.updateErrorCounts(existingMetrics.errorCounts, status) : undefined,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new metrics record
        await prisma.agentMetrics.create({
          data: {
            agentId,
            date: today,
            hour,
            totalExecutions: 1,
            successfulExecutions: isSuccess ? 1 : 0,
            failedExecutions: !isSuccess ? 1 : 0,
            timeoutExecutions: isTimeout ? 1 : 0,
            errorExecutions: isError ? 1 : 0,
            avgDuration: duration,
            minDuration: duration,
            maxDuration: duration,
            totalCreditsConsumed: 50,
            avgCreditsPerExecution: 50,
            errorCounts: isError ? { [status.toUpperCase()]: 1 } : null
          }
        });
      }

    } catch (error) {
      console.error('❌ Failed to update metrics:', error);
    }
  }

  /**
   * Calculate new average duration
   */
  private calculateNewAverage(currentAvg: number | null, newValue: number, currentCount: number): number {
    if (currentAvg === null) return newValue;
    return (currentAvg * currentCount + newValue) / (currentCount + 1);
  }

  /**
   * Update error counts in JSON field
   */
  private updateErrorCounts(currentCounts: any, status: string): any {
    const counts = currentCounts || {};
    const errorKey = status.toUpperCase();
    counts[errorKey] = (counts[errorKey] || 0) + 1;
    return counts;
  }

  /**
   * Get agent metrics for a specific period
   */
  async getAgentMetrics(
    agentId: string, 
    startDate: Date, 
    endDate: Date, 
    period: 'hour' | 'day' = 'day'
  ) {
    try {
      const metrics = await prisma.agentMetrics.findMany({
        where: {
          agentId,
          date: {
            gte: startDate,
            lte: endDate
          },
          ...(period === 'hour' ? {} : { hour: null }) // Only daily records for 'day' period
        },
        orderBy: { date: 'asc' }
      });

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get agent metrics:', error);
      return [];
    }
  }

  /**
   * Get agent execution logs
   */
  async getAgentLogs(
    agentId: string,
    executionId?: string,
    category?: string,
    level?: string,
    limit: number = 100,
    offset: number = 0
  ) {
    try {
      const logs = await prisma.agentLog.findMany({
        where: {
          agentId,
          ...(executionId ? { executionId } : {}),
          ...(category ? { category } : {}),
          ...(level ? { level } : {})
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.agentLog.count({
        where: {
          agentId,
          ...(executionId ? { executionId } : {}),
          ...(category ? { category } : {}),
          ...(level ? { level } : {})
        }
      });

      return { logs, total, hasMore: offset + limit < total };
    } catch (error) {
      console.error('❌ Failed to get agent logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }
}
