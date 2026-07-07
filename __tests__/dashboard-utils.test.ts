import { describe, expect, it } from "vitest";
import {
	buildDashboardAnalytics,
	formatHours,
} from "@/app/dashboard/dashboard-utils";

describe("dashboard analytics", () => {
	it("aggregates completions, downtime, commitments, and summaries by app day", () => {
		const today = new Date("2026-06-16T04:00:00.000Z");
		const analytics = buildDashboardAnalytics({
			today,
			now: new Date("2026-06-16T15:00:00.000Z"),
			days: 3,
			tasks: [
				{
					id: "task-1",
					title: "Portfolio",
					isActive: true,
					isMandatory: true,
					playbook: "Start with the smallest next step.",
					group: {
						name: "Career",
					},
					completions: [
						{
							completedOn: new Date("2026-06-14T04:00:00.000Z"),
						},
						{
							completedOn: new Date("2026-06-16T04:00:00.000Z"),
						},
					],
				},
				{
					id: "task-2",
					title: "Gym",
					isActive: true,
					isMandatory: false,
					playbook: null,
					group: null,
					completions: [
						{
							completedOn: new Date("2026-06-15T04:00:00.000Z"),
						},
					],
				},
			],
			taskSessions: [
				{
					taskId: "task-1",
					task: {
						title: "Portfolio",
					},
					startedAt: new Date("2026-06-16T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-16T14:00:00.000Z"),
				},
				{
					taskId: "task-1",
					task: {
						title: "Portfolio",
					},
					startedAt: new Date("2026-06-16T14:00:00.000Z"),
					stoppedAt: new Date("2026-06-16T14:30:00.000Z"),
				},
				{
					taskId: "task-2",
					task: {
						title: "Gym",
					},
					startedAt: new Date("2026-06-16T14:30:00.000Z"),
					stoppedAt: null,
				},
			],
			lifetimeTaskSessions: [
				{
					taskId: "task-1",
					task: {
						title: "Portfolio",
						isActive: true,
					},
					startedAt: new Date("2026-06-01T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-01T15:00:00.000Z"),
				},
				{
					taskId: "task-1",
					task: {
						title: "Portfolio",
						isActive: true,
					},
					startedAt: new Date("2026-06-16T13:00:00.000Z"),
					stoppedAt: new Date("2026-06-16T14:30:00.000Z"),
				},
				{
					taskId: "task-2",
					task: {
						title: "Gym",
						isActive: true,
					},
					startedAt: new Date("2026-06-16T13:30:00.000Z"),
					stoppedAt: null,
				},
				{
					taskId: "deleted-task",
					task: {
						title: "Deleted task",
						isActive: false,
					},
					startedAt: new Date("2026-06-16T10:00:00.000Z"),
					stoppedAt: new Date("2026-06-16T20:00:00.000Z"),
				},
			],
			downtimeSessions: [
				{
					category: "Sleep",
					day: new Date("2026-06-16T04:00:00.000Z"),
					startedAt: new Date("2026-06-16T05:00:00.000Z"),
					stoppedAt: new Date("2026-06-16T07:00:00.000Z"),
				},
				{
					category: "Other",
					day: new Date("2026-06-16T04:00:00.000Z"),
					startedAt: new Date("2026-06-16T14:30:00.000Z"),
					stoppedAt: null,
				},
			],
			actionItems: [
				{
					dueOn: new Date("2026-06-15T04:00:00.000Z"),
					completedAt: null,
					canceledAt: null,
					playbook: null,
				},
				{
					dueOn: null,
					completedAt: new Date("2026-06-15T14:00:00.000Z"),
					canceledAt: null,
					playbook: "Call before noon.",
				},
			],
			commitments: [
				{
					day: new Date("2026-06-16T04:00:00.000Z"),
					startsAt: new Date("2026-06-16T13:00:00.000Z"),
					endsAt: new Date("2026-06-16T14:30:00.000Z"),
					completedAt: null,
					canceledAt: null,
					playbook: "Arrive early.",
				},
				{
					day: new Date("2026-06-14T04:00:00.000Z"),
					startsAt: null,
					endsAt: null,
					completedAt: new Date("2026-06-14T16:00:00.000Z"),
					canceledAt: null,
					playbook: null,
				},
			],
			dailyCheckResults: [
				{
					status: "YES",
					targetDay: new Date("2026-06-14T04:00:00.000Z"),
					dailyCheck: {
						title: "Was below calorie limit?",
					},
				},
				{
					status: "NO",
					targetDay: new Date("2026-06-15T04:00:00.000Z"),
					dailyCheck: {
						title: "Was below calorie limit?",
					},
				},
				{
					status: "SKIP",
					targetDay: new Date("2026-06-16T04:00:00.000Z"),
					dailyCheck: {
						title: "Got 7+ hours of sleep?",
					},
				},
				{
					status: "UNSURE",
					targetDay: new Date("2026-06-16T04:00:00.000Z"),
					dailyCheck: {
						title: "Avoided late-night snacking?",
					},
				},
				{
					status: "YES",
					targetDay: new Date("2026-06-16T04:00:00.000Z"),
					dailyCheck: {
						title: "Deleted daily check",
						isActive: false,
					},
				},
			],
		});

		expect(analytics.totalCompletions).toBe(3);
		expect(analytics.completionRate).toBe(50);
		expect(analytics.dayBuckets.map((bucket) => bucket.completions)).toEqual([
			1, 1, 1,
		]);
		expect(analytics.totalTaskSeconds).toBe(7200);
		expect(analytics.taskTimeTotals).toEqual([
			{
				title: "Portfolio",
				totalSeconds: 5400,
			},
			{
				title: "Gym",
				totalSeconds: 1800,
			},
		]);
		expect(analytics.totalLifetimeTaskSeconds).toBe(18_000);
		expect(analytics.lifetimeTaskTimeTotals).toEqual([
			{
				title: "Portfolio",
				totalSeconds: 12_600,
			},
			{
				title: "Gym",
				totalSeconds: 5400,
			},
		]);
		expect(analytics.totalDowntimeSeconds).toBe(9000);
		expect(analytics.totalCommitmentSeconds).toBe(5400);
		expect(analytics.groupCompletionTotals).toEqual([
			{
				name: "Career",
				count: 2,
			},
			{
				name: "Ungrouped",
				count: 1,
			},
		]);
		expect(analytics.taskCompletionWeekStart).toEqual(
			new Date("2026-06-14T04:00:00.000Z"),
		);
		expect(analytics.weeklyTaskCompletionTotals).toEqual([
			{
				title: "Portfolio",
				count: 2,
			},
			{
				title: "Gym",
				count: 1,
			},
		]);
		expect(analytics.actionItemSummary).toEqual({
			open: 1,
			overdue: 1,
			completed: 1,
			canceled: 0,
		});
		expect(analytics.commitmentSummary).toEqual({
			upcoming: 1,
			completed: 1,
			canceled: 0,
		});
		expect(analytics.playbookSummary).toEqual({
			total: 6,
			withPlaybook: 3,
			coverage: 50,
		});
		expect(analytics.dailyReviewSummary).toEqual({
			total: 4,
			yes: 1,
			no: 1,
			skip: 1,
			unsure: 1,
			successRate: 50,
		});
		expect(analytics.dailyCheckTotals).toEqual([
			{
				title: "Was below calorie limit?",
				yes: 1,
				no: 1,
				skip: 0,
				unsure: 0,
			},
			{
				title: "Avoided late-night snacking?",
				yes: 0,
				no: 0,
				skip: 0,
				unsure: 1,
			},
			{
				title: "Got 7+ hours of sleep?",
				yes: 0,
				no: 0,
				skip: 1,
				unsure: 0,
			},
		]);
	});

	it("resets weekly task completion totals on Sunday", () => {
		const analytics = buildDashboardAnalytics({
			today: new Date("2026-06-23T04:00:00.000Z"),
			now: new Date("2026-06-23T15:00:00.000Z"),
			days: 14,
			tasks: [
				{
					id: "task-1",
					title: "Weightlifting",
					isActive: true,
					isMandatory: false,
					playbook: null,
					group: null,
					completions: [
						{
							completedOn: new Date("2026-06-20T04:00:00.000Z"),
						},
						{
							completedOn: new Date("2026-06-21T04:00:00.000Z"),
						},
					],
				},
				{
					id: "task-2",
					title: "Cardio",
					isActive: true,
					isMandatory: false,
					playbook: null,
					group: null,
					completions: [
						{
							completedOn: new Date("2026-06-21T04:00:00.000Z"),
						},
						{
							completedOn: new Date("2026-06-22T04:00:00.000Z"),
						},
					],
				},
				{
					id: "task-3",
					title: "Mobility",
					isActive: true,
					isMandatory: false,
					playbook: null,
					group: null,
					completions: [],
				},
				{
					id: "task-4",
					title: "Archived habit",
					isActive: false,
					isMandatory: false,
					playbook: null,
					group: null,
					completions: [
						{
							completedOn: new Date("2026-06-21T04:00:00.000Z"),
						},
					],
				},
			],
			taskSessions: [],
			lifetimeTaskSessions: [],
			downtimeSessions: [],
			actionItems: [],
			commitments: [],
			dailyCheckResults: [],
		});

		expect(analytics.taskCompletionWeekStart).toEqual(
			new Date("2026-06-21T04:00:00.000Z"),
		);
		expect(analytics.weeklyTaskCompletionTotals).toEqual([
			{
				title: "Cardio",
				count: 2,
			},
			{
				title: "Weightlifting",
				count: 1,
			},
			{
				title: "Mobility",
				count: 0,
			},
		]);
	});

	it("formats dashboard hours compactly", () => {
		expect(formatHours(0)).toBe("0h");
		expect(formatHours(1800)).toBe("0.5h");
		expect(formatHours(36_000)).toBe("10h");
	});
});
