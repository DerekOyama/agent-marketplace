"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function MyAgentsPage() {
	const { data: session } = useSession();
	const [webhookUrl, setWebhookUrl] = useState("");
	const [name, setName] = useState("");
	const [log, setLog] = useState<string>("");
	const [loading, setLoading] = useState(false);

	async function createFromWebhook() {
		setLoading(true);
		setLog("");
		try {
			const res = await fetch("/api/n8n/register-webhook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ webhookUrl, name }),
			});
			const json = await res.json();
			setLog(JSON.stringify(json, null, 2));
		} catch (e) {
			setLog(String(e));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={{ padding: 16, display: "grid", gap: 12 }}>
			<h1>My Agents</h1>
			{!session ? (
				<p>Please sign in to create and manage your agents.</p>
			) : (
				<>
					<div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
						<label>
							<span>Name</span>
							<input value={name} onChange={(e) => setName(e.target.value)} placeholder="My n8n Agent" style={{ width: "100%" }} />
						</label>
						<label>
							<span>Webhook URL</span>
							<input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n/webhook/..." style={{ width: "100%" }} />
						</label>
						<button disabled={loading || !webhookUrl} onClick={createFromWebhook}>
							{loading ? "Creating…" : "Register Webhook as Agent"}
						</button>
					</div>
					{log && (
						<pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, border: "1px solid #eee" }}>{log}</pre>
					)}
				</>
			)}
		</div>
	);
}


