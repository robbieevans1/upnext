import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	topic: {
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

describe("topic server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates topics for the current user", async () => {
		const { createTopic } = await import("@/app/actions/topics");

		await createTopic(
			formDataFrom({
				title: "  Networking events  ",
				category: "  Social  ",
				description: "  How to show up well.  ",
				body: "  Stand tall. Smile. Ask questions.  ",
			}),
		);

		expect(prisma.topic.create).toHaveBeenCalledWith({
			data: {
				title: "Networking events",
				category: "Social",
				description: "How to show up well.",
				body: "Stand tall. Smile. Ask questions.",
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/topics");
	});

	it("does not create blank topics", async () => {
		const { createTopic } = await import("@/app/actions/topics");

		await createTopic(formDataFrom({ title: "   " }));

		expect(prisma.topic.create).not.toHaveBeenCalled();
	});

	it("updates topics through current-user scoped writes", async () => {
		const { updateTopic } = await import("@/app/actions/topics");

		await updateTopic(
			formDataFrom({
				topicId: "topic-1",
				title: "Interview mindset",
				category: "Career",
				description: "Before interviews",
				body: "Pause before answering.",
			}),
		);

		expect(prisma.topic.updateMany).toHaveBeenCalledWith({
			where: {
				id: "topic-1",
				userId: "user-1",
			},
			data: {
				title: "Interview mindset",
				category: "Career",
				description: "Before interviews",
				body: "Pause before answering.",
			},
		});
	});

	it("archives and restores topics through scoped writes", async () => {
		const { archiveTopic, restoreTopic } = await import("@/app/actions/topics");

		await archiveTopic("topic-1");
		await restoreTopic("topic-1");

		expect(prisma.topic.updateMany).toHaveBeenNthCalledWith(1, {
			where: {
				id: "topic-1",
				userId: "user-1",
				isArchived: false,
			},
			data: {
				isArchived: true,
			},
		});
		expect(prisma.topic.updateMany).toHaveBeenNthCalledWith(2, {
			where: {
				id: "topic-1",
				userId: "user-1",
				isArchived: true,
			},
			data: {
				isArchived: false,
			},
		});
	});

	it("redirects unauthenticated users before mutating topics", async () => {
		getServerSession.mockResolvedValue(null);
		const { createTopic } = await import("@/app/actions/topics");

		await expect(
			createTopic(formDataFrom({ title: "Nope" })),
		).rejects.toThrow("redirect:/login");

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(prisma.topic.create).not.toHaveBeenCalled();
	});
});
