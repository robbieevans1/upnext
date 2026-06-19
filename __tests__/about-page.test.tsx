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
		expect(screen.getByText("Task timers with continue tracking")).toBeInTheDocument();
		expect(screen.getByText("Subtasks without rigid blocking")).toBeInTheDocument();
		expect(screen.getByText("Time away tracking")).toBeInTheDocument();
		expect(screen.getByText("Analytics dashboard")).toBeInTheDocument();
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
