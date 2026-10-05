import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { completeSubtask } from "@/app/actions/tasks";
import TodaySubtaskChecklist from "@/components/TodaySubtaskChecklist";

vi.mock("@/app/actions/tasks", () => ({
	completeSubtask: vi.fn(),
}));

const completeSubtaskMock = vi.mocked(completeSubtask);

function renderExpandedChecklist() {
	render(
		<TodaySubtaskChecklist
			subtasks={[
				{
					id: "subtask-1",
					title: "Draft notes",
					isComplete: false,
				},
			]}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: /Subtasks/i }));
}

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

	it("marks a subtask done immediately while the completion is saving", async () => {
		let resolveCompletion = () => {};
		completeSubtaskMock.mockReturnValueOnce(
			new Promise<void>((resolve) => {
				resolveCompletion = resolve;
			}),
		);
		renderExpandedChecklist();

		fireEvent.click(screen.getByRole("button", { name: "Complete" }));

		expect(completeSubtaskMock).toHaveBeenCalledTimes(1);
		expect(completeSubtaskMock).toHaveBeenCalledWith("subtask-1");
		expect(await screen.findByText("Done")).toBeInTheDocument();
		expect(screen.getByText("1 of 1 complete")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Complete" }),
		).not.toBeInTheDocument();

		resolveCompletion();
	});

	it("restores the subtask and shows an error when completion fails", async () => {
		completeSubtaskMock.mockRejectedValueOnce(new Error("Database timeout"));
		renderExpandedChecklist();

		fireEvent.click(screen.getByRole("button", { name: "Complete" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not complete the subtask. Please try again.",
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
		});
		expect(screen.getByText("0 of 1 complete")).toBeInTheDocument();
	});
});
