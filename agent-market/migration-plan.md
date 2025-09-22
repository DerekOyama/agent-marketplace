# Database Migration Plan: Agent Metrics & Logs Tracking

## 🎯 Migration Strategy

### **Phase 1: Safe Schema Addition (No Data Loss)**
Add new tables without modifying existing ones to ensure zero downtime.

### **Phase 2: Gradual Data Population**
Start collecting metrics data while maintaining existing functionality.

### **Phase 3: Schema Optimization**
Add computed fields and indexes for performance.

## 📋 Step-by-Step Migration Plan

### **Step 1: Backup Current Database**
```bash
# Create database backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Step 2: Add New Tables (Safe)**
```sql
-- These tables are completely new, no risk to existing data
CREATE TABLE "AgentExecution" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "executionId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "creditsConsumed" INTEGER NOT NULL,
  "httpStatus" INTEGER,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "inputSize" INTEGER,
  "outputSize" INTEGER,
  "inputType" TEXT,
  "outputType" TEXT,
  "responseTime" INTEGER,
  "processingTime" INTEGER,
  "queueTime" INTEGER,
  "sessionId" TEXT,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX "AgentExecution_agentId_createdAt_idx" ON "AgentExecution"("agentId", "createdAt");
CREATE INDEX "AgentExecution_userId_createdAt_idx" ON "AgentExecution"("userId", "createdAt");
CREATE INDEX "AgentExecution_status_createdAt_idx" ON "AgentExecution"("status", "createdAt");
CREATE INDEX "AgentExecution_executionId_idx" ON "AgentExecution"("executionId");

-- Add foreign key constraints
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" 
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### **Step 3: Add Metrics Tables**
```sql
-- AgentMetrics table for time-series data
CREATE TABLE "AgentMetrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "hour" INTEGER,
  "totalExecutions" INTEGER NOT NULL DEFAULT 0,
  "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
  "failedExecutions" INTEGER NOT NULL DEFAULT 0,
  "timeoutExecutions" INTEGER NOT NULL DEFAULT 0,
  "errorExecutions" INTEGER NOT NULL DEFAULT 0,
  "avgDuration" DOUBLE PRECISION,
  "minDuration" INTEGER,
  "maxDuration" INTEGER,
  "p95Duration" INTEGER,
  "p99Duration" INTEGER,
  "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
  "totalCreditsConsumed" INTEGER NOT NULL DEFAULT 0,
  "avgCreditsPerExecution" DOUBLE PRECISION,
  "errorCounts" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Unique constraint for agent/date/hour combination
ALTER TABLE "AgentMetrics" ADD CONSTRAINT "AgentMetrics_agentId_date_hour_key" 
  UNIQUE ("agentId", "date", "hour");

-- Indexes for performance
CREATE INDEX "AgentMetrics_agentId_date_idx" ON "AgentMetrics"("agentId", "date");
CREATE INDEX "AgentMetrics_date_idx" ON "AgentMetrics"("date");

-- Foreign key constraint
ALTER TABLE "AgentMetrics" ADD CONSTRAINT "AgentMetrics_agentId_fkey" 
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### **Step 4: Add Logging Tables**
```sql
-- AgentLog table for detailed execution logs
CREATE TABLE "AgentLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "executionId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "context" JSONB,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX "AgentLog_executionId_idx" ON "AgentLog"("executionId");
CREATE INDEX "AgentLog_agentId_timestamp_idx" ON "AgentLog"("agentId", "timestamp");
CREATE INDEX "AgentLog_category_level_timestamp_idx" ON "AgentLog"("category", "level", "timestamp");

-- Foreign key constraints
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentId_fkey" 
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### **Step 5: Add User Interaction Tracking**
```sql
-- UserAgentInteraction table for user behavior tracking
CREATE TABLE "UserAgentInteraction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "totalExecutions" INTEGER NOT NULL DEFAULT 0,
  "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMP(3),
  "firstExecutedAt" TIMESTAMP(3),
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "rating" INTEGER,
  "feedback" TEXT,
  "avgExecutionsPerDay" DOUBLE PRECISION,
  "preferredTimeOfDay" INTEGER,
  "preferredDayOfWeek" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Unique constraint for user/agent combination
ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT "UserAgentInteraction_userId_agentId_key" 
  UNIQUE ("userId", "agentId");

-- Indexes for performance
CREATE INDEX "UserAgentInteraction_userId_lastExecutedAt_idx" ON "UserAgentInteraction"("userId", "lastExecutedAt");
CREATE INDEX "UserAgentInteraction_agentId_totalExecutions_idx" ON "UserAgentInteraction"("agentId", "totalExecutions");

-- Foreign key constraints
ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT "UserAgentInteraction_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT "UserAgentInteraction_agentId_fkey" 
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### **Step 6: Add Computed Fields to Agent Table (Optional)**
```sql
-- Add computed fields to Agent table for performance
ALTER TABLE "Agent" ADD COLUMN "lastExecutedAt" TIMESTAMP(3);
ALTER TABLE "Agent" ADD COLUMN "totalExecutions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Agent" ADD COLUMN "avgRating" DOUBLE PRECISION;
ALTER TABLE "Agent" ADD COLUMN "totalUsers" INTEGER NOT NULL DEFAULT 0;

