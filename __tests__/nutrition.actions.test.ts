import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	calorieEntry: {
		create: vi.fn(),
		deleteMany: vi.fn(),
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
		vi.clearAllMocks();
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

	it("redirects unauthenticated users before mutating nutrition data", async () => {
		getServerSession.mockResolvedValue(null);
		const { addCalorieEntry } = await import("@/app/actions/nutrition");

		await expect(
			addCalorieEntry(formDataFrom({ calories: "200" })),
		).rejects.toThrow("redirect:/login");

		expect(prisma.calorieEntry.create).not.toHaveBeenCalled();
	});
});
