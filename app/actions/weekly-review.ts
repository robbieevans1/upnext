"use server";

import { revalidatePath } from "next/cache";
import { getAppDateFromKey } from "@/lib/app-date";
import { setFlashNotification } from "@/lib/flash-notifications";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";
import { isWeeklyReviewEnabledForWeek } from "@/lib/weekly-review";

function getTextValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

export async function saveWeeklyReview(formData: FormData) {
	const userId = await requireUserId();
	const weekStart = getAppDateFromKey(getTextValue(formData, "weekStart"));
	const intent = getTextValue(formData, "intent");

	if (!weekStart || !isWeeklyReviewEnabledForWeek(weekStart)) {
		return;
	}

	const reviewData = {
		movedForward: getTextValue(formData, "movedForward"),
		busyNotUseful: getTextValue(formData, "busyNotUseful"),
		moreNextWeek: getTextValue(formData, "moreNextWeek"),
		lessNextWeek: getTextValue(formData, "lessNextWeek"),
		taskChanges: getTextValue(formData, "taskChanges"),
		routineAligned: getTextValue(formData, "routineAligned"),
	};
	const completedAt = intent === "complete" ? new Date() : null;

	await prisma.weeklyReview.upsert({
		where: {
			userId_weekStart: {
				userId,
				weekStart,
			},
		},
		update: {
			...reviewData,
			...(completedAt ? { completedAt } : {}),
		},
		create: {
			userId,
			weekStart,
			...reviewData,
			completedAt,
		},
	});

	await setFlashNotification(
		completedAt ? "Weekly review completed." : "Weekly review draft saved.",
	);
	revalidatePath("/history");
	revalidatePath("/today");
}
