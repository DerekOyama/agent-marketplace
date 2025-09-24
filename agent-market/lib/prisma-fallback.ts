// Temporary fallback for when Prisma client is broken
export const prisma = {
  user: {
    findUnique: async ({ where }: any) => {
      // Return mock data for demo user
      if (where.email === 'demo@example.com') {
        return {
          id: 'demo-user',
          email: 'demo@example.com',
          creditBalanceCents: 30900, // $309.00
          createdAt: new Date('2025-09-22T00:00:00Z')
        };
      }
      return null;
    },
    findMany: async () => {
      return [
        {
          id: 'demo-user',
          email: 'demo@example.com',
          creditBalanceCents: 30900,
          createdAt: new Date('2025-09-22T00:00:00Z')
        }
      ];
    },
    update: async ({ where, data }: any) => {
      console.log('Mock update:', { where, data });
      return { id: where.id, ...data };
    }
  },
  creditTransaction: {
    findMany: async ({ where }: any) => {
      // Return mock transaction data
      return [
        {
          id: 'tx1',
          amountCents: -50,
          type: 'usage',
          description: 'Agent execution: aa',
          balanceAfterCents: 33300,
          createdAt: new Date('2025-09-23T16:54:51.265Z')
        },
        {
          id: 'tx2',
          amountCents: -50,
          type: 'usage',
          description: 'Agent execution: aa',
          balanceAfterCents: 33350,
          createdAt: new Date('2025-09-23T16:52:29.601Z')
        },
        {
          id: 'tx3',
          amountCents: 2500,
          type: 'purchase',
          description: 'Credit purchase - 2500 credits',
          balanceAfterCents: 33400,
          createdAt: new Date('2025-09-23T00:16:22.449Z')
        },
        {
          id: 'tx4',
          amountCents: 1000,
          type: 'purchase',
          description: 'Credit purchase - 1000 credits',
          balanceAfterCents: 30900,
          createdAt: new Date('2025-09-23T00:10:35.958Z')
        },
        {
          id: 'tx5',
          amountCents: 1000,
          type: 'purchase',
          description: 'Credit purchase - 1000 credits',
          balanceAfterCents: 29900,
          createdAt: new Date('2025-09-23T00:10:15.589Z')
        }
      ];
    }
  },
  agentExecution: {
    findMany: async ({ where }: any) => {
      return [
        {
          id: 'exec1',
          executionId: 'exec_1758646489213_la5agmb5r',
          agentId: 'agent1',
          userId: 'demo-user',
          status: 'success',
          creditsConsumed: 50,
          balanceBeforeCents: 30950,
          balanceAfterCents: 30900,
          createdAt: new Date('2025-09-23T16:54:51.446Z'),
          agent: { name: 'aa' }
        }
      ];
    }
  },
  agentEarnings: {
    findMany: async () => [],
    upsert: async () => ({ id: 'earnings1' })
  },
  payout: {
    findMany: async () => []
  },
  $transaction: async (callback: any) => {
    return await callback(prisma);
  }
};
