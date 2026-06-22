import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	commitmentOccurrenceCompletion: {
		upsert: vi.fn(),
	},
	commitment: {
		create: vi.fn(),
		findFirst: vi.fn(),
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
				recurrence: "NONE",
				recurrenceDayOfWeek: null,
				recurrenceDays: [],
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
		expect(revalidatePath).toHaveBeenCalledWith("/commitments");
	});

	it("creates weekly recurring commitments for the selected weekday", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "  Go to church  ",
				location: "  Main Street  ",
				day: "2026-06-21",
				startTime: "11:00",
				endTime: "",
				isWeekly: "on",
				recurrenceDays: "0",
			}),
		);

		expect(prisma.commitment.create).toHaveBeenCalledWith({
			data: {
				title: "Go to church",
				description: "",
				playbook: "",
				location: "Main Street",
				day: new Date("2026-06-21T04:00:00.000Z"),
				startsAt: new Date("2026-06-21T15:00:00.000Z"),
				endsAt: null,
				recurrence: "WEEKLY",
				recurrenceDayOfWeek: 0,
				recurrenceDays: [0],
				userId: "user-1",
			},
		});
	});

	it("creates weekly recurring commitments for multiple selected weekdays", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "Morning class",
				day: "2026-06-22",
				startTime: "07:00",
				isWeekly: "on",
				recurrenceDays: ["1", "3", "5"],
			}),
		);

		expect(prisma.commitment.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				title: "Morning class",
				recurrence: "WEEKLY",
				recurrenceDayOfWeek: 1,
				recurrenceDays: [1, 3, 5],
				userId: "user-1",
			}),
		});
	});

	it("supports legacy single weekday recurring commitment submissions", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "Legacy church",
				day: "2026-06-21",
				isWeekly: "on",
				recurrenceDayOfWeek: "0",
			}),
		);

		expect(prisma.commitment.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				recurrence: "WEEKLY",
				recurrenceDayOfWeek: 0,
				recurrenceDays: [0],
			}),
		});
	});

	it("does not create weekly commitments without a valid weekday", async () => {
		const { createCommitment } = await import("@/app/actions/commitments");

		await createCommitment(
			formDataFrom({
				title: "Go to church",
				day: "2026-06-21",
				isWeekly: "on",
				recurrenceDays: "9",
			}),
		);

		expect(prisma.commitment.create).not.toHaveBeenCalled();
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
				recurrence: "NONE",
				recurrenceDayOfWeek: null,
				recurrenceDays: [],
			},
		});
	});

	it("updates recurring commitment settings through scoped writes", async () => {
		const { updateCommitment } = await import("@/app/actions/commitments");

		await updateCommitment(
			formDataFrom({
				commitmentId: "commitment-1",
				title: "Church",
				day: "2026-06-21",
				startTime: "11:00",
				isWeekly: "on",
				recurrenceDays: ["1", "3", "5"],
			}),
		);

		expect(prisma.commitment.updateMany).toHaveBeenCalledWith({
			where: {
				id: "commitment-1",
				userId: "user-1",
			},
			data: {
				title: "Church",
				description: "",
				playbook: "",
				location: "",
				day: new Date("2026-06-21T04:00:00.000Z"),
				startsAt: new Date("2026-06-21T15:00:00.000Z"),
				endsAt: null,
				recurrence: "WEEKLY",
				recurrenceDayOfWeek: 1,
				recurrenceDays: [1, 3, 5],
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

	it("completes one recurring occurrence without closing the whole series", async () => {
		prisma.commitment.findFirst.mockResolvedValue({
			id: "commitment-1",
			recurrenceDayOfWeek: 0,
			recurrenceDays: [0, 3],
		});
		const { completeCommitmentOccurrence } = await import(
			"@/app/actions/commitments"
		);

		await completeCommitmentOccurrence("commitment-1", "2026-06-21");

		expect(prisma.commitment.findFirst).toHaveBeenCalledWith({
			where: {
				id: "commitment-1",
				userId: "user-1",
				recurrence: "WEEKLY",
				canceledAt: null,
				completedAt: null,
				day: {
					lte: new Date("2026-06-21T04:00:00.000Z"),
				},
			},
			select: {
				id: true,
				recurrenceDayOfWeek: true,
				recurrenceDays: true,
			},
		});
		expect(prisma.commitmentOccurrenceCompletion.upsert).toHaveBeenCalledWith({
			where: {
				commitmentId_occurrenceDay: {
					commitmentId: "commitment-1",
					occurrenceDay: new Date("2026-06-21T04:00:00.000Z"),
				},
			},
			update: {},
			create: {
				commitmentId: "commitment-1",
				userId: "user-1",
				occurrenceDay: new Date("2026-06-21T04:00:00.000Z"),
			},
		});
		expect(prisma.commitment.updateMany).not.toHaveBeenCalled();
	});

	it("does not complete recurring occurrences on the wrong weekday", async () => {
		prisma.commitment.findFirst.mockResolvedValue({
			id: "commitment-1",
			recurrenceDayOfWeek: 1,
			recurrenceDays: [1, 3, 5],
		});
		const { completeCommitmentOccurrence } = await import(
			"@/app/actions/commitments"
		);

		await completeCommitmentOccurrence("commitment-1", "2026-06-21");

		expect(prisma.commitmentOccurrenceCompletion.upsert).not.toHaveBeenCalled();
	});

	it("completes recurring occurrences using the legacy weekday fallback", async () => {
		prisma.commitment.findFirst.mockResolvedValue({
			id: "commitment-1",
			recurrenceDayOfWeek: 0,
			recurrenceDays: [],
		});
		const { completeCommitmentOccurrence } = await import(
			"@/app/actions/commitments"
		);

		await completeCommitmentOccurrence("commitment-1", "2026-06-21");

		expect(prisma.commitmentOccurrenceCompletion.upsert).toHaveBeenCalled();
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
