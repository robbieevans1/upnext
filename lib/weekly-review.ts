import { getAppDateFromKey } from "@/lib/app-date";

export const WEEKLY_REVIEW_LAUNCH_WEEK_KEY = "2026-07-05";

export function getWeeklyReviewLaunchWeekStart() {
	const launchWeek = getAppDateFromKey(WEEKLY_REVIEW_LAUNCH_WEEK_KEY);

	if (!launchWeek) {
		throw new Error("Invalid weekly review launch week.");
	}

	return launchWeek;
}

export function isWeeklyReviewEnabledForWeek(weekStart: Date) {
	return weekStart.getTime() >= getWeeklyReviewLaunchWeekStart().getTime();
}
