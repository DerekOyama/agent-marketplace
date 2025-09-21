import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyDeployment() {
  try {
    console.log("🔍 Verifying deployment...");
    
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection successful");
    
    // Check if demo user exists
    const user = await prisma.user.findUnique({
      where: { id: "demo-user" }
    });
    
    if (user) {
      console.log(`✅ Demo user found with ${user.creditBalanceCents} cents`);
    } else {
      console.log("⚠️  Demo user not found - run setup script");
    }
    
    // Check agents
    const agentCount = await prisma.agent.count();
    console.log(`✅ Found ${agentCount} agents in database`);
    
    // Test a simple query
    const agents = await prisma.agent.findMany({
      take: 1,
      select: { id: true, name: true, isActive: true }
    });
    
    if (agents.length > 0) {
      console.log(`✅ Sample agent: ${agents[0].name} (${agents[0].isActive ? 'active' : 'inactive'})`);
    }
    
    console.log("🎉 Deployment verification complete!");
    
  } catch (error) {
    console.error("❌ Deployment verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDeployment();
