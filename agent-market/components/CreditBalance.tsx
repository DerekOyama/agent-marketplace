"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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
  const { status } = useSession();

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/credits");
      const data = await res.json();
      
      if (res.status === 401) {
        // Not signed in; show default $0 without error
        setUser(null);
        try { localStorage.setItem("walletBalanceCents", String(0)); } catch {}
      } else if (res.ok && data.success && data.data?.user) {
        setUser(data.data.user);
        onBalanceUpdate?.(data.data.user.creditBalanceCents);
        try { localStorage.setItem("walletBalanceCents", String(data.data.user.creditBalanceCents)); } catch {}
      } else {
        // For any other error, clear cache and show error
        try { localStorage.removeItem("walletBalanceCents"); } catch {}
        setUser(null);
        setError("Failed to load balance");
        console.error("Credits API error:", data);
      }
    } catch (err) {
      // Network error: clear cache and show error
      try { localStorage.removeItem("walletBalanceCents"); } catch {}
      setUser(null);
      setError("Network error - please check your connection");
      console.error("Credits fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [onBalanceUpdate]);

  useEffect(() => {
    // If not authenticated, don't fetch; just show CTA quickly
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    // Clear any stale cache and fetch fresh data from API
    try { localStorage.removeItem("walletBalanceCents"); } catch {}
    fetchBalance();
  }, [fetchBalance, status]);

  // Watch for refresh trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setIsUpdating(true);
      fetchBalance().finally(() => {
        setTimeout(() => setIsUpdating(false), 1000); // Show updating state for 1 second
      });
    }
  }, [refreshTrigger, fetchBalance]);


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

  // If not authenticated, show Sign in button instead of $0.00
  if (status !== "authenticated") {
    return (
      <button
        onClick={() => signIn("google")}
        className="flex items-center space-x-3 px-6 py-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
        title="Sign in with Google to access your wallet"
      >
        <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-700" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sign in to</span>
          <span className="text-sm font-bold text-gray-900">Access Wallet</span>
        </div>
      </button>
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
    <div className="flex items-center space-x-3">
      {/* Wallet Button */}
      <div className={`flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 ${isUpdating ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}>
        <button
          onClick={() => {
            if (status !== "authenticated") {
              signIn("google");
            } else {
              window.location.href = '/funds';
            }
          }}
          title="View wallet / Add funds"
          className="flex items-center space-x-1 group"
        >
          <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <span className="text-sm font-medium text-gray-800">Wallet:</span>
          <span className={`text-sm font-bold transition-colors duration-300 ${getBalanceColor(user?.creditBalanceCents || 0)} ${isUpdating ? 'animate-pulse' : ''}`}>
            {user ? formatBalance(user.creditBalanceCents) : "$0.00"}
          </span>
          <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {isUpdating && (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}

        <button
          onClick={fetchBalance}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors p-1 rounded"
          title="Refresh balance"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Account Actions - Only show when authenticated */}
      {status === "authenticated" && (
        <div className="flex items-center space-x-2">
          {/* Switch Account Button */}
          <button
            onClick={() => {
              signOut({ callbackUrl: window.location.href }).then(() => {
                // After sign out, sign in with account selection
                signIn("google");
              });
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg shadow-sm border border-blue-300 transition-all duration-300 group"
            title="Switch to a different Google account"
          >
            <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Switch Account</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm border border-gray-300 transition-all duration-300 group"
            title="Sign out"
          >
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
