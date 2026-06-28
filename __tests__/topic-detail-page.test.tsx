import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopicDetailPage from "@/app/topics/[topicId]/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
	notFound: vi.fn(() => {
		throw new Error("notFound");
	}),
	prisma: {
		topic: {
			findFirst: vi.fn(),
		},
	},
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({
	redirect: mocks.redirect,
	notFound: mocks.notFound,
	useRouter: () => ({
		refresh: vi.fn(),
	}),
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("TopicDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		mocks.prisma.topic.findFirst.mockResolvedValue({
			id: "topic-1",
			title: "Networking events",
			category: "Social",
			description: "Reusable notes for work functions.",
			body: "Stand tall.",
			isArchived: false,
			userId: "user-1",
			createdAt: new Date("2026-06-20T12:00:00.000Z"),
			updatedAt: new Date("2026-06-20T12:00:00.000Z"),
			images: [
				{
					id: "image-1",
					topicId: "topic-1",
					userId: "user-1",
					url: "https://example.com/topic-image.jpg",
					pathname: "topics/topic-1/topic-image.jpg",
					caption: "Handshake reminder",
					altText: "People shaking hands",
					sortOrder: 0,
					createdAt: new Date("2026-06-20T12:00:00.000Z"),
					updatedAt: new Date("2026-06-20T12:00:00.000Z"),
				},
			],
		});
	});

	it("renders a large editable topic page for the current user", async () => {
		render(await TopicDetailPage({ params: Promise.resolve({ topicId: "topic-1" }) }));

		expect(screen.getByRole("textbox", { name: "Title" })).toHaveDisplayValue("Networking events");
		expect(screen.getByDisplayValue("Networking events")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Social")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Reusable notes for work functions.")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Stand tall.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save Topic" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Archive Topic" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "People shaking hands" })).toHaveAttribute(
			"src",
			"https://example.com/topic-image.jpg",
		);
		expect(screen.getByDisplayValue("Handshake reminder")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Delete Image" })).toBeInTheDocument();
	});

	it("redirects unauthenticated users", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		await expect(
			TopicDetailPage({ params: Promise.resolve({ topicId: "topic-1" }) }),
		).rejects.toThrow("redirect:/login");
		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});

	it("returns not found for missing or unauthorized topics", async () => {
		mocks.prisma.topic.findFirst.mockResolvedValue(null);

		await expect(
			TopicDetailPage({ params: Promise.resolve({ topicId: "missing-topic" }) }),
		).rejects.toThrow("notFound");
		expect(mocks.prisma.topic.findFirst).toHaveBeenCalledWith({
			where: {
				id: "missing-topic",
				userId: "user-1",
			},
			include: {
				images: {
					orderBy: [
						{
							sortOrder: "asc",
						},
						{
							createdAt: "asc",
						},
					],
				},
			},
		});
	});
});
