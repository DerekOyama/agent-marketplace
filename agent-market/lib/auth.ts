import type { Session } from "next-auth";

export async function getCurrentUserId(): Promise<string | null> {
	const { getServerSession } = await import("next-auth");
	const { authOptions } = await import("./auth-config");
	const session = (await getServerSession(authOptions)) as Session | null;
	const userId = (session?.user as (Session["user"] & { id?: string }))?.id;
	return userId ?? null;
}
