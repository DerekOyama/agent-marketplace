"use client";

import { useState } from "react";

interface CreditPurchaseProps {
  onPurchaseComplete?: () => void;
  onBalanceUpdate?: () => void;
}

interface PurchaseResult {
  success?: boolean;
  error?: string;
  session?: {
    id: string;
    url: string;
    amountTotal: number;
    currency: string;
  };
  purchase?: {
    id: string;
    amountCents: number;
    creditsPurchased: number;
    status: string;
  };
  mockResponse?: Record<string, unknown>;
  message?: string;
}

const CREDIT_PACKAGES = [
  { amountCents: 1000, credits: 1000, label: "$10", description: "1,000 credits" },
  { amountCents: 2500, credits: 2500, label: "$25", description: "2,500 credits" },
  { amountCents: 5000, credits: 5000, label: "$50", description: "5,000 credits" },
  { amountCents: 10000, credits: 10000, label: "$100", description: "10,000 credits" },
  { amountCents: 25000, credits: 25000, label: "$250", description: "25,000 credits" },
];

export default function CreditPurchase({ onPurchaseComplete, onBalanceUpdate }: CreditPurchaseProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0]>(CREDIT_PACKAGES[0]);
  const [result, setResult] = useState<PurchaseResult | null>(null);

  const purchaseCredits = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: selectedPackage.amountCents,
          currency: "usd",
          description: `Purchase ${selectedPackage.credits} credits`
        })
      });

      const data = await response.json();
      setResult(data);
      
      // If we got a checkout URL, open it in a new tab
      if (data.success && data.session?.url) {
        window.open(data.session.url, '_blank');
        
        // In test mode, credits are added immediately, so refresh the UI
        setTimeout(() => {
          onPurchaseComplete?.();
          onBalanceUpdate?.();
        }, 1000); // Wait 1 second for the backend to process
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Credits</h3>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Choose a credit package to top up your account. Credits are used to execute AI agents.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.amountCents}
              onClick={() => setSelectedPackage(pkg)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPackage.amountCents === pkg.amountCents
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{pkg.label}</div>
                <div className="text-sm text-gray-600">{pkg.description}</div>
                <div className="text-xs text-gray-500 mt-1">1 credit = $0.01</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Selected Package:</span>
          <div className="text-right">
            <div className="font-semibold text-gray-900">{selectedPackage.label}</div>
            <div className="text-sm text-gray-600">{selectedPackage.description}</div>
          </div>
        </div>
      </div>

      <button
        onClick={purchaseCredits}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {loading ? "Processing..." : `Purchase ${selectedPackage.credits} Credits for ${selectedPackage.label}`}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <div className="bg-gray-900 text-green-400 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h4 className="text-md font-semibold text-white">Purchase Result</h4>
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

      <div className="mt-4 text-xs text-gray-500">
        <p>• Credits are added to your account immediately after successful payment</p>
        <p>• Each agent execution costs 50 credits ($0.50)</p>
        <p>• Credits never expire and can be used for any agent</p>
      </div>
    </div>
  );
}
