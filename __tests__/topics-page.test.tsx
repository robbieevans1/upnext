import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TopicsPage from "@/app/topics/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
	prisma: {
		topic: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("TopicsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
		mocks.prisma.topic.findMany.mockResolvedValue([
			{
				id: "topic-1",
				title: "Networking events",
				category: "Social",
				description: "Reusable notes for work functions.",
				body: "Stand tall.",
				isArchived: false,
				userId: "user-1",
				createdAt: new Date("2026-06-20T12:00:00.000Z"),
				updatedAt: new Date("2026-06-20T12:00:00.000Z"),
			},
			{
				id: "topic-2",
				title: "Old focus area",
				category: null,
				description: null,
				body: null,
				isArchived: true,
				userId: "user-1",
				createdAt: new Date("2026-06-19T12:00:00.000Z"),
				updatedAt: new Date("2026-06-19T12:00:00.000Z"),
			},
		]);
	});

	it("renders active and archived topics", async () => {
		render(await TopicsPage());

		expect(screen.getByRole("heading", { name: "Topics" })).toBeInTheDocument();
		expect(screen.getByDisplayValue("Networking events")).toBeInTheDocument();
		expect(screen.getByText("Social")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Old focus area")).toBeInTheDocument();
		expect(screen.getByText("Archived")).toBeInTheDocument();
	});

	it("redirects unauthenticated users", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		await expect(TopicsPage()).rejects.toThrow("redirect:/login");
		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});
});
