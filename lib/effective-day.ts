import {
	addAppDays,
	getAppTodayDate,
	getNextAppMidnightDate,
} from "@/lib/app-date";
import { prisma } from "@/lib/prisma";

export type EffectiveDay = {
	realToday: Date;
	today: Date;
	tomorrow: Date;
	isStartedEarly: boolean;
};

function isSameAppDay(firstDate: Date, secondDate: Date) {
	return firstDate.getTime() === secondDate.getTime();
}

export async function getUserEffectiveTodayDate(
	userId: string,
	now = new Date(),
): Promise<EffectiveDay> {
	const realToday = getAppTodayDate(now);
	const tomorrow = addAppDays(realToday, 1);

	const override = await prisma.dayStartOverride.findUnique({
		where: {
			userId,
		},
	});

	const isActiveOverride =
		override &&
		override.expiresAt.getTime() > now.getTime() &&
		isSameAppDay(override.baseDay, realToday) &&
		isSameAppDay(override.targetDay, tomorrow);

	return {
		realToday,
		today: isActiveOverride ? tomorrow : realToday,
		tomorrow,
		isStartedEarly: Boolean(isActiveOverride),
	};
}

export async function startNextDayEarly(userId: string, now = new Date()) {
	const realToday = getAppTodayDate(now);
	const tomorrow = addAppDays(realToday, 1);
	const expiresAt = getNextAppMidnightDate(now);

	await prisma.dayStartOverride.upsert({
		where: {
			userId,
		},
		update: {
			baseDay: realToday,
			targetDay: tomorrow,
			expiresAt,
		},
		create: {
			userId,
			baseDay: realToday,
			targetDay: tomorrow,
			expiresAt,
		},
	});

	return {
		realToday,
		today: tomorrow,
		tomorrow,
		isStartedEarly: true,
	};
}
