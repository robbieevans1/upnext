"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAppDateFromKey, getAppDateTimeFromKeys } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";

function revalidateCommitmentViews() {
	revalidatePath("/today");
	revalidatePath("/commitments");
}

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}

function getCommitmentDateTimes(formData: FormData) {
	const dayKey = String(formData.get("day") ?? "").trim();
	const startTime = String(formData.get("startTime") ?? "").trim();
	const endTime = String(formData.get("endTime") ?? "").trim();
	const day = getAppDateFromKey(dayKey);

	if (!day) {
		return null;
	}

	const startsAt = startTime ? getAppDateTimeFromKeys(dayKey, startTime) : null;
	const endsAt = endTime ? getAppDateTimeFromKeys(dayKey, endTime) : null;

	if ((startTime && !startsAt) || (endTime && !endsAt)) {
		return null;
	}

	return {
		day,
		startsAt,
		endsAt,
	};
}

export async function createCommitment(formData: FormData) {
	const userId = await getCurrentUserId();
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const location = String(formData.get("location") ?? "").trim();
	const dateTimes = getCommitmentDateTimes(formData);

	if (!title || !dateTimes) return;

	await prisma.commitment.create({
		data: {
			title,
			description,
			playbook,
			location,
			day: dateTimes.day,
			startsAt: dateTimes.startsAt,
			endsAt: dateTimes.endsAt,
			userId,
		},
	});

	revalidateCommitmentViews();
}

export async function updateCommitment(formData: FormData) {
	const userId = await getCurrentUserId();
	const commitmentId = String(formData.get("commitmentId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const location = String(formData.get("location") ?? "").trim();
	const dateTimes = getCommitmentDateTimes(formData);

	if (!commitmentId || !title || !dateTimes) return;

	await prisma.commitment.updateMany({
		where: {
			id: commitmentId,
			userId,
		},
		data: {
			title,
			description,
			playbook,
			location,
			day: dateTimes.day,
			startsAt: dateTimes.startsAt,
			endsAt: dateTimes.endsAt,
		},
	});

	revalidateCommitmentViews();
}

export async function completeCommitment(commitmentId: string) {
	const userId = await getCurrentUserId();

	await prisma.commitment.updateMany({
		where: {
			id: commitmentId,
			userId,
			completedAt: null,
			canceledAt: null,
		},
		data: {
			completedAt: new Date(),
		},
	});

	revalidateCommitmentViews();
}

export async function reopenCommitment(commitmentId: string) {
	const userId = await getCurrentUserId();

	await prisma.commitment.updateMany({
		where: {
			id: commitmentId,
			userId,
		},
		data: {
			completedAt: null,
			canceledAt: null,
		},
	});

	revalidateCommitmentViews();
}

export async function cancelCommitment(commitmentId: string) {
	const userId = await getCurrentUserId();

	await prisma.commitment.updateMany({
		where: {
			id: commitmentId,
			userId,
			completedAt: null,
		},
		data: {
			canceledAt: new Date(),
		},
	});

	revalidateCommitmentViews();
}
