import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppNav from "@/components/AppNav";

const mocks = vi.hoisted(() => ({
	signOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	signOut: mocks.signOut,
}));

describe("AppNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the main app navigation links", () => {
		render(<AppNav />);

		expect(screen.getByRole("link", { name: "UpNext" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
			"href",
			"/tasks",
		);
		expect(screen.getByRole("link", { name: "Time" })).toHaveAttribute(
			"href",
			"/downtime",
		);
		expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);
		expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
			"href",
			"/about",
		);
	});

	it("signs out to the public home page", () => {
		render(<AppNav />);

		fireEvent.click(screen.getByRole("button", { name: "Log out" }));

		expect(mocks.signOut).toHaveBeenCalledWith({
			callbackUrl: "/",
		});
	});
});
