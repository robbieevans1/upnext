"use server";

import { revalidatePath } from "next/cache";
import { getAppDateFromKey, getAppDateTimeFromKeys } from "@/lib/app-date";
import {
	getAppDayOfWeek,
	getCommitmentRecurrenceDays,
	parseWeekday,
	parseWeekdays,
} from "@/lib/commitments";
import { setFlashNotification } from "@/lib/flash-notifications";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";
import { CommitmentRecurrence } from "@prisma/client";

function revalidateCommitmentViews() {
	revalidatePath("/today");
	revalidatePath("/commitments");
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

function getCommitmentRecurrence(formData: FormData) {
	const recurrence =
		formData.get("isWeekly") === "on"
			? CommitmentRecurrence.WEEKLY
			: CommitmentRecurrence.NONE;

	if (recurrence !== CommitmentRecurrence.WEEKLY) {
		return {
			recurrence,
			recurrenceDayOfWeek: null,
			recurrenceDays: [],
		};
	}

	const parsedRecurrenceDays = parseWeekdays(formData.getAll("recurrenceDays"));
	const legacyRecurrenceDay = parseWeekday(formData.get("recurrenceDayOfWeek"));
	const recurrenceDays =
		parsedRecurrenceDays.length > 0
			? parsedRecurrenceDays
			: legacyRecurrenceDay === null
				? []
				: [legacyRecurrenceDay];

	if (recurrenceDays.length === 0) {
		return null;
	}

	return {
		recurrence,
		recurrenceDayOfWeek: recurrenceDays[0],
		recurrenceDays,
	};
}

export async function createCommitment(formData: FormData) {
	const userId = await requireUserId();
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const location = String(formData.get("location") ?? "").trim();
	const dateTimes = getCommitmentDateTimes(formData);
	const recurrence = getCommitmentRecurrence(formData);

	if (!title || !dateTimes || !recurrence) return;

	await prisma.commitment.create({
		data: {
			title,
			description,
			playbook,
			location,
			day: dateTimes.day,
			startsAt: dateTimes.startsAt,
			endsAt: dateTimes.endsAt,
			recurrence: recurrence.recurrence,
			recurrenceDayOfWeek: recurrence.recurrenceDayOfWeek,
			recurrenceDays: recurrence.recurrenceDays,
			userId,
		},
	});

	await setFlashNotification("Commitment created.");
	revalidateCommitmentViews();
}

export async function updateCommitment(formData: FormData) {
	const userId = await requireUserId();
	const commitmentId = String(formData.get("commitmentId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const location = String(formData.get("location") ?? "").trim();
	const dateTimes = getCommitmentDateTimes(formData);
	const recurrence = getCommitmentRecurrence(formData);

	if (!commitmentId || !title || !dateTimes || !recurrence) return;

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
			recurrence: recurrence.recurrence,
			recurrenceDayOfWeek: recurrence.recurrenceDayOfWeek,
			recurrenceDays: recurrence.recurrenceDays,
		},
	});

	await setFlashNotification("Commitment updated.");
	revalidateCommitmentViews();
}

export async function completeCommitment(commitmentId: string) {
	const userId = await requireUserId();

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

	await setFlashNotification("Commitment completed.");
	revalidateCommitmentViews();
}

export async function completeCommitmentOccurrence(
	commitmentId: string,
	occurrenceDayKey: string,
) {
	const userId = await requireUserId();
	const occurrenceDay = getAppDateFromKey(occurrenceDayKey);

	if (!occurrenceDay) return;

	const commitment = await prisma.commitment.findFirst({
		where: {
			id: commitmentId,
			userId,
			recurrence: CommitmentRecurrence.WEEKLY,
			canceledAt: null,
			completedAt: null,
			day: {
				lte: occurrenceDay,
			},
		},
		select: {
			id: true,
			recurrenceDayOfWeek: true,
			recurrenceDays: true,
		},
	});

	if (!commitment) return;

	const recurrenceDays = getCommitmentRecurrenceDays(commitment);

	if (!recurrenceDays.includes(getAppDayOfWeek(occurrenceDay))) {
		return;
	}

	await prisma.commitmentOccurrenceCompletion.upsert({
		where: {
			commitmentId_occurrenceDay: {
				commitmentId,
				occurrenceDay,
			},
		},
		update: {},
		create: {
			commitmentId,
			userId,
			occurrenceDay,
		},
	});

	await setFlashNotification("Commitment occurrence completed.");
	revalidateCommitmentViews();
}

export async function reopenCommitment(commitmentId: string) {
	const userId = await requireUserId();

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

	await setFlashNotification("Commitment reopened.");
	revalidateCommitmentViews();
}

export async function cancelCommitment(commitmentId: string) {
	const userId = await requireUserId();

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

	await setFlashNotification("Commitment canceled.");
	revalidateCommitmentViews();
}
