import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "@/app/history/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
	connection: vi.fn(),
	saveWeeklyReview: vi.fn(),
	prisma: {
		task: {
			findMany: vi.fn(),
		},
		taskCompletion: {
			findMany: vi.fn(),
		},
		taskSession: {
			findMany: vi.fn(),
		},
		weeklyReview: {
			findUnique: vi.fn(),
		},
		downtimeSession: {
			findMany: vi.fn(),
		},
		commitment: {
			findMany: vi.fn(),
		},
		commitmentOccurrenceCompletion: {
			findMany: vi.fn(),
		},
		dailyCheckResult: {
			findMany: vi.fn(),
		},
		challenge: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/components/AppNav", () => ({ default: () => <nav>App nav</nav> }));
vi.mock("@/app/actions/weekly-review", () => ({
	saveWeeklyReview: mocks.saveWeeklyReview,
}));

const activeTasks = [
	{
		id: "task-1",
		title: "Portfolio",
		isActive: true,
		createdAt: new Date("2026-07-01T12:00:00.000Z"),
	},
	{
		id: "task-2",
		title: "Cardio",
		isActive: true,
		createdAt: new Date("2026-07-01T12:00:00.000Z"),
	},
];

async function renderWeek(week = "2026-07-05") {
	return render(
		await HistoryPage({
			searchParams: Promise.resolve({
				view: "week",
				week,
			}),
		}),
	);
}

describe("HistoryPage weekly review", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		mocks.prisma.task.findMany.mockResolvedValue(activeTasks);
		mocks.prisma.taskCompletion.findMany.mockImplementation((args) => {
			if (args.include?.task) {
				return Promise.resolve([]);
			}

			if (args.where?.task?.isActive) {
				return Promise.resolve([
					{
						taskId: "task-1",
						completedOn: new Date("2026-07-06T04:00:00.000Z"),
					},
					{
						taskId: "task-1",
						completedOn: new Date("2026-07-08T04:00:00.000Z"),
					},
				]);
			}

			if (args.select?.completedOn && !args.select?.taskId) {
				return Promise.resolve([]);
			}

			return Promise.resolve([
				{
					taskId: "task-1",
					completedOn: new Date("2026-07-06T04:00:00.000Z"),
				},
				{
					taskId: "task-1",
					completedOn: new Date("2026-07-08T04:00:00.000Z"),
				},
			]);
		});
		mocks.prisma.taskSession.findMany.mockImplementation((args) => {
			if (args.select?.task) {
				return Promise.resolve([
					{
						taskId: "task-1",
						startedAt: new Date("2026-07-06T12:00:00.000Z"),
						stoppedAt: new Date("2026-07-06T13:30:00.000Z"),
						task: {
							title: "Portfolio",
						},
					},
				]);
			}

			return Promise.resolve([]);
		});
		mocks.prisma.weeklyReview.findUnique.mockResolvedValue(null);
		mocks.prisma.downtimeSession.findMany.mockResolvedValue([
			{
				category: "Other",
				startedAt: new Date("2026-07-06T14:00:00.000Z"),
				stoppedAt: new Date("2026-07-06T15:00:00.000Z"),
			},
		]);
		mocks.prisma.commitment.findMany.mockResolvedValue([
			{
				completedAt: new Date("2026-07-06T16:00:00.000Z"),
				canceledAt: null,
			},
		]);
		mocks.prisma.commitmentOccurrenceCompletion.findMany.mockResolvedValue([
			{
				id: "occurrence-1",
			},
		]);
		mocks.prisma.dailyCheckResult.findMany.mockImplementation((args) => {
			if (args.select?.status) {
				return Promise.resolve([
					{
						status: "YES",
					},
					{
						status: "NO",
					},
				]);
			}

			return Promise.resolve([]);
		});
		mocks.prisma.challenge.findMany.mockResolvedValue([
			{
				title: "No social media",
				dailyCheck: {
					results: [
						{
							status: "YES",
						},
						{
							status: "NO",
						},
					],
				},
			},
		]);
	});

	it("renders weekly evidence and review fields for launch week or later", async () => {
		await renderWeek();

		expect(screen.getByRole("heading", { name: "Weekly Evidence" })).toBeInTheDocument();
		expect(screen.getAllByText("Portfolio: 2").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Cardio").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Portfolio: 1h 30m")).toBeInTheDocument();
		expect(screen.getByText("Other: 1h")).toBeInTheDocument();
		expect(screen.getByText("1 yes")).toBeInTheDocument();
		expect(screen.getByText("No social media: 1/2 successful review days")).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", {
				name: "What moved me forward this week?",
			}),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Complete Review" })).toBeInTheDocument();
	});

	it("prefills existing weekly review answers", async () => {
		mocks.prisma.weeklyReview.findUnique.mockResolvedValue({
			movedForward: "Portfolio shipped.",
			busyNotUseful: "Inbox checking.",
			moreNextWeek: "Deep work.",
			lessNextWeek: "Admin.",
			taskChanges: "Pause one habit.",
			routineAligned: "Mostly yes.",
			completedAt: new Date("2026-07-13T12:00:00.000Z"),
		});

		await renderWeek();

		expect(
			screen.getByRole("textbox", {
				name: "What moved me forward this week?",
			}),
		).toHaveDisplayValue("Portfolio shipped.");
		expect(
			screen.getByRole("textbox", {
				name: "What felt busy but not useful?",
			}),
		).toHaveDisplayValue("Inbox checking.");
		expect(screen.getByText("Completed 7/13/2026")).toBeInTheDocument();
	});

	it("does not ask for retroactive reviews before launch week", async () => {
		await renderWeek("2026-06-28");

		expect(
			screen.getByText(/Weekly Review starts with the week of 7\/5\/2026/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", {
				name: "What moved me forward this week?",
			}),
		).toBeNull();
	});
});
