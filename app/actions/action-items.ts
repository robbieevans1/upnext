"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAppDateFromKey } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";

function revalidateActionItemViews() {
	revalidatePath("/today");
	revalidatePath("/action-items");
}

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}

function getOptionalAppDate(formData: FormData, key: string) {
	const value = String(formData.get(key) ?? "").trim();

	if (!value) {
		return null;
	}

	return getAppDateFromKey(value);
}

export async function createActionItem(formData: FormData) {
	const userId = await getCurrentUserId();
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

	revalidateActionItemViews();
}

export async function updateActionItem(formData: FormData) {
	const userId = await getCurrentUserId();
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

	revalidateActionItemViews();
}

export async function completeActionItem(actionItemId: string) {
	const userId = await getCurrentUserId();

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

	revalidateActionItemViews();
}

export async function reopenActionItem(actionItemId: string) {
	const userId = await getCurrentUserId();

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

	revalidateActionItemViews();
}

export async function cancelActionItem(actionItemId: string) {
	const userId = await getCurrentUserId();

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

	revalidateActionItemViews();
}
