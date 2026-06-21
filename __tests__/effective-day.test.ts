import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
	dayStartOverride: {
		findUnique: vi.fn(),
		upsert: vi.fn(),
	},
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("effective day helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uses the real app day when there is no active override", async () => {
		prisma.dayStartOverride.findUnique.mockResolvedValue(null);
		const { getUserEffectiveTodayDate } = await import("@/lib/effective-day");

		const result = await getUserEffectiveTodayDate(
			"user-1",
			new Date("2026-06-20T22:00:00.000Z"),
		);

		expect(result).toEqual({
			realToday: new Date("2026-06-20T04:00:00.000Z"),
			today: new Date("2026-06-20T04:00:00.000Z"),
			tomorrow: new Date("2026-06-21T04:00:00.000Z"),
			isStartedEarly: false,
		});
	});

	it("uses tomorrow when the user has an active same-day override", async () => {
		prisma.dayStartOverride.findUnique.mockResolvedValue({
			baseDay: new Date("2026-06-20T04:00:00.000Z"),
			targetDay: new Date("2026-06-21T04:00:00.000Z"),
			expiresAt: new Date("2026-06-21T04:00:00.000Z"),
		});
		const { getUserEffectiveTodayDate } = await import("@/lib/effective-day");

		const result = await getUserEffectiveTodayDate(
			"user-1",
			new Date("2026-06-20T22:00:00.000Z"),
		);

		expect(result.today).toEqual(new Date("2026-06-21T04:00:00.000Z"));
		expect(result.isStartedEarly).toBe(true);
	});

	it("ignores an override once real midnight catches up", async () => {
		prisma.dayStartOverride.findUnique.mockResolvedValue({
			baseDay: new Date("2026-06-20T04:00:00.000Z"),
			targetDay: new Date("2026-06-21T04:00:00.000Z"),
			expiresAt: new Date("2026-06-21T04:00:00.000Z"),
		});
		const { getUserEffectiveTodayDate } = await import("@/lib/effective-day");

		const result = await getUserEffectiveTodayDate(
			"user-1",
			new Date("2026-06-21T04:01:00.000Z"),
		);

		expect(result.today).toEqual(new Date("2026-06-21T04:00:00.000Z"));
		expect(result.isStartedEarly).toBe(false);
	});

	it("starts only the next real app day early", async () => {
		const { startNextDayEarly } = await import("@/lib/effective-day");

		const result = await startNextDayEarly(
			"user-1",
			new Date("2026-06-20T22:00:00.000Z"),
		);

		expect(result.today).toEqual(new Date("2026-06-21T04:00:00.000Z"));
		expect(prisma.dayStartOverride.upsert).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
			},
			update: {
				baseDay: new Date("2026-06-20T04:00:00.000Z"),
				targetDay: new Date("2026-06-21T04:00:00.000Z"),
				expiresAt: new Date("2026-06-21T04:00:00.000Z"),
			},
			create: {
				userId: "user-1",
				baseDay: new Date("2026-06-20T04:00:00.000Z"),
				targetDay: new Date("2026-06-21T04:00:00.000Z"),
				expiresAt: new Date("2026-06-21T04:00:00.000Z"),
			},
		});
	});
});
