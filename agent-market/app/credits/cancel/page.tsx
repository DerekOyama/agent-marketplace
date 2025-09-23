"use client";

import Link from "next/link";

export default function CreditPurchaseCancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Purchase Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your credit purchase was cancelled. No charges have been made to your account.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors block"
          >
            Return to Agent Marketplace
          </Link>
          <Link
            href="/?showCreditPurchase=true"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors block"
          >
            Try Purchase Again
          </Link>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact support if you have any questions about purchasing credits.
          </p>
        </div>
      </div>
    </div>
  );
}
