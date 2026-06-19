import { describe, expect, it } from "vitest";
import {
	addAppDays,
	formatAppDate,
	getAppDateFromKey,
	getAppDateTimeFromKeys,
	getAppDateKey,
	getAppTimeKey,
	getAppTodayDate,
} from "@/lib/app-date";

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

	it("parses app date keys into Eastern midnight instants", () => {
		expect(getAppDateFromKey("2026-06-16")).toEqual(
			new Date("2026-06-16T04:00:00.000Z"),
		);
		expect(getAppDateFromKey("2026-02-31")).toBeNull();
		expect(getAppDateFromKey("not-a-date")).toBeNull();
	});

	it("adds app days across daylight saving changes", () => {
		const winterDay = new Date("2026-03-08T05:00:00.000Z");

		expect(addAppDays(winterDay, 1)).toEqual(
			new Date("2026-03-09T04:00:00.000Z"),
		);
	});

	it("parses app date and time keys into Eastern instants", () => {
		const dateTime = getAppDateTimeFromKeys("2026-06-16", "09:30");

		expect(dateTime).toEqual(new Date("2026-06-16T13:30:00.000Z"));
		expect(getAppTimeKey(dateTime!)).toBe("09:30");
		expect(getAppDateTimeFromKeys("2026-06-16", "24:00")).toBeNull();
		expect(getAppDateTimeFromKeys("not-a-date", "09:30")).toBeNull();
	});
});
