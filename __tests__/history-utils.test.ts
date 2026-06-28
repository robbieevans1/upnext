import { describe, expect, it, vi } from "vitest";
import {
	aggregateRecentCompletionDays,
	CompletionWithTask,
	formatTaskTime,
	getDayHref,
	getHistoryDayRange,
	getHistoryWeekRange,
	getSelectedDay,
	getSelectedWeekStart,
	getTaskSessionDurationSeconds,
	getTaskTimeTotalsByTaskId,
	getWeekHref,
	sortCompletions,
} from "@/app/history/history-utils";

function completion(
	id: string,
	overrides: Partial<CompletionWithTask["task"]> = {},
): CompletionWithTask {
	return {
		id,
		task: {
			id,
			title: id,
			description: null,
			isMandatory: false,
			stackOrder: 0,
			group: null,
			...overrides,
		},
	};
}

describe("history utilities", () => {
	it("merges legacy completion timestamps that display as the same app day", () => {
		const recentDays = aggregateRecentCompletionDays([
			{ completedOn: new Date("2026-06-18T04:00:00.000Z") },
			{ completedOn: new Date("2026-06-15T04:00:00.000Z") },
			{ completedOn: new Date("2026-06-16T00:00:00.000Z") },
			{ completedOn: new Date("2026-06-14T04:00:00.000Z") },
			{ completedOn: new Date("2026-06-15T00:00:00.000Z") },
		]);

		expect(recentDays).toEqual([
			{
				completedOn: new Date("2026-06-18T04:00:00.000Z"),
				dayKey: "2026-06-18",
				count: 1,
			},
			{
				completedOn: new Date("2026-06-15T04:00:00.000Z"),
				dayKey: "2026-06-15",
				count: 2,
			},
			{
				completedOn: new Date("2026-06-14T04:00:00.000Z"),
				dayKey: "2026-06-14",
				count: 2,
			},
		]);
	});

	it("sorts recent app days newest first and applies the display limit", () => {
		const completions = Array.from({ length: 16 }, (_, index) => ({
			completedOn: new Date(
				Date.UTC(2026, 5, index + 1, index % 2 === 0 ? 4 : 12),
			),
		}));

		const recentDays = aggregateRecentCompletionDays(completions, 3);

		expect(recentDays.map((day) => day.dayKey)).toEqual([
			"2026-06-16",
			"2026-06-15",
			"2026-06-14",
		]);
	});

	it("builds the selected app-day query range using Eastern midnight", () => {
		expect(getHistoryDayRange(new Date("2026-06-15T04:00:00.000Z"))).toEqual({
			start: new Date("2026-06-15T04:00:00.000Z"),
			end: new Date("2026-06-16T04:00:00.000Z"),
		});
	});

	it("builds history links from app-day keys", () => {
		expect(getDayHref(new Date("2026-06-16T00:00:00.000Z"))).toBe(
			"/history?day=2026-06-15",
		);
	});

	it("builds weekly history links from the week start app-day key", () => {
		expect(getWeekHref(new Date("2026-06-14T04:00:00.000Z"))).toBe(
			"/history?view=week&week=2026-06-14",
		);
	});

	it("selects Sunday as the history week start", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-18T15:00:00.000Z"));

		expect(getSelectedWeekStart("2026-06-18")).toEqual(
			new Date("2026-06-14T04:00:00.000Z"),
		);
		expect(getSelectedWeekStart(["2026-06-22", "2026-06-15"])).toEqual(
			new Date("2026-06-21T04:00:00.000Z"),
		);
		expect(getSelectedWeekStart("not-a-day")).toEqual(
			new Date("2026-06-14T04:00:00.000Z"),
		);
		expect(getSelectedWeekStart(undefined)).toEqual(
			new Date("2026-06-14T04:00:00.000Z"),
		);

		vi.useRealTimers();
	});

	it("builds the selected app-week query range from Sunday through Saturday", () => {
		expect(getHistoryWeekRange(new Date("2026-06-14T04:00:00.000Z"))).toEqual({
			start: new Date("2026-06-14T04:00:00.000Z"),
			end: new Date("2026-06-21T04:00:00.000Z"),
		});
	});

	it("selects a valid day from the query string and falls back to today", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-18T15:00:00.000Z"));

		expect(getSelectedDay("2026-06-15")).toEqual(
			new Date("2026-06-15T04:00:00.000Z"),
		);
		expect(getSelectedDay(["2026-06-14", "2026-06-15"])).toEqual(
			new Date("2026-06-14T04:00:00.000Z"),
		);
		expect(getSelectedDay("not-a-day")).toEqual(
			new Date("2026-06-18T04:00:00.000Z"),
		);
		expect(getSelectedDay(undefined)).toEqual(
			new Date("2026-06-18T04:00:00.000Z"),
		);

		vi.useRealTimers();
	});

	it("sorts completed tasks by mandatory status, group, stack order, and title", () => {
		const sorted = sortCompletions([
			completion("later", {
				stackOrder: 2,
				group: { name: "Career" },
			}),
			completion("mandatory-b", {
				title: "B task",
				isMandatory: true,
			}),
			completion("alpha", {
				title: "Alpha",
				stackOrder: 1,
				group: { name: "Career" },
			}),
			completion("health", {
				stackOrder: 0,
				group: { name: "Health" },
			}),
			completion("mandatory-a", {
				title: "A task",
				isMandatory: true,
			}),
		]);

		expect(sorted.map((item) => item.id)).toEqual([
			"mandatory-a",
			"mandatory-b",
			"alpha",
			"later",
			"health",
		]);
	});

	it("sums task session time by task for history cards", () => {
		const totalsByTaskId = getTaskTimeTotalsByTaskId(
			[
				{
					taskId: "task-1",
					startedAt: new Date("2026-06-18T14:00:00.000Z"),
					stoppedAt: new Date("2026-06-18T14:30:00.000Z"),
				},
				{
					taskId: "task-1",
					startedAt: new Date("2026-06-18T15:00:00.000Z"),
					stoppedAt: new Date("2026-06-18T15:10:00.000Z"),
				},
				{
					taskId: "task-2",
					startedAt: new Date("2026-06-18T16:00:00.000Z"),
					stoppedAt: new Date("2026-06-18T17:05:00.000Z"),
				},
			],
			new Date("2026-06-18T18:00:00.000Z"),
		);

		expect(totalsByTaskId.get("task-1")).toBe(40 * 60);
		expect(totalsByTaskId.get("task-2")).toBe(65 * 60);
	});

	it("uses now for active task sessions and never returns negative duration", () => {
		expect(
			getTaskSessionDurationSeconds(
				{
					startedAt: new Date("2026-06-18T14:00:00.000Z"),
					stoppedAt: null,
				},
				new Date("2026-06-18T14:25:00.000Z"),
			),
		).toBe(25 * 60);
		expect(
			getTaskSessionDurationSeconds(
				{
					startedAt: new Date("2026-06-18T14:25:00.000Z"),
					stoppedAt: new Date("2026-06-18T14:00:00.000Z"),
				},
				new Date("2026-06-18T14:30:00.000Z"),
			),
		).toBe(0);
	});

	it("formats task time for compact history display", () => {
		expect(formatTaskTime(0)).toBe("No time tracked");
		expect(formatTaskTime(10)).toBe("1m");
		expect(formatTaskTime(35 * 60)).toBe("35m");
		expect(formatTaskTime(60 * 60)).toBe("1h");
		expect(formatTaskTime(65 * 60)).toBe("1h 05m");
	});
});
