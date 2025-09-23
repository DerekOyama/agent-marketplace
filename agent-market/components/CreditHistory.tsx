"use client";

import { useState, useEffect } from "react";

interface CreditTransaction {
  id: string;
  amountCents: number;
  type: string;
  description: string;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  purchase?: {
    id: string;
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
  };
}

interface CreditHistoryProps {
  refreshTrigger?: number;
}

export default function CreditHistory({ refreshTrigger }: CreditHistoryProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/credits/transactions?limit=20");
      const data = await response.json();

      console.log("CreditHistory fetch response:", data); // Debug log

      if (data.error) {
        setError(data.message || "Failed to fetch transactions");
        return;
      }

      setTransactions(data.transactions || []);
      setCurrentBalance(data.currentBalance || 0);
      setError(null);
    } catch (err) {
      console.error("CreditHistory fetch error:", err); // Debug log
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return "💰";
      case "usage":
        return "⚡";
      case "refund":
        return "↩️";
      case "bonus":
        return "🎁";
      case "adjustment":
        return "🔧";
      default:
        return "💳";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "purchase":
      case "bonus":
        return "text-green-600";
      case "usage":
        return "text-red-600";
      case "refund":
        return "text-blue-600";
      case "adjustment":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Balance History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
          <span className="ml-2 text-gray-900 font-medium">Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance History</h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">❌ Error loading transactions</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTransactions}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Balance History</h3>
        <div className="text-right">
          <div className="text-sm text-gray-900">Current Balance</div>
          <div className="text-xl font-extrabold text-gray-900">${formatAmount(currentBalance)}</div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-700 mb-2">📝</div>
          <p className="text-gray-900 font-medium">No transactions yet</p>
          <p className="text-sm text-gray-900">Your transactions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-300"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getTransactionIcon(transaction.type)}</span>
                <div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {transaction.description}
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(transaction.createdAt)}
                    {transaction.referenceType && (
                      <span className="ml-2 px-2 py-1 bg-gray-300 rounded text-xs text-gray-900">
                        {transaction.referenceType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`font-bold ${getTransactionColor(transaction.type)}`}>
                  {transaction.amountCents > 0 ? "+" : ""}${formatAmount(Math.abs(transaction.amountCents))}
                </div>
                <div className="text-sm text-gray-900">
                  Balance: ${formatAmount(transaction.balanceAfterCents)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-300">
        <button
          onClick={fetchTransactions}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Refresh Transactions
        </button>
      </div>
    </div>
  );
}