-- Add indexes for new fields
CREATE INDEX "Agent_lastExecutedAt_idx" ON "Agent"("lastExecutedAt");
CREATE INDEX "Agent_totalExecutions_idx" ON "Agent"("totalExecutions");
CREATE INDEX "Agent_avgRating_idx" ON "Agent"("avgRating");
```

## 🔄 Data Migration Scripts

### **Script 1: Migrate Existing Stats to New Format**
```typescript
// scripts/migrate-existing-stats.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingStats() {
  console.log('🔄 Migrating existing agent stats...');
  
  const agents = await prisma.agent.findMany({
    where: { stats: { not: null } }
  });
  
  for (const agent of agents) {
    const stats = agent.stats as any;
    
    // Create initial metrics record
    await prisma.agentMetrics.create({
      data: {
        agentId: agent.id,
        date: new Date(),
        totalExecutions: stats.totalExecutions || 0,
        successfulExecutions: stats.successfulExecutions || 0,
        failedExecutions: stats.failedExecutions || 0,
        avgDuration: stats.averageExecutionTime || null,
        uniqueUsers: stats.uniqueUsers || 0,
        totalCreditsConsumed: 0, // Will be calculated from executions
      }
    });
    
    // Update agent computed fields
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        totalExecutions: stats.totalExecutions || 0,
        totalUsers: stats.uniqueUsers || 0,
      }
    });
  }
  
  console.log('✅ Migration completed');
}

migrateExistingStats().catch(console.error);
```

### **Script 2: Populate User Interactions from Transactions**
```typescript
// scripts/populate-user-interactions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateUserInteractions() {
  console.log('🔄 Populating user interactions from transactions...');
  
  // Get all transactions grouped by user and agent
  const transactions = await prisma.transaction.findMany({
    include: {
      user: true,
      agent: true
    }
  });
  
  const interactions = new Map<string, any>();
  
  for (const tx of transactions) {
    const key = `${tx.userId}-${tx.agentId}`;
    
    if (!interactions.has(key)) {
      interactions.set(key, {
        userId: tx.userId,
        agentId: tx.agentId,
        totalExecutions: 0,
        successfulExecutions: 0,
        firstExecutedAt: tx.createdAt,
        lastExecutedAt: tx.createdAt,
      });
    }
    
    const interaction = interactions.get(key);
    interaction.totalExecutions++;
    if (tx.status === 'succeeded') {
      interaction.successfulExecutions++;
    }
    if (tx.createdAt > interaction.lastExecutedAt) {
      interaction.lastExecutedAt = tx.createdAt;
    }
    if (tx.createdAt < interaction.firstExecutedAt) {
      interaction.firstExecutedAt = tx.createdAt;
    }
  }
  
  // Create user interactions
  for (const interaction of interactions.values()) {
    await prisma.userAgentInteraction.upsert({
      where: {
        userId_agentId: {
          userId: interaction.userId,
          agentId: interaction.agentId
        }
      },
      create: interaction,
      update: interaction
    });
  }
  
  console.log('✅ User interactions populated');
}

populateUserInteractions().catch(console.error);
```

## 🚀 Implementation Timeline

### **Week 1: Foundation**
- [ ] Create database backup
- [ ] Add new tables (AgentExecution, AgentMetrics, AgentLog, UserAgentInteraction)
- [ ] Test table creation in development environment

### **Week 2: Data Collection**
- [ ] Update API endpoints to log execution data
- [ ] Implement metrics collection
- [ ] Run migration scripts for existing data

### **Week 3: Analytics**
- [ ] Create analytics API endpoints
- [ ] Update UI to display new metrics
- [ ] Implement real-time metrics updates

### **Week 4: Optimization**
- [ ] Add database indexes for performance
- [ ] Implement data retention policies
- [ ] Add monitoring and alerting

## ⚠️ Rollback Plan

### **If Issues Occur:**
1. **Stop new data collection** (disable logging in API endpoints)
2. **Drop new tables** (if necessary):
   ```sql
   DROP TABLE IF EXISTS "UserAgentInteraction";
   DROP TABLE IF EXISTS "AgentLog";
   DROP TABLE IF EXISTS "AgentMetrics";
   DROP TABLE IF EXISTS "AgentExecution";
   ```
3. **Restore from backup** (if data corruption occurs)
4. **Revert API changes** (remove logging code)

### **Rollback Script:**
```bash
# scripts/rollback-migration.sh
#!/bin/bash
echo "🔄 Rolling back metrics migration..."

# Drop new tables
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"UserAgentInteraction\";"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"AgentLog\";"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"AgentMetrics\";"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"AgentExecution\";"

# Remove computed fields from Agent table
psql $DATABASE_URL -c "ALTER TABLE \"Agent\" DROP COLUMN IF EXISTS \"lastExecutedAt\";"
psql $DATABASE_URL -c "ALTER TABLE \"Agent\" DROP COLUMN IF EXISTS \"totalExecutions\";"
psql $DATABASE_URL -c "ALTER TABLE \"Agent\" DROP COLUMN IF EXISTS \"avgRating\";"
psql $DATABASE_URL -c "ALTER TABLE \"Agent\" DROP COLUMN IF EXISTS \"totalUsers\";"

echo "✅ Rollback completed"
```

## 📊 Monitoring & Validation

### **Post-Migration Checks:**
1. **Data Integrity**: Verify all existing data is preserved
2. **Performance**: Check query performance with new tables
3. **Functionality**: Ensure all existing features work
4. **Metrics**: Verify new metrics are being collected correctly

### **Success Metrics:**
- [ ] Zero data loss during migration
- [ ] All existing functionality preserved
- [ ] New metrics being collected successfully
- [ ] Query performance within acceptable limits
- [ ] No errors in application logs
