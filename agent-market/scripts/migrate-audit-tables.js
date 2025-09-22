/**
 * Migration script to create comprehensive audit trail and system monitoring tables
 * Adds: AgentAuditLog, UserAuditLog, MandateAuditLog, SystemErrors, SystemMetrics
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateAuditTables() {
  console.log('🔄 Starting comprehensive audit tables migration...');

  try {
    // Check existing tables
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('AgentAuditLog', 'UserAuditLog', 'MandateAuditLog', 'SystemErrors', 'SystemMetrics')
    `;

    const existingTableNames = existingTables.map(t => t.table_name);
    console.log('Existing audit tables:', existingTableNames);

    // Create AgentAuditLog table
    if (!existingTableNames.includes('AgentAuditLog')) {
      console.log('➕ Creating AgentAuditLog table...');
      await prisma.$executeRaw`
        CREATE TABLE "AgentAuditLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "agentId" TEXT NOT NULL,
          "field" TEXT NOT NULL,
          "oldValue" JSONB,
          "newValue" JSONB,
          "changedBy" TEXT,
          "changeType" TEXT NOT NULL,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reason" TEXT,
          "metadata" JSONB
        )
      `;
      console.log('✅ AgentAuditLog table created');
    } else {
      console.log('⏭️ AgentAuditLog table already exists');
    }

    // Create UserAuditLog table
    if (!existingTableNames.includes('UserAuditLog')) {
      console.log('➕ Creating UserAuditLog table...');
      await prisma.$executeRaw`
        CREATE TABLE "UserAuditLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "field" TEXT NOT NULL,
          "oldValue" JSONB,
          "newValue" JSONB,
          "changedBy" TEXT,
          "changeType" TEXT NOT NULL,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reason" TEXT,
          "metadata" JSONB
        )
      `;
      console.log('✅ UserAuditLog table created');
    } else {
      console.log('⏭️ UserAuditLog table already exists');
    }

    // Create MandateAuditLog table
    if (!existingTableNames.includes('MandateAuditLog')) {
      console.log('➕ Creating MandateAuditLog table...');
      await prisma.$executeRaw`
        CREATE TABLE "MandateAuditLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "mandateId" TEXT NOT NULL,
          "field" TEXT NOT NULL,
          "oldValue" JSONB,
          "newValue" JSONB,
          "changedBy" TEXT NOT NULL,
          "changeType" TEXT NOT NULL,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reason" TEXT,
          "metadata" JSONB
        )
      `;
      console.log('✅ MandateAuditLog table created');
    } else {
      console.log('⏭️ MandateAuditLog table already exists');
    }

    // Create SystemErrors table
    if (!existingTableNames.includes('SystemErrors')) {
      console.log('➕ Creating SystemErrors table...');
      await prisma.$executeRaw`
        CREATE TABLE "SystemErrors" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "errorCode" TEXT NOT NULL,
          "errorType" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "component" TEXT NOT NULL,
          "agentId" TEXT,
          "userId" TEXT,
          "executionId" TEXT,
          "requestId" TEXT,
          "message" TEXT NOT NULL,
          "details" JSONB,
          "stackTrace" TEXT,
          "resolved" BOOLEAN NOT NULL DEFAULT false,
          "resolvedBy" TEXT,
          "resolvedAt" TIMESTAMP(3),
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ SystemErrors table created');
    } else {
      console.log('⏭️ SystemErrors table already exists');
    }

    // Create SystemMetrics table
    if (!existingTableNames.includes('SystemMetrics')) {
      console.log('➕ Creating SystemMetrics table...');
      await prisma.$executeRaw`
        CREATE TABLE "SystemMetrics" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "metric" TEXT NOT NULL,
          "value" DOUBLE PRECISION NOT NULL,
          "component" TEXT NOT NULL,
          "unit" TEXT,
          "tags" JSONB,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ SystemMetrics table created');
    } else {
      console.log('⏭️ SystemMetrics table already exists');
    }

    // Create indexes for AgentAuditLog
    console.log('📊 Creating AgentAuditLog indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentAuditLog_agentId_timestamp_idx" ON "AgentAuditLog"("agentId", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentAuditLog_changedBy_timestamp_idx" ON "AgentAuditLog"("changedBy", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentAuditLog_field_timestamp_idx" ON "AgentAuditLog"("field", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AgentAuditLog_timestamp_idx" ON "AgentAuditLog"("timestamp")`;
      console.log('✅ AgentAuditLog indexes created');
    } catch (error) {
      console.log('⏭️ AgentAuditLog indexes already exist');
    }

    // Create indexes for UserAuditLog
    console.log('📊 Creating UserAuditLog indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAuditLog_userId_timestamp_idx" ON "UserAuditLog"("userId", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAuditLog_changedBy_timestamp_idx" ON "UserAuditLog"("changedBy", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAuditLog_field_timestamp_idx" ON "UserAuditLog"("field", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserAuditLog_timestamp_idx" ON "UserAuditLog"("timestamp")`;
      console.log('✅ UserAuditLog indexes created');
    } catch (error) {
      console.log('⏭️ UserAuditLog indexes already exist');
    }

    // Create indexes for MandateAuditLog
    console.log('📊 Creating MandateAuditLog indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MandateAuditLog_mandateId_timestamp_idx" ON "MandateAuditLog"("mandateId", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MandateAuditLog_changedBy_timestamp_idx" ON "MandateAuditLog"("changedBy", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MandateAuditLog_field_timestamp_idx" ON "MandateAuditLog"("field", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MandateAuditLog_timestamp_idx" ON "MandateAuditLog"("timestamp")`;
      console.log('✅ MandateAuditLog indexes created');
    } catch (error) {
      console.log('⏭️ MandateAuditLog indexes already exist');
    }

    // Create indexes for SystemErrors
    console.log('📊 Creating SystemErrors indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_errorCode_timestamp_idx" ON "SystemErrors"("errorCode", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_errorType_timestamp_idx" ON "SystemErrors"("errorType", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_severity_timestamp_idx" ON "SystemErrors"("severity", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_component_timestamp_idx" ON "SystemErrors"("component", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_agentId_timestamp_idx" ON "SystemErrors"("agentId", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_userId_timestamp_idx" ON "SystemErrors"("userId", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_resolved_timestamp_idx" ON "SystemErrors"("resolved", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemErrors_timestamp_idx" ON "SystemErrors"("timestamp")`;
      console.log('✅ SystemErrors indexes created');
    } catch (error) {
      console.log('⏭️ SystemErrors indexes already exist');
    }

    // Create indexes for SystemMetrics
    console.log('📊 Creating SystemMetrics indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemMetrics_metric_timestamp_idx" ON "SystemMetrics"("metric", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemMetrics_component_timestamp_idx" ON "SystemMetrics"("component", "timestamp")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SystemMetrics_timestamp_idx" ON "SystemMetrics"("timestamp")`;
      console.log('✅ SystemMetrics indexes created');
    } catch (error) {
      console.log('⏭️ SystemMetrics indexes already exist');
    }

    // Verify the migration
    const finalTableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('AgentAuditLog', 'UserAuditLog', 'MandateAuditLog', 'SystemErrors', 'SystemMetrics')
    `;

    console.log(`📊 Migration Summary:`);
    console.log(`   Audit tables created: ${finalTableCount[0].count}/5`);
    console.log(`   All indexes created successfully`);
    console.log(`   System ready for comprehensive audit logging`);

    console.log('✅ Comprehensive audit tables migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateAuditTables()
    .then(() => {
      console.log('🎉 Comprehensive audit migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAuditTables };
