import { describe, expect, it } from "vitest";
import { buildWeeklyTaskCompletionTotals } from "@/lib/task-completion-week";

describe("task completion week utilities", () => {
	it("excludes active tasks created after the selected completed week", () => {
		const totals = buildWeeklyTaskCompletionTotals({
			weekStart: new Date("2026-06-14T04:00:00.000Z"),
			weekEnd: new Date("2026-06-21T04:00:00.000Z"),
			tasks: [
				{
					id: "existing-task",
					title: "Existing task",
					isActive: true,
					createdAt: new Date("2026-06-10T12:00:00.000Z"),
				},
				{
					id: "new-task",
					title: "New task",
					isActive: true,
					createdAt: new Date("2026-06-22T12:00:00.000Z"),
				},
			],
			completions: [],
		});

		expect(totals).toEqual([
			{
				title: "Existing task",
				count: 0,
			},
		]);
	});

	it("keeps tasks with completions in the selected week even if inactive", () => {
		const totals = buildWeeklyTaskCompletionTotals({
			weekStart: new Date("2026-06-14T04:00:00.000Z"),
			weekEnd: new Date("2026-06-21T04:00:00.000Z"),
			tasks: [
				{
					id: "archived-task",
					title: "Archived task",
					isActive: false,
					createdAt: new Date("2026-06-10T12:00:00.000Z"),
				},
			],
			completions: [
				{
					taskId: "archived-task",
					completedOn: new Date("2026-06-16T04:00:00.000Z"),
				},
			],
			includeInactiveCompletedTasks: true,
		});

		expect(totals).toEqual([
			{
				title: "Archived task",
				count: 1,
			},
		]);
	});
});
