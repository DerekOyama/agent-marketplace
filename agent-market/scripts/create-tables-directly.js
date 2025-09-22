require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function createTables() {
  console.log('🚀 Creating new tables directly...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    
    // Create AgentExecution table
    console.log('📊 Creating AgentExecution table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AgentExecution" (
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
    `;
    console.log('✅ AgentExecution table created');
    
    // Create indexes for AgentExecution
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentExecution_agentId_createdAt_idx" ON "AgentExecution"("agentId", "createdAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentExecution_userId_createdAt_idx" ON "AgentExecution"("userId", "createdAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentExecution_status_createdAt_idx" ON "AgentExecution"("status", "createdAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentExecution_executionId_idx" ON "AgentExecution"("executionId");`;
    
    // Create AgentMetrics table
    console.log('📈 Creating AgentMetrics table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AgentMetrics" (
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
    `;
    console.log('✅ AgentMetrics table created');
    
    // Create unique constraint and indexes for AgentMetrics
    await prisma.$executeRaw`ALTER TABLE "AgentMetrics" ADD CONSTRAINT IF NOT EXISTS "AgentMetrics_agentId_date_hour_key" UNIQUE ("agentId", "date", "hour");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentMetrics_agentId_date_idx" ON "AgentMetrics"("agentId", "date");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentMetrics_date_idx" ON "AgentMetrics"("date");`;
    
    // Create AgentLog table
    console.log('📝 Creating AgentLog table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AgentLog" (
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
    `;
    console.log('✅ AgentLog table created');
    
    // Create indexes for AgentLog
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentLog_executionId_idx" ON "AgentLog"("executionId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentLog_agentId_timestamp_idx" ON "AgentLog"("agentId", "timestamp");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentLog_category_level_timestamp_idx" ON "AgentLog"("category", "level", "timestamp");`;
    
    // Create UserAgentInteraction table
    console.log('👥 Creating UserAgentInteraction table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserAgentInteraction" (
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
    `;
    console.log('✅ UserAgentInteraction table created');
    
    // Create unique constraint and indexes for UserAgentInteraction
    await prisma.$executeRaw`ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT IF NOT EXISTS "UserAgentInteraction_userId_agentId_key" UNIQUE ("userId", "agentId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAgentInteraction_userId_lastExecutedAt_idx" ON "UserAgentInteraction"("userId", "lastExecutedAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAgentInteraction_agentId_totalExecutions_idx" ON "UserAgentInteraction"("agentId", "totalExecutions");`;
    
    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    await prisma.$executeRaw`ALTER TABLE "AgentExecution" ADD CONSTRAINT IF NOT EXISTS "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "AgentExecution" ADD CONSTRAINT IF NOT EXISTS "AgentExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "AgentMetrics" ADD CONSTRAINT IF NOT EXISTS "AgentMetrics_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "AgentLog" ADD CONSTRAINT IF NOT EXISTS "AgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "AgentLog" ADD CONSTRAINT IF NOT EXISTS "AgentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT IF NOT EXISTS "UserAgentInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE "UserAgentInteraction" ADD CONSTRAINT IF NOT EXISTS "UserAgentInteraction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`;
    
    // Add new columns to Agent table
    console.log('🔧 Adding new columns to Agent table...');
    await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "lastExecutedAt" TIMESTAMP(3);`;
    await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "totalExecutions" INTEGER NOT NULL DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION;`;
    await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "totalUsers" INTEGER NOT NULL DEFAULT 0;`;
    
    // Create indexes for new Agent columns
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Agent_lastExecutedAt_idx" ON "Agent"("lastExecutedAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Agent_totalExecutions_idx" ON "Agent"("totalExecutions");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Agent_avgRating_idx" ON "Agent"("avgRating");`;
    
    console.log('✅ All tables and constraints created successfully!');
    
    // Verify the tables were created
    console.log('\n🔍 Verifying new tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const newTables = ['AgentExecution', 'AgentMetrics', 'AgentLog', 'UserAgentInteraction'];
    const existingTables = tables.map(t => t.table_name);
    
    newTables.forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`   ✅ ${tableName} - CREATED`);
      } else {
        console.log(`   ❌ ${tableName} - FAILED`);
      }
    });
    
    await prisma.$disconnect();
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

createTables();
