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
const ensureDefaultDowntimeSession = vi.fn();
const rolloverActiveDowntimeSession = vi.fn();
const rolloverActiveTaskSession = vi.fn();
const switchDowntimeSession = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/time-tracking", () => ({
	ensureDefaultDowntimeSession,
	rolloverActiveDowntimeSession,
	rolloverActiveTaskSession,
	switchDowntimeSession,
}));

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

	it("switches downtime categories for the current user", async () => {
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await startDowntimeSession("Eating");

		expect(switchDowntimeSession).toHaveBeenCalledWith("user-1", "Eating");
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
		expect(revalidatePath).toHaveBeenCalledWith("/today");
	});

	it("ignores invalid downtime categories", async () => {
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await startDowntimeSession("Invalid");

		expect(switchDowntimeSession).not.toHaveBeenCalled();
	});

	it("syncs task and downtime sessions across app days", async () => {
		rolloverActiveDowntimeSession.mockResolvedValueOnce(false);
		rolloverActiveTaskSession.mockResolvedValueOnce(true);
		const { syncDowntimeDay } = await import("@/app/actions/downtime");

		const didRollover = await syncDowntimeDay();

		expect(didRollover).toBe(true);
		expect(rolloverActiveDowntimeSession).toHaveBeenCalledWith("user-1");
		expect(rolloverActiveTaskSession).toHaveBeenCalledWith("user-1");
		expect(ensureDefaultDowntimeSession).toHaveBeenCalledWith("user-1");
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
	});

	it("redirects unauthenticated users before mutating downtime", async () => {
		getServerSession.mockResolvedValue(null);
		const { startDowntimeSession } = await import("@/app/actions/downtime");

		await expect(startDowntimeSession("Sleep")).rejects.toThrow(
			"redirect:/login",
		);

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(switchDowntimeSession).not.toHaveBeenCalled();
	});
});
