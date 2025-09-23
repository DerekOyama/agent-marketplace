"use client";

import { useState } from "react";

interface PaymentTestResult {
  success?: boolean;
  error?: string;
  paymentIntent?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    clientSecret: string;
    description: string;
  };
  session?: {
    id: string;
    url: string;
    amountTotal: number;
    currency: string;
  };
  mockResponse?: Record<string, unknown>;
  message?: string;
}

export default function StripePaymentTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentTestResult | null>(null);
  const [amountCents, setAmountCents] = useState(1000);
  const [currency, setCurrency] = useState("usd");

  const testPayment = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/stripe/test-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          currency,
          description: "Test payment for Agent Marketplace"
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: "network_error",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const testCheckout = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          currency,
          description: "Agent Marketplace Credits",
          successUrl: `${window.location.origin}?payment=success`,
          cancelUrl: `${window.location.origin}?payment=cancelled`
        })
      });

      const data = await response.json();
      setResult(data);
      
      // If we got a checkout URL, open it in a new tab
      if (data.success && data.session?.url) {
        window.open(data.session.url, '_blank');
      }
    } catch (error) {
      setResult({
        error: "network_error",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/stripe/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: "network_error",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/stripe/status");
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: "network_error",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stripe Payment Testing</h3>
      
      {/* Configuration */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (cents)
          </label>
          <input
            type="number"
            value={amountCents}
            onChange={(e) => setAmountCents(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="50"
            step="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            ${(amountCents / 100).toFixed(2)} USD
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
            <option value="cad">CAD</option>
          </select>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={checkStatus}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? "Loading..." : "Check Status"}
        </button>
        
        <button
          onClick={testPayment}
          disabled={loading}
          className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? "Testing..." : "Test Payment"}
        </button>
        
        <button
          onClick={testWebhook}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? "Testing..." : "Test Webhook"}
        </button>
        
        <button
          onClick={testCheckout}
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? "Creating..." : "Checkout Session"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <div className="bg-gray-900 text-green-400 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h4 className="text-md font-semibold text-white">Test Result</h4>
              <button
                onClick={() => setResult(null)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap break-words leading-relaxed font-mono text-sm overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
