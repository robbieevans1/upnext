import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	$transaction: vi.fn(),
	calorieEntry: {
		create: vi.fn(),
		deleteMany: vi.fn(),
	},
	fastingSession: {
		create: vi.fn(),
		updateMany: vi.fn(),
	},
	user: {
		update: vi.fn(),
	},
	weightEntry: {
		upsert: vi.fn(),
	},
};

const getServerSession = vi.fn();
const getUserEffectiveTodayDate = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});
const revalidatePath = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/effective-day", () => ({ getUserEffectiveTodayDate }));

describe("nutrition server actions", () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		prisma.$transaction.mockImplementation(async (operations) => operations);
		prisma.fastingSession.create.mockImplementation((args) => args);
		prisma.fastingSession.updateMany.mockImplementation((args) => args);
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		getUserEffectiveTodayDate.mockResolvedValue({
			today: new Date("2026-06-23T04:00:00.000Z"),
		});
	});

	it("adds calorie entries for the current effective day", async () => {
		const { addCalorieEntry } = await import("@/app/actions/nutrition");

		await addCalorieEntry(
			formDataFrom({
				calories: "445.4",
				note: "  lunch  ",
			}),
		);

		expect(prisma.calorieEntry.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				day: new Date("2026-06-23T04:00:00.000Z"),
				calories: 445,
				note: "lunch",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/nutrition");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("adds calorie entries one app day ahead when requested", async () => {
		const { addCalorieEntry } = await import("@/app/actions/nutrition");

		await addCalorieEntry(
			formDataFrom({
				calories: "300",
				note: "late snack",
				targetDay: "tomorrow",
			}),
		);

		expect(prisma.calorieEntry.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				day: new Date("2026-06-24T04:00:00.000Z"),
				calories: 300,
				note: "late snack",
			},
		});
	});

	it("ignores invalid calorie entries", async () => {
		const { addCalorieEntry } = await import("@/app/actions/nutrition");

		await addCalorieEntry(formDataFrom({ calories: "0" }));
		await addCalorieEntry(formDataFrom({ calories: "not-a-number" }));

		expect(prisma.calorieEntry.create).not.toHaveBeenCalled();
	});

	it("deletes only current-user calorie entries", async () => {
		const { deleteCalorieEntry } = await import("@/app/actions/nutrition");

		await deleteCalorieEntry("entry-1");

		expect(prisma.calorieEntry.deleteMany).toHaveBeenCalledWith({
			where: {
				id: "entry-1",
				userId: "user-1",
			},
		});
	});

	it("upserts one weight entry for the current effective day", async () => {
		const { saveWeightEntry } = await import("@/app/actions/nutrition");

		await saveWeightEntry(formDataFrom({ weightLbs: "185.44" }));

		expect(prisma.weightEntry.upsert).toHaveBeenCalledWith({
			where: {
				userId_day: {
					userId: "user-1",
					day: new Date("2026-06-23T04:00:00.000Z"),
				},
			},
			update: {
				weightLbs: 185.4,
			},
			create: {
				userId: "user-1",
				day: new Date("2026-06-23T04:00:00.000Z"),
				weightLbs: 185.4,
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/nutrition");
	});

	it("ignores invalid weight entries", async () => {
		const { saveWeightEntry } = await import("@/app/actions/nutrition");

		await saveWeightEntry(formDataFrom({ weightLbs: "0" }));
		await saveWeightEntry(formDataFrom({ weightLbs: "not-a-number" }));

		expect(prisma.weightEntry.upsert).not.toHaveBeenCalled();
	});

	it("saves a starting weight for the current user", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T14:15:00.000Z"));
		const { saveStartingWeight } = await import("@/app/actions/nutrition");

		await saveStartingWeight(formDataFrom({ weightLbs: "205.44" }));

		expect(prisma.user.update).toHaveBeenCalledWith({
			where: {
				id: "user-1",
			},
			data: {
				startingWeightLbs: 205.4,
				startingWeightSetAt: new Date("2026-06-23T14:15:00.000Z"),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/nutrition");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("ignores invalid starting weight entries", async () => {
		const { saveStartingWeight } = await import("@/app/actions/nutrition");

		await saveStartingWeight(formDataFrom({ weightLbs: "0" }));
		await saveStartingWeight(formDataFrom({ weightLbs: "not-a-number" }));

		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("starts a fasting session after closing any active user fast", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T14:15:00.000Z"));
		const { startFastingSession } = await import("@/app/actions/nutrition");

		await startFastingSession();

		expect(prisma.fastingSession.updateMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				endedAt: null,
			},
			data: {
				endedAt: new Date("2026-06-23T14:15:00.000Z"),
			},
		});
		expect(prisma.fastingSession.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				startedAt: new Date("2026-06-23T14:15:00.000Z"),
			},
		});
		expect(prisma.$transaction).toHaveBeenCalledWith([
			prisma.fastingSession.updateMany.mock.results[0]?.value,
			prisma.fastingSession.create.mock.results[0]?.value,
		]);
		expect(revalidatePath).toHaveBeenCalledWith("/nutrition");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("starts a fasting session from an earlier app time", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T20:00:00.000Z"));
		const { startFastingSession } = await import("@/app/actions/nutrition");

		await startFastingSession("2026-06-23", "14:00");

		expect(prisma.fastingSession.updateMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				endedAt: null,
			},
			data: {
				endedAt: new Date("2026-06-23T18:00:00.000Z"),
			},
		});
		expect(prisma.fastingSession.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				startedAt: new Date("2026-06-23T18:00:00.000Z"),
			},
		});
	});

	it("does not start fasting sessions in the future", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T20:00:00.000Z"));
		const { startFastingSession } = await import("@/app/actions/nutrition");

		await startFastingSession("2026-06-23", "18:00");

		expect(prisma.fastingSession.create).toHaveBeenCalledWith({
			data: {
				userId: "user-1",
				startedAt: new Date("2026-06-23T20:00:00.000Z"),
			},
		});
	});

	it("ends only the active fasting session for the current user", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T18:30:00.000Z"));
		const { endFastingSession } = await import("@/app/actions/nutrition");

		await endFastingSession();

		expect(prisma.fastingSession.updateMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				endedAt: null,
			},
			data: {
				endedAt: new Date("2026-06-23T18:30:00.000Z"),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/nutrition");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("redirects unauthenticated users before mutating nutrition data", async () => {
		getServerSession.mockResolvedValue(null);
		const { addCalorieEntry } = await import("@/app/actions/nutrition");

		await expect(
			addCalorieEntry(formDataFrom({ calories: "200" })),
		).rejects.toThrow("redirect:/login");

		expect(prisma.calorieEntry.create).not.toHaveBeenCalled();
	});
});
