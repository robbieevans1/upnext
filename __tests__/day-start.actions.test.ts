import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserId = vi.fn();
const startNextDayEarly = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/server-auth", () => ({ requireUserId }));
vi.mock("@/lib/effective-day", () => ({ startNextDayEarly }));
vi.mock("next/cache", () => ({ revalidatePath }));

describe("day start server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUserId.mockResolvedValue("user-1");
	});

	it("starts tomorrow early for the current user and refreshes today", async () => {
		const { startTomorrowEarly } = await import("@/app/actions/day-start");

		await startTomorrowEarly();

		expect(startNextDayEarly).toHaveBeenCalledWith("user-1");
		expect(revalidatePath).toHaveBeenCalledWith("/today");
	});
});
