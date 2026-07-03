"use server";

import { revalidatePath } from "next/cache";
import { addAppDays, getAppDateTimeFromKeys } from "@/lib/app-date";
import { getUserEffectiveTodayDate } from "@/lib/effective-day";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function revalidateNutritionViews() {
	revalidatePath("/nutrition");
	revalidatePath("/dashboard");
}

function getCalories(formData: FormData) {
	const calories = Number(formData.get("calories"));

	if (!Number.isFinite(calories)) {
		return null;
	}

	const roundedCalories = Math.round(calories);

	return roundedCalories >= 1 && roundedCalories <= 10000
		? roundedCalories
		: null;
}

function getWeightLbs(formData: FormData) {
	const weightLbs = Number(formData.get("weightLbs"));

	if (!Number.isFinite(weightLbs)) {
		return null;
	}

	const roundedWeight = Math.round(weightLbs * 10) / 10;

	return roundedWeight >= 1 && roundedWeight <= 1000 ? roundedWeight : null;
}

function getCalorieEntryDay(formData: FormData, today: Date) {
	const targetDay = String(formData.get("targetDay") ?? "today");

	return targetDay === "tomorrow" ? addAppDays(today, 1) : today;
}

function getFastingStartedAt(startDateKey?: string, startTimeKey?: string) {
	const now = new Date();

	if (!startDateKey || !startTimeKey) {
		return now;
	}

	const requestedStartedAt = getAppDateTimeFromKeys(startDateKey, startTimeKey);

	if (!requestedStartedAt || requestedStartedAt.getTime() > now.getTime()) {
		return now;
	}

	const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

	return requestedStartedAt.getTime() >= sevenDaysAgo ? requestedStartedAt : now;
}

export async function addCalorieEntry(formData: FormData) {
	const userId = await requireUserId();
	const effectiveDay = await getUserEffectiveTodayDate(userId);
	const calories = getCalories(formData);
	const day = getCalorieEntryDay(formData, effectiveDay.today);
	const note = String(formData.get("note") ?? "").trim();

	if (!calories) return;

	await prisma.calorieEntry.create({
		data: {
			userId,
			day,
			calories,
			note,
		},
	});

	revalidateNutritionViews();
}

export async function deleteCalorieEntry(calorieEntryId: string) {
	const userId = await requireUserId();

	await prisma.calorieEntry.deleteMany({
		where: {
			id: calorieEntryId,
			userId,
		},
	});

	revalidateNutritionViews();
}

export async function saveWeightEntry(formData: FormData) {
	const userId = await requireUserId();
	const effectiveDay = await getUserEffectiveTodayDate(userId);
	const weightLbs = getWeightLbs(formData);

	if (!weightLbs) return;

	await prisma.weightEntry.upsert({
		where: {
			userId_day: {
				userId,
				day: effectiveDay.today,
			},
		},
		update: {
			weightLbs,
		},
		create: {
			userId,
			day: effectiveDay.today,
			weightLbs,
		},
	});

	revalidateNutritionViews();
}

export async function saveStartingWeight(formData: FormData) {
	const userId = await requireUserId();
	const weightLbs = getWeightLbs(formData);

	if (!weightLbs) return;

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			startingWeightLbs: weightLbs,
			startingWeightSetAt: new Date(),
		},
	});

	revalidateNutritionViews();
}

export async function startFastingSession(
	startDateKey?: string,
	startTimeKey?: string,
) {
	const userId = await requireUserId();
	const startedAt = getFastingStartedAt(startDateKey, startTimeKey);

	await prisma.$transaction([
		prisma.fastingSession.updateMany({
			where: {
				userId,
				endedAt: null,
			},
			data: {
				endedAt: startedAt,
			},
		}),
		prisma.fastingSession.create({
			data: {
				userId,
				startedAt,
			},
		}),
	]);

	revalidateNutritionViews();
}

export async function endFastingSession() {
	const userId = await requireUserId();

	await prisma.fastingSession.updateMany({
		where: {
			userId,
			endedAt: null,
		},
		data: {
			endedAt: new Date(),
		},
	});

	revalidateNutritionViews();
}
