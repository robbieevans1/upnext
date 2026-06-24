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
		expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
			"href",
			"/dashboard",
		);
		expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
			"href",
			"/tasks",
		);
		expect(screen.getByRole("link", { name: "Topics" })).toHaveAttribute(
			"href",
			"/topics",
		);
		expect(screen.getByRole("link", { name: "Actions" })).toHaveAttribute(
			"href",
			"/action-items",
		);
		expect(screen.getByRole("link", { name: "Schedule" })).toHaveAttribute(
			"href",
			"/commitments",
		);
		expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
			"href",
			"/calendar",
		);
		expect(screen.getByRole("link", { name: "Time" })).toHaveAttribute(
			"href",
			"/downtime",
		);
		expect(screen.getByRole("link", { name: "Nutrition" })).toHaveAttribute(
			"href",
			"/nutrition",
		);
		expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);
		expect(screen.getByRole("link", { name: "Counter" })).toHaveAttribute(
			"href",
			"/tools/counter",
		);
		expect(screen.getByRole("link", { name: "Announcements" })).toHaveAttribute(
			"href",
			"/announcements",
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
		expect(
			within(menu).getByRole("link", { name: "Dashboard" }),
		).toHaveAttribute("href", "/dashboard");
		expect(within(menu).getByRole("link", { name: "Actions" })).toHaveAttribute(
			"href",
			"/action-items",
		);
		expect(within(menu).getByRole("link", { name: "Topics" })).toHaveAttribute(
			"href",
			"/topics",
		);
		expect(
			within(menu).getByRole("link", { name: "Nutrition" }),
		).toHaveAttribute("href", "/nutrition");
		expect(
			within(menu).getByRole("link", { name: "Schedule" }),
		).toHaveAttribute("href", "/commitments");
		expect(within(menu).getByRole("link", { name: "Calendar" })).toHaveAttribute(
			"href",
			"/calendar",
		);
		expect(within(menu).getByRole("link", { name: "History" })).toHaveAttribute(
			"href",
			"/history",
		);
		expect(within(menu).getByRole("link", { name: "Counter" })).toHaveAttribute(
			"href",
			"/tools/counter",
		);
		expect(
			within(menu).getByRole("link", { name: "Announcements" }),
		).toHaveAttribute("href", "/announcements");
		expect(within(menu).getByText("Plan")).toBeInTheDocument();
		expect(within(menu).getByText("Track")).toBeInTheDocument();
		expect(within(menu).getByText("Tools")).toBeInTheDocument();

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
