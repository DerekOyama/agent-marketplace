import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, runUrl: true }
    });
    return NextResponse.json({ agents }, { status: 200 });
  } catch (e: any) {
    console.error("Database error:", e);
    return NextResponse.json({ 
      agents: [], 
      error: "db_error", 
      message: String(e?.message || e) 
    }, { status: 500 });
  }
}
