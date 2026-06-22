import { describe, expect, it } from "vitest";
import {
	getCommitmentRecurrenceDays,
	getAppDayOfWeek,
	getWeekdayLabel,
	getWeekdayListLabel,
	parseWeekday,
	parseWeekdays,
} from "@/lib/commitments";

describe("commitment recurrence utilities", () => {
	it("gets the weekday for the Eastern app date", () => {
		expect(getAppDayOfWeek(new Date("2026-06-21T04:00:00.000Z"))).toBe(0);
		expect(getAppDayOfWeek(new Date("2026-06-22T04:00:00.000Z"))).toBe(1);
	});

	it("parses valid weekday form values only", () => {
		expect(parseWeekday("0")).toBe(0);
		expect(parseWeekday("6")).toBe(6);
		expect(parseWeekday("7")).toBeNull();
		expect(parseWeekday("Sunday")).toBeNull();
		expect(parseWeekday(null)).toBeNull();
	});

	it("parses multiple weekday form values in sorted unique order", () => {
		expect(parseWeekdays(["5", "1", "5", "bad", "3"])).toEqual([1, 3, 5]);
		expect(parseWeekdays(["7", "Sunday"])).toEqual([]);
	});

	it("returns labels for valid weekdays", () => {
		expect(getWeekdayLabel(0)).toBe("Sunday");
		expect(getWeekdayLabel(6)).toBe("Saturday");
		expect(getWeekdayLabel(null)).toBeUndefined();
	});

	it("summarizes common weekday sets", () => {
		expect(getWeekdayListLabel([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
		expect(getWeekdayListLabel([1, 2, 3, 4, 5])).toBe("Monday-Friday");
		expect(getWeekdayListLabel([0, 3, 5])).toBe("Sunday, Wednesday, Friday");
	});

	it("falls back to the legacy recurrence weekday when needed", () => {
		expect(
			getCommitmentRecurrenceDays({
				recurrenceDays: [1, 3, 5],
				recurrenceDayOfWeek: 0,
			}),
		).toEqual([1, 3, 5]);
		expect(
			getCommitmentRecurrenceDays({
				recurrenceDays: [],
				recurrenceDayOfWeek: 0,
			}),
		).toEqual([0]);
		expect(
			getCommitmentRecurrenceDays({
				recurrenceDays: [],
				recurrenceDayOfWeek: null,
			}),
		).toEqual([]);
	});
});
