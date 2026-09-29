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
		expect(progress.successfulDays).toBe(0);
		expect(progress.daysElapsed).toBe(1);
		expect(progress.daysRemaining).toBe(89);
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

	it("does not complete a challenge just because its original duration ended", () => {
		const progress = getChallengeProgress(
			buildChallenge([], {
				startDay: appDay("2026-06-20"),
				durationDays: 3,
			}),
			appDay("2026-06-24"),
		);

		expect(progress.endDay).toEqual(appDay("2026-06-26"));
		expect(progress.isComplete).toBe(false);
		expect(progress.daysElapsed).toBe(1);
		expect(progress.daysRemaining).toBe(2);
	});
	it.each(["NO", "SKIP", "UNSURE"] as const)("restarts a 30-day challenge after %s", (status) => {
		const progress = getChallengeProgress(buildChallenge([
			{ targetDay: appDay("2026-07-07"), status: "YES" },
			{ targetDay: appDay("2026-07-08"), status },
		], { durationDays: 30 }), appDay("2026-07-09"));
		expect(progress).toMatchObject({ currentStreak: 0, successfulDays: 0, daysElapsed: 1, daysRemaining: 29, isComplete: false });
	});

	it("restarts after an older missing review and counts only the new run", () => {
		const progress = getChallengeProgress(buildChallenge([
			{ targetDay: appDay("2026-06-20"), status: "YES" },
			{ targetDay: appDay("2026-06-22"), status: "YES" },
			{ targetDay: appDay("2026-06-23"), status: "YES" },
		]), appDay("2026-06-24"));
		expect(progress).toMatchObject({ currentStreak: 2, successfulDays: 2, daysElapsed: 3, daysRemaining: 87 });
	});

	it("does not carry a stale streak across multiple missing reviews", () => {
		const progress = getChallengeProgress(buildChallenge([
			{ targetDay: appDay("2026-06-20"), status: "YES" },
		]), appDay("2026-06-24"));
		expect(progress).toMatchObject({ currentStreak: 0, daysElapsed: 1, needsReview: true });
	});

	it("completes only after a full consecutive run, including beyond the original end date", () => {
		const challenge = buildChallenge([
			{ targetDay: appDay("2026-06-20"), status: "NO" },
			{ targetDay: appDay("2026-06-21"), status: "YES" },
			{ targetDay: appDay("2026-06-22"), status: "YES" },
			{ targetDay: appDay("2026-06-23"), status: "YES" },
		], { durationDays: 3 });
		const progress = getChallengeProgress(challenge, appDay("2026-06-24"));
		expect(progress).toMatchObject({ currentStreak: 3, successfulDays: 3, daysElapsed: 3, daysRemaining: 0, isComplete: true, needsReview: false });
		expect(progress.endDay).toEqual(appDay("2026-06-23"));
		expect(getChallengeProgress(challenge, appDay("2026-07-01")).isComplete).toBe(true);
	});

	it("keeps future challenges at day zero", () => {
		const progress = getChallengeProgress(buildChallenge([]), appDay("2026-06-19"));
		expect(progress).toMatchObject({ daysElapsed: 0, daysRemaining: 90, isComplete: false, needsReview: false });
	});

});
