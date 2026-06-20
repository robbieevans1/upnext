"use server";

import { revalidatePath } from "next/cache";
import { isDowntimeCategory } from "@/lib/downtime";
import { requireUserId } from "@/lib/server-auth";
import {
	ensureDefaultDowntimeSession,
	rolloverActiveDowntimeSession,
	rolloverActiveTaskSession,
	switchDowntimeSession,
} from "@/lib/time-tracking";

export async function syncDowntimeDay() {
	const userId = await requireUserId();
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
	const userId = await requireUserId();

	if (!isDowntimeCategory(category)) {
		return;
	}

	await switchDowntimeSession(userId, category);

	revalidatePath("/downtime");
	revalidatePath("/today");
}
