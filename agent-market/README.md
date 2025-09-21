# Agent Marketplace MVP

A minimal agent marketplace with Next.js, Prisma, Supabase, and Stripe integration.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   - Copy `.env.example` to `.env.local`
   - Add your Supabase DATABASE_URL and Stripe keys

3. **Set up database:**
   ```bash
   npx prisma db push
   npx ts-node scripts/seed-agent.ts
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/mandates` - Create spending mandates
- `POST /api/transactions` - Create transactions
- `POST /api/transactions/[id]/dispatch` - Dispatch to agents
- `POST /api/transactions/[id]/receipt` - Process receipts
- `GET /api/agents` - List agents
- `GET /api/health` - Health check

## Features

- ✅ User mandates with spending limits
- ✅ Transaction creation with Stripe integration
- ✅ Agent dispatch system
- ✅ Receipt processing
- ✅ Audit logging
- ✅ Demo agent simulation