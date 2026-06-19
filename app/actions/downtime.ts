"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isDowntimeCategory } from "@/lib/downtime";
import {
	ensureDefaultDowntimeSession,
	rolloverActiveDowntimeSession,
	rolloverActiveTaskSession,
	switchDowntimeSession,
} from "@/lib/time-tracking";

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}

export async function syncDowntimeDay() {
	const userId = await getCurrentUserId();
	const didDowntimeRollover = await rolloverActiveDowntimeSession(userId);
	const didTaskRollover = await rolloverActiveTaskSession(userId);
	await ensureDefaultDowntimeSession(userId);

	if (didDowntimeRollover || didTaskRollover) {
		revalidatePath("/downtime");
		revalidatePath("/today");
	}

	return didDowntimeRollover || didTaskRollover;
}

export async function startDowntimeSession(category: string) {
	const userId = await getCurrentUserId();

	if (!isDowntimeCategory(category)) {
		return;
	}

	await switchDowntimeSession(userId, category);

	revalidatePath("/downtime");
	revalidatePath("/today");
}
