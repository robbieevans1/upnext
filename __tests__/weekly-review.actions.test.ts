import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	weeklyReview: {
		upsert: vi.fn(),
	},
};

const getServerSession = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});
const revalidatePath = vi.fn();
const setFlashNotification = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/flash-notifications", () => ({ setFlashNotification }));

describe("weekly review server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("saves a weekly review draft for launch week or later", async () => {
		const { saveWeeklyReview } = await import("@/app/actions/weekly-review");

		await saveWeeklyReview(
			formDataFrom({
				weekStart: "2026-07-05",
				intent: "draft",
				movedForward: "  Deep work helped.  ",
				busyNotUseful: "Too much admin.",
				moreNextWeek: "Portfolio.",
				lessNextWeek: "Scrolling.",
				taskChanges: "Pause one task.",
				routineAligned: "Mostly.",
			}),
		);

		expect(prisma.weeklyReview.upsert).toHaveBeenCalledWith({
			where: {
				userId_weekStart: {
					userId: "user-1",
					weekStart: new Date("2026-07-05T04:00:00.000Z"),
				},
			},
			update: {
				movedForward: "Deep work helped.",
				busyNotUseful: "Too much admin.",
				moreNextWeek: "Portfolio.",
				lessNextWeek: "Scrolling.",
				taskChanges: "Pause one task.",
				routineAligned: "Mostly.",
			},
			create: {
				userId: "user-1",
				weekStart: new Date("2026-07-05T04:00:00.000Z"),
				movedForward: "Deep work helped.",
				busyNotUseful: "Too much admin.",
				moreNextWeek: "Portfolio.",
				lessNextWeek: "Scrolling.",
				taskChanges: "Pause one task.",
				routineAligned: "Mostly.",
				completedAt: null,
			},
		});
		expect(setFlashNotification).toHaveBeenCalledWith(
			"Weekly review draft saved.",
		);
		expect(revalidatePath).toHaveBeenCalledWith("/history");
		expect(revalidatePath).toHaveBeenCalledWith("/today");
	});

	it("marks a weekly review complete", async () => {
		const { saveWeeklyReview } = await import("@/app/actions/weekly-review");

		await saveWeeklyReview(
			formDataFrom({
				weekStart: "2026-07-05",
				intent: "complete",
				movedForward: "Training.",
			}),
		);

		expect(prisma.weeklyReview.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				update: expect.objectContaining({
					completedAt: new Date("2026-07-13T12:00:00.000Z"),
				}),
				create: expect.objectContaining({
					completedAt: new Date("2026-07-13T12:00:00.000Z"),
				}),
			}),
		);
		expect(setFlashNotification).toHaveBeenCalledWith(
			"Weekly review completed.",
		);
	});

	it("does not save reviews before the launch week", async () => {
		const { saveWeeklyReview } = await import("@/app/actions/weekly-review");

		await saveWeeklyReview(
			formDataFrom({
				weekStart: "2026-06-28",
				intent: "complete",
				movedForward: "Old week.",
			}),
		);

		expect(prisma.weeklyReview.upsert).not.toHaveBeenCalled();
	});

	it("redirects unauthenticated users before mutating weekly reviews", async () => {
		getServerSession.mockResolvedValue(null);
		const { saveWeeklyReview } = await import("@/app/actions/weekly-review");

		await expect(
			saveWeeklyReview(
				formDataFrom({
					weekStart: "2026-07-05",
					intent: "draft",
				}),
			),
		).rejects.toThrow("redirect:/login");

		expect(prisma.weeklyReview.upsert).not.toHaveBeenCalled();
	});
});
