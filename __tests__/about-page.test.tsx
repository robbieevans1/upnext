import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AboutPage from "@/app/about/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("next-auth", () => ({
	getServerSession: mocks.getServerSession,
}));

vi.mock("next-auth/react", () => ({
	signOut: mocks.signOut,
}));

describe("AboutPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("is viewable when logged out with public navigation", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		render(await AboutPage());

		expect(
			screen.getByRole("heading", {
				name: "A task app built around what you should do next.",
			}),
		).toBeInTheDocument();
		expect(screen.getAllByRole("link", { name: "Log in" })).toHaveLength(2);
		for (const loginLink of screen.getAllByRole("link", { name: "Log in" })) {
			expect(loginLink).toHaveAttribute("href", "/login");
		}
		expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
			"href",
			"/signup",
		);
		expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
		expect(screen.getByText("Daily stack, timers, and subtasks")).toBeInTheDocument();
		expect(screen.getByText("Playbooks and reusable notes")).toBeInTheDocument();
		expect(screen.getByText("Daily review and challenges")).toBeInTheDocument();
		expect(screen.getByText("Time, nutrition, and recovery tracking")).toBeInTheDocument();
		expect(screen.getByText("Flexible timer")).toBeInTheDocument();
		expect(screen.getByText("Monthly calendar")).toBeInTheDocument();
	});

	it("uses app navigation and app links when logged in", async () => {
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});

		render(await AboutPage());

		expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Manage Tasks" })).toHaveAttribute(
			"href",
			"/tasks",
		);
		expect(
			screen.getByRole("link", { name: "View Today's Stack" }),
		).toHaveAttribute("href", "/today");
	});
});
