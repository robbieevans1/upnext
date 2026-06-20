"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateTopicViews() {
	revalidatePath("/topics");
}

function getTopicFields(formData: FormData) {
	return {
		title: String(formData.get("title") ?? "").trim(),
		category: String(formData.get("category") ?? "").trim(),
		description: String(formData.get("description") ?? "").trim(),
		body: String(formData.get("body") ?? "").trim(),
	};
}

export async function createTopic(formData: FormData) {
	const userId = await requireUserId();
	const fields = getTopicFields(formData);

	if (!fields.title) return;

	await prisma.topic.create({
		data: {
			...fields,
			userId,
		},
	});

	revalidateTopicViews();
}

export async function updateTopic(formData: FormData) {
	const userId = await requireUserId();
	const topicId = String(formData.get("topicId") ?? "");
	const fields = getTopicFields(formData);

	if (!topicId || !fields.title) return;

	await prisma.topic.updateMany({
		where: {
			id: topicId,
			userId,
		},
		data: fields,
	});

	revalidateTopicViews();
}

export async function archiveTopic(topicId: string) {
	const userId = await requireUserId();

	await prisma.topic.updateMany({
		where: {
			id: topicId,
			userId,
			isArchived: false,
		},
		data: {
			isArchived: true,
		},
	});

	revalidateTopicViews();
}

export async function restoreTopic(topicId: string) {
	const userId = await requireUserId();

	await prisma.topic.updateMany({
		where: {
			id: topicId,
			userId,
			isArchived: true,
		},
		data: {
			isArchived: false,
		},
	});

	revalidateTopicViews();
}
