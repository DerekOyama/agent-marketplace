import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // Test database connection
    console.log("Testing database connection...");
    
    // Try to connect and run a simple query
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Query executed successfully:", result);
    
    // Count existing agents
    const agentCount = await prisma.agent.count();
    console.log(`✅ Found ${agentCount} agents in database`);
    
    // Test user table
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      details: {
        connected: true,
        agentCount,
        userCount,
        databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
        environment: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : String(error),
      details: {
        connected: false,
        databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
        environment: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
