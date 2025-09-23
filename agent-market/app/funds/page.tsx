"use client";
import Link from "next/link";
import CreditPurchase from "../../components/CreditPurchase";
import CreditHistory from "../../components/CreditHistory";
import CreditBalance from "../../components/CreditBalance";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FundsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
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
            <h1 className="text-4xl font-bold text-gray-900">Add Funds</h1>
            <div className="w-32 flex justify-end">
              <CreditBalance refreshTrigger={refreshTrigger} />
            </div>
					</div>
					<p className="text-lg text-gray-800 mb-6">
						Add money to your account balance to pay for agent executions.
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
          <CreditPurchase />
        </div>

        {/* Credit History */}
        <div className="max-w-3xl mx-auto">
          <CreditHistory refreshTrigger={refreshTrigger} />
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


