"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/server-auth";
import { startNextDayEarly } from "@/lib/effective-day";

export async function startTomorrowEarly() {
	const userId = await requireUserId();

	await startNextDayEarly(userId);

	revalidatePath("/today");
}
