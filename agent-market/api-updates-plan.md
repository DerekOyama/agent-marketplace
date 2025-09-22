# API Updates Plan: Agent Metrics & Logs Collection

## 🎯 Overview
Update existing API endpoints to collect metrics and logs data while maintaining backward compatibility.

## 📋 API Endpoints to Update

### **1. Agent Execution Endpoints**

#### **`/api/n8n/execute` (POST)**
**Current**: Executes n8n workflows and returns results
**Updates**: Add comprehensive metrics collection

```typescript
// New data collection points:
- Execution start/end timestamps
- Input/output size and type analysis
- Error categorization and sanitization
- Performance metrics (response time, processing time)
- User context (session, IP anonymization)
- Credit consumption tracking
```

#### **`/api/transactions/[id]/dispatch` (POST)**
**Current**: Dispatches transactions to agents
**Updates**: Add execution logging and metrics

```typescript
// New data collection points:
- Agent execution tracking
- User interaction logging
- Performance monitoring
- Error handling and categorization
```

### **2. New Analytics Endpoints**

#### **`/api/analytics/agents/[id]/metrics` (GET)**
```typescript
// Query parameters:
- period: "hour" | "day" | "week" | "month"
- startDate: ISO date string
- endDate: ISO date string
- metric: "executions" | "performance" | "errors" | "users"

// Response:
{
  agentId: string;
  period: string;
  data: {
    executions: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    performance: {
      avgDuration: number;
      p95Duration: number;
      p99Duration: number;
    };
    errors: {
      [errorCode: string]: number;
    };
    users: {
      unique: number;
      repeat: number;
    };
  };
  timestamps: string[];
}
```

#### **`/api/analytics/agents/[id]/logs` (GET)**
```typescript
// Query parameters:
- executionId?: string
- category?: "execution" | "error" | "performance" | "user_action"
- level?: "info" | "warn" | "error" | "debug"
- limit?: number (default: 100)
- offset?: number (default: 0)

// Response:
{
  logs: Array<{
    id: string;
    executionId: string;
    category: string;
    level: string;
    message: string;
    context?: Record<string, unknown>;
    timestamp: string;
  }>;
  total: number;
  hasMore: boolean;
}
```

#### **`/api/analytics/dashboard` (GET)**
```typescript
// Response:
{
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    successRate: number;
    avgResponseTime: number;
  };
  topAgents: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
    avgRating: number;
  }>;
  recentActivity: Array<{
    agentId: string;
    agentName: string;
    userId: string;
    status: string;
    timestamp: string;
  }>;
}
```

## 🔧 Implementation Details

### **1. Metrics Collection Service**

```typescript
// lib/metrics-collector.ts
export class MetricsCollector {
  async recordExecution(executionData: {
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
  }) {
    // Record in AgentExecution table
    // Update AgentMetrics aggregation
    // Log detailed execution data
    // Update UserAgentInteraction
  }

  async logExecution(executionId: string, logData: {
    category: 'execution' | 'error' | 'performance' | 'user_action';
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    // Record in AgentLog table
  }

  async updateUserInteraction(userId: string, agentId: string, data: {
    isSuccessful: boolean;
    rating?: number;
    feedback?: string;
  }) {
    // Update UserAgentInteraction table
  }
}
```

### **2. Data Sanitization Service**

```typescript
// lib/data-sanitizer.ts
export class DataSanitizer {
  sanitizeError(error: Error): { code: string; message: string } {
    // Categorize errors (TIMEOUT, UNREACHABLE, VALIDATION, etc.)
    // Remove sensitive information from error messages
    // Return sanitized error data
  }

  anonymizeIP(ip: string): string {
    // Return first 3 octets only (e.g., 192.168.1.xxx)
  }

  analyzeInputOutput(data: any): {
    size: number;
    type: string;
    structure?: Record<string, unknown>;
  } {
    // Analyze input/output data without storing sensitive content
    // Return metadata about structure and size
  }
}
```

### **3. Updated Execution Endpoints**

#### **Enhanced `/api/n8n/execute`**

