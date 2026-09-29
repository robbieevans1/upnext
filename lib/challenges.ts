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

export function getChallengeProgress(
	challenge: ChallengeWithResults,
	today: Date,
): ChallengeProgress {
	const durationDays = Math.max(1, challenge.durationDays);
	const yesterday = addAppDays(today, -1);
	const statusByDay = new Map(
		challenge.dailyCheck.results.map((result) => [
			getAppDateKey(result.targetDay),
			result.status,
		]),
	);
	let currentStreak = 0;
	let completedOn: Date | null = null;

	for (
		let day = challenge.startDay;
		day.getTime() <= yesterday.getTime();
		day = addAppDays(day, 1)
	) {
		const status = statusByDay.get(getAppDateKey(day));

		// Yesterday is still awaiting its review; older missing days break the run.
		if (!status && getAppDateKey(day) === getAppDateKey(yesterday)) {
			break;
		}

		currentStreak = status === "YES" ? currentStreak + 1 : 0;
		if (currentStreak === durationDays) {
			completedOn = day;
			break;
		}
	}

	const hasStarted = today.getTime() >= challenge.startDay.getTime();
	const daysElapsed = hasStarted ? Math.min(durationDays, currentStreak + 1) : 0;
	const endDay =
		completedOn ??
		addAppDays(
			hasStarted ? today : challenge.startDay,
			durationDays - currentStreak - 1,
		);

	return {
		id: challenge.id,
		title: challenge.title,
		description: challenge.description,
		startDay: challenge.startDay,
		endDay,
		durationDays,
		successfulDays: currentStreak,
		currentStreak,
		daysElapsed,
		daysRemaining: Math.max(0, durationDays - daysElapsed),
		isComplete: completedOn !== null,
		needsReview:
			yesterday.getTime() >= challenge.startDay.getTime() &&
			yesterday.getTime() <= endDay.getTime() &&
			!statusByDay.has(getAppDateKey(yesterday)),
	};
}

export function getChallengeReviewQuestion(title: string) {
	return `Did you keep this challenge yesterday: ${title}?`;
}
