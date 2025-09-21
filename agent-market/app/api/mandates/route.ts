import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

// Define schemas inline to avoid import issues
const MandateRulesSchema = z.object({ 
  max_amount_cents: z.number().int().positive(), 
  expires_at: z.string().datetime().optional() 
});

const CreateMandateSchema = z.object({ 
  rules: MandateRulesSchema 
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateMandateSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return NextResponse.json({ 
        error: "bad_request", 
        details: parsed.error.issues 
      }, { status: 400 });
    }
    
    const userId = "demo-user"; // stub auth
    
    // First, create the user if it doesn't exist
    await prisma.user.upsert({
      where: { email: "demo@example.com" },
      update: {},
      create: {
        id: userId,
        email: "demo@example.com"
      }
    });
    
    const mandate = await prisma.mandate.create({ 
      data: { 
        userId, 
        rulesJson: parsed.data.rules,
        status: "active"
      } 
    });
    
    return NextResponse.json({ mandate }, { status: 201 });
    
  } catch (error) {
    console.error("Mandate creation error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
