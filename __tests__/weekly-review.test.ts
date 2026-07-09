import { describe, expect, it } from "vitest";
import {
	getWeeklyReviewLaunchWeekStart,
	isWeeklyReviewEnabledForWeek,
	WEEKLY_REVIEW_LAUNCH_WEEK_KEY,
} from "@/lib/weekly-review";

describe("weekly review utilities", () => {
	it("anchors weekly reviews to the launch week moving forward", () => {
		expect(WEEKLY_REVIEW_LAUNCH_WEEK_KEY).toBe("2026-07-05");
		expect(getWeeklyReviewLaunchWeekStart()).toEqual(
			new Date("2026-07-05T04:00:00.000Z"),
		);
		expect(
			isWeeklyReviewEnabledForWeek(new Date("2026-06-28T04:00:00.000Z")),
		).toBe(false);
		expect(
			isWeeklyReviewEnabledForWeek(new Date("2026-07-05T04:00:00.000Z")),
		).toBe(true);
	});
});
