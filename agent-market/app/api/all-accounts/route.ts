import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('👥 Checking all user accounts...');

    // Get all users
    const users = await (prisma as any).user.findMany({
      select: {
        id: true,
        email: true,
        creditBalanceCents: true,
        createdAt: true,
        creditTransactions: {
          select: {
            amountCents: true,
            type: true,
            description: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${users.length} user accounts`);

    const accountData = users.map(user => {
      // Calculate balance from transactions
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      const balanceConsistent = user.creditBalanceCents === calculatedBalance;
      
      return {
        email: user.email,
        userId: user.id,
        storedBalance: user.creditBalanceCents,
        calculatedBalance,
        balanceConsistent,
        balanceFormatted: `$${(user.creditBalanceCents / 100).toFixed(2)}`,
        accountCreated: user.createdAt,
        totalTransactions: user.creditTransactions.length,
        recentTransactions: user.creditTransactions.slice(0, 5).map(tx => ({
          description: tx.description,
          amount: tx.amountCents,
          amountFormatted: tx.amountCents > 0 ? `+$${(tx.amountCents / 100).toFixed(2)}` : `$${(tx.amountCents / 100).toFixed(2)}`,
          type: tx.type,
          createdAt: tx.createdAt
        }))
      };
    });

    // Summary
    const totalBalance = users.reduce((sum, user) => sum + user.creditBalanceCents, 0);
    const totalTransactions = users.reduce((sum, user) => sum + user.creditTransactions.length, 0);
    
    // Check for inconsistencies
    const inconsistentUsers = users.filter(user => {
      const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
      return user.creditBalanceCents !== calculatedBalance;
    });

    return NextResponse.json({
      accounts: accountData,
      summary: {
        totalUsers: users.length,
        totalSystemBalance: totalBalance,
        totalSystemBalanceFormatted: `$${(totalBalance / 100).toFixed(2)}`,
        totalTransactions,
        inconsistentAccounts: inconsistentUsers.length,
        allAccountsConsistent: inconsistentUsers.length === 0
      },
      inconsistentAccounts: inconsistentUsers.map(user => {
        const calculatedBalance = user.creditTransactions.reduce((sum, tx) => sum + tx.amountCents, 0);
        return {
          email: user.email,
          storedBalance: user.creditBalanceCents,
          calculatedBalance,
          difference: user.creditBalanceCents - calculatedBalance
        };
      })
    });

  } catch (error) {
    console.error('❌ Error checking accounts:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
