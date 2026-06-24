"use server";

import { revalidatePath } from "next/cache";
import { getAppDateFromKey } from "@/lib/app-date";
import { setFlashNotification } from "@/lib/flash-notifications";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateActionItemViews() {
	revalidatePath("/today");
	revalidatePath("/action-items");
}

function getOptionalAppDate(formData: FormData, key: string) {
	const value = String(formData.get(key) ?? "").trim();

	if (!value) {
		return null;
	}

	return getAppDateFromKey(value);
}

export async function createActionItem(formData: FormData) {
	const userId = await requireUserId();
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const dueOn = getOptionalAppDate(formData, "dueOn");

	if (!title) return;

	await prisma.actionItem.create({
		data: {
			title,
			description,
			playbook,
			dueOn,
			userId,
		},
	});

	await setFlashNotification("Action item created.");
	revalidateActionItemViews();
}

export async function updateActionItem(formData: FormData) {
	const userId = await requireUserId();
	const actionItemId = String(formData.get("actionItemId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const dueOn = getOptionalAppDate(formData, "dueOn");

	if (!actionItemId || !title) return;

	await prisma.actionItem.updateMany({
		where: {
			id: actionItemId,
			userId,
		},
		data: {
			title,
			description,
			playbook,
			dueOn,
		},
	});

	await setFlashNotification("Action item updated.");
	revalidateActionItemViews();
}

export async function completeActionItem(actionItemId: string) {
	const userId = await requireUserId();

	await prisma.actionItem.updateMany({
		where: {
			id: actionItemId,
			userId,
			completedAt: null,
			canceledAt: null,
		},
		data: {
			completedAt: new Date(),
		},
	});

	await setFlashNotification("Action item completed.");
	revalidateActionItemViews();
}

export async function reopenActionItem(actionItemId: string) {
	const userId = await requireUserId();

	await prisma.actionItem.updateMany({
		where: {
			id: actionItemId,
			userId,
		},
		data: {
			completedAt: null,
			canceledAt: null,
		},
	});

	await setFlashNotification("Action item reopened.");
	revalidateActionItemViews();
}

export async function cancelActionItem(actionItemId: string) {
	const userId = await requireUserId();

	await prisma.actionItem.updateMany({
		where: {
			id: actionItemId,
			userId,
			completedAt: null,
		},
		data: {
			canceledAt: new Date(),
		},
	});

	await setFlashNotification("Action item canceled.");
	revalidateActionItemViews();
}
