import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CollapsibleSection from "@/components/CollapsibleSection";

describe("CollapsibleSection", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("renders open by default and toggles closed", () => {
		render(
			<CollapsibleSection title="Active Tasks" summary="3 active">
				<p>Task content</p>
			</CollapsibleSection>,
		);

		const toggle = screen.getByRole("button", { name: /Active Tasks/i });

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Task content")).toBeInTheDocument();

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Task content")).toBeNull();
	});

	it("can start collapsed", () => {
		render(
			<CollapsibleSection title="Completed Today" defaultOpen={false}>
				<p>Completed content</p>
			</CollapsibleSection>,
		);

		expect(
			screen.getByRole("button", { name: /Completed Today/i }),
		).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Completed content")).toBeNull();
	});

	it("stores the latest state when a storage key is provided", () => {
		render(
			<CollapsibleSection title="Daily Checks" storageKey="tasks:daily-checks">
				<p>Check content</p>
			</CollapsibleSection>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Daily Checks/i }));

		expect(window.localStorage.getItem("tasks:daily-checks")).toBe("closed");
	});

	it("restores the saved section state", () => {
		window.localStorage.setItem("tasks:groups", "closed");

		render(
			<CollapsibleSection title="Task Groups" storageKey="tasks:groups">
				<p>Group content</p>
			</CollapsibleSection>,
		);

		expect(screen.getByRole("button", { name: /Task Groups/i })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		expect(screen.queryByText("Group content")).toBeNull();
	});
});
