"use client";
import Link from "next/link";
import CreditPurchase from "../../components/CreditPurchase";
import CreditHistory from "../../components/CreditHistory";
import CreditBalance from "../../components/CreditBalance";
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
    const [testUrl, setTestUrl] = useState("/api/credits");
    const [testResult, setTestResult] = useState<string>("");
    const [testing, setTesting] = useState(false);

    const runGetTest = async () => {
        setTesting(true);
        setTestResult("");
        try {
            const res = await fetch(testUrl, { method: "GET" });
            const text = await res.text();
            setTestResult(`Status: ${res.status}\n${text}`);
        } catch (err) {
            setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setTesting(false);
        }
    };

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
                {/* Temporary GET test tool */}
                <div className="max-w-3xl mx-auto mb-6 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <input
                            type="text"
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            placeholder="Enter GET URL (e.g. /api/credits)"
                        />
                        <button
                            onClick={runGetTest}
                            disabled={testing}
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium"
                        >
                            {testing ? "Testing..." : "Run GET"}
                        </button>
                    </div>
                    {testResult && (
                        <pre className="mt-3 p-3 bg-gray-900 text-green-300 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{testResult}</pre>
                    )}
                </div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Sign in with Google
              </button>
            </div>
          )}
        </div>

        {/* Credit History */}
        <div className="max-w-3xl mx-auto">
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


