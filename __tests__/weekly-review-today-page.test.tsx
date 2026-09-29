import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayPage from "@/app/today/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
	useRouter: vi.fn(() => ({
		refresh: vi.fn(),
	})),
	connection: vi.fn(),
	dailyReviewPrompt: vi.fn(() => null),
	getUserEffectiveTodayDate: vi.fn(),
	prisma: {
		user: { findUnique: vi.fn() },
		weightEntry: { findFirst: vi.fn() },
		taskGroup: {
			findMany: vi.fn(),
		},
		task: {
			findMany: vi.fn(),
		},
		taskCompletion: {
			findMany: vi.fn(),
		},
		taskSkip: {
			findMany: vi.fn(),
		},
		taskSession: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
		},
		commitment: {
			findMany: vi.fn(),
		},
		actionItem: {
			findMany: vi.fn(),
		},
		dailyCheck: {
			findMany: vi.fn(),
		},
		challenge: {
			findMany: vi.fn(),
		},
		weeklyReview: {
			findUnique: vi.fn(),
		},
	},
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({
	redirect: mocks.redirect,
	useRouter: mocks.useRouter,
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/effective-day", () => ({
	getUserEffectiveTodayDate: mocks.getUserEffectiveTodayDate,
}));
vi.mock("@/components/AppNav", () => ({ default: () => <nav>App nav</nav> }));
vi.mock("@/components/CompleteDayButton", () => ({
	default: () => <button>Complete Day</button>,
}));
vi.mock("@/components/DailyReviewPrompt", () => ({ default: mocks.dailyReviewPrompt }));

