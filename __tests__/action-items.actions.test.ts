import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	actionItem: {
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

describe("action item server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates one-off action items with an optional app due date", async () => {
		const { createActionItem } = await import("@/app/actions/action-items");

		await createActionItem(
			formDataFrom({
				title: "  Return package  ",
				description: "  Bring QR code  ",
				playbook: "  Go before lunch.  ",
				dueOn: "2026-06-16",
			}),
		);

		expect(prisma.actionItem.create).toHaveBeenCalledWith({
			data: {
				title: "Return package",
				description: "Bring QR code",
				playbook: "Go before lunch.",
				dueOn: new Date("2026-06-16T04:00:00.000Z"),
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
		expect(revalidatePath).toHaveBeenCalledWith("/action-items");
	});

	it("updates only the current user's action item", async () => {
		const { updateActionItem } = await import("@/app/actions/action-items");

		await updateActionItem(
			formDataFrom({
				actionItemId: "item-1",
				title: "Call pharmacy",
				description: "Ask about refill",
				playbook: "Have card ready.",
				dueOn: "",
			}),
		);

		expect(prisma.actionItem.updateMany).toHaveBeenCalledWith({
			where: {
				id: "item-1",
				userId: "user-1",
			},
			data: {
				title: "Call pharmacy",
				description: "Ask about refill",
				playbook: "Have card ready.",
				dueOn: null,
			},
		});
	});

	it("completes, reopens, and cancels action items through scoped updates", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T14:30:00.000Z"));
		const { cancelActionItem, completeActionItem, reopenActionItem } =
			await import("@/app/actions/action-items");

		await completeActionItem("item-1");
		await reopenActionItem("item-1");
		await cancelActionItem("item-1");

		expect(prisma.actionItem.updateMany).toHaveBeenNthCalledWith(1, {
			where: {
				id: "item-1",
				userId: "user-1",
				completedAt: null,
				canceledAt: null,
			},
			data: {
				completedAt: new Date("2026-06-16T14:30:00.000Z"),
			},
		});
		expect(prisma.actionItem.updateMany).toHaveBeenNthCalledWith(2, {
			where: {
				id: "item-1",
				userId: "user-1",
			},
			data: {
				completedAt: null,
				canceledAt: null,
			},
		});
		expect(prisma.actionItem.updateMany).toHaveBeenNthCalledWith(3, {
			where: {
				id: "item-1",
				userId: "user-1",
				completedAt: null,
			},
			data: {
				canceledAt: new Date("2026-06-16T14:30:00.000Z"),
			},
		});
	});

	it("redirects unauthenticated users before creating action items", async () => {
		getServerSession.mockResolvedValue(null);
		const { createActionItem } = await import("@/app/actions/action-items");

		await expect(
			createActionItem(formDataFrom({ title: "Nope" })),
		).rejects.toThrow("redirect:/login");

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(prisma.actionItem.create).not.toHaveBeenCalled();
	});
});
