"use server";

import { clearFlashNotification } from "@/lib/flash-notifications";

export async function dismissFlashNotification(notificationId: string) {
	await clearFlashNotification(notificationId);
}
