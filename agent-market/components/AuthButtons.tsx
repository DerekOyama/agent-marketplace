"use client";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
	const { data: session, status } = useSession();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (status === "loading") setLoading(true);
		else setLoading(false);
	}, [status]);

	if (loading) return <button disabled>Loading…</button>;

	if (!session) {
		return (
			<button onClick={() => signIn("google")}>
				Sign in with Google
			</button>
		);
	}

	return (
		<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
			<span>Hi, {session.user?.email}</span>
			<button onClick={() => signOut()}>Sign out</button>
		</div>
	);
}


