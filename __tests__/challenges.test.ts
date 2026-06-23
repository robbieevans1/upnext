import { describe, expect, it } from "vitest";
import {
	getChallengeProgress,
	getChallengeReviewQuestion,
	type ChallengeWithResults,
} from "@/lib/challenges";

function appDay(dateKey: string) {
	return new Date(`${dateKey}T04:00:00.000Z`);
}

function buildChallenge(
	results: ChallengeWithResults["dailyCheck"]["results"],
	overrides: Partial<ChallengeWithResults> = {},
): ChallengeWithResults {
	return {
		id: "challenge-1",
		title: "Don't use social media",
		description: "No entertainment scrolling.",
		startDay: appDay("2026-06-20"),
		durationDays: 90,
		dailyCheck: {
			results,
		},
		...overrides,
	};
}

describe("challenge helpers", () => {
	it("formats the generated daily review question", () => {
		expect(getChallengeReviewQuestion("Don't use social media")).toBe(
			"Did you keep this challenge yesterday: Don't use social media?",
		);
	});

	it("tracks successful days and the current confirmed streak", () => {
		const progress = getChallengeProgress(
			buildChallenge([
				{ targetDay: appDay("2026-06-20"), status: "YES" },
				{ targetDay: appDay("2026-06-21"), status: "YES" },
				{ targetDay: appDay("2026-06-22"), status: "YES" },
			]),
			appDay("2026-06-23"),
		);

		expect(progress.currentStreak).toBe(3);
		expect(progress.successfulDays).toBe(3);
		expect(progress.daysElapsed).toBe(4);
		expect(progress.daysRemaining).toBe(86);
		expect(progress.needsReview).toBe(false);
	});

	it("resets the current streak when the latest reviewed day is not successful", () => {
		const progress = getChallengeProgress(
			buildChallenge([
				{ targetDay: appDay("2026-06-20"), status: "YES" },
				{ targetDay: appDay("2026-06-21"), status: "NO" },
				{ targetDay: appDay("2026-06-22"), status: "YES" },
				{ targetDay: appDay("2026-06-23"), status: "SKIP" },
			]),
			appDay("2026-06-24"),
		);

		expect(progress.currentStreak).toBe(0);
		expect(progress.successfulDays).toBe(2);
	});

	it("keeps the prior confirmed streak visible when yesterday is not reviewed yet", () => {
		const progress = getChallengeProgress(
			buildChallenge([
				{ targetDay: appDay("2026-06-20"), status: "YES" },
				{ targetDay: appDay("2026-06-21"), status: "YES" },
			]),
			appDay("2026-06-23"),
		);

		expect(progress.currentStreak).toBe(2);
		expect(progress.needsReview).toBe(true);
	});

	it("marks a challenge complete after its duration ends", () => {
		const progress = getChallengeProgress(
			buildChallenge([], {
				startDay: appDay("2026-06-20"),
				durationDays: 3,
			}),
			appDay("2026-06-24"),
		);

		expect(progress.endDay).toEqual(appDay("2026-06-22"));
		expect(progress.isComplete).toBe(true);
		expect(progress.daysRemaining).toBe(0);
	});
});
