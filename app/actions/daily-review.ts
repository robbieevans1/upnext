"use server";

import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { getAppDateFromKey } from "@/lib/app-date";
import { prisma } from "@/lib/prisma";
import { DailyCheckStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const DAILY_CHECK_STATUSES = new Set<string>([
	DailyCheckStatus.YES,
	DailyCheckStatus.NO,
	DailyCheckStatus.SKIP,
	DailyCheckStatus.UNSURE,
]);

function revalidateDailyReviewViews() {
	revalidatePath("/today");
	revalidatePath("/tasks");
	revalidatePath("/history");
	revalidatePath("/dashboard");
}

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}

export async function createDailyCheck(formData: FormData) {
	const userId = await getCurrentUserId();
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();

	if (!title) return;

	const existingChecks = await prisma.dailyCheck.count({
		where: {
			userId,
			isActive: true,
		},
	});

	await prisma.dailyCheck.create({
		data: {
			title,
			description,
			userId,
			sortOrder: existingChecks,
		},
	});

	revalidateDailyReviewViews();
}

export async function updateDailyCheck(formData: FormData) {
	const userId = await getCurrentUserId();
	const dailyCheckId = String(formData.get("dailyCheckId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();

	if (!dailyCheckId || !title) return;

	await prisma.dailyCheck.updateMany({
		where: {
			id: dailyCheckId,
			userId,
			isActive: true,
		},
		data: {
			title,
			description,
		},
	});

	revalidateDailyReviewViews();
}

export async function deleteDailyCheck(dailyCheckId: string) {
	const userId = await getCurrentUserId();

	await prisma.dailyCheck.updateMany({
		where: {
			id: dailyCheckId,
			userId,
			isActive: true,
		},
		data: {
			isActive: false,
		},
	});

	revalidateDailyReviewViews();
}

export async function saveDailyReview(formData: FormData) {
	const userId = await getCurrentUserId();
	const targetDayKey = String(formData.get("targetDay") ?? "");
	const targetDay = getAppDateFromKey(targetDayKey);

	if (!targetDay) return;

	const activeChecks = await prisma.dailyCheck.findMany({
		where: {
			userId,
			isActive: true,
		},
		select: {
			id: true,
		},
	});
	const activeCheckIds = new Set(activeChecks.map((check) => check.id));

	const operations = Array.from(formData.entries())
		.filter(([key, value]) => {
			if (!key.startsWith("status:")) return false;

			const dailyCheckId = key.replace("status:", "");
			return activeCheckIds.has(dailyCheckId) && DAILY_CHECK_STATUSES.has(String(value));
		})
		.map(([key, value]) => {
			const dailyCheckId = key.replace("status:", "");
			const status = String(value) as DailyCheckStatus;

			return prisma.dailyCheckResult.upsert({
				where: {
					dailyCheckId_targetDay: {
						dailyCheckId,
						targetDay,
					},
				},
				update: {
					status,
				},
				create: {
					dailyCheckId,
					userId,
					targetDay,
					status,
				},
			});
		});

	if (operations.length > 0) {
		await prisma.$transaction(operations);
	}

	revalidateDailyReviewViews();
}

export async function dismissDailyReview(targetDayKey: string) {
	const userId = await getCurrentUserId();
	const targetDay = getAppDateFromKey(targetDayKey);

	if (!targetDay) return;

	await prisma.dailyReviewDismissal.upsert({
		where: {
			userId_targetDay: {
				userId,
				targetDay,
			},
		},
		update: {
			dismissedAt: new Date(),
		},
		create: {
			userId,
			targetDay,
		},
	});

	revalidatePath("/today");
}
