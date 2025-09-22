# Database Enhancement Plan: Agent Metrics & Logs Tracking

## 🎯 Goals
1. **Track agent performance metrics** (success rate, response time, usage patterns)
2. **Log agent executions** with metadata but without sensitive data
3. **Monitor user behavior** and agent popularity
4. **Enable analytics** for agent optimization and marketplace insights

## 📊 Current State Analysis

### ✅ Existing Capabilities
- Basic agent stats in `Agent.stats` JSON field
- Transaction tracking via `Transaction` and `AuditLog` tables
- Credit balance management in `User` table
- Basic execution metrics (counts, timing)

### ❌ Missing Capabilities
- Detailed execution logs without sensitive data
- Historical metrics trends over time
- User behavior analytics
- Performance monitoring and alerting
- Error categorization and tracking
- Input/output data patterns (anonymized)
- Agent comparison and ranking

## 🗄️ Proposed Database Schema

### 1. **AgentExecution** Table
```prisma
model AgentExecution {
  id              String   @id @default(cuid())
  agentId         String
  userId          String
  executionId     String   @unique // From StandardAgentOutput
  status          String   // "success", "failed", "timeout", "error"
  duration        Int      // Execution time in milliseconds
  creditsConsumed Int      // Credits deducted
  httpStatus      Int?     // HTTP response status
  errorCode       String?  // Categorized error type
  errorMessage    String?  // Sanitized error message
  
  // Input/Output Metadata (no sensitive data)
  inputSize       Int?     // Size of input data in bytes
  outputSize      Int?     // Size of output data in bytes
  inputType       String?  // "text", "json", "file", etc.
  outputType      String?  // "text", "json", "file", etc.
  
  // Performance Metrics
  responseTime    Int?     // Network response time
  processingTime  Int?     // Agent processing time
  queueTime       Int?     // Time spent in queue
  
  // User Context
  sessionId       String?  // User session identifier
  userAgent       String?  // Client user agent
  ipAddress       String?  // Anonymized IP (first 3 octets)
  
  // Timestamps
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  
  // Relations
  agent           Agent    @relation(fields: [agentId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  
  @@index([agentId, createdAt])
  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([executionId])
}
```

### 2. **AgentMetrics** Table (Time-series data)
```prisma
model AgentMetrics {
  id              String   @id @default(cuid())
  agentId         String
  date            DateTime // Date for aggregation (YYYY-MM-DD)
  hour            Int?     // Hour for hourly aggregation (0-23)
  
  // Execution Counts
  totalExecutions Int      @default(0)
  successfulExecutions Int @default(0)
  failedExecutions     Int @default(0)
  timeoutExecutions    Int @default(0)
  errorExecutions      Int @default(0)
  
  // Performance Metrics
  avgDuration     Float?   // Average execution time
  minDuration     Int?     // Minimum execution time
  maxDuration     Int?     // Maximum execution time
  p95Duration     Int?     // 95th percentile duration
  p99Duration     Int?     // 99th percentile duration
  
  // Usage Metrics
  uniqueUsers     Int      @default(0)
  totalCreditsConsumed Int @default(0)
  avgCreditsPerExecution Float?
  
  // Error Analysis
  errorCounts     Json?    // { "TIMEOUT": 5, "UNREACHABLE": 2, ... }
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  agent           Agent    @relation(fields: [agentId], references: [id])
  
  @@unique([agentId, date, hour])
  @@index([agentId, date])
  @@index([date])
}
```

### 3. **AgentLog** Table (Detailed execution logs)
```prisma
model AgentLog {
  id              String   @id @default(cuid())
  executionId     String   // Links to AgentExecution
  agentId         String
  userId          String
  
  // Log Categories
  category        String   // "execution", "error", "performance", "user_action"
  level           String   // "info", "warn", "error", "debug"
  message         String   // Sanitized log message
  
  // Context Data (anonymized)
  context         Json?    // Additional context without sensitive data
  metadata        Json?    // Execution metadata
  
  // Timestamps
  timestamp       DateTime @default(now())
  
  // Relations
  agent           Agent    @relation(fields: [agentId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  
  @@index([executionId])
  @@index([agentId, timestamp])
  @@index([category, level, timestamp])
}
```

