import { describe, expect, it } from "vitest";
import {
	getCalendarDateKey,
	getCalendarEntryToneClass,
	getCalendarGridDays,
	getCalendarMonth,
	getWeeklyOccurrenceDays,
} from "@/lib/calendar-view";

describe("calendar view helpers", () => {
	it("resolves month navigation keys", () => {
		const month = getCalendarMonth("2026-01");

		expect(month.key).toBe("2026-01");
		expect(month.previousKey).toBe("2025-12");
		expect(month.nextKey).toBe("2026-02");
		expect(getCalendarDateKey(month.start)).toBe("2026-01-01");
		expect(getCalendarDateKey(month.nextStart)).toBe("2026-02-01");
	});

	it("builds full-week calendar grids around the selected month", () => {
		const days = getCalendarGridDays(getCalendarMonth("2026-06"));

		expect(days).toHaveLength(35);
		expect(getCalendarDateKey(days[0])).toBe("2026-05-31");
		expect(getCalendarDateKey(days[days.length - 1])).toBe("2026-07-04");
	});

	it("generates weekly recurring occurrence days after the series starts", () => {
		const days = getWeeklyOccurrenceDays({
			recurrenceDays: [1, 3, 5],
			seriesStart: new Date("2026-06-10T04:00:00.000Z"),
			month: getCalendarMonth("2026-06"),
		}).map(getCalendarDateKey);

		expect(days).toEqual([
			"2026-06-10",
			"2026-06-12",
			"2026-06-15",
			"2026-06-17",
			"2026-06-19",
			"2026-06-22",
			"2026-06-24",
			"2026-06-26",
			"2026-06-29",
		]);
	});

	it("styles canceled commitment entries in red", () => {
		expect(
			getCalendarEntryToneClass({
				type: "Commitment",
				statusLabel: "Canceled",
			}),
		).toContain("bg-red-500/10");

		expect(
			getCalendarEntryToneClass({
				type: "Commitment",
				statusLabel: "Repeats",
			}),
		).toContain("bg-sky-500/10");
	});
});
