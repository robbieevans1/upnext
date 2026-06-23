import { addAppDays, getAppDateKey } from "@/lib/app-date";

type ChallengeReviewStatus = "YES" | "NO" | "SKIP" | "UNSURE";

export type ChallengeWithResults = {
	id: string;
	title: string;
	description: string | null;
	startDay: Date;
	durationDays: number;
	dailyCheck: {
		results: {
			targetDay: Date;
			status: ChallengeReviewStatus;
		}[];
	};
};

export type ChallengeProgress = {
	id: string;
	title: string;
	description: string | null;
	startDay: Date;
	endDay: Date;
	durationDays: number;
	successfulDays: number;
	currentStreak: number;
	daysElapsed: number;
	daysRemaining: number;
	isComplete: boolean;
	needsReview: boolean;
};

function getInclusiveAppDayDiff(startDay: Date, endDay: Date) {
	return Math.max(
		0,
		Math.floor(
			(endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24),
		) + 1,
	);
}

function getEarlierAppDay(a: Date, b: Date) {
	return a.getTime() <= b.getTime() ? a : b;
}

export function getChallengeProgress(
	challenge: ChallengeWithResults,
	today: Date,
): ChallengeProgress {
	const durationDays = Math.max(1, challenge.durationDays);
	const endDay = addAppDays(challenge.startDay, durationDays - 1);
	const yesterday = addAppDays(today, -1);
	const reviewThrough = getEarlierAppDay(yesterday, endDay);
	const statusByDay = new Map(
		challenge.dailyCheck.results.map((result) => [
			getAppDateKey(result.targetDay),
			result.status,
		]),
	);
	const successfulDays = Array.from(statusByDay.values()).filter(
		(status) => status === "YES",
	).length;
	let currentStreak = 0;

	for (
		let day = reviewThrough;
		day.getTime() >= challenge.startDay.getTime();
		day = addAppDays(day, -1)
	) {
		const status = statusByDay.get(getAppDateKey(day));

		if (!status) {
			if (currentStreak === 0) {
				continue;
			}
			break;
		}

		if (status !== "YES") {
			break;
		}

		currentStreak += 1;
	}

	const elapsedThrough = getEarlierAppDay(today, endDay);
	const daysElapsed =
		today.getTime() < challenge.startDay.getTime()
			? 0
			: getInclusiveAppDayDiff(challenge.startDay, elapsedThrough);

	return {
		id: challenge.id,
		title: challenge.title,
		description: challenge.description,
		startDay: challenge.startDay,
		endDay,
		durationDays,
		successfulDays,
		currentStreak,
		daysElapsed,
		daysRemaining: Math.max(0, durationDays - daysElapsed),
		isComplete: today.getTime() > endDay.getTime(),
		needsReview:
			yesterday.getTime() >= challenge.startDay.getTime() &&
			yesterday.getTime() <= endDay.getTime() &&
			!statusByDay.has(getAppDateKey(yesterday)),
	};
}

export function getChallengeReviewQuestion(title: string) {
	return `Did you keep this challenge yesterday: ${title}?`;
}
