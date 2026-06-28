import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	put: vi.fn(),
	prisma: {
		topic: {
			findFirst: vi.fn(),
		},
		topicImage: {
			count: vi.fn(),
			create: vi.fn(),
		},
	},
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@vercel/blob", () => ({ put: mocks.put }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

function createRequest(formData: FormData) {
	return {
		formData: async () => formData,
	} as Request;
}

describe("topic image upload route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		mocks.prisma.topic.findFirst.mockResolvedValue({ id: "topic-1" });
		mocks.prisma.topicImage.count.mockResolvedValue(2);
		mocks.put.mockResolvedValue({
			url: "https://blob.vercel-storage.com/topic-image.jpg",
			pathname: "topics/topic-1/topic-image.jpg",
		});
		mocks.prisma.topicImage.create.mockResolvedValue({ id: "image-1" });
	});

	it("rejects unauthenticated uploads", async () => {
		mocks.getServerSession.mockResolvedValue(null);
		const { POST } = await import("@/app/api/topic-images/route");
		const formData = new FormData();
		formData.append("topicId", "topic-1");
		formData.append("images", new File(["image"], "image.png", { type: "image/png" }));

		const response = await POST(createRequest(formData));

		expect(response.status).toBe(401);
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it("rejects uploads for topics outside the current user", async () => {
		mocks.prisma.topic.findFirst.mockResolvedValue(null);
		const { POST } = await import("@/app/api/topic-images/route");
		const formData = new FormData();
		formData.append("topicId", "topic-1");
		formData.append("images", new File(["image"], "image.png", { type: "image/png" }));

		const response = await POST(createRequest(formData));

		expect(response.status).toBe(404);
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it("uploads images to Blob and stores metadata in Prisma", async () => {
		const { POST } = await import("@/app/api/topic-images/route");
		const formData = new FormData();
		formData.append("topicId", "topic-1");
		formData.append(
			"images",
			new File(["image"], "topic image.png", { type: "image/png" }),
			"topic image.png",
		);

		const response = await POST(createRequest(formData));

		expect(response.status).toBe(201);
		expect(mocks.put).toHaveBeenCalledWith(
			"topics/topic-1/topic-image.png",
			expect.any(File),
			{
				access: "public",
				addRandomSuffix: true,
			},
		);
		expect(mocks.prisma.topicImage.create).toHaveBeenCalledWith({
			data: {
				topicId: "topic-1",
				userId: "user-1",
				url: "https://blob.vercel-storage.com/topic-image.jpg",
				pathname: "topics/topic-1/topic-image.jpg",
				altText: "topic image.png",
				sortOrder: 2,
			},
		});
	});
});
