import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	$transaction: vi.fn(async (operations: unknown[]) => operations),
	challenge: {
		findFirst: vi.fn(),
		updateMany: vi.fn((args) => args),
	},
	dailyCheck: {
		count: vi.fn(),
		create: vi.fn(),
		updateMany: vi.fn((args) => args),
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

describe("challenge server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		prisma.challenge.findFirst.mockResolvedValue(null);
		prisma.dailyCheck.count.mockResolvedValue(0);
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates a challenge with a linked daily review check", async () => {
		prisma.dailyCheck.count.mockResolvedValue(3);
		const { createChallenge } = await import("@/app/actions/challenges");

		await createChallenge(
			formDataFrom({
				title: "  Don't use social media  ",
				description: "  No entertainment scrolling.  ",
				startDay: "2026-06-23",
				durationDays: "90",
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
				title:
					"Did you keep this challenge yesterday: Don't use social media?",
				description: "No entertainment scrolling.",
				userId: "user-1",
				sortOrder: 3,
				challenge: {
					create: {
						title: "Don't use social media",
						description: "No entertainment scrolling.",
						startDay: new Date("2026-06-23T04:00:00.000Z"),
						durationDays: 90,
						userId: "user-1",
					},
				},
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
		expect(revalidatePath).toHaveBeenCalledWith("/tasks");
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
	});

	it("does not create invalid challenges", async () => {
		const { createChallenge } = await import("@/app/actions/challenges");

		await createChallenge(
			formDataFrom({
				title: "",
				startDay: "2026-06-23",
				durationDays: "90",
			}),
		);
		await createChallenge(
			formDataFrom({
				title: "No social media",
				startDay: "2026-06-23",
				durationDays: "0",
			}),
		);

		expect(prisma.dailyCheck.create).not.toHaveBeenCalled();
	});

	it("updates a current-user challenge and its linked daily check", async () => {
		prisma.challenge.findFirst.mockResolvedValue({
			dailyCheckId: "check-1",
		});
		const { updateChallenge } = await import("@/app/actions/challenges");

		await updateChallenge(
			formDataFrom({
				challengeId: "challenge-1",
				title: "No social media",
				description: "No feeds or shorts.",
				startDay: "2026-06-24",
				durationDays: "45",
			}),
		);

		expect(prisma.challenge.updateMany).toHaveBeenCalledWith({
			where: {
				id: "challenge-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				title: "No social media",
				description: "No feeds or shorts.",
				startDay: new Date("2026-06-24T04:00:00.000Z"),
				durationDays: 45,
			},
		});
		expect(prisma.dailyCheck.updateMany).toHaveBeenCalledWith({
			where: {
				id: "check-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				title: "Did you keep this challenge yesterday: No social media?",
				description: "No feeds or shorts.",
			},
		});
	});

	it("archives challenges and generated daily checks instead of deleting rows", async () => {
		prisma.challenge.findFirst.mockResolvedValue({
			dailyCheckId: "check-1",
		});
		const { deleteChallenge } = await import("@/app/actions/challenges");

		await deleteChallenge("challenge-1");

		expect(prisma.$transaction).toHaveBeenCalledWith([
			expect.objectContaining({
				where: {
					id: "challenge-1",
					userId: "user-1",
					isActive: true,
				},
				data: {
					isActive: false,
				},
			}),
			expect.objectContaining({
				where: {
					id: "check-1",
					userId: "user-1",
					isActive: true,
				},
				data: {
					isActive: false,
				},
			}),
		]);
	});

	it("redirects unauthenticated users before mutating challenges", async () => {
		getServerSession.mockResolvedValue(null);
		const { createChallenge } = await import("@/app/actions/challenges");

		await expect(
			createChallenge(
				formDataFrom({
					title: "No social media",
					durationDays: "90",
				}),
			),
		).rejects.toThrow("redirect:/login");

		expect(prisma.dailyCheck.create).not.toHaveBeenCalled();
	});
});
