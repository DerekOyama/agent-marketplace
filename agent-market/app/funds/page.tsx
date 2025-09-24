"use client";
import Link from "next/link";
import CreditPurchase from "../../components/CreditPurchase";
import CreditHistory from "../../components/CreditHistory";
import CreditBalance from "../../components/CreditBalance";
import PayoutDashboard from "../../components/PayoutDashboard";
import MyAgents from "../../components/MyAgents";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

function FundsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { status } = useSession();
    const paymentStatus = useMemo(() => searchParams.get("payment"), [searchParams]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // When returning from Stripe success, trigger confirm endpoint and poll briefly
    useEffect(() => {
        if (paymentStatus === "success") {
            setShowSuccess(true);
            let ticks = 0;
            const sessionId = searchParams.get("session_id");

            if (sessionId) {
                fetch(`/api/credits/confirm?session_id=${encodeURIComponent(sessionId)}`)
                    .then(() => setRefreshTrigger((v) => v + 1))
                    .catch(() => {});
            }
            // poll balance/history for up to ~15s
            const interval = setInterval(() => {
                setRefreshTrigger((v) => v + 1);
                ticks += 1;
                if (ticks >= 7) { // ~14s if 2s cadence
                    clearInterval(interval);
                }
            }, 2000);

            // clean URL after a short delay
            const timeout = setTimeout(() => {
                router.replace("/funds");
            }, 3000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [paymentStatus, router, searchParams]);

    return (
		<main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="flex items-center justify-between mb-6">
						<Link 
							href="/" 
							className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
						>
							← Back to Agents
						</Link>
            <h1 className="text-4xl font-bold text-gray-900">Wallet & Earnings</h1>
            <div className="w-32 flex justify-end">
              <CreditBalance refreshTrigger={refreshTrigger} />
            </div>
					</div>
					<p className="text-lg text-gray-800 mb-6">
						Manage your wallet balance and track your agent earnings.
					</p>
                    {showSuccess && (
                        <div className="max-w-3xl mx-auto mb-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-800 border border-green-200">
                                Payment succeeded. Updating your balance...
                            </div>
                        </div>
                    )}
				</div>

        {/* Add Funds Component */}
        <div className="max-w-3xl mx-auto mb-8">
          {status === "authenticated" ? (
            <CreditPurchase />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to manage your wallet</h3>
              <p className="text-gray-700 mb-4">You can view this page, but you must sign in to add funds or view history.</p>
              <button
                onClick={() => signIn("google")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Earnings & Payouts */}
        <div className="max-w-7xl mx-auto mb-8">
          {status === "authenticated" ? (
            <PayoutDashboard />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-700">
              Sign in to view your earnings and request payouts.
            </div>
          )}
        </div>

        {/* My Agents */}
        <div className="max-w-7xl mx-auto mb-8">
          {status === "authenticated" ? (
            <MyAgents refreshTrigger={refreshTrigger} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-700">
              Sign in to view your agents and revenue.
            </div>
          )}
        </div>

        {/* Credit History */}
        <div className="max-w-3xl mx-auto mb-8">
          {status === "authenticated" ? (
            <CreditHistory refreshTrigger={refreshTrigger} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-700">
              Sign in to view your balance history.
            </div>
          )}
        </div>
			</div>
		</main>
	);
}

export default function FundsPage() {
	return (
		<Suspense fallback={
			<main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
						<p className="mt-2 text-gray-600">Loading...</p>
					</div>
				</div>
			</main>
		}>
			<FundsPageContent />
		</Suspense>
	);
}


