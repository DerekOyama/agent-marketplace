"use client";

import { useState } from "react";

// Props interface removed as it's not used

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

const PACKAGES = [
	{ amountCents: 1000, label: "$10", description: "$10 to your balance" },
	{ amountCents: 2500, label: "$25", description: "$25 to your balance" },
	{ amountCents: 5000, label: "$50", description: "$50 to your balance" },
	{ amountCents: 10000, label: "$100", description: "$100 to your balance" },
	{ amountCents: 25000, label: "$250", description: "$250 to your balance" },
];

export default function CreditPurchase() {
	const [loading, setLoading] = useState(false);
	const [selectedPackage, setSelectedPackage] = useState<typeof PACKAGES[0]>(PACKAGES[0]);
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
					description: `Add ${selectedPackage.label} to balance`
				})
			});

			const data = await response.json();
			setResult(data);
			
			// If we got a checkout URL, redirect in the SAME tab
			if (data.success && data.session?.url) {
				window.location.href = data.session.url;
				return;
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
		<div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
			<h3 className="text-lg font-bold text-gray-900 mb-4">Add Funds</h3>
			
			<div className="mb-6">
				<p className="text-sm text-gray-900 mb-4">
					Choose an amount to add to your account balance.
				</p>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{PACKAGES.map((pkg) => (
						<button
							key={pkg.amountCents}
							onClick={() => setSelectedPackage(pkg)}
							className={`p-4 rounded-lg border-2 transition-all ${
								selectedPackage.amountCents === pkg.amountCents
									? 'border-blue-600 bg-blue-50'
									: 'border-gray-300 hover:border-gray-400'
							}`}
						>
							<div className="text-center">
								<div className="text-xl font-bold text-gray-900">{pkg.label}</div>
								<div className="text-sm text-gray-900">{pkg.description}</div>
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
				<div className="flex justify-between items-center">
					<span className="text-sm font-semibold text-gray-900">Selected Amount:</span>
					<div className="text-right">
						<div className="font-bold text-gray-900">{selectedPackage.label}</div>
						<div className="text-sm text-gray-900">{selectedPackage.description}</div>
					</div>
				</div>
			</div>

			<button
				onClick={purchaseCredits}
				disabled={loading}
				className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
			>
				{loading ? "Processing..." : `Add ${selectedPackage.label} to Balance`}
			</button>

			{/* Results */}
			{result && (
				<div className="mt-6">
					<div className="bg-gray-900 text-green-300 rounded-lg border border-gray-700 overflow-hidden">
						<div className="flex justify_between items-center p-4 border-b border-gray-700">
							<h4 className="text-md font-bold text-white">Purchase Result</h4>
							<button
								onClick={() => setResult(null)}
								className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
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

			<div className="mt-4 text-xs text-gray-900">
				<p>• Funds are added to your account after successful payment</p>
				<p>• Charges are made in USD</p>
			</div>
		</div>
	);
}
