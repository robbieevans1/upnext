"use server";

import { revalidatePath } from "next/cache";
import { setFlashNotification } from "@/lib/flash-notifications";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateTopicViews() {
	revalidatePath("/topics");
}

function revalidateTopicDetail(topicId: string) {
	revalidateTopicViews();
	revalidatePath(`/topics/${topicId}`);
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

	await setFlashNotification("Topic created.");
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

	await setFlashNotification("Topic updated.");
	revalidateTopicDetail(topicId);
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

	await setFlashNotification("Topic archived.");
	revalidateTopicDetail(topicId);
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

	await setFlashNotification("Topic restored.");
	revalidateTopicDetail(topicId);
}
