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
        className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors font-medium text-sm"
        title="Sign in with Google to access your wallet"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span>Sign In</span>
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
    <div className="flex items-center space-x-2">
      {/* Wallet Display */}
      <div className={`flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200 transition-all duration-300 ${isUpdating ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}>
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <span className={`text-sm font-medium transition-colors duration-300 ${getBalanceColor(user?.creditBalanceCents || 0)} ${isUpdating ? 'animate-pulse' : ''}`}>
          {user ? formatBalance(user.creditBalanceCents) : "$0.00"}
        </span>
        {isUpdating && (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* Account Actions - Only show when authenticated */}
      {status === "authenticated" && (
        <div className="flex items-center space-x-1">
          {/* Switch Account Button */}
          <button
            onClick={() => {
              signOut({ callbackUrl: window.location.href }).then(() => {
                // After sign out, sign in with account selection
                signIn("google");
              });
            }}
            className="flex items-center space-x-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-700 transition-colors text-xs font-medium"
            title="Switch to a different Google account"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Switch</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-1 px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-700 transition-colors text-xs font-medium"
            title="Sign out"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
