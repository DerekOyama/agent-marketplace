// Robust Prisma client with fallback for multiple users
import { PrismaClient } from '@prisma/client';

interface WhereClause {
  email?: string;
  id?: string;
  userId?: string;
}

interface UpdateData {
  [key: string]: unknown;
}

interface TransactionCallback {
  (prisma: unknown): Promise<unknown>;
}

interface MockUser {
  id: string;
  email: string;
  creditBalanceCents: number;
  createdAt: Date;
}

interface MockTransaction {
  id: string;
  amountCents: number;
  type: string;
  description: string;
  balanceAfterCents: number;
  createdAt: Date;
}

let prisma: unknown;

// Mock data for multiple users
const mockUsers: MockUser[] = [
  {
    id: 'demo-user',
    email: 'demo@example.com',
    creditBalanceCents: 30900, // $309.00
    createdAt: new Date('2025-09-22T00:00:00Z')
  },
  {
    id: 'google-user-1',
    email: 'user1@gmail.com',
    creditBalanceCents: 1400, // $14.00
    createdAt: new Date('2025-09-23T10:00:00Z')
  },
  {
    id: 'google-user-2',
    email: 'user2@gmail.com',
    creditBalanceCents: 2500, // $25.00
    createdAt: new Date('2025-09-23T11:00:00Z')
  },
  {
    id: 'test-user',
    email: 'test@example.com',
    creditBalanceCents: 10000, // $100.00
    createdAt: new Date('2025-09-23T12:00:00Z')
  }
];

const mockTransactions: Record<string, MockTransaction[]> = {
  'demo-user': [
    { id: 'tx1', amountCents: -50, type: 'usage', description: 'Agent execution: aa', balanceAfterCents: 33300, createdAt: new Date('2025-09-23T16:54:51.265Z') },
    { id: 'tx2', amountCents: -50, type: 'usage', description: 'Agent execution: aa', balanceAfterCents: 33350, createdAt: new Date('2025-09-23T16:52:29.601Z') },
    { id: 'tx3', amountCents: 2500, type: 'purchase', description: 'Credit purchase - 2500 credits', balanceAfterCents: 33400, createdAt: new Date('2025-09-23T00:16:22.449Z') },
    { id: 'tx4', amountCents: 1000, type: 'purchase', description: 'Credit purchase - 1000 credits', balanceAfterCents: 30900, createdAt: new Date('2025-09-23T00:10:35.958Z') }
  ],
  'google-user-1': [
    { id: 'tx5', amountCents: 1000, type: 'purchase', description: 'Credit purchase - 1000 credits', balanceAfterCents: 1000, createdAt: new Date('2025-09-23T10:00:00Z') },
    { id: 'tx6', amountCents: 500, type: 'bonus', description: 'Welcome bonus', balanceAfterCents: 1500, createdAt: new Date('2025-09-23T10:05:00Z') },
    { id: 'tx7', amountCents: -100, type: 'usage', description: 'Agent execution: Test Agent', balanceAfterCents: 1400, createdAt: new Date('2025-09-23T10:10:00Z') }
  ],
  'google-user-2': [
    { id: 'tx8', amountCents: 2500, type: 'purchase', description: 'Credit purchase - 2500 credits', balanceAfterCents: 2500, createdAt: new Date('2025-09-23T11:00:00Z') }
  ],
  'test-user': [
    { id: 'tx9', amountCents: 10000, type: 'purchase', description: 'Credit purchase - 10000 credits', balanceAfterCents: 10000, createdAt: new Date('2025-09-23T12:00:00Z') }
  ]
};

// Create mock Prisma client
const createMockPrisma = () => ({
  user: {
    findUnique: async ({ where }: { where: WhereClause }) => {
      if (where.email) {
        return mockUsers.find(user => user.email === where.email) || null;
      }
      if (where.id) {
        return mockUsers.find(user => user.id === where.id) || null;
      }
      return null;
    },
    findMany: async () => mockUsers,
    update: async ({ where, data }: { where: WhereClause; data: UpdateData }) => {
      const user = mockUsers.find(u => u.id === where.id);
      if (user) {
        Object.assign(user, data);
        return user;
      }
      return null;
    }
  },
  creditTransaction: {
    findMany: async ({ where }: { where: WhereClause }) => {
      const userId = where.userId;
      return mockTransactions[userId as string] || [];
    }
  },
  agentExecution: {
    findMany: async ({ where }: { where: WhereClause }) => {
      return [
        {
          id: 'exec1',
          executionId: 'exec_1758646489213_la5agmb5r',
          agentId: 'agent1',
          userId: where.userId || 'demo-user',
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
  $transaction: async (callback: TransactionCallback) => {
    return await callback(createMockPrisma());
  }
});

// Try to use real Prisma client, fall back to mock
try {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }
  
  prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as PrismaClient
} catch {
  console.warn('Prisma client failed to load, using mock data for multiple users');
  prisma = createMockPrisma();
}

// Export prisma with proper typing for API routes
export { prisma };
export default prisma;