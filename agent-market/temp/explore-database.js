import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function exploreDatabase() {
    try {
        console.log('🔍 Exploring Supabase Database...\n');
        // Test connection
        console.log('📡 Testing database connection...');
        await prisma.$queryRaw `SELECT NOW() as current_time`;
        console.log('✅ Database connection successful!\n');
        // Check users
        console.log('👥 Users:');
        const users = await prisma.user.findMany();
        console.log(`   Found ${users.length} users`);
        users.forEach(user => {
            console.log(`   - ${user.email} (Balance: $${(user.creditBalanceCents / 100).toFixed(2)})`);
        });
        console.log();
        // Check agents
        console.log('🤖 Agents:');
        const agents = await prisma.agent.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
                webhookUrl: true,
                _count: {
                    select: {
                        transactions: true
                    }
                }
            }
        });
        console.log(`   Found ${agents.length} agents`);
        agents.forEach(agent => {
            console.log(`   - ${agent.name} (${agent.type}, active: ${agent.isActive}, transactions: ${agent._count.transactions})`);
        });
        console.log();
        // Check transactions
        console.log('💰 Transactions:');
        const transactions = await prisma.transaction.findMany({
            include: {
                user: { select: { email: true } },
                agent: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log(`   Found ${transactions.length} recent transactions`);
        transactions.forEach(tx => {
            console.log(`   - $${(tx.amountCents / 100).toFixed(2)} to ${tx.agent.name} by ${tx.user.email} (${tx.status})`);
        });
        console.log();
        // Check mandates
        console.log('📋 Mandates:');
        const mandates = await prisma.mandate.findMany();
        console.log(`   Found ${mandates.length} mandates`);
        console.log();
        // Check audit logs
        console.log('📝 Audit Logs:');
        const auditLogs = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log(`   Found ${auditLogs.length} recent audit entries`);
        auditLogs.forEach(log => {
            console.log(`   - ${log.event} by ${log.actor} (${log.createdAt.toISOString()})`);
        });
        console.log();
        // Database schema info
        console.log('🗄️  Database Schema Analysis:');
        // Check if inputSchema/outputSchema columns exist on Agent table
        try {
            const agentColumns = await prisma.$queryRaw `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Agent' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
            console.log('   Agent table columns:');
            agentColumns.forEach((col) => {
                console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
            });
            const hasInputSchema = agentColumns.some((col) => col.column_name === 'inputSchema');
            const hasOutputSchema = agentColumns.some((col) => col.column_name === 'outputSchema');
            console.log(`\n   📊 Schema Status:`);
            console.log(`   - inputSchema column exists: ${hasInputSchema ? '✅' : '❌'}`);
            console.log(`   - outputSchema column exists: ${hasOutputSchema ? '✅' : '❌'}`);
        }
        catch (error) {
            console.log('   ⚠️  Could not analyze table schema');
        }
    }
    catch (error) {
        console.error('❌ Database exploration failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
exploreDatabase();
