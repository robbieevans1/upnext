"use server";

import { revalidatePath } from "next/cache";
import { getAppDateTimeFromKeys } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateAnnouncementViews() {
	revalidatePath("/announcements");
	revalidatePath("/");
}

function getAnnouncementTargetAt(formData: FormData) {
	const dateKey = String(formData.get("targetDate") ?? "").trim();
	const timeKey = String(formData.get("targetTime") ?? "").trim();

	if (!dateKey || !timeKey) {
		return null;
	}

	return getAppDateTimeFromKeys(dateKey, timeKey);
}

export async function createAnnouncement(formData: FormData) {
	const userId = await requireUserId();
	const title = String(formData.get("title") ?? "").trim();
	const targetAt = getAnnouncementTargetAt(formData);

	if (!title || !targetAt || targetAt.getTime() <= Date.now()) return;

	await prisma.announcement.create({
		data: {
			title,
			targetAt,
			userId,
		},
	});

	revalidateAnnouncementViews();
}

export async function updateAnnouncement(formData: FormData) {
	const userId = await requireUserId();
	const announcementId = String(formData.get("announcementId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const targetAt = getAnnouncementTargetAt(formData);

	if (!announcementId || !title || !targetAt || targetAt.getTime() <= Date.now()) {
		return;
	}

	await prisma.announcement.updateMany({
		where: {
			id: announcementId,
			userId,
			isActive: true,
		},
		data: {
			title,
			targetAt,
		},
	});

	revalidateAnnouncementViews();
}

export async function deleteAnnouncement(announcementId: string) {
	const userId = await requireUserId();

	await prisma.announcement.updateMany({
		where: {
			id: announcementId,
			userId,
			isActive: true,
		},
		data: {
			isActive: false,
		},
	});

	revalidateAnnouncementViews();
}
