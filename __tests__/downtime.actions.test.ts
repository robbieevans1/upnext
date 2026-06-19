import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
	$transaction: vi.fn(async (operations: unknown[]) => operations),
	downtimeSession: {
		create: vi.fn((args) => args),
		findFirst: vi.fn(),
		update: vi.fn((args) => args),
	},
};

const getServerSession = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});
const revalidatePath = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

describe("downtime server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("starts a downtime session for the current app day", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T14:30:00.000Z"));
		prisma.downtimeSession.findFirst
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null);
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await startDowntimeSession("Eating");

		expect(prisma.downtimeSession.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				category: "Eating",
				day: new Date("2026-06-16T04:00:00.000Z"),
				startedAt: new Date("2026-06-16T14:30:00.000Z"),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
	});

	it("does not start a second session while one is active", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T14:30:00.000Z"));
		prisma.downtimeSession.findFirst
			.mockResolvedValueOnce({
				id: "session-1",
				userId: "user-1",
				category: "Social",
				day: new Date("2026-06-16T04:00:00.000Z"),
				startedAt: new Date("2026-06-16T14:00:00.000Z"),
				stoppedAt: null,
			})
			.mockResolvedValueOnce({
				id: "session-1",
			});
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await startDowntimeSession("Eating");

		expect(prisma.downtimeSession.create).not.toHaveBeenCalled();
	});

	it("stops the active downtime session", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T15:00:00.000Z"));
		prisma.downtimeSession.findFirst
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({
				id: "session-1",
				userId: "user-1",
				category: "Social",
				day: new Date("2026-06-16T04:00:00.000Z"),
				startedAt: new Date("2026-06-16T14:00:00.000Z"),
				stoppedAt: null,
			});
		const { stopDowntimeSession } = await import("@/app/actions/downtime");

		await stopDowntimeSession();

		expect(prisma.downtimeSession.update).toHaveBeenCalledWith({
			where: {
				id: "session-1",
			},
			data: {
				stoppedAt: new Date("2026-06-16T15:00:00.000Z"),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
	});

	it("rolls an active session into a new app day", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T04:01:00.000Z"));
		prisma.downtimeSession.findFirst.mockResolvedValue({
			id: "session-1",
			userId: "user-1",
			category: "Social",
			day: new Date("2026-06-15T04:00:00.000Z"),
			startedAt: new Date("2026-06-15T23:00:00.000Z"),
			stoppedAt: null,
		});
		const { syncDowntimeDay } = await import("@/app/actions/downtime");

		await syncDowntimeDay();

		expect(prisma.$transaction).toHaveBeenCalledWith([
			{
				where: {
					id: "session-1",
				},
				data: {
					stoppedAt: new Date("2026-06-16T04:00:00.000Z"),
				},
			},
			{
				data: {
					userId: "user-1",
					category: "Social",
					day: new Date("2026-06-16T04:00:00.000Z"),
					startedAt: new Date("2026-06-16T04:00:00.000Z"),
				},
			},
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
	});

	it("redirects unauthenticated users before mutating downtime", async () => {
		getServerSession.mockResolvedValue(null);
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await expect(startDowntimeSession("Sleep")).rejects.toThrow(
			"redirect:/login",
		);

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(prisma.downtimeSession.create).not.toHaveBeenCalled();
	});
});
