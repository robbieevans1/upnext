import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	$transaction: vi.fn(async (operations: unknown[]) => operations),
	dailyCheck: {
		count: vi.fn(),
		create: vi.fn(),
		findMany: vi.fn(),
		updateMany: vi.fn(),
	},
	dailyCheckResult: {
		upsert: vi.fn((args) => args),
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

describe("daily review server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates daily checks at the bottom of the active check list", async () => {
		prisma.dailyCheck.count.mockResolvedValue(2);
		const { createDailyCheck } = await import("@/app/actions/daily-review");

		await createDailyCheck(
			formDataFrom({
				title: "  Was below calorie limit?  ",
				description: "  Answer tomorrow.  ",
			}),
		);

		expect(prisma.dailyCheck.count).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				isActive: true,
			},
		});
		expect(prisma.dailyCheck.create).toHaveBeenCalledWith({
			data: {
				title: "Was below calorie limit?",
				description: "Answer tomorrow.",
				userId: "user-1",
				sortOrder: 2,
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("does not create a blank daily check", async () => {
		const { createDailyCheck } = await import("@/app/actions/daily-review");

		await createDailyCheck(formDataFrom({ title: "   " }));

		expect(prisma.dailyCheck.create).not.toHaveBeenCalled();
	});

	it("updates and soft deletes daily checks through current-user scoped writes", async () => {
		const { deleteDailyCheck, updateDailyCheck } = await import(
			"@/app/actions/daily-review"
		);

		await updateDailyCheck(
			formDataFrom({
				dailyCheckId: "check-1",
				title: "Hit protein target?",
				description: "Count the full day.",
			}),
		);
		await deleteDailyCheck("check-2");

		expect(prisma.dailyCheck.updateMany).toHaveBeenCalledWith({
			where: {
				id: "check-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				title: "Hit protein target?",
				description: "Count the full day.",
			},
		});
		expect(prisma.dailyCheck.updateMany).toHaveBeenCalledWith({
			where: {
				id: "check-2",
				userId: "user-1",
				isActive: true,
			},
			data: {
				isActive: false,
			},
		});
	});

	it("saves review answers only for active checks owned by the current user", async () => {
		prisma.dailyCheck.findMany.mockResolvedValue([
			{ id: "check-1" },
			{ id: "check-2" },
		]);
		const { saveDailyReview } = await import("@/app/actions/daily-review");

		await saveDailyReview(
			formDataFrom({
				targetDay: "2026-06-18",
				"status:check-1": "YES",
				"status:check-2": "NO",
				"status:other-user-check": "YES",
				"status:check-3": "MAYBE",
			}),
		);

		expect(prisma.dailyCheck.findMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				isActive: true,
			},
			select: {
				id: true,
			},
		});
		expect(prisma.$transaction).toHaveBeenCalledWith([
			{
				where: {
					dailyCheckId_targetDay: {
						dailyCheckId: "check-1",
						targetDay: new Date("2026-06-18T04:00:00.000Z"),
					},
				},
				update: {
					status: "YES",
				},
				create: {
					dailyCheckId: "check-1",
					userId: "user-1",
					targetDay: new Date("2026-06-18T04:00:00.000Z"),
					status: "YES",
				},
			},
			{
				where: {
					dailyCheckId_targetDay: {
						dailyCheckId: "check-2",
						targetDay: new Date("2026-06-18T04:00:00.000Z"),
					},
				},
				update: {
					status: "NO",
				},
				create: {
					dailyCheckId: "check-2",
					userId: "user-1",
					targetDay: new Date("2026-06-18T04:00:00.000Z"),
					status: "NO",
				},
			},
		]);
	});

	it("redirects unauthenticated users before mutating daily checks", async () => {
		getServerSession.mockResolvedValue(null);
		const { createDailyCheck } = await import("@/app/actions/daily-review");

		await expect(
			createDailyCheck(formDataFrom({ title: "Nope" })),
		).rejects.toThrow("redirect:/login");

		expect(prisma.dailyCheck.create).not.toHaveBeenCalled();
	});
});
