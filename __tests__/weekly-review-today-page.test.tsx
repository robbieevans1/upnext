import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayPage from "@/app/today/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
	connection: vi.fn(),
	getUserEffectiveTodayDate: vi.fn(),
	prisma: {
		taskGroup: {
			findMany: vi.fn(),
		},
		task: {
			findMany: vi.fn(),
		},
		taskCompletion: {
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
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/effective-day", () => ({
	getUserEffectiveTodayDate: mocks.getUserEffectiveTodayDate,
}));
vi.mock("@/components/AppNav", () => ({ default: () => <nav>App nav</nav> }));
vi.mock("@/components/CompleteDayButton", () => ({
	default: () => <button>Complete Day</button>,
}));
vi.mock("@/components/DailyReviewPrompt", () => ({ default: () => null }));

describe("TodayPage weekly review prompt", () => {
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
		mocks.prisma.task.findMany.mockResolvedValue([]);
		mocks.prisma.taskCompletion.findMany.mockResolvedValue([]);
		mocks.prisma.taskSession.findMany.mockResolvedValue([]);
		mocks.prisma.taskSession.findFirst.mockResolvedValue(null);
		mocks.prisma.commitment.findMany.mockResolvedValue([]);
		mocks.prisma.actionItem.findMany.mockResolvedValue([]);
		mocks.prisma.dailyCheck.findMany.mockResolvedValue([]);
		mocks.prisma.challenge.findMany.mockResolvedValue([]);
		mocks.prisma.weeklyReview.findUnique.mockResolvedValue(null);
	});

	it("prompts for the previous completed week when its review is incomplete", async () => {
		render(await TodayPage());

		expect(screen.getByRole("heading", { name: "Review last week" })).toBeInTheDocument();
		expect(
			screen.getByText(/what you repeatedly did from 7\/5\/2026 to 7\/11\/2026/i),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Start Weekly Review" })).toHaveAttribute(
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
});
