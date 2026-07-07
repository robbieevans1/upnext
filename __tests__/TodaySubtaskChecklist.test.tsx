import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodaySubtaskChecklist from "@/components/TodaySubtaskChecklist";

vi.mock("@/app/actions/tasks", () => ({
	completeSubtask: vi.fn(),
}));

describe("TodaySubtaskChecklist", () => {
	it("keeps subtasks collapsed until the user expands them", () => {
		render(
			<TodaySubtaskChecklist
				subtasks={[
					{
						id: "subtask-1",
						title: "Draft notes",
						isComplete: false,
					},
					{
						id: "subtask-2",
						title: "Review checklist",
						isComplete: true,
					},
				]}
			/>,
		);

		const toggle = screen.getByRole("button", { name: /Subtasks/i });

		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByText("1 of 2 complete")).toBeInTheDocument();
		expect(screen.queryByText("Draft notes")).not.toBeInTheDocument();

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Draft notes")).toBeInTheDocument();
		expect(screen.getByText("Review checklist")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
		expect(screen.getByText("Done")).toBeInTheDocument();
	});
});
