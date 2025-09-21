import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log("🔧 Setting up database for production...");
    
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection successful");
    
    // Create demo user if it doesn't exist
    const existingUser = await prisma.user.findUnique({
      where: { id: "demo-user" }
    });
    
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: "demo-user",
          email: "demo@example.com",
          creditBalanceCents: 1000 // $10.00
        }
      });
      console.log("✅ Demo user created");
    } else {
      console.log("✅ Demo user already exists");
    }
    
    // Check if agents exist
    const agentCount = await prisma.agent.count();
    if (agentCount === 0) {
      console.log("⚠️  No agents found. Run 'npm run db:seed' to create demo agents.");
    } else {
      console.log(`✅ Found ${agentCount} agents in database`);
    }
    
    console.log("🎉 Database setup complete!");
    
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
