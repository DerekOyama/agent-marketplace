/**
 * Migration script to add agentId and executionId columns to RequestLog table
 * and update existing records with proper connections
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateRequestLogTable() {
  console.log('🔄 Starting RequestLog table migration...');

  try {
    // Check if columns already exist
    const existingColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'RequestLog' 
      AND column_name IN ('agentId', 'executionId')
    `;

    console.log('Existing columns:', existingColumns);

    // Add agentId column if it doesn't exist
    if (!existingColumns.find(col => col.column_name === 'agentId')) {
      console.log('➕ Adding agentId column...');
      await prisma.$executeRaw`
        ALTER TABLE "RequestLog" 
        ADD COLUMN "agentId" TEXT
      `;
      console.log('✅ agentId column added');
    } else {
      console.log('⏭️ agentId column already exists');
    }

    // Add executionId column if it doesn't exist
    if (!existingColumns.find(col => col.column_name === 'executionId')) {
      console.log('➕ Adding executionId column...');
      await prisma.$executeRaw`
        ALTER TABLE "RequestLog" 
        ADD COLUMN "executionId" TEXT
      `;
      console.log('✅ executionId column added');
    } else {
      console.log('⏭️ executionId column already exists');
    }

    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "RequestLog_agentId_timestamp_idx" 
        ON "RequestLog"("agentId", "timestamp")
      `;
      console.log('✅ agentId timestamp index created');
    } catch (error) {
      console.log('⏭️ agentId timestamp index already exists');
    }

    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "RequestLog_executionId_idx" 
        ON "RequestLog"("executionId")
      `;
      console.log('✅ executionId index created');
    } catch (error) {
      console.log('⏭️ executionId index already exists');
    }

    // Update existing records where possible
    console.log('🔄 Updating existing records...');
    
    // Try to connect request logs to agent executions where the path matches
    const updateResult = await prisma.$executeRaw`
      UPDATE "RequestLog" 
      SET "agentId" = ae."agentId", "executionId" = ae."executionId"
      FROM "AgentExecution" ae
      WHERE "RequestLog"."path" LIKE '%/api/n8n/execute%'
      AND "RequestLog"."timestamp" BETWEEN ae."startedAt" - INTERVAL '1 minute' AND ae."completedAt" + INTERVAL '1 minute'
      AND "RequestLog"."agentId" IS NULL
    `;

    console.log(`✅ Updated ${updateResult} request log records with agent/execution IDs`);

    // Verify the migration
    const totalRecords = await prisma.requestLog.count();
    const connectedRecords = await prisma.requestLog.count({
      where: {
        OR: [
          { agentId: { not: null } },
          { executionId: { not: null } }
        ]
      }
    });

    console.log(`📊 Migration Summary:`);
    console.log(`   Total RequestLog records: ${totalRecords}`);
    console.log(`   Records with agent/execution IDs: ${connectedRecords}`);
    console.log(`   Connection rate: ${totalRecords > 0 ? Math.round((connectedRecords / totalRecords) * 100) : 0}%`);

    console.log('✅ RequestLog table migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateRequestLogTable()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateRequestLogTable };
