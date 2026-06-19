import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	commitment: {
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

describe("commitment server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates scheduled commitments for the selected app day and times", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "  Dentist  ",
				description: "  Bring insurance card  ",
				playbook: "  Arrive ten minutes early.  ",
				location: "  Main Street  ",
				day: "2026-06-16",
				startTime: "09:30",
				endTime: "10:15",
			}),
		);

		expect(prisma.commitment.create).toHaveBeenCalledWith({
			data: {
				title: "Dentist",
				description: "Bring insurance card",
				playbook: "Arrive ten minutes early.",
				location: "Main Street",
				day: new Date("2026-06-16T04:00:00.000Z"),
				startsAt: new Date("2026-06-16T13:30:00.000Z"),
				endsAt: new Date("2026-06-16T14:15:00.000Z"),
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
		expect(revalidatePath).toHaveBeenCalledWith("/commitments");
	});

	it("does not create commitments without a valid date", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "Dentist",
				day: "not-a-date",
			}),
		);

		expect(prisma.commitment.create).not.toHaveBeenCalled();
	});

	it("updates only the current user's commitment", async () => {
		const { updateCommitment } = await import("@/app/actions/commitments");

		await updateCommitment(
			formDataFrom({
				commitmentId: "commitment-1",
				title: "Interview",
				description: "Prep examples",
				playbook: "Smile. Pause before answering.",
				location: "Zoom",
				day: "2026-06-16",
				startTime: "",
				endTime: "",
			}),
		);

		expect(prisma.commitment.updateMany).toHaveBeenCalledWith({
			where: {
				id: "commitment-1",
				userId: "user-1",
			},
			data: {
				title: "Interview",
				description: "Prep examples",
				playbook: "Smile. Pause before answering.",
				location: "Zoom",
				day: new Date("2026-06-16T04:00:00.000Z"),
				startsAt: null,
				endsAt: null,
			},
		});
	});

	it("completes, reopens, and cancels commitments through scoped updates", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T14:30:00.000Z"));
		const { cancelCommitment, completeCommitment, reopenCommitment } =
			await import("@/app/actions/commitments");

		await completeCommitment("commitment-1");
		await reopenCommitment("commitment-1");
		await cancelCommitment("commitment-1");

		expect(prisma.commitment.updateMany).toHaveBeenNthCalledWith(1, {
			where: {
				id: "commitment-1",
				userId: "user-1",
				completedAt: null,
				canceledAt: null,
			},
			data: {
				completedAt: new Date("2026-06-16T14:30:00.000Z"),
			},
		});
		expect(prisma.commitment.updateMany).toHaveBeenNthCalledWith(2, {
			where: {
				id: "commitment-1",
				userId: "user-1",
			},
			data: {
				completedAt: null,
				canceledAt: null,
			},
		});
		expect(prisma.commitment.updateMany).toHaveBeenNthCalledWith(3, {
			where: {
				id: "commitment-1",
				userId: "user-1",
				completedAt: null,
			},
			data: {
				canceledAt: new Date("2026-06-16T14:30:00.000Z"),
			},
		});
	});

	it("redirects unauthenticated users before creating commitments", async () => {
		getServerSession.mockResolvedValue(null);
		const { createCommitment } = await import("@/app/actions/commitments");

		await expect(
			createCommitment(formDataFrom({ title: "Nope" })),
		).rejects.toThrow("redirect:/login");

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(prisma.commitment.create).not.toHaveBeenCalled();
	});
});
