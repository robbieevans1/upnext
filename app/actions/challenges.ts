"use server";

import { revalidatePath } from "next/cache";
import { getAppDateFromKey, getAppTodayDate } from "@/lib/app-date";
import { getChallengeReviewQuestion } from "@/lib/challenges";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateChallengeViews() {
	revalidatePath("/today");
	revalidatePath("/tasks");
	revalidatePath("/dashboard");
}

function getDurationDays(formData: FormData) {
	const durationDays = Number(formData.get("durationDays"));

	if (!Number.isFinite(durationDays)) {
		return null;
	}

	const roundedDuration = Math.round(durationDays);

	return roundedDuration >= 1 && roundedDuration <= 3650
		? roundedDuration
		: null;
}

function getStartDay(formData: FormData) {
	const startDayKey = String(formData.get("startDay") ?? "").trim();

	if (!startDayKey) {
		return getAppTodayDate();
	}

	return getAppDateFromKey(startDayKey);
}

export async function createChallenge(formData: FormData) {
	const userId = await requireUserId();
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const startDay = getStartDay(formData);
	const durationDays = getDurationDays(formData);

	if (!title || !startDay || !durationDays) return;

	const activeChecks = await prisma.dailyCheck.count({
		where: {
			userId,
			isActive: true,
		},
	});

	await prisma.dailyCheck.create({
		data: {
			title: getChallengeReviewQuestion(title),
			description:
				description || `Track this challenge for ${durationDays} days.`,
			userId,
			sortOrder: activeChecks,
			challenge: {
				create: {
					title,
					description,
					startDay,
					durationDays,
					userId,
				},
			},
		},
	});

	revalidateChallengeViews();
}

export async function updateChallenge(formData: FormData) {
	const userId = await requireUserId();
	const challengeId = String(formData.get("challengeId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const startDay = getStartDay(formData);
	const durationDays = getDurationDays(formData);

	if (!challengeId || !title || !startDay || !durationDays) return;

	const challenge = await prisma.challenge.findFirst({
		where: {
			id: challengeId,
			userId,
			isActive: true,
		},
		select: {
			dailyCheckId: true,
		},
	});

	if (!challenge) return;

	await prisma.$transaction([
		prisma.challenge.updateMany({
			where: {
				id: challengeId,
				userId,
				isActive: true,
			},
			data: {
				title,
				description,
				startDay,
				durationDays,
			},
		}),
		prisma.dailyCheck.updateMany({
			where: {
				id: challenge.dailyCheckId,
				userId,
				isActive: true,
			},
			data: {
				title: getChallengeReviewQuestion(title),
				description:
					description || `Track this challenge for ${durationDays} days.`,
			},
		}),
	]);

	revalidateChallengeViews();
}

export async function deleteChallenge(challengeId: string) {
	const userId = await requireUserId();
	const challenge = await prisma.challenge.findFirst({
		where: {
			id: challengeId,
			userId,
			isActive: true,
		},
		select: {
			dailyCheckId: true,
		},
	});

	if (!challenge) return;

	await prisma.$transaction([
		prisma.challenge.updateMany({
			where: {
				id: challengeId,
				userId,
				isActive: true,
			},
			data: {
				isActive: false,
			},
		}),
		prisma.dailyCheck.updateMany({
			where: {
				id: challenge.dailyCheckId,
				userId,
				isActive: true,
			},
			data: {
				isActive: false,
			},
		}),
	]);

	revalidateChallengeViews();
}