### 4. **UserAgentInteraction** Table (User behavior tracking)
```prisma
model UserAgentInteraction {
  id              String   @id @default(cuid())
  userId          String
  agentId         String
  
  // Interaction Metrics
  totalExecutions Int      @default(0)
  successfulExecutions Int @default(0)
  lastExecutedAt  DateTime?
  firstExecutedAt DateTime?
  
  // User Preferences
  isFavorite      Boolean  @default(false)
  rating          Int?     // 1-5 star rating
  feedback        String?  // User feedback text
  
  // Usage Patterns
  avgExecutionsPerDay Float?
  preferredTimeOfDay  Int?   // Hour of day (0-23)
  preferredDayOfWeek  Int?   // Day of week (0-6)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  user            User     @relation(fields: [userId], references: [id])
  agent           Agent    @relation(fields: [agentId], references: [id])
  
  @@unique([userId, agentId])
  @@index([userId, lastExecutedAt])
  @@index([agentId, totalExecutions])
}
```

### 5. **Updated Agent Table**
```prisma
model Agent {
  // ... existing fields ...
  
  // New relations
  executions      AgentExecution[]
  metrics         AgentMetrics[]
  logs            AgentLog[]
  userInteractions UserAgentInteraction[]
  
  // Computed fields (updated via triggers or background jobs)
  lastExecutedAt  DateTime?
  totalExecutions Int       @default(0)
  avgRating       Float?    // Computed from UserAgentInteraction
  totalUsers      Int       @default(0)
}
```

## 🔄 Data Flow & Collection Strategy

### 1. **Execution Tracking**
- Capture every agent execution in `AgentExecution`
- Log detailed execution data in `AgentLog`
- Update real-time metrics in `AgentMetrics`
- Track user interactions in `UserAgentInteraction`

### 2. **Data Anonymization**
- **Input/Output**: Store only size, type, and structure patterns
- **IP Addresses**: Store only first 3 octets (e.g., 192.168.1.xxx)
- **User Data**: Use session IDs, not personal information
- **Error Messages**: Sanitize to remove sensitive paths/tokens

### 3. **Metrics Aggregation**
- **Real-time**: Update `AgentMetrics` on each execution
- **Hourly**: Aggregate metrics by hour for detailed analysis
- **Daily**: Aggregate metrics by day for long-term trends
- **Background Jobs**: Clean up old logs, compute derived metrics

## 📈 Analytics Capabilities

### 1. **Agent Performance Dashboard**
- Success rate trends over time
- Response time percentiles
- Error rate by category
- Usage patterns and peak times

### 2. **User Behavior Analytics**
- Most popular agents
- User retention and repeat usage
- Agent discovery patterns
- Feedback and rating trends

### 3. **Marketplace Insights**
- Agent comparison metrics
- Pricing optimization data
- Feature usage statistics
- Performance benchmarking

## 🚀 Implementation Phases

### Phase 1: Core Tables
1. Create `AgentExecution` table
2. Update existing execution endpoints to log data
3. Add basic metrics collection

### Phase 2: Analytics Tables
1. Create `AgentMetrics` and `AgentLog` tables
2. Implement metrics aggregation
3. Add user interaction tracking

### Phase 3: Advanced Features
1. Create `UserAgentInteraction` table
2. Implement background jobs for data processing
3. Add analytics API endpoints

### Phase 4: Optimization
1. Add database indexes for performance
2. Implement data retention policies
3. Add monitoring and alerting

## 🔒 Privacy & Security Considerations

### Data Minimization
- Only collect necessary metrics
- Anonymize all personal data
- Implement data retention policies
- Regular data cleanup

### Access Control
- Role-based access to analytics
- Audit logs for data access
- Encrypt sensitive metrics
- Regular security reviews

## 📊 Expected Benefits

1. **Agent Optimization**: Data-driven improvements
2. **User Experience**: Better agent recommendations
3. **Marketplace Health**: Performance monitoring
4. **Business Intelligence**: Usage patterns and trends
5. **Debugging**: Detailed execution logs
6. **Compliance**: Audit trails and data governance
