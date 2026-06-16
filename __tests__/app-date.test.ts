import { describe, expect, it } from "vitest";
import { formatAppDate, getAppDateKey, getAppTodayDate } from "@/lib/app-date";

describe("app date helpers", () => {
	it("keeps the previous Eastern day before midnight", () => {
		const date = new Date("2026-06-16T03:59:00.000Z");

		expect(getAppDateKey(date)).toBe("2026-06-15");
		expect(getAppTodayDate(date)).toEqual(
			new Date("2026-06-15T04:00:00.000Z"),
		);
	});

	it("switches to the next Eastern day at midnight", () => {
		const date = new Date("2026-06-16T04:01:00.000Z");

		expect(getAppDateKey(date)).toBe("2026-06-16");
		expect(getAppTodayDate(date)).toEqual(
			new Date("2026-06-16T04:00:00.000Z"),
		);
	});

	it("formats midnight UTC as the previous Eastern day", () => {
		const date = new Date("2026-06-16T00:00:00.000Z");

		expect(getAppDateKey(date)).toBe("2026-06-15");
		expect(formatAppDate(date)).toBe("6/15/2026");
	});

	it("uses the standard-time Eastern midnight offset in winter", () => {
		const date = new Date("2026-01-15T05:01:00.000Z");

		expect(getAppDateKey(date)).toBe("2026-01-15");
		expect(getAppTodayDate(date)).toEqual(
			new Date("2026-01-15T05:00:00.000Z"),
		);
	});
});
