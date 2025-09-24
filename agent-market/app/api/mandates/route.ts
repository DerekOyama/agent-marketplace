import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { getCurrentUserId } from "../../../lib/auth";

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
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    const mandate = await (prisma as any).mandate.create({ 
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

