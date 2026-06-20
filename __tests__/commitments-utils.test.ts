import { describe, expect, it } from "vitest";
import {
	getAppDayOfWeek,
	getWeekdayLabel,
	parseWeekday,
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

	it("returns labels for valid weekdays", () => {
		expect(getWeekdayLabel(0)).toBe("Sunday");
		expect(getWeekdayLabel(6)).toBe("Saturday");
		expect(getWeekdayLabel(null)).toBeUndefined();
	});
});
