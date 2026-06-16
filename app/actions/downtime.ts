"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
	getAppTodayDate,
	getNextAppMidnightDate,
} from "@/lib/app-date";
import { isDowntimeCategory } from "@/lib/downtime";
import { prisma } from "@/lib/prisma";

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}

async function rolloverActiveDowntimeSession(userId: string, now = new Date()) {
	const activeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (!activeSession) {
		return false;
	}

	const today = getAppTodayDate(now);

	if (activeSession.startedAt.getTime() >= today.getTime()) {
		return false;
	}

	const operations = [];
	let nextBoundary = getNextAppMidnightDate(activeSession.startedAt);

	operations.push(
		prisma.downtimeSession.update({
			where: {
				id: activeSession.id,
			},
			data: {
				stoppedAt: nextBoundary,
			},
		}),
	);

	while (nextBoundary.getTime() < today.getTime()) {
		const segmentStart = nextBoundary;
		const segmentEnd = getNextAppMidnightDate(segmentStart);

		operations.push(
			prisma.downtimeSession.create({
				data: {
					userId,
					category: activeSession.category,
					day: segmentStart,
					startedAt: segmentStart,
					stoppedAt: segmentEnd,
				},
			}),
		);

		nextBoundary = segmentEnd;
	}

	operations.push(
		prisma.downtimeSession.create({
			data: {
				userId,
				category: activeSession.category,
				day: today,
				startedAt: today,
			},
		}),
	);

	await prisma.$transaction(operations);

	return true;
}

export async function syncDowntimeDay() {
	const userId = await getCurrentUserId();
	const didRollover = await rolloverActiveDowntimeSession(userId);

	if (didRollover) {
		revalidatePath("/downtime");
	}

	return didRollover;
}

export async function startDowntimeSession(category: string) {
	const userId = await getCurrentUserId();

	if (!isDowntimeCategory(category)) {
		return;
	}

	await rolloverActiveDowntimeSession(userId);

	const activeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
	});

	if (activeSession) {
		return;
	}

	const now = new Date();

	await prisma.downtimeSession.create({
		data: {
			userId,
			category,
			day: getAppTodayDate(now),
			startedAt: now,
		},
	});

	revalidatePath("/downtime");
}

export async function stopDowntimeSession() {
	const userId = await getCurrentUserId();
	await rolloverActiveDowntimeSession(userId);

	const activeSession = await prisma.downtimeSession.findFirst({
		where: {
			userId,
			stoppedAt: null,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	if (!activeSession) {
		return;
	}

	await prisma.downtimeSession.update({
		where: {
			id: activeSession.id,
		},
		data: {
			stoppedAt: new Date(),
		},
	});

	revalidatePath("/downtime");
}
