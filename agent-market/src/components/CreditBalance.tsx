"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  creditBalanceCents: number;
  updatedAt: string;
}

interface CreditBalanceProps {
  onBalanceUpdate?: (newBalance: number) => void;
  refreshTrigger?: number; // Add a refresh trigger prop
}

export default function CreditBalance({ onBalanceUpdate, refreshTrigger }: CreditBalanceProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/credits");
      const data = await res.json();
      
      if (res.ok && data.user) {
        setUser(data.user);
        onBalanceUpdate?.(data.user.creditBalanceCents);
      } else {
        setError(data.message || "Failed to fetch balance");
        console.error("Credits API error:", data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      setError(errorMessage);
      console.error("Credits fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Watch for refresh trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setIsUpdating(true);
      fetchBalance().finally(() => {
        setTimeout(() => setIsUpdating(false), 1000); // Show updating state for 1 second
      });
    }
  }, [refreshTrigger]);

  const formatBalance = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getBalanceColor = (cents: number) => {
    if (cents < 200) return "text-red-700"; // Less than $2.00 - darker red for better contrast
    if (cents < 500) return "text-orange-700"; // Less than $5.00 - orange instead of yellow for better contrast
    return "text-green-700"; // $5.00 or more - darker green for better contrast
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 rounded-lg shadow-sm border border-red-200">
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-red-600">Error: {error}</span>
        <button
          onClick={fetchBalance}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 ${isUpdating ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}>
      <div className="flex items-center space-x-1">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <span className="text-sm font-medium text-gray-800">Credits:</span>
        <span className={`text-sm font-bold transition-colors duration-300 ${getBalanceColor(user?.creditBalanceCents || 0)} ${isUpdating ? 'animate-pulse' : ''}`}>
          {user ? formatBalance(user.creditBalanceCents) : "$10.00"}
        </span>
        {isUpdating && (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
      <button
        onClick={fetchBalance}
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        title="Refresh balance"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
