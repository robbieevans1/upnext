import { describe, expect, it } from "vitest";
import { getAnnouncementCountdown } from "@/lib/announcement-countdown";

describe("getAnnouncementCountdown", () => {
	it("formats long countdowns without seconds", () => {
		expect(
			getAnnouncementCountdown(
				"2026-08-22T16:00:00.000Z",
				new Date("2026-06-24T04:27:00.000Z").getTime(),
			),
		).toBe("59d 11h 33m");
	});

	it("formats same-day countdowns with seconds", () => {
		expect(
			getAnnouncementCountdown(
				"2026-06-24T06:05:09.000Z",
				new Date("2026-06-24T04:27:00.000Z").getTime(),
			),
		).toBe("1h 38m 9s");
	});
});