describe("TodayPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		mocks.getUserEffectiveTodayDate.mockResolvedValue({
			today: new Date("2026-07-13T04:00:00.000Z"),
			tomorrow: new Date("2026-07-14T04:00:00.000Z"),
			isStartedEarly: false,
		});
		mocks.prisma.taskGroup.findMany.mockResolvedValue([]);
		mocks.prisma.user.findUnique.mockResolvedValue(null);
		mocks.prisma.weightEntry.findFirst.mockResolvedValue(null);
		mocks.prisma.task.findMany.mockResolvedValue([]);
		mocks.prisma.taskCompletion.findMany.mockResolvedValue([]);
		mocks.prisma.taskSkip.findMany.mockResolvedValue([]);
		mocks.prisma.taskSession.findMany.mockResolvedValue([]);
		mocks.prisma.taskSession.findFirst.mockResolvedValue(null);
		mocks.prisma.commitment.findMany.mockResolvedValue([]);
		mocks.prisma.actionItem.findMany.mockResolvedValue([]);
		mocks.prisma.dailyCheck.findMany.mockResolvedValue([]);
		mocks.prisma.challenge.findMany.mockResolvedValue([]);
		mocks.prisma.weeklyReview.findUnique.mockResolvedValue(null);
	});

	it("shows total weight lost using the latest weigh-in even when it predates today", async () => {
		mocks.prisma.user.findUnique.mockResolvedValue({ startingWeightLbs: 220 });
		mocks.prisma.weightEntry.findFirst.mockResolvedValue({
			weightLbs: 198.4,
			day: new Date("2026-07-10T04:00:00.000Z"),
		});

		render(await TodayPage());

		const card = within(screen.getByRole("region", { name: "Weight Progress" }));
		expect(card.getByText("21.6 lb")).toBeInTheDocument();
		expect(card.getByText("198.4 lb")).toBeInTheDocument();
		expect(card.getByText("7/10/2026")).toBeInTheDocument();
		expect(card.getByRole("link", { name: "Nutrition" })).toHaveAttribute("href", "/nutrition");
		expect(mocks.prisma.weightEntry.findFirst).toHaveBeenCalledWith({
			where: { userId: "user-1", day: { lte: new Date("2026-07-13T04:00:00.000Z") } },
			orderBy: { day: "desc" },
			select: { weightLbs: true, day: true },
		});
	});

	it("resets challenge progress and keeps reviews available beyond the original end date", async () => {
		const challenge = {
			id: "challenge-1",
			title: "Eat healthy",
			description: null,
			startDay: new Date("2026-06-01T04:00:00.000Z"),
			durationDays: 30,
			dailyCheck: { results: [
				{ targetDay: new Date("2026-07-11T04:00:00.000Z"), status: "YES" },
				{ targetDay: new Date("2026-07-12T04:00:00.000Z"), status: "NO" },
			] },
		};
		mocks.prisma.challenge.findMany.mockResolvedValue([challenge]);
		mocks.prisma.dailyCheck.findMany.mockResolvedValue([{
			id: "check-1", title: "Kept healthy eating?", description: null,
			challenge, results: [{ status: "NO" }],
		}]);

		render(await TodayPage());

		expect(screen.getByText(/Day 1 of 30.*29 days remaining/)).toBeInTheDocument();
		expect(screen.getByText("0 successful days")).toBeInTheDocument();
		expect(screen.queryByText("Challenge complete")).toBeNull();
		expect(mocks.dailyReviewPrompt).toHaveBeenCalledWith(
			expect.objectContaining({ checks: [expect.objectContaining({ id: "check-1" })] }),
			undefined,
		);
	});

	it("prompts for the previous completed week when its review is incomplete", async () => {
		render(await TodayPage());

		expect(screen.getByRole("heading", { name: "Review last week" })).toBeInTheDocument();
		expect(
			screen.getByText(/what you repeatedly did from 7\/5\/2026 to 7\/11\/2026/i),
		).toBeInTheDocument();
		expect(screen.queryByRole("dialog", { name: "Weekly Review" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Start Weekly Review" }));

		const dialog = screen.getByRole("dialog", { name: "Weekly Review" });

		expect(
			within(dialog).getByText(/the review lives in history/i),
		).toBeInTheDocument();
		expect(within(dialog).getByRole("link", { name: "Go to Weekly Review" })).toHaveAttribute(
			"href",
			"/history?view=week&week=2026-07-05",
		);
		expect(mocks.prisma.weeklyReview.findUnique).toHaveBeenCalledWith({
			where: {
				userId_weekStart: {
					userId: "user-1",
					weekStart: new Date("2026-07-05T04:00:00.000Z"),
				},
			},
			select: {
				completedAt: true,
			},
		});
	});

	it("does not prompt when the previous weekly review is complete", async () => {
		mocks.prisma.weeklyReview.findUnique.mockResolvedValue({
			completedAt: new Date("2026-07-12T12:00:00.000Z"),
		});

		render(await TodayPage());

		expect(screen.queryByRole("heading", { name: "Review last week" })).toBeNull();
	});

	it("does not prompt for weeks before weekly review launch", async () => {
		mocks.getUserEffectiveTodayDate.mockResolvedValue({
			today: new Date("2026-07-06T04:00:00.000Z"),
			tomorrow: new Date("2026-07-07T04:00:00.000Z"),
			isStartedEarly: false,
		});

		render(await TodayPage());

		expect(screen.queryByRole("heading", { name: "Review last week" })).toBeNull();
		expect(mocks.prisma.weeklyReview.findUnique).not.toHaveBeenCalled();
	});

	it("shows open action items before their due date", async () => {
		mocks.prisma.actionItem.findMany.mockResolvedValue([
			{
				id: "action-1",
				title: "Schedule dentist",
				description: "Call before the appointment week fills up.",
				playbook: null,
				dueOn: new Date("2026-07-20T04:00:00.000Z"),
				completedAt: null,
				canceledAt: null,
				userId: "user-1",
				createdAt: new Date("2026-07-10T12:00:00.000Z"),
				updatedAt: new Date("2026-07-10T12:00:00.000Z"),
			},
		]);

		render(await TodayPage());

		expect(
			screen.getByRole("button", { name: /Action Items\s*1 open/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Schedule dentist")).toBeInTheDocument();
		expect(
			screen.getByText("Call before the appointment week fills up."),
		).toBeInTheDocument();
		expect(screen.getByText("Due 7/20/2026")).toBeInTheDocument();
		expect(mocks.prisma.actionItem.findMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				completedAt: null,
				canceledAt: null,
			},
			orderBy: [
				{
					dueOn: "asc",
				},
				{
					createdAt: "asc",
				},
			],
		});
	});

	it("shows skipped tasks separately without keeping them in the active stack", async () => {
		mocks.prisma.task.findMany.mockResolvedValue([
			{
				id: "task-1",
				title: "Go outside",
				description: "Walk around the block.",
				playbook: null,
				isMandatory: true,
				isActive: true,
				missedCount: 0,
				stackOrder: 0,
				userId: "user-1",
				groupId: null,
				createdAt: new Date("2026-07-01T12:00:00.000Z"),
				updatedAt: new Date("2026-07-01T12:00:00.000Z"),
				completions: [],
				skips: [],
				sessions: [],
				subtasks: [],
			},
		]);
		mocks.prisma.taskSkip.findMany.mockResolvedValue([
			{
				id: "skip-1",
				taskId: "task-1",
				userId: "user-1",
				skippedOn: new Date("2026-07-13T04:00:00.000Z"),
				createdAt: new Date("2026-07-13T12:00:00.000Z"),
			},
		]);

		render(await TodayPage());

		expect(screen.queryByRole("heading", { name: "Go outside" })).toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: /Skipped Today\s*1 skipped/i }),
		);

		expect(screen.getAllByText("Go outside").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Last completed: Never")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Undo Skip" })).toBeInTheDocument();
	});
});
