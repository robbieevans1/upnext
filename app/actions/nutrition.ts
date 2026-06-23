"use server";

import { revalidatePath } from "next/cache";
import { addAppDays } from "@/lib/app-date";
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
