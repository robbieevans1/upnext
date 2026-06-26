import { describe, expect, it } from "vitest";
import {
	buildTaskAverageTimeSummaries,
	getTaskSessionDurationSeconds,
} from "@/lib/task-time-analytics";

describe("task time analytics", () => {
	it("averages timed completions and ignores completions with no logged time", () => {
		const averages = buildTaskAverageTimeSummaries({
			completions: [
				{
					taskId: "task-1",
					completedOn: new Date("2026-06-20T04:00:00.000Z"),
				},
				{
					taskId: "task-1",
					completedOn: new Date("2026-06-21T04:00:00.000Z"),
				},
				{
					taskId: "task-1",
					completedOn: new Date("2026-06-22T04:00:00.000Z"),
				},
				{
					taskId: "task-2",
					completedOn: new Date("2026-06-21T04:00:00.000Z"),
				},
			],
			sessions: [
				{
					taskId: "task-1",
					day: new Date("2026-06-20T04:00:00.000Z"),
					startedAt: new Date("2026-06-20T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-20T13:30:00.000Z"),
				},
				{
					taskId: "task-1",
					day: new Date("2026-06-22T04:00:00.000Z"),
					startedAt: new Date("2026-06-22T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-22T14:00:00.000Z"),
				},
				{
					taskId: "task-2",
					day: new Date("2026-06-20T04:00:00.000Z"),
					startedAt: new Date("2026-06-20T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-20T15:00:00.000Z"),
				},
			],
		});

		expect(averages.get("task-1")).toEqual({
			averageSeconds: 2700,
			timedCompletionCount: 2,
		});
		expect(averages.has("task-2")).toBe(false);
	});

	it("uses now for active task sessions and never returns negative duration", () => {
		expect(
			getTaskSessionDurationSeconds(
				{
					startedAt: new Date("2026-06-20T13:00:00.000Z"),
					stoppedAt: null,
				},
				new Date("2026-06-20T13:45:00.000Z"),
			),
		).toBe(2700);

		expect(
			getTaskSessionDurationSeconds(
				{
					startedAt: new Date("2026-06-20T13:45:00.000Z"),
					stoppedAt: new Date("2026-06-20T13:00:00.000Z"),
				},
				new Date("2026-06-20T14:00:00.000Z"),
			),
		).toBe(0);
	});
});
