import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.agent.create({
    data: {
      name: "Demo n8n Agent",
      quoteUrl: "https://YOUR-N8N/agents/demo/quote",
      runUrl:   "https://YOUR-N8N/agents/demo/run",
      token:    "PUT_A_LONG_RANDOM_TOKEN_HERE"
    }
  });
  console.log("Seeded demo agent");
}

main().finally(()=>prisma.$disconnect());