```typescript
// app/api/n8n/execute/route.ts
import { MetricsCollector } from '../../../lib/metrics-collector';
import { DataSanitizer } from '../../../lib/data-sanitizer';

const metricsCollector = new MetricsCollector();
const dataSanitizer = new DataSanitizer();

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // ... existing execution logic ...
    
    // Collect metrics on success
    await metricsCollector.recordExecution({
      agentId,
      userId,
      executionId,
      status: 'success',
      duration: Date.now() - startTime,
      creditsConsumed: executionCostCents,
      httpStatus: response.status,
      inputSize: JSON.stringify(inputData).length,
      outputSize: responseData?.length || 0,
      inputType: 'json',
      outputType: 'json',
      responseTime: responseTime,
      processingTime: processingTime,
      sessionId,
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: dataSanitizer.anonymizeIP(clientIP)
    });

    // Log execution details
    await metricsCollector.logExecution(executionId, {
      category: 'execution',
      level: 'info',
      message: 'Agent execution completed successfully',
      context: {
        agentName: agent.name,
        executionTime: Date.now() - startTime,
        creditsConsumed: executionCostCents
      }
    });

    // Update user interaction
    await metricsCollector.updateUserInteraction(userId, agentId, {
      isSuccessful: true
    });

    return NextResponse.json(finalResponse);
    
  } catch (error) {
    // Collect metrics on failure
    const sanitizedError = dataSanitizer.sanitizeError(error);
    
    await metricsCollector.recordExecution({
      agentId,
      userId,
      executionId,
      status: 'error',
      duration: Date.now() - startTime,
      creditsConsumed: 0,
      errorCode: sanitizedError.code,
      errorMessage: sanitizedError.message,
      sessionId,
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: dataSanitizer.anonymizeIP(clientIP)
    });

    // Log error details
    await metricsCollector.logExecution(executionId, {
      category: 'error',
      level: 'error',
      message: 'Agent execution failed',
      context: {
        agentName: agent.name,
        errorCode: sanitizedError.code,
        executionTime: Date.now() - startTime
      }
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

### **4. New Analytics Endpoints**

#### **`/api/analytics/agents/[id]/metrics`**

```typescript
// app/api/analytics/agents/[id]/metrics/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { searchParams } = new URL(req.url);
  
  const period = searchParams.get('period') || 'day';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const metric = searchParams.get('metric') || 'executions';

  try {
    // Query AgentMetrics table based on parameters
    const metrics = await prisma.agentMetrics.findMany({
      where: {
        agentId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      },
      orderBy: { date: 'asc' }
    });

    // Aggregate data based on period and metric type
    const aggregatedData = aggregateMetrics(metrics, period, metric);

    return NextResponse.json({
      agentId,
      period,
      data: aggregatedData,
      timestamps: metrics.map(m => m.date.toISOString())
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

#### **`/api/analytics/dashboard`**

```typescript
// app/api/analytics/dashboard/route.ts
export async function GET() {
  try {
    // Get overview metrics
    const overview = await prisma.agentMetrics.aggregate({
      _sum: {
        totalExecutions: true,
        successfulExecutions: true
      },
      _avg: {
        avgDuration: true
      }
    });

    // Get top agents by execution count
    const topAgents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        totalExecutions: true,
        avgRating: true
      },
      orderBy: { totalExecutions: 'desc' },
      take: 10
    });

    // Get recent activity
    const recentActivity = await prisma.agentExecution.findMany({
      include: {
        agent: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      overview: {
        totalAgents: await prisma.agent.count(),
        activeAgents: await prisma.agent.count({ where: { isActive: true } }),
        totalExecutions: overview._sum.totalExecutions || 0,
        successRate: overview._sum.totalExecutions 
          ? (overview._sum.successfulExecutions || 0) / overview._sum.totalExecutions
          : 0,
        avgResponseTime: overview._avg.avgDuration || 0
      },
      topAgents: topAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        executions: agent.totalExecutions,
        successRate: 0, // Calculate from metrics
        avgRating: agent.avgRating || 0
      })),
      recentActivity: recentActivity.map(exec => ({
        agentId: exec.agentId,
        agentName: exec.agent.name,
        userId: exec.userId,
        status: exec.status,
        timestamp: exec.createdAt.toISOString()
      }))
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
```

## 🔄 Migration Strategy

### **Phase 1: Add Collection (No Breaking Changes)**
1. Add new tables to database
2. Update Prisma schema
3. Add metrics collection to existing endpoints
4. Deploy with feature flags (disabled by default)

### **Phase 2: Enable Collection**
1. Enable metrics collection via feature flags
2. Monitor data collection and performance
3. Validate data integrity

### **Phase 3: Add Analytics APIs**
1. Create new analytics endpoints
2. Update UI to display new metrics
3. Add real-time updates

### **Phase 4: Optimization**
1. Add database indexes for performance
2. Implement caching for frequently accessed data
3. Add data retention policies

## 📊 Data Flow

```
User Action → API Endpoint → Metrics Collector → Database Tables
                ↓
            Data Sanitizer → AgentLog
                ↓
            User Interaction → UserAgentInteraction
                ↓
            Background Job → AgentMetrics (aggregation)
```

## 🔒 Privacy & Security

### **Data Anonymization**
- IP addresses: First 3 octets only
- Error messages: Sanitized to remove sensitive paths
- User data: Session-based, not personal information
- Input/Output: Size and type only, no content

### **Access Control**
- Analytics endpoints: Role-based access
- Logs: Filtered by user permissions
- Metrics: Aggregated data only
- Audit trail: All access logged

## 📈 Performance Considerations

### **Database Optimization**
- Indexes on frequently queried columns
- Partitioning for large tables (AgentMetrics by date)
- Data retention policies (keep logs for 90 days)
- Background aggregation jobs

### **Caching Strategy**
- Redis cache for dashboard data
- CDN for static analytics
- Real-time updates via WebSocket
- Batch processing for metrics aggregation
