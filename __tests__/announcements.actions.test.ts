import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	announcement: {
		create: vi.fn(),
		updateMany: vi.fn(),
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

describe("announcement server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-23T12:00:00.000Z"));
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates future announcements for the current user", async () => {
		const { createAnnouncement } = await import("@/app/actions/announcements");

		await createAnnouncement(
			formDataFrom({
				title: "  Race day  ",
				targetDate: "2026-07-01",
				targetTime: "09:30",
			}),
		);

		expect(prisma.announcement.create).toHaveBeenCalledWith({
			data: {
				title: "Race day",
				targetAt: new Date("2026-07-01T13:30:00.000Z"),
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/announcements");
		expect(revalidatePath).toHaveBeenCalledWith("/");
	});

	it("does not create past announcements", async () => {
		const { createAnnouncement } = await import("@/app/actions/announcements");

		await createAnnouncement(
			formDataFrom({
				title: "Past",
				targetDate: "2026-06-22",
				targetTime: "09:00",
			}),
		);

		expect(prisma.announcement.create).not.toHaveBeenCalled();
	});

	it("updates current-user active announcements", async () => {
		const { updateAnnouncement } = await import("@/app/actions/announcements");

		await updateAnnouncement(
			formDataFrom({
				announcementId: "announcement-1",
				title: "Launch",
				targetDate: "2026-07-02",
				targetTime: "14:00",
			}),
		);

		expect(prisma.announcement.updateMany).toHaveBeenCalledWith({
			where: {
				id: "announcement-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				title: "Launch",
				targetAt: new Date("2026-07-02T18:00:00.000Z"),
			},
		});
	});

	it("archives current-user active announcements", async () => {
		const { deleteAnnouncement } = await import("@/app/actions/announcements");

		await deleteAnnouncement("announcement-1");

		expect(prisma.announcement.updateMany).toHaveBeenCalledWith({
			where: {
				id: "announcement-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				isActive: false,
			},
		});
	});

	it("redirects unauthenticated users before mutating announcements", async () => {
		getServerSession.mockResolvedValue(null);
		const { createAnnouncement } = await import("@/app/actions/announcements");

		await expect(
			createAnnouncement(
				formDataFrom({
					title: "Nope",
					targetDate: "2026-07-01",
					targetTime: "09:00",
				}),
			),
		).rejects.toThrow("redirect:/login");

		expect(prisma.announcement.create).not.toHaveBeenCalled();
	});
});
