require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function createTables() {
  console.log('🚀 Creating new tables...');
  
  try {
    const prisma = new PrismaClient();
    
    // Test connection
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    
    // Create AgentExecution table
    console.log('📊 Creating AgentExecution table...');
    try {
      await prisma.$executeRaw`
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
      `;
      console.log('✅ AgentExecution table created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ AgentExecution table already exists');
      } else {
        throw error;
      }
    }
    
    // Create AgentMetrics table
    console.log('📈 Creating AgentMetrics table...');
    try {
      await prisma.$executeRaw`
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
      `;
      console.log('✅ AgentMetrics table created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ AgentMetrics table already exists');
      } else {
        throw error;
      }
    }
    
    // Create AgentLog table
    console.log('📝 Creating AgentLog table...');
    try {
      await prisma.$executeRaw`
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
      `;
      console.log('✅ AgentLog table created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ AgentLog table already exists');
      } else {
        throw error;
      }
    }
    
    // Create UserAgentInteraction table
    console.log('👥 Creating UserAgentInteraction table...');
    try {
      await prisma.$executeRaw`
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
      `;
      console.log('✅ UserAgentInteraction table created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ UserAgentInteraction table already exists');
      } else {
        throw error;
      }
    }
    
    // Add new columns to Agent table
    console.log('🔧 Adding new columns to Agent table...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN "lastExecutedAt" TIMESTAMP(3);`;
      console.log('✅ Added lastExecutedAt column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ lastExecutedAt column already exists');
      }
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN "totalExecutions" INTEGER NOT NULL DEFAULT 0;`;
      console.log('✅ Added totalExecutions column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ totalExecutions column already exists');
      }
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN "avgRating" DOUBLE PRECISION;`;
      console.log('✅ Added avgRating column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ avgRating column already exists');
      }
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "Agent" ADD COLUMN "totalUsers" INTEGER NOT NULL DEFAULT 0;`;
      console.log('✅ Added totalUsers column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ totalUsers column already exists');
      }
    }
    
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
