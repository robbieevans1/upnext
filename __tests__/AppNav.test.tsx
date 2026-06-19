import { fireEvent, render, screen, within } from "@testing-library/react";
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

	it("opens and closes the mobile navigation menu", () => {
		render(<AppNav />);

		expect(screen.queryByRole("dialog", { name: "Navigation menu" })).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: "Open navigation menu" }),
		);

		const menu = screen.getByRole("dialog", { name: "Navigation menu" });

		expect(within(menu).getByRole("link", { name: "Today" })).toHaveAttribute(
			"href",
			"/today",
		);
		expect(within(menu).getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);

		fireEvent.click(
			within(menu).getByRole("button", { name: "Close navigation menu" }),
		);

		expect(screen.queryByRole("dialog", { name: "Navigation menu" })).toBeNull();
	});

	it("signs out from the mobile navigation menu", () => {
		render(<AppNav />);

		fireEvent.click(
			screen.getByRole("button", { name: "Open navigation menu" }),
		);
		fireEvent.click(
			within(screen.getByRole("dialog", { name: "Navigation menu" })).getByRole(
				"button",
				{ name: "Log out" },
			),
		);

		expect(mocks.signOut).toHaveBeenCalledWith({
			callbackUrl: "/",
		});
	});
});
